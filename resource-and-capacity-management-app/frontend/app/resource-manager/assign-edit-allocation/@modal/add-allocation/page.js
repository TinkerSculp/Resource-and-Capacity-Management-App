"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

/* ---------------------------------------------------------
   STYLED DROPDOWN — NOW SUPPORTS OBJECTS (valueKey + displayKey)
   Matches Initiatives modal styling 1:1
--------------------------------------------------------- */
/* ---------------------------------------------------------
   SEARCHABLE + STYLED DROPDOWN (supports objects)
   Matches Initiatives modal styling 1:1
--------------------------------------------------------- */
function SearchableStyledDropdown({ label, value, onChange, options, valueKey, displayKey }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const selectedLabel =
    options.find((o) => o[valueKey] === value)?.[displayKey] || "";

  const filtered = options.filter((opt) =>
    opt[displayKey].toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Trigger */}
      <div
        className="
          bg-white text-black border border-gray-500 p-2 rounded
          cursor-pointer flex justify-between items-center
          hover:bg-[#017ACB]/20 transition
        "
        onClick={() => setOpen(!open)}
      >
        <span>{selectedLabel || `Select ${label}`}</span>

        <svg
          className={`w-4 h-4 ml-2 transition-transform ${
            open ? "rotate-180" : "rotate-0"
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
              focus:outline-none
            "
          />

          {/* List */}
          <div className="max-h-70 overflow-y-auto">
            {filtered.map((opt) => (
              <div
                key={opt[valueKey]}
                className="
                  p-2 cursor-pointer text-black
                  hover:bg-[#017ACB]/20 transition
                "
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

/* ---------------------------------------------------------
   ADD ALLOCATION MODAL
--------------------------------------------------------- */
export default function AddAllocationModal() {
  const router = useRouter();
  const apiUrl = "http://localhost:3001";

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [assignmentData, setAssignmentData] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [managerName, setManagerName] = useState("");
  const [departmentName, setDepartmentName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------------------------------------------------------
     LOAD DROPDOWNS
  --------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const projRes = await fetch(`${apiUrl}/api/assignments-allocations/projects`);
        const empRes = await fetch(`${apiUrl}/api/assignments-allocations/employees/dm`);

        if (!projRes.ok || !empRes.ok) {
          setError("Failed to load dropdown data");
          return;
        }

        const projJson = await projRes.json();
        const empJson = await empRes.json();

        setProjects(projJson.projects || []);
        setEmployees(empJson.employees || []);
      } catch {
        setError("Failed to load dropdown data");
      }
    }

    load();
  }, []);

  /* ---------------------------------------------------------
     LOAD ASSIGNMENT DETAILS
  --------------------------------------------------------- */
  useEffect(() => {
    if (!selectedProject) return;

    async function loadAssignment() {
      try {
        const res = await fetch(
          `${apiUrl}/api/assignments-allocations/projects?project=${encodeURIComponent(
            selectedProject
          )}`
        );

        if (!res.ok) return;

        const json = await res.json();
        setAssignmentData(json.assignment || null);
      } catch {}
    }

    loadAssignment();
  }, [selectedProject]);

  /* ---------------------------------------------------------
     LOAD EMPLOYEE DETAILS
  --------------------------------------------------------- */
  useEffect(() => {
    if (!selectedEmployee) return;

    async function loadEmployee() {
      try {
        const res = await fetch(
          `${apiUrl}/api/assignments-allocations/employee/${selectedEmployee}`
        );

        if (!res.ok) return;

        const json = await res.json();

        setEmployeeData(json.employee || null);
        setDepartmentName(json.department_name || "");

        if (json.employee?.reports_to) {
          const mgrRes = await fetch(
            `${apiUrl}/api/assignments-allocations/employee/${json.employee.reports_to}`
          );

          if (mgrRes.ok) {
            const mgrJson = await mgrRes.json();
            setManagerName(mgrJson.employee?.emp_name || "");
          }
        }
      } catch {}
    }

    loadEmployee();
  }, [selectedEmployee]);

  /* ---------------------------------------------------------
     SAVE
  --------------------------------------------------------- */
  async function handleSave() {
    if (!selectedProject || !selectedEmployee) {
      setError("Please select both project and employee");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiUrl}/api/assignments-allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emp_id: Number(selectedEmployee),
          project: selectedProject,
          date: null,
          amount: null
        })
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to save allocation");
        return;
      }

      router.back();

      setTimeout(() => {
        router.replace(`/resource-manager/assign-edit-allocation?refresh=${Date.now()}`);
      }, 120);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------------------
     UI — MATCHES INITIATIVES MODAL EXACTLY
  --------------------------------------------------------- */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">

        <h2 className="text-2xl font-bold font-[Outfit] mb-4 text-black">
          Add Allocation
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">

          {/* PROJECT */}
<SearchableStyledDropdown
  label="Project"
  value={selectedProject}
  onChange={setSelectedProject}
  options={projects}
  valueKey="project_name"
  displayKey="project_name"
/>

          {/* EMPLOYEE */}
<SearchableStyledDropdown
  label="Employee"
  value={selectedEmployee}
  onChange={setSelectedEmployee}
  options={employees}
  valueKey="emp_id"
  displayKey="emp_name"
/>

          {/* RESOURCE NAME */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Resource Name</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 ">
              {employeeData?.emp_name || "—"}
            </div>
          </div>

          {/* DEPARTMENT */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Department</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 ">
              {departmentName || "—"}
            </div>
          </div>

          {/* REPORTS TO */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Reports To</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 ">
              {managerName || "—"}
            </div>
          </div>

          {/* CATEGORY */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Activity Category</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 ">
              {assignmentData?.category || "—"}
            </div>
          </div>

          {/* LEADER */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Leader Accountable</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2">
              {assignmentData?.leader || "—"}
            </div>
          </div>

          {/* REQUESTOR */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Requestor</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2">
              {assignmentData?.requestor || "—"}
            </div>
          </div>

          {/* REQUESTOR VP */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Requestor VP</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 ">
              {assignmentData?.requestor_vp || "—"}
            </div>
          </div>

          {/* REQUESTING DEPT */}
          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Requesting Dept</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 ">
              {assignmentData?.requesting_dept || "—"}
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="
              px-4 py-2
              bg-gray-200 text-black rounded
              hover:bg-[#017ACB]/20 transition
              shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              focus:outline-none focus:ring-0
            "
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="
              px-4 py-2
              bg-[#017ACB] text-white rounded
              hover:bg-[#017ACB]/20 hover:text-gray-700 transition
              shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              focus:outline-none focus:ring-0
            "
          >
            {loading ? "Saving..." : "Save Allocation"}
          </button>
        </div>
      </div>
    </div>
  );
}