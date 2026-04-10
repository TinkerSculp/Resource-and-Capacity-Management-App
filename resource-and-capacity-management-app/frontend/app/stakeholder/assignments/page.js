"use client";

/* =============================================================================
   StakeholderAssignmentsPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Read-only assignments view for Stakeholder users (acc_type_id === 2).
     Displays assignments and their monthly FTE allocations in a filterable,
     horizontally scrollable table. Supports "All Assignments" and "My Assignments"
     tabs with per-column filter dropdowns.

   HOW IT WORKS:
     1. On mount, validates the session from localStorage
     2. Fetches the stakeholder's emp_name from the profile endpoint — needed to
        scope "My Assignments" by requestor name (not emp_id)
     3. Fetches all assignment rows from the backend
     4. "All Assignments" tab scopes to the Data Management department only
     5. "My Assignments" tab scopes to all rows on projects where the stakeholder
        is the requestor — first finds their requested projects, then shows all
        resources allocated to those projects
     6. Column filter dropdowns allow multi-select filtering within visible rows

   KEY DIFFERENCE FROM TEAM MEMBER VIEW:
     • "All Assignments" scopes to Data Mgmt department (not by project membership)
     • "My Assignments" scopes by requestor name (not by allocation membership)
     • Requires an extra profile fetch to resolve emp_name for requestor matching
     • No Edit button — Stakeholders cannot modify allocations

   SECURITY MODEL:
     • Session validated on mount — missing token or user redirects to /login.
     • Profile fetch is non-fatal — empName is "" by default and "My Assignments"
       returns empty rows rather than crashing if the fetch fails.
     • All string values from the API are passed through sanitize() before storing
       in state or rendering — XSS defence-in-depth.
     • username is passed through encodeURIComponent() in the API URL.
     • All rendered values are plain text — no dangerouslySetInnerHTML.
     • Filter option lists are built from server response data only.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter, useSearchParams
   ============================================================================= */

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";

const styles = { outfitFont: { fontFamily: "Outfit, sans-serif" } };

/* -----------------------------------------------------------------------------
   SHARED BUTTON + DROPDOWN CLASSES — neumorphic, matches all other pages.
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
  px-4 py-2 rounded text-sm
  border border-[#00263F]/50 dark:border-slate-500/60
  ${isActive
    ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100'
    : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 hover:text-gray-700 dark:hover:text-slate-100'
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

const colBtnClass = `
  ml-2 px-2 py-1 rounded text-xs font-bold
  bg-white dark:bg-slate-700
  text-[#017ACB] dark:text-[#4DAEFF]
  border border-black/50 dark:border-slate-500
  hover:bg-[#CDE6F7] dark:hover:bg-slate-600
  transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.14)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.14)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.10),inset_0_-1px_2px_rgba(0,0,0,0.10)]
`;

const menuClass = `
  dropdown-menu fixed bg-white dark:bg-slate-800 text-black dark:text-slate-100 shadow-lg rounded
  min-w-[12rem] w-max max-w-xs max-h-[min(80vh,580px)] overflow-y-auto
  z-[30000] border border-gray-300 dark:border-slate-600 pointer-events-auto
`;

/* =============================================================================
   UTILITY: sanitize
   Strips control characters, HTML tags, and script injection patterns from
   API response strings. Applied to every string field in mapRows.
   ============================================================================= */
function sanitize(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/script|onerror|onload|javascript:/gi, "")
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
   COMPONENT: Checkbox — custom styled, consistent with app design system.
   ============================================================================= */
