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
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleCancel}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-4" style={styles.outfitFont}>
          Create New Resource
        </h2>

        {/* Create Form */}
        <form onSubmit={handleCreate} className="space-y-4">

          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>
              Name *
            </label>
            <input
              type="text"
              value={formData.emp_name}
              onChange={(e) => setFormData({ ...formData, emp_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
              style={styles.outfitFont}
              required
            />
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>
              Title *
            </label>
            <input
              type="text"
              value={formData.emp_title}
              onChange={(e) => setFormData({ ...formData, emp_title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
              style={styles.outfitFont}
              required
            />
          </div>

          {/* Department Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>
              Department *
            </label>
            <select
              value={formData.dept_no}
              onChange={(e) => setFormData({ ...formData, dept_no: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
              style={styles.outfitFont}
              required
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.dept_no} value={dept.dept_no}>
                  {dept.dept_name}
                </option>
              ))}
            </select>
          </div>

          {/* Reports To Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>
              Reports To
            </label>
            <select
              value={formData.manager_id}
              onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
              style={styles.outfitFont}
            >
              <option value="">Select Manager</option>
              {managers.map((manager) => (
                <option key={manager.emp_id} value={manager.emp_id}>
                  {manager.emp_name}
                </option>
              ))}
            </select>
          </div>

          {/* Other Information Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>
              Other Information
            </label>
            <input
              type="text"
              value={formData.other_info}
              onChange={(e) => setFormData({ ...formData, other_info: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
              style={styles.outfitFont}
              placeholder="e.g., Contract End date = Oct 15, 2025"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 text-sm cursor-pointer"
              style={styles.outfitFont}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#017ACB] text-white rounded hover:bg-blue-700 text-sm cursor-pointer"
              style={styles.outfitFont}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
