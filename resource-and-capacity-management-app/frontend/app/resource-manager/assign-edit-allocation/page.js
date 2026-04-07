
// "use client";
// export const dynamic = 'force-dynamic';

// /* =============================================================================
//    AssignmentsAllocationsPage.jsx
//    -----------------------------------------------------------------------------
//    PURPOSE:
//      Displays all employee assignments and their monthly allocations in a
//      scrollable, filterable table. Supports:
//        • "All Assignments" and "My Assignments" tab views
//        • Column-level filter menus (resource, manager, project, category,
//          leader, requestor, requestor VP, requesting dept)
//        • Resource sort (A→Z / Z→A) with search inside the resource dropdown
//        • Start month selector — shows 16 months from the chosen start
//        • Inline allocation editing — click a cell to edit, blur/enter to save
//        • Row highlight on click — highlights all rows for that employee
//        • Confirm dialog when clearing the last allocation on a row
//        • Over-allocation warning when an edit would exceed employee capacity

//    HOW IT WORKS:
//      1. On mount, reads user session from localStorage
//      2. Fetches all assignments and the current user's assignments from the backend
//      3. Defaults startMonth to the current calendar month
//      4. Filter option lists are derived from tab-scoped visible rows only
//      5. Inline edits call PUT/DELETE on the backend and update all three
//         arrays (allRows, mine, filteredRows) optimistically

//    INLINE EDITING — WHY ALL THREE ARRAYS:
//      filteredRows is re-derived from allRows/mine every time filters change
//      (Effect 6). If we only update filteredRows, switching a filter will
//      re-run Effect 6 from stale data and resurrect a deleted allocation.
//      Updating all three source arrays ensures any filter re-run sees the
//      correct state.

//    CONFIRM DIALOG:
//      When the user clears the last allocation on a row (all other months
//      are also empty), a confirmation dialog appears before deleting.
//      After confirmation, the row is deleted and the page refreshes to
//      remove the now-empty row cleanly.

//    OVER-ALLOCATION WARNING:
//      Before saving a value, the employee's capacity for that month is fetched
//      and compared to the sum of all their allocations (existing + new).
//      If the total would exceed capacity, a warning dialog is shown.
//      The user can proceed anyway — the warning is advisory, not blocking.

//    SECURITY MODEL:
//      • localStorage accessed inside try/catch — malformed JSON sets user to null.
//      • encodeURIComponent() on user.username in the API URL.
//      • Allocation save requests send only validated primitives:
//        emp_id (from server data), month key (from server data), and amount
//        (parsed with parseFloat — NaN → null → DELETE).
//      • Filter menus built from server response data only — no user-typed values.
//      • No dangerouslySetInnerHTML used anywhere.

//    DEPENDENCIES:
//      • @/lib/api       — Axios instance with JWT Bearer token auto-injection
//      • next/navigation  — useRouter, useSearchParams
//    ============================================================================= */

// import { useState, useEffect, useMemo, useRef } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import api from "@/lib/api";

// /* =============================================================================
//    COMPONENT: Checkbox — used inside all dropdown filter menus.
//    ============================================================================= */
// const Checkbox = ({ checked }) => (
//   <span className="w-4 h-4 flex-shrink-0 border border-black rounded-sm flex items-center justify-center transition relative overflow-hidden">
//     <input type="checkbox" checked={checked} readOnly className="opacity-0 absolute w-4 h-4 cursor-pointer" />
//     {checked && (
//       <>
//         <span className="absolute inset-0" style={{ backgroundColor: '#003A5C' }} />
//         <svg className="absolute w-3 h-3 text-white" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
//           <polyline points="4 11 8 15 16 6" />
//         </svg>
//       </>
//     )}
//   </span>
// );

// /* -----------------------------------------------------------------------------
//    STYLES
// ----------------------------------------------------------------------------- */
// const styles = {
//   outfitFont: { fontFamily: "Outfit, sans-serif" }
// };

// /* -----------------------------------------------------------------------------
//    BUTTON CLASSES
//    Mirrors the dashboard All/Mine filter active/inactive style language.
// ----------------------------------------------------------------------------- */
// const btnClass = `
//   px-4 py-2 rounded text-sm
//   border border-[#00263F]/50 dark:border-slate-500/60
//   bg-[#017ACB] text-white
//   hover:bg-[#017ACB]/20 hover:text-gray-700
//   dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100
//   transition whitespace-nowrap
//   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//   dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
//   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//   dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
//   relative before:content-[''] before:absolute before:inset-0 before:rounded
//   before:pointer-events-none
//   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
//   dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
// `;

// const btnDarkClass = `
//   px-4 py-2 rounded text-sm
//   border border-black/50 dark:border-slate-500/60
//   bg-[#003A5C] text-white
//   dark:bg-[#0A5F8A] dark:text-white
//   hover:bg-[#017ACB]/20 hover:text-gray-700
//   dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100
//   transition whitespace-nowrap
//   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//   dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
//   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//   dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
//   relative
//   before:content-[''] before:absolute before:inset-0 before:rounded
//   before:pointer-events-none
//   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
//   dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
// `;

// /* -----------------------------------------------------------------------------
//    TAB BUTTON CLASS BUILDER
//    Mirrors the dashboard All/Mine filter active/inactive states.
// ----------------------------------------------------------------------------- */
// const tabClass = (isActive) => `
//   px-4 py-2 rounded text-sm
//   border border-[#00263F]/50 dark:border-slate-500/60
//   ${isActive
//     ? 'bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
//     : 'bg-[#017ACB] text-white hover:bg-[#017ACB]/80 dark:hover:bg-[#017ACB]/80'
//   }
//   transition whitespace-nowrap
//   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//   dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
//   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//   dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
//   relative before:content-[''] before:absolute before:inset-0 before:rounded
//   before:pointer-events-none
//   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
//   dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
// `;

// /* colBtnClass — ▼ buttons inside table header cells.
//    No before: pseudo-element to avoid the fractional height shift that causes
//    the button to nudge upward on hover inside a flex header cell. */
// const colBtnClass = `
//   ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold
//   border border-black/50 hover:bg-[#CDE6F7] transition
//   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.14)]
//   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.14)]
//   relative before:content-[''] before:absolute before:inset-0 before:rounded
//   before:pointer-events-none
//   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.10),inset_0_-1px_2px_rgba(0,0,0,0.10)]
// `;

// /* menuClass — fixed-position overlay, z-[30000] floats above sticky headers */
// const menuClass = `
//   dropdown-menu fixed bg-white dark:bg-slate-800 text-black dark:text-slate-100 shadow-lg rounded
//   min-w-[12rem] w-max max-w-xs max-h-[min(80vh,580px)] overflow-y-auto
//   z-[30000] border border-gray-300 dark:border-slate-600 pointer-events-auto
// `;

// /* =============================================================================
//    MAIN COMPONENT
//    ============================================================================= */
// export default function AssignmentsAllocationsPage() {
//   const router       = useRouter();
//   const searchParams = useSearchParams();
//   const refresh      = searchParams.get("refresh");

//   /* ---------------------------------------------------------------------------
//      STATE
//      All array states default to [] — prevents renders from receiving undefined.
//   --------------------------------------------------------------------------- */
//   const [user, setUser]           = useState(null);
//   const [highlightedEmpId, setHighlightedEmpId] = useState(null); // Row highlight
//   const toggleHighlight = (empId) => setHighlightedEmpId(prev => prev === empId ? null : empId);

//   const startMonthMenuRef = useRef(null);

//   const [allRows, setAllRows]           = useState([]);
//   const [mine, setMine]                 = useState([]);
//   const [filteredRows, setFilteredRows] = useState([]);
//   const [months, setMonths]             = useState([]);
//   const [activeTab, setActiveTab]       = useState("all");
//   const [loading, setLoading]           = useState(true);

