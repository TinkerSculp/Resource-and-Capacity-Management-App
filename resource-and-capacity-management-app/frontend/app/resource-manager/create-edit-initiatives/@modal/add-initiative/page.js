"use client";

/* =============================================================================
   AddInitiativeModal.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Full-page modal for adding a new initiative. Validates the form, checks
     for profanity, and POSTs to /api/initiatives.

   HOW IT WORKS:
     1. On mount, fetches employees (for the Lead dropdown) and requestors
     2. When a Requestor is selected, auto-fetches the Requestor VP and
        Requesting Dept — these fields are read-only, server-derived
     3. On submit: validates → profanity check → POST
     4. On success: navigates back and triggers a refresh on the Initiatives page

   AUTO-FILL FIELDS:
     Requestor VP and Requesting Dept are read-only and auto-filled when a
     Requestor is selected. The Requestor's VP name is resolved from the
     requestors list, then a separate API call fetches the dept for that VP.
     These fields are never user-editable — they always reflect server data.

   COMPLETION DATE RULE:
     Completion date is required only when status is "Completed" or "Cancelled".
     The label shows a * when required to hint the user.

   SECURITY MODEL:
     • Profanity checks on project, target_period, description, and
       resource_consideration before submit.
     • Input characters are stripped at keystroke level — only safe char sets
       are allowed through (letters, numbers, spaces, and safe punctuation).
     • All dropdown options come from the backend — never user-typed input.
     • VP name is passed through encodeURIComponent() in the dept lookup URL.
     • API errors are surfaced via error banner — never exposed as raw exceptions.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter for navigation
   ============================================================================= */

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

const btnClass = `
  px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

const btnDarkClass = `
  px-4 py-2 rounded text-sm
  bg-[#003A5C] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

const styles     = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };
const inputClass = 'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black w-full';
const readOnlyClass = 'bg-gray-100 text-gray-500 border border-black p-2 rounded cursor-not-allowed w-full';

/* -----------------------------------------------------------------------------
   PROFANITY CHECK — applied to text fields before submit.
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
  return BLOCKED_WORDS.some(word => new RegExp(`\\b${word}\\b`, "i").test(text));
}

/* =============================================================================
   COMPONENT: SearchableDropdown — for Requestor (long list with search).
   Sorts results so prefix matches appear first.
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

  const filtered = (list || [])
    .filter(p => p.emp_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // Prefix matches appear before substring matches
      const s = search.toLowerCase();
      const aMatch = a.emp_name?.toLowerCase().startsWith(s);
      const bMatch = b.emp_name?.toLowerCase().startsWith(s);
      return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
    });

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
        <span className={value ? 'text-black' : 'text-gray-400'}>{value || `Select ${label}`}</span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 shadow-lg">
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ''))} onClick={e => e.stopPropagation()} className="w-full p-2 border-b border-gray-300 text-black focus:outline-none focus:border-black text-sm" style={styles.outfitFont} />
          <div className="max-h-40 overflow-y-auto">
            {filtered.map(emp => (
              <div key={emp.emp_name} onClick={() => { onChange(emp.emp_name); setOpen(false); setSearch(''); }} className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === emp.emp_name ? 'font-bold bg-[#CDE6F7]' : ''}`} style={styles.outfitFont}>
                {emp.emp_name}
              </div>
            ))}
            {filtered.length === 0 && <div className="p-2 text-gray-500 text-sm" style={styles.outfitFont}>No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   COMPONENT: StyledDropdown — for fixed option lists (Category, Lead, Status).
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
      <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
        <span className={value ? 'text-black' : 'text-gray-400'}>{value || `Select ${label}`}</span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 max-h-48 overflow-y-auto shadow-lg">
          {(options || []).map(opt => (
            <div key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === opt ? 'font-bold bg-[#CDE6F7]' : ''}`} style={styles.outfitFont}>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   MAIN COMPONENT: AddInitiativeModal
   ============================================================================= */
