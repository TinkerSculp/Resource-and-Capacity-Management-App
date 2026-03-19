"use client";

/* =============================================================================
   TeamMemberAssignmentsPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Read-only assignments view for Team Member users. Shows all assignments
     and their monthly allocations in a filterable, scrollable table.
     Supports "All Assignments" and "My Assignments" tabs with column filters.
     Uses the app-wide design system — neumorphic buttons, branded colours,
     Outfit font, colBtnClass filter buttons, and Checkbox component.
   ============================================================================= */

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";

const styles = { outfitFont: { fontFamily: "Outfit, sans-serif" } };

/* -----------------------------------------------------------------------------
   BUTTON CLASSES
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
  px-4 py-2 rounded text-sm border border-black/50
  ${isActive
    ? "bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700"
    : "bg-gray-200 text-gray-700 hover:bg-[#017ACB]/20"
  }
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  transition whitespace-nowrap
`;

const colBtnClass = `
  ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold
  border border-black/50 hover:bg-[#CDE6F7] transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.14)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.14)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.10),inset_0_-1px_2px_rgba(0,0,0,0.10)]
`;

const menuClass = `
  dropdown-menu fixed bg-white text-black shadow-lg rounded
  min-w-[12rem] w-max max-w-xs max-h-[min(60vh,420px)] overflow-y-auto
  z-[30000] border border-gray-300 pointer-events-auto
`;

/* -----------------------------------------------------------------------------
   HELPERS
----------------------------------------------------------------------------- */
function sanitize(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/script|onerror|onload|javascript:/gi, "")
    .trim();
}

function formatMonth(yyyymm) {
  const s = String(yyyymm);
  const date = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, 1);
  return date.toLocaleString("default", { month: "short" }) + "-" + s.slice(2, 4);
}