//   // Confirm dialogs
//   const [confirmDialog, setConfirmDialog]     = useState(null); // { row, m, index }
//   const [overAllocConfirm, setOverAllocConfirm] = useState(null); // { row, m, index, newValue, maxCapacity }

//   // Filter selections — [] = no filter
//   const [selectedResources, setSelectedResources]           = useState([]);
//   const [selectedProjects, setSelectedProjects]             = useState([]);
//   const [selectedCategories, setSelectedCategories]         = useState([]);
//   const [selectedLeaders, setSelectedLeaders]               = useState([]);
//   const [selectedRequestors, setSelectedRequestors]         = useState([]);
//   const [selectedRequestorVPs, setSelectedRequestorVPs]     = useState([]);
//   const [selectedRequestingDepts, setSelectedRequestingDepts] = useState([]);
//   const [selectedManagers, setSelectedManagers]             = useState([]);

//   const [resourceSort, setResourceSort]     = useState("");
//   const [resourceSearch, setResourceSearch] = useState(""); // Search inside resource dropdown

//   // Dropdown visibility flags
//   const [showResourceMenu, setShowResourceMenu]           = useState(false);
//   const [showProjectMenu, setShowProjectMenu]             = useState(false);
//   const [showCategoryMenu, setShowCategoryMenu]           = useState(false);
//   const [showLeaderMenu, setShowLeaderMenu]               = useState(false);
//   const [showRequestorMenu, setShowRequestorMenu]         = useState(false);
//   const [showRequestorVPMenu, setShowRequestorVPMenu]     = useState(false);
//   const [showRequestingDeptMenu, setShowRequestingDeptMenu] = useState(false);
//   const [showManagerMenu, setShowManagerMenu]             = useState(false);
//   const [showStartMonthMenu, setShowStartMonthMenu]       = useState(false);
//   const [menuPosition, setMenuPosition]                   = useState({ x: 0, y: 0 });

//   // Available filter option lists — built from server response data only
//   const [availableResources, setAvailableResources]           = useState([]);
//   const [availableProjects, setAvailableProjects]             = useState([]);
//   const [availableCategories, setAvailableCategories]         = useState([]);
//   const [availableLeaders, setAvailableLeaders]               = useState([]);
//   const [availableRequestors, setAvailableRequestors]         = useState([]);
//   const [availableRequestorVPs, setAvailableRequestorVPs]     = useState([]);
//   const [availableRequestingDepts, setAvailableRequestingDepts] = useState([]);
//   const [availableManagers, setAvailableManagers]             = useState([]);

//   const [startMonth, setStartMonth] = useState(null);

//   /* ---------------------------------------------------------------------------
//      HELPERS: menu open/close and filter toggle
//   --------------------------------------------------------------------------- */
//   const closeAllMenus = () => {
//     setShowResourceMenu(false); setShowProjectMenu(false); setShowCategoryMenu(false);
//     setShowLeaderMenu(false); setShowRequestorMenu(false); setShowRequestorVPMenu(false);
//     setShowRequestingDeptMenu(false); setShowManagerMenu(false); setShowStartMonthMenu(false);
//     setResourceSearch(""); // Clear search when any menu closes
//   };

//   // Toggle-aware: clicking the same ▼ button closes the menu
//   const openMenu = (e, setFn, currentlyOpen) => {
//     e.stopPropagation();
//     if (currentlyOpen) { closeAllMenus(); return; }
//     const rect = e.currentTarget.getBoundingClientRect();
//     let x = rect.left, y = rect.bottom + 4;
//     if (x + 320 > window.innerWidth) x = window.innerWidth - 320 - 10;
//     setMenuPosition({ x, y });
//     closeAllMenus();
//     setFn(true);
//   };

//   const toggleSelection = (value, setFn, current) => {
//     setFn(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
//   };

//   /* ---------------------------------------------------------------------------
//      KEY HANDLER: allocation cell input
//      Enter — commits the edit by blurring.
//      Escape — cancels without saving.
//   --------------------------------------------------------------------------- */
//   const handleAllocationKey = (e, index) => {
//     if (e.key === "Enter") e.target.blur();
//     if (e.key === "Escape") {
//       const clearEditing = (prev) => prev.map((r, i) => i === index ? { ...r, editing: null } : r);
//       setAllRows(prev => prev.map((r, i) => i === index ? { ...r, editing: null } : r));
//       setMine(prev => prev.map((r, i) => i === index ? { ...r, editing: null } : r));
//       setFilteredRows(clearEditing);
//     }
//   };

//   /* ---------------------------------------------------------------------------
//      BLUR HANDLER: save allocation to DB
//      ---------------------------------------------------------------------------
//      Optimistically updates allRows, mine, AND filteredRows — all three must
//      be updated to prevent Effect 6 from resurrecting stale values on any
//      filter change that triggers a re-derive.

//      SECURITY:
//      • emp_id and month key come from server-sourced data — never user input.
//      • amount parsed with parseFloat — NaN → null → triggers DELETE.
//   --------------------------------------------------------------------------- */
//   const handleAllocationBlur = async (e, row, m, index) => {
//     const raw      = e.target.value;
//     const newValue = raw === "" ? null : parseFloat(raw);

//     // If clearing the last allocation — show confirm dialog before deleting
//     if (newValue === null) {
//       const otherMonths = Object.entries(row.allocations || {}).filter(
//         ([key, val]) => key !== m.key && val !== null && val !== undefined && val !== "" && !Number.isNaN(Number(val))
//       );
//       if (otherMonths.length === 0) {
//         setConfirmDialog({ row, m, index });
//         const clearEditing = (prev) =>
//           prev.map(r =>
//             r.employee?.emp_id === row.employee?.emp_id && r.assignment?.project_name === row.assignment?.project_name
//               ? { ...r, editing: null }
//               : r
//           );
//         setAllRows(clearEditing); setMine(clearEditing); setFilteredRows(clearEditing);
//         return; // Don't save yet — wait for user confirmation
//       }
//     }

//     // Over-allocation check — fetch capacity and compare total before saving
//     if (newValue !== null && !isNaN(newValue)) {
//       try {
//         const capRes   = await api.get(`/resources/employees/${row.employee.emp_id}/capacity`);
//         const capData  = Array.isArray(capRes.data) ? capRes.data : [];
//         const capEntry = capData.find(c => String(c.date) === String(m.key));
//         const maxCapacity = capEntry ? parseFloat(capEntry.amount) : 1;

//         // Sum all other allocations for this employee in this month
//         const otherTotal = allRows
//           .filter(r => r.employee?.emp_id === row.employee?.emp_id && r.assignment?.project_name !== row.assignment?.project_name)
//           .reduce((sum, r) => { const val = parseFloat(r.allocations?.[m.key]); return sum + (isNaN(val) ? 0 : val); }, 0);

//         if (otherTotal + newValue > maxCapacity) {
//           setOverAllocConfirm({ row, m, index, newValue, maxCapacity });
//           return; // Wait for user confirmation
//         }
//       } catch (err) {
//         console.error("Failed to fetch capacity:", err);
//         // Fall through and save anyway if capacity fetch fails
//       }
//     }

//     // Optimistic update — update all three arrays so Effect 6 re-derives correctly
//     const updateAllocations = (prev) =>
//       prev.map(r =>
//         r.employee?.emp_id === row.employee?.emp_id && r.assignment?.project_name === row.assignment?.project_name
//           ? { ...r, allocations: { ...r.allocations, [m.key]: newValue }, editing: null }
//           : r
//       );
//     setAllRows(updateAllocations);
//     setMine(updateAllocations);

