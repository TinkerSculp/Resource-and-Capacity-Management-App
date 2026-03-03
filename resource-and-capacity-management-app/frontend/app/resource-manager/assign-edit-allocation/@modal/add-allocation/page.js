"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/* ---------------------------------------------------------
   ADD ALLOCATION MODAL
   ---------------------------------------------------------
   PURPOSE:
   • Allows a DM to assign an employee to a project
   • Auto-loads project + employee details
   • Auto-populates assignment metadata (leader, requestor, dept)
   • Saves allocation via Express backend

   DESIGN NOTES:
   • No UI changes — layout preserved exactly as provided
   • Fully defensive fetch logic
   • Safe JSON parsing + null guards
   • Consistent with Add/Edit Initiative modal structure
--------------------------------------------------------- */
export default function AddAllocationModal() {
  const router = useRouter();
  const apiUrl = "http://localhost:3001";

  /* ---------------------------------------------------------
     STATE
  --------------------------------------------------------- */
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [assignmentData, setAssignmentData] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [managerName, setManagerName] = useState("");
  const [departmentName, setDepartmentName] = useState("");

  const [error, setError] = useState("");

  /* ---------------------------------------------------------
     LOAD DROPDOWNS (PROJECTS + DM EMPLOYEES)
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
     LOAD ASSIGNMENT DETAILS WHEN PROJECT SELECTED
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
      } catch {
        // silent fail
      }
    }

    loadAssignment();
  }, [selectedProject]);

  /* ---------------------------------------------------------
     LOAD EMPLOYEE DETAILS + DEPARTMENT + MANAGER
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

        // Load manager if employee has a reports_to value
        if (json.employee?.reports_to) {
          const mgrRes = await fetch(
            `${apiUrl}/api/assignments-allocations/employee/${json.employee.reports_to}`
          );

          if (mgrRes.ok) {
            const mgrJson = await mgrRes.json();
            setManagerName(mgrJson.employee?.emp_name || "");
          }
        }
      } catch {
        // silent fail
      }
    }

    loadEmployee();
  }, [selectedEmployee]);

  /* ---------------------------------------------------------
     SAVE ALLOCATION
  --------------------------------------------------------- */
  async function handleSave() {
    if (!selectedProject || !selectedEmployee) {
      setError("Please select both project and employee");
      return;
    }

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
        router.replace(
          `/resource-manager/assign-edit-allocation?refresh=${Date.now()}`
        );
      }, 100);
    } catch {
      setError("Network error. Try again.");
    }
  }

  /* ---------------------------------------------------------
     MODAL UI
  --------------------------------------------------------- */
return (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div
      className="
        bg-white text-black rounded-lg border border-black
        shadow-[4px_4px_0_rgba(0,0,0,1)]
        w-[500px] p-6
      "
    >
      <h2 className="text-xl font-bold mb-4">Add Allocation</h2>

      {error && (
        <p className="mb-3 text-red-600 font-semibold">{error}</p>
      )}

      {/* PROJECT */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Project</label>
        <div
          className="
            border border-black rounded bg-white
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                    inset_-2px_-2px_0_rgba(0,0,0,0.32)]
          "
        >
          <select
            className="w-full bg-transparent px-2 py-1"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">-- Choose Project --</option>
            {projects.map((p) => (
              <option key={p.project_name} value={p.project_name}>
                {p.project_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* EMPLOYEE */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Employee</label>
        <div
          className="
            border border-black rounded bg-white
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                    inset_-2px_-2px_0_rgba(0,0,0,0.32)]
          "
        >
          <select
            className="w-full bg-transparent px-2 py-1"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="">-- Choose Employee --</option>
            {employees.map((e) => (
              <option key={e.emp_id} value={e.emp_id}>
                {e.emp_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* AUTO-POPULATED FIELDS */}
<div className="grid grid-cols-2 gap-4 mb-4">

  {/* Resource Name */}
  <div>
    <label className="block mb-1 font-semibold">Resource Name</label>
    <div
      className="
        border border-black rounded bg-white px-2 py-1
        shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      {employeeData?.emp_name || "—"}
    </div>
  </div>

  {/* Department */}
  <div>
    <label className="block mb-1 font-semibold">Department</label>
    <div
      className="
        border border-black rounded bg-white px-2 py-1
        shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      {departmentName || "—"}
    </div>
  </div>

  {/* Reports To */}
  <div>
    <label className="block mb-1 font-semibold">Reports To</label>
    <div
      className="
        border border-black rounded bg-white px-2 py-1
        shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      {managerName || "—"}
    </div>
  </div>

  {/* Activity Category */}
  <div>
    <label className="block mb-1 font-semibold">Activity Category</label>
    <div
      className="
        border border-black rounded bg-white px-2 py-1
        shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      {assignmentData?.category || "—"}
    </div>
  </div>

  {/* Leader Accountable */}
  <div>
    <label className="block mb-1 font-semibold">Leader Accountable</label>
    <div
      className="
        border border-black rounded bg-white px-2 py-1
        shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      {assignmentData?.leader || "—"}
    </div>
  </div>

  {/* Requestor */}
  <div>
    <label className="block mb-1 font-semibold">Requestor</label>
    <div
      className="
        border border-black rounded bg-white px-2 py-1
        shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      {assignmentData?.requestor || "—"}
    </div>
  </div>

  {/* Requestor VP */}
  <div>
    <label className="block mb-1 font-semibold">Requestor VP</label>
    <div
      className="
        border border-black rounded bg-white px-2 py-1
        shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      {assignmentData?.requestor_vp || "—"}
    </div>
  </div>

  {/* Requesting Dept */}
  <div>
    <label className="block mb-1 font-semibold">Requesting Dept</label>
    <div
      className="
        border border-black rounded bg-white px-2 py-1
        shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      {assignmentData?.requesting_dept || "—"}
    </div>
  </div>

</div>
      {/* ACTION BUTTONS */}
      <div className="flex justify-between mt-4">
        <button
          className="
            px-4 py-2 border border-black rounded
            bg-white text-black
            hover:bg-black hover:text-white transition
            shadow-[2px_2px_0_rgba(0,0,0,1)]
          "
          onClick={() => router.back()}
        >
          Cancel
        </button>

        <button
          className="
            px-4 py-2 border border-black rounded
            bg-white text-black
            hover:bg-black hover:text-white transition
            shadow-[2px_2px_0_rgba(0,0,0,1)]
          "
          onClick={handleSave}
        >
          Save Allocation
        </button>
      </div>
    </div>
  </div>
);
}