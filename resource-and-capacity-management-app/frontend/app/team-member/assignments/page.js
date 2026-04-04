
"use client";

export const dynamic = 'force-dynamic';
/* =============================================================================
   TeamMemberAssignmentsPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Read-only assignments view for Team Member users (acc_type_id === 3).
     Displays all assignments and their monthly FTE allocations in a filterable,
     horizontally scrollable table. Supports "All Assignments" and "My Assignments"
     tabs with per-column filter dropdowns.

   HOW IT WORKS:
     1. On mount, validates the session from localStorage
     2. Fetches all assignments + the logged-in user's assignments from the backend
     3. "All Assignments" tab scopes to projects the current user is allocated to
        (not truly all — the team member only sees their own projects' data)
     4. "My Assignments" tab shows only rows where the employee is the current user
     5. Column filter dropdowns allow multi-select filtering within the visible rows
     6. The month picker moves the 16-column window forward or backward in time

   KEY DIFFERENCE FROM RESOURCE MANAGER VIEW:
     • No Edit button — Team Members cannot modify allocations
     • No Add Allocation button — read-only view only
     • "All Assignments" scopes to projects the current user is on, not the full list
     • sanitize() strips control characters, HTML tags, and script patterns from all
       string values before they reach state or the DOM — defence-in-depth for XSS

   SECURITY MODEL:
     • Session validated on mount — missing token or user redirects to /login.
     • All string values from the API are passed through sanitize() before being
       stored in state or rendered — prevents XSS from unexpected API content.
     • username is passed through encodeURIComponent() in the API URL.
     • All rendered values are plain text — no dangerouslySetInnerHTML anywhere.
     • Filter option lists are built from server response data only — no user-typed
       values ever populate the dropdown options.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter, useSearchParams
   ============================================================================= */

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";

const styles = { outfitFont: { fontFamily: "Outfit, sans-serif" } };

/* -----------------------------------------------------------------------------
   SHARED BUTTON CLASSES — neumorphic, matches all other pages in the app.
----------------------------------------------------------------------------- */
const btnDarkClass = `
  px-4 py-2 rounded text-sm
  bg-[#003A5C] text-white border border-black/50 dark:border-slate-500/60
  dark:bg-[#0A5F8A] dark:text-white
  hover:bg-[#017ACB]/20 hover:text-gray-700
  dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100
  transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
`;

const tabClass = (isActive) => `
  px-6 py-2 rounded text-sm
  border border-[#00263F]/50 dark:border-slate-500/60
  ${isActive
    ? 'bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
    : 'bg-[#017ACB] text-white hover:bg-[#017ACB]/80 dark:hover:bg-[#017ACB]/80'
  }
  transition whitespace-nowrap
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
`;

/* colBtnClass — small ▼ filter buttons inside table header cells.
   No before: pseudo-element inset shadow to avoid the fractional height shift
   that causes the button to nudge upward on hover inside a flex header cell. */
const colBtnClass = `
  ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold
  border border-black/50 hover:bg-[#CDE6F7] transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.14)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.14)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.10),inset_0_-1px_2px_rgba(0,0,0,0.10)]
`;

/* menuClass — fixed-position overlay for column filter dropdowns.
   z-[30000] floats above sticky headers and all other stacking contexts. */
const menuClass = `
  dropdown-menu fixed bg-white dark:bg-slate-800 text-black dark:text-slate-100 shadow-lg rounded
  min-w-[12rem] w-max max-w-xs max-h-[min(80vh,580px)] overflow-y-auto
  z-[30000] border border-gray-300 dark:border-slate-600 pointer-events-auto
`;

/* =============================================================================
   UTILITY: sanitize
   -----------------------------------------------------------------------------
   Strips control characters, HTML tags, and script injection patterns from
   API response strings before storing in state or rendering. Applied to every
   string field in mapRows — defence-in-depth against XSS.
   ============================================================================= */
function sanitize(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")    // Strip control characters
    .replace(/<[^>]*>/g, "")                            // Strip HTML tags
    .replace(/script|onerror|onload|javascript:/gi, "") // Strip script patterns
    .trim();
}

/* =============================================================================
   UTILITY: formatMonth
   Converts a YYYYMM string to "Mon-YY" display label (e.g. "202503" → "Mar-25").
   ============================================================================= */
function formatMonth(yyyymm) {
  const s    = String(yyyymm);
  const date = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, 1);
  return date.toLocaleString("default", { month: "short" }) + "-" + s.slice(2, 4);
}