const Checkbox = ({ checked }) => (
  <span className="w-4 h-4 border border-black dark:border-slate-400 rounded-sm flex items-center justify-center relative overflow-hidden flex-shrink-0">
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
export default function StakeholderAssignmentsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refresh      = searchParams.get("refresh");

  /* ---------------------------------------------------------------------------
     STATE
  --------------------------------------------------------------------------- */
  const [user, setUser]           = useState(null);
  const [empName, setEmpName]     = useState(""); 
  const [activeTab, setActiveTab] = useState("all");

  const [allRows, setAllRows]         = useState([]);
  const [myRows, setMyRows]           = useState([]);
  const [months, setMonths]           = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);

  const [resourceSort, setResourceSort] = useState("");

  const [selectedResources, setSelectedResources]       = useState([]);
  const [selectedDepts, setSelectedDepts]               = useState([]);
  const [selectedReportsTo, setSelectedReportsTo]       = useState([]);
  const [selectedActivities, setSelectedActivities]     = useState([]);
  const [selectedCategories, setSelectedCategories]     = useState([]);
  const [selectedLeaders, setSelectedLeaders]           = useState([]);
  const [selectedRequestors, setSelectedRequestors]     = useState([]);
  const [selectedRequestorVPs, setSelectedRequestorVPs] = useState([]);
  const [selectedReqDepts, setSelectedReqDepts]         = useState([]);

  const [availableResources, setAvailableResources]       = useState([]);
  const [availableDepts, setAvailableDepts]               = useState([]);
  const [availableReportsTo, setAvailableReportsTo]       = useState([]);
  const [availableActivities, setAvailableActivities]     = useState([]);
  const [availableCategories, setAvailableCategories]     = useState([]);
  const [availableLeaders, setAvailableLeaders]           = useState([]);
  const [availableRequestors, setAvailableRequestors]     = useState([]);
  const [availableRequestorVPs, setAvailableRequestorVPs] = useState([]);
  const [availableReqDepts, setAvailableReqDepts]         = useState([]);

  const [startMonth, setStartMonth]             = useState(null);
  const [availablePastMonths, setAvailablePastMonths] = useState([]);

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
     HELPERS
  --------------------------------------------------------------------------- */
  const closeAllMenus = () => {
    setShowResourceMenu(false); setShowDeptMenu(false); setShowReportsToMenu(false);
    setShowActivityMenu(false); setShowCategoryMenu(false); setShowLeaderMenu(false);
    setShowRequestorMenu(false); setShowVPMenu(false); setShowReqDeptMenu(false);
    setShowMonthMenu(false);
  };

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
     EFFECT: FETCH EMP_NAME FROM PROFILE
     ---------------------------------------------------------------------------
     Stakeholders scope "My Assignments" by requestor name (not emp_id), so we
     need to resolve the display name from the profile endpoint. This fetch is
     non-fatal — if it fails, empName stays "" and "My Assignments" returns [].
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const res = await api.get(`/profile?username=${encodeURIComponent(user.username)}`);
        if (res?.data?.name) setEmpName(res.data.name);
      } catch { /* non-fatal — My Assignments returns empty if empName is unresolved */ }
    };
    loadProfile();
  }, [user]);

  /* ---------------------------------------------------------------------------
     EFFECT: FETCH ASSIGNMENT ROWS
     sanitize() applied to every string field — XSS defence-in-depth.
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
     Tab scoping differs from the Team Member view:

     "All Assignments":
       Scoped to Data Management department (dept_name === "Data Mgmt") — the
       stakeholder sees the full DM team's allocations across all projects.

     "My Assignments":
       1. Find all projects where the stakeholder is the requestor (by emp_name)
       2. Return all resources allocated to those projects
       This gives the stakeholder visibility into who is working on their requests.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    const base = activeTab === "mine" ? (() => {
      if (!empName) return []; // empName not yet resolved — return empty
      // Find all projects this stakeholder has requested
      const myRequestedProjects = new Set(
        allRows.filter(r => r.requestor === empName).map(r => r.activity)
      );
      // Return all resources allocated to those projects
      return myRequestedProjects.size
        ? allRows.filter(r => myRequestedProjects.has(r.activity))
        : [];
    })() : allRows.filter(r => r.department === "Data Mgmt"); // "All" = Data Mgmt dept only

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
    selectedReqDepts, resourceSort, empName,
  ]);

  /* ---------------------------------------------------------------------------
     EFFECT: CLOSE MENUS ON OUTSIDE CLICK
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const handler = (e) => { if (!e.target.closest(".dropdown-menu")) closeAllMenus(); };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT: AUTO-SCROLL MONTH MENU TO START MONTH
  --------------------------------------------------------------------------- */
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
  --------------------------------------------------------------------------- */
  const renderMenuItems = (available, selected, setSelected, sortOptions = false) => (
    <>
      {sortOptions && (
        <>
          {[{ val: "asc", label: "A → Z" }, { val: "desc", label: "Z → A" }].map(({ val, label }) => (
            <div key={val}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 dark:text-slate-100 ${resourceSort === val ? "font-bold" : ""}`}
              onClick={() => setResourceSort(resourceSort === val ? "" : val)}
            >
              <Checkbox checked={resourceSort === val} />{label}
            </div>
          ))}
          <div className="border-t my-1 dark:border-slate-600" />
        </>
      )}
      <div
        className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 dark:text-slate-100 ${selected.length === 0 ? "font-bold" : ""}`}
        onClick={() => setSelected([])}
      >
        <Checkbox checked={selected.length === 0} />All
      </div>
      {available.map(val => (
        <div key={val}
          className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 dark:text-slate-100 ${selected.includes(val) ? "font-bold" : ""}`}
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
      <div className="h-[600px] bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" />
      </div>
    );
  }

  /* ===========================================================================
     RENDER — all cell values from sanitized API data, no dangerouslySetInnerHTML.
  =========================================================================== */
  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white" style={styles.outfitFont}>Assignments</h2>
          <button onClick={() => router.push("/stakeholder/dashboard")} className={btnDarkClass} style={styles.outfitFont}>
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

      {/* ASSIGNMENTS TABLE */}
      <div className="table-surface border dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-max w-full border-collapse text-sm">
            <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
              <tr>

                <th className="px-4 py-2 border border-black text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
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

                <th className="px-4 py-2 border border-black text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
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

                <th className="px-4 py-2 border border-black text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
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

                <th className="px-4 py-2 border border-black text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
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

                <th className="px-4 py-2 border border-black text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
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

                <th className="px-4 py-2 border border-black text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
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

                <th className="px-4 py-2 border border-black text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
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

                <th className="px-4 py-2 border border-black text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
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

                <th className="px-4 py-2 border border-black text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
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

                {/* MONTH COLUMNS — 16 visible from startMonth */}
                {visibleMonths.map((m, idx) => (
                  <th key={m} className="px-2 py-2 text-center text-white border-r border-black min-w-[60px] relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-center items-center gap-1">
                      <span>{formatMonth(m)}</span>
                      {idx === 0 && (
                        <button className={colBtnClass} onClick={(e) => openMenu(e, setShowMonthMenu, showMonthMenu)}>▼</button>
                      )}
                    </div>
                    {idx === 0 && showMonthMenu && (
                      <div ref={monthMenuRef} className={menuClass} style={{ position: "fixed", top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                        {[...availablePastMonths].reverse().map(m => (
                          <div key={m} data-month={m}
                            className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 dark:text-slate-100 ${startMonth === m ? "font-bold" : ""}`}
                            onClick={() => setStartMonth(m)}
                          >
                            <Checkbox checked={startMonth === m} />
                            {monthLabel(m)}
                          </div>
                        ))}
                      </div>
                    )}
                  </th>
                ))}

              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9 + visibleMonths.length} className="text-center py-8 text-gray-500 dark:text-slate-400 border border-black dark:border-slate-700" style={styles.outfitFont}>
                    No assignments found.
                  </td>
                </tr>
              ) : filteredRows.map((row, index) => (
                <tr key={index} className={`transition-colors hover:bg-[#017ACB]/10 dark:hover:bg-[#017ACB]/20 border-t border-black dark:border-slate-700 ${index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-gray-50 dark:bg-slate-800/60"}`}>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.resource_name}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.department}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.reports_to}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.activity}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.category}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.leader}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.requestor}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.requestor_vp}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.requesting_dept}</td>
                  {visibleMonths.map(m => (
                    <td key={m} className="px-2 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 text-center whitespace-nowrap bg-inherit" style={styles.outfitFont}>
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