'use client';

/* =============================================================================
   EditResourceModal.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Full-page modal for editing an existing employee record. Navigated to via
     the Edit button on the Resources table. Loads the employee, validates the
     form, and PUTs the update to /resources/employees/:id.

   HOW IT WORKS:
     1. Reads emp_id from the URL search params (?id=)
     2. Fetches the employee record, departments, and managers in parallel
     3. Converts stored IDs to display names for the dropdowns
     4. On submit: validates → checks for duplicate name → PUTs the payload
     5. On success: navigates back and triggers a refresh on the Resources page

   ID ↔ NAME CONVERSION:
     The employee record stores IDs for reports_to, manager_level, director_level,
     requestor_vp. The form displays names. On load, IDs are converted to names
     via the managers list. On save, names are converted back to IDs via getEmpId().
     Similarly, dept_no is stored but the form shows dept_name.

   SECURITY MODEL:
     • emp_id is read from URL params and passed through encodeURIComponent().
     • Profanity checks applied to emp_name, emp_title, and other_info before submit.
     • Duplicate name check runs against the employees list (server-sourced) and
       excludes the current emp_id — prevents false duplicate detection on self.
     • All numeric fields (emp_id, reports_to, etc.) resolved via ID lookup
       before sending — no user-typed IDs reach the backend.
     • API errors are surfaced via an error banner — never exposed as raw errors.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter, useSearchParams
   ============================================================================= */

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

/* -----------------------------------------------------------------------------
   PROFANITY CHECK — applied to emp_name, emp_title, and other_info before submit.
----------------------------------------------------------------------------- */
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

const inputClass    = 'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black w-full dark:bg-[#1f1f1f] dark:text-slate-100 dark:border-slate-600 dark:hover:bg-[#017ACB]/30 dark:focus:ring-slate-400';

/* =============================================================================
   COMPONENT: StyledDropdown
   Fixed option list dropdown — used for Department (only "Data Mgmt" allowed).
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
   COMPONENT: SearchableDropdown
   Searchable dropdown for long lists — used for hierarchy fields (Reports To,
   Manager Level, Director Level, VP). Filters by emp_name as the user types.
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
   MAIN COMPONENT: EditResourceModal
   ============================================================================= */
