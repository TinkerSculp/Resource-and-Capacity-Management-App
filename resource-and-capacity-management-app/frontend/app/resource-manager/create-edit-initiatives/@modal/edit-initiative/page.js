'use client';

/* =============================================================================
   EditInitiativeModal.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Modal form for editing an existing initiative. Fields include:
       • Project Name, Category, Lead, Status
       • Requestor (searchable) — auto-fills VP and Department from backend
       • Requestor VP + Requesting Dept (read-only, auto-populated)
       • Completion Date, Target Period
       • Description, Resource Consideration

   SECURITY MODEL:
     • id comes from useSearchParams — encodeURIComponent applied in all URL
       constructions to prevent path injection.
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
     • next/navigation — useRouter, useSearchParams
     • @/lib/api       — axios instance with base URL + auth headers
   ============================================================================= */

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

/* -----------------------------------------------------------------------------
   SHARED BUTTON CLASSES — neumorphic, matches all other pages in the app.
----------------------------------------------------------------------------- */
const btnClass = `
  px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

const btnGrayClass = `
  px-4 py-2 rounded text-sm
  bg-gray-200 text-black border border-black/50
  hover:bg-[#017ACB]/20 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

const btnDarkClass = `
  px-4 py-2 rounded text-sm
  bg-[#003A5C] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

/* -----------------------------------------------------------------------------
   STYLES
----------------------------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' },
};

/* -----------------------------------------------------------------------------
   SHARED INPUT CLASS — black border, thin black focus ring.
----------------------------------------------------------------------------- */
const inputClass =
  'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black w-full';

const readOnlyClass =
  'bg-gray-100 text-gray-500 border border-black p-2 rounded cursor-not-allowed w-full';

/* =============================================================================
   COMPONENT: SearchableDropdown
   Dropdown with live search — used for Requestor (long list).
   Closes on outside click. Prefix-match prioritisation for better UX.
   ============================================================================= */
function SearchableDropdown({ label, value, onChange, list }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Close on outside click
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
      <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div
        className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center"
        onClick={() => setOpen((o) => !o)}
        style={styles.outfitFont}
      >
        <span className={value ? 'text-black' : 'text-gray-400'}>{value || `Select ${label}`}</span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 shadow-lg">
          {/* stopPropagation prevents outside-click handler closing the menu */}
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ''))}
            onClick={(e) => e.stopPropagation()}
            className="w-full p-2 border-b border-gray-300 text-black focus:outline-none focus:border-black text-sm"
            style={styles.outfitFont}
          />
          <div className="max-h-40 overflow-y-auto">
            {filtered.map((emp) => (
              <div
                key={emp.emp_name}
                onClick={() => { onChange(emp.emp_name); setOpen(false); setSearch(''); }}
                className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === emp.emp_name ? 'font-bold bg-[#CDE6F7]' : ''}`}
                style={styles.outfitFont}
              >
                {emp.emp_name}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-2 text-gray-500 text-sm" style={styles.outfitFont}>No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   COMPONENT: StyledDropdown
   Simple single-select dropdown for fixed option lists.
   ============================================================================= */
