'use client';

/* =============================================================================
   CreateResourceModal.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Full-page modal for creating a new employee record. Navigated to via the
     + Create Resource button on the Resources page. Validates the form and
     POSTs to /resources/employees.

   HOW IT WORKS:
     1. On mount, fetches departments and managers in parallel
     2. Form uses display names for hierarchy dropdowns (converted to IDs on save)
     3. On submit: validates → profanity check → duplicate ID/name check → POST
     4. On success: navigates back and triggers a refresh on the Resources page

   FORM FIELD RULES:
     • emp_id      — numbers only, must be unique
     • emp_name    — letters, spaces, some punctuation; must be unique
     • emp_title   — letters, spaces, some punctuation
     • dept_no     — selected from department dropdown, scoped to "Data Mgmt"
     • reports_to, manager_level, director_level, requestor_vp — searchable
       dropdown from managers list; display names converted to IDs on save
     • other_info  — letters, numbers, spaces, dots, commas; max 500 chars
     • current_status — Active or Inactive toggle

   SECURITY MODEL:
     • Profanity checks on emp_name, emp_title, and other_info before submit.
     • Duplicate emp_id check against the employees list before POSTing.
     • Duplicate emp_name check (case-insensitive) before POSTing.
     • emp_id is coerced to Number() in the payload — backend expects an integer.
     • All hierarchy field values resolved to IDs via getEmpId() before sending.
     • API errors surfaced via error banner — never exposed as raw exceptions.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter for navigation
   ============================================================================= */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const btnClass = `
  px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white border border-black/50 dark:border-slate-500/60
  hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
`;

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

const BLOCKED_WORDS = [
  "kill","murder","stab","shoot","die","death","dead","attack","hate","sucks",
  "stupid","idiot","moron","dumb","loser","trash","ass","bastard","bitch","damn",
  "hell","crap","shit","fuck","cunt","dick","cock","pussy","whore","slut",
  "nigger","faggot","retard","rape","bomb","terror","threat","hurt","harm",
  "destroy","beat","punch","fight","abuse","violent","violence","weapon","knife","gun",
];

