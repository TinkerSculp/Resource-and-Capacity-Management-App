"use client";

/* =============================================================================
   AddAllocationModal.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Full-page modal for creating a new employee-to-project allocation.
     Rendered as an overlay so the assignments table remains mounted in the
     background. On save, navigates back and refreshes the assignments table
     via a ?refresh= query param to force a re-fetch.

   HOW IT WORKS:
     1. On mount, fetches the project and employee dropdown lists in parallel
     2. When a project is selected, fetches that project's assignment details
        (category, leader, requestor, etc.) and populates the read-only fields
     3. When an employee is selected, fetches their details (dept, manager)
        and populates the read-only fields
     4. On Save, POSTs the emp_id + project to the backend and navigates back

   SECURITY MODEL:
     • All fetch calls are wrapped in try/catch — network or JSON failures
       set an error message rather than crashing the component.
     • res.ok is checked before reading json — prevents consuming an error
       body as if it were valid data.
     • selectedProject is passed through encodeURIComponent() in the API URL
       — prevents injection if a project name contains special characters.
     • The POST body sends only Number(selectedEmployee) and selectedProject
       — both are validated (non-empty check) before the request is made.
     • Read-only display fields (category, leader, dept, etc.) come from the
       backend response and are rendered as plain text — no innerHTML or
       dangerouslySetInnerHTML is used anywhere.
     • Error messages from the backend are rendered inside a styled div, not
       injected into the DOM as HTML.

   RESPONSIVENESS:
     • Overlay uses flex items-center justify-center — modal is centred on
       all screen sizes including phones.
     • Modal uses w-full max-w-3xl mx-4 — fills the screen on mobile with a
       consistent 16px margin, caps at 3xl on desktop.
     • Grid uses grid-cols-1 sm:grid-cols-2 — single column on mobile,
       two columns on tablet and desktop.
     • Action buttons use flex-col sm:flex-row — stack on mobile, row on sm+.
     • Buttons are w-full sm:w-auto — full width on mobile for easy tapping.
     • Modal has max-h-[90vh] overflow-y-auto — never taller than the viewport;
       scrollable on very small phones.
     • p-4 sm:p-6 on the modal card — tighter padding on mobile.
     • text-xl sm:text-2xl on the heading — readable at all sizes.

   DEPENDENCIES:
     • next/navigation — useRouter for back navigation and refresh redirect
   ============================================================================= */

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