/* -----------------------------------------------------------------------------
   COMPONENT: Checkbox
----------------------------------------------------------------------------- */
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
  const refresh      = searchParams.get("refresh");

  const [user, setUser]         = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const [allRows, setAllRows]   = useState([]);
  const [myRows, setMyRows]     = useState([]);
  const [months, setMonths]     = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);

  // Sort
  const [resourceSort, setResourceSort] = useState("");

  // Filters
  const [selectedResources, setSelectedResources]         = useState([]);
  const [selectedDepts, setSelectedDepts]                 = useState([]);
  const [selectedReportsTo, setSelectedReportsTo]         = useState([]);
  const [selectedActivities, setSelectedActivities]       = useState([]);
  const [selectedCategories, setSelectedCategories]       = useState([]);
  const [selectedLeaders, setSelectedLeaders]             = useState([]);
  const [selectedRequestors, setSelectedRequestors]       = useState([]);
  const [selectedRequestorVPs, setSelectedRequestorVPs]   = useState([]);
  const [selectedReqDepts, setSelectedReqDepts]           = useState([]);

  // Available filter options
  const [availableResources, setAvailableResources]       = useState([]);
  const [availableDepts, setAvailableDepts]               = useState([]);
  const [availableReportsTo, setAvailableReportsTo]       = useState([]);
  const [availableActivities, setAvailableActivities]     = useState([]);
  const [availableCategories, setAvailableCategories]     = useState([]);
  const [availableLeaders, setAvailableLeaders]           = useState([]);
  const [availableRequestors, setAvailableRequestors]     = useState([]);
  const [availableRequestorVPs, setAvailableRequestorVPs] = useState([]);
  const [availableReqDepts, setAvailableReqDepts]         = useState([]);

  // Month picker
  const [startMonth, setStartMonth]         = useState(null);
  const [availablePastMonths, setAvailablePastMonths] = useState([]);

  // Dropdown menu state
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showResourceMenu, setShowResourceMenu]     = useState(false);
  const [showDeptMenu, setShowDeptMenu]             = useState(false);
  const [showReportsToMenu, setShowReportsToMenu]   = useState(false);
  const [showActivityMenu, setShowActivityMenu]     = useState(false);
  const [showCategoryMenu, setShowCategoryMenu]     = useState(false);
  const [showLeaderMenu, setShowLeaderMenu]         = useState(false);
  const [showRequestorMenu, setShowRequestorMenu]   = useState(false);
  const [showVPMenu, setShowVPMenu]                 = useState(false);
  const [showReqDeptMenu, setShowReqDeptMenu]       = useState(false);
  const [showMonthMenu, setShowMonthMenu]           = useState(false);
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
     EFFECT: AUTH
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      const token  = localStorage.getItem("token");
      if (!stored || !token) { localStorage.removeItem("user"); localStorage.removeItem("token"); router.push("/login"); return; }
      setUser(JSON.parse(stored));
    } catch { router.push("/login"); }
  }, [router]);

  /* ---------------------------------------------------------------------------
     EFFECT: FETCH DATA
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await api.get(`/assignments-allocations?username=${encodeURIComponent(user.username)}&ts=${Date.now()}`);
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

        const mappedAll  = mapRows(data.allAssignments);
        const mappedMine = mapRows(data.myAssignments);

        setAllRows(mappedAll);
        setMyRows(mappedMine);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    load();
  }, [user, refresh]);

  /* ---------------------------------------------------------------------------
     EFFECT: DEFAULT START MONTH
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!months.length || startMonth) return;
    const now = new Date();
    const current = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    setStartMonth(months.includes(current) ? current : months[0]);

    // Build 12 past months for picker
    const past = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      past.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    setAvailablePastMonths(past);
  }, [months]);

  /* ---------------------------------------------------------------------------
     EFFECT: BUILD FILTER LISTS + APPLY FILTERS
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    // For "All" tab, scope to projects the logged-in user is allocated to
    const base = activeTab === "mine" ? myRows : (() => {
      if (!myRows.length) return allRows;
      const userPairs = new Set(myRows.map(r => `${r.activity}||${r.category}`));
      return allRows.filter(r => userPairs.has(`${r.activity}||${r.category}`));
    })();

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
      (!selectedResources.length   || selectedResources.includes(r.resource_name))   &&
      (!selectedDepts.length       || selectedDepts.includes(r.department))           &&
      (!selectedReportsTo.length   || selectedReportsTo.includes(r.reports_to))       &&
      (!selectedActivities.length  || selectedActivities.includes(r.activity))        &&
      (!selectedCategories.length  || selectedCategories.includes(r.category))        &&
      (!selectedLeaders.length     || selectedLeaders.includes(r.leader))             &&
      (!selectedRequestors.length  || selectedRequestors.includes(r.requestor))       &&
      (!selectedRequestorVPs.length || selectedRequestorVPs.includes(r.requestor_vp)) &&
      (!selectedReqDepts.length    || selectedReqDepts.includes(r.requesting_dept))
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
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const handler = (e) => { if (!e.target.closest(".dropdown-menu")) closeAllMenus(); };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // Scroll month menu to selected item when it opens
  useEffect(() => {
    if (showMonthMenu && monthMenuRef.current) {
      const el = monthMenuRef.current.querySelector(`[data-month="${startMonth}"]`);
      if (el) el.scrollIntoView({ block: "center" });
    }
  }, [showMonthMenu, startMonth]);

  /* ---------------------------------------------------------------------------
     VISIBLE MONTHS — 16 from startMonth
  --------------------------------------------------------------------------- */
  const visibleMonths = (() => {
    if (!months.length || !startMonth) return [];
    const idx = months.indexOf(startMonth);
    return months.slice(idx < 0 ? 0 : idx, (idx < 0 ? 0 : idx) + 16);
  })();

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthLabel = (m) => `${monthNames[parseInt(m.slice(4, 6), 10) - 1]} ${m.slice(0, 4)}`;

  /* ---------------------------------------------------------------------------
     RENDER HELPER: dropdown menu items
  --------------------------------------------------------------------------- */
  const renderMenuItems = (available, selected, setSelected, sortOptions = false) => (
    <>
      {sortOptions && (
        <>
          {[{ val: "asc", label: "A → Z" }, { val: "desc", label: "Z → A" }].map(({ val, label }) => (
            <div key={val} className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${resourceSort === val ? "font-bold" : ""}`}
              onClick={() => setResourceSort(resourceSort === val ? "" : val)}>
              <Checkbox checked={resourceSort === val} />{label}
            </div>
          ))}
          <div className="border-t my-1" />
        </>
      )}
      <div className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${selected.length === 0 ? "font-bold" : ""}`}
        onClick={() => setSelected([])}>
        <Checkbox checked={selected.length === 0} />All
      </div>
      {available.map(val => (
        <div key={val} className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${selected.includes(val) ? "font-bold" : ""}`}
          onClick={() => toggleSelection(val, setSelected, selected)}>
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RENDER
  --------------------------------------------------------------------------- */
  return (
    <>
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white" style={styles.outfitFont}>Assignments</h2>
          <button onClick={() => router.push("/team-member/dashboard")} className={btnDarkClass} style={styles.outfitFont}>
            Back to Dashboard
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {["all", "mine"].map(tab => (
            <button key={tab} onClick={() => {
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

      {/* TABLE */}
      <div className="table-surface border rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-max w-full border-collapse text-sm">
            <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
              <tr>

                {/* RESOURCE NAME */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
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

                {/* DEPARTMENT */}
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

                {/* REPORTS TO */}
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

                {/* ACTIVITY */}
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

                {/* ACTIVITY CATEGORY */}
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

                {/* LEADER */}
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

                {/* REQUESTOR */}
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

                {/* REQUESTOR VP */}
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

                {/* REQUESTING DEPT */}
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

                {/* MONTH COLUMNS */}
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

                {/* Month picker portal */}
                {showMonthMenu && (
                  <div ref={monthMenuRef} className={menuClass} style={{ position: "fixed", top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                    {[...availablePastMonths].reverse().map(m => (
                      <div key={m}
                        data-month={m}
                        className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${startMonth === m ? "font-bold" : ""}`}
                        onClick={() => { setStartMonth(m); }}>
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
                <tr key={index} className={`transition-colors hover:bg-[#017ACB]/20 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.resource_name}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.department}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.reports_to}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.activity}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.category}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.leader}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.requestor}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.requestor_vp}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap" style={styles.outfitFont}>{row.requesting_dept}</td>
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