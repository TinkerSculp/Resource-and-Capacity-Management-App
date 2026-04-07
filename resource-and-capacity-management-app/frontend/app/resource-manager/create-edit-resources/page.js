"use client";

/* =============================================================================
   ResourcesPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays all employees in the Data Management department with their monthly
     capacity values in a scrollable, filterable table. Supports:
       • "All" and "Mine" tab views
       • Column filter dropdowns (name, title, reports to, manager level,
         director level, status)
       • Name sort (A→Z / Z→A)
       • Start month selector — shows 16 months forward from the chosen month
       • Inline capacity editing — click a cell to edit, blur/enter to save
       • Row highlight on click

   HOW IT WORKS:
     1. On mount, generates the month options and reads the user session
     2. Loads all employees, departments, and managers in parallel
     3. Fetches capacity for each employee and attaches it to the employee object
     4. Filters employees to the Data Management department
     5. On tab/filter/sort changes, re-runs the filter effect
     6. Inline edits call PUT /resources/employees/:id/capacity and update
        the local state optimistically on success

   CAPACITY EDITING:
     • Clicking a month cell opens an inline <input> with min=0 max=1 step=0.25
     • Blur or Enter saves; Escape cancels
     • Empty input = clear the capacity record (DELETE on backend)
     • Values outside 0–1 are rejected with an error banner
     • The backend uses upsert — creates the record if it doesn't exist

   FIX — "No employees found" CENTRING:
     The empty state <td> uses a combination of position:sticky left + a fixed
     width approach so the message stays visually centred in the viewport even
     when the table is wider than the screen and has been scrolled horizontally.

   SECURITY MODEL:
     • localStorage read inside try/catch — malformed JSON sets user to null.
     • All fetch errors are caught and set a visible error banner — never crash.
     • Capacity save validates 0–1 range before sending — rejects NaN and negatives.
     • Filter option lists are built from server response data only.
     • emp_id in API URLs comes from server-sourced employee data, never user input.
     • Error messages rendered as plain text — no dangerouslySetInnerHTML.
     • Filter dropdown menus use createPortal + fixed positioning — never push
       content on small screens or get clipped by overflow containers.

   RESPONSIVENESS:
     • h-[600px] outer container — fixed height, scrollable table inside.
     • overflow-x-auto + overflow-y-auto + max-h-[70vh] — scrolls both axes.
     • Sticky left-0 on Edit column — always visible while scrolling right.
     • min-w-[60px] on month columns — readable on all screen sizes.

   DEPENDENCIES:
     • next/navigation — useRouter, useSearchParams
     • next/link       — Link for Edit and Create Resource buttons
     • react-dom       — createPortal for dropdown menus rendered to document.body
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
   ============================================================================= */

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import api from "@/lib/api";

const styles = { outfitFont: { fontFamily: "Outfit, sans-serif" } };

const DEPARTMENT_FILTER_NAME = "Data Mgmt";

