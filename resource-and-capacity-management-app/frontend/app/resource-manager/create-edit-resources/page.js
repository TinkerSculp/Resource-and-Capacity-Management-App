"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import api from "@/lib/api";

const styles = { outfitFont: { fontFamily: "Outfit, sans-serif" } };

const DEPARTMENT_FILTER_NAME = "Data Mgmt";

const btnClass = `
  px-4 py-2 rounded text-sm
  border border-[#00263F]/50 dark:border-slate-500/60
  bg-[#017ACB] text-white
  hover:bg-[#017ACB]/20 hover:text-gray-700
  dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100
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

const btnDarkClass = `
  px-4 py-2 rounded text-sm
  border border-black/50 dark:border-slate-500/60
  bg-[#003A5C] text-white
  dark:bg-[#0A5F8A] dark:text-white
  hover:bg-[#017ACB]/20 hover:text-gray-700
  dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100
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

const tabClass = (isActive) => `
  w-20 px-4 py-2 rounded text-sm
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
  shadow-[4px_4px_10px_rgba(0,0,0,0.22),-4px_-4px_10px_rgba(255,255,255,0.12)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.22),-2px_-2px_6px_rgba(255,255,255,0.12)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.08)]
`;

// Sortable column header text — 3D pop on hover, matching Initiatives style
const sortableSpanClass = `
  cursor-pointer select-none px-2 py-1 rounded transition
  hover:bg-white hover:text-[#017ACB] hover:border hover:border-black/50
  hover:shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
`;

function Checkbox({ checked }) {
  return (
    <span className="w-4 h-4 border border-black dark:border-slate-400 rounded-sm flex items-center justify-center relative overflow-hidden flex-shrink-0">
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

export default function ResourcesPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refresh      = searchParams.get("refresh");

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

  // Single sortConfig — column: "name"|"title"|"reportsTo"|"managerLevel"|"directorLevel"|null
  // Cycles: asc → desc → null (3rd click clears), matching Initiatives page
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });

  const handleHeaderSort = (column) => {
    setSortConfig(prev => {
      if (prev.column !== column)               return { column, direction: 'asc' };
      if (prev.direction === 'asc')             return { column, direction: 'desc' };
      return { column: null, direction: 'asc' }; // 3rd click clears
    });
  };

  const sortArrow = (column) => {
    if (sortConfig.column !== column) return '';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

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

    // Single sortConfig — numbers always go to the bottom regardless of direction
    const { column, direction } = sortConfig;
    if (column) {
      const dir = direction === 'asc' ? 1 : -1;
      const isNumericStart = (s) => /^\d/.test(s || '');
      filtered = [...filtered].sort((a, b) => {
        let aVal = '';
        let bVal = '';
        if (column === 'name')          { aVal = a.emp_name;                bVal = b.emp_name; }
        if (column === 'title')         { aVal = a.emp_title;               bVal = b.emp_title; }
        if (column === 'reportsTo')     { aVal = getReportsToName(a);       bVal = getReportsToName(b); }
        if (column === 'managerLevel')  { aVal = getLevelName(a.manager_level);  bVal = getLevelName(b.manager_level); }
        if (column === 'directorLevel') { aVal = getLevelName(a.director_level); bVal = getLevelName(b.director_level); }
        const aIsNum = isNumericStart(aVal);
        const bIsNum = isNumericStart(bVal);
        if (aIsNum && !bIsNum) return 1;
        if (!aIsNum && bIsNum) return -1;
        return aVal.localeCompare(bVal) * dir;
      });
    }

    setEmployees(filtered);
  }, [
    employeesWithCapacity, activeFilter, searchTerm, user,
    sortConfig,
    selectedNames, selectedTitles, selectedReportsTo,
    selectedCurrentStatuses, selectedManagerLevels, selectedDirectorLevels,
    departments,
  ]);

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

  const dropMenuClass = "dropdown-menu bg-white dark:bg-slate-800 text-black dark:text-slate-100 shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded min-w-[12rem] w-max max-w-xs max-h-[min(80vh,580px)] overflow-y-auto border border-gray-300 dark:border-slate-600 pointer-events-auto";

  // Filter-only dropdown items (no sort rows) — matching Initiatives page
  const renderMenuItems = (available, selected, setSelected) => (
    <>
      <div
        className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${selected.length === 0 ? 'font-bold' : ''}`}
        onClick={() => setSelected([])}
      >
        <Checkbox checked={selected.length === 0} />All
      </div>
      {available.map(val => (
        <div
          key={val}
          className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${selected.includes(val) ? 'font-bold' : ''}`}
          onClick={() => toggleSelection(val, setSelected, selected)}
        >
          <Checkbox checked={selected.includes(val)} />{val}
        </div>
      ))}
    </>
  );

  if (loading) {
    return (
      <div className="h-[600px] bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" aria-label="Loading resources" />
      </div>
    );
  }

  return (
    <div className="h-[600px] page-surface p-2 flex flex-col">

      <div className="flex items-center justify-between mb-4 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white" style={styles.outfitFont}>Resources</h2>
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
            className="px-3 py-2 border border-gray-500 dark:border-slate-600 bg-[#f5f5f5] dark:bg-[#1f1f1f] rounded text-gray-700 dark:text-slate-100 placeholder:text-gray-600 dark:placeholder:text-slate-400 text-sm w-64 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition-colors focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400"
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
                  setSortConfig({ column: null, direction: 'asc' });
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

      {error && (
        <div role="alert" className="mb-4 p-4 bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded shrink-0 text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-4 text-red-900 dark:text-red-200 font-bold" aria-label="Dismiss error">×</button>
        </div>
      )}

      <div className="table-surface border dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-slate-900 overflow-hidden shrink-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-max w-full border-collapse text-sm">

            <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
              <tr>

                <th className="sticky left-0 top-0 z-[9999] w-19 min-w-19 bg-[#017ACB] px-4 py-2 text-sm font-semibold whitespace-nowrap align-middle bg-clip-padding" style={styles.outfitFont}>
                  Edit
                </th>

                {/* NAME — sortable header text + filter dropdown */}
                <th className="sticky left-19 top-0 z-[9998] bg-[#017ACB] px-2 py-2 text-left font-semibold border-x border-black min-w-[150px] bg-clip-padding" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span className={sortableSpanClass} onClick={() => handleHeaderSort('name')}>
                      Name{sortArrow('name')}
                    </span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowNameMenu, showNameMenu)}>▼</button>
                  </div>
                  {showNameMenu && renderDropdownPortal(
                    <div className={dropMenuClass}>
                      {renderMenuItems(availableNames, selectedNames, setSelectedNames)}
                    </div>
                  )}
                </th>

                {/* TITLE — sortable header text + filter dropdown */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[150px] relative" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span className={sortableSpanClass} onClick={() => handleHeaderSort('title')}>
                      Title{sortArrow('title')}
                    </span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowTitleMenu, showTitleMenu)}>▼</button>
                  </div>
                  {showTitleMenu && renderDropdownPortal(
                    <div className={dropMenuClass}>
                      {renderMenuItems(availableTitles, selectedTitles, setSelectedTitles)}
                    </div>
                  )}
                </th>

                {/* DEPARTMENT — no sort, no filter */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[150px]" style={styles.outfitFont}>Department</th>

                {/* REPORTS TO — sortable header text + filter dropdown */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[150px] relative" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span className={sortableSpanClass} onClick={() => handleHeaderSort('reportsTo')}>
                      Reports To{sortArrow('reportsTo')}
                    </span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowReportsToMenu, showReportsToMenu)}>▼</button>
                  </div>
                  {showReportsToMenu && renderDropdownPortal(
                    <div className={dropMenuClass}>
                      {renderMenuItems(availableReportsTo, selectedReportsTo, setSelectedReportsTo)}
                    </div>
                  )}
                </th>

                {/* MANAGER LEVEL — sortable header text + filter dropdown */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[150px] relative" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span className={sortableSpanClass} onClick={() => handleHeaderSort('managerLevel')}>
                      Manager Level{sortArrow('managerLevel')}
                    </span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowManagerLevelMenu, showManagerLevelMenu)}>▼</button>
                  </div>
                  {showManagerLevelMenu && renderDropdownPortal(
                    <div className={dropMenuClass}>
                      {renderMenuItems(availableManagerLevels, selectedManagerLevels, setSelectedManagerLevels)}
                    </div>
                  )}
                </th>

                {/* DIRECTOR LEVEL — sortable header text + filter dropdown */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[150px] relative" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span className={sortableSpanClass} onClick={() => handleHeaderSort('directorLevel')}>
                      Director Level{sortArrow('directorLevel')}
                    </span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowDirectorLevelMenu, showDirectorLevelMenu)}>▼</button>
                  </div>
                  {showDirectorLevelMenu && renderDropdownPortal(
                    <div className={dropMenuClass}>
                      {renderMenuItems(availableDirectorLevels, selectedDirectorLevels, setSelectedDirectorLevels)}
                    </div>
                  )}
                </th>

                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[200px] max-w-[200px]" style={styles.outfitFont}>Other Information</th>

                {/* STATUS — filter only, no sort */}
                <th className="px-2 py-2 text-left font-semibold border-r border-black min-w-[130px] relative" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Status</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowCurrentStatusMenu, showCurrentStatusMenu)}>▼</button>
                  </div>
                  {showCurrentStatusMenu && renderDropdownPortal(
                    <div className={dropMenuClass}>
                      {renderMenuItems(availableCurrentStatuses, selectedCurrentStatuses, setSelectedCurrentStatuses)}
                    </div>
                  )}
                </th>

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
                        className="px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 font-semibold"
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
                  <td colSpan={9 + visibleMonths.length} className="px-4 py-8 text-center text-black dark:text-slate-300 border-t border-black dark:border-slate-700" style={styles.outfitFont}>
                    No employees found.
                  </td>
                </tr>
              ) : employees.map(employee => {
                const isSelected = selectedEmpId === employee.emp_id;
                return (
                  <tr
                    key={employee.emp_id}
                    className={`border-t border-black dark:border-slate-700 cursor-pointer transition-colors hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/20 ${isSelected ? "bg-[#CDE6F7] dark:bg-[#0A5F8A]/30" : ""}`}
                    onClick={() => setSelectedEmpId(isSelected ? null : employee.emp_id)}
                  >
                    <td className={`sticky left-0 z-30 w-19 min-w-19 px-4 py-2 border-r border-black dark:border-slate-700 text-black whitespace-nowrap ${isSelected ? "bg-[#CDE6F7] dark:bg-[#0A5F8A]/30" : "bg-white dark:bg-slate-900"}`}>
                      <Link
                        href={`/resource-manager/create-edit-resources/edit-resource?id=${employee.emp_id}`}
                        className="px-2 py-1 rounded text-xs bg-[#017ACB] text-white border border-black/50 dark:border-slate-500 hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:text-white transition shadow-[4px_4px_10px_rgba(0,0,0,0.25)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),inset_0_-1px_2px_rgba(0,0,0,0.15)] inline-block"
                        style={styles.outfitFont}
                        onClick={e => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                    </td>

                    <td className={`sticky left-19 z-20 px-2 py-2 text-black dark:text-slate-100 border-x border-black dark:border-slate-700 min-w-[150px] ${isSelected ? "bg-[#CDE6F7] dark:bg-[#0A5F8A]/30" : "bg-white dark:bg-slate-900"}`} style={styles.outfitFont}>{employee.emp_name}</td>
                    <td className="px-2 py-2 text-black dark:text-slate-100 border-r border-black dark:border-slate-700" style={styles.outfitFont}>{employee.emp_title}</td>
                    <td className="px-2 py-2 text-black dark:text-slate-100 border-r border-black dark:border-slate-700" style={styles.outfitFont}>{getDepartmentName(employee.dept_no)}</td>
                    <td className="px-2 py-2 text-black dark:text-slate-100 border-r border-black dark:border-slate-700" style={styles.outfitFont}>{getReportsToName(employee)}</td>
                    <td className="px-2 py-2 text-black dark:text-slate-100 border-r border-black dark:border-slate-700" style={styles.outfitFont}>{getLevelName(employee.manager_level)}</td>
                    <td className="px-2 py-2 text-black dark:text-slate-100 border-r border-black dark:border-slate-700" style={styles.outfitFont}>{getLevelName(employee.director_level)}</td>
                    <td className="px-2 py-2 text-black dark:text-slate-100 border-r border-black dark:border-slate-700 max-w-[500px]" style={styles.outfitFont}>{employee.other_info || ""}</td>

                    <td className="px-2 py-2 border-r border-black dark:border-slate-700" style={styles.outfitFont}>
                      <span className={`px-2 py-1 text-xs rounded font-semibold ${
                        getCurrentStatus(employee) === "Active"
                          ? "bg-green-100 dark:bg-green-900/40 text-black dark:text-green-200"
                          : "bg-red-100 dark:bg-red-900/40 text-black dark:text-red-200"
                      }`}>
                        {getCurrentStatus(employee)}
                      </span>
                    </td>

                    {visibleMonths.map(month => (
                      <td
                        key={month.key}
                        className="px-2 py-2 text-center text-black dark:text-slate-100 border-r border-black dark:border-slate-700 cursor-pointer"
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
                            className="w-14 px-1 py-0.5 border border-gray-300 dark:border-slate-500 rounded text-center text-sm bg-white dark:bg-slate-700 text-black dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#017ACB]/40"
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

      <div className="mt-3 text-gray-600 dark:text-slate-400 text-sm shrink-0" style={styles.outfitFont}>
        Showing {employees.length} of {employeesWithCapacity.length} employees
      </div>

    </div>
  );
}