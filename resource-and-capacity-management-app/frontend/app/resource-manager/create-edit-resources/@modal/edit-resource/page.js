'use client';

/* =============================================================================
   EditResourceModal.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Modal form for editing an existing employee/resource record. Fields:
       • Employee ID (read-only — cannot change the primary key after creation)
       • Name, Title (letters, spaces, commas, periods, hyphens, apostrophes)
       • Department (styled dropdown)
       • Reports To, Manager Level, Director Level, VP (searchable dropdowns)
       • Other Information (letters, digits, spaces, commas, periods only)
       • Status (Active / Inactive toggle — PATCHes immediately on click)

   SECURITY MODEL:
     • emp_id is read-only in the UI — the primary key is never editable after
       creation, preventing accidental or malicious ID changes.
     • Text fields strip characters outside the allowed set on every keystroke —
       no unexpected characters can reach the API.
     • dept_no, reports_to, manager_level, director_level, requestor_vp are
       resolved from server-sourced lookup lists before submit — user cannot
       inject arbitrary IDs by typing in these fields.
     • All fetch calls are wrapped in try/catch — network failures show an
       error banner rather than crashing or silently losing data.
     • encodeURIComponent() is applied to empId in all URL constructions —
       prevents path injection even if the ID contains special characters.
     • No dangerouslySetInnerHTML is used anywhere.
     • API base URL is a single constant — not constructed from user input.

   RESPONSIVENESS:
     • Modal uses max-w-3xl w-full — fills screen on mobile, capped on desktop.
     • Form grid uses grid-cols-1 sm:grid-cols-2 — single column on mobile.
     • Buttons use w-full sm:w-auto — full width on mobile, auto on desktop.
     • max-h-[90vh] overflow-y-auto on modal body — scrollable on short screens.

   DEPENDENCIES:
     • next/navigation — useRouter, useSearchParams
   ============================================================================= */

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API_BASE = 'http://localhost:3001/api';

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

