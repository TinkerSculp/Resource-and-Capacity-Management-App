'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

/* ---------------------------------------------------------
   SEARCHABLE DROPDOWN (Requestor + VP)
   - Supports search input
   - Click-outside-to-close behavior
   - Alphabetical + prefix prioritization sorting
   - Used for Requestor and Requestor VP fields
--------------------------------------------------------- */
function SearchableDropdown({ label, value, onChange, list }) {
  const [open, setOpen] = useState(false);      // Controls dropdown visibility
  const [search, setSearch] = useState("");     // Search input state
  const ref = useRef(null);                     // For click-outside detection

  const searchParams = useSearchParams();
  const id = searchParams.get("id");            // Used for edit mode (not used here but kept for consistency)

  /* ---------------------------------------------------------
     Close dropdown when clicking outside component
  --------------------------------------------------------- */
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------------------------------------------------
     Filter + prioritize results:
     - Matches search text anywhere
     - Prioritizes names starting with search text
  --------------------------------------------------------- */
  const filtered = list
    .filter(p => p.emp_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aMatch = a.emp_name.toLowerCase().startsWith(search.toLowerCase());
      const bMatch = b.emp_name.toLowerCase().startsWith(search.toLowerCase());
      return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
    });

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1">{label}</label>

      {/* Dropdown trigger */}
      <div
        className="bg-white text-black border p-2 rounded cursor-pointer flex justify-between items-center"
        onClick={() => setOpen(!open)}
      >
        <span>{value || `Select ${label}`}</span>

        {/* Arrow icon */}
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute top-full left-0 w-full bg-white border rounded shadow-lg z-50 mt-1">

          {/* Search bar */}
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 border-b w-full text-black"
          />

          {/* Scrollable list */}
          <div className="max-h-40 overflow-y-auto">
            {filtered.map((emp) => (
              <div
                key={emp.emp_name}
                className="p-2 cursor-pointer text-black hover:bg-blue-100"
                onClick={() => {
                  onChange(emp.emp_name);  // Update parent form
                  setOpen(false);          // Close dropdown
                  setSearch("");           // Reset search
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

/* ---------------------------------------------------------
   NON-SEARCH DROPDOWN (Category, Lead, Status)
   - Same styling as searchable dropdown
   - No search bar
   - Used for simple static lists
--------------------------------------------------------- */
function StyledDropdown({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  /* ---------------------------------------------------------
     Click-outside-to-close behavior
  --------------------------------------------------------- */
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1">{label}</label>

      {/* Dropdown trigger */}
      <div
        className="bg-white text-black border p-2 rounded cursor-pointer flex justify-between items-center"
        onClick={() => setOpen(!open)}
      >
        <span>{value || `Select ${label}`}</span>

        {/* Arrow icon */}
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute top-full left-0 w-full bg-white border rounded shadow-lg z-50 mt-1">
          <div className="max-h-40 overflow-y-auto">
            {options.map((opt) => (
              <div
                key={opt}
                className="p-2 cursor-pointer text-black hover:bg-blue-100"
                onClick={() => {
                  onChange(opt);   // Update parent form
                  setOpen(false);  // Close dropdown
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

/* ---------------------------------------------------------
   MAIN ADD INITIATIVE MODAL
   - Handles form state
   - Loads dropdown data
   - Auto-fills department based on VP
   - Submits to Add API
   - Exits modal route on success
--------------------------------------------------------- */
export default function AddInitiativeModal() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);     // Save button loading state
  const [employees, setEmployees] = useState([]);    // Lead dropdown
  const [requestors, setRequestors] = useState([]);  // Requestor + VP dropdowns
  const [error, setError] = useState("");            // Error message display
  const [dept, setDept] = useState("");              // Auto-filled department

  /* ---------------------------------------------------------
     FORM STATE
     - Mirrors backend Add API payload
  --------------------------------------------------------- */
  const [form, setForm] = useState({
    project: "",
    category: "",
    lead: "",
    status: "",
    requestor: "",
    requestor_vp: "",
    completion_date: "",
    target_period: "",
    description: "",
    resource_consideration: "",
  });

  /* ---------------------------------------------------------
     Load dropdown values (employees + requestors)
     - Runs once on mount
  --------------------------------------------------------- */
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const res = await fetch('/api/Resource-Manager/Initiatives/Dropdowns');
        const data = await res.json();
        setEmployees(data.employees || []);
        setRequestors(data.requestors || []);
      } catch (err) {
        console.error("Failed to load dropdowns:", err);
      }
    }
    loadDropdowns();
  }, []);

  /* ---------------------------------------------------------
     Auto-load department when VP changes
     - Calls GetDept API
  --------------------------------------------------------- */
  async function fetchDept(vpName) {
    if (!vpName.trim()) {
      setDept("");
      return;
    }
    try {
      const res = await fetch(`/api/Resource-Manager/Initiatives/GetDept?name=${vpName}`);
      const data = await res.json();
      setDept(res.ok ? data.dept_name : "");
    } catch {
      setDept("");
    }
  }

  /* ---------------------------------------------------------
     Update a single form field
  --------------------------------------------------------- */
  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ---------------------------------------------------------
     SUBMIT HANDLER
     - Sends POST request
     - Shows errors
     - Exits modal route on success
  --------------------------------------------------------- */
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  // Build payload for backend creation
  const payload = {
    ...form,
    requesting_dept: dept, // Auto-filled from VP selection
  };

  try {
    const res = await fetch('/api/Resource-Manager/Initiatives/Add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    // Handle validation or server errors
    if (!res.ok) {
      setError(result.error || "Something went wrong.");
      setLoading(false);
      return;
    }

    /* ---------------------------------------------------------
       CLOSE MODAL + REFRESH INITIATIVES PAGE
       - router.back() removes the @modal segment (closes modal)
       - After a short delay, router.replace() navigates to the
         parent page with a refresh param to trigger re-fetch
    --------------------------------------------------------- */

    // Step 1: Close the modal route
    router.back();

    // Step 2: Refresh parent page after modal unmounts
    setTimeout(() => {
      router.replace(
        `/Resource-Manager/create_edit_Initiatives?refresh=${Date.now()}`
      );
    }, 100);

  } catch (err) {
    console.error('Error submitting form:', err);
    setError("Network error. Try again.");
  } finally {
    setLoading(false);
  }
};

  /* ---------------------------------------------------------
     MODAL UI
     - Full-screen overlay
     - Centered modal card
     - Form fields + dropdowns
  --------------------------------------------------------- */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">

        <h2 className="text-2xl font-bold mb-4 font-[Outfit] text-black">
          Add Initiative
        </h2>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">

            {/* PROJECT NAME */}
            <div className="flex flex-col">
              <label className="text-xs text-black mb-1">Project Name</label>
              <input
                value={form.project}
                onChange={(e) => updateField("project", e.target.value)}
                required
                className="bg-white text-black border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#017ACB]"
              />
            </div>

            {/* CATEGORY */}
            <StyledDropdown
              label="Category"
              value={form.category}
              onChange={(val) => updateField("category", val)}
              options={[
                "Baseline",
                "Strategic",
                "Discretionary Project / Enhancement",
                "Vacation"
              ]}
            />

            {/* LEAD */}
            <StyledDropdown
              label="Lead"
              value={form.lead}
              onChange={(val) => updateField("lead", val)}
              options={employees.map((emp) => emp.emp_name)}
            />

            {/* STATUS */}
            <StyledDropdown
              label="Status"
              value={form.status}
              onChange={(val) => updateField("status", val)}
              options={[
                "Backlog",
                "Completed",
                "In Progress",
                "On Hold",
                "On Going"
              ]}
            />

            {/* REQUESTOR */}
            <SearchableDropdown
              label="Requestor"
              value={form.requestor}
              onChange={(val) => updateField("requestor", val)}
              list={requestors}
            />

            {/* REQUESTOR VP */}
            <SearchableDropdown
              label="Requestor VP"
              value={form.requestor_vp}
              onChange={(val) => {
                updateField("requestor_vp", val);
                fetchDept(val);  // Auto-fill department
              }}
              list={requestors}
            />

            {/* DEPARTMENT (auto-filled) */}
            <div className="flex flex-col">
              <label className="text-xs text-black mb-1">Requesting Dept</label>
              <input
                value={dept}
                readOnly
                className="bg-gray-100 text-black border border-gray-300 p-2 rounded"
              />
            </div>

            {/* COMPLETION DATE */}
            <div className="flex flex-col">
              <label className="text-xs text-black mb-1">Completion Date</label>
              <input
                type="date"
                value={form.completion_date}
                onChange={(e) => updateField("completion_date", e.target.value)}
                className="bg-white text-black border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#017ACB]"
              />
            </div>

            {/* TARGET PERIOD */}
            <div className="flex flex-col">
              <label className="text-xs text-black mb-1">Target Period</label>
              <input
                value={form.target_period}
                onChange={(e) => updateField("target_period", e.target.value)}
                required
                className="bg-white text-black border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#017ACB]"
              />
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="flex flex-col mt-4">
            <label className="text-xs text-black mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              required
              className="bg-white text-black border border-gray-300 p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#017ACB]"
            />
          </div>

          {/* RESOURCE CONSIDERATION */}
          <div className="flex flex-col mt-2">
            <label className="text-xs text-black mb-1">Resource Consideration</label>
            <textarea
              value={form.resource_consideration}
              onChange={(e) => updateField("resource_consideration", e.target.value)}
              className="bg-white text-black border border-gray-300 p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#017ACB]"
            />
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end gap-4 mt-6">

            {/* CANCEL */}
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-black rounded hover:bg-gray-300"
            >
              Cancel
            </button>

            {/* SAVE */}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#017ACB] text-white rounded hover:bg-blue-700"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}