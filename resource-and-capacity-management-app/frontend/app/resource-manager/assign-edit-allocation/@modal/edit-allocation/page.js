"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

/* ---------------------------------------------------------
   SEARCHABLE + STYLED DROPDOWN
--------------------------------------------------------- */
function SearchableStyledDropdown({ label, value, onChange, options, valueKey, displayKey }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const selectedLabel =
    options.find((o) => String(o[valueKey]) === String(value))?.[displayKey] || "";

  const filtered = options.filter((opt) =>
    String(opt[displayKey]).toLowerCase().includes(search.toLowerCase())
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

      <div
        className="bg-white text-black border border-gray-500 p-2 rounded cursor-pointer flex justify-between items-center hover:bg-[#017ACB]/20 transition"
        onClick={() => setOpen(!open)}
      >
        <span>{selectedLabel || `Select ${label}`}</span>

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

      {open && (
        <div className="absolute top-full left-0 w-full bg-white border border-gray-500 rounded shadow-lg z-50 mt-1">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 border-b border-gray-500 w-full text-black bg-white hover:bg-[#017ACB]/20 transition focus:outline-none"
          />
          <div className="max-h-70 overflow-y-auto">
            {filtered.map((opt) => (
              <div
                key={opt[valueKey]}
                className="p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition"
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
   EDIT ALLOCATION MODAL
--------------------------------------------------------- */
export default function EditAllocationModal() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const apiUrl = "http://localhost:3001";

  const emp_id = searchParams.get("emp_id");
  const projectFromURL = searchParams.get("project");

  const [employeeData, setEmployeeData] = useState(null);
  const [departmentName, setDepartmentName] = useState("");
  const [managerName, setManagerName] = useState("");

  const [assignmentData, setAssignmentData] = useState(null);
  const [originalAssignment, setOriginalAssignment] = useState(null);

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [selectedProject, setSelectedProject] = useState(projectFromURL || "");
  const [selectedEmployee, setSelectedEmployee] = useState(
    emp_id ? Number(emp_id) : ""
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  /* ---------------------------------------------------------
     LOAD DROPDOWNS
  --------------------------------------------------------- */
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const projRes = await fetch(`${apiUrl}/api/assignments-allocations/projects`);
        const empRes = await fetch(`${apiUrl}/api/assignments-allocations/employees/dm`);

        const projJson = await projRes.json();
        const empJson = await empRes.json();

        setProjects(projJson.projects || []);
        setEmployees(empJson.employees || []);
      } catch {
        setError("Failed to load dropdowns");
      }
    }

    loadDropdowns();
  }, []);

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

        const json = await res.json();

        if (!res.ok) {
          setError(json.error || "Failed to load employee");
          return;
        }

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
        } else {
          setManagerName("");
        }
      } catch {
        setError("Network error loading employee");
      }
    }

    loadEmployee();
  }, [selectedEmployee]);

  /* ---------------------------------------------------------
     LOAD ORIGINAL ASSIGNMENT
  --------------------------------------------------------- */
  useEffect(() => {
    if (!projectFromURL) {
      setLoading(false);
      return;
    }

    async function loadAssignment() {
      try {
        const res = await fetch(
          `${apiUrl}/api/assignments-allocations/projects?project=${encodeURIComponent(
            projectFromURL
          )}`
        );

        const json = await res.json();

        if (!res.ok) {
          setError(json.error || "Failed to load assignment");
          return;
        }

        setAssignmentData(json.assignment || null);
        setOriginalAssignment(json.assignment || null);
      } catch {
        setError("Network error loading assignment");
      } finally {
        setLoading(false);
      }
    }

    loadAssignment();
  }, [projectFromURL]);

  /* ---------------------------------------------------------
     LOAD ASSIGNMENT WHEN PROJECT CHANGES
  --------------------------------------------------------- */
  useEffect(() => {
    if (!selectedProject) return;

    async function loadAssignmentForSelected() {
      try {
        const res = await fetch(
          `${apiUrl}/api/assignments-allocations/projects?project=${encodeURIComponent(
            selectedProject
          )}`
        );

        const json = await res.json();

        if (!res.ok) {
          setError(json.error || "Failed to load assignment");
          return;
        }

        setAssignmentData(json.assignment || null);
      } catch {
        setError("Network error loading assignment");
      }
    }

    loadAssignmentForSelected();
  }, [selectedProject]);

  /* ---------------------------------------------------------
     SAVE REALLOCATION
  --------------------------------------------------------- */
  async function handleSave() {
    if (!selectedProject || !selectedEmployee) {
      setError("Please select both project and employee");
      return;
    }

    const oldEmpId = Number(emp_id);
    const newEmpId = Number(selectedEmployee);

    const oldProject = projectFromURL;
    const newProject = selectedProject;

    const employeeChanged = oldEmpId !== newEmpId;
    const projectChanged = oldProject !== newProject;

    if (!employeeChanged && !projectChanged) {
      router.back();
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/assignments-allocations/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_emp_id: oldEmpId,
          new_emp_id: newEmpId,
          old_project: oldProject,
          new_project: newProject,
          old_category: originalAssignment?.category || null,
          new_category: assignmentData?.category || null
        })
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to update allocation");
        return;
      }

      router.back();

      setTimeout(() => {
        router.replace(
          `/resource-manager/assign-edit-allocation?refresh=${Date.now()}`
        );
      }, 120);
    } catch {
      setError("Network error. Try again.");
    }
  }

  /* ---------------------------------------------------------
     LOADING
  --------------------------------------------------------- */
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white text-black p-6 rounded-lg border border-black shadow-xl w-[450px]">
          Loading…
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     ERROR
  --------------------------------------------------------- */
  if (error || !employeeData) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white text-black p-6 rounded-lg border border-black shadow-xl w-[450px]">
          <h2 className="text-xl font-bold mb-4">Error</h2>
          <p>{error || "Unable to load allocation"}</p>

          <button
            className="mt-4 px-4 py-2 border border-black rounded hover:bg-black hover:text-white transition"
            onClick={() => router.back()}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     MODAL UI
  --------------------------------------------------------- */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">
        <h2 className="text-2xl font-bold font-[Outfit] mb-4 text-black">
          Edit Allocation — {employeeData.emp_name}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
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

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Resource Name</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 ">
              {employeeData.emp_name}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Department</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 ">
              {departmentName || "—"}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Reports To</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 ">
              {managerName || "—"}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Activity Category</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2">
              {assignmentData?.category || "—"}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Leader Accountable</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2">
              {assignmentData?.leader || "—"}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Requestor</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 ">
              {assignmentData?.requestor || "—"}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Requestor VP</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 ">
              {assignmentData?.requestor_vp || "—"}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black mb-1">Requesting Dept</label>
            <div className="bg-gray-200 text-black border border-gray-500 p-2 ">
              {assignmentData?.requesting_dept || "—"}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-shrink-0 px-4 py-2 bg-gray-200 text-black rounded hover:bg-[#017ACB]/20 transition shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)] focus:outline-none focus:ring-0"
          >
            Close
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-shrink-0 px-4 py-2 bg-[#017ACB] text-white rounded hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)] focus:outline-none focus:ring-0"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
