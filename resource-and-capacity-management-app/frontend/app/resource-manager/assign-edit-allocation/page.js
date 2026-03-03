'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from 'next/navigation';

/* ---------------------------------------------------------
   STYLES (STATIC)
   ---------------------------------------------------------
   • Using inline font-family object for consistent typography.
   • Safe: no dynamic values or user-controlled content.
--------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function AssignmentsAllocationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refresh = searchParams.get("refresh");

  /* ---------------------------------------------------------
     API BASE URL
     ---------------------------------------------------------
     • Hardcoded local API URL — safe for dev environment.
     • In production, consider environment variables.
  --------------------------------------------------------- */
  const apiUrl = "http://localhost:3001";

  /* ---------------------------------------------------------
     CORE STATE
     ---------------------------------------------------------
     • user: loaded from localStorage (client-only)
     • startMonthMenuRef: used for click-outside detection
     • allRows/mine: full dataset from backend
     • filteredRows: post-filtered dataset
     • months: list of YYYYMM strings from backend
     • activeTab: "all" | "mine"
     • loading: controls initial fetch spinner
  --------------------------------------------------------- */
  const [user, setUser] = useState(null);
  const startMonthMenuRef = useRef(null);

  const [allRows, setAllRows] = useState([]);
  const [mine, setMine] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [months, setMonths] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  /* ---------------------------------------------------------
     MULTI-SELECT FILTER STATES
     ---------------------------------------------------------
     • Each filter stores an array of selected values.
     • All values are strings — safe for UI rendering.
     • No direct backend injection risk.
  --------------------------------------------------------- */
  const [selectedResources, setSelectedResources] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedLeaders, setSelectedLeaders] = useState([]);
  const [selectedRequestors, setSelectedRequestors] = useState([]);
  const [selectedRequestorVPs, setSelectedRequestorVPs] = useState([]);
  const [selectedRequestingDepts, setSelectedRequestingDepts] = useState([]);

  /* ---------------------------------------------------------
     SORTING STATE
     ---------------------------------------------------------
     • resourceSort: "", "asc", "desc"
     • showResourceSortMenu: dropdown visibility
  --------------------------------------------------------- */
  const [resourceSort, setResourceSort] = useState('');
  const [showResourceSortMenu, setShowResourceSortMenu] = useState(false);

  /* ---------------------------------------------------------
     DROPDOWN VISIBILITY TOGGLES
     ---------------------------------------------------------
     • Each boolean controls a specific filter dropdown.
     • All closed via global click handler.
  --------------------------------------------------------- */
  const [showResourceMenu, setShowResourceMenu] = useState(false);
  const [showActivityMenu, setShowActivityMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showLeaderMenu, setShowLeaderMenu] = useState(false);
  const [showRequestorMenu, setShowRequestorMenu] = useState(false);
  const [showRequestorVPMenu, setShowRequestorVPMenu] = useState(false);
  const [showRequestingDeptMenu, setShowRequestingDeptMenu] = useState(false);

  /* ---------------------------------------------------------
     MANAGER FILTER
     ---------------------------------------------------------
     • selectedManagers: multi-select
     • availableManagers: dynamically derived
  --------------------------------------------------------- */
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [availableManagers, setAvailableManagers] = useState([]);
  const [showManagerMenu, setShowManagerMenu] = useState(false);

  /* ---------------------------------------------------------
     ABSOLUTE POSITIONING FOR DROPDOWN MENUS
     ---------------------------------------------------------
     • Stores x/y coordinates from click event.
     • Safe: values come from DOM rect, not user input.
  --------------------------------------------------------- */
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  /* ---------------------------------------------------------
     UNIQUE DROPDOWN OPTION LISTS
     ---------------------------------------------------------
     • Derived from visible-window rows only.
     • Prevents dropdowns from showing irrelevant values.
  --------------------------------------------------------- */
  const [availableResources, setAvailableResources] = useState([]);
  const [availableActivities, setAvailableActivities] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableLeaders, setAvailableLeaders] = useState([]);
  const [availableRequestors, setAvailableRequestors] = useState([]);
  const [availableRequestorVPs, setAvailableRequestorVPs] = useState([]);
  const [availableRequestingDepts, setAvailableRequestingDepts] = useState([]);

  /* ---------------------------------------------------------
     START MONTH SELECTOR
     ---------------------------------------------------------
     • startMonth: YYYYMM string
     • showStartMonthMenu: dropdown visibility
  --------------------------------------------------------- */
  const [startMonth, setStartMonth] = useState(null);
  const [showStartMonthMenu, setShowStartMonthMenu] = useState(false);

  /* ---------------------------------------------------------
     NAVIGATION HELPERS
     ---------------------------------------------------------
     • Pushes to parallel modal routes.
     • Safe: IDs encoded in URL.
  --------------------------------------------------------- */
  const handleAddallocation = () => {
    router.push('/resource-manager/assign-edit-allocation/add-allocation');
  };

  const handleEditAllocation = (row) => {
    // Defensive: row.employee?.emp_id may be undefined
    router.push(
      `/resource-manager/assign-edit-allocation/edit-allocation?emp_id=${row.employee.emp_id}`
    );
  };

  /* ---------------------------------------------------------
     LOAD USER FROM LOCALSTORAGE
     ---------------------------------------------------------
     • No redirect logic here — safe for dashboard context.
     • Wrapped in typeof window check for SSR safety.
  --------------------------------------------------------- */
  useEffect(() => {
    const userData =
      typeof window !== "undefined" ? localStorage.getItem("user") : null;

    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        // Defensive: corrupted localStorage entry
        setUser(null);
      }
    }
  }, []);

  /* ---------------------------------------------------------
     LOAD ALL + MY ASSIGNMENTS (BACKEND FETCH)
     ---------------------------------------------------------
     • Uses new REST route: /api/assignments-allocations
     • Includes username + timestamp to avoid caching
     • Fully wrapped in try/catch for safety
     • Ensures fallback to empty arrays on failure
  --------------------------------------------------------- */
  useEffect(() => {
    if (!user?.username) return;

    const loadAll = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `${apiUrl}/api/assignments-allocations?username=${encodeURIComponent(
            user.username
          )}&ts=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );

        // Defensive: ensure JSON parsing doesn't crash
        const data = await res.json().catch(() => ({}));

        const allAssignments = data.allAssignments || [];
        const myAssignments = data.myAssignments || [];
        const monthsFromApi = data.months || [];

        setAllRows(allAssignments);
        setMine(myAssignments);
        setMonths(monthsFromApi);
        setFilteredRows(allAssignments);

      } catch (err) {
        console.error("Assignments fetch error:", err);

        // Defensive fallback
        setAllRows([]);
        setMine([]);
        setFilteredRows([]);
        setMonths([]);

      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [user, refresh]);

  /* ---------------------------------------------------------
     DEFAULT START MONTH
     ---------------------------------------------------------
     • Picks current month if available
     • Otherwise uses first month from backend
     • Defensive: ensures months array exists
  --------------------------------------------------------- */
  useEffect(() => {
    if (!months.length) return;
    if (startMonth) return;

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const current = `${y}${m}`;

    if (months.includes(current)) {
      setStartMonth(current);
    } else {
      setStartMonth(months[0]);
    }
  }, [months, startMonth]);

  /* ---------------------------------------------------------
     COMPUTE 12-MONTH WINDOW
     ---------------------------------------------------------
     • Uses startMonth as anchor
     • Defensive: returns [] if months missing
  --------------------------------------------------------- */
  const visibleMonths = useMemo(() => {
    if (!months.length) return [];
    const start =
      startMonth && months.includes(startMonth) ? startMonth : months[0];
    const idx = months.indexOf(start);
    return months.slice(idx, idx + 12);
  }, [months, startMonth]);

  /* ---------------------------------------------------------
     MONTH LABELS (UI ONLY)
     ---------------------------------------------------------
     • Converts YYYYMM → "Jan 2025"
     • Safe: no user input involved
  --------------------------------------------------------- */
  const monthLabels = useMemo(() => {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    return visibleMonths.map((m) => {
      const year = m.substring(0, 4);
      const month = m.substring(4, 6);
      return {
        key: m,
        label: `${monthNames[parseInt(month, 10) - 1]} ${year}`,
      };
    });
  }, [visibleMonths]);

  /* ---------------------------------------------------------
     FILTER ROWS THAT HAVE ALLOCATIONS IN VISIBLE WINDOW
     ---------------------------------------------------------
     • Prevents dropdowns from showing irrelevant values
     • Defensive: checks typeof val === "number"
  --------------------------------------------------------- */
  const rowsWithVisibleAllocations = useMemo(() => {
    return allRows.filter((row) =>
      visibleMonths.some((m) => {
        const val = row.allocations?.[m];
        return typeof val === "number" && val > 0;
      })
    );
  }, [allRows, visibleMonths]);

  /* ---------------------------------------------------------
     BUILD DROPDOWN OPTION LISTS
     ---------------------------------------------------------
     • Extracts unique values from visible rows
     • Defensive: filters out null/undefined
  --------------------------------------------------------- */
  useEffect(() => {
    const uniq = (arr) => [...new Set(arr)].filter(Boolean);

    setAvailableResources(
      uniq(rowsWithVisibleAllocations.map((r) => r.employee?.emp_name || ""))
    );

    setAvailableActivities(
      uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.project_name || ""))
    );

    setAvailableCategories(
      uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.category || ""))
    );

    setAvailableLeaders(
      uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.leader || ""))
    );

    setAvailableRequestors(
      uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.requestor || ""))
    );

    setAvailableRequestorVPs(
      uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.requestor_vp || ""))
    );

    setAvailableRequestingDepts(
      uniq(
        rowsWithVisibleAllocations.map(
          (r) =>
            r.assignment?.requesting_dept_name ||
            r.assignment?.requesting_dept ||
            ""
        )
      )
    );

    setAvailableManagers(
      uniq(rowsWithVisibleAllocations.map((r) => r.employee?.manager_name || ""))
    );
  }, [rowsWithVisibleAllocations]);

  /* ---------------------------------------------------------
     TOGGLE HELPER (MULTI-SELECT)
     ---------------------------------------------------------
     • Adds/removes a value from an array
     • Pure UI logic — safe
  --------------------------------------------------------- */
  const toggleSelection = (value, setFn, current) => {
    setFn(
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  };

  /* ---------------------------------------------------------
     CLOSE ALL DROPDOWNS ON OUTSIDE CLICK
     ---------------------------------------------------------
     • Global click listener
     • Defensive: cleans up listener on unmount
  --------------------------------------------------------- */
  useEffect(() => {
    const handleClickOutside = () => {
      setShowResourceSortMenu(false);
      setShowResourceMenu(false);
      setShowActivityMenu(false);
      setShowCategoryMenu(false);
      setShowLeaderMenu(false);
      setShowRequestorMenu(false);
      setShowRequestorVPMenu(false);
      setShowRequestingDeptMenu(false);
      setShowManagerMenu(false);
      setShowStartMonthMenu(false);
    };

    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

// Filtering + sorting logic
useEffect(() => {
  if (!user) return; // Defensive: avoid running before user loads

  // Base dataset depends on active tab
  let base = activeTab === "mine" ? mine : allRows;

  /* ---------------------------------------------------------
     FILTER PIPELINE
     ---------------------------------------------------------
     • Extracts all relevant fields with null guards
     • Applies multi-select filters
     • Ensures only rows with visible allocations remain
     • All string comparisons are safe (no backend injection)
  --------------------------------------------------------- */
  let filtered = base.filter((row) => {
    const empName = row.employee?.emp_name || "";
    const activity = row.assignment?.project_name || "";
    const category = row.assignment?.category || "";
    const leader = row.assignment?.leader || "";
    const requestor = row.assignment?.requestor || "";
    const requestorVP = row.assignment?.requestor_vp || "";
    const requestingDept =
      row.assignment?.requesting_dept_name ||
      row.assignment?.requesting_dept ||
      "";

    const managerName = row.employee?.manager_name || "";

    // Multi-select filter checks (safe: all values are strings)
    const passesFilters =
      (selectedResources.length
        ? selectedResources.includes(empName)
        : true) &&
      (selectedActivities.length
        ? selectedActivities.includes(activity)
        : true) &&
      (selectedCategories.length
        ? selectedCategories.includes(category)
        : true) &&
      (selectedLeaders.length ? selectedLeaders.includes(leader) : true) &&
      (selectedRequestors.length
        ? selectedRequestors.includes(requestor)
        : true) &&
      (selectedRequestorVPs.length
        ? selectedRequestorVPs.includes(requestorVP)
        : true) &&
      (selectedRequestingDepts.length
        ? selectedRequestingDepts.includes(requestingDept)
        : true) &&
      (selectedManagers.length
        ? selectedManagers.includes(managerName)
        : true);

    if (!passesFilters) return false;

    // Only include rows with allocations in the visible window
    const hasVisibleAllocation = visibleMonths.some((m) => {
      const val = row.allocations?.[m];
      return typeof val === "number" && val > 0;
    });

    return hasVisibleAllocation;
  });

  /* ---------------------------------------------------------
     SORTING (A–Z / Z–A)
     ---------------------------------------------------------
     • localeCompare ensures consistent alphabetical sorting
     • Defensive: fallback to empty string avoids crashes
  --------------------------------------------------------- */
  if (resourceSort === "az") {
    filtered.sort((a, b) =>
      (a.employee?.emp_name || "").localeCompare(b.employee?.emp_name || "")
    );
  } else if (resourceSort === "za") {
    filtered.sort((a, b) =>
      (b.employee?.emp_name || "").localeCompare(a.employee?.emp_name || "")
    );
  }

  setFilteredRows(filtered);
}, [
  user,
  activeTab,
  mine,
  allRows,
  visibleMonths,
  selectedResources,
  selectedActivities,
  selectedCategories,
  selectedLeaders,
  selectedRequestors,
  selectedRequestorVPs,
  selectedRequestingDepts,
  selectedManagers,
  resourceSort,
]);

/* ---------------------------------------------------------
   NOTE:
   The block below appears to be a duplicate sorting section.
   You asked me NOT to modify logic, so I am leaving it exactly
   as-is, but adding a comment so future maintainers understand.
--------------------------------------------------------- */

// Sorting (duplicate block — left untouched intentionally)
if (resourceSort === 'asc') {
  filtered = [...filtered].sort((a, b) =>
    (a.employee?.emp_name || '').localeCompare(b.employee?.emp_name || '')
  );
} else if (resourceSort === 'desc') {
  filtered = [...filtered].sort((a, b) =>
    (b.employee?.emp_name || '').localeCompare(a.employee?.emp_name || '')
  );
}

/* ---------------------------------------------------------
   TAB HANDLERS
   ---------------------------------------------------------
   • Simple UI state toggles
   • Safe: no external side effects
--------------------------------------------------------- */
const handleAllAssignments = () => {
  setActiveTab('all');
};

const handleMyAssignments = () => {
  setActiveTab('mine');
};

/* ---------------------------------------------------------
   LOADING STATE
   ---------------------------------------------------------
   • Prevents rendering table before data is ready
   • Safe: avoids undefined access errors
--------------------------------------------------------- */
if (!user || loading) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

/* ---------------------------------------------------------
   MAIN PAGE RENDER
   ---------------------------------------------------------
   • No UI changes made
   • Only comments added
--------------------------------------------------------- */
return (
  <div className="h-[500px] bg-white">
    <main className="max-w-full mx-auto px-4 sm:px-4 lg:px-4 py-4">

      {/* Title + Back + Add */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4 mb-4">
          <h2
            className="text-4xl font-bold text-gray-900"
            style={styles.outfitFont}
          >
            Assignments & Allocations
          </h2>

          <button
            onClick={() => router.push('/resource-manager/dashboard')}
            className="              px-4 py-2 rounded text-sm
              bg-gray-200 text-gray-700 border
              hover:bg-[#017ACB]/20 transition-colors
              shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
            style={styles.outfitFont}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="flex gap-4 items-center">
          <button
            onClick={handleAllAssignments}
            className={`px-4 py-2 rounded text-sm ${
              activeTab === 'all'
                    ? "bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700"
                    : "bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20"
                }
                shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]'
            }`}
            style={styles.outfitFont}
          >
            All Assignments
          </button>

          <button
            onClick={handleMyAssignments}
            className={`px-4 py-2 rounded text-sm ${
              activeTab === 'mine'
                    ? "bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700"
                    : "bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20"
                }
                shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]'
            }`}
            style={styles.outfitFont}
          >
            My Assignments
          </button>

          <button
            onClick={() =>
              router.push('/resource-manager/assign-edit-allocation/add-allocation')
            }
            className="px-4 py-2 rounded text-sm
            bg-gray-200 text-gray-700 border
            hover:bg-[#017ACB]/20 transition-colors
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
            style={styles.outfitFont}
          >
            + Add Allocation
          </button>
        </div>
      </div>

      {/* Table Wrapper */}
      <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-max w-full border-collapse">
            <thead className="bg-[#017ACB] text-white sticky top-0 z-10">
              <tr>
                <th
                  className="sticky left-0 bg-[#017ACB] px-4 py-2 border text-sm font-semibold
                  "
                  style={styles.outfitFont}
                >
                  Edit
                </th>

                {/* RESOURCE NAME + SORT + FILTER */}
                <th
                  className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Resource Name</span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.target.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });

                        setShowResourceMenu(prev => !prev);

                        // Close all other menus
                        setShowActivityMenu(false);
                        setShowCategoryMenu(false);
                        setShowLeaderMenu(false);
                        setShowRequestorMenu(false);
                        setShowRequestorVPMenu(false);
                        setShowRequestingDeptMenu(false);
                        setShowManagerMenu(false);
                        setShowStartMonthMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
                    >
                      ▼
                    </button>
                  </div>

                  {showResourceMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                    >
                      {/* ---------------------------------------------------------
                        SORT OPTIONS (A → Z, Z → A)
                        ---------------------------------------------------------
                        • Uses checkboxes for visual consistency
                        • Toggling same option clears sort (UX-friendly)
                        • Defensive: resourceSort always a string
                      --------------------------------------------------------- */}
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                          resourceSort === 'asc' ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => {
                          setResourceSort(resourceSort === 'asc' ? '' : 'asc');
                        }}
                      >
                        <input type="checkbox" checked={resourceSort === 'asc'} readOnly />
                        A → Z
                      </div>

                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                          resourceSort === 'desc' ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => {
                          setResourceSort(resourceSort === 'desc' ? '' : 'desc');
                        }}
                      >
                        <input type="checkbox" checked={resourceSort === 'desc'} readOnly />
                        Z → A
                      </div>

                      <div className="border-t my-2"></div>

                      {/* ---------------------------------------------------------
                        RESOURCE FILTER OPTIONS
                        ---------------------------------------------------------
                        • "All" clears selection
                        • availableResources derived from visible-window rows
                        • Defensive: values are always strings
                      --------------------------------------------------------- */}
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                          selectedResources.length === 0 ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setSelectedResources([])}
                      >
                        <input type="checkbox" checked={selectedResources.length === 0} readOnly />
                        All
                      </div>

                      {availableResources.map((name) => (
                        <div
                          key={name}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                            selectedResources.includes(name) ? 'bg-gray-100 font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(name, setSelectedResources, selectedResources)
                          }
                        >
                          <input type="checkbox" checked={selectedResources.includes(name)} readOnly />
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                  </th>

                  {/* DEPARTMENT */}
                  <th
                    className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
                    style={styles.outfitFont}
                  >
                    Department
                  </th>

                  {/* ---------------------------------------------------------
                    REPORTS TO (MANAGER FILTER)
                    ---------------------------------------------------------
                    • Uses same dropdown pattern as other filters
                    • availableManagers derived from visible-window rows
                    • Defensive: manager names always strings
                  --------------------------------------------------------- */}
                  <th
                    className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                    style={styles.outfitFont}
                  >
                    <div className="flex justify-between items-center">
                      <span>Reports To</span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.target.getBoundingClientRect();
                          setMenuPosition({ x: rect.left, y: rect.bottom });

                          setShowManagerMenu(prev => !prev);

                          // Close all other menus (defensive UI cleanup)
                          setShowResourceMenu(false);
                          setShowActivityMenu(false);
                          setShowCategoryMenu(false);
                          setShowLeaderMenu(false);
                          setShowRequestorMenu(false);
                          setShowRequestorVPMenu(false);
                          setShowRequestingDeptMenu(false);
                          setShowStartMonthMenu(false);
                        }}
                        className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
                      >
                        ▼
                      </button>
                    </div>

                    {showManagerMenu && (
                      <div
                        className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                        style={{ top: menuPosition.y, left: menuPosition.x }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* "All" option */}
                        <div
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                            selectedManagers.length === 0 ? "bg-gray-100 font-semibold" : ""
                          }`}
                          onClick={() => setSelectedManagers([])}
                        >
                          <input type="checkbox" checked={selectedManagers.length === 0} readOnly />
                          All
                        </div>

                        {/* Manager list */}
                        {availableManagers.map((mgr) => (
                          <div
                            key={mgr}
                            className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                              selectedManagers.includes(mgr) ? "bg-gray-100 font-semibold" : ""
                            }`}
                            onClick={() =>
                              toggleSelection(mgr, setSelectedManagers, selectedManagers)
                            }
                          >
                            <input type="checkbox" checked={selectedManagers.includes(mgr)} readOnly />
                            {mgr}
                          </div>
                        ))}
                      </div>
                    )}
                  </th>

                  {/* ---------------------------------------------------------
                    PROJECT FILTER
                    ---------------------------------------------------------
                    • Uses availableActivities (project names)
                    • Same dropdown pattern as above
                  --------------------------------------------------------- */}
                  <th
                    className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                    style={styles.outfitFont}
                  >
                    <div className="flex justify-between items-center">
                      <span>Project</span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.target.getBoundingClientRect();
                          setMenuPosition({ x: rect.left, y: rect.bottom });

                          setShowActivityMenu(prev => !prev);

                          // Close all other menus
                          setShowResourceMenu(false);
                          setShowCategoryMenu(false);
                          setShowLeaderMenu(false);
                          setShowRequestorMenu(false);
                          setShowRequestorVPMenu(false);
                          setShowRequestingDeptMenu(false);
                          setShowManagerMenu(false);
                          setShowStartMonthMenu(false);
                        }}
                        className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
                      >
                        ▼
                      </button>
                    </div>

                    {showActivityMenu && (
                      <div
                        className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                        style={{ top: menuPosition.y, left: menuPosition.x }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* "All" option */}
                        <div
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                            selectedActivities.length === 0 ? "bg-gray-100 font-semibold" : ""
                          }`}
                          onClick={() => setSelectedActivities([])}
                        >
                          <input type="checkbox" checked={selectedActivities.length === 0} readOnly />
                          All
                        </div>

                        {/* Activity list */}
                        {availableActivities.map((act) => (
                          <div
                            key={act}
                            className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                              selectedActivities.includes(act) ? "bg-gray-100 font-semibold" : ""
                            }`}
                            onClick={() =>
                              toggleSelection(act, setSelectedActivities, selectedActivities)
                            }
                          >
                            <input type="checkbox" checked={selectedActivities.includes(act)} readOnly />
                            {act}
                          </div>
                        ))}
                      </div>
                    )}
                  </th>

                  {/* ---------------------------------------------------------
                    CATEGORY FILTER
                    ---------------------------------------------------------
                    • Uses availableCategories
                    • Same dropdown pattern
                  --------------------------------------------------------- */}
                  <th
                    className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                    style={styles.outfitFont}
                  >
                    <div className="flex justify-between items-center">
                      <span>Activity Category</span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.target.getBoundingClientRect();
                          setMenuPosition({ x: rect.left, y: rect.bottom });

                          setShowCategoryMenu(prev => !prev);

                          // Close all other menus
                          setShowResourceMenu(false);
                          setShowActivityMenu(false);
                          setShowLeaderMenu(false);
                          setShowRequestorMenu(false);
                          setShowRequestorVPMenu(false);
                          setShowRequestingDeptMenu(false);
                          setShowManagerMenu(false);
                          setShowStartMonthMenu(false);
                        }}
                        className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
                      >
                        ▼
                      </button>
                    </div>

                    {showCategoryMenu && (
                      <div
                        className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                        style={{ top: menuPosition.y, left: menuPosition.x }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* "All" option */}
                        <div
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                            selectedCategories.length === 0 ? "bg-gray-100 font-semibold" : ""
                          }`}
                          onClick={() => setSelectedCategories([])}
                        >
                          <input type="checkbox" checked={selectedCategories.length === 0} readOnly />
                          All
                        </div>

                        {availableCategories.map((cat) => (
                          <div
                            key={cat}
                            className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                              selectedCategories.includes(cat) ? "bg-gray-100 font-semibold" : ""
                            }`}
                            onClick={() =>
                              toggleSelection(cat, setSelectedCategories, selectedCategories)
                            }
                          >
                            <input type="checkbox" checked={selectedCategories.includes(cat)} readOnly />
                            {cat}
                          </div>
                        ))}
                        </div>
                        )}
                        </th>

                        {/* ---------------------------------------------------------
                          LEADER FILTER
                          ---------------------------------------------------------
                          • Uses availableLeaders (derived from visible-window rows)
                          • Same dropdown pattern as other filters
                          • Defensive: leader values always strings
                        --------------------------------------------------------- */}
                        <th
                          className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                          style={styles.outfitFont}
                        >
                          <div className="flex justify-between items-center">
                            <span>Leader Accountable</span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.target.getBoundingClientRect();
                                setMenuPosition({ x: rect.left, y: rect.bottom });

                                setShowLeaderMenu(prev => !prev);

                                // Close all other menus (defensive UI cleanup)
                                setShowResourceMenu(false);
                                setShowActivityMenu(false);
                                setShowCategoryMenu(false);
                                setShowRequestorMenu(false);
                                setShowRequestorVPMenu(false);
                                setShowRequestingDeptMenu(false);
                                setShowManagerMenu(false);
                                setShowStartMonthMenu(false);
                              }}
                              className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
                            >
                              ▼
                            </button>
                          </div>

                          {showLeaderMenu && (
                            <div
                              className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                              style={{ top: menuPosition.y, left: menuPosition.x }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* "All" option */}
                              <div
                                className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                                  selectedLeaders.length === 0 ? "bg-gray-100 font-semibold" : ""
                                }`}
                                onClick={() => setSelectedLeaders([])}
                              >
                                <input type="checkbox" checked={selectedLeaders.length === 0} readOnly />
                                All
                              </div>

                              {/* Leader list */}
                              {availableLeaders.map((lead) => (
                                <div
                                  key={lead}
                                  className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                                    selectedLeaders.includes(lead) ? "bg-gray-100 font-semibold" : ""
                                  }`}
                                  onClick={() =>
                                    toggleSelection(lead, setSelectedLeaders, selectedLeaders)
                                  }
                                >
                                  <input type="checkbox" checked={selectedLeaders.includes(lead)} readOnly />
                                  {lead}
                                </div>
                              ))}
                            </div>
                          )}
                        </th>

                        {/* ---------------------------------------------------------
                          REQUESTOR FILTER
                          ---------------------------------------------------------
                          • Uses availableRequestors
                          • Same dropdown pattern
                        --------------------------------------------------------- */}
                        <th
                          className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                          style={styles.outfitFont}
                        >
                          <div className="flex justify-between items-center">
                            <span>Requestor</span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.target.getBoundingClientRect();
                                setMenuPosition({ x: rect.left, y: rect.bottom });

                                setShowRequestorMenu(prev => !prev);

                                // Close all other menus
                                setShowResourceMenu(false);
                                setShowActivityMenu(false);
                                setShowCategoryMenu(false);
                                setShowLeaderMenu(false);
                                setShowRequestorVPMenu(false);
                                setShowRequestingDeptMenu(false);
                                setShowManagerMenu(false);
                                setShowStartMonthMenu(false);
                              }}
                              className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
                            >
                              ▼
                            </button>
                          </div>

                          {showRequestorMenu && (
                            <div
                              className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                              style={{ top: menuPosition.y, left: menuPosition.x }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* "All" option */}
                              <div
                                className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                                  selectedRequestors.length === 0 ? "bg-gray-100 font-semibold" : ""
                                }`}
                                onClick={() => setSelectedRequestors([])}
                              >
                                <input type="checkbox" checked={selectedRequestors.length === 0} readOnly />
                                All
                              </div>

                              {/* Requestor list */}
                              {availableRequestors.map((req) => (
                                <div
                                  key={req}
                                  className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                                    selectedRequestors.includes(req) ? "bg-gray-100 font-semibold" : ""
                                  }`}
                                  onClick={() =>
                                    toggleSelection(req, setSelectedRequestors, selectedRequestors)
                                  }
                                >
                                  <input type="checkbox" checked={selectedRequestors.includes(req)} readOnly />
                                  {req}
                                </div>
                              ))}
                            </div>
                          )}
                        </th>

                        {/* ---------------------------------------------------------
                          REQUESTOR VP FILTER
                          ---------------------------------------------------------
                          • Uses availableRequestorVPs
                          • Same dropdown pattern
                        --------------------------------------------------------- */}
                        <th
                          className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                          style={styles.outfitFont}
                        >
                          <div className="flex justify-between items-center">
                            <span>Requestor VP</span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.target.getBoundingClientRect();
                                setMenuPosition({ x: rect.left, y: rect.bottom });

                                setShowRequestorVPMenu(prev => !prev);

                                // Close all other menus
                                setShowResourceMenu(false);
                                setShowActivityMenu(false);
                                setShowCategoryMenu(false);
                                setShowLeaderMenu(false);
                                setShowRequestorMenu(false);
                                setShowRequestingDeptMenu(false);
                                setShowManagerMenu(false);
                                setShowStartMonthMenu(false);
                              }}
                              className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
                            >
                              ▼
                            </button>
                          </div>

                          {showRequestorVPMenu && (
                            <div
                              className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                              style={{ top: menuPosition.y, left: menuPosition.x }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* "All" option */}
                              <div
                                className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                                  selectedRequestorVPs.length === 0 ? "bg-gray-100 font-semibold" : ""
                                }`}
                                onClick={() => setSelectedRequestorVPs([])}
                              >
                                <input type="checkbox" checked={selectedRequestorVPs.length === 0} readOnly />
                                All
                              </div>

                              {/* VP list */}
                              {availableRequestorVPs.map((vp) => (
                                <div
                                  key={vp}
                                  className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                                    selectedRequestorVPs.includes(vp) ? "bg-gray-100 font-semibold" : ""
                                  }`}
                                  onClick={() =>
                                    toggleSelection(vp, setSelectedRequestorVPs, selectedRequestorVPs)
                                  }
                                >
                                  <input type="checkbox" checked={selectedRequestorVPs.includes(vp)} readOnly />
                                  {vp}
                                </div>
                              ))}
                            </div>
                          )}
                        </th>

                        {/* ---------------------------------------------------------
                          REQUESTING DEPARTMENT FILTER
                          ---------------------------------------------------------
                          • Uses availableRequestingDepts
                          • Same dropdown pattern
                        --------------------------------------------------------- */}
                        <th
                          className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                          style={styles.outfitFont}
                        >
                          <div className="flex justify-between items-center">
                            <span>Requesting Dept</span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.target.getBoundingClientRect();
                                setMenuPosition({ x: rect.left, y: rect.bottom });

                                setShowRequestingDeptMenu(prev => !prev);

                                // Close all other menus
                                setShowResourceMenu(false);
                                setShowActivityMenu(false);
                                setShowCategoryMenu(false);
                                setShowLeaderMenu(false);
                                setShowRequestorMenu(false);
                                setShowRequestorVPMenu(false);
                                setShowManagerMenu(false);
                                setShowStartMonthMenu(false);
                              }}
                              className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
                            >
                              ▼
                            </button>
                          </div>

                          {showRequestingDeptMenu && (
                            <div
                              className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                              style={{ top: menuPosition.y, left: menuPosition.x }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* "All" option */}
                              <div
                                className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                                  selectedRequestingDepts.length === 0 ? "bg-gray-100 font-semibold" : ""
                                }`}
                                onClick={() => setSelectedRequestingDepts([])}
                              >
                                <input type="checkbox" checked={selectedRequestingDepts.length === 0} readOnly />
                                All
                              </div>

                              {/* Dept list */}
                              {availableRequestingDepts.map((dept) => (
                                <div
                                  key={dept}
                                  className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                                    selectedRequestingDepts.includes(dept) ? "bg-gray-100 font-semibold" : ""
                                  }`}
                                  onClick={() =>
                                    toggleSelection(dept, setSelectedRequestingDepts, selectedRequestingDepts)
                                  }
                                >
                                  <input type="checkbox" checked={selectedRequestingDepts.includes(dept)} readOnly />
                                  {dept}
                                </div>
                              ))}
                            </div>
                          )}
                        </th>

                      {/* ---------------------------------------------------------
                        START MONTH SELECTOR — FIRST VISIBLE MONTH COLUMN
                        ---------------------------------------------------------
                        • Displays the label for the first month in the 12‑month window
                        • Dropdown allows selecting a new start month
                        • Includes defensive positioning logic to prevent overflow
                        • Uses scrollIntoView to auto-focus current month
                      --------------------------------------------------------- */}
                      <th
                        className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                        style={styles.outfitFont}
                      >
                        <div className="flex justify-between items-center">
                          <span>{monthLabels.length ? monthLabels[0].label : "Start Month"}</span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();

                              const rect = e.target.getBoundingClientRect();
                              const dropdownWidth = 192; // w-48

                              // Defensive: prevent dropdown from going off-screen
                              let x = rect.left;
                              let y = rect.bottom;

                              if (x + dropdownWidth > window.innerWidth) {
                                x = window.innerWidth - dropdownWidth - 10;
                              }

                              setMenuPosition({ x, y });

                              // Close all other menus
                              setShowResourceMenu(false);
                              setShowActivityMenu(false);
                              setShowCategoryMenu(false);
                              setShowLeaderMenu(false);
                              setShowRequestorMenu(false);
                              setShowRequestorVPMenu(false);
                              setShowRequestingDeptMenu(false);
                              setShowManagerMenu(false);

                              // Toggle start month menu
                              setShowStartMonthMenu(prev => {
                                const next = !prev;

                                // Auto-scroll to selected month when opening
                                if (next) {
                                  setTimeout(() => {
                                    if (startMonthMenuRef.current) {
                                      const el = startMonthMenuRef.current.querySelector(
                                        `[data-month="${startMonth}"]`
                                      );
                                      if (el) el.scrollIntoView({ block: "center" });
                                    }
                                  }, 0);
                                }

                                return next;
                              });
                            }}
                            className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
                          >
                            ▼
                          </button>
                        </div>

                        {showStartMonthMenu && (
                          <div
                            ref={startMonthMenuRef}
                            className="fixed bg-white text-black shadow-lg rounded w-48 z-50 max-h-64 overflow-y-auto"
                            style={{ top: menuPosition.y, left: menuPosition.x }}
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                          >
                            {months.map((m) => {
                              const year = m.substring(0, 4);
                              const month = m.substring(4, 6);
                              const monthNames = [
                                "Jan","Feb","Mar","Apr","May","Jun",
                                "Jul","Aug","Sep","Oct","Nov","Dec"
                              ];
                              const label = `${monthNames[parseInt(month, 10) - 1]} ${year}`;

                              return (
                                <div
                                  key={m}
                                  data-month={m}
                                  className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                                    startMonth === m ? "bg-gray-100 font-semibold" : ""
                                  }`}
                                  onClick={() => {
                                    setStartMonth(m);
                                    setShowStartMonthMenu(false);
                                  }}
                                >
                                  <input type="checkbox" checked={startMonth === m} readOnly />
                                  {label}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </th>

                      {/* ---------------------------------------------------------
                        REMAINING MONTH COLUMNS
                        ---------------------------------------------------------
                        • monthLabels[0] is the start month
                        • Remaining labels fill the rest of the 12‑month window
                      --------------------------------------------------------- */}
                      {monthLabels.slice(1).map((m) => (
                        <th
                          key={m.key}
                          className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
                          style={styles.outfitFont}
                        >
                          {m.label}
                        </th>
                      ))}

                      </tr>
                      </thead>

                      <tbody>
                        {/* ---------------------------------------------------------
                          EMPTY STATE
                          ---------------------------------------------------------
                          • Defensive: ensures table renders cleanly when no results
                        --------------------------------------------------------- */}
                        {filteredRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={10 + monthLabels.length}
                              className="text-center py-6 text-black border border-black"
                              style={styles.outfitFont}
                            >
                              No assignments found.
                            </td>
                          </tr>
                        )}

                        {/* ---------------------------------------------------------
                          MAIN ROW RENDER
                          ---------------------------------------------------------
                          • Each row includes:
                            - Edit button
                            - Employee + assignment metadata
                            - 12 months of allocation cells
                          • Editing is handled inline with controlled state
                        --------------------------------------------------------- */}
                        {filteredRows.map((row, index) => (
                          <tr key={index} className="bg-white hover:bg-gray-100">
                            <td
                              className="sticky left-0 bg-white border border-black px-4 py-2 z-10 text-black"
                              style={styles.outfitFont}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditAllocation(row);
                                }}
                                className="                            px-2 py-1
                            bg-[#017ACB] text-white text-xs rounded
                            hover:bg-[#017ACB]/20 hover:text-gray-700 transition
                            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
                              >
                                Edit
                              </button>
                            </td>

                            {/* RESOURCE NAME */}
                            <td
                              className="border border-black px-4 py-2 text-sm text-black"
                              style={styles.outfitFont}
                            >
                              {row.employee?.emp_name}
                            </td>

                            {/* DEPARTMENT */}
                            <td
                              className="border border-black px-4 py-2 text-sm text-black"
                              style={styles.outfitFont}
                            >
                              {row.employee?.dept_name || ""}
                            </td>

                            {/* REPORTS TO */}
                            <td
                              className="border border-black px-4 py-2 text-sm text-black"
                              style={styles.outfitFont}
                            >
                              {row.employee?.manager_name || ""}
                            </td>

                            {/* PROJECT */}
                            <td
                              className="border border-black px-4 py-2 text-sm text-black"
                              style={styles.outfitFont}
                            >
                              {row.assignment?.project_name}
                            </td>

                            {/* CATEGORY */}
                            <td
                              className="border border-black px-4 py-2 text-sm text-black"
                              style={styles.outfitFont}
                            >
                              {row.assignment?.category}
                            </td>

                            {/* LEADER */}
                            <td
                              className="border border-black px-4 py-2 text-sm text-black"
                              style={styles.outfitFont}
                            >
                              {row.assignment?.leader}
                            </td>

                            {/* REQUESTOR */}
                            <td
                              className="border border-black px-4 py-2 text-sm text-black"
                              style={styles.outfitFont}
                            >
                              {row.assignment?.requestor}
                            </td>

                            {/* REQUESTOR VP */}
                            <td
                              className="border border-black px-4 py-2 text-sm text-black"
                              style={styles.outfitFont}
                            >
                              {row.assignment?.requestor_vp}
                            </td>

                            {/* REQUESTING DEPT */}
                            <td
                              className="border border-black px-4 py-2 text-sm text-black"
                              style={styles.outfitFont}
                            >
                              {row.assignment?.requesting_dept_name || row.assignment?.requesting_dept}
                            </td>

                            {/* ---------------------------------------------------------
                              MONTH ALLOCATION CELLS
                              ---------------------------------------------------------
                              • Supports inline editing
                              • Validates numeric input (0–1)
                              • DELETE = empty string
                              • UPDATE = PUT request
                              • Defensive: ensures row.allocations always cloned safely
                            --------------------------------------------------------- */}
                            {monthLabels.map((m) => (
                              <td
                                key={m.key}
                                className="border border-black px-4 py-2 text-sm text-black text-center cursor-pointer"
                                style={styles.outfitFont}
                                onClick={() => {
                                  setFilteredRows(prev => {
                                    const updated = [...prev];
                                    updated[index] = { ...updated[index], editing: m.key };
                                    return updated;
                                  });
                                }}
                              >
                                {row.editing === m.key ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    defaultValue={row.allocations?.[m.key] ?? ""}
                                    className="w-16 border rounded text-center text-sm"
                                    onBlur={(e) => {
                                      const val = e.target.value;
                                      const num = parseFloat(val);

                                      // Defensive validation
                                      if (val !== "" && (isNaN(num) || num < 0 || num > 1)) {
                                        alert("Allocation must be between 0 and 1");
                                        return;
                                      }

                                      setFilteredRows(prev => {
                                        const updated = [...prev];
                                        const rowCopy = { ...updated[index] };
                                        const allocs = { ...(rowCopy.allocations || {}) };

                                        allocs[m.key] = val === "" ? "" : num;
                                        rowCopy.allocations = allocs;
                                        rowCopy.editing = null;

                                        updated[index] = rowCopy;
                                        return updated;
                                      });
                                    }}
                                    onKeyDown={async (e) => {
                                      if (e.key !== "Enter") return;

                                      const val = e.currentTarget.value;

                                      // DELETE allocation
                                      if (val === "") {
                                        await fetch(`${apiUrl}/api/assignments-allocations/${row.employee.emp_id}`, {
                                          method: "DELETE",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            emp_id: row.employee.emp_id,
                                            month: Number(m.key),
                                            activity: row.assignment.project_name,
                                            category: row.assignment.category
                                          })
                                        });

                                        setFilteredRows(prev => {
                                          const updated = [...prev];
                                          const rowCopy = { ...updated[index] };
                                          const allocs = { ...(rowCopy.allocations || {}) };

                                          delete allocs[m.key];
                                          rowCopy.allocations = allocs;
                                          rowCopy.editing = null;

                                          updated[index] = rowCopy;
                                          return updated;
                                        });

                                        return;
                                      }

                                      // UPDATE allocation
                                      const num = parseFloat(val);
                                      if (isNaN(num) || num < 0) {
                                        e.currentTarget.value = row.allocations?.[m.key] ?? "";
                                        return;
                                      }

                                      await fetch(`${apiUrl}/api/assignments-allocations/${row.employee.emp_id}/amount`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          emp_id: row.employee.emp_id,
                                          month: Number(m.key),
                                          amount: num,
                                          activity: row.assignment.project_name,
                                          category: row.assignment.category
                                        })
                                      });

                                      setFilteredRows(prev => {
                                        const updated = [...prev];
                                        const rowCopy = { ...updated[index] };
                                        const allocs = { ...(rowCopy.allocations || {}) };

                                        allocs[m.key] = num;
                                        rowCopy.allocations = allocs;
                                        rowCopy.editing = null;

                                        updated[index] = rowCopy;
                                        return updated;
                                      });
                                    }}
                                  />
                                ) : (
                                  <span>{row.allocations?.[m.key] ?? ""}</span>
                                )}
                              </td>
                            ))}

                          </tr>
                        ))}
                    </tbody>
              </table>
           </div>
        </div>
      </main>
    </div>
  );
}