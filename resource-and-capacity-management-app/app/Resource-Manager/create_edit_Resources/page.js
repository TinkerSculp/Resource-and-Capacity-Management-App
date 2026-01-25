'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';

/* ---------------------------------------------------------
   Shared Style Object
--------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

/* ---------------------------------------------------------
   Month Definitions
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
  ------------------------------------------------------- */
  const [employees, setEmployees] = useState([]);
  const [employeesWithCapacity, setEmployeesWithCapacity] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [user, setUser] = useState(null);

  /* -------------------------------------------------------
     UI State
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

  // ✅ Portal ready state (prevents SSR crash)
  const [portalReady, setPortalReady] = useState(false);

  const router = useRouter();
  const apiUrl = 'http://localhost:3001';

  /* -------------------------------------------------------
     Effect: Enable Portal (client-only)
  ------------------------------------------------------- */
  useEffect(() => {
    setPortalReady(true);
  }, []);

  /* -------------------------------------------------------
     Effect: Load User from LocalStorage
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
  ------------------------------------------------------- */
  useEffect(() => {
    fetchAllData();
  }, []);

  /* -------------------------------------------------------
     Effect: Apply Filters When Dependencies Change
  ------------------------------------------------------- */
  useEffect(() => {
    applyFilters();
  }, [
    employeesWithCapacity,
    activeFilter,
    statusFilter,
    searchTerm,
    user,
    selectedTitles,
    selectedReportsTo,
    selectedCurrentStatuses
  ]);

  /* -------------------------------------------------------
     Function: fetchAllData
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
            const capResponse = await fetch(
              `${apiUrl}/api/Resource-Manager/employees/${emp.emp_id}/capacity`
            );
            if (capResponse.ok) {
              const capData = await capResponse.json();

              const capacityByMonth = {};
              capData.forEach((cap) => {
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

      // Build unique dropdown lists
      setAvailableTitles([...new Set(employeesWithCap.map((e) => e.emp_title).filter(Boolean))]);

      setAvailableReportsTo([
        ...new Set(
          employeesWithCap
            .map((e) => {
              const manager = employeesWithCap.find((m) => m.emp_id === e.manager_id);
              return manager ? manager.emp_name : null;
            })
            .filter(Boolean)
        )
      ]);

      setAvailableCurrentStatuses([
        ...new Set(employeesWithCap.map((e) => getCurrentStatus(e)).filter(Boolean))
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------
     Function: applyFilters
  ------------------------------------------------------- */
  const applyFilters = () => {
    let filtered = [...employeesWithCapacity];

    // Filter: Mine
    if (activeFilter === 'mine' && user) {
      filtered = filtered.filter((emp) => emp.manager_id === user.emp_id);
    }

    // Filter: Active / Inactive
    if (statusFilter !== 'all') {
      filtered = filtered.filter((emp) => {
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

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.emp_name.toLowerCase().includes(term) ||
          emp.emp_title.toLowerCase().includes(term)
      );
    }

    // Multi-select Title
    if (selectedTitles.length > 0 && selectedTitles.length < availableTitles.length) {
      filtered = filtered.filter((emp) => selectedTitles.includes(emp.emp_title));
    }

    // Multi-select Reports To
    if (selectedReportsTo.length > 0 && selectedReportsTo.length < availableReportsTo.length) {
      filtered = filtered.filter((emp) => {
        const managerName = getManagerName(emp.manager_id);
        return selectedReportsTo.includes(managerName);
      });
    }

    // Multi-select Current Status
    if (
      selectedCurrentStatuses.length > 0 &&
      selectedCurrentStatuses.length < availableCurrentStatuses.length
    ) {
      filtered = filtered.filter((emp) => {
        const status = getCurrentStatus(emp);
        return selectedCurrentStatuses.includes(status);
      });
    }

    setEmployees(filtered);
  };

  /* -------------------------------------------------------
     Toggle Helper
  ------------------------------------------------------- */
  const toggleSelection = (value, setFn, current) => {
    setFn(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  };

  /* -------------------------------------------------------
     Close All Dropdowns on Outside Click
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
     Helpers
  --------------------------------------------------------- */
  const getDepartmentName = (deptNo) => {
    const dept = departments.find((d) => d.dept_no === deptNo);
    return dept ? dept.dept_name : deptNo;
  };

  const getManagerName = (managerId) => {
    const manager = employeesWithCapacity.find((e) => e.emp_id === managerId);
    return manager ? manager.emp_name : '-';
  };

  const getDirectorName = () => 'Charlotte Nguyen';

  const getCurrentStatus = (employee) => {
    const now = new Date();
    const currentDate = now.getFullYear() * 100 + (now.getMonth() + 1);
    const cap = employee.capacity ? employee.capacity[currentDate] : null;
    return cap ? cap.status : 'Active';
  };

  const getMonthValue = (employee, monthKey) => {
    if (!employee.capacity || !employee.capacity[monthKey]) return 1;
    return employee.capacity[monthKey].amount;
  };

  const goToDashboard = () => {
    router.push('/Resource-Manager/dashboard');
  };

  /* ---------------------------------------------------------
     ✅ Dropdown Portal Renderer
     - This fixes clipping + invisible-but-clickable menus
  --------------------------------------------------------- */
  const renderDropdownPortal = (menu) => {
    if (!portalReady) return null;

    return createPortal(
      <>
        {/* optional invisible overlay to help clicks register correctly */}
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => {
            setShowTitleMenu(false);
            setShowReportsToMenu(false);
            setShowCurrentStatusMenu(false);
          }}
        />
        <div
          className="fixed z-[9999]"
          style={{ top: menuPosition.y, left: menuPosition.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {menu}
        </div>
      </>,
      document.body
    );
  };

  /* ---------------------------------------------------------
     Loading States
  --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     Main Render
  --------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#017ACB] shadow-sm w-full relative">
        <div className="px-4 sm:px-6 lg:px-8 w-full">
          <div className="relative flex items-center h-[clamp(4.5rem,5vw,5.5rem)] w-full">
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

            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <h1
                className="font-bold text-white leading-tight text-[clamp(1.2rem,1.3vw,1.6rem)]"
                style={styles.outfitFont}
              >
                Resource & Capacity Management Planner
              </h1>
            </div>

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
            <button onClick={() => setError('')} className="ml-4 text-red-900 font-bold">
              ×
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
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

          <Link
            href="/Resource-Manager/create_edit_Resources/CreateResource"
            className="px-4 py-2 bg-[#017ACB] text-white rounded hover:bg-blue-700 transition text-sm cursor-pointer"
            style={styles.outfitFont}
          >
            + Create Resource
          </Link>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
            <table className="w-full text-sm">
              <thead className="bg-[#017ACB] text-white sticky top-0 z-10">
                <tr>
                  <th
                    className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white"
                    style={styles.outfitFont}
                  >
                    Edit
                  </th>
                  <th
                    className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[150px]"
                    style={styles.outfitFont}
                  >
                    Name
                  </th>

                  {/* Title Filter Column */}
                  <th
                    className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[180px] relative"
                    style={styles.outfitFont}
                  >
                    <div className="flex justify-between items-center">
                      <span>Title</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
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

                    {/* ✅ PORTAL MENU */}
                    {showTitleMenu &&
                      renderDropdownPortal(
                        <div className="bg-white text-black shadow-lg rounded w-56 max-h-64 overflow-y-auto border border-gray-200">
                          <div
                            className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                              selectedTitles.length === 0 ||
                              selectedTitles.length === availableTitles.length
                                ? 'bg-gray-100 font-semibold'
                                : ''
                            }`}
                            onClick={() => setSelectedTitles([])}
                          >
                            <input
                              type="checkbox"
                              checked={
                                selectedTitles.length === 0 ||
                                selectedTitles.length === availableTitles.length
                              }
                              readOnly
                            />
                            All
                          </div>

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

                  <th
                    className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[100px]"
                    style={styles.outfitFont}
                  >
                    Department
                  </th>

                  {/* Reports To Filter Column */}
                  <th
                    className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[130px] relative"
                    style={styles.outfitFont}
                  >
                    <div className="flex justify-between items-center">
                      <span>Reports To</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
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

                    {/* ✅ PORTAL MENU */}
                    {showReportsToMenu &&
                      renderDropdownPortal(
                        <div className="bg-white text-black shadow-lg rounded w-56 max-h-64 overflow-y-auto border border-gray-200">
                          <div
                            className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                              selectedReportsTo.length === 0 ||
                              selectedReportsTo.length === availableReportsTo.length
                                ? 'bg-gray-100 font-semibold'
                                : ''
                            }`}
                            onClick={() => setSelectedReportsTo([])}
                          >
                            <input
                              type="checkbox"
                              checked={
                                selectedReportsTo.length === 0 ||
                                selectedReportsTo.length === availableReportsTo.length
                              }
                              readOnly
                            />
                            All
                          </div>

                          {availableReportsTo.map((manager) => (
                            <div
                              key={manager}
                              className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                                selectedReportsTo.includes(manager) ? 'bg-gray-100 font-semibold' : ''
                              }`}
                              onClick={() =>
                                toggleSelection(manager, setSelectedReportsTo, selectedReportsTo)
                              }
                            >
                              <input
                                type="checkbox"
                                checked={selectedReportsTo.includes(manager)}
                                readOnly
                              />
                              {manager}
                            </div>
                          ))}
                        </div>
                      )}
                  </th>

                  <th
                    className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[130px]"
                    style={styles.outfitFont}
                  >
                    Director Level
                  </th>
                  <th
                    className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[150px]"
                    style={styles.outfitFont}
                  >
                    Other Information
                  </th>

                  {/* Current Status Filter Column */}
                  <th
                    className="px-2 py-2 text-left font-semibold border-b border-black border-r border-white min-w-[120px] relative"
                    style={styles.outfitFont}
                  >
                    <div className="flex justify-between items-center">
                      <span>Current Status</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
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

                    {/* ✅ PORTAL MENU */}
                    {showCurrentStatusMenu &&
                      renderDropdownPortal(
                        <div className="bg-white text-black shadow-lg rounded w-56 max-h-64 overflow-y-auto border border-gray-200">
                          <div
                            className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                              selectedCurrentStatuses.length === 0 ||
                              selectedCurrentStatuses.length === availableCurrentStatuses.length
                                ? 'bg-gray-100 font-semibold'
                                : ''
                            }`}
                            onClick={() => setSelectedCurrentStatuses([])}
                          >
                            <input
                              type="checkbox"
                              checked={
                                selectedCurrentStatuses.length === 0 ||
                                selectedCurrentStatuses.length === availableCurrentStatuses.length
                              }
                              readOnly
                            />
                            All
                          </div>

                          {availableCurrentStatuses.map((status) => (
                            <div
                              key={status}
                              className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                                selectedCurrentStatuses.includes(status)
                                  ? 'bg-gray-100 font-semibold'
                                  : ''
                              }`}
                              onClick={() =>
                                toggleSelection(
                                  status,
                                  setSelectedCurrentStatuses,
                                  selectedCurrentStatuses
                                )
                              }
                            >
                              <input
                                type="checkbox"
                                checked={selectedCurrentStatuses.includes(status)}
                                readOnly
                              />
                              {status}
                            </div>
                          ))}
                        </div>
                      )}
                  </th>

                  {MONTHS.map((month) => (
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
                      <td className="px-2 py-2 border-r border-black">
                        <Link
                          href={`/Resource-Manager/create_edit_Resources/EditResource?id=${employee.emp_id}`}
                          className="px-2 py-1 bg-[#017ACB] text-white text-xs rounded hover:bg-blue-700 cursor-pointer inline-block"
                          style={styles.outfitFont}
                        >
                          Edit
                        </Link>
                      </td>

                      <td className="px-2 py-2 text-black border-r border-black" style={styles.outfitFont}>
                        {employee.emp_name}
                      </td>
                      <td className="px-2 py-2 text-black border-r border-black" style={styles.outfitFont}>
                        {employee.emp_title}
                      </td>
                      <td className="px-2 py-2 text-gray-600 border-r border-black" style={styles.outfitFont}>
                        {getDepartmentName(employee.dept_no)}
                      </td>
                      <td className="px-2 py-2 text-gray-600 border-r border-black" style={styles.outfitFont}>
                        {getManagerName(employee.manager_id)}
                      </td>
                      <td className="px-2 py-2 text-gray-600 border-r border-black" style={styles.outfitFont}>
                        {getDirectorName()}
                      </td>
                      <td className="px-2 py-2 text-gray-600 border-r border-black" style={styles.outfitFont}>
                        {employee.other_info || ''}
                      </td>

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

                      {MONTHS.map((month) => (
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

        <div className="mt-4 text-gray-600 text-sm" style={styles.outfitFont}>
          Showing {employees.length} of {employeesWithCapacity.length} employees
        </div>
      </main>
    </div>
  );
}