const btnBlueClass = `
  px-4 py-2 rounded text-sm
  bg-[#003A5C] text-white border border-black/50
  hover:bg-[#017ACB]/20 transition hover:text-gray-700
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
   SHARED INPUT CLASS — black border, black focus ring (thin), matches Create.
----------------------------------------------------------------------------- */
const inputClass =
  'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black w-full';

/* =============================================================================
   COMPONENT: StyledDropdown
   Simple single-select dropdown for fixed option lists (e.g. Department).
   Closes on outside click via mousedown listener on document.
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
          {options.map((opt) => (
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
   COMPONENT: SearchableDropdown
   Dropdown with a live search input for long lists (managers, directors, VPs).
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

  const filtered = list.filter((item) =>
    item.emp_name.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 max-h-64 overflow-y-auto shadow-lg">
          {/* stopPropagation prevents the outer click handler closing the menu */}
          <input
            className="w-full p-2 border-b border-gray-300 text-black focus:outline-none focus:border-black text-sm"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={styles.outfitFont}
          />
          {filtered.map((item) => (
            <div
              key={item.emp_id}
              onClick={() => { onChange(item.emp_name); setOpen(false); setSearch(''); }}
              className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === item.emp_name ? 'font-bold bg-[#CDE6F7]' : ''}`}
              style={styles.outfitFont}
            >
              {item.emp_name}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-2 text-gray-500 text-sm" style={styles.outfitFont}>No results</div>
          )}
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
  const empId        = searchParams.get('id');

  /* ---------------------------------------------------------------------------
     STATE
  --------------------------------------------------------------------------- */
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers]       = useState([]);
  const [employee, setEmployee]       = useState(null);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false); // true = show "Changes saved" banner

  const [statusValue, setStatusValue] = useState('Active');

  const [formData, setFormData] = useState({
    emp_id:         '',
    emp_name:       '',
    emp_title:      '',
    dept_no:        '',   // stores dept_name in UI — resolved to dept_no on submit
    reports_to:     '',   // stores emp_name in UI — resolved to emp_id on submit
    manager_level:  '',
    director_level: '',
    requestor_vp:   '',
    other_info:     '',
  });

  /* ---------------------------------------------------------------------------
     HELPERS — resolve UI display values back to DB IDs before submit.
     All lookups search server-sourced arrays — never user-typed strings.
  --------------------------------------------------------------------------- */
  const getNameById = (id)   => managers.find((m) => m.emp_id === id)?.emp_name    || '';
  const getDeptName = (no)   => departments.find((d) => d.dept_no === no)?.dept_name || '';
  const getDeptNo   = (name) => departments.find((d) => d.dept_name === name)?.dept_no || null;
  const getEmpId    = (name) => managers.find((m) => m.emp_name === name)?.emp_id   || null;

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD EMPLOYEE + LOOKUPS
     All three fetches run in parallel. Failures surface as error banners.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!empId) return;

    const load = async () => {
      try {
        const [empRes, deptRes, mgrRes] = await Promise.all([
          fetch(`${API_BASE}/resources/employees/${encodeURIComponent(empId)}`),
          fetch(`${API_BASE}/resources/departments`),
          fetch(`${API_BASE}/resources/managers`),
        ]);

        const [empData, deptData, mgrData] = await Promise.all([
          empRes.ok  ? empRes.json()  : Promise.resolve(null),
          deptRes.ok ? deptRes.json() : Promise.resolve([]),
          mgrRes.ok  ? mgrRes.json()  : Promise.resolve([]),
        ]);

        if (!empData) {
          setError('Employee not found.');
          return;
        }

        setEmployee(empData);
        setDepartments(deptData);
        setManagers(mgrData);
        setStatusValue(empData.current_status || 'Active');

        // Store raw IDs — converted to display names in the effects below
        // once lookup arrays are populated.
        setFormData({
          emp_id:         empData.emp_id         || '',
          emp_name:       empData.emp_name        || '',
          emp_title:      empData.emp_title       || '',
          dept_no:        empData.dept_no         || '',
          reports_to:     empData.reports_to      || '',
          manager_level:  empData.manager_level   || '',
          director_level: empData.director_level  || '',
          requestor_vp:   empData.requestor_vp    || '',
          other_info:     empData.other_info      || '',
        });

      } catch {
        setError('Failed to load employee data. Please try again.');
      }
    };

    load();
  }, [empId]);

  /* ---------------------------------------------------------------------------
     EFFECT: CONVERT MANAGER IDs → DISPLAY NAMES
     Runs after managers array is populated. Replaces numeric IDs stored in
     formData with the human-readable name shown in the dropdowns.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!managers.length) return;
    setFormData((prev) => ({
      ...prev,
      reports_to:     getNameById(prev.reports_to),
      manager_level:  getNameById(prev.manager_level),
      director_level: getNameById(prev.director_level),
      requestor_vp:   getNameById(prev.requestor_vp),
    }));
  }, [managers]);

  /* ---------------------------------------------------------------------------
     EFFECT: CONVERT DEPT ID → DISPLAY NAME
     Runs after departments array is populated.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!departments.length) return;
    setFormData((prev) => ({
      ...prev,
      dept_no: getDeptName(prev.dept_no),
    }));
  }, [departments]);

  /* ---------------------------------------------------------------------------
     INPUT HANDLERS
     emp_id    — read-only in edit mode, not user-editable.
     text fields — allow letters, digits, spaces, commas, periods, hyphens,
                   apostrophes. Strips everything else on keystroke.
  --------------------------------------------------------------------------- */
  const handleTextField = (field) => (e) => {
    const cleaned = e.target.value.replace(/[^a-zA-Z0-9 .,\-']/g, '');
    setFormData((prev) => ({ ...prev, [field]: cleaned }));
  };

  /* ---------------------------------------------------------------------------
     HANDLER: handleStatusChange
     Updates local state only — does NOT PATCH the API immediately.
     The status is included in the PUT payload on Save Changes, so pressing
     Cancel discards the change without persisting anything to the server.
  --------------------------------------------------------------------------- */
  const handleStatusChange = (status) => {
    setStatusValue(status);
  };

  /* ---------------------------------------------------------------------------
     HANDLER: handleEdit
     Validates required fields, resolves display values to IDs, PUTs to API.
     On success: shows the "Changes saved" banner for 1.5s then navigates back.
  --------------------------------------------------------------------------- */
  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.emp_name.trim())  return setError('Name is required.');
    if (!formData.emp_title.trim()) return setError('Title is required.');

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
      const res = await fetch(`${API_BASE}/resources/employees/${encodeURIComponent(empId)}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || 'Failed to save changes. Please try again.');
        return;
      }

      // Show success banner then navigate back
      setSuccess(true);
      setTimeout(() => {
        router.back();
        setTimeout(() => {
          router.replace(`/resource-manager/create-edit-resources?refresh=${Date.now()}`);
        }, 50);
      }, 1500);

    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------------------------
     LOADING STATE — wait for employee + both lookup lists before rendering
  --------------------------------------------------------------------------- */
  if (!employee || !managers.length || !departments.length) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" aria-label="Loading" />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RENDER
  --------------------------------------------------------------------------- */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* ----------------------------------------------------------------- */}
        {/* SUCCESS BANNER                                                      */}
        {/* Shown for 1.5s after a successful save before navigating away.     */}
        {/* ----------------------------------------------------------------- */}
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
          <h2 className="text-2xl font-bold mb-6 text-black" style={styles.outfitFont}>
            Edit Resource
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

          <form onSubmit={handleEdit} noValidate>

            {/* FORM GRID — 1 col on mobile, 2 col on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* EMPLOYEE ID — read-only, cannot be changed after creation */}
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
                  Employee ID
                </label>
                <input
                  type="text"
                  value={formData.emp_id}
                  readOnly
                  className="bg-gray-100 text-gray-500 border border-black p-2 rounded cursor-not-allowed w-full"
                  style={styles.outfitFont}
                />
                <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Cannot be changed</span>
              </div>

              {/* NAME */}
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.emp_name}
                  onChange={handleTextField('emp_name')}
                  required
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

              {/* TITLE */}
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.emp_title}
                  onChange={handleTextField('emp_title')}
                  required
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

              {/* DEPARTMENT */}
              <StyledDropdown
                label="Department"
                value={formData.dept_no}
                onChange={(val) => setFormData((prev) => ({ ...prev, dept_no: val }))}
                options={departments.map((d) => d.dept_name)}
              />

              {/* REPORTS TO */}
              <SearchableDropdown
                label="Reports To"
                value={formData.reports_to}
                onChange={(val) => setFormData((prev) => ({ ...prev, reports_to: val }))}
                list={managers}
              />

              {/* MANAGER LEVEL */}
              <SearchableDropdown
                label="Manager Level"
                value={formData.manager_level}
                onChange={(val) => setFormData((prev) => ({ ...prev, manager_level: val }))}
                list={managers}
              />

              {/* DIRECTOR LEVEL */}
              <SearchableDropdown
                label="Director Level"
                value={formData.director_level}
                onChange={(val) => setFormData((prev) => ({ ...prev, director_level: val }))}
                list={managers}
              />

              {/* VP */}
              <SearchableDropdown
                label="VP"
                value={formData.requestor_vp}
                onChange={(val) => setFormData((prev) => ({ ...prev, requestor_vp: val }))}
                list={managers}
              />

            </div>

            {/* OTHER INFORMATION — letters, digits, spaces, commas, periods only */}
            <div className="flex flex-col mt-4">
              <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
                Other Information
              </label>
              <textarea
                value={formData.other_info}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^a-zA-Z0-9 .,]/g, '');
                  setFormData((prev) => ({ ...prev, other_info: cleaned }));
                }}
                rows={3}
                className={inputClass}
                style={styles.outfitFont}
              />
            </div>

            {/* STATUS — Active / Inactive toggle, text always black */}
            <div className="mt-4">
              <label className="text-xs text-black font-semibold block mb-2" style={styles.outfitFont}>
                Status
              </label>
              <div className="flex gap-3 flex-wrap">

                <button
                  type="button"
                  onClick={() => handleStatusChange('Active')}
                  className={`
                    px-4 py-2 rounded text-sm text-black font-semibold border border-black/50 transition
                    shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                    ${statusValue === 'Active'
                      ? 'bg-green-200 border-green-600'
                      : 'bg-green-50 hover:bg-green-100'}
                  `}
                  style={styles.outfitFont}
                >
                  Active
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange('Inactive')}
                  className={`
                    px-4 py-2 rounded text-sm text-black font-semibold border border-black/50 transition
                    shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                    ${statusValue === 'Inactive'
                      ? 'bg-red-200 border-red-600'
                      : 'bg-red-50 hover:bg-red-100'}
                  `}
                  style={styles.outfitFont}
                >
                  Inactive
                </button>

              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">

              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className={`${btnBlueClass} w-full sm:w-auto`}
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