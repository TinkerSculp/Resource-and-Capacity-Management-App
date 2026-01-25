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



  // Multi-select filter states
  const [selectedTitles, setSelectedTitles] = useState([]);
  const [selectedReportsTo, setSelectedReportsTo] = useState([]);
  const [selectedCurrentStatuses, setSelectedCurrentStatuses] = useState([]);

  // Dropdown visibility toggles
  const [showTitleMenu, setShowTitleMenu] = useState(false);
  const [showReportsToMenu, setShowReportsToMenu] = useState(false);
  const [showCurrentStatusMenu, setShowCurrentStatusMenu] = useState(false);

  // Dropdown absolute positioning
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Unique dropdown option lists (extracted from DB)
  const [availableTitles, setAvailableTitles] = useState([]);
  const [availableReportsTo, setAvailableReportsTo] = useState([]);
  const [availableCurrentStatuses, setAvailableCurrentStatuses] = useState([]);

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
         selectedTitles changes
         selectedReportsTo changes
         selectedCurrentStatuses changes
  ------------------------------------------------------- */
  useEffect(() => {
    applyFilters();
  }, [employeesWithCapacity, activeFilter, statusFilter, searchTerm, user, selectedTitles, selectedReportsTo, selectedCurrentStatuses]);

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

      // Build unique dropdown lists
      setAvailableTitles([...new Set(employeesWithCap.map(e => e.emp_title).filter(Boolean))]);
      setAvailableReportsTo([...new Set(employeesWithCap.map(e => {
        const manager = employeesWithCap.find(m => m.emp_id === e.manager_id);
        return manager ? manager.emp_name : null;
      }).filter(Boolean))]);
      setAvailableCurrentStatuses([...new Set(employeesWithCap.map(e => getCurrentStatus(e)).filter(Boolean))]);

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

    // Filter: Multi-select Title filter (skip if all are selected)
    if (selectedTitles.length > 0 && selectedTitles.length < availableTitles.length) {
      filtered = filtered.filter(emp => selectedTitles.includes(emp.emp_title));
    }

    // Filter: Multi-select Reports To filter (skip if all are selected)
    if (selectedReportsTo.length > 0 && selectedReportsTo.length < availableReportsTo.length) {
      filtered = filtered.filter(emp => {
        const managerName = getManagerName(emp.manager_id);
        return selectedReportsTo.includes(managerName);
      });
    }

    // Filter: Multi-select Current Status filter (skip if all are selected)
    if (selectedCurrentStatuses.length > 0 && selectedCurrentStatuses.length < availableCurrentStatuses.length) {
      filtered = filtered.filter(emp => {
        const status = getCurrentStatus(emp);
        return selectedCurrentStatuses.includes(status);
      });
    }

    setEmployees(filtered);
  };



  /* -------------------------------------------------------
     Toggle Helper
     -------------------------------------------------------
     - Adds or removes a value from any multi-select filter array
     - Used by all dropdown filter components
  ------------------------------------------------------- */
  const toggleSelection = (value, setFn, current) => {
    setFn(current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    );
  };

  /* -------------------------------------------------------
     Close All Dropdowns on Outside Click
     -------------------------------------------------------
     - Ensures only one dropdown is open at a time
     - Closes all menus when clicking anywhere outside
  ------------------------------------------------------- */
  useEffect(() => {
    const handleClickOutside = () => {
      setShowTitleMenu(false);
      setShowReportsToMenu(false);
      setShowCurrentStatusMenu(false);
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);
 
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
    <Link
      href="/Resource-Manager/create_edit_Resources/CreateResource"
      className="px-4 py-2 bg-[#017ACB] text-white rounded hover:bg-blue-700 transition text-sm cursor-pointer"
      style={styles.outfitFont}
    >
      + Create Resource
    </Link>
  </div>

  {/* -----------------------------------------------------
      Employee Table
      -----------------------------------------------------
      - Displays all employees with capacity by month
      - Sticky first column for Edit button
      - Dynamically renders month columns from MONTHS array
      - Scrollable container with fixed height
  ----------------------------------------------------- */}
  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
      <table className="w-full text-sm">

      {/* ---------------- Table Header ---------------- */}
      <thead className="bg-[#017ACB] text-white sticky top-0 z-10">
        <tr>
          <th className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white" style={styles.outfitFont}>Edit</th>
          <th className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[150px]" style={styles.outfitFont}>Name</th>
          
          {/* Title Filter Column */}
          <th className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[180px] relative" style={styles.outfitFont}>
            <div className="flex justify-between items-center">
              <span>Title</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.target.getBoundingClientRect();
                  setMenuPosition({ x: rect.left, y: rect.bottom });
                  setShowTitleMenu((prev) => !prev);
                  setShowReportsToMenu(false);
                  setShowCurrentStatusMenu(false);
                }}
                className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-gray-100 transition"
              >
                ▼
              </button>
            </div>

            {/* Title Dropdown Menu */}
            {showTitleMenu && (
              <div
                className="fixed bg-white text-black shadow-lg rounded w-48 z-50 max-h-64 overflow-y-auto"
                style={{ top: menuPosition.y, left: menuPosition.x }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* "All" option */}
                <div
                  className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                    selectedTitles.length === 0 || selectedTitles.length === availableTitles.length ? 'bg-gray-100 font-semibold' : ''
                  }`}
                  onClick={() => setSelectedTitles([])}
                >
                  <input type="checkbox" checked={selectedTitles.length === 0 || selectedTitles.length === availableTitles.length} readOnly />
                  All
                </div>

                {/* Individual title options */}
                {availableTitles.map((title) => (
                  <div
                    key={title}
                    className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                      selectedTitles.includes(title) ? 'bg-gray-100 font-semibold' : ''
                    }`}
                    onClick={() => toggleSelection(title, setSelectedTitles, selectedTitles)}
                  >
                    <input type="checkbox" checked={selectedTitles.includes(title)} readOnly />
                    {title}
                  </div>
                ))}
              </div>
            )}
          </th>

          <th className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[100px]" style={styles.outfitFont}>Department</th>
          
          {/* Reports To Filter Column */}
          <th className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[130px] relative" style={styles.outfitFont}>
            <div className="flex justify-between items-center">
              <span>Reports To</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.target.getBoundingClientRect();
                  setMenuPosition({ x: rect.left, y: rect.bottom });
                  setShowReportsToMenu((prev) => !prev);
                  setShowTitleMenu(false);
                  setShowCurrentStatusMenu(false);
                }}
                className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-gray-100 transition"
              >
                ▼
              </button>
            </div>

            {/* Reports To Dropdown Menu */}
            {showReportsToMenu && (
              <div
                className="fixed bg-white text-black shadow-lg rounded w-48 z-50 max-h-64 overflow-y-auto"
                style={{ top: menuPosition.y, left: menuPosition.x }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* "All" option */}
                <div
                  className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                    selectedReportsTo.length === 0 || selectedReportsTo.length === availableReportsTo.length ? 'bg-gray-100 font-semibold' : ''
                  }`}
                  onClick={() => setSelectedReportsTo([])}
                >
                  <input type="checkbox" checked={selectedReportsTo.length === 0 || selectedReportsTo.length === availableReportsTo.length} readOnly />
                  All
                </div>

                {/* Individual reports to options */}
                {availableReportsTo.map((manager) => (
                  <div
                    key={manager}
                    className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                      selectedReportsTo.includes(manager) ? 'bg-gray-100 font-semibold' : ''
                    }`}
                    onClick={() => toggleSelection(manager, setSelectedReportsTo, selectedReportsTo)}
                  >
                    <input type="checkbox" checked={selectedReportsTo.includes(manager)} readOnly />
                    {manager}
                  </div>
                ))}
              </div>
            )}
          </th>

          <th className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[130px]" style={styles.outfitFont}>Director Level</th>
          <th className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[150px]" style={styles.outfitFont}>Other Information</th>
          
          {/* Current Status Filter Column */}
          <th className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[80px] relative" style={styles.outfitFont}>
            <div className="flex justify-between items-center">
              <span>Current Status</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.target.getBoundingClientRect();
                  setMenuPosition({ x: rect.left, y: rect.bottom });
                  setShowCurrentStatusMenu((prev) => !prev);
                  setShowTitleMenu(false);
                  setShowReportsToMenu(false);
                }}
                className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-gray-100 transition"
              >
                ▼
              </button>
            </div>

            {/* Current Status Dropdown Menu */}
            {showCurrentStatusMenu && (
              <div
                className="fixed bg-white text-black shadow-lg rounded w-48 z-50 max-h-64 overflow-y-auto"
                style={{ top: menuPosition.y, left: menuPosition.x }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* "All" option */}
                <div
                  className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                    selectedCurrentStatuses.length === 0 || selectedCurrentStatuses.length === availableCurrentStatuses.length ? 'bg-gray-100 font-semibold' : ''
                  }`}
                  onClick={() => setSelectedCurrentStatuses([])}
                >
                  <input type="checkbox" checked={selectedCurrentStatuses.length === 0 || selectedCurrentStatuses.length === availableCurrentStatuses.length} readOnly />
                  All
                </div>

                {/* Individual status options */}
                {availableCurrentStatuses.map((status) => (
                  <div
                    key={status}
                    className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                      selectedCurrentStatuses.includes(status) ? 'bg-gray-100 font-semibold' : ''
                    }`}
                    onClick={() => toggleSelection(status, setSelectedCurrentStatuses, selectedCurrentStatuses)}
                  >
                    <input type="checkbox" checked={selectedCurrentStatuses.includes(status)} readOnly />
                    {status}
                  </div>
                ))}
              </div>
            )}
          </th>

          {/* Dynamic Month Columns */}
          {MONTHS.map(month => (
            <th
              key={month.key}
              className="px-2 py-2 text-center font-semibold text-white border-b border-black border-r border-white min-w-[60px]"
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
              className="px-4 py-8 text-center text-black"
              style={styles.outfitFont}
            >
              No employees found
            </td>
          </tr>
        ) : (
          employees.map((employee) => (
            <tr key={employee.emp_id} className="hover:bg-gray-50 border-b border-black">

              {/* Edit Button (Sticky Column) */}
              <td className="px-2 py-2 border-r border-black">
                <Link
                  href={`/Resource-Manager/create_edit_Resources/EditResource?id=${employee.emp_id}`}
                  className="px-2 py-1 bg-[#017ACB] text-white text-xs rounded hover:bg-blue-700 cursor-pointer inline-block"
                  style={styles.outfitFont}
                >
                  Edit
                </Link>
              </td>

              {/* Employee Details */}
              <td className="px-2 py-2 text-black border-r border-black" style={styles.outfitFont}>{employee.emp_name}</td>
              <td className="px-2 py-2 text-black border-r border-black" style={styles.outfitFont}>{employee.emp_title}</td>
              <td className="px-2 py-2 text-gray-600 border-r border-black" style={styles.outfitFont}>{getDepartmentName(employee.dept_no)}</td>
              <td className="px-2 py-2 text-gray-600 border-r border-black" style={styles.outfitFont}>{getManagerName(employee.manager_id)}</td>
              <td className="px-2 py-2 text-gray-600 border-r border-black" style={styles.outfitFont}>{getDirectorName()}</td>
              <td className="px-2 py-2 text-gray-600 border-r border-black" style={styles.outfitFont}>{employee.other_info || ''}</td>

              {/* Current Status Badge */}
              <td className="px-2 py-2 border-r border-black">
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
                  className="px-2 py-2 text-center border-r border-black text-black"
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
    </div>
  );
}
