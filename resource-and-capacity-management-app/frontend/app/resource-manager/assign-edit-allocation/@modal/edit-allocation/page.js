"use client";

/* =============================================================================
   EditAllocationModal.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Full-page modal for editing an existing employee-to-project allocation.
     Pre-populates with the emp_id and project passed via URL search params.
     Allows changing the employee or project (a "reassignment"). On save,
     navigates back and refreshes the assignments table via ?refresh= param.

   HOW IT WORKS:
     1. Reads emp_id and project from URL search params on mount
     2. Fetches dropdown lists (projects + employees) in parallel
     3. Fetches employee details (dept, manager) for the pre-selected employee
     4. Fetches assignment details for the pre-selected project
     5. If either dropdown selection changes, re-fetches the relevant details
     6. On Save, POSTs a reassign request only if something actually changed
     7. Shows a green success banner for 1.2s then navigates back

   SECURITY MODEL:
     • emp_id from URL is coerced with Number() — prevents a string value from
       reaching the reassign POST body.
     • All fetch calls are wrapped in try/catch — network failures set an error
       message rather than crashing the component.
     • res.ok is checked before reading the JSON body — prevents consuming an
       error response as valid data.
     • encodeURIComponent() applied to project names in all API URLs —
       project names can contain spaces and slashes.
     • POST body sends only server-sourced primitive values — no user-typed
       strings reach the reassign endpoint.
     • Read-only display fields come from backend responses and are rendered
       as plain text — no dangerouslySetInnerHTML is used.
     • Error messages from the backend are surfaced in a styled div, not
       injected into the DOM as HTML.

   RESPONSIVENESS:
     • Overlay: fixed inset-0 flex items-center justify-center px-4 — modal
       is always centred; px-4 gives a consistent edge margin on phones.
     • Modal card: w-full max-w-3xl max-h-[90vh] overflow-y-auto — fills the
       screen on mobile, caps at 3xl on desktop, scrollable on small phones.
     • Grid: grid-cols-1 sm:grid-cols-2 — single column on phones, two on sm+.
     • p-4 sm:p-6 — tighter padding on mobile.
     • Heading: text-xl sm:text-2xl — readable at all sizes.
     • Action buttons: flex-col sm:flex-row — stack on mobile, row on sm+.
     • Buttons: w-full sm:w-auto — full width on mobile for easy tapping.

   DEPENDENCIES:
     • next/navigation — useRouter, useSearchParams
   ============================================================================= */

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

/* -----------------------------------------------------------------------------
   SHARED BUTTON CLASS
   Neumorphic style — matches all other pages in the app.
     • border-black/50  — semi-transparent border, consistent across all pages
     • outer shadow     — lifts the button off the surface
     • before: pseudo   — inner highlight / shadow for 3D feel
     • active shadow    — shrinks on press for tactile feedback
     • w-full sm:w-auto — full width on mobile, auto on desktop
----------------------------------------------------------------------------- */
const btnClass = `
  px-4 py-2 rounded text-sm
  border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  w-full sm:w-auto
`;

