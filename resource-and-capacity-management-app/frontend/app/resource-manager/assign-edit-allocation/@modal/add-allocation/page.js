"use client";

/* =============================================================================
   AddAllocationModal.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Full-page modal for adding a new allocation (assigning an employee to a
     project). Validates the selection, checks for duplicates, and POSTs to
     /api/assignments-allocations.

   HOW IT WORKS:
     1. On mount, fetches all projects and all DM employees in parallel
     2. When a project is selected, fetches the assignment details for display
     3. When an employee is selected, fetches the employee details, dept, and
        manager name for display in the read-only fields
     4. On save: validates → duplicate check → POST
     5. On success: navigates back and triggers a refresh on the assignments page

   READ-ONLY FIELDS:
     Resource Name, Department, Reports To, Activity Category, Leader,
     Requestor, Requestor VP, and Requesting Dept are all read-only and
     auto-filled from the selected project/employee — the user cannot edit them.

   DUPLICATE CHECK:
     Before saving, the existing assignments are queried to verify the employee
     is not already assigned to the selected project. Non-fatal if the check
     fails — the backend will catch duplicates.

   SECURITY MODEL:
     • emp_id and project name are from server-sourced dropdown data — never
       user-typed values.
     • All URL params passed through encodeURIComponent().
     • API errors surfaced via error banner — never exposed as raw exceptions.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter for navigation
   ============================================================================= */

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";

const btnClass = `
  px-4 py-2 rounded text-sm
  border border-black/50 dark:border-slate-500/60
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
  w-full sm:w-auto
`;

/* =============================================================================
   COMPONENT: SearchableStyledDropdown
   Searchable dropdown — strips non-letter/space characters from search input
   to prevent injection. Displays selectedLabel in the trigger.
   valueKey and displayKey allow flexible use with any option object shape.
   ============================================================================= */
