'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

/* ---------------------------------------------------------
   SMALL DROPDOWN (DEPARTMENT)
   --------------------------------------------------------- */
function StyledDropdown({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col relative">
      <label className="text-xs text-black mb-1 font-semibold">{label}</label>

      <div
        className="
          bg-white text-black border border-gray-500 p-2 rounded cursor-pointer
          hover:bg-[#017ACB]/20 transition flex justify-between items-center
        "
        onClick={() => setOpen(!open)}
      >
        <span>{value || `Select ${label}`}</span>

        {/* SAME ARROW AS DEPARTMENT */}
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div
          className="
            absolute top-full left-0 right-0 bg-white border border-gray-500 rounded mt-1 z-50
            max-h-48 overflow-y-auto shadow-lg
          "
        >
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`
                p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition
                ${value === opt ? "bg-[#017ACB]/20" : ""}
              `}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   SEARCHABLE DROPDOWN (MANAGERS)
   --------------------------------------------------------- */
function SearchableDropdown({ label, value, onChange, list }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = list.filter((item) =>
    item.emp_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col relative">
      <label className="text-xs text-black mb-1 font-semibold">{label}</label>

      <div
        className="
          bg-white text-black border border-gray-500 p-2 rounded cursor-pointer
          hover:bg-[#017ACB]/20 transition flex justify-between items-center
        "
        onClick={() => setOpen(!open)}
      >
        <span>{value || `Select ${label}`}</span>

        {/* SAME ARROW AS DEPARTMENT */}
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div
          className="
            absolute top-full left-0 right-0 bg-white border border-gray-500 rounded mt-1 z-50
            max-h-64 overflow-y-auto shadow-lg
          "
        >
          <input
            className="w-full p-2 border-b border-gray-300 text-black focus:outline-none"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {filtered.map((item) => (
            <div
              key={item.emp_id}
              onClick={() => {
                onChange(item.emp_name); // UI stores name
                setOpen(false);
              }}
              className={`
                p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition
                ${value === item.emp_name ? "bg-[#017ACB]/20" : ""}
              `}
            >
              {item.emp_name}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-2 text-gray-500 text-sm">No results</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   EDIT RESOURCE MODAL
   --------------------------------------------------------- */
export default function EditResourceModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empId = searchParams.get("id");

  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [statusValue, setStatusValue] = useState("Active");

  const [formData, setFormData] = useState({
    emp_id: "",
    emp_name: "",
    emp_title: "",
    dept_no: "",
    reports_to: "",
    manager_level: "",
    director_level: "",
    requestor_vp: "",
    other_info: "",
  });

  /* ---------------------------------------------------------
     HELPERS
     --------------------------------------------------------- */

  const getNameById = (id) =>
    managers.find((m) => m.emp_id === id)?.emp_name || "";

  const getDeptName = (deptNo) =>
    departments.find((d) => d.dept_no === deptNo)?.dept_name || "";

  const getDeptNo = (name) =>
    departments.find((d) => d.dept_name === name)?.dept_no || null;

  const getId = (name) =>
    managers.find((m) => m.emp_name === name)?.emp_id || null;

  /* ---------------------------------------------------------
     LOAD DATA
     --------------------------------------------------------- */

  useEffect(() => {
    if (!empId) return;

    fetchEmployee();
    fetchDepartments();
    fetchManagers();
  }, [empId]);

  const fetchEmployee = async () => {
    const res = await fetch(`http://localhost:3001/api/resources/employees/${empId}`);
    const data = await res.json();

    setEmployee(data);

    setFormData({
      emp_id: data.emp_id || "",
      emp_name: data.emp_name || "",
      emp_title: data.emp_title || "",
      dept_no: data.dept_no || "",
      reports_to: data.reports_to || "",
      manager_level: data.manager_level || "",
      director_level: data.director_level || "",
      requestor_vp: data.requestor_vp || "",
      other_info: data.other_info || "",
    });

    setStatusValue(data.current_status || "Active");
  };

  const fetchDepartments = async () => {
    const res = await fetch("http://localhost:3001/api/resources/departments");
    const data = await res.json();
    setDepartments(data);
  };

  const fetchManagers = async () => {
    const res = await fetch("http://localhost:3001/api/resources/managers");
    const data = await res.json();
    setManagers(data);
  };

  /* ---------------------------------------------------------
     CONVERT IDs → NAMES FOR UI
     --------------------------------------------------------- */

  useEffect(() => {
    if (managers.length === 0) return;

    setFormData((prev) => ({
      ...prev,
      reports_to: getNameById(prev.reports_to),
      manager_level: getNameById(prev.manager_level),
      director_level: getNameById(prev.director_level),
      requestor_vp: getNameById(prev.requestor_vp),
    }));
  }, [managers]);

  useEffect(() => {
    if (departments.length === 0) return;

    setFormData((prev) => ({
      ...prev,
      dept_no: getDeptName(prev.dept_no),
    }));
  }, [departments]);

  /* ---------------------------------------------------------
     SAVE CHANGES
     --------------------------------------------------------- */

  const handleEdit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      current_status: statusValue,
      dept_no: getDeptNo(formData.dept_no),
      reports_to: getId(formData.reports_to),
      manager_level: getId(formData.manager_level),
      director_level: getId(formData.director_level),
      requestor_vp: getId(formData.requestor_vp),
    };

    await fetch(`http://localhost:3001/api/resources/employees/${empId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    router.back();
    setTimeout(() => {
      router.replace(`/resource-manager/create-edit-resources?refresh=${Date.now()}`);
    }, 50);
  };

  /* ---------------------------------------------------------
     STATUS CHANGE
     --------------------------------------------------------- */

  const handleStatusChange = async (status) => {
    await fetch(`http://localhost:3001/api/resources/employees/${empId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setStatusValue(status);
  };

  if (!employee || managers.length === 0 || departments.length === 0) return null;

  /* ---------------------------------------------------------
     UI
     --------------------------------------------------------- */

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">

        <h2 className="text-2xl font-bold mb-6 text-black">Edit Resource</h2>

        <form onSubmit={handleEdit}>
          <div className="grid grid-cols-2 gap-4">

            {/* EMPLOYEE ID */}
            <div className="flex flex-col">
              <label className="text-xs text-black mb-1 font-semibold">Employee ID *</label>
              <input
                value={formData.emp_id}
                onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
                required
                className="bg-white text-black border border-gray-500 p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none"
              />
            </div>

            {/* NAME */}
            <div className="flex flex-col">
              <label className="text-xs text-black mb-1 font-semibold">Name *</label>
              <input
                value={formData.emp_name}
                onChange={(e) => setFormData({ ...formData, emp_name: e.target.value })}
                required
                className="bg-white text-black border border-gray-500 p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none"
              />
            </div>

            {/* TITLE */}
            <div className="flex flex-col">
              <label className="text-xs text-black mb-1 font-semibold">Title *</label>
              <input
                value={formData.emp_title}
                onChange={(e) => setFormData({ ...formData, emp_title: e.target.value })}
                required
                className="bg-white text-black border border-gray-500 p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none"
              />
            </div>

            {/* DEPARTMENT */}
            <StyledDropdown
              label="Department *"
              value={formData.dept_no} // UI shows dept_name
              onChange={(val) => setFormData({ ...formData, dept_no: val })}
              options={departments.map((d) => d.dept_name)}
            />

            {/* REPORTS TO */}
            <SearchableDropdown
              label="Reports To"
              value={formData.reports_to}
              onChange={(val) => setFormData({ ...formData, reports_to: val })}
              list={managers}
            />

            {/* MANAGER LEVEL */}
            <SearchableDropdown
              label="Manager Level"
              value={formData.manager_level}
              onChange={(val) => setFormData({ ...formData, manager_level: val })}
              list={managers}
            />

            {/* DIRECTOR LEVEL */}
            <SearchableDropdown
              label="Director Level"
              value={formData.director_level}
              onChange={(val) => setFormData({ ...formData, director_level: val })}
              list={managers}
            />

            {/* VP */}
            <SearchableDropdown
              label="VP"
              value={formData.requestor_vp}
              onChange={(val) => setFormData({ ...formData, requestor_vp: val })}
              list={managers}
            />

          </div>

          {/* OTHER INFO */}
          <div className="flex flex-col mt-4">
            <label className="text-xs text-black mb-1 font-semibold">Other Information</label>
            <textarea
              value={formData.other_info}
              onChange={(e) => setFormData({ ...formData, other_info: e.target.value })}
              className="bg-white text-black border border-gray-500 p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none"
            />
          </div>

          {/* STATUS */}
          <div className="mt-4">
            <label className="text-xs text-black font-semibold block mb-2">Status</label>
            <div className="flex gap-3">

              <button
                type="button"
                onClick={() => handleStatusChange("Active")}
                className={`
                  px-4 py-2 rounded transition
                  ${statusValue === "Active"
                    ? "bg-green-600 text-white"
                    : "bg-green-100 text-green-800 hover:bg-green-200"}
                `}
              >
                Active
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("Inactive")}
                className={`
                  px-4 py-2 rounded transition
                  ${statusValue === "Inactive"
                    ? "bg-red-600 text-white"
                    : "bg-red-100 text-red-800 hover:bg-red-200"}
                `}
              >
                Inactive
              </button>

            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-4 mt-6">

            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-black rounded hover:bg-[#017ACB]/20 transition shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-[#017ACB] text-white rounded hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
            >
              Save Changes
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}