//     try {
//       if (newValue === null) {
//         await api.delete(`/assignments-allocations/delete`, { data: { emp_id: row.employee.emp_id, month: m.key, activity: row.assignment.project_name, category: row.assignment.category } });
//       } else {
//         await api.put(`/assignments-allocations/${row.employee.emp_id}/amount`, { emp_id: row.employee.emp_id, month: m.key, amount: newValue, activity: row.assignment.project_name, category: row.assignment.category });
//       }
//     } catch (err) { console.error("Failed to update allocation:", err); }
//   };

//   /* ---------------------------------------------------------------------------
//      EFFECT 1: LOAD USER SESSION
//   --------------------------------------------------------------------------- */
//   useEffect(() => {
//     try {
//       const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
//       if (stored) setUser(JSON.parse(stored));
//     } catch { setUser(null); }
//   }, []);

//   /* ---------------------------------------------------------------------------
//      EFFECT 2: LOAD ASSIGNMENTS
//      ---------------------------------------------------------------------------
//      Skips until user.username is available. Cache-Control headers force a
//      fresh response — prevents stale data after an edit on another page.
//      &ts=Date.now() cache-busts the URL on re-navigation.
//   --------------------------------------------------------------------------- */
//   useEffect(() => {
//     if (!user?.username) return;

//     const loadAll = async () => {
//       try {
//         setLoading(true);
//         const res = await api.get(
//           `/assignments-allocations?username=${encodeURIComponent(user.username)}&ts=${Date.now()}`,
//           { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0" } }
//         );
//         const data = res?.data || {};
//         setAllRows(data.allAssignments || []);
//         setMine(data.myAssignments     || []);
//         setMonths(data.months          || []);
//         setFilteredRows(data.allAssignments || []);
//       } catch {
//         setAllRows([]); setMine([]); setFilteredRows([]); setMonths([]);
//       } finally { setLoading(false); }
//     };

//     loadAll();
//   }, [user, refresh]);

//   /* ---------------------------------------------------------------------------
//      EFFECT 3: DEFAULT START MONTH
//      Defaults to the current calendar month once months are loaded.
//   --------------------------------------------------------------------------- */
//   useEffect(() => {
//     if (!months.length || startMonth) return;
//     const now     = new Date();
//     const current = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
//     setStartMonth(months.includes(current) ? current : months[0]);
//   }, [months, startMonth]);

//   /* ---------------------------------------------------------------------------
//      MEMO: visibleMonths + monthLabels
//      16 months starting from startMonth.
//      monthLabels converts YYYYMM strings to { key, label } for header rendering.
//   --------------------------------------------------------------------------- */
//   const visibleMonths = useMemo(() => {
//     if (!months.length) return [];
//     const start = startMonth && months.includes(startMonth) ? startMonth : months[0];
//     const idx   = months.indexOf(start);
//     return months.slice(idx, idx + 16);
//   }, [months, startMonth]);

//   const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

//   const monthLabels = useMemo(() => {
//     return visibleMonths.map(m => ({
//       key:   m,
//       label: `${monthNames[parseInt(m.substring(4, 6), 10) - 1]} ${m.substring(0, 4)}`
//     }));
//   }, [visibleMonths]);

//   /* ---------------------------------------------------------------------------
//      MEMO: rowsWithVisibleAllocations
//      Tab-aware — uses mine when on My Assignments so filter lists only show
//      values relevant to the logged-in user. Only includes rows with at least
//      one allocation in the visible month window.
//   --------------------------------------------------------------------------- */
//   const rowsWithVisibleAllocations = useMemo(() => {
//     const source = activeTab === "mine" ? mine : allRows;
//     let rows = source.filter(row =>
//       visibleMonths.some(m => {
//         const val = row.allocations?.[m];
//         return val !== null && val !== undefined && val !== "";
//       })
//     );
//     if (resourceSort === "asc")  rows = [...rows].sort((a, b) => a.employee.emp_name.localeCompare(b.employee.emp_name));
//     if (resourceSort === "desc") rows = [...rows].sort((a, b) => b.employee.emp_name.localeCompare(a.employee.emp_name));
//     return rows;
//   }, [allRows, mine, activeTab, visibleMonths, resourceSort]);

//   /* ---------------------------------------------------------------------------
//      EFFECT 4: BUILD FILTER OPTION LISTS
//      Derived from rowsWithVisibleAllocations — tab-aware, server data only.
//   --------------------------------------------------------------------------- */
//   useEffect(() => {
//     const uniq = (arr) => [...new Set(arr)].filter(Boolean);
//     let res = uniq(rowsWithVisibleAllocations.map(r => r.employee?.emp_name || ""));
//     if (resourceSort === "asc")  res.sort((a, b) => a.localeCompare(b));
//     if (resourceSort === "desc") res.sort((a, b) => b.localeCompare(a));
//     setAvailableResources(res);
//     setAvailableProjects(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.project_name || "")));
//     setAvailableCategories(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.category || "")));
//     setAvailableLeaders(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.leader || "")));
//     setAvailableRequestors(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.requestor || "")));
//     setAvailableRequestorVPs(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.requestor_vp || "")));
//     setAvailableRequestingDepts(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.requesting_dept_name || r.assignment?.requesting_dept || "")));
//     setAvailableManagers(uniq(rowsWithVisibleAllocations.map(r => r.employee?.manager_name || "")));
//   }, [rowsWithVisibleAllocations, resourceSort]);

//   /* ---------------------------------------------------------------------------
//      EFFECT 5: CLOSE MENUS ON OUTSIDE CLICK
//   --------------------------------------------------------------------------- */
//   useEffect(() => {
//     const handler = (e) => { if (!e.target.closest(".dropdown-menu")) closeAllMenus(); };
//     window.addEventListener("click", handler);
//     return () => window.removeEventListener("click", handler);
//   }, []);

//   /* ---------------------------------------------------------------------------
//      EFFECT 6: MAIN FILTERING LOGIC
//      Applies all active filter selections. Row must have at least one
//      allocation in the visible month window to be included.
//   --------------------------------------------------------------------------- */
//   useEffect(() => {
//     if (!user) return;

//     let filtered = (activeTab === "mine" ? mine : allRows).filter(row => {
//       const empName        = row.employee?.emp_name || "";
//       const project        = row.assignment?.project_name || "";
//       const category       = row.assignment?.category || "";
//       const leader         = row.assignment?.leader || "";
//       const requestor      = row.assignment?.requestor || "";
//       const requestorVP    = row.assignment?.requestor_vp || "";
//       const requestingDept = row.assignment?.requesting_dept_name || row.assignment?.requesting_dept || "";
//       const managerName    = row.employee?.manager_name || "";

//       const passesFilters =
//         (!selectedResources.length     || selectedResources.includes(empName)) &&
//         (!selectedProjects.length      || selectedProjects.includes(project)) &&
//         (!selectedCategories.length    || selectedCategories.includes(category)) &&
//         (!selectedLeaders.length       || selectedLeaders.includes(leader)) &&
//         (!selectedRequestors.length    || selectedRequestors.includes(requestor)) &&
//         (!selectedRequestorVPs.length  || selectedRequestorVPs.includes(requestorVP)) &&
//         (!selectedRequestingDepts.length || selectedRequestingDepts.includes(requestingDept)) &&
//         (!selectedManagers.length      || selectedManagers.includes(managerName));

//       if (!passesFilters) return false;

//       // Must have at least one visible allocation — empty rows are not shown
//       return visibleMonths.some(m => {
//         const val = row.allocations?.[m];
//         return val !== null && val !== undefined && val !== "";
//       });
//     });

//     if (resourceSort === "asc")  filtered.sort((a, b) => a.employee.emp_name.localeCompare(b.employee.emp_name));
//     if (resourceSort === "desc") filtered.sort((a, b) => b.employee.emp_name.localeCompare(a.employee.emp_name));

