"use client";
 
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
 
const styles = { outfitFont: { fontFamily: "Outfit, sans-serif" } };
 
const Checkbox = ({ checked }) => (
  <span className="w-4 h-4 flex-shrink-0 border border-black rounded-sm flex items-center justify-center transition relative overflow-hidden">
    <input type="checkbox" checked={checked} readOnly className="opacity-0 absolute w-4 h-4 cursor-pointer" />
    {checked && (
      <>
        <span className="absolute inset-0" style={{ backgroundColor: '#003A5C' }} />
        <svg className="absolute w-3 h-3 text-white" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 11 8 15 16 6" />
        </svg>
      </>
    )}
  </span>
);
 
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
 
const tabClass = (isActive) => `
  px-4 py-2 rounded text-sm border border-black/50
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
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.14)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.14)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.10),inset_0_-1px_2px_rgba(0,0,0,0.10)]
`;
 
// 3D pop hover effect on sortable column header text — matches project button style
const sortableSpanClass = `
  cursor-pointer select-none px-2 py-1 rounded transition
  hover:bg-white hover:text-[#017ACB] hover:border hover:border-black/50
  hover:shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
`;
 
const menuClass = `
  dropdown-menu fixed bg-white text-black shadow-lg rounded
  min-w-[12rem] w-max max-w-xs max-h-[min(80vh,580px)] overflow-y-auto
  z-[30000] border border-gray-300 pointer-events-auto
`;
 