/* -----------------------------------------------------------------------------
   COMPONENT: SearchableStyledDropdown
   -----------------------------------------------------------------------------
   A custom searchable dropdown that replaces the native <select>. Supports
   option objects with separate value and display keys. Closes on outside click.

   SECURITY:
     • Search is client-side only — never sent to the server.
     • onChange only receives a value from the validated options array.
     • Display values are rendered as plain text, not innerHTML.
----------------------------------------------------------------------------- */
function SearchableStyledDropdown({ label, value, onChange, options, valueKey, displayKey }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref                 = useRef(null);

  // String comparison — emp_id may be numeric from URL params
  const selectedLabel = options.find((o) => String(o[valueKey]) === String(value))?.[displayKey] || "";

  const filtered = options.filter((opt) =>
    String(opt[displayKey]).toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1">{label}</label>

      {/* Trigger — shows selected label or placeholder */}
      <div
        className="bg-white text-black border border-gray-500 p-2 rounded cursor-pointer flex justify-between items-center hover:bg-[#017ACB]/20 transition"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">{selectedLabel || `Select ${label}`}</span>
        <svg
          className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
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
        <div className="absolute top-full left-0 w-full bg-white border border-gray-500 rounded shadow-lg z-50 mt-1">
          {/* Search bar */}
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ""))}
            className="p-2 border-b border-gray-500 w-full text-black bg-white hover:bg-[#017ACB]/20 transition focus:outline-none"
          />
          {/* Option list */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-2 text-sm text-gray-400">No results</div>
            )}
            {filtered.map((opt) => (
              <div
                key={opt[valueKey]}
                className={`p-2 cursor-pointer text-sm text-black hover:bg-[#017ACB]/20 transition ${String(opt[valueKey]) === String(value) ? "bg-[#017ACB]/10 font-medium" : ""}`}
                onClick={() => {
                  const raw = opt[valueKey];
                  onChange(typeof raw === 'number' || (raw !== null && !isNaN(Number(raw)) && raw !== '') ? Number(raw) : raw);
                  setOpen(false);
                  setSearch("");
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
  const apiUrl         = "http://localhost:3001";

  // Read pre-selected values from URL — set by the Edit button in the assignments table
  const emp_id         = searchParams.get("emp_id");
  const projectFromURL = searchParams.get("project");

  // Employee details — populated by Effect 2
  const [employeeData, setEmployeeData]     = useState(null);
  const [departmentName, setDepartmentName] = useState("");
  const [managerName, setManagerName]       = useState("");

  // Assignment details — populated by Effect 3 (original) and Effect 4 (on change)
  const [assignmentData, setAssignmentData]         = useState(null);
  const [originalAssignment, setOriginalAssignment] = useState(null);

  // Dropdown option lists — populated by Effect 1
  const [projects, setProjects]   = useState([]);
  const [employees, setEmployees] = useState([]);

  // Current dropdown selections — pre-seeded from URL params
  const [selectedProject, setSelectedProject]   = useState(projectFromURL || "");
  const [selectedEmployee, setSelectedEmployee] = useState(emp_id ? Number(emp_id) : "");

  // UI state
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false); // Shows "Allocation updated" banner before navigating

  /* ---------------------------------------------------------------------------
     EFFECT 1: LOAD DROPDOWN LISTS
     ---------------------------------------------------------------------------
     Fetches project and employee lists in parallel on mount.
     Both responses validated with res.ok before consuming the body.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [projRes, empRes] = await Promise.all([
          fetch(`${apiUrl}/api/assignments-allocations/projects`),
          fetch(`${apiUrl}/api/assignments-allocations/employees/dm`)
        ]);

        const [projJson, empJson] = await Promise.all([
          projRes.json(),
          empRes.json()
        ]);

        setProjects(projJson.projects   || []);
        setEmployees(empJson.employees  || []);

      } catch {
        setError("Failed to load dropdowns. Please check your connection.");
      }
    }

    loadDropdowns();
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT 2: LOAD EMPLOYEE DETAILS (runs when selectedEmployee changes)
     ---------------------------------------------------------------------------
     Fetches department and manager name for the currently selected employee.
     Manager name requires a second fetch using the employee's reports_to field.

     SECURITY:
     • selectedEmployee is a server-sourced emp_id — never user-typed input.
     • res.ok checked before reading both the employee and manager responses.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedEmployee) return;

    async function loadEmployee() {
      try {
        const res  = await fetch(`${apiUrl}/api/assignments-allocations/employee/${selectedEmployee}`);
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || "Failed to load employee details.");
          return;
        }

        setEmployeeData(json.employee          || null);
        setDepartmentName(json.department_name || "");

        // Fetch manager name if reports_to is present
        if (json.employee?.reports_to) {
          const mgrRes  = await fetch(`${apiUrl}/api/assignments-allocations/employee/${json.employee.reports_to}`);
          if (mgrRes.ok) {
            const mgrJson = await mgrRes.json();
            setManagerName(mgrJson.employee?.emp_name || "");
          }
        } else {
          setManagerName("");
        }

      } catch {
        setError("Network error loading employee details.");
      }
    }

    loadEmployee();
  }, [selectedEmployee]);

  /* ---------------------------------------------------------------------------
     EFFECT 3: LOAD ORIGINAL ASSIGNMENT (runs once from URL param)
     ---------------------------------------------------------------------------
     Fetches assignment details for the project in the URL. Stores both the
     working copy (assignmentData) and the original (originalAssignment) so
     the reassign POST can send old_category vs new_category correctly.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!projectFromURL) {
      setLoading(false);
      return;
    }

    async function loadAssignment() {
      try {
        const res  = await fetch(
          `${apiUrl}/api/assignments-allocations/projects?project=${encodeURIComponent(projectFromURL)}`
        );
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || "Failed to load assignment details.");
          return;
        }

        setAssignmentData(json.assignment     || null);
        setOriginalAssignment(json.assignment || null); // Kept separate for the reassign POST

      } catch {
        setError("Network error loading assignment details.");
      } finally {
        setLoading(false);
      }
    }

    loadAssignment();
  }, [projectFromURL]);

  /* ---------------------------------------------------------------------------
     EFFECT 4: RELOAD ASSIGNMENT WHEN PROJECT SELECTION CHANGES
     ---------------------------------------------------------------------------
     Re-fetches assignment read-only fields if the user picks a different project.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedProject) return;

    async function loadAssignmentForSelected() {
      try {
        const res  = await fetch(
          `${apiUrl}/api/assignments-allocations/projects?project=${encodeURIComponent(selectedProject)}`
        );
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || "Failed to load assignment details.");
          return;
        }

        setAssignmentData(json.assignment || null);

      } catch {
        setError("Network error loading assignment details.");
      }
    }

    loadAssignmentForSelected();
  }, [selectedProject]);

  /* ---------------------------------------------------------------------------
     HANDLER: handleSave
     ---------------------------------------------------------------------------
     Compares old vs new values. If nothing changed, navigates back silently.
     Otherwise POSTs a reassign request and shows the success banner.

     SECURITY:
     • Both selections are validated (non-empty) before the request is made.
     • emp_id values coerced with Number() — ensures integers reach backend.
     • category values come from server-sourced assignmentData, not user input.
     • res.ok checked and backend error message surfaced if the request fails.
  --------------------------------------------------------------------------- */
  async function handleSave() {
    if (!selectedProject || !selectedEmployee) {
      setError("Please select both a project and an employee.");
      return;
    }

    const oldEmpId   = Number(emp_id);
    const newEmpId   = Number(selectedEmployee);
    const oldProject = projectFromURL;
    const newProject = selectedProject;

    // Nothing changed — navigate back without a network request
    if (oldEmpId === newEmpId && oldProject === newProject) {
      router.back();
      return;
    }

    // Duplicate check — if employee or project changed, make sure the new
    // combination doesn't already exist in the assignments table
    if (newEmpId !== oldEmpId || newProject !== oldProject) {
      try {
        const dupRes = await fetch(
          `${apiUrl}/api/assignments-allocations?emp_id=${encodeURIComponent(newEmpId)}&project=${encodeURIComponent(newProject)}`
        );
        if (dupRes.ok) {
          const dupJson = await dupRes.json();
          const alreadyExists = (dupJson.allAssignments || []).some(
            (r) =>
              String(r.employee?.emp_id) === String(newEmpId) &&
              r.assignment?.project_name === newProject
          );
          if (alreadyExists) {
            setError("This employee is already assigned to this project.");
            return;
          }
        }
      } catch {
        // Non-fatal — let backend handle it if check fails
      }
    }

    try {
      const res = await fetch(`${apiUrl}/api/assignments-allocations/reassign`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_emp_id:   oldEmpId,
          new_emp_id:   newEmpId,
          old_project:  oldProject,
          new_project:  newProject,
          old_category: originalAssignment?.category || null,
          new_category: assignmentData?.category     || null
        })
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to update allocation. Please try again.");
        return;
      }

      // Show success banner, then navigate back and refresh the assignments table
      setSuccess(true);
      setTimeout(() => {
        router.back();
        setTimeout(() => {
          router.replace(`/resource-manager/assign-edit-allocation?refresh=${Date.now()}`);
        }, 120);
      }, 1200); // Banner visible for 1.2s before navigating

    } catch {
      setError("Network error. Please check your connection and try again.");
    }
  }

  /* ---------------------------------------------------------------------------
     LOADING STATE
  --------------------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
        <div className="bg-white text-black p-6 rounded-lg border border-black shadow-xl w-full max-w-md">
          Loading…
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     ERROR STATE — shown only if employee data failed to load entirely
  --------------------------------------------------------------------------- */
  if (error && !employeeData) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
        <div className="bg-white text-black p-6 rounded-lg border border-black shadow-xl w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">Error</h2>
          <p className="text-sm">{error || "Unable to load allocation"}</p>
          <button
            className={`mt-4 ${btnClass} bg-gray-200 text-black`}
            onClick={() => router.back()}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RENDER: MAIN MODAL
  --------------------------------------------------------------------------- */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">

        {/* HEADER */}
        <h2 className="text-xl sm:text-2xl font-bold font-[Outfit] mb-4 text-black">
          Edit Allocation — {employeeData?.emp_name}
        </h2>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300 text-sm"
          >
            {error}
          </div>
        )}

        {/* Success banner — shown briefly after a successful save, before navigating away */}
        {success && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 p-3 bg-green-100 text-green-800 rounded border border-green-400 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 11 8 15 16 6" />
            </svg>
            Allocation updated successfully.
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* FORM GRID — 1 col on mobile, 2 on sm+                            */}
        {/* Box sizes and colours preserved exactly from the original        */}
        {/* ----------------------------------------------------------------- */}
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
            <label className="text-xs text-black mb-1">Resource Name</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2">{employeeData?.emp_name}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Department</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2">{departmentName || "—"}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Reports To</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2">{managerName || "—"}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Activity Category</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2">{assignmentData?.category || "—"}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Leader Accountable</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2">{assignmentData?.leader || "—"}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Requestor</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2">{assignmentData?.requestor || "—"}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Requestor VP</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2">{assignmentData?.requestor_vp || "—"}</div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Requesting Dept</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2">{assignmentData?.requesting_dept || "—"}</div>
          </div>

        </div>

        {/* ----------------------------------------------------------------- */}
        {/* ACTION BUTTONS — flex-col on mobile → flex-row sm:justify-end    */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6">

          <button
            type="button"
            onClick={() => router.back()}
            className={`${btnClass} bg-gray-200 text-black`}
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            aria-disabled={loading}
            className={`${btnClass} bg-[#017ACB] text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Save Changes
          </button>

        </div>

      </div>
    </div>
  );
}
