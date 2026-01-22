'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/* ---------------------------------------------------------
   Shared Style Object
   ---------------------------------------------------------
   - Centralizes typography styling for consistency
   - Used across headings, labels, and UI elements
--------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

/* ---------------------------------------------------------
   Month Definitions
   ---------------------------------------------------------
   - Used for capacity display across the UI
   - Keys follow YYYYMM format for easy comparison
--------------------------------------------------------- */
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
  /* -------------------------------------------------------
     Core Data State
     -------------------------------------------------------
     employees              → filtered list displayed in UI
     employeesWithCapacity → full dataset including capacity
     departments           → department lookup table
     managers              → manager lookup table
     user                  → logged‑in user from localStorage
  ------------------------------------------------------- */
  const [employees, setEmployees] = useState([]);
  const [employeesWithCapacity, setEmployeesWithCapacity] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [user, setUser] = useState(null);

  /* -------------------------------------------------------
     UI State
     -------------------------------------------------------
     loading       → global loading indicator
     error         → error message for API failures
     activeFilter  → "all" or "mine"
     statusFilter  → "all", "active", "inactive"
     searchTerm    → text search for name/title
  ------------------------------------------------------- */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  /* -------------------------------------------------------
     Modal + Form State
     -------------------------------------------------------
     showCreateModal   → controls create modal visibility
     showEditModal     → controls edit modal visibility
     selectedEmployee  → employee being edited
     formData          → create/edit form fields
  ------------------------------------------------------- */
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
  const apiUrl = 'http://localhost:3001';

  /* -------------------------------------------------------
     Effect: Load User from LocalStorage
     -------------------------------------------------------
     - Redirects to login if no user is stored
     - Stores parsed user object in state
  ------------------------------------------------------- */
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  /* -------------------------------------------------------
     Effect: Initial Data Load
     -------------------------------------------------------
     - Fetches employees, departments, managers
     - Fetches capacity for each employee
     - Builds unified dataset
  ------------------------------------------------------- */
  useEffect(() => {
    fetchAllData();
  }, []);

  /* -------------------------------------------------------
     Effect: Apply Filters When Dependencies Change
     -------------------------------------------------------
     - Runs whenever:
         employeesWithCapacity changes
         activeFilter changes
         statusFilter changes
         searchTerm changes
         user changes
  ------------------------------------------------------- */
  useEffect(() => {
    applyFilters();
  }, [employeesWithCapacity, activeFilter, statusFilter, searchTerm, user]);

  /* -------------------------------------------------------
     Function: fetchAllData
     -------------------------------------------------------
     - Loads all employees
     - Loads departments + managers
     - Loads capacity for each employee
     - Merges capacity into employee objects
     - Handles loading + error states
  ------------------------------------------------------- */
  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch employees
      const empResponse = await fetch(`${apiUrl}/api/Resource-Manager/employees`);
      const empData = await empResponse.json();

      // Fetch departments
      const deptResponse = await fetch(`${apiUrl}/api/Resource-Manager/departments`);
      const deptData = await deptResponse.json();
      setDepartments(deptData);

      // Fetch managers
      const mgrResponse = await fetch(`${apiUrl}/api/Resource-Manager/managers`);
      const mgrData = await mgrResponse.json();
      setManagers(mgrData);

      // Fetch capacity for each employee
      const employeesWithCap = await Promise.all(
        empData.map(async (emp) => {
          try {
            const capResponse = await fetch(`${apiUrl}/api/Resource-Manager/employees/${emp.emp_id}/capacity`);
            if (capResponse.ok) {
              const capData = await capResponse.json();

              // Build capacity lookup table by month
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

          // Default: no capacity data
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

  /* -------------------------------------------------------
     Function: applyFilters
     -------------------------------------------------------
     - Applies:
         1. "Mine" filter (manager_id === user.emp_id)
         2. Active/Inactive status filter
         3. Search filter (name/title)
     - Updates employees list shown in UI
  ------------------------------------------------------- */
  const applyFilters = () => {
    let filtered = [...employeesWithCapacity];

    // Filter: Mine (employees managed by logged‑in user)
    if (activeFilter === 'mine' && user) {
      filtered = filtered.filter(emp => emp.manager_id === user.emp_id);
    }

    // Filter: Active / Inactive
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

    // Filter: Search by name or title
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.emp_name.toLowerCase().includes(term) ||
        emp.emp_title.toLowerCase().includes(term)
      );
    }

    setEmployees(filtered);
  };

  /* -------------------------------------------------------
     Function: handleCreate
     -------------------------------------------------------
     - Sends POST request to create new employee
     - Resets form + reloads data
  ------------------------------------------------------- */
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/api/Resource-Manager/employees`, {
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

  /* -------------------------------------------------------
     Function: handleEdit
     -------------------------------------------------------
     - Sends PUT request to update employee
     - Resets modal + reloads data
  ------------------------------------------------------- */
  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      const response = await fetch(`${apiUrl}/api/Resource-Manager/employees/${selectedEmployee.emp_id}`, {
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

  /* -------------------------------------------------------
     Function: handleStatusChange
     -------------------------------------------------------
     - Sends PATCH request to update employee status
     - Reloads data after update
  ------------------------------------------------------- */
  const handleStatusChange = async (empId, newStatus) => {
    try {
      const response = await fetch(`${apiUrl}/api/Resource-Manager/employees/${empId}/status`, {
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

  /* -------------------------------------------------------
     Function: openEditModal
     -------------------------------------------------------
     - Preloads selected employee data into form
     - Opens edit modal
  ------------------------------------------------------- */
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
 
 /* ---------------------------------------------------------
   Helper: Get Department Name
   ---------------------------------------------------------
   - Looks up a department by its dept_no
   - Returns the department name if found
   - Falls back to the raw dept_no if no match exists
--------------------------------------------------------- */
const getDepartmentName = (deptNo) => {
  const dept = departments.find(d => d.dept_no === deptNo);
  return dept ? dept.dept_name : deptNo;
};

/* ---------------------------------------------------------
   Helper: Get Manager Name
   ---------------------------------------------------------
   - Finds an employee whose emp_id matches managerId
   - Returns the manager's full name
   - Returns "-" if no matching manager is found
--------------------------------------------------------- */
const getManagerName = (managerId) => {
  const manager = employeesWithCapacity.find(e => e.emp_id === managerId);
  return manager ? manager.emp_name : '-';
};

/* ---------------------------------------------------------
   Helper: Get Director Name
   ---------------------------------------------------------
   - Currently returns a static director name
   - Placeholder for future dynamic lookup
--------------------------------------------------------- */
const getDirectorName = () => {
  return 'Charlotte Nguyen';
};

/* ---------------------------------------------------------
   Helper: Get Current Status
   ---------------------------------------------------------
   - Determines the employee's status for the current month
   - Uses YYYYMM format to match capacity records
   - Defaults to "Active" if no capacity record exists
--------------------------------------------------------- */
const getCurrentStatus = (employee) => {
  const now = new Date();
  const currentDate = now.getFullYear() * 100 + (now.getMonth() + 1);

  const cap = employee.capacity ? employee.capacity[currentDate] : null;
  return cap ? cap.status : 'Active';
};

/* ---------------------------------------------------------
   Helper: Get Monthly Capacity Value
   ---------------------------------------------------------
   - Returns the capacity amount for a given monthKey
   - Defaults to 1 if no capacity record exists
   - Ensures UI always has a numeric value to display
--------------------------------------------------------- */
const getMonthValue = (employee, monthKey) => {
  if (!employee.capacity || !employee.capacity[monthKey]) {
    return 1;
  }
  return employee.capacity[monthKey].amount;
};

/* ---------------------------------------------------------
   Navigation: Return to Dashboard
   ---------------------------------------------------------
   - Redirects the user back to the dashboard page
   - Used by header logo click
--------------------------------------------------------- */
const goToDashboard = () => {
  router.push('/dashboard');
};

/* ---------------------------------------------------------
   Loading State: No User Loaded
   ---------------------------------------------------------
   - Shows a centered spinner while user data is loading
   - Prevents rendering protected content prematurely
--------------------------------------------------------- */
if (!user) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

/* ---------------------------------------------------------
   Loading State: Data Fetch in Progress
   ---------------------------------------------------------
   - Displays a spinner while employees/capacity load
--------------------------------------------------------- */
if (loading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

/* ---------------------------------------------------------
   Main Render
   ---------------------------------------------------------
   - Header with branding + navigation
   - User profile shortcut
   - Page content rendered below this block
--------------------------------------------------------- */
return (
  <div className="min-h-screen bg-gray-50">
     <header className="bg-[#017ACB] shadow-sm w-full relative">
        <div className="px-4 sm:px-6 lg:px-8 w-full">

          {/* Balanced height for all screen sizes */}
          <div className="relative flex items-center h-[clamp(4.5rem,5vw,5.5rem)] w-full">

            {/* Logo + App Name (clickable → dashboard) */}
            <div
              className="flex items-center cursor-pointer flex-none"
              onClick={() => router.push('/Resource-Manager/dashboard')}
            >
              <img
                src="/CapstoneDynamicsLogo.png"
                alt="Logo"
                className="w-auto h-[clamp(3.2rem,3.8vw,4rem)]"
              />

              <h1
                className="font-bold text-white leading-tight ml-4 text-[clamp(1.6rem,1.7vw,2rem)]"
                style={styles.outfitFont}
              >
                Capstone Dynamics
              </h1>
            </div>

            {/* Centered Page Title */}
            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <h1
                className="font-bold text-white leading-tight text-[clamp(1.2rem,1.3vw,1.6rem)]"
                style={styles.outfitFont}
              >
                Resource & Capacity Management Planner
              </h1>
            </div>

            {/* User Profile (username + avatar circle) */}
            <div className="flex items-center gap-4 ml-auto flex-none">
              <span
                className="font-semibold text-white text-[clamp(1rem,1.15vw,1.25rem)]"
                style={styles.outfitFont}
              >
                {user?.username || ''}
              </span>

              <div
                onClick={() => router.push('/Resource-Manager/Profile/view-profile')}
                className="rounded-full bg-white flex items-center justify-center cursor-pointer hover:opacity-90 transition
                           w-[clamp(2.4rem,2.8vw,3.0rem)] h-[clamp(2.4rem,2.8vw,3.0rem)]"
              >
                <span className="text-[#017ACB] font-bold text-[clamp(1.1rem,1.3vw,1.5rem)]">
                  {user?.username?.charAt(0)?.toUpperCase() || ''}
                </span>
              </div>
            </div>

          </div>
        </div>
      </header>
 
    <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

  {/* -----------------------------------------------------
      Page Header
      -----------------------------------------------------
      - Displays the page title
      - Includes a button to return to the dashboard
  ----------------------------------------------------- */}
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

  {/* -----------------------------------------------------
      Error Banner
      -----------------------------------------------------
      - Displays API or validation errors
      - Includes dismiss button to clear error state
  ----------------------------------------------------- */}
  {error && (
    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
      {error}
      <button onClick={() => setError('')} className="ml-4 text-red-900 font-bold">×</button>
    </div>
  )}

  {/* -----------------------------------------------------
      Filter Controls
      -----------------------------------------------------
      - Active filter: All / Mine
      - Status filter: Active / Inactive / All
      - Search bar: filters by name or title
      - Create Resource button: opens modal
  ----------------------------------------------------- */}
  <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">

    {/* Left-side filters */}
    <div className="flex flex-wrap gap-4 items-center">

      {/* Active Filter (All / Mine) */}
      <div>
        <button
          onClick={() => setActiveFilter('all')}
          className={`p-2 w-16 border border-gray-300 text-center cursor-pointer text-sm ${
            activeFilter === 'all' ? 'bg-[#017ACB] text-white' : 'text-gray-600 bg-white'
          }`}
          style={styles.outfitFont}
        >
          All
        </button>

        <button
          onClick={() => setActiveFilter('mine')}
          className={`p-2 w-16 border border-gray-300 text-center cursor-pointer text-sm ${
            activeFilter === 'mine' ? 'bg-[#017ACB] text-white' : 'text-gray-600 bg-white'
          }`}
          style={styles.outfitFont}
        >
          Mine
        </button>
      </div>

      {/* Status Filter */}
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

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm w-48"
        style={styles.outfitFont}
      />
    </div>

    {/* Create Resource Button */}
    <button
      onClick={() => setShowCreateModal(true)}
      className="px-4 py-2 bg-[#017ACB] text-white rounded hover:bg-blue-700 transition text-sm cursor-pointer"
      style={styles.outfitFont}
    >
      + Create Resource
    </button>
  </div>

  {/* -----------------------------------------------------
      Employee Table
      -----------------------------------------------------
      - Displays all employees with capacity by month
      - Sticky first column for Edit button
      - Dynamically renders month columns from MONTHS array
  ----------------------------------------------------- */}
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
    <table className="w-full text-sm">

      {/* ---------------- Table Header ---------------- */}
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

          {/* Dynamic Month Columns */}
          {MONTHS.map(month => (
            <th
              key={month.key}
              className="px-2 py-2 text-center font-semibold text-gray-700 border-b border-r min-w-[60px]"
              style={styles.outfitFont}
            >
              {month.label}
            </th>
          ))}
        </tr>
      </thead>

      {/* ---------------- Table Body ---------------- */}
      <tbody>
        {employees.length === 0 ? (
          <tr>
            <td
              colSpan={8 + MONTHS.length}
              className="px-4 py-8 text-center text-gray-500"
              style={styles.outfitFont}
            >
              No employees found
            </td>
          </tr>
        ) : (
          employees.map((employee) => (
            <tr key={employee.emp_id} className="hover:bg-gray-50 border-b">

              {/* Edit Button (Sticky Column) */}
              <td className="px-2 py-2 border-r sticky left-0 bg-white z-10">
                <button
                  onClick={() => openEditModal(employee)}
                  className="px-2 py-1 bg-[#017ACB] text-white text-xs rounded hover:bg-blue-700 cursor-pointer"
                  style={styles.outfitFont}
                >
                  Edit
                </button>
              </td>

              {/* Employee Details */}
              <td className="px-2 py-2 text-gray-900 border-r" style={styles.outfitFont}>{employee.emp_name}</td>
              <td className="px-2 py-2 text-gray-600 border-r" style={styles.outfitFont}>{employee.emp_title}</td>
              <td className="px-2 py-2 text-gray-600 border-r" style={styles.outfitFont}>{getDepartmentName(employee.dept_no)}</td>
              <td className="px-2 py-2 text-gray-600 border-r" style={styles.outfitFont}>{getManagerName(employee.manager_id)}</td>
              <td className="px-2 py-2 text-gray-600 border-r" style={styles.outfitFont}>{getDirectorName()}</td>
              <td className="px-2 py-2 text-gray-600 border-r" style={styles.outfitFont}>{employee.other_info || ''}</td>

              {/* Current Status Badge */}
              <td className="px-2 py-2 border-r">
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    getCurrentStatus(employee) === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                  style={styles.outfitFont}
                >
                  {getCurrentStatus(employee)}
                </span>
              </td>

              {/* Monthly Capacity Values */}
              {MONTHS.map(month => (
                <td
                  key={month.key}
                  className="px-2 py-2 text-center border-r text-gray-700"
                  style={styles.outfitFont}
                >
                  {getMonthValue(employee, month.key)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>

  {/* -----------------------------------------------------
      Footer: Summary of Results
      -----------------------------------------------------
      - Shows how many employees match the current filters
  ----------------------------------------------------- */}
  <div className="mt-4 text-gray-600 text-sm" style={styles.outfitFont}>
    Showing {employees.length} of {employeesWithCapacity.length} employees
  </div>

</main>

{/* ---------------------------------------------------------
    CREATE RESOURCE MODAL
    ---------------------------------------------------------
    - Appears when showCreateModal === true
    - Allows creation of a new employee record
    - Includes validation for required fields
    - Uses formData state to track input values
--------------------------------------------------------- */}
{showCreateModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">

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
 -------------
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
