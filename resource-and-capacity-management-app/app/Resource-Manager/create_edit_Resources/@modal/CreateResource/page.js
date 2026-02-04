'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function CreateResourceModal() {
  const router = useRouter();
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({
    emp_name: '',
    emp_title: '',
    dept_no: '',
    manager_id: '',
    other_info: ''
  });

  /* -------------------------------------------------------
     Fetch Departments & Managers on mount
  ------------------------------------------------------- */
  useEffect(() => {
    fetchDepartments();
    fetchManagers();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/Resource-Manager/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/Resource-Manager/managers');
      if (res.ok) {
        const data = await res.json();
        setManagers(data);
      }
    } catch (err) {
      console.error('Error fetching managers:', err);
    }
  };

  /* -------------------------------------------------------
     Handle form submission
  ------------------------------------------------------- */
  const handleCreate = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch('http://localhost:3001/api/Resource-Manager/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        router.back();
      } else {
        console.error('Failed to create resource');
      }
    } catch (err) {
      console.error('Error creating resource:', err);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">

      {/* HEADER */}
      <h2 className="text-2xl font-bold mb-6 text-black">
        Create Resource
      </h2>

      <form onSubmit={handleCreate}>

        {/* GRID SAME AS INITIATIVE */}
        <div className="grid grid-cols-2 gap-4">

          {/* NAME */}
          <div className="flex flex-col">
            <label className="text-xs mb-1 text-black font-semibold">
              Name *
            </label>
            <input
              value={formData.emp_name}
              onChange={(e) =>
                setFormData({ ...formData, emp_name: e.target.value })
              }
              className="border p-2 rounded text-black font-medium"
              required
            />
          </div>

          {/* TITLE */}
          <div className="flex flex-col">
            <label className="text-xs mb-1 text-black font-semibold">
              Title *
            </label>
            <input
              value={formData.emp_title}
              onChange={(e) =>
                setFormData({ ...formData, emp_title: e.target.value })
              }
              className="border p-2 rounded text-black font-medium"
              required
            />
          </div>

          {/* DEPARTMENT */}
          <div className="flex flex-col">
            <label className="text-xs mb-1 text-black font-semibold">
              Department *
            </label>
            <select
              value={formData.dept_no}
              onChange={(e) =>
                setFormData({ ...formData, dept_no: e.target.value })
              }
              className="border p-2 rounded text-black font-medium"
              required
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.dept_no} value={d.dept_no}>
                  {d.dept_name}
                </option>
              ))}
            </select>
          </div>

          {/* REPORTS TO */}
          <div className="flex flex-col">
            <label className="text-xs mb-1 text-black font-semibold">
              Reports To
            </label>
            <select
              value={formData.manager_id}
              onChange={(e) =>
                setFormData({ ...formData, manager_id: e.target.value })
              }
              className="border p-2 rounded text-black font-medium"
            >
              <option value="">Select Manager</option>
              {managers.map((m) => (
                <option key={m.emp_id} value={m.emp_id}>
                  {m.emp_name}
                </option>
              ))}
            </select>
          </div>

          {/* DIRECTOR LEVEL */}
          <div className="flex flex-col">
            <label className="text-xs mb-1 text-black font-semibold">
              Director Level
            </label>
            <select
              className="border p-2 rounded text-black font-medium"
            >
              <option value="">Select Director</option>

              {/* backend will later provide director list */}
              {managers.map((m) => (
                <option key={m.emp_id} value={m.emp_id}>
                  {m.emp_name}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* OTHER INFORMATION */}
        <div className="flex flex-col mt-4">
          <label className="text-xs mb-1 text-black font-semibold">
            Other Information
          </label>
          <textarea
            value={formData.other_info}
            onChange={(e) =>
              setFormData({ ...formData, other_info: e.target.value })
            }
            className="border p-2 rounded w-full text-black font-medium"
            placeholder="e.g. Contract end date – Oct 15, 2025"
          />
        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-black rounded hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-[#017ACB] text-white rounded hover:bg-blue-700 font-medium"
          >
            Create
          </button>
        </div>

      </form>
    </div>
  </div>
);
}