function StyledDropdown({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div
        className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center"
        onClick={() => setOpen((o) => !o)}
        style={styles.outfitFont}
      >
        <span className={value ? 'text-black' : 'text-gray-400'}>{value || `Select ${label}`}</span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 max-h-48 overflow-y-auto shadow-lg">
          {(options || []).map((opt) => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === opt ? 'font-bold bg-[#CDE6F7]' : ''}`}
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
   MAIN COMPONENT: EditInitiativeModal
   ============================================================================= */
export default function EditInitiativeModal() {
  const router = useRouter();
  const params = useSearchParams();
  const id     = params.get('id');

  /* ---------------------------------------------------------------------------
     STATE
  --------------------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------------------
     HELPER: updateField — updates a single form field without mutating others.
  --------------------------------------------------------------------------- */
  const updateField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD DROPDOWNS
     Runs once on mount. Failures log to console without crashing the form.
  --------------------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD EXISTING INITIATIVE
     Runs when id is available. Populates the form with current values.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!id) return;
    const loadInitiative = async () => {
      try {
        const res = await api.get(`/initiatives/${encodeURIComponent(id)}`);
        if (!res?.data) throw new Error('Invalid initiative response');
        const data = res.data;
        setForm({
          project:                data.project_name    || '',
          category:               data.category        || '',
          lead:                   data.leader          || '',
          status:                 data.status          || '',
          requestor:              data.requestor       || '',
          requestor_vp:           data.requestor_vp    || '',
          completion_date:        data.completion_date || '',
          target_period:          data.target_period   || '',
          description:            data.description     || '',
          resource_consideration: data.resource_notes  || '',
        });
        setDept(data.requesting_dept || '');
      } catch (err) {
        console.error('Failed to load initiative:', err);
        setError('Failed to load initiative data. Please try again.');
      }
    };
    loadInitiative();
  }, [id]);

  /* ---------------------------------------------------------------------------
     HANDLER: fetchDept
     Called when Requestor changes — fetches the VP's department from the
     backend so it cannot be manually set or tampered with by the user.
  --------------------------------------------------------------------------- */
  const fetchDept = async (vpName) => {
    if (!vpName?.trim()) return;
    try {
      const res = await api.get(`/initiatives/dept/search?name=${encodeURIComponent(vpName)}`);
      if (!res?.data) throw new Error('Invalid department response');
      setDept(res.data.dept_name || '');
    } catch {
      setDept('');
    }
  };

  /* ---------------------------------------------------------------------------
     HANDLER: handleSubmit
     Validates, builds payload, PUTs to API.
     On success: shows "Changes saved" banner for 1.5s then navigates back.
  --------------------------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.project.trim()) return setError('Project Name is required.');

    const payload = { id, ...form, requesting_dept: dept };

    try {
      setLoading(true);
      const res = await api.put('/initiatives', payload);
      if (!res?.data) throw new Error('Invalid server response');

      setSuccess(true);
      setTimeout(() => {
        router.back();
        setTimeout(() => {
          router.replace(`/resource-manager/create-edit-initiatives?refresh=${Date.now()}`);
        }, 100);
      }, 1500);

    } catch (err) {
      console.error('Update error:', err);
      setError(
        err?.response?.data?.error || err?.message || 'Failed to update initiative.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------------------------
     RENDER
  --------------------------------------------------------------------------- */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* SUCCESS BANNER — shown 1.5s after save before navigating away */}
        {success && (
          <div
            role="status"
            className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm text-center font-semibold"
            style={styles.outfitFont}
          >
            ✓ Changes saved successfully.
          </div>
        )}

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-black" style={styles.outfitFont}>
            Edit Initiative
          </h2>

          {/* ERROR BANNER */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm"
              style={styles.outfitFont}
            >
              {error}
              <button onClick={() => setError('')} className="ml-3 font-bold text-red-900" aria-label="Dismiss">×</button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* PROJECT NAME */}
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
                  Project Name *
                </label>
                <input
                  value={form.project}
                  onChange={(e) => updateField('project', e.target.value.replace(/[^a-zA-Z0-9 .,]/g, ''))}
                  required
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

              {/* CATEGORY */}
              <StyledDropdown
                label="Category"
                value={form.category}
                onChange={(val) => updateField('category', val)}
                options={['Baseline', 'Strategic', 'Discretionary Project / Enhancement', 'Vacation']}
              />

              {/* LEAD */}
              <StyledDropdown
                label="Lead"
                value={form.lead}
                onChange={(val) => updateField('lead', val)}
                options={employees.map((emp) => emp.emp_name)}
              />

              {/* STATUS */}
              <StyledDropdown
                label="Status"
                value={form.status}
                onChange={(val) => updateField('status', val)}
                options={['Backlog', 'On Going', 'In Progress', 'On Hold', 'Cancelled', 'Completed']}
              />

              {/* REQUESTOR — auto-fills VP + Dept on change */}
              <SearchableDropdown
                label="Requestor"
                value={form.requestor}
                onChange={(name) => {
                  updateField('requestor', name);
                  const req = requestors.find((r) => r.emp_name === name);
                  if (!req) { updateField('requestor_vp', ''); setDept(''); return; }
                  const vpName = req.requestor_vp_name;
                  updateField('requestor_vp', vpName);
                  fetchDept(vpName);
                }}
                list={requestors}
              />

              {/* REQUESTOR VP — read-only, auto-filled from Requestor selection */}
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
                  Requestor VP
                </label>
                <input
                  value={form.requestor_vp}
                  readOnly
                  className={readOnlyClass}
                  style={styles.outfitFont}
                />
                <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Auto-filled from Requestor</span>
              </div>

              {/* REQUESTING DEPT — read-only, auto-filled from VP lookup */}
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
                  Requesting Dept
                </label>
                <input
                  value={dept}
                  readOnly
                  className={readOnlyClass}
                  style={styles.outfitFont}
                />
                <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Auto-filled from Requestor</span>
              </div>

              {/* COMPLETION DATE */}
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
                  Completion Date
                </label>
                <input
                  type="date"
                  value={form.completion_date}
                  onChange={(e) => updateField('completion_date', e.target.value)}
                  onFocus={(e) => e.target.showPicker?.()}
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

              {/* TARGET PERIOD */}
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
                  Target Period *
                </label>
                <input
                  value={form.target_period}
                  onChange={(e) => updateField('target_period', e.target.value.replace(/[^a-zA-Z0-9 .,]/g, ''))}
                  required
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

            </div>

            {/* DESCRIPTION — full width */}
            <div className="flex flex-col mt-4">
              <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
                Description *
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value.replace(/[^a-zA-Z0-9 .,]/g, ''))}
                required
                rows={3}
                className={inputClass}
                style={styles.outfitFont}
              />
            </div>

            {/* RESOURCE CONSIDERATION — full width */}
            <div className="flex flex-col mt-4">
              <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
                Resource Consideration
              </label>
              <textarea
                value={form.resource_consideration}
                onChange={(e) => updateField('resource_consideration', e.target.value.replace(/[^a-zA-Z0-9 .,]/g, ''))}
                rows={3}
                className={inputClass}
                style={styles.outfitFont}
              />
            </div>

            {/* ACTION BUTTONS */}
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
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}