export default function AssignmentsAllocationsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refresh      = searchParams.get("refresh");
 
  const [user, setUser]           = useState(null);
  const [highlightedEmpId, setHighlightedEmpId] = useState(null);
  const toggleHighlight = (empId) => setHighlightedEmpId(prev => prev === empId ? null : empId);
 
  const startMonthMenuRef = useRef(null);
 
  const [allRows, setAllRows]           = useState([]);
  const [mine, setMine]                 = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [months, setMonths]             = useState([]);
  const [activeTab, setActiveTab]       = useState("all");
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState("");
 
  const [confirmDialog, setConfirmDialog]       = useState(null);
  const [overAllocConfirm, setOverAllocConfirm] = useState(null);
 
  const [selectedResources, setSelectedResources]             = useState([]);
  const [selectedProjects, setSelectedProjects]               = useState([]);
  const [selectedCategories, setSelectedCategories]           = useState([]);
  const [selectedLeaders, setSelectedLeaders]                 = useState([]);
  const [selectedRequestors, setSelectedRequestors]           = useState([]);
  const [selectedRequestorVPs, setSelectedRequestorVPs]       = useState([]);
  const [selectedRequestingDepts, setSelectedRequestingDepts] = useState([]);
  const [selectedManagers, setSelectedManagers]               = useState([]);
 
  // ---------------------------------------------------------------------------
  // SORT STATE — cycles asc → desc → null per column. Numbers go to the bottom.
  // ---------------------------------------------------------------------------
  const [sortConfig, setSortConfig] = useState({ column: null, direction: "asc" });
 
  const handleHeaderSort = (column) => {
    setSortConfig(prev => {
      if (prev.column !== column)               return { column, direction: "asc" };
      if (prev.direction === "asc")             return { column, direction: "desc" };
      return { column: null, direction: "asc" };
    });
  };
 
  const sortArrow = (column) => {
    if (sortConfig.column !== column) return "";
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };
 
  const [resourceSearch, setResourceSearch] = useState("");
 
  const [showResourceMenu, setShowResourceMenu]               = useState(false);
  const [showProjectMenu, setShowProjectMenu]                 = useState(false);
  const [showCategoryMenu, setShowCategoryMenu]               = useState(false);
  const [showLeaderMenu, setShowLeaderMenu]                   = useState(false);
  const [showRequestorMenu, setShowRequestorMenu]             = useState(false);
  const [showRequestorVPMenu, setShowRequestorVPMenu]         = useState(false);
  const [showRequestingDeptMenu, setShowRequestingDeptMenu]   = useState(false);
  const [showManagerMenu, setShowManagerMenu]                 = useState(false);
  const [showStartMonthMenu, setShowStartMonthMenu]           = useState(false);
  const [menuPosition, setMenuPosition]                       = useState({ x: 0, y: 0 });
 
  const [availableResources, setAvailableResources]             = useState([]);
  const [availableProjects, setAvailableProjects]               = useState([]);
  const [availableCategories, setAvailableCategories]           = useState([]);
  const [availableLeaders, setAvailableLeaders]                 = useState([]);
  const [availableRequestors, setAvailableRequestors]           = useState([]);
  const [availableRequestorVPs, setAvailableRequestorVPs]       = useState([]);
  const [availableRequestingDepts, setAvailableRequestingDepts] = useState([]);
  const [availableManagers, setAvailableManagers]               = useState([]);
 
  const [startMonth, setStartMonth] = useState(null);
 
  /* ---------------------------------------------------------------------------
     HELPERS
  --------------------------------------------------------------------------- */
  const closeAllMenus = () => {
    setShowResourceMenu(false); setShowProjectMenu(false); setShowCategoryMenu(false);
    setShowLeaderMenu(false); setShowRequestorMenu(false); setShowRequestorVPMenu(false);
    setShowRequestingDeptMenu(false); setShowManagerMenu(false); setShowStartMonthMenu(false);
    setResourceSearch("");
  };
 
  const openMenu = (e, setFn, currentlyOpen) => {
    e.stopPropagation();
    if (currentlyOpen) { closeAllMenus(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left, y = rect.bottom + 4;
    if (x + 320 > window.innerWidth) x = window.innerWidth - 320 - 10;
    setMenuPosition({ x, y });
    closeAllMenus();
    setFn(true);
  };
 
  const toggleSelection = (value, setFn, current) => {
    setFn(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };
 
  const handleAllocationKey = (e, index) => {
    if (e.key === "Enter") e.target.blur();
    if (e.key === "Escape") {
      const clearEditing = (prev) => prev.map((r, i) => i === index ? { ...r, editing: null } : r);
      setAllRows(prev => prev.map((r, i) => i === index ? { ...r, editing: null } : r));
      setMine(prev => prev.map((r, i) => i === index ? { ...r, editing: null } : r));
      setFilteredRows(clearEditing);
    }
  };
 
  const handleAllocationBlur = async (e, row, m, index) => {
    const raw      = e.target.value;
    const newValue = raw === "" ? null : parseFloat(raw);
 
    if (newValue === null) {
      const otherMonths = Object.entries(row.allocations || {}).filter(
        ([key, val]) => key !== m.key && val !== null && val !== undefined && val !== "" && !Number.isNaN(Number(val))
      );
      if (otherMonths.length === 0) {
        setConfirmDialog({ row, m, index });
        const clearEditing = (prev) =>
          prev.map(r =>
            r.employee?.emp_id === row.employee?.emp_id && r.assignment?.project_name === row.assignment?.project_name
              ? { ...r, editing: null } : r
          );
        setAllRows(clearEditing); setMine(clearEditing); setFilteredRows(clearEditing);
        return;
      }
    }
 
    if (newValue !== null && !isNaN(newValue)) {
      try {
        const capRes   = await api.get(`/resources/employees/${row.employee.emp_id}/capacity`);
        const capData  = Array.isArray(capRes.data) ? capRes.data : [];
        const capEntry = capData.find(c => String(c.date) === String(m.key));
        const maxCapacity = capEntry ? parseFloat(capEntry.amount) : 1;
        const otherTotal = allRows
          .filter(r => r.employee?.emp_id === row.employee?.emp_id && r.assignment?.project_name !== row.assignment?.project_name)
          .reduce((sum, r) => { const val = parseFloat(r.allocations?.[m.key]); return sum + (isNaN(val) ? 0 : val); }, 0);
        if (otherTotal + newValue > maxCapacity) {
          setOverAllocConfirm({ row, m, index, newValue, maxCapacity });
          return;
        }
      } catch (err) { console.error("Failed to fetch capacity:", err); }
    }
 
    const updateAllocations = (prev) =>
      prev.map(r =>
        r.employee?.emp_id === row.employee?.emp_id && r.assignment?.project_name === row.assignment?.project_name
          ? { ...r, allocations: { ...r.allocations, [m.key]: newValue }, editing: null } : r
      );
    setAllRows(updateAllocations);
    setMine(updateAllocations);
 
    try {
      if (newValue === null) {
        await api.delete(`/assignments-allocations/delete`, { data: { emp_id: row.employee.emp_id, month: m.key, activity: row.assignment.project_name, category: row.assignment.category } });
      } else {
        await api.put(`/assignments-allocations/${row.employee.emp_id}/amount`, { emp_id: row.employee.emp_id, month: m.key, amount: newValue, activity: row.assignment.project_name, category: row.assignment.category });
      }
    } catch (err) { console.error("Failed to update allocation:", err); }
  };
 
  /* ---------------------------------------------------------------------------
     EFFECTS
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (stored) setUser(JSON.parse(stored));
    } catch { setUser(null); }
  }, []);
 
  useEffect(() => {
    if (!user?.username) return;
    const loadAll = async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `/assignments-allocations?username=${encodeURIComponent(user.username)}&ts=${Date.now()}`,
          { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0" } }
        );
        const data = res?.data || {};
        setAllRows(data.allAssignments || []);
        setMine(data.myAssignments     || []);
        setMonths(data.months          || []);
        setFilteredRows(data.allAssignments || []);
      } catch {
        setAllRows([]); setMine([]); setFilteredRows([]); setMonths([]);
      } finally { setLoading(false); }
    };
    loadAll();
  }, [user, refresh]);
 
  useEffect(() => {
    if (!months.length || startMonth) return;
    const now     = new Date();
    const current = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    setStartMonth(months.includes(current) ? current : months[0]);
  }, [months, startMonth]);
 
  const visibleMonths = useMemo(() => {
    if (!months.length) return [];
    const start = startMonth && months.includes(startMonth) ? startMonth : months[0];
    const idx   = months.indexOf(start);
    return months.slice(idx, idx + 16);
  }, [months, startMonth]);
 
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
 
  const monthLabels = useMemo(() => {
    return visibleMonths.map(m => ({
      key:   m,
      label: `${monthNames[parseInt(m.substring(4, 6), 10) - 1]} ${m.substring(0, 4)}`
    }));
  }, [visibleMonths]);
 
  const rowsWithVisibleAllocations = useMemo(() => {
    const source = activeTab === "mine" ? mine : allRows;
    return source.filter(row =>
      visibleMonths.some(m => {
        const val = row.allocations?.[m];
        return val !== null && val !== undefined && val !== "";
      })
    );
  }, [allRows, mine, activeTab, visibleMonths]);
 
  useEffect(() => {
    const uniq = (arr) => [...new Set(arr)].filter(Boolean);
    setAvailableResources(uniq(rowsWithVisibleAllocations.map(r => r.employee?.emp_name || "")));
    setAvailableProjects(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.project_name || "")));
    setAvailableCategories(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.category || "")));
    setAvailableLeaders(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.leader || "")));
    setAvailableRequestors(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.requestor || "")));
    setAvailableRequestorVPs(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.requestor_vp || "")));
    setAvailableRequestingDepts(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.requesting_dept_name || r.assignment?.requesting_dept || "")));
    setAvailableManagers(uniq(rowsWithVisibleAllocations.map(r => r.employee?.manager_name || "")));
  }, [rowsWithVisibleAllocations]);
 
  useEffect(() => {
    const handler = (e) => { if (!e.target.closest(".dropdown-menu")) closeAllMenus(); };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);
 
  useEffect(() => {
    if (!user) return;
 
    let filtered = activeTab === "mine" ? mine : allRows;
 
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row => {
        const empName        = row.employee?.emp_name?.toLowerCase() || "";
        const deptName       = row.employee?.dept_name?.toLowerCase() || "";
        const managerName    = row.employee?.manager_name?.toLowerCase() || "";
        const project        = row.assignment?.project_name?.toLowerCase() || "";
        const category       = row.assignment?.category?.toLowerCase() || "";
        const leader         = row.assignment?.leader?.toLowerCase() || "";
        const requestor      = row.assignment?.requestor?.toLowerCase() || "";
        const requestorVP    = row.assignment?.requestor_vp?.toLowerCase() || "";
        const requestingDept = (row.assignment?.requesting_dept_name || row.assignment?.requesting_dept || "").toLowerCase();
        return empName.includes(term) || deptName.includes(term) || managerName.includes(term) ||
          project.includes(term) || category.includes(term) || leader.includes(term) ||
          requestor.includes(term) || requestorVP.includes(term) || requestingDept.includes(term);
      });
    }
 
    filtered = filtered.filter(row => {
      const empName        = row.employee?.emp_name || "";
      const project        = row.assignment?.project_name || "";
      const category       = row.assignment?.category || "";
      const leader         = row.assignment?.leader || "";
      const requestor      = row.assignment?.requestor || "";
      const requestorVP    = row.assignment?.requestor_vp || "";
      const requestingDept = row.assignment?.requesting_dept_name || row.assignment?.requesting_dept || "";
      const managerName    = row.employee?.manager_name || "";
 
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
      return visibleMonths.some(m => {
        const val = row.allocations?.[m];
        return val !== null && val !== undefined && val !== "";
      });
    });
 
    // --- SORT — numbers always go to the bottom regardless of direction ---
    const { column, direction } = sortConfig;
    if (column) {
      const dir = direction === "asc" ? 1 : -1;
      const isNumericStart = (s) => /^\d/.test(s || "");
      filtered = [...filtered].sort((a, b) => {
        let aVal = "";
        let bVal = "";
        if (column === "resource")  { aVal = a.employee?.emp_name || "";                                          bVal = b.employee?.emp_name || ""; }
        if (column === "manager")   { aVal = a.employee?.manager_name || "";                                      bVal = b.employee?.manager_name || ""; }
        if (column === "project")   { aVal = a.assignment?.project_name || "";                                    bVal = b.assignment?.project_name || ""; }
        if (column === "category")  { aVal = a.assignment?.category || "";                                        bVal = b.assignment?.category || ""; }
        if (column === "leader")    { aVal = a.assignment?.leader || "";                                          bVal = b.assignment?.leader || ""; }
        if (column === "requestor") { aVal = a.assignment?.requestor || "";                                       bVal = b.assignment?.requestor || ""; }
        if (column === "vp")        { aVal = a.assignment?.requestor_vp || "";                                    bVal = b.assignment?.requestor_vp || ""; }
        if (column === "dept")      { aVal = a.assignment?.requesting_dept_name || a.assignment?.requesting_dept || ""; bVal = b.assignment?.requesting_dept_name || b.assignment?.requesting_dept || ""; }
        const aIsNum = isNumericStart(aVal);
        const bIsNum = isNumericStart(bVal);
        if (aIsNum && !bIsNum) return 1;
        if (!aIsNum && bIsNum) return -1;
        return aVal.localeCompare(bVal) * dir;
      });
    }
 
    setFilteredRows(filtered);
  }, [
    user, activeTab, mine, allRows, visibleMonths, searchTerm, sortConfig,
    selectedResources, selectedProjects, selectedCategories,
    selectedLeaders, selectedRequestors, selectedRequestorVPs,
    selectedRequestingDepts, selectedManagers,
  ]);
 
  const handleEditAllocation = (row) => {
    router.push(
      `/resource-manager/assign-edit-allocation/edit-allocation` +
      `?emp_id=${row.employee?.emp_id}` +
      `&project=${encodeURIComponent(row.assignment?.project_name)}` +
      `&category=${encodeURIComponent(row.assignment?.category)}`
    );
  };
 
  const handleOverAllocConfirm = async () => {
    const { row, m, newValue } = overAllocConfirm;
    setOverAllocConfirm(null);
    const updateAllocations = (prev) =>
      prev.map(r =>
        r.employee?.emp_id === row.employee?.emp_id && r.assignment?.project_name === row.assignment?.project_name
          ? { ...r, allocations: { ...r.allocations, [m.key]: newValue }, editing: null } : r
      );
    setAllRows(updateAllocations);
    setMine(updateAllocations);
    try {
      await api.put(`/assignments-allocations/${row.employee.emp_id}/amount`, {
        emp_id: row.employee.emp_id, month: m.key, amount: newValue,
        activity: row.assignment.project_name, category: row.assignment.category
      });
    } catch (err) { console.error("Failed to update allocation:", err); }
  };
 
  const handleConfirmDelete = async () => {
    const { row, m } = confirmDialog;
    setConfirmDialog(null);
    const updateAllocations = (prev) =>
      prev.map(r =>
        r.employee?.emp_id === row.employee?.emp_id && r.assignment?.project_name === row.assignment?.project_name
          ? { ...r, allocations: { ...r.allocations, [m.key]: null }, editing: null } : r
      );
    setAllRows(updateAllocations); setMine(updateAllocations); setFilteredRows(updateAllocations);
    try {
      await api.delete(`/assignments-allocations/delete`, { data: { emp_id: row.employee.emp_id, month: m.key, activity: row.assignment.project_name, category: row.assignment.category } });
      router.replace(`/resource-manager/assign-edit-allocation?refresh=${Date.now()}`);
    } catch (err) { console.error("Failed to delete last allocation:", err); }
  };
 
  if (!user || loading) {
    return (
      <div className="h-[600px] bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" aria-label="Loading assignments" />
      </div>
    );
  }
 
  const renderMenuItems = (available, selected, setSelected, sortOptions = null, searchable = false) => {
    const displayList = searchable && resourceSearch
      ? available.filter(n => n.toLowerCase().includes(resourceSearch.toLowerCase()))
      : available;
 
    return (
      <>
        {sortOptions && (
          <>
            {[{ val: "asc", label: "A → Z" }, { val: "desc", label: "Z → A" }].map(({ val, label }) => (
              <div key={val}
                className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${sortConfig.column === "resource" && sortConfig.direction === val ? "font-bold" : ""}`}
                onClick={() => setSortConfig(prev =>
                  prev.column === "resource" && prev.direction === val
                    ? { column: null, direction: "asc" }
                    : { column: "resource", direction: val }
                )}
              >
                <Checkbox checked={sortConfig.column === "resource" && sortConfig.direction === val} />{label}
              </div>
            ))}
            <div className="border-t my-2" />
          </>
        )}
        {searchable && (
          <div className="px-2 pt-1 pb-1 border-b border-gray-300">
            <input type="text" placeholder="Search name..." value={resourceSearch} onChange={e => setResourceSearch(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-400 rounded text-black hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black"
              onClick={e => e.stopPropagation()} />
          </div>
        )}
        <div
          className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${selected.length === 0 ? "font-bold" : ""}`}
          onClick={() => setSelected([])}
        >
          <Checkbox checked={selected.length === 0} />All
        </div>
        {displayList.map(name => (
          <div key={name}
            className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${selected.includes(name) ? "font-bold" : ""}`}
            onClick={() => toggleSelection(name, setSelected, selected)}
          >
            <Checkbox checked={selected.includes(name)} />{name}
          </div>
        ))}
        {searchable && resourceSearch && displayList.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-400">No results</div>
        )}
      </>
    );
  };
 
  return (
    <div className="h-[600px] bg-white">
 
      {/* CONFIRM DIALOG */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999] px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-black mb-2" style={styles.outfitFont}>Remove Allocation</h2>
            <p className="text-sm text-gray-700 mb-6" style={styles.outfitFont}>This is the last allocation for this assignment. Are you sure you want to remove it?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 rounded text-sm bg-gray-200 text-black border border-black/50 hover:bg-[#017ACB]/20 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]" style={styles.outfitFont}>No</button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 rounded text-sm bg-[#017ACB] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]" style={styles.outfitFont}>Yes</button>
            </div>
          </div>
        </div>
      )}
 
      {/* OVER-ALLOCATION WARNING */}
      {overAllocConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999] px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-black mb-2" style={styles.outfitFont}>Over-Allocation Warning</h2>
            <p className="text-sm text-gray-700 mb-6" style={styles.outfitFont}>
              This allocation will bring <strong>{overAllocConfirm.row.employee?.emp_name}</strong>'s total for <strong>{overAllocConfirm.m.label}</strong> above their capacity of <strong>{overAllocConfirm.maxCapacity}</strong>. Are you sure you want to do this?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setOverAllocConfirm(null)} className="px-4 py-2 rounded text-sm bg-[#003A5C] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]" style={styles.outfitFont}>No</button>
              <button onClick={handleOverAllocConfirm} className="px-4 py-2 rounded text-sm bg-[#017ACB] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]" style={styles.outfitFont}>Yes</button>
            </div>
          </div>
        </div>
      )}
 
      <main className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 py-4">
 
        {/* PAGE HEADER */}
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900" style={styles.outfitFont}>Assignments &amp; Allocations</h2>
            <button
              onClick={() => router.push('/resource-manager/dashboard')}
              className="px-4 py-2 rounded text-sm bg-[#003A5C] text-white border border-black/50 hover:bg-[#017ACB]/20 transition-colors hover:text-gray-700 shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]"
              style={styles.outfitFont}
            >
              Back to Dashboard
            </button>
          </div>
          <div className="flex-1 flex justify-center min-w-[220px]">
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
          <div className="flex flex-wrap gap-2 items-center">
            {["all", "mine"].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchTerm("");
                  setSelectedResources([]); setSelectedProjects([]); setSelectedCategories([]);
                  setSelectedLeaders([]); setSelectedRequestors([]); setSelectedRequestorVPs([]);
                  setSelectedRequestingDepts([]); setSelectedManagers([]);
                  setSortConfig({ column: null, direction: "asc" });
                }}
                aria-pressed={activeTab === tab}
                className={tabClass(activeTab === tab)}
                style={styles.outfitFont}
              >
                {tab === "all" ? "All Assignments" : "My Assignments"}
              </button>
            ))}
            <button onClick={() => router.push("/resource-manager/assign-edit-allocation/add-allocation")} className={btnClass} style={styles.outfitFont}>
              + Add Allocation
            </button>
          </div>
        </div>
 
        {/* TABLE */}
        <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
            <table className="min-w-max w-full border-collapse text-sm">
 
              <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
                <tr>
 
                  {/* EDIT */}
                  <th className="sticky left-0 top-0 z-[9999] bg-[#017ACB] px-2 sm:px-4 py-2 text-sm font-semibold whitespace-nowrap align-middle [background-clip:padding-box]" style={styles.outfitFont}>
                    Edit
                  </th>
 
                  {/* RESOURCE NAME */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span className={sortableSpanClass} onClick={() => handleHeaderSort("resource")}>
                        Resource Name{sortArrow("resource")}
                      </span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowResourceMenu, showResourceMenu)}>▼</button>
                    </div>
                    {showResourceMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                        {renderMenuItems(availableResources, selectedResources, setSelectedResources, true, true)}
                      </div>
                    )}
                  </th>
 
                  {/* DEPARTMENT — no sort */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>Department</th>
 
                  {/* REPORTS TO */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span className={sortableSpanClass} onClick={() => handleHeaderSort("manager")}>
                        Reports To{sortArrow("manager")}
                      </span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowManagerMenu, showManagerMenu)}>▼</button>
                    </div>
                    {showManagerMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                        {renderMenuItems(availableManagers, selectedManagers, setSelectedManagers)}
                      </div>
                    )}
                  </th>
 
                  {/* PROJECT */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span className={sortableSpanClass} onClick={() => handleHeaderSort("project")}>
                        Project{sortArrow("project")}
                      </span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowProjectMenu, showProjectMenu)}>▼</button>
                    </div>
                    {showProjectMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                        {renderMenuItems(availableProjects, selectedProjects, setSelectedProjects)}
                      </div>
                    )}
                  </th>
 
                  {/* ACTIVITY CATEGORY */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span className={sortableSpanClass} onClick={() => handleHeaderSort("category")}>
                        Activity Category{sortArrow("category")}
                      </span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowCategoryMenu, showCategoryMenu)}>▼</button>
                    </div>
                    {showCategoryMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                        {renderMenuItems(availableCategories, selectedCategories, setSelectedCategories)}
                      </div>
                    )}
                  </th>
 
                  {/* LEADER ACCOUNTABLE */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span className={sortableSpanClass} onClick={() => handleHeaderSort("leader")}>
                        Leader Accountable{sortArrow("leader")}
                      </span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowLeaderMenu, showLeaderMenu)}>▼</button>
                    </div>
                    {showLeaderMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                        {renderMenuItems(availableLeaders, selectedLeaders, setSelectedLeaders)}
                      </div>
                    )}
                  </th>
 
                  {/* REQUESTOR */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span className={sortableSpanClass} onClick={() => handleHeaderSort("requestor")}>
                        Requestor{sortArrow("requestor")}
                      </span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowRequestorMenu, showRequestorMenu)}>▼</button>
                    </div>
                    {showRequestorMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                        {renderMenuItems(availableRequestors, selectedRequestors, setSelectedRequestors)}
                      </div>
                    )}
                  </th>
 
                  {/* REQUESTOR VP */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span className={sortableSpanClass} onClick={() => handleHeaderSort("vp")}>
                        Requestor VP{sortArrow("vp")}
                      </span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowRequestorVPMenu, showRequestorVPMenu)}>▼</button>
                    </div>
                    {showRequestorVPMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                        {renderMenuItems(availableRequestorVPs, selectedRequestorVPs, setSelectedRequestorVPs)}
                      </div>
                    )}
                  </th>
 
                  {/* REQUESTING DEPT */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span className={sortableSpanClass} onClick={() => handleHeaderSort("dept")}>
                        Requesting Dept{sortArrow("dept")}
                      </span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowRequestingDeptMenu, showRequestingDeptMenu)}>▼</button>
                    </div>
                    {showRequestingDeptMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                        {renderMenuItems(availableRequestingDepts, selectedRequestingDepts, setSelectedRequestingDepts)}
                      </div>
                    )}
                  </th>
 
                  {/* START MONTH */}
                  <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>{monthLabels.length ? monthLabels[0].label : "Start Month"}</span>
                      <button className={colBtnClass} onClick={e => {
                        openMenu(e, setShowStartMonthMenu, showStartMonthMenu);
                        setTimeout(() => {
                          if (startMonthMenuRef.current) {
                            const el = startMonthMenuRef.current.querySelector(`[data-month="${startMonth}"]`);
                            if (el) el.scrollIntoView({ block: "center" });
                          }
                        }, 0);
                      }}>▼</button>
                    </div>
                    {showStartMonthMenu && (
                      <div ref={startMonthMenuRef} className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                        {months.map(m => {
                          const label = `${monthNames[parseInt(m.substring(4, 6), 10) - 1]} ${m.substring(0, 4)}`;
                          return (
                            <div key={m} data-month={m}
                              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${startMonth === m ? "font-bold" : ""}`}
                              onClick={() => { setStartMonth(m); setShowStartMonthMenu(false); }}
                            >
                              <Checkbox checked={startMonth === m} />{label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </th>
 
                  {/* REMAINING MONTH COLUMNS */}
                  {monthLabels.slice(1).map(m => (
                    <th key={m.key} className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                      {m.label}
                    </th>
                  ))}
 
                </tr>
              </thead>
 
              <tbody>
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={11 + monthLabels.length} className="border py-8" style={{ height: "120px" }}>
                      <div className="text-gray-500 text-sm" style={{ position: "sticky", left: "50%", transform: "translateX(-50%)", width: "max-content", fontFamily: "Outfit, sans-serif" }}>
                        No assignments found.
                      </div>
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
                      className={`cursor-pointer transition-colors hover:bg-[#017ACB]/20 ${isHighlighted ? "bg-[#CDE6F7]" : "bg-white"}`}
                    >
                      <td className="sticky left-0 z-30 px-2 sm:px-4 py-2 bg-white border-r border-black text-black whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => { e.stopPropagation(); handleEditAllocation(row); }}
                          className="px-2 py-1 rounded text-xs bg-[#017ACB] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]"
                          style={styles.outfitFont}
                        >
                          Edit
                        </button>
                      </td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.employee?.emp_name}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.employee?.dept_name || ""}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.employee?.manager_name || ""}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.project_name}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.category}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.leader}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.requestor}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.requestor_vp}</td>
                      <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.requesting_dept_name || row.assignment?.requesting_dept}</td>
                      {monthLabels.map(m => (
                        <td
                          key={m.key}
                          className="px-2 sm:px-4 py-2 border text-sm text-black text-center whitespace-nowrap cursor-pointer bg-inherit"
                          onClick={e => {
                            e.stopPropagation();
                            const setEditing = (prev) =>
                              prev.map(r =>
                                r.employee?.emp_id === row.employee?.emp_id && r.assignment?.project_name === row.assignment?.project_name
                                  ? { ...r, editing: m.key } : r
                              );
                            setAllRows(setEditing); setMine(setEditing); setFilteredRows(setEditing);
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
                              onInput={e => { if (e.target.value.length > 4) e.target.value = e.target.value.slice(0, 4); }}
                              onBlur={e => handleAllocationBlur(e, row, m, index)}
                              onKeyDown={e => handleAllocationKey(e, index)}
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