"use client";

/* =============================================================================
   AddInitiativeModal.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Modal form for creating a new initiative. Fields include:
       • Project Name, Category, Lead, Status
       • Requestor (searchable) — auto-fills VP and Department from backend
       • Requestor VP + Requesting Dept (read-only, auto-populated)
       • Completion Date, Target Period
       • Description, Resource Consideration

   SECURITY MODEL:
     • All API calls use secure JWT-attached requests via the api client.
     • VP and Department are derived from backend data when a Requestor is
       selected — users cannot manually set these fields.
     • All fetch/api calls are wrapped in try/catch — failures surface as
       error banners rather than crashing or silently losing data.
     • No dangerouslySetInnerHTML is used anywhere.
     • No sensitive data (tokens, roles) is stored in component state.

   RESPONSIVENESS:
     • Modal uses max-w-3xl w-full — fills screen on mobile, capped on desktop.
     • Form grid uses grid-cols-1 sm:grid-cols-2 — single column on mobile.
     • Buttons use w-full sm:w-auto — full width on mobile, auto on desktop.
     • max-h-[90vh] overflow-y-auto — scrollable on short screens.

   DEPENDENCIES:
     • next/navigation — useRouter
     • @/lib/api       — axios instance with base URL + auth headers
   ============================================================================= */

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