function containsBlockedWords(text) {
  if (!text) return false;
  return BLOCKED_WORDS.some(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
}

const inputClass = 'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:border-black [&:focus]:shadow-[0_0_0_1px_black] w-full';
const btnGrayClass = `
  px-4 py-2 rounded text-sm
  bg-gray-200 text-black border border-black/50 dark:border-slate-500/60
  dark:bg-slate-800 dark:text-slate-200
  hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
`;

/* -----------------------------------------------------------------------------
   STYLES
----------------------------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' },
};

/* -----------------------------------------------------------------------------
   SHARED INPUT CLASS — box style matches ResourcesPage read-only fields.
----------------------------------------------------------------------------- */
const inputClass =
  'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:border-black [&:focus]:shadow-[0_0_0_1px_black] w-full dark:bg-[#1f1f1f] dark:text-slate-100 dark:border-slate-600 dark:hover:bg-[#017ACB]/30 dark:focus:border-slate-400 dark:[&:focus]:shadow-[0_0_0_1px_rgb(148,163,184)]';

/* =============================================================================
   COMPONENT: StyledDropdown — fixed option list, used for Department.
   ============================================================================= */
function StyledDropdown({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div className="bg-white dark:bg-[#1f1f1f] text-black dark:text-slate-100 border border-black dark:border-slate-600 p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition flex justify-between items-center" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
        <span className={value ? 'text-black dark:text-slate-100' : 'text-gray-400 dark:text-slate-400'}>{value || `Select ${label}`}</span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#1f1f1f] border border-black dark:border-slate-600 rounded mt-1 z-50 max-h-48 overflow-y-auto shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
          {options.map(opt => (
            <div key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`p-2 cursor-pointer text-black dark:text-slate-100 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition text-sm ${value === opt ? 'font-bold bg-[#CDE6F7] dark:bg-[#0A5F8A]/40' : ''}`} style={styles.outfitFont}>{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   COMPONENT: SearchableDropdown — searchable, used for hierarchy fields.
   ============================================================================= */
function SearchableDropdown({ label, value, onChange, list }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const filtered = list.filter(item => item.emp_name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div className="bg-white dark:bg-[#1f1f1f] text-black dark:text-slate-100 border border-black dark:border-slate-600 p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition flex justify-between items-center" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
        <span className={value ? 'text-black dark:text-slate-100' : 'text-gray-400 dark:text-slate-400'}>{value || `Select ${label}`}</span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#1f1f1f] border border-black dark:border-slate-600 rounded mt-1 z-50 max-h-64 overflow-y-auto shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
          <input className="w-full p-2 border-b border-gray-300 dark:border-slate-700 text-black dark:text-slate-100 bg-white dark:bg-[#1f1f1f] focus:outline-none focus:border-black dark:focus:border-slate-400 text-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ''))} onClick={e => e.stopPropagation()} style={styles.outfitFont} />
          {filtered.map(item => (
            <div key={item.emp_id} onClick={() => { onChange(item.emp_name); setOpen(false); setSearch(''); }} className={`p-2 cursor-pointer text-black dark:text-slate-100 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition text-sm ${value === item.emp_name ? 'font-bold bg-[#CDE6F7] dark:bg-[#0A5F8A]/40' : ''}`} style={styles.outfitFont}>{item.emp_name}</div>
          ))}
          {filtered.length === 0 && <div className="p-2 text-gray-500 dark:text-slate-400 text-sm" style={styles.outfitFont}>No results</div>}
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   MAIN COMPONENT: CreateResourceModal
   ============================================================================= */
export default function CreateResourceModal() {
  const router = useRouter();

  const [departments, setDepartments] = useState([]);
  const [managers, setManagers]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);
  const [formData, setFormData] = useState({
    emp_id: '', emp_name: '', emp_title: '', dept_no: '',
    reports_to: '', manager_level: '', director_level: '', requestor_vp: '',
    other_info: '', current_status: 'Active',
  });

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD DEPARTMENTS + MANAGERS
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const load = async () => {
      try {
        const [deptRes, mgrRes] = await Promise.all([
          api.get('/resources/departments'),
          api.get('/resources/managers'),
        ]);
        setDepartments(deptRes.data || []);
        setManagers(mgrRes.data    || []);
      } catch { setError('Failed to load departments or managers.'); }
    };
    load();
  }, []);

  // ID lookup helpers — convert display names back to IDs before sending
  const getDeptNo = (name) => departments.find(d => d.dept_name === name)?.dept_no || null;
  const getEmpId  = (name) => managers.find(m => m.emp_name === name)?.emp_id || null;

  /* ---------------------------------------------------------------------------
     HANDLER: handleCreate
     ---------------------------------------------------------------------------
     Validates → profanity → duplicate emp_id → duplicate emp_name → POST.
     emp_id is coerced to Number() in the payload — backend expects an integer.
  --------------------------------------------------------------------------- */
  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (containsBlockedWords(formData.emp_name))   return setError('Name contains inappropriate language. Please revise.');
    if (containsBlockedWords(formData.emp_title))  return setError('Title contains inappropriate language. Please revise.');
    if (containsBlockedWords(formData.other_info)) return setError('Other Information contains inappropriate language. Please revise.');
    if (!formData.emp_id.trim())   return setError('Employee ID is required.');
    if (!formData.emp_name.trim()) return setError('Name is required.');

    // Duplicate checks — non-fatal if the endpoint is unavailable
    try {
      const { data: existing } = await api.get('/resources/employees');
      if (existing.some(e => String(e.emp_id) === String(formData.emp_id.trim())))
        return setError(`Employee ID ${formData.emp_id.trim()} is already in use.`);
      if (existing.some(e => e.emp_name?.toLowerCase().trim() === formData.emp_name.toLowerCase().trim()))
        return setError(`An employee named "${formData.emp_name.trim()}" already exists.`);
    } catch { /* non-fatal — skip duplicate check if endpoint unavailable */ }

    if (!formData.emp_title.trim()) return setError('Title is required.');
    if (!formData.dept_no)          return setError('Department is required.');
    if (!formData.reports_to)       return setError('Reports To is required.');
    if (!formData.manager_level)    return setError('Manager Level is required.');
    if (!formData.director_level)   return setError('Director Level is required.');
    if (!formData.requestor_vp)     return setError('VP is required.');

    // Build payload — convert display names to IDs, emp_id coerced to Number
    const payload = {
      emp_id:         Number(formData.emp_id.trim()), // Backend expects integer
      emp_name:       formData.emp_name.trim(),
      emp_title:      formData.emp_title.trim(),
      dept_no:        getDeptNo(formData.dept_no),
      reports_to:     getEmpId(formData.reports_to),
      manager_level:  getEmpId(formData.manager_level),
      director_level: getEmpId(formData.director_level),
      requestor_vp:   getEmpId(formData.requestor_vp),
      other_info:     formData.other_info.trim(),
      current_status: formData.current_status,
    };

    try {
      setLoading(true);
      await api.post('/resources/employees', payload);
      setSuccess(true);
      // Navigate back and trigger a refresh on the Resources page
      setTimeout(() => {
        router.back();
        setTimeout(() => router.replace(`/resource-manager/create-edit-resources?refresh=${Date.now()}`), 50);
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create resource. Please try again.');
    } finally { setLoading(false); }
  };

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white dark:bg-[#212121] rounded-lg shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-transparent dark:border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {success && (
          <div role="status" className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-200 rounded text-sm text-center font-semibold" style={styles.outfitFont}>
            ✓ Resource added successfully.
          </div>
        )}
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-black dark:text-white" style={styles.outfitFont}>Create Resource</h2>
          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200 rounded text-sm" style={styles.outfitFont}>
              {error}<button onClick={() => setError('')} className="ml-3 font-bold text-red-900 dark:text-red-100">×</button>
            </div>
          )}
          <form onSubmit={handleCreate} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Employee ID *</label>
                <input type="text" inputMode="numeric" value={formData.emp_id} onChange={e => setFormData(prev => ({ ...prev, emp_id: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="e.g. 12345" maxLength={10} required className={inputClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5" style={styles.outfitFont}>Numbers only</span>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Name *</label>
                <input type="text" value={formData.emp_name} onChange={e => setFormData(prev => ({ ...prev, emp_name: e.target.value.replace(/[^a-zA-Z0-9 .,\-']/g, '') }))} placeholder="e.g. Jane Smith" maxLength={100} required className={inputClass} style={styles.outfitFont} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Title *</label>
                <input type="text" value={formData.emp_title} onChange={e => setFormData(prev => ({ ...prev, emp_title: e.target.value.replace(/[^a-zA-Z0-9 .,\-']/g, '') }))} placeholder="e.g. Solution Analyst II" maxLength={100} required className={inputClass} style={styles.outfitFont} />
              </div>
              {/* Department scoped to Data Mgmt only */}
              <StyledDropdown label="Department *" value={formData.dept_no} onChange={val => setFormData(prev => ({ ...prev, dept_no: val }))} options={departments.filter(d => d.dept_name === "Data Mgmt").map(d => d.dept_name)} />
              <SearchableDropdown label="Reports To *"     value={formData.reports_to}     onChange={val => setFormData(prev => ({ ...prev, reports_to: val }))}     list={managers} />
              <SearchableDropdown label="Manager Level *"  value={formData.manager_level}  onChange={val => setFormData(prev => ({ ...prev, manager_level: val }))}  list={managers} />
              <SearchableDropdown label="Director Level *" value={formData.director_level} onChange={val => setFormData(prev => ({ ...prev, director_level: val }))} list={managers} />
              <SearchableDropdown label="VP *"             value={formData.requestor_vp}   onChange={val => setFormData(prev => ({ ...prev, requestor_vp: val }))}   list={managers} />
            </div>
            <div className="flex flex-col mt-4">
              <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Other Information</label>
              <textarea value={formData.other_info} onChange={e => setFormData(prev => ({ ...prev, other_info: e.target.value.replace(/[^a-zA-Z0-9 .,]/g, '') }))} rows={3} maxLength={500} className={inputClass} style={styles.outfitFont} />
            </div>
            <div className="mt-4">
              <label className="text-xs text-black dark:text-slate-100 font-semibold block mb-2" style={styles.outfitFont}>Status</label>
              <div className="flex gap-3 flex-wrap">
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, current_status: 'Active' }))} className={`px-4 py-2 rounded text-sm text-black font-semibold border border-black/50 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] ${formData.current_status === 'Active' ? 'bg-green-200 border-green-600' : 'bg-green-50 hover:bg-green-100'}`} style={styles.outfitFont}>Active</button>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, current_status: 'Inactive' }))} className={`px-4 py-2 rounded text-sm text-black font-semibold border border-black/50 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] ${formData.current_status === 'Inactive' ? 'bg-red-200 border-red-600' : 'bg-red-50 hover:bg-red-100'}`} style={styles.outfitFont}>Inactive</button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, current_status: 'Active' }))}
                  className={`
                    px-4 py-2 rounded text-sm text-black dark:text-slate-100 font-semibold border border-black/50 dark:border-slate-600 transition
                    shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                    dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
                    ${formData.current_status === 'Active'
                      ? 'bg-green-200 border-green-600 dark:bg-green-900/60 dark:border-green-700 dark:text-green-200'
                      : 'bg-green-50 hover:bg-green-100 dark:bg-green-950/40 dark:hover:bg-green-900/50 dark:border-green-800 dark:text-green-200'}
                  `}
                  style={styles.outfitFont}
                >
                  Active
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, current_status: 'Inactive' }))}
                  className={`
                    px-4 py-2 rounded text-sm text-black dark:text-slate-100 font-semibold border border-black/50 dark:border-slate-600 transition
                    shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                    dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
                    ${formData.current_status === 'Inactive'
                      ? 'bg-red-200 border-red-600 dark:bg-red-900/60 dark:border-red-700 dark:text-red-200'
                      : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:border-red-800 dark:text-red-200'}
                  `}
                  style={styles.outfitFont}
                >
                  Inactive
                </button>

              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button type="button" onClick={() => router.back()} disabled={loading} className="px-4 py-2 rounded text-sm bg-[#003A5C] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)] w-full sm:w-auto" style={styles.outfitFont}>Cancel</button>
              <button type="submit" disabled={loading || success} className={`${btnClass} w-full sm:w-auto`} style={styles.outfitFont}>{loading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