/* =============================================================================
   COMPONENT: Checkbox
   Custom styled checkbox consistent with the rest of the app's design system.
   Hidden native input provides accessibility; visible span provides styling.
   ============================================================================= */
const Checkbox = ({ checked }) => (
  <span className="w-4 h-4 border border-black rounded-sm flex items-center justify-center relative overflow-hidden flex-shrink-0">
    <input type="checkbox" checked={checked} readOnly className="opacity-0 absolute w-4 h-4 cursor-pointer" />
    {checked && (
      <>
        <span className="absolute inset-0" style={{ backgroundColor: "#003A5C" }} />
        <svg className="absolute w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 11 8 15 16 6" />
        </svg>
      </>
    )}
  </span>
);

/* =============================================================================
   MAIN COMPONENT
   ============================================================================= */
export default function TeamMemberAssignmentsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refresh      = searchParams.get("refresh"); // Triggers re-fetch when navigated back with ?refresh=

  /* ---------------------------------------------------------------------------
     STATE
  --------------------------------------------------------------------------- */
  const [user, setUser]           = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const [allRows, setAllRows]         = useState([]); // All assignment rows from backend
  const [myRows, setMyRows]           = useState([]); // Rows scoped to the current user
  const [months, setMonths]           = useState([]); // Full month list from backend
  const [filteredRows, setFilteredRows] = useState([]); // Rows after all filters applied

  const [resourceSort, setResourceSort] = useState(""); // "asc", "desc", or "" (no sort)

  // Active filter selections — empty array = no filter (show all)
  const [selectedResources, setSelectedResources]       = useState([]);
  const [selectedDepts, setSelectedDepts]               = useState([]);
  const [selectedReportsTo, setSelectedReportsTo]       = useState([]);
  const [selectedActivities, setSelectedActivities]     = useState([]);
  const [selectedCategories, setSelectedCategories]     = useState([]);
  const [selectedLeaders, setSelectedLeaders]           = useState([]);
  const [selectedRequestors, setSelectedRequestors]     = useState([]);
  const [selectedRequestorVPs, setSelectedRequestorVPs] = useState([]);
  const [selectedReqDepts, setSelectedReqDepts]         = useState([]);

  // Available options per column — built from the current tab's base rows
  const [availableResources, setAvailableResources]       = useState([]);
  const [availableDepts, setAvailableDepts]               = useState([]);
  const [availableReportsTo, setAvailableReportsTo]       = useState([]);
  const [availableActivities, setAvailableActivities]     = useState([]);
  const [availableCategories, setAvailableCategories]     = useState([]);
  const [availableLeaders, setAvailableLeaders]           = useState([]);
  const [availableRequestors, setAvailableRequestors]     = useState([]);
  const [availableRequestorVPs, setAvailableRequestorVPs] = useState([]);
  const [availableReqDepts, setAvailableReqDepts]         = useState([]);

  // Month window picker
  const [startMonth, setStartMonth]             = useState(null);
  const [availablePastMonths, setAvailablePastMonths] = useState([]);

  // Dropdown visibility + fixed-position coordinates
  const [menuPosition, setMenuPosition]         = useState({ x: 0, y: 0 });
  const [showResourceMenu, setShowResourceMenu] = useState(false);
  const [showDeptMenu, setShowDeptMenu]         = useState(false);
  const [showReportsToMenu, setShowReportsToMenu] = useState(false);
  const [showActivityMenu, setShowActivityMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showLeaderMenu, setShowLeaderMenu]     = useState(false);
  const [showRequestorMenu, setShowRequestorMenu] = useState(false);
  const [showVPMenu, setShowVPMenu]             = useState(false);
  const [showReqDeptMenu, setShowReqDeptMenu]   = useState(false);
  const [showMonthMenu, setShowMonthMenu]       = useState(false);
  const monthMenuRef = useRef(null);

  /* ---------------------------------------------------------------------------
     HELPERS: menu open/close and filter toggle
  --------------------------------------------------------------------------- */
  const closeAllMenus = () => {
    setShowResourceMenu(false); setShowDeptMenu(false); setShowReportsToMenu(false);
    setShowActivityMenu(false); setShowCategoryMenu(false); setShowLeaderMenu(false);
    setShowRequestorMenu(false); setShowVPMenu(false); setShowReqDeptMenu(false);
    setShowMonthMenu(false);
  };

  // Computes fixed dropdown position from the clicked button's bounding rect,
  // clamps to the right viewport edge, then opens the target menu.
  const openMenu = (e, setFn, currentlyOpen) => {
    e.stopPropagation();
    if (currentlyOpen) { closeAllMenus(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left, y = rect.bottom + 4;
    if (x + 224 > window.innerWidth) x = window.innerWidth - 224 - 10;
    setMenuPosition({ x, y });
    closeAllMenus();
    setFn(true);
  };

  // Adds or removes a value from a filter selection array
  const toggleSelection = (value, setFn, current) => {
    if (!value) return;
    setFn(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  /* ---------------------------------------------------------------------------
     EFFECT: SESSION VALIDATION
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      const token  = localStorage.getItem("token");
      if (!stored || !token) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
      setUser(JSON.parse(stored));
    } catch { router.push("/login"); }
  }, [router]);

  /* ---------------------------------------------------------------------------
     EFFECT: FETCH ASSIGNMENTS
     ---------------------------------------------------------------------------
     Fetches all assignments and the current user's assignments.
     All string fields are passed through sanitize() before storing in state.
     username is encoded to prevent injection in the query string.
     &ts=Date.now() cache-busts the URL to force a fresh fetch on re-navigation.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const res  = await api.get(`/assignments-allocations?username=${encodeURIComponent(user.username)}&ts=${Date.now()}`);
        const data = res?.data;
        if (!data) return;

        setMonths(data.months || []);

        // sanitize() applied to every string field — XSS defence-in-depth
        const mapRows = (source) => (source || []).map(r => ({
          emp_id:          r.employee.emp_id,
          resource_name:   sanitize(r.employee.emp_name),
          department:      sanitize(r.employee.dept_name),
          reports_to:      sanitize(r.employee.manager_name),
          activity:        sanitize(r.assignment.project_name),
          category:        sanitize(r.assignment.category),
          leader:          sanitize(r.assignment.leader),
          requestor:       sanitize(r.assignment.requestor),
          requestor_vp:    sanitize(r.assignment.requestor_vp),
          requesting_dept: sanitize(r.assignment.requesting_dept_name),
          allocations:     r.allocations || {},
        }));

        setAllRows(mapRows(data.allAssignments));
        setMyRows(mapRows(data.myAssignments));

      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    load();
  }, [user, refresh]);

  /* ---------------------------------------------------------------------------
     EFFECT: DEFAULT START MONTH + PAST MONTHS PICKER
     Runs once months are loaded. Defaults to the current month if available.
     Builds a 12-month lookback list for the month picker dropdown.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!months.length || startMonth) return;

    const now     = new Date();
    const current = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    setStartMonth(months.includes(current) ? current : months[0]);

    const past = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      past.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    setAvailablePastMonths(past);
  }, [months]);

  /* ---------------------------------------------------------------------------
     EFFECT: BUILD FILTER LISTS + APPLY FILTERS
     ---------------------------------------------------------------------------
     "All Assignments" scoping for Team Members:
       If myRows is populated, "All" is scoped to projects the current user is
       allocated to. This gives the team member context about teammates on the
       same projects without exposing unrelated projects.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    const base = activeTab === "mine" ? myRows : (() => {
      if (!myRows.length) return allRows;
      // Scope "All" to projects the current user is on — not the entire system
      const userPairs = new Set(myRows.map(r => `${r.activity}||${r.category}`));
      return allRows.filter(r => userPairs.has(`${r.activity}||${r.category}`));
    })();

    // Build unique option lists from the base rows
    const uniq = (arr) => [...new Set(arr)].filter(Boolean);
    setAvailableResources(uniq(base.map(r => r.resource_name)));
    setAvailableDepts(uniq(base.map(r => r.department)));
    setAvailableReportsTo(uniq(base.map(r => r.reports_to)));
    setAvailableActivities(uniq(base.map(r => r.activity)));
    setAvailableCategories(uniq(base.map(r => r.category)));
    setAvailableLeaders(uniq(base.map(r => r.leader)));
    setAvailableRequestors(uniq(base.map(r => r.requestor)));
    setAvailableRequestorVPs(uniq(base.map(r => r.requestor_vp)));
    setAvailableReqDepts(uniq(base.map(r => r.requesting_dept)));

    // Apply all active filters — empty array = no filter (show all)
    let filtered = base.filter(r =>
      (!selectedResources.length    || selectedResources.includes(r.resource_name))    &&
      (!selectedDepts.length        || selectedDepts.includes(r.department))            &&
      (!selectedReportsTo.length    || selectedReportsTo.includes(r.reports_to))        &&
      (!selectedActivities.length   || selectedActivities.includes(r.activity))         &&
      (!selectedCategories.length   || selectedCategories.includes(r.category))         &&
      (!selectedLeaders.length      || selectedLeaders.includes(r.leader))              &&
      (!selectedRequestors.length   || selectedRequestors.includes(r.requestor))        &&
      (!selectedRequestorVPs.length || selectedRequestorVPs.includes(r.requestor_vp))  &&
      (!selectedReqDepts.length     || selectedReqDepts.includes(r.requesting_dept))
    );

    if (resourceSort === "asc")  filtered.sort((a, b) => a.resource_name.localeCompare(b.resource_name));
    if (resourceSort === "desc") filtered.sort((a, b) => b.resource_name.localeCompare(a.resource_name));

    setFilteredRows(filtered);
  }, [
    activeTab, allRows, myRows, user,
    selectedResources, selectedDepts, selectedReportsTo, selectedActivities,
    selectedCategories, selectedLeaders, selectedRequestors, selectedRequestorVPs,
    selectedReqDepts, resourceSort,
  ]);

  /* ---------------------------------------------------------------------------
     EFFECT: CLOSE MENUS ON OUTSIDE CLICK
     Any click outside a .dropdown-menu element closes all open menus.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const handler = (e) => { if (!e.target.closest(".dropdown-menu")) closeAllMenus(); };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // Scroll the month picker to the selected month when it opens
  useEffect(() => {
    if (showMonthMenu && monthMenuRef.current) {
      const el = monthMenuRef.current.querySelector(`[data-month="${startMonth}"]`);
      if (el) el.scrollIntoView({ block: "center" });
    }
  }, [showMonthMenu, startMonth]);

  /* ---------------------------------------------------------------------------
     VISIBLE MONTHS — 16 columns starting from startMonth
  --------------------------------------------------------------------------- */
  const visibleMonths = (() => {
    if (!months.length || !startMonth) return [];
    const idx = months.indexOf(startMonth);
    return months.slice(idx < 0 ? 0 : idx, (idx < 0 ? 0 : idx) + 16);
  })();

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthLabel = (m) => `${monthNames[parseInt(m.slice(4, 6), 10) - 1]} ${m.slice(0, 4)}`;

  /* ---------------------------------------------------------------------------
     RENDER HELPER: renderMenuItems
     Renders "All" + option list for a filter dropdown.
     Optionally prepends A→Z / Z→A sort options for the Resource Name column.
  --------------------------------------------------------------------------- */
  const renderMenuItems = (available, selected, setSelected, sortOptions = false) => (
    <>
      {sortOptions && (
        <>
          {[{ val: "asc", label: "A → Z" }, { val: "desc", label: "Z → A" }].map(({ val, label }) => (
            <div key={val}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${resourceSort === val ? "font-bold" : ""}`}
              onClick={() => setResourceSort(resourceSort === val ? "" : val)}
            >
              <Checkbox checked={resourceSort === val} />{label}
            </div>
          ))}
          <div className="border-t my-1 dark:border-slate-600" />
        </>
      )}
      {/* "All" clears the filter for this column */}
      <div
        className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${selected.length === 0 ? "font-bold" : ""}`}
        onClick={() => setSelected([])}
      >
        <Checkbox checked={selected.length === 0} />All
      </div>
      {available.map(val => (
        <div key={val}
          className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${selected.includes(val) ? "font-bold" : ""}`}
          onClick={() => toggleSelection(val, setSelected, selected)}
        >
          <Checkbox checked={selected.includes(val)} />{val}
        </div>
      ))}
    </>
  );

  /* ---------------------------------------------------------------------------
     LOADING STATE
  --------------------------------------------------------------------------- */
  if (!user) {
    return (
      <div className="h-[600px] bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" />
      </div>
    );
  }

  /* ===========================================================================
     RENDER
     All cell values come from sanitized API data.
     No dangerouslySetInnerHTML — no XSS risk.
  =========================================================================== */
  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white" style={styles.outfitFont}>Assignments</h2>
          <button onClick={() => router.push("/team-member/dashboard")} className={btnDarkClass} style={styles.outfitFont}>
            Back to Dashboard
          </button>
        </div>

        {/* TAB BUTTONS — switching tabs clears all active filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {["all", "mine"].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                // Clear all filters so the new tab isn't pre-narrowed by the previous tab's selections
                setSelectedResources([]); setSelectedDepts([]); setSelectedReportsTo([]);
                setSelectedActivities([]); setSelectedCategories([]); setSelectedLeaders([]);
                setSelectedRequestors([]); setSelectedRequestorVPs([]); setSelectedReqDepts([]);
                setResourceSort("");
              }}
              aria-pressed={activeTab === tab}
              className={tabClass(activeTab === tab)}
              style={styles.outfitFont}
            >
              {{ all: "All Assignments", mine: "My Assignments" }[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* ASSIGNMENTS TABLE
          overflow-x-auto — horizontal scroll on narrow screens.
          max-h-[70vh] + overflow-y-auto — vertical scroll within the viewport.
          sticky thead — column headers stay visible while scrolling down. */}
      <div className="table-surface border rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-max w-full border-collapse text-sm">
            <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
              <tr>

                {/* RESOURCE NAME — includes sort options in its dropdown */}
                <th className="sticky left-0 top-0 z-[9999] px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB] min-w-[150px] bg-clip-padding" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Resource Name</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowResourceMenu, showResourceMenu)}>▼</button>
                  </div>
                  {showResourceMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableResources, selectedResources, setSelectedResources, true)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Department</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowDeptMenu, showDeptMenu)}>▼</button>
                  </div>
                  {showDeptMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableDepts, selectedDepts, setSelectedDepts)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Reports To</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowReportsToMenu, showReportsToMenu)}>▼</button>
                  </div>
                  {showReportsToMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableReportsTo, selectedReportsTo, setSelectedReportsTo)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Activity</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowActivityMenu, showActivityMenu)}>▼</button>
                  </div>
                  {showActivityMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableActivities, selectedActivities, setSelectedActivities)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Activity Category</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowCategoryMenu, showCategoryMenu)}>▼</button>
                  </div>
                  {showCategoryMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableCategories, selectedCategories, setSelectedCategories)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Leader Accountable</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowLeaderMenu, showLeaderMenu)}>▼</button>
                  </div>
                  {showLeaderMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableLeaders, selectedLeaders, setSelectedLeaders)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requestor</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowRequestorMenu, showRequestorMenu)}>▼</button>
                  </div>
                  {showRequestorMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableRequestors, selectedRequestors, setSelectedRequestors)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requestor VP</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowVPMenu, showVPMenu)}>▼</button>
                  </div>
                  {showVPMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableRequestorVPs, selectedRequestorVPs, setSelectedRequestorVPs)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requesting Dept</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowReqDeptMenu, showReqDeptMenu)}>▼</button>
                  </div>
                  {showReqDeptMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableReqDepts, selectedReqDepts, setSelectedReqDepts)}
                    </div>
                  )}
                </th>

                {/* MONTH COLUMNS — 16 visible from startMonth.
                    The ▼ button on the first month column opens the month picker. */}
                {visibleMonths.map((m, idx) => (
                  <th key={m} className="px-2 py-2 text-center text-white border-r border-black min-w-[60px] relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-center items-center gap-1">
                      <span>{formatMonth(m)}</span>
                      {idx === 0 && (
                        <button className={colBtnClass} onClick={(e) => openMenu(e, setShowMonthMenu, showMonthMenu)}>▼</button>
                      )}
                    </div>
                  </th>
                ))}

                {/* Month picker — fixed portal, scrolls to selected on open */}
                {showMonthMenu && (
                  <div ref={monthMenuRef} className={menuClass} style={{ position: "fixed", top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                    {[...availablePastMonths].reverse().map(m => (
                      <div key={m} data-month={m}
                        className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${startMonth === m ? "font-bold" : ""}`}
                        onClick={() => setStartMonth(m)}
                      >
                        <Checkbox checked={startMonth === m} />
                        {monthLabel(m)}
                      </div>
                    ))}
                  </div>
                )}

              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9 + visibleMonths.length} className="text-center py-8 text-gray-500 border" style={styles.outfitFont}>
                    No assignments found.
                  </td>
                </tr>
              ) : filteredRows.map((row, index) => (
                <tr key={index} className={`group transition-colors hover:bg-[#017ACB]/20 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <td className={`sticky left-0 z-20 px-4 py-2 border text-sm text-black whitespace-nowrap min-w-[150px] ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} group-hover:bg-[#017ACB]/20`} style={styles.outfitFont}>{row.resource_name}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.department}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.reports_to}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.activity}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.category}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.leader}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.requestor}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.requestor_vp}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.requesting_dept}</td>
                  {/* ?? "" renders blank instead of undefined/null for months with no allocation */}
                  {visibleMonths.map(m => (
                    <td key={m} className="px-2 py-2 border text-sm text-black text-center whitespace-nowrap" style={styles.outfitFont}>
                      {row.allocations[m] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