//     setFilteredRows(filtered);
//   }, [
//     user, activeTab, mine, allRows, visibleMonths,
//     selectedResources, selectedProjects, selectedCategories,
//     selectedLeaders, selectedRequestors, selectedRequestorVPs,
//     selectedRequestingDepts, selectedManagers, resourceSort
//   ]);

//   /* ---------------------------------------------------------------------------
//      HANDLER: navigate to edit allocation page for a row
//   --------------------------------------------------------------------------- */
//   const handleEditAllocation = (row) => {
//     router.push(
//       `/resource-manager/assign-edit-allocation/edit-allocation` +
//       `?emp_id=${row.employee?.emp_id}` +
//       `&project=${encodeURIComponent(row.assignment?.project_name)}` +
//       `&category=${encodeURIComponent(row.assignment?.category)}`
//     );
//   };

//   /* ---------------------------------------------------------------------------
//      HANDLER: handleOverAllocConfirm
//      User clicked "Yes" on the over-allocation warning — save anyway.
//   --------------------------------------------------------------------------- */
//   const handleOverAllocConfirm = async () => {
//     const { row, m, newValue } = overAllocConfirm;
//     setOverAllocConfirm(null);

//     const updateAllocations = (prev) =>
//       prev.map(r =>
//         r.employee?.emp_id === row.employee?.emp_id && r.assignment?.project_name === row.assignment?.project_name
//           ? { ...r, allocations: { ...r.allocations, [m.key]: newValue }, editing: null }
//           : r
//       );
//     setAllRows(updateAllocations);
//     setMine(updateAllocations);

//     try {
//       await api.put(`/assignments-allocations/${row.employee.emp_id}/amount`, {
//         emp_id: row.employee.emp_id, month: m.key, amount: newValue,
//         activity: row.assignment.project_name, category: row.assignment.category
//       });
//     } catch (err) { console.error("Failed to update allocation:", err); }
//   };

//   /* ---------------------------------------------------------------------------
//      HANDLER: handleConfirmDelete
//      User confirmed deletion of the last allocation on a row.
//      Refreshes the page after deletion so the empty row disappears.
//   --------------------------------------------------------------------------- */
//   const handleConfirmDelete = async () => {
//     const { row, m } = confirmDialog;
//     setConfirmDialog(null);

//     const updateAllocations = (prev) =>
//       prev.map(r =>
//         r.employee?.emp_id === row.employee?.emp_id && r.assignment?.project_name === row.assignment?.project_name
//           ? { ...r, allocations: { ...r.allocations, [m.key]: null }, editing: null }
//           : r
//       );
//     setAllRows(updateAllocations); setMine(updateAllocations); setFilteredRows(updateAllocations);

//     try {
//       await api.delete(`/assignments-allocations/delete`, { data: { emp_id: row.employee.emp_id, month: m.key, activity: row.assignment.project_name, category: row.assignment.category } });
//       // Refresh so the now-empty row disappears cleanly
//       router.replace(`/resource-manager/assign-edit-allocation?refresh=${Date.now()}`);
//     } catch (err) { console.error("Failed to delete last allocation:", err); }
//   };

//   /* ---------------------------------------------------------------------------
//      LOADING STATE
//   --------------------------------------------------------------------------- */
//   if (!user || loading) {
//     return (
//       <div className="h-[600px] bg-background flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" aria-label="Loading assignments" />
//       </div>
//     );
//   }

//   /* ---------------------------------------------------------------------------
//      RENDER HELPER: renderMenuItems
//      Renders sort options (resource column only), "All", and the option list.
//      If searchable, the resource dropdown also includes a search input.
//   --------------------------------------------------------------------------- */
//   const renderMenuItems = (available, selected, setSelected, sortOptions = null, searchable = false) => {
//     const displayList = searchable && resourceSearch
//       ? available.filter(n => n.toLowerCase().includes(resourceSearch.toLowerCase()))
//       : available;

//     return (
//       <>
//         {sortOptions && (
//           <>
//             {[{ val: "asc", label: "A → Z" }, { val: "desc", label: "Z → A" }].map(({ val, label }) => (
//               <div key={val}
//                 className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${resourceSort === val ? "font-bold" : ""}`}
//                 onClick={() => setResourceSort(resourceSort === val ? "" : val)}
//               >
//                 <Checkbox checked={resourceSort === val} />{label}
//               </div>
//             ))}
//             <div className="border-t my-2 dark:border-slate-600" />
//           </>
//         )}

//         {searchable && (
//         <div className="px-2 pt-1 pb-1 border-b border-gray-300">
//           <input type="text" placeholder="Search name..." value={resourceSearch} onChange={e => setResourceSearch(e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-400 rounded text-black dark:bg-[#1f1f1f] dark:text-slate-100 dark:border-slate-600 dark:placeholder:text-slate-400 hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400" onClick={e => e.stopPropagation()} />
//         </div>
//         )}

//         {/* "All" clears the filter */}
//         <div
//           className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${selected.length === 0 ? "font-bold" : ""}`}
//           onClick={() => setSelected([])}
//         >
//           <Checkbox checked={selected.length === 0} />All
//         </div>

//         {displayList.map(name => (
//           <div key={name}
//             className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${selected.includes(name) ? "font-bold" : ""}`}
//             onClick={() => toggleSelection(name, setSelected, selected)}
//           >
//             <Checkbox checked={selected.includes(name)} />{name}
//           </div>
//         ))}

//         {searchable && resourceSearch && displayList.length === 0 && (
//           <div className="px-3 py-2 text-sm text-gray-400 dark:text-slate-500">No results</div>
//         )}
//       </>
//     );
//   };

//   /* ===========================================================================
//      RENDER
//   =========================================================================== */
//   return (
//     <div className="h-[600px] page-surface">

//       {/* CONFIRM DIALOG — shown when clearing the last allocation on a row */}
//       {confirmDialog && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999] px-4">
//           <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
//             <h2 className="text-lg font-bold text-black mb-2" style={styles.outfitFont}>Remove Allocation</h2>
//             <p className="text-sm text-gray-700 mb-6" style={styles.outfitFont}>
//               This is the last allocation for this assignment. Are you sure you want to remove it?
//             </p>
//             <div className="flex justify-end gap-3">
//               <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 rounded text-sm bg-gray-200 text-black border border-black/50 hover:bg-[#017ACB]/20 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]" style={styles.outfitFont}>No</button>
//               <button onClick={handleConfirmDelete} className="px-4 py-2 rounded text-sm bg-[#017ACB] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]" style={styles.outfitFont}>Yes</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* OVER-ALLOCATION WARNING DIALOG */}
//       {overAllocConfirm && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999] px-4">
//           <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
//             <h2 className="text-lg font-bold text-black mb-2" style={styles.outfitFont}>Over-Allocation Warning</h2>
//             <p className="text-sm text-gray-700 mb-6" style={styles.outfitFont}>
//               This allocation will bring <strong>{overAllocConfirm.row.employee?.emp_name}</strong>'s total for <strong>{overAllocConfirm.m.label}</strong> above their capacity of <strong>{overAllocConfirm.maxCapacity}</strong>. Are you sure you want to do this?
//             </p>
//             <div className="flex justify-end gap-3">
//               <button onClick={() => setOverAllocConfirm(null)} className="px-4 py-2 rounded text-sm bg-[#003A5C] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]" style={styles.outfitFont}>No</button>
//               <button onClick={handleOverAllocConfirm} className="px-4 py-2 rounded text-sm bg-[#017ACB] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]" style={styles.outfitFont}>Yes</button>
//             </div>
//           </div>
//         </div>
//       )}

//       <main className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 py-4">

//         {/* PAGE HEADER */}
//         <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
//           <div className="flex flex-wrap items-center gap-3">
//             <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white" style={styles.outfitFont}>
//               Assignments &amp; Allocations
//             </h2>

