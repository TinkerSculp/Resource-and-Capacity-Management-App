"use client";
export const dynamic = 'force-dynamic';
/* =============================================================================
   EditAllocationModal.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Full-page modal for editing an existing allocation — changing either the
     employee, the project, or both. Validates the change, checks for
     duplicates, and POSTs to /api/assignments-allocations/reassign.

   HOW IT WORKS:
     1. Reads emp_id and project from URL search params
     2. Fetches dropdown lists (projects, DM employees) in parallel
     3. Fetches the employee and assignment details for pre-population
     4. On save: validates → duplicate check → POST to /reassign
     5. On success: navigates back and triggers a refresh

   REASSIGN VS CREATE:
     This modal uses a /reassign endpoint rather than a DELETE + POST.
     The reassign endpoint carries allocation values over from the old
     assignment to the new one — so FTE values are preserved when the
     employee or project is changed.

   NO-OP CHECK:
     If neither the employee nor the project has changed, the modal closes
     without making an API call — avoids unnecessary database writes.

   SECURITY MODEL:
     • emp_id and project from URL params — never user-typed.
     • All URL params passed through encodeURIComponent().
     • Duplicate check before saving — backend also enforces uniqueness.
     • API errors surfaced via error banner.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useSearchParams, useRouter
   ============================================================================= */

import { useSearchParams, useRouter } from "next/navigation";
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
   COMPONENT: SearchableStyledDropdown — same as AddAllocationModal.
   ============================================================================= */
