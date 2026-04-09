"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";

const styles = { outfitFont: { fontFamily: "Outfit, sans-serif" } };

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

function sanitize(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/script|onerror|onload|javascript:/gi, "")
    .trim();
}

function formatMonth(yyyymm) {
  const s    = String(yyyymm);
  const date = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, 1);
  return date.toLocaleString("default", { month: "short" }) + "-" + s.slice(2, 4);
}

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

export default function TeamMemberAssignmentsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refresh      = searchParams.get("refresh");

  const [user, setUser]           = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const [allRows, setAllRows]           = useState([]);
  const [myRows, setMyRows]             = useState([]);
  const [months, setMonths]             = useState([]);
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

  const [startMonth, setStartMonth]               = useState(null);
  const [availablePastMonths, setAvailablePastMonths] = useState([]);

  const [menuPosition, setMenuPosition]           = useState({ x: 0, y: 0 });
  const [showResourceMenu, setShowResourceMenu]   = useState(false);
  const [showDeptMenu, setShowDeptMenu]           = useState(false);
  const [showReportsToMenu, setShowReportsToMenu] = useState(false);
  const [showActivityMenu, setShowActivityMenu]   = useState(false);
  const [showCategoryMenu, setShowCategoryMenu]   = useState(false);
  const [showLeaderMenu, setShowLeaderMenu]       = useState(false);
  const [showRequestorMenu, setShowRequestorMenu] = useState(false);
  const [showVPMenu, setShowVPMenu]               = useState(false);
  const [showReqDeptMenu, setShowReqDeptMenu]     = useState(false);
  const [showMonthMenu, setShowMonthMenu]         = useState(false);
  const monthMenuRef = useRef(null);

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      const token  = localStorage.getItem("token");
      if (!stored || !token) { localStorage.removeItem("user"); localStorage.removeItem("token"); router.push("/login"); return; }
      setUser(JSON.parse(stored));
    } catch { router.push("/login"); }
  }, [router]);

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
      } catch (err) { console.error("Fetch error:", err); }
    };
    load();
  }, [user, refresh]);

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

  useEffect(() => {
    if (!user) return;
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
  }, [activeTab, allRows, myRows, user, selectedResources, selectedDepts, selectedReportsTo, selectedActivities, selectedCategories, selectedLeaders, selectedRequestors, selectedRequestorVPs, selectedReqDepts, resourceSort]);

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest(".dropdown-menu")) closeAllMenus(); };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    if (showMonthMenu && monthMenuRef.current) {
      const el = monthMenuRef.current.querySelector(`[data-month="${startMonth}"]`);
      if (el) el.scrollIntoView({ block: "center" });
    }
  }, [showMonthMenu, startMonth]);

  const visibleMonths = (() => {
    if (!months.length || !startMonth) return [];
    const idx = months.indexOf(startMonth);
    return months.slice(idx < 0 ? 0 : idx, (idx < 0 ? 0 : idx) + 16);
  })();

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthLabel = (m) => `${monthNames[parseInt(m.slice(4, 6), 10) - 1]} ${m.slice(0, 4)}`;

  const renderMenuItems = (available, selected, setSelected, sortOptions = false) => (
    <>
      {sortOptions && (
        <>
          {[{ val: "asc", label: "A → Z" }, { val: "desc", label: "Z → A" }].map(({ val, label }) => (
            <div key={val} className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 dark:text-slate-100 ${resourceSort === val ? "font-bold" : ""}`} onClick={() => setResourceSort(resourceSort === val ? "" : val)}>
              <Checkbox checked={resourceSort === val} />{label}
            </div>
          ))}
          <div className="border-t my-1 dark:border-slate-600" />
        </>
      )}
      <div className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 dark:text-slate-100 ${selected.length === 0 ? "font-bold" : ""}`} onClick={() => setSelected([])}>
        <Checkbox checked={selected.length === 0} />All
      </div>
      {available.map(val => (
        <div key={val} className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 dark:text-slate-100 ${selected.includes(val) ? "font-bold" : ""}`} onClick={() => toggleSelection(val, setSelected, selected)}>
          <Checkbox checked={selected.includes(val)} />{val}
        </div>
      ))}
    </>
  );

  if (!user) return (
    <div className="h-[600px] bg-white dark:bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" />
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white" style={styles.outfitFont}>Assignments</h2>
          <button onClick={() => router.push("/team-member/dashboard")} className={btnDarkClass} style={styles.outfitFont}>Back to Dashboard</button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {["all", "mine"].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setSelectedResources([]); setSelectedDepts([]); setSelectedReportsTo([]); setSelectedActivities([]); setSelectedCategories([]); setSelectedLeaders([]); setSelectedRequestors([]); setSelectedRequestorVPs([]); setSelectedReqDepts([]); setResourceSort(""); }} aria-pressed={activeTab === tab} className={tabClass(activeTab === tab)} style={styles.outfitFont}>
              {{ all: "All Assignments", mine: "My Assignments" }[tab]}
            </button>
          ))}
        </div>
      </div>

      <div className="table-surface border dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-max w-full border-collapse text-sm">
            <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
              <tr>
                <th className="sticky left-0 top-0 z-[9999] px-4 py-2 border border-black text-sm font-semibold whitespace-nowrap bg-[#017ACB] min-w-[150px] bg-clip-padding" style={styles.outfitFont}>
                  <div className="flex justify-between items-center"><span>Resource Name</span><button className={colBtnClass} onClick={(e) => openMenu(e, setShowResourceMenu, showResourceMenu)}>▼</button></div>
                  {showResourceMenu && <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>{renderMenuItems(availableResources, selectedResources, setSelectedResources, true)}</div>}
                </th>
                {[
                  [showDeptMenu,       setShowDeptMenu,       availableDepts,        selectedDepts,        setSelectedDepts,        "Department"],
                  [showReportsToMenu,  setShowReportsToMenu,  availableReportsTo,    selectedReportsTo,    setSelectedReportsTo,    "Reports To"],
                  [showActivityMenu,   setShowActivityMenu,   availableActivities,   selectedActivities,   setSelectedActivities,   "Activity"],
                  [showCategoryMenu,   setShowCategoryMenu,   availableCategories,   selectedCategories,   setSelectedCategories,   "Activity Category"],
                  [showLeaderMenu,     setShowLeaderMenu,     availableLeaders,      selectedLeaders,      setSelectedLeaders,      "Leader Accountable"],
                  [showRequestorMenu,  setShowRequestorMenu,  availableRequestors,   selectedRequestors,   setSelectedRequestors,   "Requestor"],
                  [showVPMenu,         setShowVPMenu,         availableRequestorVPs, selectedRequestorVPs, setSelectedRequestorVPs, "Requestor VP"],
                  [showReqDeptMenu,    setShowReqDeptMenu,    availableReqDepts,     selectedReqDepts,     setSelectedReqDepts,     "Requesting Dept"],
                ].map(([showMenu, setMenu, avail, sel, setSel, label]) => (
                  <th key={label} className="px-4 py-2 border border-black text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center"><span>{label}</span><button className={colBtnClass} onClick={(e) => openMenu(e, setMenu, showMenu)}>▼</button></div>
                    {showMenu && <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>{renderMenuItems(avail, sel, setSel)}</div>}
                  </th>
                ))}
                {visibleMonths.map((m, idx) => (
                  <th key={m} className="px-2 py-2 text-center text-white border-r border-black min-w-[60px] relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-center items-center gap-1">
                      <span>{formatMonth(m)}</span>
                      {idx === 0 && <button className={colBtnClass} onClick={(e) => openMenu(e, setShowMonthMenu, showMonthMenu)}>▼</button>}
                    </div>
                    {idx === 0 && showMonthMenu && (
                      <div ref={monthMenuRef} className={menuClass} style={{ position: "fixed", top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                        {[...availablePastMonths].reverse().map(m => (
                          <div key={m} data-month={m} className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 dark:text-slate-100 ${startMonth === m ? "font-bold" : ""}`} onClick={() => setStartMonth(m)}>
                            <Checkbox checked={startMonth === m} />{monthLabel(m)}
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
                <tr><td colSpan={9 + visibleMonths.length} className="text-center py-8 text-gray-500 dark:text-slate-400 border border-black dark:border-slate-700" style={styles.outfitFont}>No assignments found.</td></tr>
              ) : filteredRows.map((row, index) => (
                <tr key={index} className={`group transition-colors hover:bg-[#017ACB]/10 dark:hover:bg-[#017ACB]/20 border-t border-black dark:border-slate-700 ${index % 2 === 0 ? "bg-white dark:bg-[#212121]" : "bg-gray-50 dark:bg-[#212121]"}`}>
                  <td className={`sticky left-0 z-20 px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap min-w-[150px] ${index % 2 === 0 ? "bg-white dark:bg-[#212121]" : "bg-gray-50 dark:bg-[#212121]"} group-hover:bg-[#017ACB]/10 dark:group-hover:bg-[#212121]`} style={styles.outfitFont}>{row.resource_name}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.department}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.reports_to}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.activity}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.category}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.leader}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.requestor}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.requestor_vp}</td>
                  <td className="px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.requesting_dept}</td>
                  {visibleMonths.map(m => (
                    <td key={m} className="px-2 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 text-center whitespace-nowrap bg-inherit" style={styles.outfitFont}>{row.allocations[m] ?? ""}</td>
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
