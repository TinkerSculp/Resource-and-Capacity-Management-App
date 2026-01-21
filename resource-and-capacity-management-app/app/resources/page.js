'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

const MONTHS = [
  { key: 202501, label: 'Jan-25' },
  { key: 202502, label: 'Feb-25' },
  { key: 202503, label: 'Mar-25' },
  { key: 202504, label: 'Apr-25' },
  { key: 202505, label: 'May-25' },
  { key: 202506, label: 'Jun-25' },
  { key: 202507, label: 'Jul-25' },
  { key: 202508, label: 'Aug-25' },
  { key: 202509, label: 'Sep-25' },
  { key: 202510, label: 'Oct-25' },
  { key: 202511, label: 'Nov-25' },
  { key: 202512, label: 'Dec-25' },
  { key: 202601, label: 'Jan-26' },
  { key: 202602, label: 'Feb-26' },
  { key: 202603, label: 'Mar-26' },
  { key: 202604, label: 'Apr-26' }
];

export default function ResourcesPage() {
  const [employees, setEmployees] = useState([]);
  const [employeesWithCapacity, setEmployeesWithCapacity] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    emp_name: '',
    emp_title: '',
    dept_no: '',
    manager_id: '',
    other_info: ''
  });

  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [employeesWithCapacity, activeFilter, statusFilter, searchTerm, user]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const empResponse = await fetch(`${apiUrl}/api/employees`);
      const empData = await empResponse.json();

      const deptResponse = await fetch(`${apiUrl}/api/departments`);
      const deptData = await deptResponse.json();
      setDepartments(deptData);

      const mgrResponse = await fetch(`${apiUrl}/api/managers`);
      const mgrData = await mgrResponse.json();
      setManagers(mgrData);

      const employeesWithCap = await Promise.all(
        empData.map(async (emp) => {
          try {
            const capResponse = await fetch(`${apiUrl}/api/employees/${emp.emp_id}/capacity`);
            if (capResponse.ok) {
              const capData = await capResponse.json();
              const capacityByMonth = {};
              capData.forEach(cap => {
                capacityByMonth[cap.date] = {
                  amount: cap.amount,
                  status: cap.current_status,
                  comments: cap.comments
                };
              });
              return { ...emp, capacity: capacityByMonth };
            }
          } catch (err) {
            console.error(`Error fetching capacity for emp ${emp.emp_id}:`, err);
          }
          return { ...emp, capacity: {} };
        })
      );

      setEmployeesWithCapacity(employeesWithCap);
      setEmployees(employeesWithCap);
      setError('');
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...employeesWithCapacity];

    if (activeFilter === 'mine' && user) {
      filtered = filtered.filter(emp => emp.manager_id === user.emp_id);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(emp => {
        const now = new Date();
        const currentDate = now.getFullYear() * 100 + (now.getMonth() + 1);
        const currentCap = emp.capacity[currentDate];
        if (statusFilter === 'active') {
          return !currentCap || currentCap.status === 'Active';
        } else {
          return currentCap && currentCap.status === 'Inactive';
        }
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.emp_name.toLowerCase().includes(term) ||
        emp.emp_title.toLowerCase().includes(term)
      );
    }

    setEmployees(filtered);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create employee');
        return;
      }

      setShowCreateModal(false);
      setFormData({ emp_name: '', emp_title: '', dept_no: '', manager_id: '', other_info: '' });
      fetchAllData();
    } catch (err) {
      console.error('Error creating employee:', err);
      setError('Failed to create employee');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      const response = await fetch(`${apiUrl}/api/employees/${selectedEmployee.emp_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update employee');
        return;
      }

      setShowEditModal(false);
      setSelectedEmployee(null);
      setFormData({ emp_name: '', emp_title: '', dept_no: '', manager_id: '', other_info: '' });
      fetchAllData();
    } catch (err) {
      console.error('Error updating employee:', err);
      setError('Failed to update employee');
    }
  };

  const handleStatusChange = async (empId, newStatus) => {
    try {
      const response = await fetch(`${apiUrl}/api/employees/${empId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update status');
        return;
      }

      setShowEditModal(false);
      setSelectedEmployee(null);
      fetchAllData();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      emp_name: employee.emp_name,
      emp_title: employee.emp_title,
      dept_no: employee.dept_no,
      manager_id: employee.manager_id || '',
      other_info: employee.other_info || ''
    });
    setShowEditModal(true);
  };

  const getDepartmentName = (deptNo) => {
    const dept = departments.find(d => d.dept_no === deptNo);
    return dept ? dept.dept_name : deptNo;
  };

  const getManagerName = (managerId) => {
    const manager = employeesWithCapacity.find(e => e.emp_id === managerId);
    return manager ? manager.emp_name : '-';
  };

  const getDirectorName = () => {
    return 'Charlotte Nguyen';
  };

  const getCurrentStatus = (employee) => {
    const now = new Date();
    const currentDate = now.getFullYear() * 100 + (now.getMonth() + 1);
    const cap = employee.capacity ? employee.capacity[currentDate] : null;
    return cap ? cap.status : 'Active';
  };

  const getMonthValue = (employee, monthKey) => {
    if (!employee.capacity || !employee.capacity[monthKey]) {
      return 1;
    }
    return employee.capacity[monthKey].amount;
  };

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#017ACB] shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center cursor-pointer" onClick={goToDashboard}>
              <img src="/CapstoneDynamicsLogo.png" alt="Logo" className="h-12 w-auto" />
              <div className="flex flex-col ml-3">
                <h1 className="text-2xl font-bold text-white leading-tight" style={styles.outfitFont}>
                  Capstone Dynamics
                </h1>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <h1 className="text-xl font-bold text-white leading-tight" style={styles.outfitFont}>
                Resource & Capacity
              </h1>
              <h2 className="text-xl font-bold text-white leading-tight" style={styles.outfitFont}>
                Management Planner
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white font-semibold" style={styles.outfitFont}>
                {user?.username || ''}
              </span>
              <div
               onClick={() => router.push('/Profile/view-profile')}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden hover:opacity-90 transition cursor-pointer"
                title="View Profile"
              >
                <span className="text-[#017ACB] font-bold text-lg">
                  {user?.username?.charAt(0)?.toUpperCase() || ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl text-gray-900" style={styles.outfitFont}>
            Data Management - Resource Availability by Month
          </h2>
          <button
           onClick={goToDashboard}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition cursor-pointer"
            style={styles.outfitFont}
          >
            ← Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button onClick={() => setError('')} className="ml-4 text-red-900 font-bold">×</button>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <button
               onClick={() => setActiveFilter('all')}
                className={`p-2 w-16 border border-gray-300 text-center cursor-pointer text-sm ${activeFilter === 'all' ? 'bg-[#017ACB] text-white' : 'text-gray-600 bg-white'}`}
                style={styles.outfitFont}
              >
                All
              </button>
              <button
               onClick={() => setActiveFilter('mine')}
                className={`p-2 w-16 border border-gray-300 text-center cursor-pointer text-sm ${activeFilter === 'mine' ? 'bg-[#017ACB] text-white' : 'text-gray-600 bg-white'}`}
                style={styles.outfitFont}
              >
                Mine
              </button>
            </div>

            <select
             value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
              style={styles.outfitFont}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <input
             type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm w-48"
              style={styles.outfitFont}
            />
          </div>

          <button
           onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#017ACB] text-white rounded hover:bg-blue-700 transition text-sm cursor-pointer"
            style={styles.outfitFont}
          >
            + Create Resource
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-r sticky left-0 bg-gray-100 z-10" style={styles.outfitFont}>Edit</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-r min-w-[150px]" style={styles.outfitFont}>Name</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-r min-w-[180px]" style={styles.outfitFont}>Title</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-r min-w-[100px]" style={styles.outfitFont}>Department</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-r min-w-[130px]" style={styles.outfitFont}>Reports To</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-r min-w-[130px]" style={styles.outfitFont}>Director Level</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-r min-w-[150px]" style={styles.outfitFont}>Other Information</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-r min-w-[80px]" style={styles.outfitFont}>Current Status</th>
                {MONTHS.map(month => (
                  <th key={month.key} className="px-2 py-2 text-center font-semibold text-gray-700 border-b border-r min-w-[60px]" style={styles.outfitFont}>
                    {month.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8 + MONTHS.length} className="px-4 py-8 text-center text-gray-500" style={styles.outfitFont}>
                    No employees found
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.emp_id} className="hover:bg-gray-50 border-b">
                    <td className="px-2 py-2 border-r sticky left-0 bg-white z-10">
                      <button
                       onClick={() => openEditModal(employee)}
                        className="px-2 py-1 bg-[#017ACB] text-white text-xs rounded hover:bg-blue-700 cursor-pointer"
                        style={styles.outfitFont}
                      >
                        Edit
                      </button>
                    </td>
                    <td className="px-2 py-2 text-gray-900 border-r" style={styles.outfitFont}>{employee.emp_name}</td>
                    <td className="px-2 py-2 text-gray-600 border-r" style={styles.outfitFont}>{employee.emp_title}</td>
                    <td className="px-2 py-2 text-gray-600 border-r" style={styles.outfitFont}>{getDepartmentName(employee.dept_no)}</td>
                    <td className="px-2 py-2 text-gray-600 border-r" style={styles.outfitFont}>{getManagerName(employee.manager_id)}</td>
                    <td className="px-2 py-2 text-gray-600 border-r" style={styles.outfitFont}>{getDirectorName()}</td>
                    <td className="px-2 py-2 text-gray-600 border-r" style={styles.outfitFont}>{employee.other_info || ''}</td>
                    <td className="px-2 py-2 border-r">
                      <span
                       className={`px-2 py-1 text-xs rounded ${getCurrentStatus(employee) === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                        style={styles.outfitFont}
                      >
                        {getCurrentStatus(employee)}
                      </span>
                    </td>
                    {MONTHS.map(month => (
                      <td key={month.key} className="px-2 py-2 text-center border-r text-gray-700" style={styles.outfitFont}>
                        {getMonthValue(employee, month.key)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-gray-600 text-sm" style={styles.outfitFont}>
          Showing {employees.length} of {employeesWithCapacity.length} employees
        </div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4" style={styles.outfitFont}>Create New Resource</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>Name *</label>
                <input
                 type="text"
                  value={formData.emp_name}
                  onChange={(e) => setFormData({ ...formData, emp_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
                  style={styles.outfitFont}
                  required
               />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>Title *</label>
                <input
                 type="text"
                  value={formData.emp_title}
                  onChange={(e) => setFormData({ ...formData, emp_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
                  style={styles.outfitFont}
                  required
               />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>Department *</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>Reports To</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>Other Information</label>
                <input
                 type="text"
                  value={formData.other_info}
                  onChange={(e) => setFormData({ ...formData, other_info: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
                  style={styles.outfitFont}
                  placeholder="e.g., Contract End date = Oct 15, 2025"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                 type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ emp_name: '', emp_title: '', dept_no: '', manager_id: '', other_info: '' });
                  }}
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
      )}

      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4" style={styles.outfitFont}>Edit Resource</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>Name *</label>
                <input
                 type="text"
                  value={formData.emp_name}
                  onChange={(e) => setFormData({ ...formData, emp_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
                  style={styles.outfitFont}
                  required
               />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>Title *</label>
                <input
                 type="text"
                  value={formData.emp_title}
                  onChange={(e) => setFormData({ ...formData, emp_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
                  style={styles.outfitFont}
                  required
               />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>Department *</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>Reports To</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>Other Information</label>
                <input
                 type="text"
                  value={formData.other_info}
                  onChange={(e) => setFormData({ ...formData, other_info: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
                  style={styles.outfitFont}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={styles.outfitFont}>Status</label>
                <div className="flex gap-2">
                  <button
                   type="button"
                    onClick={() => handleStatusChange(selectedEmployee.emp_id, 'Active')}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm cursor-pointer"
                    style={styles.outfitFont}
                  >
                    Set Active
                  </button>
                  <button
                   type="button"
                    onClick={() => handleStatusChange(selectedEmployee.emp_id, 'Inactive')}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm cursor-pointer"
                    style={styles.outfitFont}
                  >
                    Set Inactive
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                 type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEmployee(null);
                    setFormData({ emp_name: '', emp_title: '', dept_no: '', manager_id: '', other_info: '' });
                  }}
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