function SearchableStyledDropdown({ label, value, onChange, options, valueKey, displayKey }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const selectedLabel = options.find(o => String(o[valueKey]) === String(value))?.[displayKey] || "";
  const filtered = options.filter(opt => String(opt[displayKey]).toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black dark:text-slate-100 mb-1">{label}</label>

      {/* Trigger — shows selected label or placeholder */}
      <div
        className="bg-white dark:bg-[#1f1f1f] text-black dark:text-slate-100 border border-gray-500 dark:border-slate-600 p-2 rounded cursor-pointer flex justify-between items-center hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">{selectedLabel || `Select ${label}`}</span>
        <svg className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 w-full bg-white dark:bg-[#1f1f1f] border border-gray-500 dark:border-slate-600 rounded shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)] z-50 mt-1">
          {/* Search bar */}
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ""))}
            className="p-2 border-b border-gray-500 dark:border-slate-700 w-full text-black dark:text-slate-100 bg-white dark:bg-[#1f1f1f] hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition focus:outline-none"
          />
          {/* Option list */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-2 text-sm text-gray-400 dark:text-slate-400">No results</div>
            )}
            {filtered.map((opt) => (
              <div
                key={opt[valueKey]}
                className={`p-2 cursor-pointer text-sm text-black dark:text-slate-100 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition ${String(opt[valueKey]) === String(value) ? "bg-[#017ACB]/10 dark:bg-[#0A5F8A]/40 font-medium" : ""}`}
                onClick={() => {
                  const raw = opt[valueKey];
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
   MAIN COMPONENT: EditAllocationModal
   ============================================================================= */
export default function EditAllocationModal() {
  const searchParams   = useSearchParams();
  const router         = useRouter();
  const emp_id         = searchParams.get("emp_id");     // Original employee ID from URL
  const projectFromURL = searchParams.get("project");    // Original project name from URL

  const [employeeData, setEmployeeData]         = useState(null);
  const [departmentName, setDepartmentName]     = useState("");
  const [managerName, setManagerName]           = useState("");
  const [assignmentData, setAssignmentData]     = useState(null);
  const [originalAssignment, setOriginalAssignment] = useState(null); // Preserved for the reassign payload
  const [projects, setProjects]     = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [selectedProject, setSelectedProject]   = useState(projectFromURL || "");
  const [selectedEmployee, setSelectedEmployee] = useState(emp_id ? Number(emp_id) : "");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD DROPDOWN LISTS
  --------------------------------------------------------------------------- */
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [projRes, empRes] = await Promise.all([
          api.get('/assignments-allocations/projects'),
          api.get('/assignments-allocations/employees/dm'),
        ]);
        setProjects(projRes.data?.projects  || []);
        setEmployees(empRes.data?.employees || []);
      } catch { setError("Failed to load dropdowns. Please check your connection."); }
    }
    loadDropdowns();
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD EMPLOYEE DETAILS
     Fetches employee details, department, and manager whenever the selected
     employee changes.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedEmployee) return;
    async function loadEmployee() {
      try {
        const res = await api.get(`/assignments-allocations/employee/${selectedEmployee}`);
        if (!res.data) { setError("Failed to load employee details."); return; }
        setEmployeeData(res.data.employee || null);
        setDepartmentName(res.data.department_name || "");
        if (res.data.employee?.reports_to) {
          const mgrRes = await api.get(`/assignments-allocations/employee/${res.data.employee.reports_to}`);
          setManagerName(mgrRes.data?.employee?.emp_name || "");
        } else { setManagerName(""); }
      } catch { setError("Network error loading employee details."); }
    }
    loadEmployee();
  }, [selectedEmployee]);

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD ORIGINAL ASSIGNMENT
     Pre-populates assignment data from the URL project param on initial load.
     Preserved as originalAssignment for the reassign payload.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!projectFromURL) { setLoading(false); return; }
    async function loadAssignment() {
      try {
        const res = await api.get(`/assignments-allocations/projects?project=${encodeURIComponent(projectFromURL)}`);
        setAssignmentData(res.data?.assignment || null);
        setOriginalAssignment(res.data?.assignment || null); // Preserved for the reassign API
      } catch { setError("Network error loading assignment details."); }
      finally { setLoading(false); }
    }
    loadAssignment();
  }, [projectFromURL]);

  /* ---------------------------------------------------------------------------
     EFFECT: RELOAD ASSIGNMENT WHEN PROJECT CHANGES
     Fetches the new assignment details if the user changes the selected project.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedProject) return;
    async function loadAssignmentForSelected() {
      try {
        const res = await api.get(`/assignments-allocations/projects?project=${encodeURIComponent(selectedProject)}`);
        setAssignmentData(res.data?.assignment || null);
      } catch { setError("Network error loading assignment details."); }
    }
    loadAssignmentForSelected();
  }, [selectedProject]);

  /* ---------------------------------------------------------------------------
     HANDLER: handleSave
     ---------------------------------------------------------------------------
     No-op if nothing changed. Duplicate check before saving.
     Uses /reassign endpoint — preserves allocation values from old assignment.
  --------------------------------------------------------------------------- */
  async function handleSave() {
    if (!selectedProject || !selectedEmployee) {
      setError("Please select both a project and an employee."); return;
    }

    const oldEmpId   = Number(emp_id);
    const newEmpId   = Number(selectedEmployee);
    const oldProject = projectFromURL;
    const newProject = selectedProject;

    // No-op — nothing changed, just close
    if (oldEmpId === newEmpId && oldProject === newProject) { router.back(); return; }

    // Duplicate check — non-fatal if endpoint unavailable
    try {
      const dupRes = await api.get(`/assignments-allocations?emp_id=${encodeURIComponent(newEmpId)}&project=${encodeURIComponent(newProject)}`);
      const alreadyExists = (dupRes.data?.allAssignments || []).some(r =>
        String(r.employee?.emp_id) === String(newEmpId) && r.assignment?.project_name === newProject
      );
      if (alreadyExists) { setError("This employee is already assigned to this project."); return; }
    } catch { /* non-fatal */ }

    try {
      await api.post('/assignments-allocations/reassign', {
        old_emp_id:   oldEmpId,
        new_emp_id:   newEmpId,
        old_project:  oldProject,
        new_project:  newProject,
        old_category: originalAssignment?.category || null, // From the original load
        new_category: assignmentData?.category     || null, // From the current selection
      });
      setSuccess(true);
      setTimeout(() => {
        router.back();
        setTimeout(() => router.replace(`/resource-manager/assign-edit-allocation?refresh=${Date.now()}`), 120);
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to update allocation. Please try again.");
    }
  }

  /* ---------------------------------------------------------------------------
     LOADING + ERROR STATES
  --------------------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
        <div className="bg-white dark:bg-[#212121] text-black dark:text-slate-100 p-6 rounded-lg border border-black dark:border-slate-600 shadow-xl w-full max-w-md">
          Loading…
        </div>
      </div>
    );
  }

  if (error && !employeeData) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
        <div className="bg-white dark:bg-[#212121] text-black dark:text-slate-100 p-6 rounded-lg border border-black dark:border-slate-600 shadow-xl w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">Error</h2>
          <p className="text-sm">{error || "Unable to load allocation"}</p>
          <button
            className={`mt-4 ${btnClass} bg-gray-200 text-black dark:bg-slate-800 dark:text-slate-200`}
            onClick={() => router.back()}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white dark:bg-[#212121] rounded-lg shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-transparent dark:border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">

        {/* HEADER */}
        <h2 className="text-xl sm:text-2xl font-bold font-[Outfit] mb-4 text-black dark:text-white">
          Edit Allocation — {employeeData?.emp_name}
        </h2>

        {/* Error banner */}
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
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 11 8 15 16 6" />
            </svg>
            Allocation updated successfully.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <SearchableStyledDropdown
            label="Project"
            value={selectedProject}
            onChange={setSelectedProject}
            options={projects}
            valueKey="project_name"
            displayKey="project_name"
          />

          <SearchableStyledDropdown
            label="Employee"
            value={selectedEmployee}
            onChange={(val) => setSelectedEmployee(val)}
            options={employees}
            valueKey="emp_id"
            displayKey="emp_name"
          />

          {/* READ-ONLY FIELDS — exact original bg-gray-200 / border-gray-500 / p-2 preserved */}
          <div className="flex flex-col">
            <label className="text-xs text-black dark:text-slate-100 mb-1">Resource Name</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">{employeeData?.emp_name}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black dark:text-slate-100 mb-1">Department</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">{departmentName || "—"}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black dark:text-slate-100 mb-1">Reports To</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">{managerName || "—"}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black dark:text-slate-100 mb-1">Activity Category</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">{assignmentData?.category || "—"}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black dark:text-slate-100 mb-1">Leader Accountable</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">{assignmentData?.leader || "—"}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black dark:text-slate-100 mb-1">Requestor</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">{assignmentData?.requestor || "—"}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black dark:text-slate-100 mb-1">Requestor VP</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">{assignmentData?.requestor_vp || "—"}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black dark:text-slate-100 mb-1">Requesting Dept</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">{assignmentData?.requesting_dept || "—"}</div>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6">

          <button
            type="button"
            onClick={() => router.back()}
            className={`${btnClass} bg-gray-200 text-black dark:bg-slate-800 dark:text-slate-200`}
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            aria-disabled={loading}
            className={`${btnClass} bg-[#017ACB] text-white dark:bg-[#0A5F8A] dark:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}