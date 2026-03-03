'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

/**
 * ---------------------------------------------------------------------------
 * SEARCHABLE DROPDOWN COMPONENT
 * ---------------------------------------------------------------------------
 * PURPOSE:
 *   • Reusable dropdown with search, click‑outside closing, and defensive
 *     handling of undefined list values.
 *
 * SECURITY:
 *   • No sensitive data stored.
 *   • All values passed in from parent; no mutation of external state.
 *
 * DESIGN:
 *   • Prefix‑match prioritization for better UX.
 *   • Keyboard focus preserved via tabIndex.
 * ---------------------------------------------------------------------------
 */
function SearchableDropdown({ label, value, onChange, list }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = (list || [])
    .filter((p) =>
      p.emp_name?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const s = search.toLowerCase();
      const aMatch = a.emp_name?.toLowerCase().startsWith(s);
      const bMatch = b.emp_name?.toLowerCase().startsWith(s);
      return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
    });

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1">{label}</label>

      {/* Trigger */}
      <div
        tabIndex={0}
        className="
          bg-white text-black border border-gray-500 p-2 rounded
          cursor-pointer flex justify-between items-center
          hover:bg-[#017ACB]/20 transition
          focus:outline-none focus:ring-0 focus:border-gray-500
        "
        onClick={() => setOpen(!open)}
      >
        <span>{value || `Select ${label}`}</span>

        <svg
          className={`w-4 h-4 ml-2 transition-transform ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Menu */}
      {open && (
        <div className="absolute top-full left-0 w-full bg-white border border-gray-500 rounded shadow-lg z-50 mt-1">

          {/* Search bar */}
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              p-2 border-b border-gray-500 w-full text-black bg-white
              hover:bg-[#017ACB]/20 transition
              focus:outline-none focus:ring-0
            "
          />

          {/* List */}
          <div className="max-h-40 overflow-y-auto">
            {filtered.map((emp) => (
              <div
                key={emp.emp_name}
                className="
                  p-2 cursor-pointer text-black
                  hover:bg-[#017ACB]/20 transition
                "
                onClick={() => {
                  onChange(emp.emp_name);
                  setOpen(false);
                  setSearch('');
                }}
              >
                {emp.emp_name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * STYLED DROPDOWN (NO SEARCH)
 * ---------------------------------------------------------------------------
 * PURPOSE:
 *   • Lightweight dropdown for small, fixed option sets.
 *
 * DESIGN:
 *   • Same visual style as SearchableDropdown for consistency.
 *   • Minimal internal state.
 * ---------------------------------------------------------------------------
 */
function StyledDropdown({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1">{label}</label>

      {/* Trigger */}
      <div
        tabIndex={0}
        className="
          bg-white text-black border border-gray-500 p-2 rounded
          cursor-pointer flex justify-between items-center
          hover:bg-[#017ACB]/20 transition
          focus:outline-none focus:ring-0 focus:border-gray-500
        "
        onClick={() => setOpen(!open)}
      >
        <span>{value || `Select ${label}`}</span>

        <svg
          className={`w-4 h-4 ml-2 transition-transform ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Menu */}
      {open && (
        <div className="absolute top-full left-0 w-full bg-white border border-gray-500 rounded shadow-lg z-50 mt-1">
          <div className="max-h-40 overflow-y-auto">
            {(options || []).map((opt) => (
              <div
                key={opt}
                className="
                  p-2 cursor-pointer text-black
                  hover:bg-[#017ACB]/20 transition
                "
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * EDIT INITIATIVE MODAL
 * ---------------------------------------------------------------------------
 * PURPOSE:
 *   • Loads an existing initiative.
 *   • Allows editing of all editable fields.
 *   • Auto‑populates VP + Department based on Requestor.
 *
 * SECURITY:
 *   • All writes go through authenticated backend routes.
 *   • No sensitive data stored in component state.
 *   • VP + Dept are derived from backend data to prevent tampering.
 *
 * DESIGN:
 *   • Mirrors Add Initiative modal for consistent UX.
 *   • Uses controlled form state.
 * ---------------------------------------------------------------------------
 */
export default function EditInitiativeModal() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [employees, setEmployees] = useState([]);
  const [requestors, setRequestors] = useState([]);
  const [dept, setDept] = useState('');

  const [form, setForm] = useState({
    project: '',
    category: '',
    lead: '',
    status: '',
    requestor: '',
    requestor_vp: '',
    completion_date: '',
    target_period: '',
    description: '',
    resource_consideration: '',
  });

  /* LOAD DROPDOWNS */
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const res = await api.get('/initiatives/dropdowns');

        if (!res?.data) throw new Error('Invalid dropdown response');

        setEmployees(res.data.employees || []);
        setRequestors(res.data.requestors || []);
      } catch (err) {
        console.error('Failed to load dropdowns:', err);
      }
    }
    loadDropdowns();
  }, []);

  /* LOAD EXISTING INITIATIVE */
  useEffect(() => {
    async function loadInitiative() {
      try {
        const res = await api.get(`/initiatives/${id}`);

        if (!res?.data) throw new Error('Invalid initiative response');

        const data = res.data;

        setForm({
          project: data.project_name || '',
          category: data.category || '',
          lead: data.leader || '',
          status: data.status || '',
          requestor: data.requestor || '',
          requestor_vp: data.requestor_vp || '',
          completion_date: data.completion_date || '',
          target_period: data.target_period || '',
          description: data.description || '',
          resource_consideration: data.resource_notes || '',
        });

        setDept(data.requesting_dept || '');
      } catch (err) {
        console.error('Failed to load initiative:', err);
      }
    }

    if (id) loadInitiative();
  }, [id]);

  /* FETCH DEPT */
  async function fetchDept(vpName) {
    if (!vpName.trim()) return;

    try {
      const res = await api.get(`/initiatives/dept/search?name=${vpName}`);

      if (!res?.data) throw new Error('Invalid department response');

      setDept(res.data.dept_name || '');
    } catch {
      setDept('');
    }
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* SUBMIT */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      id,
      ...form,
      requesting_dept: dept,
    };

    try {
      const res = await api.put('/initiatives', payload);

      if (!res?.data) throw new Error('Invalid server response');

      router.back();

      setTimeout(() => {
        router.replace(
          `/resource-manager/create-edit-initiatives?refresh=${Date.now()}`
        );
      }, 100);

    } catch (err) {
      console.error('Update error:', err);

      setError(
        err?.response?.data?.error ||
        err?.message ||
        'Failed to update initiative.'
      );
    } finally {
      setLoading(false);
    }
  };

/**
 * ---------------------------------------------------------------------------
 * RENDER: Edit Initiative Modal
 * ---------------------------------------------------------------------------
 * PURPOSE:
 *   • Presents the full Edit Initiative form inside a modal overlay.
 *   • Mirrors the Add Initiative modal for consistent UX.
 *   • Auto‑populates Requestor → VP → Department to prevent user tampering.
 *
 * SECURITY:
 *   • No sensitive data stored client-side.
 *   • All writes flow through authenticated backend routes.
 *   • VP + Dept fields are read‑only and derived from backend data.
 *
 * DESIGN:
 *   • Modal overlay uses fixed positioning + backdrop blur.
 *   • All inputs follow the same visual standard:
 *       - border-gray-500
 *       - no browser focus outlines
 *       - consistent hover tint
 *   • Controlled form state ensures predictable updates.
 * ---------------------------------------------------------------------------
 */
return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">
      <h2 className="text-2xl font-bold mb-4 text-black">Edit Initiative</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">

          {/* PROJECT NAME */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Project Name</label>
            <input
              value={form.project}
              onChange={(e) => updateField('project', e.target.value)}
              required
              className="
                bg-white text-black border border-gray-500 p-2 rounded
                hover:bg-[#017ACB]/20 transition
                focus:outline-none focus:ring-0 focus:border-gray-500
              "
            />
          </div>

          {/* CATEGORY */}
          <StyledDropdown
            label="Category"
            value={form.category}
            onChange={(val) => updateField('category', val)}
            options={[
              'Baseline',
              'Strategic',
              'Discretionary Project / Enhancement',
              'Vacation',
            ]}
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
            options={[
              'Backlog',
              'On Going',
              'In Progress',
              'On Hold',
              'Cancelled',
              'Completed',
            ]}
          />

          {/* REQUESTOR */}
          <SearchableDropdown
            label="Requestor"
            value={form.requestor}
            onChange={(name) => {
              updateField("requestor", name);

              const req = requestors.find(r => r.emp_name === name);

              if (!req) {
                updateField("requestor_vp", "");
                setDept("");
                return;
              }

              const vpName = req.requestor_vp_name;
              updateField("requestor_vp", vpName);
              fetchDept(vpName);
            }}
            list={requestors}
          />

          {/* REQUESTOR VP (READ ONLY — AUTO-FILLED) */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Requestor VP</label>
            <input
              value={form.requestor_vp}
              readOnly
              className="
                bg-gray-200 text-black border border-gray-500 p-2 rounded
                focus:outline-none focus:ring-0 focus:border-gray-500
              "
            />
          </div>

          {/* DEPARTMENT (READ ONLY — AUTO-FILLED) */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Requesting Dept</label>
            <input
              value={dept}
              readOnly
              className="
                bg-gray-200 text-black border border-gray-500 p-2 rounded
                focus:outline-none focus:ring-0 focus:border-gray-500
              "
            />
          </div>

          {/* COMPLETION DATE */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Completion Date</label>
            <input
              type="date"
              value={form.completion_date}
              onChange={(e) => updateField('completion_date', e.target.value)}
              onFocus={(e) => e.target.showPicker()}
              className="
                bg-white text-black border border-gray-500 p-2 rounded
                hover:bg-[#017ACB]/20 transition cursor-pointer
                focus:outline-none focus:ring-0 focus:border-gray-500
              "
            />
          </div>

          {/* TARGET PERIOD */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Target Period</label>
            <input
              value={form.target_period}
              onChange={(e) => updateField('target_period', e.target.value)}
              required
              className="
                bg-white text-black border border-gray-500 p-2 rounded
                hover:bg-[#017ACB]/20 transition
                focus:outline-none focus:ring-0 focus:border-gray-500
              "
            />
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="flex flex-col mt-4">
          <label className="text-xs text-black mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            required
            className="
              bg-white text-black border border-gray-500 p-2 rounded w-full
              hover:bg-[#017ACB]/20 transition
              focus:outline-none focus:ring-0 focus:border-gray-500
            "
          />
        </div>

        {/* RESOURCE NOTES */}
        <div className="flex flex-col mt-2">
          <label className="text-xs text-black mb-1">Resource Consideration</label>
          <textarea
            value={form.resource_consideration}
            onChange={(e) =>
              updateField('resource_consideration', e.target.value)
            }
            className="
              bg-white text-black border border-gray-500 p-2 rounded w-full
              hover:bg-[#017ACB]/20 transition
              focus:outline-none focus:ring-0 focus:border-gray-500
            "
          />
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-4 mt-6">

          {/* CANCEL */}
          <button
            type="button"
            onClick={() => router.back()}
            className="
              flex-shrink-0 px-4 py-2
              bg-gray-200 text-black rounded
              hover:bg-[#017ACB]/20 transition
              shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              focus:outline-none focus:ring-0
            "
          >
            Cancel
          </button>

          {/* SAVE */}
          <button
            type="submit"
            disabled={loading}
            className="
              flex-shrink-0 px-4 py-2
              bg-[#017ACB] text-white rounded
              hover:bg-[#017ACB]/20 hover:text-gray-700 transition
              shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              focus:outline-none focus:ring-0
            "
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  </div>
);
}