/* -----------------------------------------------------------------------------
   SHARED BUTTON CLASS
   Neumorphic style — matches all other pages in the app.
     • border-black/50  — semi-transparent border, consistent across all pages
     • outer shadow     — lifts the button off the surface
     • before: pseudo   — inner highlight / shadow for 3D feel
     • active shadow    — shrinks on press for tactile feedback
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
   PURPOSE:
     A custom searchable dropdown that replaces the native <select>. Supports
     option objects with separate value and display keys. Closes on outside
     click. Matches the visual style of the Initiatives modal.

   PROPS:
     label       {string}   — Field label shown above the trigger
     value       {any}      — Currently selected value (valueKey value)
     onChange    {function} — Called with the selected option's valueKey value
     options     {Array}    — Array of option objects
     valueKey    {string}   — Key on each option used as the value (e.g. "emp_id")
     displayKey  {string}   — Key on each option shown as the label (e.g. "emp_name")

   SECURITY:
     • Search is client-side filter only — never sent to the server.
     • onChange only receives a value from the validated options array —
       never from user-typed input directly.
     • displayKey values are rendered as text content, not innerHTML.
----------------------------------------------------------------------------- */
function SearchableStyledDropdown({ label, value, onChange, options, valueKey, displayKey }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref                 = useRef(null);

  // Find the display label for the currently selected value
  const selectedLabel = options.find((o) => o[valueKey] === value)?.[displayKey] || "";

  // Filter options by the search string — case-insensitive substring match
  const filtered = options.filter((opt) =>
    opt[displayKey].toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown on outside click
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

      {/* Trigger button — shows selected label or placeholder */}
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}
        className="
          bg-white text-black border border-gray-500 p-2
          cursor-pointer flex justify-between items-center
          hover:bg-[#017ACB]/20 transition
        "
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">{selectedLabel || `Select ${label}`}</span>

        {/* Chevron — rotates when open */}
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

      {/* Dropdown menu — rendered absolutely below the trigger */}
      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 w-full bg-white border border-gray-500 rounded shadow-lg z-50 mt-1"
        >
          {/* Search bar */}
          <input
            type="text"
            placeholder={`Search ${label}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              p-2 border-b border-gray-300 w-full text-black bg-white
              focus:outline-none focus:bg-[#017ACB]/10
            "
            aria-label={`Search ${label}`}
          />

          {/* Option list — max height with scroll */}
          <div className="max-h-60 overflow-y-auto" role="group">
            {filtered.length === 0 && (
              <div className="p-2 text-sm text-gray-400">No results</div>
            )}
            {filtered.map((opt) => (
              <div
                key={opt[valueKey]}
                role="option"
                aria-selected={opt[valueKey] === value}
                className={`
                  p-2 cursor-pointer text-sm text-black transition
                  hover:bg-[#017ACB]/20
                  ${opt[valueKey] === value ? "bg-[#017ACB]/10 font-medium" : ""}
                `}
                onClick={() => {
                  onChange(opt[valueKey]);
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

/* -----------------------------------------------------------------------------
   COMPONENT: ReadOnlyField
   A labelled read-only display box for auto-populated assignment/employee data.
   Renders "—" when the value is empty or null.
----------------------------------------------------------------------------- */
function ReadOnlyField({ label, value }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-black mb-1">{label}</label>
      <div className="bg-gray-200 text-black border border-gray-500 p-2">
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
  const apiUrl = "http://localhost:3001";

  // Dropdown option lists — populated from backend on mount
  const [projects, setProjects]   = useState([]);
  const [employees, setEmployees] = useState([]);

  // User selections
  const [selectedProject, setSelectedProject]   = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  // Auto-populated read-only fields — updated when selections change
  const [assignmentData, setAssignmentData] = useState(null);
  const [employeeData, setEmployeeData]     = useState(null);
  const [managerName, setManagerName]       = useState("");
  const [departmentName, setDepartmentName] = useState("");

  // UI state
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false); // Shows "Allocation added" banner before navigating away

  /* ---------------------------------------------------------------------------
     EFFECT 1: LOAD DROPDOWN LISTS
     ---------------------------------------------------------------------------
     Runs once on mount. Fetches projects and employees in parallel.
     Both requests are validated with res.ok before reading the body.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const [projRes, empRes] = await Promise.all([
          fetch(`${apiUrl}/api/assignments-allocations/projects`),
          fetch(`${apiUrl}/api/assignments-allocations/employees/dm`)
        ]);

        // Validate both responses before consuming their bodies
        if (!projRes.ok || !empRes.ok) {
          setError("Failed to load dropdown data. Please try again.");
          return;
        }

        const [projJson, empJson] = await Promise.all([
          projRes.json(),
          empRes.json()
        ]);

        setProjects(projJson.projects   || []);
        setEmployees(empJson.employees  || []);

      } catch {
        // Network failure — set a user-visible error message
        setError("Failed to load dropdown data. Please check your connection.");
      }
    }

    load();
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT 2: LOAD ASSIGNMENT DETAILS (runs when selectedProject changes)
     ---------------------------------------------------------------------------
     Fetches category, leader, requestor, and other read-only fields for the
     selected project.

     SECURITY:
     • encodeURIComponent() applied to selectedProject — project names can
       contain spaces and slashes which must be encoded in the URL.
     • res.ok is checked before reading the body.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedProject) return;

    async function loadAssignment() {
      try {
        const res = await fetch(
          `${apiUrl}/api/assignments-allocations/projects?project=${encodeURIComponent(selectedProject)}`
        );

        if (!res.ok) return;

        const json = await res.json();
        setAssignmentData(json.assignment || null);

      } catch {
        // Non-fatal — read-only fields just show "—"
        setAssignmentData(null);
      }
    }

    loadAssignment();
  }, [selectedProject]);

  /* ---------------------------------------------------------------------------
     EFFECT 3: LOAD EMPLOYEE DETAILS (runs when selectedEmployee changes)
     ---------------------------------------------------------------------------
     Fetches department, and then fetches the manager's name via a second
     request using the employee's reports_to field.

     SECURITY:
     • selectedEmployee is a server-sourced emp_id integer from the dropdown
       list — never user-typed input.
     • Both fetch responses are validated with res.ok before use.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedEmployee) return;

    async function loadEmployee() {
      try {
        const res = await fetch(
          `${apiUrl}/api/assignments-allocations/employee/${selectedEmployee}`
        );

        if (!res.ok) return;

        const json = await res.json();
        setEmployeeData(json.employee    || null);
        setDepartmentName(json.department_name || "");

        // Fetch manager name if reports_to is present
        if (json.employee?.reports_to) {
          const mgrRes = await fetch(
            `${apiUrl}/api/assignments-allocations/employee/${json.employee.reports_to}`
          );

          if (mgrRes.ok) {
            const mgrJson = await mgrRes.json();
            setManagerName(mgrJson.employee?.emp_name || "");
          }
        } else {
          setManagerName("");
        }

      } catch {
        // Non-fatal — read-only fields just show "—"
        setEmployeeData(null);
        setManagerName("");
        setDepartmentName("");
      }
    }

    loadEmployee();
  }, [selectedEmployee]);

  /* ---------------------------------------------------------------------------
     HANDLER: handleSave
     ---------------------------------------------------------------------------
     Validates selections, POSTs to the backend, then navigates back and
     triggers a refresh of the assignments table.

     SECURITY:
     • Both selectedProject and selectedEmployee are checked before the request
       — prevents an empty POST body from reaching the backend.
     • emp_id is coerced with Number() — ensures the backend receives an
       integer, not a string.
     • res.ok is checked and the backend error message is surfaced to the user
       if the request fails.
  --------------------------------------------------------------------------- */
  async function handleSave() {
    if (!selectedProject || !selectedEmployee) {
      setError("Please select both a project and an employee.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiUrl}/api/assignments-allocations`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emp_id:  Number(selectedEmployee), // Coerce to integer
          project: selectedProject,
          date:    null,
          amount:  null
        })
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to save allocation. Please try again.");
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
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------------------------------------
     RENDER
     ---------------------------------------------------------------------------
     RESPONSIVENESS STRATEGY:
     • Overlay: fixed inset-0 flex items-center justify-center — modal always
       centred regardless of viewport size.
     • Modal card: w-full max-w-3xl mx-4 — fills screen on mobile with edge
       margin; caps width on desktop. max-h-[90vh] overflow-y-auto — scrollable
       on very small phones.
     • Heading: text-xl sm:text-2xl — readable on all screen sizes.
     • Grid: grid-cols-1 sm:grid-cols-2 — single column on phones, two on sm+.
     • p-4 sm:p-6 — tighter padding on mobile.
     • Action buttons: flex-col sm:flex-row — stack on mobile, row on sm+.
     • Buttons: w-full sm:w-auto — full width on mobile for easy tapping.
  --------------------------------------------------------------------------- */
  return (
    /* Backdrop overlay — semi-transparent black with blur */
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">

      {/* Modal card */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">

        {/* ----------------------------------------------------------------- */}
        {/* HEADER                                                             */}
        {/* ----------------------------------------------------------------- */}
        <h2 className="text-xl sm:text-2xl font-bold font-[Outfit] mb-4 text-black">
          Add Allocation
        </h2>

        {/* Error banner — only shown when error is non-empty */}
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
            {/* Checkmark icon */}
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 11 8 15 16 6" />
            </svg>
            Allocation added successfully.
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* FORM GRID                                                          */}
        {/* 1 col on mobile → 2 col on sm+                                   */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* PROJECT — searchable dropdown */}
          <SearchableStyledDropdown
            label="Project"
            value={selectedProject}
            onChange={(val) => {
              setSelectedProject(val);
              setAssignmentData(null); // Clear stale data while new fetch runs
            }}
            options={projects}
            valueKey="project_name"
            displayKey="project_name"
          />

          {/* EMPLOYEE — searchable dropdown */}
          <SearchableStyledDropdown
            label="Employee"
            value={selectedEmployee}
            onChange={(val) => {
              setSelectedEmployee(val);
              setEmployeeData(null);   // Clear stale data while new fetch runs
              setManagerName("");
              setDepartmentName("");
            }}
            options={employees}
            valueKey="emp_id"
            displayKey="emp_name"
          />

          {/* READ-ONLY FIELDS — auto-populated from backend on selection */}
          <ReadOnlyField label="Resource Name"      value={employeeData?.emp_name} />
          <ReadOnlyField label="Department"         value={departmentName} />
          <ReadOnlyField label="Reports To"         value={managerName} />
          <ReadOnlyField label="Activity Category"  value={assignmentData?.category} />
          <ReadOnlyField label="Leader Accountable" value={assignmentData?.leader} />
          <ReadOnlyField label="Requestor"          value={assignmentData?.requestor} />
          <ReadOnlyField label="Requestor VP"       value={assignmentData?.requestor_vp} />
          <ReadOnlyField label="Requesting Dept"    value={assignmentData?.requesting_dept} />

        </div>

        {/* ----------------------------------------------------------------- */}
        {/* ACTION BUTTONS                                                     */}
        {/* flex-col on mobile → flex-row on sm+                             */}
        {/* justify-end right-aligns on desktop; full-width on mobile        */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6">

          {/* CANCEL */}
          <button
            type="button"
            onClick={() => router.back()}
            className={`${btnClass} bg-[#003A5C] text-white`}
          >
            Cancel
          </button>

          {/* SAVE — disabled while loading */}
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            aria-disabled={loading}
            className={`${btnClass} bg-[#017ACB] text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? "Saving..." : "Save Allocation"}
          </button>

        </div>

      </div>
    </div>
  );
}