//             <button
//               onClick={() => router.push('/resource-manager/dashboard')}
//               className={btnDarkClass}
//               style={styles.outfitFont}
//             >
//               Back to Dashboard
//             </button>
//           </div>

//           {/* TABS + ADD — switching tabs clears all active filters */}
//           <div className="flex flex-wrap gap-2 items-center">
//             {["all", "mine"].map(tab => (
//               <button
//                 key={tab}
//                 onClick={() => {
//                   setActiveTab(tab);
//                   setSelectedResources([]); setSelectedProjects([]); setSelectedCategories([]);
//                   setSelectedLeaders([]); setSelectedRequestors([]); setSelectedRequestorVPs([]);
//                   setSelectedRequestingDepts([]); setSelectedManagers([]);
//                 }}
//                 aria-pressed={activeTab === tab}
//                 className={tabClass(activeTab === tab)}
//                 style={styles.outfitFont}
//               >
//                 {tab === "all" ? "All Assignments" : "My Assignments"}
//               </button>
//             ))}
//             <button onClick={() => router.push("/resource-manager/assign-edit-allocation/add-allocation")} aria-label="Add a new allocation" className={btnClass} style={styles.outfitFont}>
//               + Add Allocation
//             </button>
//           </div>
//         </div>

//         {/* ASSIGNMENTS TABLE */}
//         <div className="table-surface border rounded-lg shadow-sm bg-white overflow-hidden">
//           <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
//             <table className="min-w-max w-full border-collapse text-sm">

//               <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
//                 <tr>

//                   {/* EDIT — sticky left, always visible while scrolling right */}
//                   <th className="sticky left-0 top-0 z-[9999] w-19 min-w-19 bg-[#017ACB] px-2 sm:px-4 py-2 text-sm font-semibold whitespace-nowrap align-middle bg-clip-padding" style={styles.outfitFont}>
//                     Edit
//                   </th>

//                   {/* RESOURCE NAME — sort + search + filter */}
//                   <th className="sticky left-19 top-0 z-[9998] px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB] min-w-[150px] bg-clip-padding" style={styles.outfitFont}>
//                     <div className="flex justify-between items-center">
//                       <span>Resource Name</span>
//                       <button className={colBtnClass} onClick={e => openMenu(e, setShowResourceMenu, showResourceMenu)}>▼</button>
//                     </div>
//                     {showResourceMenu && (
//                       <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
//                         {renderMenuItems(availableResources, selectedResources, setSelectedResources, true, true)}
//                       </div>
//                     )}
//                   </th>

//                   <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>Department</th>

//                   <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
//                     <div className="flex justify-between items-center">
//                       <span>Reports To</span>
//                       <button className={colBtnClass} onClick={e => openMenu(e, setShowManagerMenu, showManagerMenu)}>▼</button>
//                     </div>
//                     {showManagerMenu && (
//                       <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
//                         {renderMenuItems(availableManagers, selectedManagers, setSelectedManagers)}
//                       </div>
//                     )}
//                   </th>

//                   <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
//                     <div className="flex justify-between items-center">
//                       <span>Project</span>
//                       <button className={colBtnClass} onClick={e => openMenu(e, setShowProjectMenu, showProjectMenu)}>▼</button>
//                     </div>
//                     {showProjectMenu && (
//                       <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
//                         {renderMenuItems(availableProjects, selectedProjects, setSelectedProjects)}
//                       </div>
//                     )}
//                   </th>

//                   <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
//                     <div className="flex justify-between items-center">
//                       <span>Activity Category</span>
//                       <button className={colBtnClass} onClick={e => openMenu(e, setShowCategoryMenu, showCategoryMenu)}>▼</button>
//                     </div>
//                     {showCategoryMenu && (
//                       <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
//                         {renderMenuItems(availableCategories, selectedCategories, setSelectedCategories)}
//                       </div>
//                     )}
//                   </th>

//                   <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
//                     <div className="flex justify-between items-center">
//                       <span>Leader Accountable</span>
//                       <button className={colBtnClass} onClick={e => openMenu(e, setShowLeaderMenu, showLeaderMenu)}>▼</button>
//                     </div>
//                     {showLeaderMenu && (
//                       <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
//                         {renderMenuItems(availableLeaders, selectedLeaders, setSelectedLeaders)}
//                       </div>
//                     )}
//                   </th>

//                   <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
//                     <div className="flex justify-between items-center">
//                       <span>Requestor</span>
//                       <button className={colBtnClass} onClick={e => openMenu(e, setShowRequestorMenu, showRequestorMenu)}>▼</button>
//                     </div>
//                     {showRequestorMenu && (
//                       <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
//                         {renderMenuItems(availableRequestors, selectedRequestors, setSelectedRequestors)}
//                       </div>
//                     )}
//                   </th>

//                   <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
//                     <div className="flex justify-between items-center">
//                       <span>Requestor VP</span>
//                       <button className={colBtnClass} onClick={e => openMenu(e, setShowRequestorVPMenu, showRequestorVPMenu)}>▼</button>
//                     </div>
//                     {showRequestorVPMenu && (
//                       <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
//                         {renderMenuItems(availableRequestorVPs, selectedRequestorVPs, setSelectedRequestorVPs)}
//                       </div>
//                     )}
//                   </th>

//                   <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
//                     <div className="flex justify-between items-center">
//                       <span>Requesting Dept</span>
//                       <button className={colBtnClass} onClick={e => openMenu(e, setShowRequestingDeptMenu, showRequestingDeptMenu)}>▼</button>
//                     </div>
//                     {showRequestingDeptMenu && (
//                       <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
//                         {renderMenuItems(availableRequestingDepts, selectedRequestingDepts, setSelectedRequestingDepts)}
//                       </div>
//                     )}
//                   </th>

//                   {/* START MONTH — first visible month + ▼ to change start */}
//                   <th className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
//                     <div className="flex justify-between items-center">
//                       <span>{monthLabels.length ? monthLabels[0].label : "Start Month"}</span>
//                       <button className={colBtnClass} onClick={e => {
//                         openMenu(e, setShowStartMonthMenu, showStartMonthMenu);
//                         // Scroll to selected month after the menu renders
//                         setTimeout(() => {
//                           if (startMonthMenuRef.current) {
//                             const el = startMonthMenuRef.current.querySelector(`[data-month="${startMonth}"]`);
//                             if (el) el.scrollIntoView({ block: "center" });
//                           }
//                         }, 0);
//                       }}>▼</button>
//                     </div>
//                     {showStartMonthMenu && (
//                       <div ref={startMonthMenuRef} className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
//                         {months.map(m => {
//                           const label = `${monthNames[parseInt(m.substring(4, 6), 10) - 1]} ${m.substring(0, 4)}`;
//                           return (
//                             <div key={m} data-month={m}
//                               className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${startMonth === m ? "font-bold" : ""}`}
//                               onClick={() => { setStartMonth(m); setShowStartMonthMenu(false); }}
//                             >
//                               <Checkbox checked={startMonth === m} />{label}
//                             </div>
//                           );
//                         })}
//                       </div>
//                     )}
//                   </th>

//                   {/* REMAINING MONTH COLUMNS — months 2–16 */}
//                   {monthLabels.slice(1).map(m => (
//                     <th key={m.key} className="px-2 sm:px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
//                       {m.label}
//                     </th>
//                   ))}

//                 </tr>
//               </thead>

//               <tbody>
//                 {filteredRows.length === 0 && (
//                   <tr>
//                     <td colSpan={11 + monthLabels.length} className="text-center py-8 text-gray-500 border" style={styles.outfitFont}>
//                       No assignments found.
//                     </td>
//                   </tr>
//                 )}

//                 {filteredRows.map((row, index) => {
//                   const empId         = row.employee?.emp_id;
//                   const isHighlighted = highlightedEmpId === empId;

