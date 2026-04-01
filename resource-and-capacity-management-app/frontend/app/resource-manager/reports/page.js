"use client";

/* =============================================================================
   Report.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays the Capacity Report with three switchable view modes:
       • Allocation per Category — 6-month capacity summary table
       • Allocation per Person   — Per-employee allocation, red when value > 1
       • Allocation per Activity — Filterable breakdown by project/activity

     Also supports CSV export for all three view modes.

   HOW IT WORKS:
     1. On mount, reads and validates the user session from localStorage
     2. Generates the last 12 months locally for the start month dropdown
        (no API call needed — months are derived from the current date)
     3. When user + startMonth are set, fetches all three data sources in parallel
     4. Renders the appropriate table body based on the current viewMode
     5. CSV export reads from validated state arrays — no re-fetch needed

   VIEW MODES:
     month    → Category view — 6 columns from startMonth, rows per category
     person   → Person view — 6 columns, rows per employee, red if value > capacity
     activity → Activity view — up to 6 columns, rows per project, with 5 filters

   PERSON VIEW — OVER-CAPACITY DETECTION:
     Each cell is compared against the employee's actual capacity for that month.
     Capacity is fetched per-employee from /resources/employees/:id/capacity.
     The month label (e.g. "Mar-26") is converted to a YYYYMM integer (202603)
     to match the format stored in the capacity collection. Cells where the
     allocated value exceeds the capacity are highlighted red.

   CSV EXPORT:
     Assembles a CSV from validated state arrays via fmt(). Active filters are
     included in the file header so exported files are self-documenting.
     The blob URL is revoked immediately after download to prevent memory leaks.

   SECURITY MODEL:
     • localStorage accessed inside try/catch — malformed JSON clears session.
     • All API query params passed through encodeURIComponent() or URLSearchParams.
     • All state arrays default to [] — prevents renders from receiving undefined.
     • Activity filter dropdown options come from the backend — never from user input.
     • CSV values pass through fmt() — no NaN/undefined written to exported files.
     • URL.revokeObjectURL() called immediately after download trigger.

   RESPONSIVENESS:
     • Header uses flex-wrap — controls stack vertically on narrow screens.
     • Filter row uses flex-col md:flex-row — stacks on mobile, row on md+.
     • Table wrapper uses overflow-x-auto — scrolls horizontally on mobile.
     • max-h-[70vh] on the scroll container — table never exceeds viewport height.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter for programmatic navigation
   ============================================================================= */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const styles = { outfitFont: { fontFamily: "Outfit, sans-serif" } };

/* -----------------------------------------------------------------------------
   SHARED DROPDOWN CLASS
   Applied to every <select> equivalent in the page — View, Start Month, and
   all Activity filters. Gives dropdowns the same visual weight as buttons.
----------------------------------------------------------------------------- */
const dropClass = `
  border border-black/50 rounded px-2 py-1.5 text-sm
  bg-white text-black
  dark:bg-[#1f1f1f] dark:text-slate-100 dark:border-slate-600
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
  hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition
  focus:outline-none focus:ring-2 focus:ring-[#017ACB]/40 dark:focus:ring-slate-400
  shadow-[2px_2px_6px_rgba(0,0,0,0.15),-1px_-1px_4px_rgba(255,255,255,0.5)]
  hover:bg-[#017ACB]/20 transition
  focus:outline-none focus:ring-2 focus:ring-[#017ACB]/40
`;