function SearchableStyledDropdown({ label, value, onChange, options, valueKey, displayKey }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const selectedLabel = options.find(o => String(o[valueKey]) === String(value))?.[displayKey] || "";
  const filtered = options.filter(opt => opt[displayKey].toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black dark:text-slate-100 mb-1">{label}</label>

      {/* Trigger button — shows selected label or placeholder */}
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}
        className="
          bg-white dark:bg-[#1f1f1f] text-black dark:text-slate-100 border border-gray-500 dark:border-slate-600 p-2
          cursor-pointer flex justify-between items-center
          hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition
        "
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">{selectedLabel || `Select ${label}`}</span>
        <svg className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 w-full bg-white dark:bg-[#1f1f1f] border border-gray-500 dark:border-slate-600 rounded shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)] z-50 mt-1"
        >
          {/* Search bar — letters and spaces only */}
          <input
            type="text"
            placeholder={`Search ${label}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ""))}
            className="
              p-2 border-b border-gray-300 dark:border-slate-700 w-full text-black dark:text-slate-100 bg-white dark:bg-[#1f1f1f]
              focus:outline-none focus:bg-[#017ACB]/10 dark:focus:bg-[#017ACB]/20
            "
            aria-label={`Search ${label}`}
          />
          <div className="max-h-60 overflow-y-auto" role="group">
            {filtered.length === 0 && (
              <div className="p-2 text-sm text-gray-400 dark:text-slate-400">No results</div>
            )}
            {filtered.map((opt) => (
              <div
                key={opt[valueKey]}
                role="option"
                aria-selected={opt[valueKey] === value}
                className={`
                  p-2 cursor-pointer text-sm text-black dark:text-slate-100 transition
                  hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30
                  ${opt[valueKey] === value ? "bg-[#017ACB]/10 dark:bg-[#0A5F8A]/40 font-medium" : ""}
                `}
                onClick={() => {
                  const raw = opt[valueKey];
                  // Coerce to Number if the value looks numeric — backend expects integer emp_id
                  onChange(typeof raw === 'number' || (raw !== null && !isNaN(Number(raw)) && raw !== '') ? Number(raw) : raw);
                  setOpen(false); setSearch("");
                }}
              >
                {opt[displayKey]}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   COMPONENT: ReadOnlyField — displays a read-only auto-filled value.
   ============================================================================= */
function ReadOnlyField({ label, value }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-black dark:text-slate-100 mb-1">{label}</label>
      <div className="bg-gray-200 text-black border border-gray-500 p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">
        {value || "—"}
      </div>
    </div>
  );
}

/* =============================================================================
   MAIN COMPONENT: AddAllocationModal
   ============================================================================= */
export default function AddAllocationModal() {
  const router = useRouter();

  const [projects, setProjects]     = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [selectedProject, setSelectedProject]   = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [assignmentData, setAssignmentData]     = useState(null); // Assignment details for display
  const [employeeData, setEmployeeData]         = useState(null); // Employee details for display
  const [managerName, setManagerName]           = useState("");
  const [departmentName, setDepartmentName]     = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD PROJECTS + EMPLOYEES
     Fetches all projects and Data Management employees in parallel on mount.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const [projRes, empRes] = await Promise.all([
          api.get('/assignments-allocations/projects'),
          api.get('/assignments-allocations/employees/dm'),
        ]);
        setProjects(projRes.data?.projects   || []);
        setEmployees(empRes.data?.employees  || []);
      } catch { setError("Failed to load dropdown data. Please check your connection."); }
    }
    load();
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD ASSIGNMENT DETAILS
     Fetches the assignment record when a project is selected — fills the
     read-only fields (category, leader, requestor, etc.).
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedProject) return;
    async function loadAssignment() {
      try {
        const res = await api.get(`/assignments-allocations/projects?project=${encodeURIComponent(selectedProject)}`);
        setAssignmentData(res.data?.assignment || null);
      } catch { setAssignmentData(null); }
    }
    loadAssignment();
  }, [selectedProject]);

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD EMPLOYEE DETAILS
     Fetches employee record, department name, and manager name when an
     employee is selected — fills the read-only fields.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedEmployee) return;
    async function loadEmployee() {
      try {
        const res = await api.get(`/assignments-allocations/employee/${selectedEmployee}`);
        setEmployeeData(res.data?.employee || null);
        setDepartmentName(res.data?.department_name || "");
        if (res.data?.employee?.reports_to) {
          const mgrRes = await api.get(`/assignments-allocations/employee/${res.data.employee.reports_to}`);
          setManagerName(mgrRes.data?.employee?.emp_name || "");
        } else { setManagerName(""); }
      } catch { setEmployeeData(null); setManagerName(""); setDepartmentName(""); }
    }
    loadEmployee();
  }, [selectedEmployee]);

  /* ---------------------------------------------------------------------------
     HANDLER: handleSave
     Validates selection → duplicate check → POST.
  --------------------------------------------------------------------------- */
  async function handleSave() {
    if (!selectedProject || !selectedEmployee) {
      setError("Please select both a project and an employee."); return;
    }

    // Duplicate check — non-fatal if the endpoint is unavailable
    try {
      const dupRes = await api.get(`/assignments-allocations?emp_id=${encodeURIComponent(selectedEmployee)}&project=${encodeURIComponent(selectedProject)}`);
      const alreadyExists = (dupRes.data?.allAssignments || []).some(r =>
        String(r.employee?.emp_id) === String(selectedEmployee) && r.assignment?.project_name === selectedProject
      );
      if (alreadyExists) { setError("This employee is already assigned to this project."); return; }
    } catch { /* non-fatal */ }

    setLoading(true);
    setError("");
    try {
      const res = await api.post('/assignments-allocations', { emp_id: Number(selectedEmployee), project: selectedProject, date: null, amount: null });
      if (!res.data) { setError("Failed to save allocation. Please try again."); return; }
      setSuccess(true);
      setTimeout(() => {
        router.back();
        setTimeout(() => router.replace(`/resource-manager/assign-edit-allocation?refresh=${Date.now()}`), 120);
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save allocation. Please try again.");
    } finally { setLoading(false); }
  }

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">

      {/* Modal card */}
      <div className="bg-white dark:bg-[#212121] rounded-lg shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-transparent dark:border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">

        {/* ----------------------------------------------------------------- */}
        {/* HEADER                                                             */}
        {/* ----------------------------------------------------------------- */}
        <h2 className="text-xl sm:text-2xl font-bold font-[Outfit] mb-4 text-black dark:text-white">
          Add Allocation
        </h2>

        {/* Error banner — only shown when error is non-empty */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 rounded border border-red-300 dark:border-red-700 text-sm"
          >
            {error}
          </div>
        )}

        {/* Success banner — shown briefly after a successful save, before navigating away */}
        {success && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 p-3 bg-green-100 text-green-800 dark:bg-emerald-900/40 dark:text-emerald-200 rounded border border-green-400 dark:border-emerald-700 text-sm flex items-center gap-2"
          >
            {/* Checkmark icon */}
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 11 8 15 16 6" />
            </svg>
            Allocation added successfully.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Editable selections */}
          <SearchableStyledDropdown label="Project"  value={selectedProject}  onChange={val => { setSelectedProject(val);  setAssignmentData(null); }}  options={projects}   valueKey="project_name" displayKey="project_name" />
          <SearchableStyledDropdown label="Employee" value={selectedEmployee} onChange={val => { setSelectedEmployee(val); setEmployeeData(null); setManagerName(""); setDepartmentName(""); }} options={employees} valueKey="emp_id" displayKey="emp_name" />

          {/* Read-only auto-filled fields */}
          <ReadOnlyField label="Resource Name"      value={employeeData?.emp_name} />
          <ReadOnlyField label="Department"         value={departmentName} />
          <ReadOnlyField label="Reports To"         value={managerName} />
          <ReadOnlyField label="Activity Category"  value={assignmentData?.category} />
          <ReadOnlyField label="Leader Accountable" value={assignmentData?.leader} />
          <ReadOnlyField label="Requestor"          value={assignmentData?.requestor} />
          <ReadOnlyField label="Requestor VP"       value={assignmentData?.requestor_vp} />
          <ReadOnlyField label="Requesting Dept"    value={assignmentData?.requesting_dept} />
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6">

          {/* CANCEL */}
          <button
            type="button"
            onClick={() => router.back()}
            className={`${btnClass} bg-[#003A5C] text-white dark:bg-slate-800 dark:text-slate-200`}
          >
            Cancel
          </button>

          {/* SAVE — disabled while loading */}
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            aria-disabled={loading}
            className={`${btnClass} bg-[#017ACB] text-white dark:bg-[#0A5F8A] dark:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? "Saving..." : "Save Allocation"}
          </button>
        </div>
      </div>
    </div>
  );
}