export default function EditResourceModal() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const empId        = searchParams.get('id'); // emp_id from URL — not user-typed

  const [departments, setDepartments] = useState([]);
  const [managers, setManagers]       = useState([]);
  const [employee, setEmployee]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);
  const [statusValue, setStatusValue] = useState('Active');

  // Form stores display names for dropdowns, dept_name for department
  const [formData, setFormData] = useState({
    emp_id: '', emp_name: '', emp_title: '', dept_no: '',
    reports_to: '', manager_level: '', director_level: '', requestor_vp: '', other_info: '',
  });

  // ID ↔ name conversion helpers
  const getNameById = (id)   => managers.find(m => m.emp_id === id)?.emp_name || '';
  const getDeptName = (no)   => departments.find(d => d.dept_no === no)?.dept_name || '';
  const getDeptNo   = (name) => departments.find(d => d.dept_name === name)?.dept_no || null;
  const getEmpId    = (name) => managers.find(m => m.emp_name === name)?.emp_id || null;

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD EMPLOYEE + DROPDOWNS
     Fetches employee, departments, and managers in parallel.
     IDs are converted to display names once the managers list is available.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!empId) return;
    const load = async () => {
      try {
        const [empRes, deptRes, mgrRes] = await Promise.all([
          api.get(`/resources/employees/${encodeURIComponent(empId)}`),
          api.get('/resources/departments'),
          api.get('/resources/managers'),
        ]);
        const empData  = empRes.data;
        const deptData = deptRes.data || [];
        const mgrData  = mgrRes.data  || [];
        if (!empData) { setError('Employee not found.'); return; }
        setEmployee(empData);
        setDepartments(deptData);
        setManagers(mgrData);
        setStatusValue(empData.current_status || 'Active');
        setFormData({
          emp_id:         empData.emp_id          || '',
          emp_name:       empData.emp_name        || '',
          emp_title:      empData.emp_title       || '',
          dept_no:        empData.dept_no         || '',
          reports_to:     empData.reports_to      || '',
          manager_level:  empData.manager_level   || '',
          director_level: empData.director_level  || '',
          requestor_vp:   empData.requestor_vp    || '',
          other_info:     empData.other_info      || '',
        });
      } catch { setError('Failed to load employee data. Please try again.'); }
    };
    load();
  }, [empId]);

  // Convert stored IDs to display names once managers are loaded
  useEffect(() => {
    if (!managers.length) return;
    setFormData(prev => ({
      ...prev,
      reports_to:     getNameById(prev.reports_to),
      manager_level:  getNameById(prev.manager_level),
      director_level: getNameById(prev.director_level),
      requestor_vp:   getNameById(prev.requestor_vp),
    }));
  }, [managers]);

  // Convert stored dept_no to display name once departments are loaded
  useEffect(() => {
    if (!departments.length) return;
    setFormData(prev => ({ ...prev, dept_no: getDeptName(prev.dept_no) }));
  }, [departments]);

  const handleTextField = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value.replace(/[^a-zA-Z0-9 .,\-']/g, '') }));
  };

  /* ---------------------------------------------------------------------------
     HANDLER: handleEdit
     ---------------------------------------------------------------------------
     Validates → profanity check → duplicate name check → PUT to backend.
     Duplicate check excludes the current emp_id to avoid false positives on self.
  --------------------------------------------------------------------------- */
  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');

    if (containsBlockedWords(formData.emp_name))   return setError('Name contains inappropriate language. Please revise.');
    if (containsBlockedWords(formData.emp_title))  return setError('Title contains inappropriate language. Please revise.');
    if (containsBlockedWords(formData.other_info)) return setError('Other Information contains inappropriate language. Please revise.');
    if (!formData.emp_name.trim())  return setError('Name is required.');

    // Duplicate name check — excludes the current employee to avoid false positives
    try {
      const { data: existing } = await api.get('/resources/employees');
      const nameTaken = existing.some(e =>
        e.emp_name?.toLowerCase().trim() === formData.emp_name.toLowerCase().trim() &&
        String(e.emp_id) !== String(empId) // Exclude self
      );
      if (nameTaken) return setError(`An employee named "${formData.emp_name.trim()}" already exists.`);
    } catch { /* non-fatal — skip duplicate check if endpoint unavailable */ }

    if (!formData.emp_title.trim()) return setError('Title is required.');
    if (!formData.dept_no)          return setError('Department is required.');
    if (!formData.reports_to)       return setError('Reports To is required.');
    if (!formData.manager_level)    return setError('Manager Level is required.');
    if (!formData.director_level)   return setError('Director Level is required.');
    if (!formData.requestor_vp)     return setError('VP is required.');

    // Convert display names back to IDs before sending to backend
    const payload = {
      emp_id:         formData.emp_id,
      emp_name:       formData.emp_name.trim(),
      emp_title:      formData.emp_title.trim(),
      dept_no:        getDeptNo(formData.dept_no),
      reports_to:     getEmpId(formData.reports_to),
      manager_level:  getEmpId(formData.manager_level),
      director_level: getEmpId(formData.director_level),
      requestor_vp:   getEmpId(formData.requestor_vp),
      other_info:     formData.other_info.trim(),
      current_status: statusValue,
    };

    try {
      setLoading(true);
      await api.put(`/resources/employees/${encodeURIComponent(empId)}`, payload);
      setSuccess(true);
      // Navigate back and trigger a refresh on the Resources page
      setTimeout(() => {
        router.back();
        setTimeout(() => router.replace(`/resource-manager/create-edit-resources?refresh=${Date.now()}`), 50);
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save changes. Please try again.');
    } finally { setLoading(false); }
  };

  /* ---------------------------------------------------------------------------
     LOADING STATE — shown while employee + dropdowns are loading
  --------------------------------------------------------------------------- */
  if (!employee || !managers.length || !departments.length) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" aria-label="Loading" />
      </div>
    );
  }

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white dark:bg-[#212121] rounded-lg shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-transparent dark:border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {success && (
          <div role="status" className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-200 rounded text-sm text-center font-semibold" style={styles.outfitFont}>
            ✓ Changes saved successfully.
          </div>
        )}
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-black dark:text-white" style={styles.outfitFont}>Edit Resource</h2>
          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200 rounded text-sm" style={styles.outfitFont}>
              {error}<button onClick={() => setError('')} className="ml-3 font-bold text-red-900 dark:text-red-100">×</button>
            </div>
          )}
          <form onSubmit={handleEdit} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Employee ID — read-only, cannot be changed */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Employee ID</label>
                <input type="text" value={formData.emp_id} readOnly className="bg-gray-100 text-gray-500 border border-black p-2 rounded cursor-not-allowed w-full dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600" style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5" style={styles.outfitFont}>Cannot be changed</span>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Name *</label>
                <input type="text" value={formData.emp_name} onChange={handleTextField('emp_name')} maxLength={100} required className={inputClass} style={styles.outfitFont} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Title *</label>
                <input type="text" value={formData.emp_title} onChange={handleTextField('emp_title')} maxLength={100} required className={inputClass} style={styles.outfitFont} />
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

                <button
                  type="button"
                  onClick={() => handleStatusChange('Active')}
                  className={`
                    px-4 py-2 rounded text-sm text-black dark:text-slate-100 font-semibold border border-black/50 dark:border-slate-600 transition
                    shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                    dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
                    ${statusValue === 'Active'
                      ? 'bg-green-200 border-green-600 dark:bg-green-900/60 dark:border-green-700 dark:text-green-200'
                      : 'bg-green-50 hover:bg-green-100 dark:bg-green-950/40 dark:hover:bg-green-900/50 dark:border-green-800 dark:text-green-200'}
                  `}
                  style={styles.outfitFont}
                >
                  Active
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange('Inactive')}
                  className={`
                    px-4 py-2 rounded text-sm text-black dark:text-slate-100 font-semibold border border-black/50 dark:border-slate-600 transition
                    shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                    dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
                    ${statusValue === 'Inactive'
                      ? 'bg-red-200 border-red-600 dark:bg-red-900/60 dark:border-red-700 dark:text-red-200'
                      : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:border-red-800 dark:text-red-200'}
                  `}
                  style={styles.outfitFont}
                >
                  Inactive
                </button>

                <button type="button" onClick={() => setStatusValue('Active')} className={`px-4 py-2 rounded text-sm text-black font-semibold border border-black/50 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] ${statusValue === 'Active' ? 'bg-green-200 border-green-600' : 'bg-green-50 hover:bg-green-100'}`} style={styles.outfitFont}>Active</button>
                <button type="button" onClick={() => setStatusValue('Inactive')} className={`px-4 py-2 rounded text-sm text-black font-semibold border border-black/50 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] ${statusValue === 'Inactive' ? 'bg-red-200 border-red-600' : 'bg-red-50 hover:bg-red-100'}`} style={styles.outfitFont}>Inactive</button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button type="button" onClick={() => router.back()} disabled={loading} className="px-4 py-2 rounded text-sm bg-[#003A5C] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)] w-full sm:w-auto" style={styles.outfitFont}>Cancel</button>
              <button type="submit" disabled={loading || success} className={`${btnClass} w-full sm:w-auto`} style={styles.outfitFont}>{loading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
