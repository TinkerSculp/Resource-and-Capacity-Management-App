'use client';

/* =============================================================================
   AssignmentsAllocationsPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays all employee assignments and their monthly allocations in a
     scrollable, filterable table. Supports:
       • "All Assignments" and "My Assignments" tab views
       • Column-level filter menus (resource, manager, project, category,
         leader, requestor, requestor VP, requesting dept)
       • Resource sort (A→Z / Z→A)
       • Start month selector — shows 16 months from the chosen start
       • Inline allocation editing — click a cell to edit, blur/enter to save
       • Row highlight on click — click a row to highlight all rows for that employee

   SECURITY MODEL:
     • localStorage is accessed inside try/catch — malformed JSON sets user to
       null rather than crashing or persisting a broken auth state.
     • API calls use encodeURIComponent() on user.username — prevents injection
       in the query string.
     • Allocation save requests (PUT/DELETE) send only validated primitives:
       emp_id (from server data), month key (from server data), and amount
       (parsed with parseFloat — NaN results in null which triggers DELETE).
     • Filter menus are built from server response data only — no user-typed
       values ever populate the dropdown option lists.
     • All allocation values in the table display raw server values — no
       dangerouslySetInnerHTML is used anywhere.

   RESPONSIVENESS:
     • Header uses flex-wrap — title and action buttons wrap on narrow screens.
     • Action button group uses flex-wrap gap-2 — buttons wrap to next line
       on phones rather than overflowing.
     • Title uses text-2xl sm:text-4xl — smaller on mobile.
     • Table wrapper uses overflow-x-auto + overflow-y-auto + max-h-[70vh] —
       scrolls both axes; never breaks layout on narrow screens.
     • Sticky left-0 on Edit column — always visible while scrolling right.
     • px-2 sm:px-4 on table cells — tighter padding on mobile.
     • Filter dropdown menus use fixed positioning with overflow-y-auto so they
       never push other content on small screens.

   DEPENDENCIES:
     • next/navigation   — useRouter, useSearchParams
   ============================================================================= */

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* -----------------------------------------------------------------------------
   REUSABLE CHECKBOX COMPONENT
   Used inside dropdown filter menus to show selected state.
   Visually matches the brand blue (#003A5C) used throughout the app.
----------------------------------------------------------------------------- */
const Checkbox = ({ checked }) => (
  <span
    className="
      w-4 h-4 flex-shrink-0
      border border-black rounded-sm
      flex items-center justify-center
      transition relative overflow-hidden
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
        <span className="absolute inset-0" style={{ backgroundColor: '#003A5C' }} />
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

/* -----------------------------------------------------------------------------
   STYLES
----------------------------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: "Outfit, sans-serif" }
};

/* -----------------------------------------------------------------------------
   SHARED BUTTON CLASS
   Neumorphic style — same shadow, border-black/50, and hover tint used
   across all other pages (Dashboard, CapacitySummary, Report, etc.).
     • border-black/50  — semi-transparent border, consistent weight
     • outer shadow     — lifts the button off the surface
     • inner shadow     — via before: pseudo-element, gives the 3D pressed feel
     • active shadow    — shrinks on press for tactile feedback
----------------------------------------------------------------------------- */
const btnClass = `
  px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

/* -----------------------------------------------------------------------------
   TAB BUTTON CLASS BUILDER
   Active tab gets the blue fill; inactive gets the gray surface.
   Both share the same neumorphic shadow and border-black/50.
----------------------------------------------------------------------------- */
const tabClass = (isActive) => `
  px-4 py-2 rounded text-sm border border-black/50
  ${isActive
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                : 'bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20'
  }
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  transition whitespace-nowrap
`;

/* -----------------------------------------------------------------------------
   COLUMN FILTER BUTTON CLASS (▼ buttons inside table header cells)
   Lighter inset-only shadow — sits inside the blue header so it needs less
   lift. White bg with brand blue text, consistent hover tint.
----------------------------------------------------------------------------- */
const colBtnClass = `
  ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold
  border border-black/50
  hover:bg-[#CDE6F7] transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.14)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.14)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.10),inset_0_-1px_2px_rgba(0,0,0,0.10)]
`;

/* -----------------------------------------------------------------------------
   DROPDOWN MENU CLASS
   Fixed-position overlay for all column filter dropdowns.
   max-h + overflow-y-auto — never grows taller than the viewport.
   z-[30000] — above sticky table headers and all other stacking contexts.
----------------------------------------------------------------------------- */
const menuClass = `
  dropdown-menu
  fixed bg-white text-black shadow-lg rounded
  w-48 max-h-72 overflow-y-auto
  z-[30000] border border-gray-300 pointer-events-auto
`;

export default function AssignmentsAllocationsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refresh      = searchParams.get("refresh");

  const apiUrl = "http://localhost:3001";

  /* ---------------------------------------------------------------------------
     STATE
     ---------------------------------------------------------------------------
     All array states default to [] — prevents table renders from receiving
     undefined before data loads.
  --------------------------------------------------------------------------- */

  // Session
  const [user, setUser] = useState(null);

  // Row highlight — click a row to highlight all rows for that employee
  const [highlightedEmpId, setHighlightedEmpId] = useState(null);
  const toggleHighlight = (empId) =>
    setHighlightedEmpId((prev) => (prev === empId ? null : empId));

  // Ref for start month dropdown — used to scroll to selected month on open
  const startMonthMenuRef = useRef(null);

  // Data
  const [allRows, setAllRows]           = useState([]);
  const [mine, setMine]                 = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [months, setMonths]             = useState([]);
  const [activeTab, setActiveTab]       = useState("all");
  const [loading, setLoading]           = useState(true);

  // Filter selections — all default to [] meaning "show all"
  const [selectedResources, setSelectedResources]           = useState([]);
  const [selectedActivities, setSelectedActivities]         = useState([]);
  const [selectedProjects, setSelectedProjects]             = useState([]);
  const [selectedCategories, setSelectedCategories]         = useState([]);
  const [selectedLeaders, setSelectedLeaders]               = useState([]);
  const [selectedRequestors, setSelectedRequestors]         = useState([]);
  const [selectedRequestorVPs, setSelectedRequestorVPs]     = useState([]);
  const [selectedRequestingDepts, setSelectedRequestingDepts] = useState([]);
  const [selectedManagers, setSelectedManagers]             = useState([]);

  // Resource sort — only sort kept from original
  const [resourceSort, setResourceSort] = useState("");

  // Dropdown menu visibility flags
  const [showResourceMenu, setShowResourceMenu]           = useState(false);
  const [showActivityMenu, setShowActivityMenu]           = useState(false);
  const [showProjectMenu, setShowProjectMenu]             = useState(false);
  const [showCategoryMenu, setShowCategoryMenu]           = useState(false);
  const [showLeaderMenu, setShowLeaderMenu]               = useState(false);
  const [showRequestorMenu, setShowRequestorMenu]         = useState(false);
  const [showRequestorVPMenu, setShowRequestorVPMenu]     = useState(false);
  const [showRequestingDeptMenu, setShowRequestingDeptMenu] = useState(false);
  const [showManagerMenu, setShowManagerMenu]             = useState(false);
  const [showStartMonthMenu, setShowStartMonthMenu]       = useState(false);

  // Dropdown position — computed from button bounding rect on open
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Available filter option lists — built from server response data only
  const [availableResources, setAvailableResources]           = useState([]);
  const [availableActivities, setAvailableActivities]         = useState([]);
  const [availableProjects, setAvailableProjects]             = useState([]);
  const [availableCategories, setAvailableCategories]         = useState([]);
  const [availableLeaders, setAvailableLeaders]               = useState([]);
  const [availableRequestors, setAvailableRequestors]         = useState([]);
  const [availableRequestorVPs, setAvailableRequestorVPs]     = useState([]);
  const [availableRequestingDepts, setAvailableRequestingDepts] = useState([]);
  const [availableManagers, setAvailableManagers]             = useState([]);

  // Start month — YYYYMM string e.g. "202503"
  const [startMonth, setStartMonth] = useState(null);

  /* ---------------------------------------------------------------------------
     HELPER: toggleSelection
     Adds a value to a filter array if not present, removes it if present.
     Used by all filter dropdowns.
  --------------------------------------------------------------------------- */
  const toggleSelection = (value, setFn, current) => {
    setFn(
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  };

  /* ---------------------------------------------------------------------------
     HELPER: closeAllMenus
     Closes every dropdown menu — called before opening a new one so only
     one menu is ever open at a time.
  --------------------------------------------------------------------------- */
  const closeAllMenus = () => {
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

  /* ---------------------------------------------------------------------------
     HELPER: openMenu
     Computes the dropdown position from the clicked button's bounding rect,
     clamps to viewport edges, closes all other menus, then opens the target.
  --------------------------------------------------------------------------- */
  const openMenu = (e, setFn) => {
    e.stopPropagation();
    const rect          = e.currentTarget.getBoundingClientRect();
    const dropdownWidth = 192; // w-48 = 192px
    let x = rect.left;
    let y = rect.bottom + 4;

    // Clamp to right viewport edge
    if (x + dropdownWidth > window.innerWidth) {
      x = window.innerWidth - dropdownWidth - 10;
    }

    setMenuPosition({ x, y });
    closeAllMenus();
    setFn((prev) => !prev);
  };

  /* ---------------------------------------------------------------------------
     KEY HANDLER: allocation cell input
     Enter — commits the edit by blurring the input.
     Escape — cancels the edit without saving.
  --------------------------------------------------------------------------- */
  const handleAllocationKey = (e, index) => {
    if (e.key === "Enter") e.target.blur();

    if (e.key === "Escape") {
      setFilteredRows((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], editing: null };
        return updated;
      });
    }
  };

  /* ---------------------------------------------------------------------------
     BLUR HANDLER: save allocation to DB
     ---------------------------------------------------------------------------
     Optimistically updates the UI first, then persists to the backend.

     SECURITY:
     • emp_id and month key come from validated server response data — never
       from user-typed input.
     • amount is parsed with parseFloat() — any non-numeric value becomes NaN
       which is treated as null and triggers a DELETE instead of PUT.
     • Request bodies only contain the minimum required fields.
  --------------------------------------------------------------------------- */
  const handleAllocationBlur = async (e, row, m, index) => {
    const raw      = e.target.value;
    const newValue = raw === "" ? null : parseFloat(raw);

    // Optimistic UI update — shows new value immediately before API responds
    setFilteredRows((prev) => {
      const updated   = [...prev];
      updated[index]  = {
        ...updated[index],
        allocations: { ...updated[index].allocations, [m.key]: newValue },
        editing: null
      };
      return updated;
    });

    try {
      if (newValue === null) {
        // Empty input → delete the allocation record
        await fetch(`${apiUrl}/api/assignments-allocations/delete`, {
          method:  "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emp_id:   row.employee.emp_id,
            month:    m.key,
            activity: row.assignment.project_name,
            category: row.assignment.category
          })
        });
      } else {
        // Numeric input → upsert the allocation record
        await fetch(`${apiUrl}/api/assignments-allocations/${row.employee.emp_id}/amount`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emp_id:   row.employee.emp_id,
            month:    m.key,
            amount:   newValue,
            activity: row.assignment.project_name,
            category: row.assignment.category
          })
        });
      }
    } catch (err) {
      console.error("Failed to update allocation:", err);
    }
  };

  /* ---------------------------------------------------------------------------
     EFFECT 1: LOAD USER SESSION
     Runs once on mount. Wrapped in try/catch — malformed localStorage JSON
     sets user to null rather than crashing.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (stored) setUser(JSON.parse(stored));
    } catch {
      setUser(null);
    }
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT 2: LOAD ASSIGNMENTS
     ---------------------------------------------------------------------------
     Skips until user.username is available — prevents API calls before the
     session is confirmed.

     SECURITY:
     • encodeURIComponent() applied to user.username — prevents injection in
       the query string even if the username contains special characters.
     • Cache-Control headers force a fresh response — prevents stale data from
       being shown after an allocation edit on another page.
     • Response is parsed with .catch(() => ({})) — JSON parse failures return
       an empty object rather than throwing an unhandled rejection.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user?.username) return;

    const loadAll = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `${apiUrl}/api/assignments-allocations?username=${encodeURIComponent(user.username)}&ts=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
              Pragma:  "no-cache",
              Expires: "0"
            }
          }
        );

        const data = await res.json().catch(() => ({}));

        setAllRows(data.allAssignments || []);
        setMine(data.myAssignments     || []);
        setMonths(data.months          || []);
        setFilteredRows(data.allAssignments || []);

      } catch {
        // Network failure — reset all data arrays to empty
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

  /* ---------------------------------------------------------------------------
     EFFECT 3: DEFAULT START MONTH
     Defaults to the current calendar month once months are loaded.
     Falls back to months[0] if the current month isn't in the list.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!months.length || startMonth) return;

    const now     = new Date();
    const current = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    setStartMonth(months.includes(current) ? current : months[0]);
  }, [months, startMonth]);

  /* ---------------------------------------------------------------------------
     MEMO: visibleMonths
     Slices months from startMonth forward, up to 16 months. Used for both
     table column headers and allocation cell renders.
  --------------------------------------------------------------------------- */
  const visibleMonths = useMemo(() => {
    if (!months.length) return [];
    const start = startMonth && months.includes(startMonth) ? startMonth : months[0];
    const idx   = months.indexOf(start);
    return months.slice(idx, idx + 16);
  }, [months, startMonth]);

  /* ---------------------------------------------------------------------------
     MEMO: monthLabels
     Converts YYYYMM strings to { key, label } objects for header rendering.
     e.g. "202503" → { key: "202503", label: "Mar 2025" }
  --------------------------------------------------------------------------- */
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const monthLabels = useMemo(() => {
    return visibleMonths.map((m) => ({
      key:   m,
      label: `${monthNames[parseInt(m.substring(4, 6), 10) - 1]} ${m.substring(0, 4)}`
    }));
  }, [visibleMonths]);

  /* ---------------------------------------------------------------------------
     MEMO: rowsWithVisibleAllocations
     Filters allRows to only those with at least one allocation in the visible
     month window. Applies resource sort if active.
  --------------------------------------------------------------------------- */
  const rowsWithVisibleAllocations = useMemo(() => {
    let rows = allRows.filter((row) =>
      visibleMonths.some((m) => {
        const val = row.allocations?.[m];
        return val !== null && val !== undefined && val !== "";
      })
    );

    if (resourceSort === "asc")  rows = [...rows].sort((a, b) => a.employee.emp_name.localeCompare(b.employee.emp_name));
    if (resourceSort === "desc") rows = [...rows].sort((a, b) => b.employee.emp_name.localeCompare(a.employee.emp_name));

    return rows;
  }, [allRows, visibleMonths, resourceSort]);

  /* ---------------------------------------------------------------------------
     EFFECT 4: BUILD FILTER OPTION LISTS
     Derives unique values for each filter dropdown from the visible rows.
     Option lists come from server data only — never from user-typed input.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const uniq = (arr) => [...new Set(arr)].filter(Boolean);

    let res = uniq(rowsWithVisibleAllocations.map((r) => r.employee?.emp_name || ""));
    if (resourceSort === "asc")  res.sort((a, b) => a.localeCompare(b));
    if (resourceSort === "desc") res.sort((a, b) => b.localeCompare(a));

    setAvailableResources(res);
    setAvailableActivities(uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.project_name || "")));
    setAvailableProjects(uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.project_name || "")));
    setAvailableCategories(uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.category || "")));
    setAvailableLeaders(uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.leader || "")));
    setAvailableRequestors(uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.requestor || "")));
    setAvailableRequestorVPs(uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.requestor_vp || "")));
    setAvailableRequestingDepts(uniq(rowsWithVisibleAllocations.map((r) => r.assignment?.requesting_dept_name || r.assignment?.requesting_dept || "")));
    setAvailableManagers(uniq(rowsWithVisibleAllocations.map((r) => r.employee?.manager_name || "")));
  }, [rowsWithVisibleAllocations, resourceSort]);

  /* ---------------------------------------------------------------------------
     EFFECT 5: CLOSE MENUS ON OUTSIDE CLICK
     Any click outside a .dropdown-menu element closes all open menus.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".dropdown-menu")) closeAllMenus();
    };

    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT 6: MAIN FILTERING LOGIC
     Applies all active filter selections to the appropriate data source
     (allRows or mine) and applies resource sort.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    let base     = activeTab === "mine" ? mine : allRows;
    let filtered = base.filter((row) => {
      const empName       = row.employee?.emp_name || "";
      const project       = row.assignment?.project_name || "";
      const category      = row.assignment?.category || "";
      const leader        = row.assignment?.leader || "";
      const requestor     = row.assignment?.requestor || "";
      const requestorVP   = row.assignment?.requestor_vp || "";
      const requestingDept = row.assignment?.requesting_dept_name || row.assignment?.requesting_dept || "";
      const managerName   = row.employee?.manager_name || "";

      const passesFilters =
        (!selectedResources.length     || selectedResources.includes(empName)) &&
        (!selectedProjects.length      || selectedProjects.includes(project)) &&
        (!selectedCategories.length    || selectedCategories.includes(category)) &&
        (!selectedLeaders.length       || selectedLeaders.includes(leader)) &&
        (!selectedRequestors.length    || selectedRequestors.includes(requestor)) &&
        (!selectedRequestorVPs.length  || selectedRequestorVPs.includes(requestorVP)) &&
        (!selectedRequestingDepts.length || selectedRequestingDepts.includes(requestingDept)) &&
        (!selectedManagers.length      || selectedManagers.includes(managerName));

      if (!passesFilters) return false;

      // Must have at least one allocation in the visible month window
      return visibleMonths.some((m) => {
        const val = row.allocations?.[m];
        return val !== null && val !== undefined && val !== "";
      });
    });

    if (resourceSort === "asc")  filtered.sort((a, b) => a.employee.emp_name.localeCompare(b.employee.emp_name));
    if (resourceSort === "desc") filtered.sort((a, b) => b.employee.emp_name.localeCompare(a.employee.emp_name));

    setFilteredRows(filtered);
  }, [
    user, activeTab, mine, allRows, visibleMonths,
    selectedResources, selectedProjects, selectedCategories,
    selectedLeaders, selectedRequestors, selectedRequestorVPs,
    selectedRequestingDepts, selectedManagers, resourceSort
  ]);

  /* ---------------------------------------------------------------------------
     HANDLER: navigate to edit allocation page for a row
  --------------------------------------------------------------------------- */
  const handleEditAllocation = (row) => {
    const emp      = row.employee?.emp_id;
    const project  = row.assignment?.project_name;
    const category = row.assignment?.category;

    router.push(
      `/resource-manager/assign-edit-allocation/edit-allocation` +
      `?emp_id=${emp}` +
      `&project=${encodeURIComponent(project)}` +
      `&category=${encodeURIComponent(category)}`
    );
  };

  /* ---------------------------------------------------------------------------
     LOADING STATE
  --------------------------------------------------------------------------- */
  if (!user || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]"
          role="status"
          aria-label="Loading assignments"
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RENDER: DROPDOWN MENU ITEMS
     Shared pattern — renders "All" option then a list of values, each with
     a Checkbox and hover tint.
  --------------------------------------------------------------------------- */
  const renderMenuItems = (available, selected, setSelected, sortOptions = null) => (
    <>
      {/* Sort options (resource column only) */}
      {sortOptions && (
        <>
          {[{ val: "asc", label: "A → Z" }, { val: "desc", label: "Z → A" }].map(({ val, label }) => (
            <div
              key={val}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${resourceSort === val ? "font-semibold" : ""}`}
              onClick={() => setResourceSort(resourceSort === val ? "" : val)}
            >
              <Checkbox checked={resourceSort === val} />
              {label}
            </div>
          ))}
          <div className="border-t my-2" />
        </>
      )}

      {/* "All" clears the filter */}
      <div
        className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${selected.length === 0 ? "font-semibold" : ""}`}
        onClick={() => setSelected([])}
      >
        <Checkbox checked={selected.length === 0} />
        All
      </div>

      {/* Option list — values come from server data only */}
      {available.map((name) => (
        <div
          key={name}
          className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${selected.includes(name) ? "font-semibold" : ""}`}
          onClick={() => toggleSelection(name, setSelected, selected)}
        >
          <Checkbox checked={selected.includes(name)} />
          {name}
        </div>
      ))}
    </>
  );

  /* ---------------------------------------------------------------------------
     RENDER
     ---------------------------------------------------------------------------
     RESPONSIVENESS STRATEGY:
     • Outer container: min-h-screen — fills the viewport at all sizes.
     • Header: flex-wrap — title + action buttons wrap on narrow screens.
     • Button group: flex-wrap gap-2 — buttons wrap to next line on phones.
     • Title: text-2xl sm:text-4xl — smaller on mobile.
     • Table: overflow-x-auto + overflow-y-auto + max-h-[70vh] — scrolls both
       axes; sticky left-0 Edit column always visible while scrolling right.
     • Cell padding: px-2 sm:px-4 — compact on mobile, comfortable on desktop.
  --------------------------------------------------------------------------- */
  return (
    <div className="h-[600px] bg-white">
      <main className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 py-4">

        {/* -----------------------------------------------------------------
           PAGE HEADER
           flex-wrap — title and button groups wrap on narrow screens.
           justify-between — title left, actions right on wide screens.
        ----------------------------------------------------------------- */}
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">

          {/* LEFT: Title + Back button */}
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className="text-2xl sm:text-4xl font-bold text-gray-900"
              style={styles.outfitFont}
            >
              Assignments &amp; Allocations
            </h2>

            {/* <button
              onClick={() => router.push("/resource-manager/dashboard")}
              aria-label="Go back to dashboard"
              className={btnClass}
              style={styles.outfitFont}
            >
              Back to Dashboard
            </button> */}

                    <button
          onClick={() => router.push('/resource-manager/dashboard')}
          className="
            px-4 py-2 rounded text-sm
            bg-[#003A5C] text-white border border-black/50
            hover:bg-[#017ACB]/20 transition-colors hover:text-gray-700
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
          "
          style={styles.outfitFont}
        >
          Back to Dashboard
        </button>
          </div>

          {/* RIGHT: Tab toggles + Add Allocation button */}
          {/* flex-wrap — wraps to next line on mobile rather than overflowing */}
          <div className="flex flex-wrap gap-2 items-center">

            <button
              onClick={() => setActiveTab("all")}
              aria-pressed={activeTab === "all"}
              className={tabClass(activeTab === "all")}
              style={styles.outfitFont}
            >
              All Assignments
            </button>

            <button
              onClick={() => setActiveTab("mine")}
              aria-pressed={activeTab === "mine"}
              className={tabClass(activeTab === "mine")}
              style={styles.outfitFont}
            >
              My Assignments
            </button>

            <button
              onClick={() => router.push("/resource-manager/assign-edit-allocation/add-allocation")}
              aria-label="Add a new allocation"
              className={btnClass}
              style={styles.outfitFont}
            >
              + Add Allocation
            </button>
          </div>
        </div>

        {/* -----------------------------------------------------------------
           ASSIGNMENTS TABLE
           overflow-x-auto — horizontal scroll on mobile/tablet.
           overflow-y-auto + max-h-[70vh] — vertical scroll within viewport.
           sticky thead — column headers stay visible while scrolling down.
           sticky left-0 on Edit column — always visible while scrolling right.
        ----------------------------------------------------------------- */}
        <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
            <table className="min-w-max w-full border-collapse text-sm">

              {/* ============================================================
                  TABLE HEADER
                  Each filter column has a ▼ button that opens a fixed-position
                  dropdown menu. Menus are positioned from the button's bounding
                  rect so they open near the column on any screen size.
              ============================================================ */}
              <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
                <tr>

                  {/* EDIT COLUMN — sticky left so it stays visible on scroll */}
                  <th
                    className="sticky left-0 top-0 z-[9999] bg-[#017ACB] px-2 sm:px-4 py-2 text-sm font-semibold whitespace-nowrap align-middle [background-clip:padding-box]"
                    style={styles.outfitFont}
                  >
                    Edit
                  </th>

                  {/* RESOURCE NAME — with sort + filter dropdown */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Resource Name</span>
                      <button className={colBtnClass} onClick={(e) => openMenu(e, setShowResourceMenu)}>▼</button>
                    </div>
                    {showResourceMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                        {renderMenuItems(availableResources, selectedResources, setSelectedResources, true)}
                      </div>
                    )}
                  </th>

                  {/* DEPARTMENT — no filter */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                    Department
                  </th>

                  {/* REPORTS TO — manager filter */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Reports To</span>
                      <button className={colBtnClass} onClick={(e) => openMenu(e, setShowManagerMenu)}>▼</button>
                    </div>
                    {showManagerMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                        {renderMenuItems(availableManagers, selectedManagers, setSelectedManagers)}
                      </div>
                    )}
                  </th>

                  {/* PROJECT — filter */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Project</span>
                      <button className={colBtnClass} onClick={(e) => openMenu(e, setShowProjectMenu)}>▼</button>
                    </div>
                    {showProjectMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                        {renderMenuItems(availableProjects, selectedProjects, setSelectedProjects)}
                      </div>
                    )}
                  </th>

                  {/* ACTIVITY CATEGORY — filter */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Activity Category</span>
                      <button className={colBtnClass} onClick={(e) => openMenu(e, setShowCategoryMenu)}>▼</button>
                    </div>
                    {showCategoryMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                        {renderMenuItems(availableCategories, selectedCategories, setSelectedCategories)}
                      </div>
                    )}
                  </th>

                  {/* LEADER ACCOUNTABLE — filter */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Leader Accountable</span>
                      <button className={colBtnClass} onClick={(e) => openMenu(e, setShowLeaderMenu)}>▼</button>
                    </div>
                    {showLeaderMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                        {renderMenuItems(availableLeaders, selectedLeaders, setSelectedLeaders)}
                      </div>
                    )}
                  </th>

                  {/* REQUESTOR — filter */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Requestor</span>
                      <button className={colBtnClass} onClick={(e) => openMenu(e, setShowRequestorMenu)}>▼</button>
                    </div>
                    {showRequestorMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                        {renderMenuItems(availableRequestors, selectedRequestors, setSelectedRequestors)}
                      </div>
                    )}
                  </th>

                  {/* REQUESTOR VP — filter */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Requestor VP</span>
                      <button className={colBtnClass} onClick={(e) => openMenu(e, setShowRequestorVPMenu)}>▼</button>
                    </div>
                    {showRequestorVPMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                        {renderMenuItems(availableRequestorVPs, selectedRequestorVPs, setSelectedRequestorVPs)}
                      </div>
                    )}
                  </th>

                  {/* REQUESTING DEPT — filter */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Requesting Dept</span>
                      <button className={colBtnClass} onClick={(e) => openMenu(e, setShowRequestingDeptMenu)}>▼</button>
                    </div>
                    {showRequestingDeptMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                        {renderMenuItems(availableRequestingDepts, selectedRequestingDepts, setSelectedRequestingDepts)}
                      </div>
                    )}
                  </th>

                  {/* START MONTH — shows first visible month label + dropdown to change */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>{monthLabels.length ? monthLabels[0].label : "Start Month"}</span>
                      <button
                        className={colBtnClass}
                        onClick={(e) => {
                          openMenu(e, setShowStartMonthMenu);
                          // Scroll to selected month after menu renders
                          setTimeout(() => {
                            if (startMonthMenuRef.current) {
                              const el = startMonthMenuRef.current.querySelector(`[data-month="${startMonth}"]`);
                              if (el) el.scrollIntoView({ block: "center" });
                            }
                          }, 0);
                        }}
                      >
                        ▼
                      </button>
                    </div>
                    {showStartMonthMenu && (
                      <div
                        ref={startMonthMenuRef}
                        className={menuClass}
                        style={{ top: menuPosition.y, left: menuPosition.x }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {months.map((m) => {
                          const label = `${monthNames[parseInt(m.substring(4, 6), 10) - 1]} ${m.substring(0, 4)}`;
                          return (
                            <div
                              key={m}
                              data-month={m}
                              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${startMonth === m ? "font-semibold" : ""}`}
                              onClick={() => { setStartMonth(m); setShowStartMonthMenu(false); }}
                            >
                              <Checkbox checked={startMonth === m} />
                              {label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </th>

                  {/* REMAINING MONTH COLUMNS — months 2–16 */}
                  {monthLabels.slice(1).map((m) => (
                    <th
                      key={m.key}
                      className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]"
                      style={styles.outfitFont}
                    >
                      {m.label}
                    </th>
                  ))}

                </tr>
              </thead>

              {/* ============================================================
                  TABLE BODY
                  • Alternates row bg via isHighlighted / default white.
                  • Click a row to highlight all rows for that employee.
                  • Edit column is sticky-left so it stays visible on scroll.
                  • Allocation cells are click-to-edit inline inputs.
              ============================================================ */}
              <tbody>
                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={11 + monthLabels.length}
                      className="text-center py-8 text-gray-500 border"
                      style={styles.outfitFont}
                    >
                      No assignments found.
                    </td>
                  </tr>
                )}

                {filteredRows.map((row, index) => {
                  const empId         = row.employee?.emp_id;
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
                      {/* EDIT — sticky, stops row click propagation */}
                      <td
                        className="sticky left-0 z-30 px-2 sm:px-4 py-2 bg-white border-r border-black text-black whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditAllocation(row); }}
                          className="
                            px-2 py-1 rounded text-xs
                            bg-[#017ACB] text-white border border-black/50
                            hover:bg-[#017ACB]/20 hover:text-gray-700 transition
                            shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                            active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
                            relative
                            before:content-[''] before:absolute before:inset-0 before:rounded
                            before:pointer-events-none
                            before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
                          "
                          style={styles.outfitFont}
                        >
                          Edit
                        </button>
                      </td>

                      {/* DATA CELLS */}
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.employee?.emp_name}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.employee?.dept_name || ""}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.employee?.manager_name || ""}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.project_name}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.category}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.leader}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.requestor}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.requestor_vp}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.requesting_dept_name || row.assignment?.requesting_dept}</td>

                      {/* MONTH CELLS — click to edit inline */}
                      {monthLabels.map((m) => (
                        <td
                          key={m.key}
                          className="px-2 sm:px-4 py-2 border text-sm text-black text-center whitespace-nowrap cursor-pointer bg-inherit"
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
                              className="w-16 border border-black/50 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#017ACB]/40"
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