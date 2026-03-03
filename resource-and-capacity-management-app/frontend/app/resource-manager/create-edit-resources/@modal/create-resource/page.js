'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

        {/* Unified arrow icon */}
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
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
                ${value === opt ? 'bg-[#017ACB]/20' : ''}
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
  const [search, setSearch] = useState('');

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

        {/* Unified arrow icon */}
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
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
                ${value === item.emp_name ? 'bg-[#017ACB]/20' : ''}
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
   CREATE RESOURCE MODAL
   --------------------------------------------------------- */
export default function CreateResourceModal() {
  const router = useRouter();

  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);

  const [formData, setFormData] = useState({
    emp_id: '',
    emp_name: '',
    emp_title: '',
    dept_no: '',
    reports_to: '',
    manager_level: '',
    director_level: '',
    requestor_vp: '',
    other_info: '',
    current_status: 'Active',
  });

  /* ---------------------------------------------------------
     HELPERS
     --------------------------------------------------------- */

  const getDeptNo = (name) =>
    departments.find((d) => d.dept_name === name)?.dept_no || null;

  const getId = (name) =>
    managers.find((m) => m.emp_name === name)?.emp_id || null;

  /* ---------------------------------------------------------
     LOAD DATA
     --------------------------------------------------------- */

  useEffect(() => {
    fetchDepartments();
    fetchManagers();
  }, []);

  const fetchDepartments = async () => {
    const res = await fetch('http://localhost:3001/api/resources/departments');
    const data = await res.json();
    setDepartments(data);
  };

  const fetchManagers = async () => {
    const res = await fetch('http://localhost:3001/api/resources/managers');
    const data = await res.json();
    setManagers(data);
  };

  /* ---------------------------------------------------------
     SAVE NEW EMPLOYEE
     --------------------------------------------------------- */

  const handleCreate = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      dept_no: getDeptNo(formData.dept_no),
      reports_to: getId(formData.reports_to),
      manager_level: getId(formData.manager_level),
      director_level: getId(formData.director_level),
      requestor_vp: getId(formData.requestor_vp),
    };

    await fetch('http://localhost:3001/api/resources/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    router.back();
    setTimeout(() => {
      router.replace(`/resource-manager/create-edit-resources?refresh=${Date.now()}`);
    }, 50);
  };

  /* ---------------------------------------------------------
     UI
     --------------------------------------------------------- */

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">

        <h2 className="text-2xl font-bold mb-6 text-black">Create Resource</h2>

        <form onSubmit={handleCreate}>
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
              label="Department"
              value={formData.dept_no}
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
                onClick={() => setFormData({ ...formData, current_status: 'Active' })}
                className={`
                  px-4 py-2 rounded transition
                  ${formData.current_status === 'Active'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'}
                `}
              >
                Active
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, current_status: 'Inactive' })}
                className={`
                  px-4 py-2 rounded transition
                  ${formData.current_status === 'Inactive'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'}
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
              Create
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}