/* -----------------------------------------------------------------------------
   BUTTON CLASSES
   Mirrors the dashboard All/Mine filter active/inactive visual language.
   SHARED BUTTON CLASS — neumorphic, matches all other pages in the app.
----------------------------------------------------------------------------- */
const btnClass = `
  px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white border border-black
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

/* -----------------------------------------------------------------------------
   UTILITY: fmt
   Safe number formatter — returns "0.00" for any invalid/null/NaN value.
   Applied to every table cell and CSV value to prevent rendering anomalies.
----------------------------------------------------------------------------- */
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return "0.00";
  return Number(n).toFixed(2);
}

/* =============================================================================
   COMPONENT: ActivityFilterDropdown
   -----------------------------------------------------------------------------
   Custom styled dropdown for the five activity filter controls.
   searchable prop adds a text search input inside the dropdown.
   Closes on outside click via mousedown listener.
   ============================================================================= */
function ActivityFilterDropdown({ label, value, setValue, options, searchable = false }) {
  const ref = useRef(null);
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(""); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter options by the search query — only applies when searchable is true
  const displayed = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="flex-1 min-w-[150px]" ref={ref}>
      <label className="text-sm font-medium text-gray-700 mb-1 block" style={styles.outfitFont}>
        {label}
      </label>
      <div className="relative">
        <div
          className="border border-black/50 rounded px-2 py-1.5 text-sm bg-white text-black cursor-pointer flex justify-between items-center hover:bg-[#017ACB]/20 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]"
          onClick={() => { setOpen(o => !o); if (open) setSearch(""); }}
          style={styles.outfitFont}
        >
          <span className="truncate">{options.find(o => o.value === value)?.label || "All"}</span>
          <svg className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {open && (
          <div className="absolute left-0 top-full mt-1 bg-white border border-black rounded shadow-lg z-50 max-h-100 overflow-y-auto min-w-full">
            {searchable && (
              <div className="px-2 pt-1 pb-1 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ""))}
                  onClick={e => e.stopPropagation()}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#017ACB]/40 text-black"
                  style={styles.outfitFont}
                />
              </div>
            )}
            {displayed.map(opt => (
              <div
                key={opt.value}
                onClick={() => { setValue(opt.value); setOpen(false); setSearch(""); }}
                className={`px-3 py-2 cursor-pointer text-sm text-black hover:bg-[#017ACB]/20 transition ${value === opt.value ? "bg-[#CDE6F7]" : ""}`}
                style={styles.outfitFont}
              >
                {opt.label}
              </div>
            ))}
            {searchable && search && displayed.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">No results</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   MAIN COMPONENT: Report
   ============================================================================= */
export default function Report() {
  const router = useRouter();

  /* ---------------------------------------------------------------------------
     STATE
     All array states default to [] so table renders never receive undefined.
     Loading flags prevent renders with empty data before fetches complete.
  --------------------------------------------------------------------------- */
  const [user, setUser]       = useState(null);
  const [viewMode, setViewMode] = useState("month"); // "month" | "person" | "activity"

  // Month selector — generated locally, no API call needed
  const [selectableMonths, setSelectableMonths] = useState([]);
  const [startMonth, setStartMonth]             = useState(null);

  // Category view data
  const [months, setMonths]                       = useState([]);
  const [categories, setCategories]               = useState([]);
  const [totals, setTotals]                       = useState([]);
  const [peopleCapacity, setPeopleCapacity]       = useState([]);
  const [remainingCapacity, setRemainingCapacity] = useState([]);

  // Person + activity view — reportMonths is the shared month header array
  const [reportMonths, setReportMonths]           = useState([]);
  const [rows, setRows]                           = useState([]);       // Activity rows
  const [employees, setEmployees]                 = useState([]);       // Person rows
  const [employeeCapacities, setEmployeeCapacities] = useState({});    // { emp_id: { YYYYMM: amount } }

  // Activity view filter state — options always sourced from backend, never user input
  const [activityCategory, setActivityCategory] = useState("all");
  const [leader, setLeader]                     = useState("all");
  const [requestingDept, setRequestingDept]     = useState("all");
  const [requestor, setRequestor]               = useState("all");
  const [requestorVP, setRequestorVP]           = useState("all");
  const [leaderList, setLeaderList]             = useState([]);
  const [deptList, setDeptList]                 = useState([]);
  const [requestorList, setRequestorList]       = useState([]);
  const [requestorVPList, setRequestorVPList]   = useState([]);

  const [loadingMonths, setLoadingMonths]   = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [showViewDropdown, setShowViewDropdown]   = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const viewDropdownRef  = useRef(null);
  const monthDropdownRef = useRef(null);
  const [pageSearch, setPageSearch] = useState("");

  /* ---------------------------------------------------------------------------
     HANDLER: handleExportCSV
     ---------------------------------------------------------------------------
     Builds a CSV string from the current view's validated state arrays and
     triggers a browser file download. Active filters are included in the file
     header so the exported file is self-documenting.

     SECURITY:
     • All values pass through fmt() — no NaN/undefined written to the file.
     • Names are wrapped in quotes — prevents commas in names from misaligning columns.
     • Filename uses startMonth + ISO date — never any user-typed input.
     • URL.revokeObjectURL() called immediately after click() — no memory leak.
  --------------------------------------------------------------------------- */
  const handleExportCSV = () => {
    let csvContent = "";
    let filename   = "";
    const timestamp = new Date().toISOString().split("T")[0];

    if (viewMode === "activity") {
      filename     = `Activity_Report_${startMonth}_${timestamp}.csv`;
      csvContent  = `Activity Allocation Report\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\nStart Month: ${startMonth}\n`;

      // Append active filters — makes the exported file self-documenting
      if (activityCategory !== "all") csvContent += `Category Filter: ${activityCategory}\n`;
      if (leader           !== "all") csvContent += `Leader Filter: ${leader}\n`;
      if (requestingDept   !== "all") csvContent += `Department Filter: ${requestingDept}\n`;
      if (requestor        !== "all") csvContent += `Requestor Filter: ${requestor}\n`;

      csvContent += `\nActivity,${reportMonths.join(",")}\n`;
      rows.forEach(row => {
        const values = reportMonths.map(m => fmt(row.months?.[m] || 0));
        csvContent += `"${row.activity}",${values.join(",")}\n`;
      });
      const totalsRow = reportMonths.map(m =>
        fmt(rows.reduce((sum, r) => sum + (r.months?.[m] || 0), 0))
      );
      csvContent += `\nGrand Total,${totalsRow.join(",")}\n`;

    } else if (viewMode === "person") {
      filename     = `Person_Report_${startMonth}_${timestamp}.csv`;
      csvContent  = `Employee Allocation Report\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\nStart Month: ${startMonth}\n`;
      csvContent += `Total Employees: ${employees.length}\n\n`;
      csvContent += `Employee,${reportMonths.join(",")},Average\n`;

      employees.forEach(emp => {
        const values = reportMonths.map(m => fmt(emp.months?.[m] || 0));
        const avg    = reportMonths.reduce((sum, m) => sum + (emp.months?.[m] || 0), 0) / reportMonths.length;
        csvContent += `"${emp.emp_name}",${values.join(",")},${fmt(avg)}\n`;
      });

      const totalsRow = reportMonths.map(m =>
        fmt(employees.reduce((sum, r) => sum + (r.months?.[m] || 0), 0))
      );
      const grandAvg = totalsRow.reduce((sum, v) => sum + parseFloat(v), 0) / totalsRow.length;
      csvContent += `\nGrand Total,${totalsRow.join(",")},${fmt(grandAvg)}\n`;

      // Include an over-capacity analysis section
      csvContent += `\n\nOver-Capacity Analysis\nEmployee,Months Over Capacity\n`;
      employees.forEach(emp => {
        const overMonths = reportMonths.filter(m => (emp.months?.[m] || 0) > 1);
        if (overMonths.length > 0) {
          csvContent += `"${emp.emp_name}","${overMonths.join(", ")}"\n`;
        }
      });

    } else {
      // Category view
      filename     = `Category_Report_${startMonth}_${timestamp}.csv`;
      csvContent  = `Capacity Summary by Category\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\nStart Month: ${startMonth}\n\n`;
      csvContent += `Category,${months.join(",")}\n`;
      categories.forEach(cat => {
        csvContent += `"${cat.label}",${cat.values.map(v => fmt(v)).join(",")}\n`;
      });
      csvContent += `\nTotal Allocated,${totals.map(v => fmt(v)).join(",")}\n`;
      csvContent += `Total People Capacity,${peopleCapacity.map(v => fmt(v)).join(",")}\n`;
      csvContent += `Remaining Capacity,${remainingCapacity.map(v => fmt(v)).join(",")}\n`;

      // Include utilisation analysis
      csvContent += `\nUtilization Analysis\nMonth,Utilization %\n`;
      months.forEach((month, idx) => {
        const util = peopleCapacity[idx] > 0
          ? ((totals[idx] / peopleCapacity[idx]) * 100).toFixed(1)
          : "0.0";
        csvContent += `${month},${util}%\n`;
      });
    }

    // Trigger browser download — revoke URL immediately to prevent memory leak
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url  = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Prevent memory leak — revoke immediately after click
  };

  /* ---------------------------------------------------------------------------
     EFFECT 1: LOAD USER SESSION
     Wrapped in try/catch — malformed JSON clears both token and user to prevent
     a broken session from persisting across page loads.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT 2: GENERATE SELECTABLE MONTHS
     Runs when user is set. Generates the last 12 months locally — no API call.
     Defaults startMonth to the current calendar month.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;
    try {
      const monthsArray = [];
      const today       = new Date();

      for (let i = -11; i <= 0; i++) {
        const date  = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const label = date.toLocaleString("default", { month: "short", year: "2-digit" }).replace(" ", "-");
        const value = date.getFullYear() * 100 + (date.getMonth() + 1);
        monthsArray.push({ label, value });
      }

      setSelectableMonths(monthsArray);

      // Default to current month — fall back to most recent available
      const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);
      const match = monthsArray.find(m => m.value === currentYYYYMM);
      setStartMonth(match ? match.value : monthsArray[monthsArray.length - 1].value);

    } catch (err) {
      console.error("Error generating months:", err);
    } finally {
      setLoadingMonths(false);
    }
  }, [user]);

  /* ---------------------------------------------------------------------------
     EFFECT 3: LOAD CATEGORY SUMMARY
     Fetches the 6-month capacity summary for the Category view.
     encodeURIComponent() applied to startMonth — safe encoding for URL params.
     All response arrays default to [] — protects table renders from undefined.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user || !startMonth) return;

    async function loadSummary() {
      setLoadingSummary(true);
      try {
        const res  = await api.get(`/capacity-summary?start=${encodeURIComponent(startMonth)}&months=6`);
        const data = res?.data || {};
        setMonths(data.months                       || []);
        setCategories(data.categories               || []);
        setTotals(data.totals                       || []);
        setPeopleCapacity(data.peopleCapacity       || []);
        setRemainingCapacity(data.remainingCapacity || []);
      } catch (err) {
        console.error("Failed to load summary:", err);
      } finally {
        setLoadingSummary(false);
      }
    }

    loadSummary();
  }, [user, startMonth]);

  /* ---------------------------------------------------------------------------
     EFFECT 4: LOAD PERSON CAPACITY
     ---------------------------------------------------------------------------
     Fetches per-employee allocation totals and individual capacity records.
     Runs report fetch and full employee list in parallel, then fetches capacity
     per employee — emp_id is stored under multiple key types to handle any
     type mismatches between report data and capacity data.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user || !startMonth) return;

    async function loadCapacity() {
      try {
        // Fetch report data and all employees in parallel
        const [reportRes, allEmpRes] = await Promise.all([
          api.get(`/reports/capacity?start=${encodeURIComponent(startMonth)}&months=6`),
          api.get(`/resources/employees`)
        ]);

        const data    = reportRes?.data || {};
        const emps    = data.data || [];
        const allEmps = Array.isArray(allEmpRes.data) ? allEmpRes.data : [];

        setReportMonths(data.months || []);

        // Build name→emp_id lookup from the full employee list
        const nameToId = {};
        allEmps.forEach(e => { if (e.emp_name && e.emp_id) nameToId[e.emp_name] = e.emp_id; });

        // Attach emp_id to each report row via name lookup
        const empsWithId = emps.map(e => ({
          ...e,
          emp_id: e.emp_id || nameToId[e.emp_name] || null
        }));
        setEmployees(empsWithId);

        // Fetch capacity per employee — store under numeric, string, and Number keys
        // to handle any type mismatch between report rows and capacity collection
        const capMap = {};
        await Promise.all(empsWithId.map(async emp => {
          if (!emp.emp_id) return;
          try {
            const capRes  = await api.get(`/resources/employees/${emp.emp_id}/capacity`);
            const capData = Array.isArray(capRes.data) ? capRes.data : [];
            const capEntries = {};
            capData.forEach(c => { capEntries[String(c.date)] = parseFloat(c.amount); });
            // Store under all three key types — prevents lookup failures from type mismatches
            capMap[emp.emp_id]        = capEntries;
            capMap[String(emp.emp_id)] = capEntries;
            capMap[Number(emp.emp_id)] = capEntries;
          } catch { capMap[emp.emp_id] = {}; }
        }));
        setEmployeeCapacities(capMap);

      } catch (err) {
        console.error("Error fetching person capacity:", err);
      }
    }

    loadCapacity();
  }, [user, startMonth]);

  /* ---------------------------------------------------------------------------
     EFFECT 5: LOAD ACTIVITY SUMMARY + FILTER OPTIONS
     ---------------------------------------------------------------------------
     Runs when user, startMonth, or any active filter changes. Uses URLSearchParams
     to encode all filter values — safe even if they contain special characters.

     Filter option lists (requestorList, requestorVPList) are fetched from the
     accounts endpoint filtered to acc_type_id 1 (Resource Manager) and 2
     (Stakeholder) — the only roles who can be requestors. Falls back to the
     employees endpoint if the accounts fetch fails.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user || !startMonth) return;

    async function loadActivitySummary() {
      // URLSearchParams auto-encodes all values — safe for special characters
      const params = new URLSearchParams({
        start:        startMonth,
        months:       6,
        category:     activityCategory,
        leader:       leader,
        dept:         requestingDept,
        requestor:    requestor,
        requestor_vp: requestorVP,
      });
      try {
        const res = await api.get(`/reports?${params.toString()}`);
        setRows(res.data.data           || []);
        setReportMonths(res.data.months || []);
      } catch (err) {
        console.error("Failed to fetch activity report:", err);
      }
    }

    async function loadFilters() {
      try {
        const res  = await api.get("/reports/filters");
        const data = res?.data || {};
        setLeaderList(data.leaders       || []);
        setDeptList(data.requesting_dept || []);

        // Requestor/VP lists: prefer accounts with acc_type_id 1 or 2,
        // fall back to all employees if the accounts fetch fails
        try {
          const accRes      = await api.get("/admin/accounts");
          const allAccounts = Array.isArray(accRes.data) ? accRes.data :
                              Array.isArray(accRes.data?.accounts) ? accRes.data.accounts : [];
          const eligible    = allAccounts
            .filter(a => a.account?.acc_type_id === 1 || a.account?.acc_type_id === 2)
            .map(a => a.emp_name || a.account?.username)
            .filter(Boolean);
          const uniqueNames = [...new Set(eligible)].sort();
          if (uniqueNames.length > 0) {
            setRequestorList(uniqueNames);
            setRequestorVPList(uniqueNames);
          } else {
            // Fallback: use all employees as requestors
            const empRes  = await api.get("/resources/employees");
            const allEmps = Array.isArray(empRes.data) ? empRes.data : [];
            const names   = [...new Set(allEmps.map(e => e.emp_name).filter(Boolean))].sort();
            setRequestorList(names.length > 0 ? names : (data.requestors || []));
            setRequestorVPList(names.length > 0 ? names : (data.requestor_vp || []));
          }
        } catch {
          setRequestorList(data.requestors     || []);
          setRequestorVPList(data.requestor_vp || []);
        }
      } catch (err) {
        console.error("Failed to load activity filters:", err);
      }
    }

    loadActivitySummary();
    loadFilters();
  }, [user, startMonth, activityCategory, leader, requestingDept, requestor, requestorVP]);

  /* ---------------------------------------------------------------------------
     EFFECT: CLOSE DROPDOWNS ON OUTSIDE CLICK
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const handler = (e) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target))
        setShowViewDropdown(false);
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target))
        setShowMonthDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ---------------------------------------------------------------------------
     LOADING STATE
  --------------------------------------------------------------------------- */
  if (!user || loadingMonths || loadingSummary) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" aria-label="Loading capacity report" />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RENDER FUNCTION: renderTableBody
     ---------------------------------------------------------------------------
     Returns the correct <tbody> for the current viewMode.

     SHARED RULES:
     • All cell values pass through fmt() — no NaN/undefined in cells.
     • Grand Total / summary rows use bg-[#017ACB] with text-white.

     PERSON VIEW OVER-CAPACITY:
     • Month label (e.g. "Mar-26") is converted to YYYYMM integer (202603) to
       match the format stored in the capacity collection.
     • Cells where allocated value exceeds the employee's capacity get
       bg-red-400 text-white font-bold to flag the over-allocation visually.
  --------------------------------------------------------------------------- */
  function renderTableBody() {

    /* -----------------------------------------------------------------------
       ACTIVITY VIEW
    ----------------------------------------------------------------------- */
    if (viewMode === "activity") {
      const activeMonths  = reportMonths;
      const filteredRows  = pageSearch
        ? rows.filter(r => r.activity?.toLowerCase().includes(pageSearch.toLowerCase()))
        : rows;

      if (activeMonths.length === 0) {
        return (
          <tbody>
            <tr>
              <td colSpan={99} className="text-center py-10 text-gray-500" style={styles.outfitFont}>
                No activity data found for the selected filters and month range.
              </td>
            </tr>
          </tbody>
        );
      }

      return (
        <tbody>
          {filteredRows.map((row, idx) => (
            <tr key={row.activity} className={idx % 2 === 0 ? "bg-gray-200" : "bg-white"}>
              <td className="px-3 sm:px-6 py-2 sm:py-3 font-medium border border-black text-black" style={styles.outfitFont}>
                {row.activity}
              </td>
              {activeMonths.map(m => (
                <td key={m} className="px-3 sm:px-6 py-2 sm:py-3 text-center text-black border border-black" style={styles.outfitFont}>
                  {fmt(row.months?.[m])}
                </td>
              ))}
            </tr>
          ))}
          {/* Grand Total row — blue background matches the header */}
          <tr className="bg-[#017ACB] font-semibold">
            <td className="px-3 sm:px-6 py-2 sm:py-3 border border-black text-white" style={styles.outfitFont}>Grand Total</td>
            {activeMonths.map(m => {
              const total = filteredRows.reduce((sum, r) => sum + (r.months?.[m] || 0), 0);
              return (
                <td key={m} className="px-3 sm:px-6 py-2 sm:py-3 text-center text-white border border-black" style={styles.outfitFont}>
                  {fmt(total)}
                </td>
              );
            })}
          </tr>
        </tbody>
      );
    }

    /* -----------------------------------------------------------------------
       PERSON VIEW
    ----------------------------------------------------------------------- */
    if (viewMode === "person") {
      const activeMonths       = reportMonths;
      const filteredEmployees  = pageSearch
        ? employees.filter(e => e.emp_name?.toLowerCase().includes(pageSearch.toLowerCase()))
        : employees;

      if (activeMonths.length === 0) {
        return (
          <tbody>
            <tr>
              <td colSpan={99} className="text-center py-10 text-gray-500" style={styles.outfitFont}>
                No employee data found for the selected month range.
              </td>
            </tr>
          </tbody>
        );
      }

      // Month name to number lookup — used for YYYYMM conversion
      const _monthMap = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };

      return (
        <tbody>
          {filteredEmployees.map((emp, idx) => (
            <tr key={emp.emp_name} className={idx % 2 === 0 ? "bg-gray-200" : "bg-white"}>
              <td className="px-3 sm:px-6 py-2 sm:py-3 font-medium border border-black text-black" style={styles.outfitFont}>
                {emp.emp_name}
              </td>
              {activeMonths.map(m => {
                const value = emp.months?.[m] || 0;

                // Convert month label "Mar-26" → YYYYMM integer 202603
                // to match the format stored in the capacity collection
                const parts  = String(m).split(/[-\s]/);
                const mNum   = _monthMap[parts[0]];
                const mYear  = parts[1] ? parseInt(parts[1]) + (parts[1].length === 2 ? 2000 : 0) : null;
                const numKey = (mNum && mYear) ? String(mYear * 100 + mNum) : null;

                // Try numeric, string, and Number keys — handles type mismatches
                const capByKey   = employeeCapacities[emp.emp_id] || employeeCapacities[String(emp.emp_id)] || employeeCapacities[Number(emp.emp_id)] || null;
                const capAmount  = (capByKey && numKey) ? capByKey[numKey] : undefined;
                const maxCap     = (capAmount !== undefined && !isNaN(Number(capAmount))) ? Number(capAmount) : 1;
                const isOver     = value > maxCap; // Red if allocated > capacity

                return (
                  <td
                    key={m}
                    className={`px-3 sm:px-6 py-2 sm:py-3 text-center border border-black ${
                      isOver ? "bg-red-400 text-white font-bold" : "text-black"
                    }`}
                    style={styles.outfitFont}
                  >
                    {fmt(value)}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Grand Total row */}
          <tr className="bg-[#017ACB] font-semibold">
            <td className="px-3 sm:px-6 py-2 sm:py-3 border border-black text-white" style={styles.outfitFont}>Grand Total</td>
            {activeMonths.map(m => {
              const total = filteredEmployees.reduce((sum, r) => sum + (r.months?.[m] || 0), 0);
              return (
                <td key={m} className="px-3 sm:px-6 py-2 sm:py-3 text-center text-white border border-black" style={styles.outfitFont}>
                  {fmt(total)}
                </td>
              );
            })}
          </tr>
        </tbody>
      );
    }

    /* -----------------------------------------------------------------------
       CATEGORY VIEW (default)
    ----------------------------------------------------------------------- */
    return (
      <tbody>
        {categories.map((cat, idx) => (
          <tr key={cat.label} className={idx % 2 === 0 ? "bg-gray-200" : "bg-white"}>
            <td className="px-3 sm:px-6 py-2 sm:py-3 border border-black font-medium text-black" style={styles.outfitFont}>{cat.label}</td>
            {cat.values.map((val, i) => (
              <td key={i} className="px-3 sm:px-6 py-2 sm:py-3 text-center border border-black text-black" style={styles.outfitFont}>
                {fmt(val)}
              </td>
            ))}
          </tr>
        ))}

        {/* Total Allocated — blue summary row */}
        <tr className="bg-[#017ACB] font-semibold">
          <td className="px-3 sm:px-6 py-2 sm:py-3 border border-black text-white" style={styles.outfitFont}>Total Allocated</td>
          {totals.map((val, idx) => (
            <td key={idx} className="px-3 sm:px-6 py-2 sm:py-3 text-center border border-black text-white" style={styles.outfitFont}>{fmt(val)}</td>
          ))}
        </tr>

        <tr className="bg-white">
          <td className="px-3 sm:px-6 py-2 sm:py-3 border border-black font-semibold text-black" style={styles.outfitFont}>Total People Capacity</td>
          {peopleCapacity.map((val, idx) => (
            <td key={idx} className="px-3 sm:px-6 py-2 sm:py-3 text-center border border-black text-black" style={styles.outfitFont}>{fmt(val)}</td>
          ))}
        </tr>

        <tr className="bg-gray-200">
          <td className="px-3 sm:px-6 py-2 sm:py-3 border border-black font-semibold text-black" style={styles.outfitFont}>Remaining Capacity</td>
          {remainingCapacity.map((val, idx) => (
            <td key={idx} className="px-3 sm:px-6 py-2 sm:py-3 text-center border border-black text-black" style={styles.outfitFont}>{fmt(val)}</td>
          ))}
        </tr>
      </tbody>
    );
  }

  /* ===========================================================================
     RENDER: MAIN PAGE
  =========================================================================== */
  return (
    <div className="h-[600px] page-surface">
      <main className="max-w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* PAGE HEADER
            flex-wrap allows the right-side controls to wrap below the title
            on narrow viewports without overflowing. */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4 sm:mb-6">

          {/* LEFT: Title + Back button */}
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900" style={styles.outfitFont}>
              Capacity Report
            </h2>

            {/* Back to Dashboard — neumorphic style matches all other pages */}
            <button
              onClick={() => router.push('/resource-manager/dashboard')}
              className={btnDarkClass}
              style={styles.outfitFont}
            >
              Back to Dashboard
            </button>
          </div>

          {/* CENTER: Global search bar — filters the active view */}
          <div className="flex-1 flex justify-center">
            <input
              type="text"
              placeholder={
                viewMode === "activity" ? "Search activities..." :
                viewMode === "person"   ? "Search employees..."  :
                                          "Search categories..."
              }
              value={pageSearch}
              onChange={e => setPageSearch(e.target.value)}
              className="px-3 py-2 border border-gray-500 bg-gray-200 rounded text-gray-700 text-sm w-64 hover:bg-[#017ACB]/20 transition-colors focus:outline-none focus:ring-1 focus:ring-black"
              style={styles.outfitFont}
            />
          </div>

          {/* RIGHT: View selector + Month selector + Export CSV */}
          <div className="flex flex-wrap items-center gap-3">

            {/* VIEW MODE SELECTOR */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 whitespace-nowrap" style={styles.outfitFont}>View:</label>
              <div className="relative" ref={viewDropdownRef}>
                <div
                  className={`${dropClass} flex justify-between items-center cursor-pointer min-w-[220px]`}
                  onClick={() => { setShowViewDropdown(o => !o); setShowMonthDropdown(false); }}
                  style={styles.outfitFont}
                >
                  <span>
                    {{ month: "Allocation per Category", person: "Allocation per Person", activity: "Allocation per Activity" }[viewMode]}
                  </span>
                  <svg className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${showViewDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {showViewDropdown && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-black rounded shadow-lg z-50 min-w-full">
                    {[
                      { value: "month",    label: "Allocation per Category" },
                      { value: "person",   label: "Allocation per Person"   },
                      { value: "activity", label: "Allocation per Activity" },
                    ].map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => { setViewMode(opt.value); setShowViewDropdown(false); }}
                        className={`px-3 py-2 cursor-pointer text-sm text-black hover:bg-[#017ACB]/20 transition ${viewMode === opt.value ? "bg-[#CDE6F7]" : ""}`}
                        style={styles.outfitFont}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* START MONTH SELECTOR */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 whitespace-nowrap" style={styles.outfitFont}>Start Month:</label>
              <div className="relative" ref={monthDropdownRef}>
                <div
                  className={`${dropClass} flex justify-between items-center cursor-pointer`}
                  onClick={() => { setShowMonthDropdown(o => !o); setShowViewDropdown(false); }}
                  style={styles.outfitFont}
                >
                  <span>{selectableMonths.find(m => m.value === startMonth)?.label || "Select month"}</span>
                  <svg className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${showMonthDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {showMonthDropdown && (
                  <div
                    className="absolute right-0 top-full mt-1 bg-white border border-black rounded shadow-lg z-50 max-h-100 overflow-y-auto min-w-full"
                    ref={el => {
                      // Scroll the selected month into view when the dropdown opens
                      if (el) {
                        const selected = el.querySelector('[data-selected="true"]');
                        if (selected) selected.scrollIntoView({ block: "center" });
                      }
                    }}
                  >
                    {selectableMonths.map(m => (
                      <div
                        key={m.value}
                        data-selected={startMonth === m.value ? "true" : "false"}
                        onClick={() => { setStartMonth(m.value); setShowMonthDropdown(false); }}
                        className={`px-3 py-2 cursor-pointer text-sm text-black hover:bg-[#017ACB]/20 transition ${startMonth === m.value ? "bg-[#CDE6F7]" : ""}`}
                        style={styles.outfitFont}
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* EXPORT CSV BUTTON */}
            <button
              onClick={handleExportCSV}
              aria-label="Export current view as CSV file"
              className={btnClass}
              style={styles.outfitFont}
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* ACTIVITY FILTERS
            Only rendered when viewMode === "activity".
            Option lists come from the backend — never from user-typed input.
            flex-col on mobile, md:flex-row on desktop. */}
        {viewMode === "activity" && (
          <div className="flex flex-col md:flex-row flex-wrap gap-3 mb-4 sm:mb-6">
            {[
              {
                label: "Activity Category:", value: activityCategory, setValue: setActivityCategory,
                options: [
                  { value: "all", label: "All" },
                  { value: "Vacation",                              label: "Vacation" },
                  { value: "Baseline",                              label: "Baseline" },
                  { value: "Strategic",                             label: "Strategic" },
                  { value: "Discretionary Project / Enhancement",   label: "Discretionary Project / Enhancement" },
                ],
              },
              {
                label: "Leader:", value: leader, setValue: setLeader,
                options: [{ value: "all", label: "All" }, ...leaderList.map(m => ({ value: m, label: m }))],
              },
              {
                label: "Requesting Dept:", value: requestingDept, setValue: setRequestingDept,
                options: [{ value: "all", label: "All" }, ...deptList.map(m => ({ value: m, label: m }))],
              },
              {
                label: "Requestor:", value: requestor, setValue: setRequestor,
                options: [{ value: "all", label: "All" }, ...requestorList.map(m => ({ value: m, label: m }))],
                searchable: true,
              },
              {
                label: "Requestor VP:", value: requestorVP, setValue: setRequestorVP,
                options: [{ value: "all", label: "All" }, ...requestorVPList.map(m => ({ value: m, label: m }))],
                searchable: true,
              },
            ].map(filter => (
              <ActivityFilterDropdown
                key={filter.label}
                label={filter.label}
                value={filter.value}
                setValue={filter.setValue}
                options={filter.options}
                searchable={filter.searchable || false}
              />
            ))}
          </div>
        )}

        {/* MAIN TABLE
            overflow-x-auto — horizontal scroll on mobile.
            overflow-y-auto + max-h-[70vh] — vertical scroll within viewport.
            sticky thead — header row stays visible while scrolling down.
            Category view uses months; person + activity use reportMonths. */}
        <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
            <table className="min-w-full text-sm border-collapse border border-black">
              <thead className="bg-[#017ACB] text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left font-semibold border border-black whitespace-nowrap" style={styles.outfitFont}>
                    Row Labels
                  </th>
                  {(viewMode === "month" ? months : reportMonths).map(month => (
                    <th key={month} className="px-3 sm:px-6 py-2 sm:py-3 text-center font-semibold border border-black whitespace-nowrap" style={styles.outfitFont}>
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              {renderTableBody()}
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