//                   return (
//                     <tr
//                       key={index}
//                       onClick={() => toggleHighlight(empId)}
//                       className={`group cursor-pointer transition-colors hover:bg-[#017ACB]/20 ${isHighlighted ? "bg-[#CDE6F7]" : "bg-white"}`}
//                     >
//                       {/* EDIT — sticky left, stops row click propagation */}
//                       <td className={`sticky left-0 z-30 w-19 min-w-19 px-2 sm:px-4 py-2 border-r border-black text-black whitespace-nowrap ${isHighlighted ? "bg-[#CDE6F7]" : "bg-white group-hover:bg-[#017ACB]/20"}`} onClick={e => e.stopPropagation()}>
//                         <button
//                           onClick={e => { e.stopPropagation(); handleEditAllocation(row); }}
//                           className="
//                             px-2 py-1 rounded text-xs bg-[#017ACB] text-white border border-black/50
//                             hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:text-white transition
//                             shadow-[4px_4px_10px_rgba(0,0,0,0.25)]
//                             active:shadow-[2px_2px_6px_rgba(0,0,0,0.25)]
//                             relative before:content-[''] before:absolute before:inset-0 before:rounded
//                             before:pointer-events-none
//                             before:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),inset_0_-1px_2px_rgba(0,0,0,0.15)]
//                           "
//                           style={styles.outfitFont}
//                         >
//                           Edit
//                         </button>
//                       </td>

//                       {/* DATA CELLS */}
//                       <td className={`sticky left-19 z-20 px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap min-w-[150px] ${isHighlighted ? "bg-[#CDE6F7]" : "bg-white group-hover:bg-[#017ACB]/20"}`}>{row.employee?.emp_name}</td>
//                       <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.employee?.dept_name || ""}</td>
//                       <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.employee?.manager_name || ""}</td>
//                       <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.project_name}</td>
//                       <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.category}</td>
//                       <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.leader}</td>
//                       <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.requestor}</td>
//                       <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.requestor_vp}</td>
//                       <td className="px-2 sm:px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{row.assignment?.requesting_dept_name || row.assignment?.requesting_dept}</td>

//                       {/* MONTH CELLS — click to edit inline.
//                           editing state is set on all three arrays so it
//                           survives any filter re-run from Effect 6. */}
//                       {monthLabels.map(m => (
//                         <td
//                           key={m.key}
//                           className="px-2 sm:px-4 py-2 border text-sm text-black text-center whitespace-nowrap cursor-pointer bg-inherit"
//                           onClick={e => {
//                             e.stopPropagation();
//                             const setEditing = (prev) =>
//                               prev.map(r =>
//                                 r.employee?.emp_id === row.employee?.emp_id && r.assignment?.project_name === row.assignment?.project_name
//                                   ? { ...r, editing: m.key }
//                                   : r
//                               );
//                             setAllRows(setEditing); setMine(setEditing); setFilteredRows(setEditing);
//                           }}
//                         >
//                           {row.editing === m.key ? (
//                             <input
//                               autoFocus
//                               type="number"
//                               step="0.01"
//                               min="0"
//                               defaultValue={row.allocations?.[m.key] ?? ""}
//                               className="w-16 border border-black/50 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#017ACB]/40"
//                               onInput={e => { if (e.target.value.length > 4) e.target.value = e.target.value.slice(0, 4); }}
//                               onBlur={e => handleAllocationBlur(e, row, m, index)}
//                               onKeyDown={e => handleAllocationKey(e, index)}
//                             />
//                           ) : (
//                             <span>{row.allocations?.[m.key] ?? ""}</span>
//                           )}
//                         </td>
//                       ))}
//                     </tr>
//                   );
//                 })}
//               </tbody>

//             </table>
//           </div>
//         </div>

//       </main>
//     </div>
//   );
// }



"use client";
export const dynamic = 'force-dynamic';

/* =============================================================================
   AssignmentsAllocationsPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays all employee assignments and their monthly allocations in a
     scrollable, filterable table.

   TAB BUTTON COLOUR LOGIC:
     • Active (current tab)  = Blue (#017ACB) — "you are here"
     • Inactive (other tab)  = Grey (gray-200) — muted, available to click

   COLUMN FILTER BUTTONS (▼):
     Dark mode aware — slate-700 bg, #4DAEFF text in dark mode.
   ============================================================================= */

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";

/* =============================================================================
   COMPONENT: Checkbox — used inside all dropdown filter menus.
   ============================================================================= */
