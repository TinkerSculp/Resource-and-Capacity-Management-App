'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Reusable checkbox
const Checkbox = ({ checked }) => (
  <span
    className="
      w-4 h-4
      border border-black rounded-sm
      flex items-center justify-center
      transition relative overflow-hidden
      flex-shrink-0
    "
  >
    <input
      type="checkbox"
      checked={checked}
      readOnly
      className="opacity-0 absolute w-4 h-4 cursor-pointer"
    />

    {checked && (
      <>
        <span className="absolute inset-0" style={{ backgroundColor: '#003A5C' }}></span>
        <svg
          className="absolute w-3 h-3 text-white"
          viewBox="0 0 20 20"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 11 8 15 16 6" />
        </svg>
      </>
    )}
  </span>
);

/* ---------------------------------------------------------
   STYLES
--------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: "Outfit, sans-serif" }
};

export default function AssignmentsAllocationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refresh = searchParams.get("refresh");

  const apiUrl = "http://localhost:3001";

  /* ---------------------------------------------------------
     BASIC STATE
  --------------------------------------------------------- */
  const [user, setUser] = useState(null);
  const [highlightedEmpId, setHighlightedEmpId] = useState(null);
  const toggleHighlight = (empId) => {
    setHighlightedEmpId(prev => (prev === empId ? null : empId));
  };

  const startMonthMenuRef = useRef(null);

  const [allRows, setAllRows] = useState([]);
  const [mine, setMine] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [months, setMonths] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);

  /* ---------------------------------------------------------
     FILTER STATES
  --------------------------------------------------------- */
  const [selectedResources, setSelectedResources] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedLeaders, setSelectedLeaders] = useState([]);
  const [selectedRequestors, setSelectedRequestors] = useState([]);
  const [selectedRequestorVPs, setSelectedRequestorVPs] = useState([]);
  const [selectedRequestingDepts, setSelectedRequestingDepts] = useState([]);
  const [selectedManagers, setSelectedManagers] = useState([]);

  /* ---------------------------------------------------------
     SORT + MENU VISIBILITY
  --------------------------------------------------------- */
  const [resourceSort, setResourceSort] = useState(""); // ⭐ ONLY SORT WE KEEP

  const [showResourceMenu, setShowResourceMenu] = useState(false);
  const [showActivityMenu, setShowActivityMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showLeaderMenu, setShowLeaderMenu] = useState(false);
  const [showRequestorMenu, setShowRequestorMenu] = useState(false);
  const [showRequestorVPMenu, setShowRequestorVPMenu] = useState(false);
  const [showRequestingDeptMenu, setShowRequestingDeptMenu] = useState(false);
  const [showManagerMenu, setShowManagerMenu] = useState(false);
  const [showStartMonthMenu, setShowStartMonthMenu] = useState(false);

  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  /* ---------------------------------------------------------
     AVAILABLE FILTER OPTIONS
  --------------------------------------------------------- */
  const [availableResources, setAvailableResources] = useState([]);
  const [availableActivities, setAvailableActivities] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableLeaders, setAvailableLeaders] = useState([]);
  const [availableRequestors, setAvailableRequestors] = useState([]);
  const [availableRequestorVPs, setAvailableRequestorVPs] = useState([]);
  const [availableRequestingDepts, setAvailableRequestingDepts] = useState([]);
  const [availableManagers, setAvailableManagers] = useState([]);

  /* ---------------------------------------------------------
     START MONTH
  --------------------------------------------------------- */
  const [startMonth, setStartMonth] = useState(null);

  /* ---------------------------------------------------------
     TOGGLE SELECTION
  --------------------------------------------------------- */
  const toggleSelection = (value, setFn, current) => {
    setFn(
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  };

  /* ---------------------------------------------------------
     KEY HANDLER
  --------------------------------------------------------- */
  const handleAllocationKey = (e, index) => {
    if (e.key === "Enter") e.target.blur();

    if (e.key === "Escape") {
      setFilteredRows(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], editing: null };
        return updated;
      });
    }
  };

  /* ---------------------------------------------------------
     BLUR HANDLER — SAVE TO DB
  --------------------------------------------------------- */
  const handleAllocationBlur = async (e, row, m, index) => {
    const newValue = e.target.value === "" ? null : parseFloat(e.target.value);

    // Update UI immediately
    setFilteredRows(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        allocations: {
          ...updated[index].allocations,
          [m.key]: newValue
        },
        editing: null
      };
      return updated;
    });

    try {
      if (newValue === null) {
        await fetch(`${apiUrl}/api/assignments-allocations/delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emp_id: row.employee.emp_id,
            month: m.key,
            activity: row.assignment.project_name,
            category: row.assignment.category
          })
        });
      } else {
        await fetch(`${apiUrl}/api/assignments-allocations/${row.employee.emp_id}/amount`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emp_id: row.employee.emp_id,
            month: m.key,
            amount: newValue,
            activity: row.assignment.project_name,
            category: row.assignment.category
          })
        });
      }
    } catch (err) {
      console.error("Failed to update allocation:", err);
    }
  };

  /* ---------------------------------------------------------
     LOAD USER
  --------------------------------------------------------- */
  useEffect(() => {
    const userData =
      typeof window !== "undefined" ? localStorage.getItem("user") : null;

    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        setUser(null);
      }
    }
  }, []);

  /* ---------------------------------------------------------
     LOAD ASSIGNMENTS
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
              Expires: "0"
            }
          }
        );

        const data = await res.json().catch(() => ({}));

        setAllRows(data.allAssignments || []);
        setMine(data.myAssignments || []);
        setMonths(data.months || []);
        setFilteredRows(data.allAssignments || []);
      } catch {
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
     VISIBLE MONTHS
  --------------------------------------------------------- */
  const visibleMonths = useMemo(() => {
    if (!months.length) return [];
    const start =
      startMonth && months.includes(startMonth) ? startMonth : months[0];
    const idx = months.indexOf(start);
    return months.slice(idx, idx + 16);
  }, [months, startMonth]);

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
     VISIBLE ALLOCATION FILTER
  --------------------------------------------------------- */
  const rowsWithVisibleAllocations = useMemo(() => {
    let rows = allRows.filter((row) =>
      visibleMonths.some((m) => {
        const val = row.allocations?.[m];
        return val !== null && val !== undefined && val !== "";
      })
    );

    // ⭐ RESOURCE SORTING (copied from working Project version)
    if (resourceSort === "asc") {
      rows = [...rows].sort((a, b) =>
        a.employee.emp_name.localeCompare(b.employee.emp_name)
      );
    }

    if (resourceSort === "desc") {
      rows = [...rows].sort((a, b) =>
        b.employee.emp_name.localeCompare(a.employee.emp_name)
      );
    }

    return rows;
  }, [allRows, visibleMonths, resourceSort]);

  /* ---------------------------------------------------------
     BUILD DROPDOWN OPTION LISTS
  --------------------------------------------------------- */
  useEffect(() => {
    const uniq = (arr) => [...new Set(arr)].filter(Boolean);

    let res = uniq(rowsWithVisibleAllocations.map((r) => r.employee?.emp_name || ""));

    // ⭐ Sort dropdown list too (same as Project version)
    if (resourceSort === "asc") res.sort((a, b) => a.localeCompare(b));
    if (resourceSort === "desc") res.sort((a, b) => b.localeCompare(a));

    setAvailableResources(res);

    setAvailableActivities(
      uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.project_name || ""))
    );

    setAvailableProjects(
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
  }, [rowsWithVisibleAllocations, resourceSort]);

  /* ---------------------------------------------------------
     CLOSE ALL MENUS ON OUTSIDE CLICK
  --------------------------------------------------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest(".dropdown-menu")) return;

      setShowResourceMenu(false);
      setShowActivityMenu(false);
      setShowProjectMenu(false);
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

  /* ---------------------------------------------------------
     MAIN FILTERING LOGIC
  --------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    let base = activeTab === "mine" ? mine : allRows;

    let filtered = base.filter((row) => {
      const empName = row.employee?.emp_name || "";
      const project = row.assignment?.project_name || "";
      const category = row.assignment?.category || "";
      const leader = row.assignment?.leader || "";
      const requestor = row.assignment?.requestor || "";
      const requestorVP = row.assignment?.requestor_vp || "";
      const requestingDept =
        row.assignment?.requesting_dept_name ||
        row.assignment?.requesting_dept ||
        "";
      const managerName = row.employee?.manager_name || "";

      const passesFilters =
        (selectedResources.length ? selectedResources.includes(empName) : true) &&
        (selectedProjects.length ? selectedProjects.includes(project) : true) &&
        (selectedCategories.length ? selectedCategories.includes(category) : true) &&
        (selectedLeaders.length ? selectedLeaders.includes(leader) : true) &&
        (selectedRequestors.length ? selectedRequestors.includes(requestor) : true) &&
        (selectedRequestorVPs.length ? selectedRequestorVPs.includes(requestorVP) : true) &&
        (selectedRequestingDepts.length ? selectedRequestingDepts.includes(requestingDept) : true) &&
        (selectedManagers.length ? selectedManagers.includes(managerName) : true);

      if (!passesFilters) return false;

      const hasVisibleAllocation = visibleMonths.some((m) => {
        const val = row.allocations?.[m];
        return val !== null && val !== undefined && val !== "";
      });

      return hasVisibleAllocation;
    });

    // ⭐ RESOURCE SORTING (copied from working Project version)
    if (resourceSort === "asc") {
      filtered.sort((a, b) =>
        a.employee.emp_name.localeCompare(b.employee.emp_name)
      );
    }

    if (resourceSort === "desc") {
      filtered.sort((a, b) =>
        b.employee.emp_name.localeCompare(a.employee.emp_name)
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
    selectedProjects,
    selectedCategories,
    selectedLeaders,
    selectedRequestors,
    selectedRequestorVPs,
    selectedRequestingDepts,
    selectedManagers,
    resourceSort, // ⭐ IMPORTANT
  ]);

  /* ---------------------------------------------------------
     TAB SWITCH HANDLERS
  --------------------------------------------------------- */
  const handleAllAssignments = () => setActiveTab("all");
  const handleMyAssignments = () => setActiveTab("mine");

  /* ---------------------------------------------------------
     EDIT + ADD ALLOCATION HANDLERS
  --------------------------------------------------------- */
  const handleEditAllocation = (row) => {
    const emp = row.employee?.emp_id;
    const project = row.assignment?.project_name;
    const category = row.assignment?.category;

    router.push(
      `/resource-manager/assign-edit-allocation/edit-allocation?emp_id=${emp}&project=${encodeURIComponent(project)}&category=${encodeURIComponent(category)}`
    );
  };








  if (!user || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  /* ---------------------------------------------------------
     MAIN PAGE RENDER
  --------------------------------------------------------- */
  return (
    <div className="h-[500px] bg-white">
      <main className="max-w-full mx-auto px-4 sm:px-4 lg:px-4 py-4">

        {/* HEADER */}
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
              className="
            px-4 py-2 rounded text-sm
            bg-gray-200 text-gray-700 border
            hover:bg-[#017ACB]/20 transition-colors
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              "
              style={styles.outfitFont}
            >
              Back to Dashboard
            </button>
          </div>

          <div className="flex gap-4 items-center">

            <button
              onClick={handleAllAssignments}
              className={`
                px-4 py-2 rounded text-sm
                ${
                  activeTab === 'all'
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                : 'bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20'
            }
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              `}
              style={styles.outfitFont}
            >
              All Assignments
            </button>

            <button
              onClick={handleMyAssignments}
              className={`
                px-4 py-2 rounded text-sm
                ${
                  activeTab === 'mine'
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                : 'bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20'
            }
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              `}
              style={styles.outfitFont}
            >
              My Assignments
            </button>

            <button
              onClick={() =>
                router.push('/resource-manager/assign-edit-allocation/add-allocation')
              }
              className="
            px-4 py-2 rounded text-sm
            bg-gray-200 text-gray-700 border
            hover:bg-[#017ACB]/20 transition-colors
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              "
              style={styles.outfitFont}
            >
              + Add Allocation
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
            <table className="min-w-max w-full border-collapse">

{/* HEADER */}
<thead className="bg-[#017ACB] text-white">
  <tr className="sticky top-0 z-[100] bg-[#017ACB]">

    {/* EDIT */}
<th
  className="
                         sticky left-0 top-0
                                z-[9999]
                                bg-[#017ACB] bg-opacity-100
                                px-4 py-2
                                text-sm font-semibold
                                whitespace-nowrap
                                align-middle
                                [background-clip:padding-box]
              "
  style={styles.outfitFont}
>
  Edit
</th>

 {/* RESOURCE NAME */}
<th
  className="
    px-4 py-2 border text-sm font-semibold
    whitespace-nowrap relative
    bg-[#017ACB]
  "
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

        setShowActivityMenu(false);
        setShowCategoryMenu(false);
        setShowLeaderMenu(false);
        setShowRequestorMenu(false);
        setShowRequestorVPMenu(false);
        setShowRequestingDeptMenu(false);
        setShowManagerMenu(false);
        setShowStartMonthMenu(false);
      }}
      className="
ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      ▼
    </button>
  </div>

  {showResourceMenu && (
    <div
      className="
        dropdown-menu
        fixed bg-white text-black shadow-lg rounded
        max-w-70 max-h-120 overflow-y-auto
        z-[30000] border border-gray-300 pointer-events-auto
      "
      style={{
        top: menuPosition.y,
        left: menuPosition.x
      }}
      onClick={(e) => e.stopPropagation()}
    >

      {/* SORT OPTIONS */}
      <div
        className={`
          px-3 py-2 cursor-pointer text-sm flex items-center gap-2
          hover:bg-[#017ACB]/20
          ${resourceSort === 'asc' ? 'font-semibold' : ''}
        `}
        onClick={() =>
          setResourceSort(resourceSort === 'asc' ? '' : 'asc')
        }
      >
        <Checkbox checked={resourceSort === 'asc'} />
        A → Z
      </div>

      <div
        className={`
          px-3 py-2 cursor-pointer text-sm flex items-center gap-2
          hover:bg-[#017ACB]/20
          ${resourceSort === 'desc' ? 'font-semibold' : ''}
        `}
        onClick={() =>
          setResourceSort(resourceSort === 'desc' ? '' : 'desc')
        }
      >
        <Checkbox checked={resourceSort === 'desc'} />
        Z → A
      </div>

      <div className="border-t my-2" />

      {/* FILTER OPTIONS */}
      <div
        className={`
          px-3 py-2 cursor-pointer text-sm flex items-center gap-2
          hover:bg-[#017ACB]/20
          ${selectedResources.length === 0 ? 'font-semibold' : ''}
        `}
        onClick={() => setSelectedResources([])}
      >
        <Checkbox checked={selectedResources.length === 0} />
        All
      </div>

      {availableResources.map((name) => (
        <div
          key={name}
          className={`
            px-3 py-2 cursor-pointer text-sm flex items-center gap-2
            hover:bg-[#017ACB]/20
            ${selectedResources.includes(name) ? 'font-semibold' : ''}
          `}
          onClick={() =>
            toggleSelection(name, setSelectedResources, selectedResources)
          }
        >
          <Checkbox checked={selectedResources.includes(name)} />
          {name}
        </div>
      ))}
    </div>
  )}
</th>

    {/* DEPARTMENT */}
    <th
      className="
        px-4 py-2 border text-sm font-semibold whitespace-nowrap
        bg-[#017ACB] z-[1500]
      "
      style={styles.outfitFont}
    >
      Department
    </th>

{/* REPORTS TO */}
<th
  className="
    px-4 py-2 border text-sm font-semibold whitespace-nowrap
    bg-[#017ACB] relative
  "
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

        setShowResourceMenu(false);
        setShowActivityMenu(false);
        setShowCategoryMenu(false);
        setShowLeaderMenu(false);
        setShowRequestorMenu(false);
        setShowRequestorVPMenu(false);
        setShowRequestingDeptMenu(false);
        setShowStartMonthMenu(false);
      }}
      className="
ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      ▼
    </button>
  </div>

  {showManagerMenu && (
    <div
      className="
        fixed bg-white text-black shadow-lg rounded
        max-w-70 max-h-120 overflow-y-auto
        z-[30000] border border-gray-300 pointer-events-auto
      "
      style={{
        top: menuPosition.y,
        left: menuPosition.x
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* FILTER OPTIONS */}
      <div
        className={`
          px-3 py-2 cursor-pointer text-sm flex items-center gap-2
          hover:bg-[#017ACB]/20
          ${selectedManagers.length === 0 ? "font-semibold" : ""}
        `}
        onClick={() => setSelectedManagers([])}
      >
        <Checkbox checked={selectedManagers.length === 0} />
        All
      </div>

      {availableManagers.map((mgr) => (
        <div
          key={mgr}
          className={`
            px-3 py-2 cursor-pointer text-sm flex items-center gap-2
            hover:bg-[#017ACB]/20
            ${selectedManagers.includes(mgr) ? "font-semibold" : ""}
          `}
          onClick={() =>
            toggleSelection(mgr, setSelectedManagers, selectedManagers)
          }
        >
          <Checkbox checked={selectedManagers.includes(mgr)} />
          {mgr}
        </div>
      ))}
    </div>
  )}
</th>

{/* PROJECT FILTER */}
<th
  className="
    px-4 py-2 border text-sm font-semibold whitespace-nowrap
    bg-[#017ACB] relative
  "
  style={styles.outfitFont}
>
  <div className="flex justify-between items-center">
    <span>Project</span>

    <button
      onClick={(e) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();
        setMenuPosition({ x: rect.left, y: rect.bottom });

        setShowActivityMenu(false);
        setShowCategoryMenu(false);
        setShowLeaderMenu(false);
        setShowRequestorMenu(false);
        setShowRequestorVPMenu(false);
        setShowRequestingDeptMenu(false);
        setShowManagerMenu(false);
        setShowStartMonthMenu(false);
        setShowResourceMenu(false);

        setShowProjectMenu(prev => !prev);
      }}
      className="
ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      ▼
    </button>
  </div>

  {showProjectMenu && (
    <div
      className="
        dropdown-menu
        fixed bg-white text-black shadow-lg rounded
        max-w-120 max-h-120 overflow-y-auto
        z-[30000] border border-gray-300 pointer-events-auto
      "
      style={{
        top: menuPosition.y,
        left: menuPosition.x
      }}
      onClick={(e) => e.stopPropagation()}
    >

      {/* ALL OPTION */}
      <div
        className={`
          px-3 py-2 cursor-pointer text-sm flex items-center gap-2
          hover:bg-[#017ACB]/20
          ${selectedProjects.length === 0 ? "font-semibold" : ""}
        `}
        onClick={() => setSelectedProjects([])}
      >
        <Checkbox checked={selectedProjects.length === 0} />
        All
      </div>

      {/* PROJECT LIST */}
      {availableProjects.map((proj) => (
        <div
          key={proj}
          className={`
            px-3 py-2 cursor-pointer text-sm flex items-center gap-2
            hover:bg-[#017ACB]/20
            ${selectedProjects.includes(proj) ? "font-semibold" : ""}
          `}
          onClick={() =>
            toggleSelection(proj, setSelectedProjects, selectedProjects)
          }
        >
          <Checkbox checked={selectedProjects.includes(proj)} />
          {proj}
        </div>
      ))}
    </div>
  )}
</th>

   {/* CATEGORY FILTER */}
<th
  className="
    px-4 py-2 border text-sm font-semibold whitespace-nowrap
    bg-[#017ACB] relative
  "
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

        setShowResourceMenu(false);
        setShowActivityMenu(false);
        setShowLeaderMenu(false);
        setShowRequestorMenu(false);
        setShowRequestorVPMenu(false);
        setShowRequestingDeptMenu(false);
        setShowManagerMenu(false);
        setShowStartMonthMenu(false);
      }}
      className="
ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      ▼
    </button>
  </div>

  {showCategoryMenu && (
    <div
      className="
        fixed bg-white text-black shadow-lg rounded
        max-w-70 max-h-120 overflow-y-auto
        z-[30000] border border-gray-300 pointer-events-auto
      "
      style={{
        top: menuPosition.y,
        left: menuPosition.x
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`
          px-3 py-2 cursor-pointer text-sm flex items-center gap-2
          hover:bg-[#017ACB]/20
          ${selectedCategories.length === 0 ? "font-semibold" : ""}
        `}
        onClick={() => setSelectedCategories([])}
      >
        <Checkbox checked={selectedCategories.length === 0} />
        All
      </div>

      {availableCategories.map((cat) => (
        <div
          key={cat}
          className={`
            px-3 py-2 cursor-pointer text-sm flex items-center gap-2
            hover:bg-[#017ACB]/20
            ${selectedCategories.includes(cat) ? "font-semibold" : ""}
          `}
          onClick={() =>
            toggleSelection(cat, setSelectedCategories, selectedCategories)
          }
        >
          <Checkbox checked={selectedCategories.includes(cat)} />
          {cat}
        </div>
      ))}
    </div>
  )}
</th>

    {/* LEADER FILTER */}
<th
  className="
    px-4 py-2 border text-sm font-semibold whitespace-nowrap
    bg-[#017ACB] relative
  "
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

        setShowResourceMenu(false);
        setShowActivityMenu(false);
        setShowCategoryMenu(false);
        setShowRequestorMenu(false);
        setShowRequestorVPMenu(false);
        setShowRequestingDeptMenu(false);
        setShowManagerMenu(false);
        setShowStartMonthMenu(false);
      }}
      className="
ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      ▼
    </button>
  </div>

  {showLeaderMenu && (
    <div
      className="
        fixed bg-white text-black shadow-lg rounded
        max-w-70 max-h-120 overflow-y-auto
        z-[30000] border border-gray-300 pointer-events-auto
      "
      style={{
        top: menuPosition.y,
        left: menuPosition.x
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`
          px-3 py-2 cursor-pointer text-sm flex items-center gap-2
          hover:bg-[#017ACB]/20
          ${selectedLeaders.length === 0 ? "font-semibold" : ""}
        `}
        onClick={() => setSelectedLeaders([])}
      >
        <Checkbox checked={selectedLeaders.length === 0} />
        All
      </div>

      {availableLeaders.map((lead) => (
        <div
          key={lead}
          className={`
            px-3 py-2 cursor-pointer text-sm flex items-center gap-2
            hover:bg-[#017ACB]/20
            ${selectedLeaders.includes(lead) ? "font-semibold" : ""}
          `}
          onClick={() =>
            toggleSelection(lead, setSelectedLeaders, selectedLeaders)
          }
        >
          <Checkbox checked={selectedLeaders.includes(lead)} />
          {lead}
        </div>
      ))}
    </div>
  )}
</th>

    {/* REQUESTOR FILTER */}
<th
  className="
    px-4 py-2 border text-sm font-semibold whitespace-nowrap
    bg-[#017ACB] relative
  "
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

        setShowResourceMenu(false);
        setShowActivityMenu(false);
        setShowCategoryMenu(false);
        setShowLeaderMenu(false);
        setShowRequestorVPMenu(false);
        setShowRequestingDeptMenu(false);
        setShowManagerMenu(false);
        setShowStartMonthMenu(false);
      }}
      className="
ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      ▼
    </button>
  </div>

  {showRequestorMenu && (
    <div
      className="
        fixed bg-white text-black shadow-lg rounded
        max-w-70 max-h-120 overflow-y-auto
        z-[30000] border border-gray-300 pointer-events-auto
      "
      style={{
        top: menuPosition.y,
        left: menuPosition.x
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`
          px-3 py-2 cursor-pointer text-sm flex items-center gap-2
          hover:bg-[#017ACB]/20
          ${selectedRequestors.length === 0 ? "font-semibold" : ""}
        `}
        onClick={() => setSelectedRequestors([])}
      >
        <Checkbox checked={selectedRequestors.length === 0} />
        All
      </div>

      {availableRequestors.map((req) => (
        <div
          key={req}
          className={`
            px-3 py-2 cursor-pointer text-sm flex items-center gap-2
            hover:bg-[#017ACB]/20
            ${selectedRequestors.includes(req) ? "font-semibold" : ""}
          `}
          onClick={() =>
            toggleSelection(req, setSelectedRequestors, selectedRequestors)
          }
        >
          <Checkbox checked={selectedRequestors.includes(req)} />
          {req}
        </div>
      ))}
    </div>
  )}
</th>

{/* REQUESTOR VP FILTER */}
<th
  className="
    px-4 py-2 border text-sm font-semibold whitespace-nowrap
    bg-[#017ACB] relative
  "
  style={styles.outfitFont}
>
  <div className="flex justify-between items-center">
    <span>Requestor VP</span>

    <button
      onClick={(e) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();
        setMenuPosition({ x: rect.left, y: rect.bottom });

        // Toggle THIS menu
        setShowRequestorVPMenu(prev => !prev);

        // Close all others
        setShowResourceMenu(false);
        setShowActivityMenu(false);
        setShowCategoryMenu(false);
        setShowLeaderMenu(false);
        setShowRequestorMenu(false);
        setShowRequestingDeptMenu(false);
        setShowManagerMenu(false);
        setShowStartMonthMenu(false);
      }}
      className="
ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      ▼
    </button>
  </div>

  {showRequestorVPMenu && (
    <div
      className="
        fixed bg-white text-black shadow-lg rounded
        max-w-70 max-h-120 overflow-y-auto
        z-[30000] border border-gray-300 pointer-events-auto
      "
      style={{
        top: menuPosition.y,
        left: menuPosition.x
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ALL OPTION */}
      <div
        className={`
          px-3 py-2 cursor-pointer text-sm flex items-center gap-2
          hover:bg-[#017ACB]/20
          ${selectedRequestorVPs.length === 0 ? "font-semibold" : ""}
        `}
        onClick={() => setSelectedRequestorVPs([])}
      >
        <Checkbox checked={selectedRequestorVPs.length === 0} />
        All
      </div>

      {/* VP LIST */}
      {availableRequestorVPs.map((vp) => (
        <div
          key={vp}
          className={`
            px-3 py-2 cursor-pointer text-sm flex items-center gap-2
            hover:bg-[#017ACB]/20
            ${selectedRequestorVPs.includes(vp) ? "font-semibold" : ""}
          `}
          onClick={() =>
            toggleSelection(vp, setSelectedRequestorVPs, selectedRequestorVPs)
          }
        >
          <Checkbox checked={selectedRequestorVPs.includes(vp)} />
          {vp}
        </div>
      ))}
    </div>
  )}
</th>

 {/* REQUESTING DEPARTMENT FILTER */}
<th
  className="
    px-4 py-2 border text-sm font-semibold whitespace-nowrap
    bg-[#017ACB] relative
  "
  style={styles.outfitFont}
>
  <div className="flex justify-between items-center">
    <span>Requesting Dept</span>

    <button
      onClick={(e) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();
        setMenuPosition({ x: rect.left, y: rect.bottom });

        // Toggle THIS menu
        setShowRequestingDeptMenu(prev => !prev);

        // Close all others
        setShowResourceMenu(false);
        setShowActivityMenu(false);
        setShowCategoryMenu(false);
        setShowLeaderMenu(false);
        setShowRequestorMenu(false);
        setShowRequestorVPMenu(false);
        setShowManagerMenu(false);
        setShowStartMonthMenu(false);
      }}
      className="
ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      ▼
    </button>
  </div>

  {showRequestingDeptMenu && (
    <div
      className="
        fixed bg-white text-black shadow-lg rounded
        max-w-70 max-h-120 overflow-y-auto
        z-[30000] border border-gray-300 pointer-events-auto
      "
      style={{
        top: menuPosition.y,
        left: menuPosition.x
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ALL OPTION */}
      <div
        className={`
          px-3 py-2 cursor-pointer text-sm flex items-center gap-2
          hover:bg-[#017ACB]/20
          ${selectedRequestingDepts.length === 0 ? "font-semibold" : ""}
        `}
        onClick={() => setSelectedRequestingDepts([])}
      >
        <Checkbox checked={selectedRequestingDepts.length === 0} />
        All
      </div>

      {/* DEPARTMENT LIST */}
      {availableRequestingDepts.map((dept) => (
        <div
          key={dept}
          className={`
            px-3 py-2 cursor-pointer text-sm flex items-center gap-2
            hover:bg-[#017ACB]/20
            ${selectedRequestingDepts.includes(dept) ? "font-semibold" : ""}
          `}
          onClick={() =>
            toggleSelection(
              dept,
              setSelectedRequestingDepts,
              selectedRequestingDepts
            )
          }
        >
          <Checkbox checked={selectedRequestingDepts.includes(dept)} />
          {dept}
        </div>
      ))}
    </div>
  )}
</th>

   {/* START MONTH SELECTOR */}
<th
  className="
    px-4 py-2 border text-sm font-semibold whitespace-nowrap
    bg-[#017ACB] relative
  "
  style={styles.outfitFont}
>
  <div className="flex justify-between items-center">
    <span>{monthLabels.length ? monthLabels[0].label : "Start Month"}</span>

    <button
      onClick={(e) => {
        e.stopPropagation();

        const rect = e.target.getBoundingClientRect();
        const dropdownWidth = 192;

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

        // Toggle THIS menu (correct behavior)
        setShowStartMonthMenu(prev => {
          const next = !prev;

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
      className="
ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
      "
    >
      ▼
    </button>
  </div>

  {showStartMonthMenu && (
    <div
      ref={startMonthMenuRef}
      className="
        fixed bg-white text-black shadow-lg rounded
        max-w-70 max-h-120 overflow-y-auto
        z-[30000] border border-gray-300 pointer-events-auto
      "
      style={{
        top: menuPosition.y,
        left: menuPosition.x
      }}
      onClick={(e) => e.stopPropagation()}
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
            className={`
              px-3 py-2 cursor-pointer text-sm flex items-center gap-2
              hover:bg-[#017ACB]/20
              ${startMonth === m ? "font-semibold" : ""}
            `}
            onClick={() => {
              setStartMonth(m);
              setShowStartMonthMenu(false);
            }}
          >
            <Checkbox checked={startMonth === m} />
            {label}
          </div>
        );
      })}
    </div>
  )}
</th>

    {/* REMAINING MONTH COLUMNS */}
    {monthLabels.slice(1).map((m) => (
      <th
        key={m.key}
        className="
          px-4 py-2 border text-sm font-semibold whitespace-nowrap
          bg-[#017ACB] z-[1500]
        "
        style={styles.outfitFont}
      >
        {m.label}
      </th>
    ))}

  </tr>
</thead>

{/* BODY */}
{/* BODY */}
<tbody>
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

  {filteredRows.map((row, index) => {
    const empId = row.employee?.emp_id;
    const isHighlighted = highlightedEmpId === empId;

    return (
      <tr
        key={index}
        onClick={() => toggleHighlight(empId)}
        className={`
          cursor-pointer transition-colors
          hover:bg-[#017ACB]/20
          ${isHighlighted ? "bg-[#CDE6F7]" : "bg-white"}
        `}
      >
        {/* EDIT BUTTON */}
        <td
          className="
            sticky left-0 z-30
            px-4 py-2
            bg-white
            border-r border-black
            text-black
            whitespace-nowrap
          "
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditAllocation(row);
            }}
            className="
              px-2 py-1
              bg-[#017ACB] text-white text-xs rounded
              hover:bg-[#017ACB]/20 hover:text-gray-700 transition
              shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            "
            style={styles.outfitFont}
          >
            Edit
          </button>
        </td>

        {/* RESOURCE NAME */}
        <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">
          {row.employee?.emp_name}
        </td>

        {/* DEPARTMENT */}
        <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">
          {row.employee?.dept_name || ""}
        </td>

        {/* REPORTS TO */}
        <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">
          {row.employee?.manager_name || ""}
        </td>

        {/* PROJECT */}
        <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">
          {row.assignment?.project_name}
        </td>

        {/* CATEGORY */}
        <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">
          {row.assignment?.category}
        </td>

        {/* LEADER */}
        <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">
          {row.assignment?.leader}
        </td>

        {/* REQUESTOR */}
        <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">
          {row.assignment?.requestor}
        </td>

        {/* REQUESTOR VP */}
        <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">
          {row.assignment?.requestor_vp}
        </td>

        {/* REQUESTING DEPT */}
        <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">
          {row.assignment?.requesting_dept_name || row.assignment?.requesting_dept}
        </td>

        {/* MONTH CELLS */}
        {monthLabels.map((m) => (
          <td
            key={m.key}
            className="
              px-4 py-2 border text-sm text-black text-center
              whitespace-nowrap cursor-pointer bg-inherit
            "
            onClick={(e) => {
              e.stopPropagation();
              setFilteredRows((prev) => {
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
                defaultValue={row.allocations?.[m.key] ?? ""}
                className="w-16 border rounded text-center text-sm"
                onBlur={(e) => handleAllocationBlur(e, row, m, index)}
                onKeyDown={(e) => handleAllocationKey(e, index)}
              />
            ) : (
              <span>{row.allocations?.[m.key] ?? ""}</span>
            )}
          </td>
        ))}
      </tr>
    );
  })}
</tbody>

</table>
</div>
</div>
</main>
</div>
);
}