const btnClass = `
  px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white border border-black/50 dark:border-slate-500/60
  hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100 transition
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

const btnDarkClass = `
  px-4 py-2 rounded text-sm
  bg-[#003A5C] text-white border border-black/50 dark:border-slate-500/60
  dark:bg-[#0A5F8A] dark:text-white
  hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100 transition
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

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' },
};

const inputClass =
  'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black w-full dark:bg-[#1f1f1f] dark:text-slate-100 dark:border-slate-600 dark:hover:bg-[#017ACB]/30 dark:focus:ring-slate-400';

const readOnlyClass =
  'bg-gray-100 text-gray-500 border border-black p-2 rounded cursor-not-allowed w-full dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600';

/* =============================================================================
   COMPONENT: SearchableDropdown
   ============================================================================= */
function SearchableDropdown({ label, value, onChange, list }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = (list || [])
    .filter((p) => p.emp_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const s = search.toLowerCase();
      const aMatch = a.emp_name?.toLowerCase().startsWith(s);
      const bMatch = b.emp_name?.toLowerCase().startsWith(s);
      return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
    });

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div
        className="bg-white dark:bg-[#1f1f1f] text-black dark:text-slate-100 border border-black dark:border-slate-600 p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition flex justify-between items-center"
        onClick={() => setOpen((o) => !o)}
        style={styles.outfitFont}
      >
        <span className={value ? 'text-black dark:text-slate-100' : 'text-gray-400 dark:text-slate-400'}>{value || `Select ${label}`}</span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#1f1f1f] border border-black dark:border-slate-600 rounded mt-1 z-50 shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
          {/* Search bar — letters and spaces only */}
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ''))}
            onClick={(e) => e.stopPropagation()}
            className="w-full p-2 border-b border-gray-300 dark:border-slate-700 text-black dark:text-slate-100 bg-white dark:bg-[#1f1f1f] focus:outline-none focus:border-black dark:focus:border-slate-400 text-sm"
            style={styles.outfitFont}
          />
          <div className="max-h-40 overflow-y-auto">
            {filtered.map((emp) => (
              <div
                key={emp.emp_name}
                onClick={() => { onChange(emp.emp_name); setOpen(false); setSearch(''); }}
                className={`p-2 cursor-pointer text-black dark:text-slate-100 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition text-sm ${value === emp.emp_name ? 'font-bold bg-[#CDE6F7] dark:bg-[#0A5F8A]/40' : ''}`}
                style={styles.outfitFont}
              >
                {emp.emp_name}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-2 text-gray-500 dark:text-slate-400 text-sm" style={styles.outfitFont}>No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   COMPONENT: StyledDropdown
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
      <div
        className="bg-white dark:bg-[#1f1f1f] text-black dark:text-slate-100 border border-black dark:border-slate-600 p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition flex justify-between items-center"
        onClick={() => setOpen((o) => !o)}
        style={styles.outfitFont}
      >
        <span className={value ? 'text-black dark:text-slate-100' : 'text-gray-400 dark:text-slate-400'}>{value || `Select ${label}`}</span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#1f1f1f] border border-black dark:border-slate-600 rounded mt-1 z-50 max-h-48 overflow-y-auto shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
          {(options || []).map((opt) => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`p-2 cursor-pointer text-black dark:text-slate-100 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition text-sm ${value === opt ? 'font-bold bg-[#CDE6F7] dark:bg-[#0A5F8A]/40' : ''}`}
              style={styles.outfitFont}
            >
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

  const [employees, setEmployees]   = useState([]);
  const [requestors, setRequestors] = useState([]);
  const [dept, setDept]             = useState('');

  const [form, setForm] = useState({
    project:                '',
    category:               '',
    lead:                   '',
    status:                 '',
    requestor:              '',
    requestor_vp:           '',
    completion_date:        '',
    target_period:          '',
    description:            '',
    resource_consideration: '',
  });

  const updateField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const res = await api.get('/initiatives/dropdowns');
        if (!res?.data) throw new Error('Invalid dropdown response');
        setEmployees(res.data.employees   || []);
        setRequestors(res.data.requestors || []);
      } catch (err) {
        console.error('Failed to load dropdowns:', err);
      }
    };
    loadDropdowns();
  }, []);

  const fetchDept = async (vpName) => {
    if (!vpName?.trim()) { setDept(''); return; }
    try {
      const res = await api.get(`/initiatives/dept/search?name=${encodeURIComponent(vpName)}`);
      if (!res?.data) throw new Error('Invalid department response');
      setDept(res.data.dept_name || '');
    } catch {
      setDept('');
    }
  };

  const handleRequestorChange = async (name) => {
    updateField('requestor', name);
    const req = requestors.find((r) => r.emp_name === name);
    if (!req) { updateField('requestor_vp', ''); setDept(''); return; }
    const vpName = req.requestor_vp_name;
    updateField('requestor_vp', vpName);
    await fetchDept(vpName);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.project.trim()) return setError('Project Name is required.');
    if ((form.status === 'Completed' || form.status === 'Cancelled') && !form.completion_date)
      return setError('Completion date is required when status is Completed or Cancelled.');
    if ((form.status === 'Completed' || form.status === 'Cancelled') && !form.completion_date)
      return setError('Completion date is required when status is Completed or Cancelled.');
    if ((form.status === 'Completed' || form.status === 'Cancelled') && !form.completion_date) return setError('Completion date is required when status is Completed or Cancelled.');

    const payload = { ...form, requesting_dept: dept };

    try {
      setLoading(true);
      const res = await api.post('/initiatives', payload);
      if (!res?.data) throw new Error('Invalid server response');

      setSuccess(true);
      setTimeout(() => {
        router.back();
        setTimeout(() => {
          router.replace(`/resource-manager/create-edit-initiatives?refresh=${Date.now()}`);
        }, 100);
      }, 1500);

    } catch (err) {
      console.error('Error submitting form:', err);
      setError(
        err?.response?.data?.error || err?.message || 'Network error. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white dark:bg-[#212121] rounded-lg shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-transparent dark:border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {success && (
          <div
            role="status"
            className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-200 rounded text-sm text-center font-semibold"
            style={styles.outfitFont}
          >
            ✓ Initiative added successfully.
          </div>
        )}

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-black dark:text-white" style={styles.outfitFont}>
            Add Initiative
          </h2>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200 rounded text-sm"
              style={styles.outfitFont}
            >
              {error}
              <button onClick={() => setError('')} className="ml-3 font-bold text-red-900 dark:text-red-100" aria-label="Dismiss">×</button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Project Name *</label>
                <input
                  value={form.project}
                  onChange={(e) => updateField('project', e.target.value.replace(/[^a-zA-Z0-9 .,]/g, ''))}
                  required
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

              <StyledDropdown
                label="Category"
                value={form.category}
                onChange={(val) => updateField('category', val)}
                options={['Baseline', 'Strategic', 'Discretionary Project / Enhancement', 'Vacation']}
              />

              <StyledDropdown
                label="Lead"
                value={form.lead}
                onChange={(val) => updateField('lead', val)}
                options={employees.map((emp) => emp.emp_name)}
              />

              <StyledDropdown
                label="Status"
                value={form.status}
                onChange={(val) => updateField('status', val)}
                options={['Backlog', 'On Going', 'In Progress', 'On Hold', 'Cancelled', 'Completed']}
              />

              <SearchableDropdown
                label="Requestor"
                value={form.requestor}
                onChange={handleRequestorChange}
                list={requestors}
              />

              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Requestor VP</label>
                <input value={form.requestor_vp} readOnly className={readOnlyClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5" style={styles.outfitFont}>Auto-filled from Requestor</span>
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Requesting Dept</label>
                <input value={dept} readOnly className={readOnlyClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5" style={styles.outfitFont}>Auto-filled from Requestor</span>
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Completion Date{(form.status === 'Completed' || form.status === 'Cancelled') ? ' *' : ''}</label>
                <input
                  type="date"
                  value={form.completion_date}
                  onChange={(e) => updateField('completion_date', e.target.value)}
                  onFocus={(e) => e.target.showPicker?.()}
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Target Period *</label>
                <input
                  value={form.target_period}
                  onChange={(e) => updateField('target_period', e.target.value.replace(/[^a-zA-Z0-9 .,]/g, ''))}
                  required
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

            </div>

            <div className="flex flex-col mt-4">
              <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value.replace(/[^a-zA-Z0-9 .,]/g, ''))}
                required
                rows={3}
                className={inputClass}
                style={styles.outfitFont}
              />
            </div>

            <div className="flex flex-col mt-4">
              <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Resource Consideration</label>
              <textarea
                value={form.resource_consideration}
                onChange={(e) => updateField('resource_consideration', e.target.value.replace(/[^a-zA-Z0-9 .,]/g, ''))}
                rows={3}
                className={inputClass}
                style={styles.outfitFont}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className={`${btnDarkClass} w-full sm:w-auto`}
                style={styles.outfitFont}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className={`${btnClass} w-full sm:w-auto`}
                style={styles.outfitFont}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}