const Checkbox = ({ checked }) => (
  <span className="w-4 h-4 flex-shrink-0 border border-black dark:border-slate-400 rounded-sm flex items-center justify-center transition relative overflow-hidden">
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

const styles = { outfitFont: { fontFamily: "Outfit, sans-serif" } };

/* -----------------------------------------------------------------------------
   BUTTON CLASSES
----------------------------------------------------------------------------- */
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

/* -----------------------------------------------------------------------------
   TAB BUTTON CLASS BUILDER
   isActive = true  → Blue (#017ACB) — "you are here"
   isActive = false → Grey (gray-200) — muted, available to click
----------------------------------------------------------------------------- */
const tabClass = (isActive) => `
  px-4 py-2 rounded text-sm
  border border-[#00263F]/50 dark:border-slate-500/60
  ${isActive
    ? 'bg-[#017ACB] text-white dark:bg-[#017ACB]'
    : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600'
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

/* -----------------------------------------------------------------------------
   COLUMN FILTER BUTTON CLASS — dark mode aware
----------------------------------------------------------------------------- */
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

/* menuClass — fixed-position overlay, z-[30000] floats above sticky headers */
const menuClass = `
  dropdown-menu fixed
  bg-white dark:bg-slate-800
  text-black dark:text-slate-100
  shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
  rounded
  min-w-[12rem] w-max max-w-xs max-h-[min(80vh,580px)] overflow-y-auto
  z-[30000] border border-gray-300 dark:border-slate-600 pointer-events-auto
`;

/* =============================================================================
   MAIN COMPONENT
   ============================================================================= */
export default function AssignmentsAllocationsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refresh      = searchParams.get("refresh");

  /* ---------------------------------------------------------------------------
     STATE
  --------------------------------------------------------------------------- */
  const [user, setUser]                         = useState(null);
  const [highlightedEmpId, setHighlightedEmpId] = useState(null);
  const toggleHighlight = (empId) => setHighlightedEmpId(prev => prev === empId ? null : empId);

  const startMonthMenuRef = useRef(null);

  const [allRows, setAllRows]           = useState([]);
  const [mine, setMine]                 = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [months, setMonths]             = useState([]);
  const [activeTab, setActiveTab]       = useState("all");
  const [loading, setLoading]           = useState(true);

  const [confirmDialog, setConfirmDialog]       = useState(null);
  const [overAllocConfirm, setOverAllocConfirm] = useState(null);

  const [selectedResources, setSelectedResources]               = useState([]);
  const [selectedProjects, setSelectedProjects]                 = useState([]);
  const [selectedCategories, setSelectedCategories]             = useState([]);
  const [selectedLeaders, setSelectedLeaders]                   = useState([]);
  const [selectedRequestors, setSelectedRequestors]             = useState([]);
  const [selectedRequestorVPs, setSelectedRequestorVPs]         = useState([]);
  const [selectedRequestingDepts, setSelectedRequestingDepts]   = useState([]);
  const [selectedManagers, setSelectedManagers]                 = useState([]);

  const [resourceSort, setResourceSort]     = useState("");
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

  const [availableResources, setAvailableResources]               = useState([]);
  const [availableProjects, setAvailableProjects]                 = useState([]);
  const [availableCategories, setAvailableCategories]             = useState([]);
  const [availableLeaders, setAvailableLeaders]                   = useState([]);
  const [availableRequestors, setAvailableRequestors]             = useState([]);
  const [availableRequestorVPs, setAvailableRequestorVPs]         = useState([]);
  const [availableRequestingDepts, setAvailableRequestingDepts]   = useState([]);
  const [availableManagers, setAvailableManagers]                 = useState([]);

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

  /* ---------------------------------------------------------------------------
     KEY HANDLER: allocation cell input
  --------------------------------------------------------------------------- */
  const handleAllocationKey = (e, index) => {
    if (e.key === "Enter") e.target.blur();
    if (e.key === "Escape") {
      const clearEditing = (prev) => prev.map((r, i) => i === index ? { ...r, editing: null } : r);
      setAllRows(prev => prev.map((r, i) => i === index ? { ...r, editing: null } : r));
      setMine(prev => prev.map((r, i) => i === index ? { ...r, editing: null } : r));
      setFilteredRows(clearEditing);
    }
  };

  /* ---------------------------------------------------------------------------
     BLUR HANDLER: save allocation to DB
  --------------------------------------------------------------------------- */
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
    let rows = source.filter(row =>
      visibleMonths.some(m => { const val = row.allocations?.[m]; return val !== null && val !== undefined && val !== ""; })
    );
    if (resourceSort === "asc")  rows = [...rows].sort((a, b) => a.employee.emp_name.localeCompare(b.employee.emp_name));
    if (resourceSort === "desc") rows = [...rows].sort((a, b) => b.employee.emp_name.localeCompare(a.employee.emp_name));
    return rows;
  }, [allRows, mine, activeTab, visibleMonths, resourceSort]);

  useEffect(() => {
    const uniq = (arr) => [...new Set(arr)].filter(Boolean);
    let res = uniq(rowsWithVisibleAllocations.map(r => r.employee?.emp_name || ""));
    if (resourceSort === "asc")  res.sort((a, b) => a.localeCompare(b));
    if (resourceSort === "desc") res.sort((a, b) => b.localeCompare(a));
    setAvailableResources(res);
    setAvailableProjects(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.project_name || "")));
    setAvailableCategories(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.category || "")));
    setAvailableLeaders(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.leader || "")));
    setAvailableRequestors(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.requestor || "")));
    setAvailableRequestorVPs(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.requestor_vp || "")));
    setAvailableRequestingDepts(uniq(rowsWithVisibleAllocations.map(r => r.assignment?.requesting_dept_name || r.assignment?.requesting_dept || "")));
    setAvailableManagers(uniq(rowsWithVisibleAllocations.map(r => r.employee?.manager_name || "")));
  }, [rowsWithVisibleAllocations, resourceSort]);

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest(".dropdown-menu")) closeAllMenus(); };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    let filtered = (activeTab === "mine" ? mine : allRows).filter(row => {
      const empName        = row.employee?.emp_name || "";
      const project        = row.assignment?.project_name || "";
      const category       = row.assignment?.category || "";
      const leader         = row.assignment?.leader || "";
      const requestor      = row.assignment?.requestor || "";
      const requestorVP    = row.assignment?.requestor_vp || "";
      const requestingDept = row.assignment?.requesting_dept_name || row.assignment?.requesting_dept || "";
      const managerName    = row.employee?.manager_name || "";

      const passesFilters =
        (!selectedResources.length      || selectedResources.includes(empName)) &&
        (!selectedProjects.length       || selectedProjects.includes(project)) &&
        (!selectedCategories.length     || selectedCategories.includes(category)) &&
        (!selectedLeaders.length        || selectedLeaders.includes(leader)) &&
        (!selectedRequestors.length     || selectedRequestors.includes(requestor)) &&
        (!selectedRequestorVPs.length   || selectedRequestorVPs.includes(requestorVP)) &&
        (!selectedRequestingDepts.length|| selectedRequestingDepts.includes(requestingDept)) &&
        (!selectedManagers.length       || selectedManagers.includes(managerName));

      if (!passesFilters) return false;
      return visibleMonths.some(m => { const val = row.allocations?.[m]; return val !== null && val !== undefined && val !== ""; });
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
    setAllRows(updateAllocations); setMine(updateAllocations);
    try {
      await api.put(`/assignments-allocations/${row.employee.emp_id}/amount`, { emp_id: row.employee.emp_id, month: m.key, amount: newValue, activity: row.assignment.project_name, category: row.assignment.category });
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

  /* ---------------------------------------------------------------------------
     LOADING STATE
  --------------------------------------------------------------------------- */
  if (!user || loading) {
    return (
      <div className="h-[600px] bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" aria-label="Loading assignments" />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RENDER HELPER: renderMenuItems
  --------------------------------------------------------------------------- */
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
                className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${resourceSort === val ? "font-bold" : ""}`}
                onClick={() => setResourceSort(resourceSort === val ? "" : val)}
              >
                <Checkbox checked={resourceSort === val} />{label}
              </div>
            ))}
            <div className="border-t my-2 dark:border-slate-600" />
          </>
        )}
        {searchable && (
          <div className="px-2 pt-1 pb-1 border-b border-gray-300 dark:border-slate-600">
            <input type="text" placeholder="Search name..." value={resourceSearch} onChange={e => setResourceSearch(e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-400 dark:border-slate-500 rounded text-black dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400" onClick={e => e.stopPropagation()} />
          </div>
        )}
        <div className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${selected.length === 0 ? "font-bold" : ""}`} onClick={() => setSelected([])}>
          <Checkbox checked={selected.length === 0} />All
        </div>
        {displayList.map(name => (
          <div key={name}
            className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${selected.includes(name) ? "font-bold" : ""}`}
            onClick={() => toggleSelection(name, setSelected, selected)}
          >
            <Checkbox checked={selected.includes(name)} />{name}
          </div>
        ))}
        {searchable && resourceSearch && displayList.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-400 dark:text-slate-500">No results</div>
        )}
      </>
    );
  };

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="h-[600px] page-surface">

      {/* CONFIRM DIALOG — last allocation removal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999] px-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-transparent dark:border-slate-700 w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-black dark:text-white mb-2" style={styles.outfitFont}>Remove Allocation</h2>
            <p className="text-sm text-gray-700 dark:text-slate-300 mb-6" style={styles.outfitFont}>
              This is the last allocation for this assignment. Are you sure you want to remove it?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 rounded text-sm bg-gray-200 dark:bg-slate-700 text-black dark:text-slate-100 border border-black/50 dark:border-slate-500 hover:bg-gray-300 dark:hover:bg-slate-600 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]" style={styles.outfitFont}>No</button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 rounded text-sm bg-[#017ACB] dark:bg-[#005a96] text-white border border-black/50 dark:border-slate-500 hover:bg-[#017ACB]/80 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]" style={styles.outfitFont}>Yes</button>
            </div>
          </div>
        </div>
      )}

      {/* OVER-ALLOCATION WARNING DIALOG */}
      {overAllocConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999] px-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-transparent dark:border-slate-700 w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-black dark:text-white mb-2" style={styles.outfitFont}>Over-Allocation Warning</h2>
            <p className="text-sm text-gray-700 dark:text-slate-300 mb-6" style={styles.outfitFont}>
              This allocation will bring <strong>{overAllocConfirm.row.employee?.emp_name}</strong>'s total for <strong>{overAllocConfirm.m.label}</strong> above their capacity of <strong>{overAllocConfirm.maxCapacity}</strong>. Are you sure you want to do this?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setOverAllocConfirm(null)} className="px-4 py-2 rounded text-sm bg-[#003A5C] dark:bg-slate-700 text-white border border-black/50 dark:border-slate-500 hover:bg-[#017ACB]/20 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]" style={styles.outfitFont}>No</button>
              <button onClick={handleOverAllocConfirm} className="px-4 py-2 rounded text-sm bg-[#017ACB] dark:bg-[#005a96] text-white border border-black/50 dark:border-slate-500 hover:bg-[#017ACB]/80 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]" style={styles.outfitFont}>Yes</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 py-4">

        {/* PAGE HEADER */}
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white" style={styles.outfitFont}>
              Assignments &amp; Allocations
            </h2>
            <button onClick={() => router.push('/resource-manager/dashboard')} className={btnDarkClass} style={styles.outfitFont}>
              Back to Dashboard
            </button>
          </div>

          {/* TABS + ADD */}
          <div className="flex flex-wrap gap-2 items-center">
            {["all", "mine"].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedResources([]); setSelectedProjects([]); setSelectedCategories([]);
                  setSelectedLeaders([]); setSelectedRequestors([]); setSelectedRequestorVPs([]);
                  setSelectedRequestingDepts([]); setSelectedManagers([]);
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
        <div className="table-surface border dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
            <table className="min-w-max w-full border-collapse text-sm">

              <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
                <tr>

                  {/* EDIT — sticky left */}
                  <th className="sticky left-0 top-0 z-[9999] w-19 min-w-19 bg-[#017ACB] px-2 sm:px-4 py-2 text-sm font-semibold whitespace-nowrap align-middle bg-clip-padding" style={styles.outfitFont}>Edit</th>

                  {/* RESOURCE NAME */}
                  <th className="sticky left-19 top-0 z-[9998] px-2 sm:px-4 py-2 border border-black text-sm font-semibold whitespace-nowrap bg-[#017ACB] min-w-[150px] bg-clip-padding" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Resource Name</span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowResourceMenu, showResourceMenu)}>▼</button>
                    </div>
                    {showResourceMenu && (
                      <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                        {renderMenuItems(availableResources, selectedResources, setSelectedResources, true, true)}
                      </div>
                    )}
                  </th>

                  <th className="px-2 sm:px-4 py-2 border border-black text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>Department</th>

                  <th className="px-2 sm:px-4 py-2 border border-black text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Reports To</span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowManagerMenu, showManagerMenu)}>▼</button>
                    </div>
                    {showManagerMenu && (<div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>{renderMenuItems(availableManagers, selectedManagers, setSelectedManagers)}</div>)}
                  </th>

                  <th className="px-2 sm:px-4 py-2 border border-black text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Project</span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowProjectMenu, showProjectMenu)}>▼</button>
                    </div>
                    {showProjectMenu && (<div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>{renderMenuItems(availableProjects, selectedProjects, setSelectedProjects)}</div>)}
                  </th>

                  <th className="px-2 sm:px-4 py-2 border border-black text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Activity Category</span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowCategoryMenu, showCategoryMenu)}>▼</button>
                    </div>
                    {showCategoryMenu && (<div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>{renderMenuItems(availableCategories, selectedCategories, setSelectedCategories)}</div>)}
                  </th>

                  <th className="px-2 sm:px-4 py-2 border border-black text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Leader Accountable</span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowLeaderMenu, showLeaderMenu)}>▼</button>
                    </div>
                    {showLeaderMenu && (<div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>{renderMenuItems(availableLeaders, selectedLeaders, setSelectedLeaders)}</div>)}
                  </th>

                  <th className="px-2 sm:px-4 py-2 border border-black text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Requestor</span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowRequestorMenu, showRequestorMenu)}>▼</button>
                    </div>
                    {showRequestorMenu && (<div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>{renderMenuItems(availableRequestors, selectedRequestors, setSelectedRequestors)}</div>)}
                  </th>

                  <th className="px-2 sm:px-4 py-2 border border-black text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Requestor VP</span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowRequestorVPMenu, showRequestorVPMenu)}>▼</button>
                    </div>
                    {showRequestorVPMenu && (<div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>{renderMenuItems(availableRequestorVPs, selectedRequestorVPs, setSelectedRequestorVPs)}</div>)}
                  </th>

                  <th className="px-2 sm:px-4 py-2 border border-black text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                    <div className="flex justify-between items-center">
                      <span>Requesting Dept</span>
                      <button className={colBtnClass} onClick={e => openMenu(e, setShowRequestingDeptMenu, showRequestingDeptMenu)}>▼</button>
                    </div>
                    {showRequestingDeptMenu && (<div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>{renderMenuItems(availableRequestingDepts, selectedRequestingDepts, setSelectedRequestingDepts)}</div>)}
                  </th>

                  {/* START MONTH */}
                  <th className="px-2 sm:px-4 py-2 border border-black text-sm font-semibold whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
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
                              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${startMonth === m ? "font-bold" : ""}`}
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
                    <th key={m.key} className="px-2 sm:px-4 py-2 border border-black text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                      {m.label}
                    </th>
                  ))}

                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={11 + monthLabels.length} className="text-center py-8 text-gray-500 dark:text-slate-400 border border-black dark:border-slate-700" style={styles.outfitFont}>
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
                      className={`group cursor-pointer transition-colors hover:bg-[#017ACB]/10 dark:hover:bg-[#017ACB]/20 border-t border-black dark:border-slate-700 ${isHighlighted ? "bg-[#CDE6F7] dark:bg-[#0A5F8A]/30" : "bg-white dark:bg-slate-900"}`}
                    >
                      {/* EDIT — sticky left */}
                      <td className={`sticky left-0 z-30 w-19 min-w-19 px-2 sm:px-4 py-2 border-r border-black dark:border-slate-700 text-black whitespace-nowrap ${isHighlighted ? "bg-[#CDE6F7] dark:bg-[#0A5F8A]/30" : "bg-white dark:bg-slate-900 group-hover:bg-[#017ACB]/10 dark:group-hover:bg-[#017ACB]/20"}`} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => { e.stopPropagation(); handleEditAllocation(row); }}
                          className="px-2 py-1 rounded text-xs bg-[#017ACB] text-white border border-black/50 dark:border-slate-500 hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:text-white transition shadow-[4px_4px_10px_rgba(0,0,0,0.25)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),inset_0_-1px_2px_rgba(0,0,0,0.15)]"
                          style={styles.outfitFont}
                        >
                          Edit
                        </button>
                      </td>

                      {/* DATA CELLS */}
                      <td className={`sticky left-19 z-20 px-2 sm:px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap min-w-[150px] ${isHighlighted ? "bg-[#CDE6F7] dark:bg-[#0A5F8A]/30" : "bg-white dark:bg-slate-900 group-hover:bg-[#017ACB]/10 dark:group-hover:bg-[#017ACB]/20"}`}>{row.employee?.emp_name}</td>
                      <td className="px-2 sm:px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit">{row.employee?.dept_name || ""}</td>
                      <td className="px-2 sm:px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit">{row.employee?.manager_name || ""}</td>
                      <td className="px-2 sm:px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit">{row.assignment?.project_name}</td>
                      <td className="px-2 sm:px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit">{row.assignment?.category}</td>
                      <td className="px-2 sm:px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit">{row.assignment?.leader}</td>
                      <td className="px-2 sm:px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit">{row.assignment?.requestor}</td>
                      <td className="px-2 sm:px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit">{row.assignment?.requestor_vp}</td>
                      <td className="px-2 sm:px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 whitespace-nowrap bg-inherit">{row.assignment?.requesting_dept_name || row.assignment?.requesting_dept}</td>

                      {/* MONTH CELLS */}
                      {monthLabels.map(m => (
                        <td
                          key={m.key}
                          className="px-2 sm:px-4 py-2 border border-black dark:border-slate-700 text-sm text-black dark:text-slate-100 text-center whitespace-nowrap cursor-pointer bg-inherit"
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
                              className="w-16 border border-black/50 dark:border-slate-500 rounded text-center text-sm bg-white dark:bg-slate-700 text-black dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#017ACB]/40"
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