const btnClass = `
  px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

const btnDarkClass = `
  px-4 py-2 rounded text-sm
  bg-[#003A5C] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

const tabClass = (isActive) => `
  px-6 py-2 rounded text-sm border border-black/50
  ${isActive
    ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
    : 'bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20'
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
  shadow-[4px_4px_10px_rgba(0,0,0,0.22),-4px_-4px_10px_rgba(255,255,255,0.12)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.22),-2px_-2px_6px_rgba(255,255,255,0.12)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.08)]
`;

/* =============================================================================
   COMPONENT: Checkbox
   ============================================================================= */
function Checkbox({ checked }) {
  return (
    <span className="w-4 h-4 border border-black rounded-sm flex items-center justify-center relative overflow-hidden flex-shrink-0">
      <input type="checkbox" checked={checked} readOnly className="opacity-0 absolute w-4 h-4 cursor-pointer" />
      {checked && (
        <>
          <span className="absolute inset-0" style={{ backgroundColor: "#003A5C" }} />
          <svg className="absolute w-3 h-3 text-white" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 11 8 15 16 6" />
          </svg>
        </>
      )}
    </span>
  );
}

/* =============================================================================
   MAIN COMPONENT
   ============================================================================= */
export default function ResourcesPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refresh      = searchParams.get("refresh");

  /* ---------------------------------------------------------------------------
     STATE
  --------------------------------------------------------------------------- */
  const [user, setUser]                                         = useState(null);
  const [employees, setEmployees]                               = useState([]);
  const [employeesWithCapacity, setEmployeesWithCapacity]       = useState([]);
  const [allEmployeesWithCapacity, setAllEmployeesWithCapacity] = useState([]);
  const [departments, setDepartments]                           = useState([]);
  const [managers, setManagers]                                 = useState([]);

  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [portalReady, setPortalReady] = useState(false);

  const [activeFilter, setActiveFilter]   = useState("all");
  const [searchTerm, setSearchTerm]       = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  const [editingCell, setEditingCell]   = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const [selectedNames, setSelectedNames]                     = useState([]);
  const [selectedTitles, setSelectedTitles]                   = useState([]);
  const [selectedReportsTo, setSelectedReportsTo]             = useState([]);
  const [selectedCurrentStatuses, setSelectedCurrentStatuses] = useState([]);
  const [selectedManagerLevels, setSelectedManagerLevels]     = useState([]);
  const [selectedDirectorLevels, setSelectedDirectorLevels]   = useState([]);

  const [nameSort, setNameSort] = useState("none");

  const [showNameMenu, setShowNameMenu]                   = useState(false);
  const [showTitleMenu, setShowTitleMenu]                 = useState(false);
  const [showReportsToMenu, setShowReportsToMenu]         = useState(false);
  const [showCurrentStatusMenu, setShowCurrentStatusMenu] = useState(false);
  const [showManagerLevelMenu, setShowManagerLevelMenu]   = useState(false);
  const [showDirectorLevelMenu, setShowDirectorLevelMenu] = useState(false);
  const [showMonthMenu, setShowMonthMenu]                 = useState(false);
  const [menuPosition, setMenuPosition]                   = useState({ x: 0, y: 0 });

  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthOptions, setMonthOptions]   = useState([]);
  const [visibleMonths, setVisibleMonths] = useState([]);
  const monthMenuRef                      = useRef(null);

  const [availableNames, setAvailableNames]                     = useState([]);
  const [availableTitles, setAvailableTitles]                   = useState([]);
  const [availableReportsTo, setAvailableReportsTo]             = useState([]);
  const [availableCurrentStatuses, setAvailableCurrentStatuses] = useState([]);
  const [availableManagerLevels, setAvailableManagerLevels]     = useState([]);
  const [availableDirectorLevels, setAvailableDirectorLevels]   = useState([]);

  // Ref to the scrollable table wrapper — used to compute viewport-centred empty state
  const tableWrapperRef = useRef(null);

  /* ---------------------------------------------------------------------------
     HELPERS
  --------------------------------------------------------------------------- */
  const closeAllMenus = () => {
    setShowNameMenu(false); setShowTitleMenu(false); setShowReportsToMenu(false);
    setShowCurrentStatusMenu(false); setShowManagerLevelMenu(false);
    setShowDirectorLevelMenu(false); setShowMonthMenu(false);
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
    setFn(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  /* ---------------------------------------------------------------------------
     MONTH HELPERS
  --------------------------------------------------------------------------- */
  function generate12MonthsBackward() {
    const arr = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() * 100 + (d.getMonth() + 1);
      arr.push({ key, label: d.toLocaleString("default", { month: "long", year: "numeric" }), date: d });
    }
    return arr;
  }

  function generate16MonthsForward(startDate) {
    const arr = [];
    for (let i = 0; i < 16; i++) {
      const d   = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const key = d.getFullYear() * 100 + (d.getMonth() + 1);
      arr.push({
        key,
        label: d.toLocaleString("default", { month: "short" }) + "-" + String(d.getFullYear()).slice(-2),
        date: d,
      });
    }
    return arr;
  }

  const handleMonthSelect = (monthObj) => {
    setSelectedMonth(monthObj);
    setVisibleMonths(generate16MonthsForward(monthObj.date));
    setShowMonthMenu(false);
  };

  /* ---------------------------------------------------------------------------
     EFFECTS: SETUP
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const backward = generate12MonthsBackward();
    setMonthOptions(backward);
    const current = backward[0];
    setSelectedMonth(current);
    setVisibleMonths(generate16MonthsForward(current.date));
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch { setUser(null); }
  }, []);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest(".dropdown-menu")) closeAllMenus(); };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    if (showMonthMenu && monthMenuRef.current) {
      const el = monthMenuRef.current.querySelector(`[data-month-key="${selectedMonth?.key}"]`);
      if (el) el.scrollIntoView({ block: "center" });
    }
  }, [showMonthMenu, selectedMonth]);

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD EMPLOYEES + CAPACITY
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [{ data: empData }, { data: deptData }, { data: mgrData }] = await Promise.all([
          api.get("/resources/employees"),
          api.get("/resources/departments"),
          api.get("/resources/managers"),
        ]);

        const employeesRaw   = Array.isArray(empData)  ? empData  : [];
        const departmentsRaw = Array.isArray(deptData) ? deptData : [];
        const managersRaw    = Array.isArray(mgrData)  ? mgrData  : [];

        setDepartments(departmentsRaw);
        setManagers(managersRaw);

        const withCap = await Promise.all(
          employeesRaw.map(async emp => {
            try {
              const { data: capData } = await api.get(`/resources/employees/${emp.emp_id}/capacity`);
              const cap = {};
              (Array.isArray(capData) ? capData : []).forEach(c => {
                cap[c.date] = { amount: typeof c.amount === "number" ? c.amount : null };
              });
              return { ...emp, capacity: cap };
            } catch {
              return { ...emp, capacity: {} };
            }
          })
        );

        const filtered = withCap.filter(emp => {
          const dept = departmentsRaw.find(d => d.dept_no === emp.dept_no);
          return dept?.dept_name?.toLowerCase() === DEPARTMENT_FILTER_NAME.toLowerCase();
        });

        setAllEmployeesWithCapacity(withCap);
        setEmployeesWithCapacity(filtered);
        setEmployees(filtered);
        setError("");

      } catch {
        setError("Failed to load data. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [refresh]);

  /* ---------------------------------------------------------------------------
     EFFECT: BUILD FILTER OPTION LISTS
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const source = (activeFilter === "mine" && user)
      ? employeesWithCapacity.filter(emp => String(emp.emp_id) === String(user.emp_id))
      : employeesWithCapacity;

    const uniq          = (arr) => [...new Set(arr)].filter(Boolean);
    const getReportsTo  = (id) => allEmployeesWithCapacity.find(e => String(e.emp_id) === String(id))?.emp_name || null;
    const getLevelLocal = (id) => { if (!id && id !== 0) return ""; return managers.find(m => String(m.emp_id) === String(id))?.emp_name || ""; };

    setAvailableNames(uniq(source.map(e => e.emp_name)));
    setAvailableTitles(uniq(source.map(e => e.emp_title)));
    setAvailableReportsTo(uniq(source.map(e => getReportsTo(e.reports_to))));
    setAvailableCurrentStatuses(uniq(source.map(e => e.current_status || "Active")));
    setAvailableManagerLevels(uniq(source.map(e => getLevelLocal(e.manager_level))));
    setAvailableDirectorLevels(uniq(source.map(e => getLevelLocal(e.director_level))));
  }, [activeFilter, employeesWithCapacity, allEmployeesWithCapacity, managers, user]);

  /* ---------------------------------------------------------------------------
     EFFECT: MAIN FILTERING + SORT
  --------------------------------------------------------------------------- */
  useEffect(() => {
    let filtered = [...employeesWithCapacity];

    if (activeFilter === "mine" && user) {
      filtered = filtered.filter(emp => String(emp.emp_id) === String(user.emp_id));
    }

    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.emp_name.toLowerCase().includes(t) || e.emp_title.toLowerCase().includes(t)
      );
    }

    filtered = filtered.filter(e => {
      const dept = departments.find(d => d.dept_no === e.dept_no);
      return dept?.dept_name?.toLowerCase() === DEPARTMENT_FILTER_NAME.toLowerCase();
    });

    if (selectedNames.length > 0)           filtered = filtered.filter(e => selectedNames.includes(e.emp_name));
    if (selectedTitles.length > 0)          filtered = filtered.filter(e => selectedTitles.includes(e.emp_title));
    if (selectedReportsTo.length > 0)       filtered = filtered.filter(e => selectedReportsTo.includes(getReportsToName(e)));
    if (selectedCurrentStatuses.length > 0) filtered = filtered.filter(e => selectedCurrentStatuses.includes(getCurrentStatus(e)));
    if (selectedManagerLevels.length > 0)   filtered = filtered.filter(e => selectedManagerLevels.includes(getLevelName(e.manager_level)));
    if (selectedDirectorLevels.length > 0)  filtered = filtered.filter(e => selectedDirectorLevels.includes(getLevelName(e.director_level)));

    if (nameSort === "asc")  filtered.sort((a, b) => a.emp_name.localeCompare(b.emp_name));
    if (nameSort === "desc") filtered.sort((a, b) => b.emp_name.localeCompare(a.emp_name));

    setEmployees(filtered);
  }, [
    employeesWithCapacity, activeFilter, searchTerm, user, nameSort,
    selectedNames, selectedTitles, selectedReportsTo,
    selectedCurrentStatuses, selectedManagerLevels, selectedDirectorLevels,
    departments,
  ]);

  /* ---------------------------------------------------------------------------
     DISPLAY HELPERS
  --------------------------------------------------------------------------- */
  const getDepartmentName = (deptNo) =>
    departments.find(d => d.dept_no === deptNo)?.dept_name || deptNo;

  const getReportsToName = (emp) =>
    allEmployeesWithCapacity.find(e => String(e.emp_id) === String(emp.reports_to))?.emp_name || "-";

  const getLevelName = (id) => {
    if (!id && id !== 0) return "";
    return managers.find(m => String(m.emp_id) === String(id))?.emp_name || String(id);
  };

  const getCurrentStatus = (emp) => emp.current_status || "Active";

  const getMonthValue = (emp, key) => {
    const val = emp.capacity?.[key]?.amount;
    return typeof val === "number" ? val : "";
  };

  /* ---------------------------------------------------------------------------
     CELL EDIT HANDLERS
  --------------------------------------------------------------------------- */
  const startEditMonth  = (emp, key) => {
    setEditingCell({ empId: emp.emp_id, monthKey: key });
    const v = getMonthValue(emp, key);
    setEditingValue(v === "" ? "" : String(v));
  };

  const cancelEditMonth = () => { setEditingCell(null); setEditingValue(""); };

  const saveMonthValue = async (emp, key) => {
    const raw = editingValue.trim();

    if (raw === "") {
      try {
        await api.put(`/resources/employees/${emp.emp_id}/capacity`, {
          capacityEntries: [{ date: key, amount: null }],
        });
        setEmployeesWithCapacity(prev =>
          prev.map(e => e.emp_id === emp.emp_id
            ? { ...e, capacity: { ...(e.capacity || {}), [key]: { amount: null } } }
            : e
          )
        );
        setError("");
        cancelEditMonth();
      } catch {
        setError("Unable to update capacity. Please try again.");
      }
      return;
    }

    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
      setError("Capacity must be a number between 0 and 1.");
      return;
    }

    try {
      await api.put(`/resources/employees/${emp.emp_id}/capacity`, {
        capacityEntries: [{ date: key, amount: parsed }],
      });
      setEmployeesWithCapacity(prev =>
        prev.map(e => e.emp_id === emp.emp_id
          ? { ...e, capacity: { ...(e.capacity || {}), [key]: { ...(e.capacity?.[key] || {}), amount: parsed } } }
          : e
        )
      );
      setError("");
      cancelEditMonth();
    } catch {
      setError("Unable to update capacity. Please try again.");
    }
  };

  /* ---------------------------------------------------------------------------
     PORTAL HELPER
  --------------------------------------------------------------------------- */
  const renderDropdownPortal = (menu) => {
    if (!portalReady) return null;
    return createPortal(
      <div
        className="fixed z-[30000]"
        style={{ top: menuPosition.y, left: menuPosition.x }}
        onClick={e => e.stopPropagation()}
      >
        {menu}
      </div>,
      document.body
    );
  };

  const dropMenuClass = "dropdown-menu bg-white text-black shadow-lg rounded min-w-[12rem] w-max max-w-xs max-h-[min(80vh,580px)] overflow-y-auto border border-gray-300 pointer-events-auto";

  /* ---------------------------------------------------------------------------
     LOADING STATE
  --------------------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="h-[600px] bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" aria-label="Loading resources" />
      </div>
    );
  }

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="h-[600px] bg-white p-2 flex flex-col">

      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-4 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-4xl font-bold text-gray-900" style={styles.outfitFont}>Resources</h2>
          <button onClick={() => router.push("/resource-manager/dashboard")} className={btnDarkClass} style={styles.outfitFont}>
            Back to Dashboard
          </button>
        </div>
        <div className="flex-1 flex justify-center">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value.replace(/[^a-zA-Z ]/g, ""))}
            maxLength={100}
            className="px-3 py-2 border border-gray-500 bg-gray-200 rounded text-gray-700 text-sm w-64 hover:bg-[#017ACB]/20 transition-colors"
            style={styles.outfitFont}
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {["all", "mine"].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveFilter(tab);
                  setSelectedNames([]); setSelectedTitles([]); setSelectedReportsTo([]);
                  setSelectedCurrentStatuses([]); setSelectedManagerLevels([]); setSelectedDirectorLevels([]);
                }}
                aria-pressed={activeFilter === tab}
                className={tabClass(activeFilter === tab)}
                style={styles.outfitFont}
              >
                {tab === "all" ? "All" : "Mine"}
              </button>
            ))}
          </div>
          <Link href="/resource-manager/create-edit-resources/create-resource" className={`${btnClass} no-underline inline-block`} style={styles.outfitFont}>
            + Create Resource
          </Link>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div role="alert" className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded shrink-0 text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-4 text-red-900 font-bold" aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* TABLE WRAPPER */}
      <div className="border rounded-lg shadow-sm bg-white overflow-hidden shrink-0">
        <div
          ref={tableWrapperRef}
          className="overflow-x-auto overflow-y-auto max-h-[70vh] relative"
        >
          <table className="min-w-max w-full border-collapse text-sm">

            <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
              <tr>

                {/* EDIT */}
                <th className="sticky left-0 top-0 z-[9999] bg-[#017ACB] px-4 py-2 text-sm font-semibold whitespace-nowrap align-middle [background-clip:padding-box]" style={styles.outfitFont}>
                  Edit
                </th>

                {/* NAME */}
                <th className="px-2 py-2 text-left font-semibold border-l border-black border-r border-black min-w-[150px] relative" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Name</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowNameMenu, showNameMenu)}>▼</button>
                  </div>
                  {showNameMenu && renderDropdownPortal(
                    <div className={dropMenuClass}>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 text-center">Sort by name</div>
                      {[{ val: "asc", label: "A → Z" }, { val: "desc", label: "Z → A" }].map(({ val, label }) => (
                        <div key={val} className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => setNameSort(prev => prev === val ? "none" : val)}>
                          <Checkbox checked={nameSort === val} />{label}
                        </div>
                      ))}
                      <div className="border-t mt-1 pt-1 px-3 py-2 text-xs font-semibold text-gray-500 text-center">Filter by name</div>
                      <div className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => setSelectedNames([])}>
                        <Checkbox checked={selectedNames.length === 0} />All
                      </div>
                      {availableNames.map(name => (
                        <div key={name} className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => toggleSelection(name, setSelectedNames, selectedNames)}>
                          <Checkbox checked={selectedNames.includes(name)} />{name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* TITLE */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[150px] relative" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Title</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowTitleMenu, showTitleMenu)}>▼</button>
                  </div>
                  {showTitleMenu && renderDropdownPortal(
                    <div className={dropMenuClass}>
                      <div className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => setSelectedTitles([])}>
                        <Checkbox checked={selectedTitles.length === 0} />All
                      </div>
                      {availableTitles.map(title => (
                        <div key={title} className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => toggleSelection(title, setSelectedTitles, selectedTitles)}>
                          <Checkbox checked={selectedTitles.includes(title)} />{title}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* DEPARTMENT */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[150px]" style={styles.outfitFont}>Department</th>

                {/* REPORTS TO */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[150px] relative" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Reports To</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowReportsToMenu, showReportsToMenu)}>▼</button>
                  </div>
                  {showReportsToMenu && renderDropdownPortal(
                    <div className={dropMenuClass}>
                      <div className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => setSelectedReportsTo([])}>
                        <Checkbox checked={selectedReportsTo.length === 0} />All
                      </div>
                      {availableReportsTo.map(name => (
                        <div key={name} className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => toggleSelection(name, setSelectedReportsTo, selectedReportsTo)}>
                          <Checkbox checked={selectedReportsTo.includes(name)} />{name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* MANAGER LEVEL */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[150px] relative" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Manager Level</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowManagerLevelMenu, showManagerLevelMenu)}>▼</button>
                  </div>
                  {showManagerLevelMenu && renderDropdownPortal(
                    <div className={dropMenuClass}>
                      <div className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => setSelectedManagerLevels([])}>
                        <Checkbox checked={selectedManagerLevels.length === 0} />All
                      </div>
                      {availableManagerLevels.map(name => (
                        <div key={name} className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => toggleSelection(name, setSelectedManagerLevels, selectedManagerLevels)}>
                          <Checkbox checked={selectedManagerLevels.includes(name)} />{name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* DIRECTOR LEVEL */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[150px] relative" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Director Level</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowDirectorLevelMenu, showDirectorLevelMenu)}>▼</button>
                  </div>
                  {showDirectorLevelMenu && renderDropdownPortal(
                    <div className={dropMenuClass}>
                      <div className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => setSelectedDirectorLevels([])}>
                        <Checkbox checked={selectedDirectorLevels.length === 0} />All
                      </div>
                      {availableDirectorLevels.map(name => (
                        <div key={name} className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => toggleSelection(name, setSelectedDirectorLevels, selectedDirectorLevels)}>
                          <Checkbox checked={selectedDirectorLevels.includes(name)} />{name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* OTHER INFORMATION */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[200px] max-w-[200px]" style={styles.outfitFont}>Other Information</th>

                {/* STATUS */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[130px] relative" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Status</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowCurrentStatusMenu, showCurrentStatusMenu)}>▼</button>
                  </div>
                  {showCurrentStatusMenu && renderDropdownPortal(
                    <div className={dropMenuClass}>
                      <div className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => setSelectedCurrentStatuses([])}>
                        <Checkbox checked={selectedCurrentStatuses.length === 0} />All
                      </div>
                      {availableCurrentStatuses.map(status => (
                        <div key={status} className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold" onClick={() => toggleSelection(status, setSelectedCurrentStatuses, selectedCurrentStatuses)}>
                          <Checkbox checked={selectedCurrentStatuses.includes(status)} />{status}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* MONTH COLUMNS */}
                {visibleMonths.map((month, index) => (
                  <th key={month.key} className="px-2 py-2 text-center text-white border-r border-black min-w-[60px] relative" style={styles.outfitFont}>
                    <div className="flex justify-center items-center gap-1">
                      <span>{month.label}</span>
                      {index === 0 && (
                        <button className={colBtnClass} onClick={e => openMenu(e, setShowMonthMenu, showMonthMenu)}>▼</button>
                      )}
                    </div>
                  </th>
                ))}

                {showMonthMenu && renderDropdownPortal(
                  <div ref={monthMenuRef} className={dropMenuClass}>
                    {[...monthOptions].reverse().map(m => (
                      <div key={m.key} data-month-key={m.key}
                        className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 font-semibold"
                        onClick={() => handleMonthSelect(m)}
                      >
                        <Checkbox checked={selectedMonth?.key === m.key} />
                        {m.label}
                      </div>
                    ))}
                  </div>
                )}

              </tr>
            </thead>

            <tbody>
              {employees.length === 0 ? (
                <tr>
                  {/* -------------------------------------------------------
                      EMPTY STATE — viewport-centred regardless of scroll.
                      The <td> spans all columns but has no width of its own.
                      The inner <div> uses position:sticky + left + transform
                      to pin itself to the horizontal centre of the visible
                      viewport area, so it never drifts when the table is
                      scrolled left or right.
                  ------------------------------------------------------- */}
                  <td
                    colSpan={9 + visibleMonths.length}
                    className="border-t border-black py-8"
                    style={{ height: "120px" }}
                  >
                    <div
                      className="text-black text-sm"
                      style={{
                        position: "sticky",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "max-content",
                        fontFamily: "Outfit, sans-serif",
                      }}
                    >
                      No employees found.
                    </div>
                  </td>
                </tr>
              ) : employees.map(employee => {
                const isSelected = selectedEmpId === employee.emp_id;
                return (
                  <tr
                    key={employee.emp_id}
                    className={`border-t border-black cursor-pointer transition-colors hover:bg-[#017ACB]/20 ${isSelected ? "bg-[#CDE6F7]" : ""}`}
                    onClick={() => setSelectedEmpId(isSelected ? null : employee.emp_id)}
                  >
                    {/* EDIT — sticky left */}
                    <td className="sticky left-0 z-30 px-4 py-2 bg-white border-r border-black text-black whitespace-nowrap">
                      <Link
                        href={`/resource-manager/create-edit-resources/edit-resource?id=${employee.emp_id}`}
                        className="px-2 py-1 rounded text-xs bg-[#017ACB] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)] inline-block"
                        style={styles.outfitFont}
                        onClick={e => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                    </td>

                    {/* DATA CELLS */}
                    <td className="px-2 py-2 text-black border-l border-black border-r border-black" style={styles.outfitFont}>{employee.emp_name}</td>
                    <td className="px-2 py-2 text-black border-r border-black" style={styles.outfitFont}>{employee.emp_title}</td>
                    <td className="px-2 py-2 text-black border-r border-black" style={styles.outfitFont}>{getDepartmentName(employee.dept_no)}</td>
                    <td className="px-2 py-2 text-black border-r border-black" style={styles.outfitFont}>{getReportsToName(employee)}</td>
                    <td className="px-2 py-2 text-black border-r border-black" style={styles.outfitFont}>{getLevelName(employee.manager_level)}</td>
                    <td className="px-2 py-2 text-black border-r border-black" style={styles.outfitFont}>{getLevelName(employee.director_level)}</td>
                    <td className="px-2 py-2 text-black border-r border-black max-w-[500px]" style={styles.outfitFont}>{employee.other_info || ""}</td>

                    {/* STATUS BADGE */}
                    <td className="px-2 py-2 border-r border-black" style={styles.outfitFont}>
                      <span className={`px-2 py-1 text-xs rounded text-black ${getCurrentStatus(employee) === "Active" ? "bg-green-100" : "bg-red-100"}`}>
                        {getCurrentStatus(employee)}
                      </span>
                    </td>

                    {/* MONTH CELLS */}
                    {visibleMonths.map(month => (
                      <td
                        key={month.key}
                        className="px-2 py-2 text-center text-black border-r border-black cursor-pointer"
                        style={styles.outfitFont}
                        onClick={e => { e.stopPropagation(); startEditMonth(employee, month.key); }}
                      >
                        {editingCell?.empId === employee.emp_id && editingCell?.monthKey === month.key ? (
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.25"
                            value={editingValue}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "" || val === "0" || val === "0." || val === "0.0" || val === "0.00") {
                                setEditingValue(val);
                              } else {
                                const num = parseFloat(val);
                                if (!isNaN(num) && num <= 1) setEditingValue(val);
                              }
                            }}
                            onBlur={() => saveMonthValue(employee, month.key)}
                            onKeyDown={e => {
                              if (e.key === "Enter")  { e.preventDefault(); saveMonthValue(employee, month.key); }
                              if (e.key === "Escape") { e.preventDefault(); cancelEditMonth(); }
                            }}
                            autoFocus
                            className="w-14 px-1 py-0.5 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#017ACB]/40"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <div className="inline-block px-1 py-0.5">{getMonthValue(employee, month.key)}</div>
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

      {/* FOOTER */}
      <div className="mt-3 text-gray-600 text-sm shrink-0" style={styles.outfitFont}>
        Showing {employees.length} of {employeesWithCapacity.length} employees
      </div>

    </div>
  );
}