export default function AddInitiativeModal() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const [employees, setEmployees]   = useState([]); // For the Lead dropdown
  const [requestors, setRequestors] = useState([]); // For the Requestor dropdown
  const [dept, setDept]             = useState(''); // Auto-filled from requestor VP lookup

  const [form, setForm] = useState({
    project: '', category: '', lead: '', status: '',
    requestor: '', requestor_vp: '', completion_date: '',
    target_period: '', description: '', resource_consideration: '',
  });

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD DROPDOWNS
     Fetches employees and requestors from the initiatives dropdowns endpoint.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const res = await api.get('/initiatives/dropdowns');
        if (!res?.data) throw new Error('Invalid dropdown response');
        setEmployees(res.data.employees   || []);
        setRequestors(res.data.requestors || []);
      } catch (err) { console.error('Failed to load dropdowns:', err); }
    };
    loadDropdowns();
  }, []);

  /* ---------------------------------------------------------------------------
     HANDLER: fetchDept
     Looks up the requesting department for a given VP name.
     VP name is passed through encodeURIComponent() — prevents URL injection.
     Non-fatal on error — dept just shows as blank.
  --------------------------------------------------------------------------- */
  const fetchDept = async (vpName) => {
    if (!vpName?.trim()) { setDept(''); return; }
    try {
      const res = await api.get(`/initiatives/dept/search?name=${encodeURIComponent(vpName)}`);
      setDept(res?.data?.dept_name || '');
    } catch { setDept(''); }
  };

  /* ---------------------------------------------------------------------------
     HANDLER: handleRequestorChange
     When the Requestor changes, auto-resolve the VP name from the requestors
     list and then fetch the department for that VP.
  --------------------------------------------------------------------------- */
  const handleRequestorChange = async (name) => {
    updateField('requestor', name);
    const req = requestors.find(r => r.emp_name === name);
    if (!req) { updateField('requestor_vp', ''); setDept(''); return; }
    const vpName = req.requestor_vp_name;
    updateField('requestor_vp', vpName);
    await fetchDept(vpName);
  };

  /* ---------------------------------------------------------------------------
     HANDLER: handleSubmit
     Validates → profanity check → POST to /initiatives.
  --------------------------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.project.trim())       return setError('Project Name is required.');
    if (!form.category)             return setError('Category is required.');
    if (!form.lead)                 return setError('Lead is required.');
    if (!form.status)               return setError('Status is required.');
    if (!form.requestor)            return setError('Requestor is required.');
    if (!form.target_period.trim()) return setError('Target Period is required.');
    if (!form.description.trim())   return setError('Description is required.');
    if ((form.status === 'Completed' || form.status === 'Cancelled') && !form.completion_date)
      return setError('Completion date is required when status is Completed or Cancelled.');

    // Profanity checks on all free-text fields
    if (containsBlockedWords(form.project))               return setError('Project Name contains inappropriate language. Please revise.');
    if (containsBlockedWords(form.target_period))         return setError('Target Period contains inappropriate language. Please revise.');
    if (containsBlockedWords(form.description))           return setError('Description contains inappropriate language. Please revise.');
    if (containsBlockedWords(form.resource_consideration)) return setError('Resource Consideration contains inappropriate language. Please revise.');

    const payload = { ...form, requesting_dept: dept };

    try {
      setLoading(true);
      const res = await api.post('/initiatives', payload);
      if (!res?.data) throw new Error('Invalid server response');
      setSuccess(true);
      setTimeout(() => {
        router.back();
        setTimeout(() => router.replace(`/resource-manager/create-edit-initiatives?refresh=${Date.now()}`), 100);
      }, 1500);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err?.response?.data?.error || err?.message || 'Network error. Try again.');
    } finally { setLoading(false); }
  };

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {success && (
          <div role="status" className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm text-center font-semibold" style={styles.outfitFont}>
            ✓ Initiative added successfully.
          </div>
        )}
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-black" style={styles.outfitFont}>Add Initiative</h2>
          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm" style={styles.outfitFont}>
              {error}<button onClick={() => setError('')} className="ml-3 font-bold text-red-900" aria-label="Dismiss">×</button>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Project Name *</label>
                <input value={form.project} onChange={e => updateField('project', e.target.value.replace(/[^a-zA-Z0-9 .,\-'&]/g, ''))} maxLength={150} required className={inputClass} style={styles.outfitFont} />
              </div>

              <StyledDropdown label="Category *" value={form.category} onChange={val => updateField('category', val)} options={['Baseline', 'Strategic', 'Discretionary Project / Enhancement', 'Vacation']} />
              <StyledDropdown label="Lead *"     value={form.lead}     onChange={val => updateField('lead', val)}     options={employees.map(e => e.emp_name)} />
              <StyledDropdown label="Status *"   value={form.status}   onChange={val => updateField('status', val)}   options={['Backlog', 'On Going', 'In Progress', 'On Hold', 'Cancelled', 'Completed']} />

              {/* Requestor — triggers auto-fill of VP and Dept */}
              <SearchableDropdown label="Requestor *" value={form.requestor} onChange={handleRequestorChange} list={requestors} />

              {/* Requestor VP + Requesting Dept — read-only, auto-filled from requestor selection */}
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Requestor VP</label>
                <input value={form.requestor_vp} readOnly className={readOnlyClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Auto-filled from Requestor</span>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Requesting Dept</label>
                <input value={dept} readOnly className={readOnlyClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Auto-filled from Requestor</span>
              </div>

              {/* Completion Date — required only for Completed or Cancelled status */}
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
                  Completion Date{(form.status === 'Completed' || form.status === 'Cancelled') ? ' *' : ''}
                </label>
                <input type="date" value={form.completion_date} onChange={e => updateField('completion_date', e.target.value)} onFocus={e => e.target.showPicker?.()} className={inputClass} style={styles.outfitFont} />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Target Period *</label>
                <input value={form.target_period} onChange={e => updateField('target_period', e.target.value.replace(/[^a-zA-Z0-9 .,\-'/]/g, ''))} maxLength={100} required className={inputClass} style={styles.outfitFont} />
              </div>
            </div>

            <div className="flex flex-col mt-4">
              <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Description *</label>
              <textarea value={form.description} onChange={e => updateField('description', e.target.value.replace(/[^a-zA-Z0-9 .,\-'&()]/g, ''))} maxLength={1000} required rows={3} className={inputClass} style={styles.outfitFont} />
            </div>

            <div className="flex flex-col mt-4">
              <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Resource Consideration</label>
              <textarea value={form.resource_consideration} onChange={e => updateField('resource_consideration', e.target.value.replace(/[^a-zA-Z0-9 .,\-'&()]/g, ''))} maxLength={500} rows={3} className={inputClass} style={styles.outfitFont} />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button type="button" onClick={() => router.back()} disabled={loading} className={`${btnDarkClass} w-full sm:w-auto`} style={styles.outfitFont}>Cancel</button>
              <button type="submit" disabled={loading || success} className={`${btnClass} w-full sm:w-auto`} style={styles.outfitFont}>{loading ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}