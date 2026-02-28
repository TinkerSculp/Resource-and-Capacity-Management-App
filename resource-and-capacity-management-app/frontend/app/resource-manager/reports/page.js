"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

/* ---------------------------------------------------------
   STYLES (STATIC)
   ---------------------------------------------------------
   • Using inline font-family object for consistent typography.
   • Safe: no dynamic values or user-controlled content.
--------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: "Outfit, sans-serif" },
};

/* ---------------------------------------------------------
   VALUE FORMATTING
   ---------------------------------------------------------
   • formats any value as a fixed 2-decimal string.
   • Returns "0.00" for null, undefined, NaN, non-numeric strings, etc.
--------------------------------------------------------- */
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return "0.00";
  return Number(n).toFixed(2);
}

export default function CapacitySummary() {
  /* ---------------------------------------------------------
     CORE STATES
     ---------------------------------------------------------
     • user: loaded from localStorage (client-only)
     • viewMode: state for current report view ("month", "person", "activity")
     • selectableMonths: list of months for dropdown
     • startMonth: start month column value for report
  --------------------------------------------------------- */
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState("month");

  const [selectableMonths, setSelectableMonths] = useState([]);
  const [startMonth, setStartMonth] = useState(null);
  
  
  /* ---------------------------------------------------------
     TABLE VALUE STATES
     ---------------------------------------------------------
     • months: months to display in table header
     • reportMonths: activity months header
     • rows: store monthly allocation data for each activity (activity view).
     • categories: store monthly allocated amounts for each category.
     • totals: store total allocated amounts for each month.
     • peopleCapacity: store total people capacity amounts for each month.
     • remainingCapacity: store remaining capacity amounts for each month.
     • loadingMonths: store loading state for month.
     • loadingSummary: store loading state for API fetching summary.
     • employees: store monthly allocation data for each employee (person view).
  --------------------------------------------------------- */
  const [months, setMonths] = useState([]);
  const [reportMonths, setReportMonths] = useState([]);
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totals, setTotals] = useState([]);
  const [peopleCapacity, setPeopleCapacity] = useState([]);
  const [remainingCapacity, setRemainingCapacity] = useState([]);
  const [loadingMonths, setLoadingMonths] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [employees, setEmployees] = useState([]);
  
  /* ---------------------------------------------------------
     FILTER STATES
     ---------------------------------------------------------
     • activityCategory: store selected activity categories.
     • leader: store selected leader.
     • requestingDept: store selected requesting department.
     • requestor: store selected requestor.
     • requestorVP: store selected requestor VP.
     • leaderList: store selectable leaders.
     • deptList: store selectable departments.
     • requestorList: store selectable requestors.
     • requestorVPList: store selectable requestor VPs.
  --------------------------------------------------------- */
  const [activityCategory, setActivityCategory] = useState("all");
  const [leader, setLeader] = useState("all");
  const [requestingDept, setRequestingDept] = useState("all");
  const [requestor, setRequestor] = useState("all");
  const [requestorVP, setRequestorVP] = useState("all");
  const [leaderList, setLeaderList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [requestorList, setRequestorList] = useState([]);
  const [requestorVPList, setRequestorVPList] = useState([]);


  /* ---------------------------------------------------------
     EXPORT CSV HANDLER
     ---------------------------------------------------------
     • Generate current report view as CSV file.
     • Trigger download of the generated CSV file.
  --------------------------------------------------------- */
  const handleExportCSV = () => {
    let csvContent = "";
    let filename = "";
    const timestamp = new Date().toISOString().split('T')[0];

    // Write CSV content based on current view mode
    // Activity view
    if (viewMode === "activity") {
      filename = `Activity_Report_${startMonth}_${timestamp}.csv`;
      csvContent = `Activity Allocation Report\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\n`;
      csvContent += `Start Month: ${startMonth}\n`;
      
      if (activityCategory !== 'all') csvContent += `Category Filter: ${activityCategory}\n`;
      if (leader !== 'all') csvContent += `Leader Filter: ${leader}\n`;
      if (requestingDept !== 'all') csvContent += `Department Filter: ${requestingDept}\n`;
      if (requestor !== 'all') csvContent += `Requestor Filter: ${requestor}\n`;
      
      csvContent += `\n`;
      csvContent += `Activity,${reportMonths.join(",")}\n`;
      
      rows.forEach(row => {
        const values = reportMonths.map(m => fmt(row.months?.[m] || 0));
        csvContent += `"${row.activity}",${values.join(",")}\n`;
      });
      
      const totalsRow = reportMonths.map(m => {
        const total = rows.reduce((sum, r) => sum + (r.months?.[m] || 0), 0);
        return fmt(total);
      });
      
      csvContent += `\nGrand Total,${totalsRow.join(",")}\n`;
    }
    
    // Person view
    else if (viewMode === "person") {
      filename = `Person_Report_${startMonth}_${timestamp}.csv`;
      csvContent = `Employee Allocation Report\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\n`;
      csvContent += `Start Month: ${startMonth}\n`;
      csvContent += `Total Employees: ${employees.length}\n\n`;
      csvContent += `Employee,${reportMonths.join(",")},Average\n`;
      
      employees.forEach(emp => {
        const values = reportMonths.map(m => fmt(emp.months?.[m] || 0));
        const avg = reportMonths.reduce((sum, m) => sum + (emp.months?.[m] || 0), 0) / reportMonths.length;
        csvContent += `"${emp.emp_name}",${values.join(",")},${fmt(avg)}\n`;
      });
      
      const totalsRow = reportMonths.map(m => {
        const total = employees.reduce((sum, r) => sum + (r.months?.[m] || 0), 0);
        return fmt(total);
      });
      
      const grandAvg = totalsRow.reduce((sum, val) => sum + parseFloat(val), 0) / totalsRow.length;
      csvContent += `\nGrand Total,${totalsRow.join(",")},${fmt(grandAvg)}\n`;
      csvContent += `\n\nOver-Capacity Analysis\nEmployee,Months Over Capacity\n`;
      
      employees.forEach(emp => {
        const overMonths = reportMonths.filter(m => (emp.months?.[m] || 0) > 1);
        if (overMonths.length > 0) {
          csvContent += `"${emp.emp_name}","${overMonths.join(', ')}"\n`;
        }
      });
    }
    
    // Category view 
    else {
      filename = `Category_Report_${startMonth}_${timestamp}.csv`;
      csvContent = `Capacity Summary by Category\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\n`;
      csvContent += `Start Month: ${startMonth}\n\n`;
      csvContent += `Category,${months.join(",")}\n`;
      
      categories.forEach(cat => {
        csvContent += `"${cat.label}",${cat.values.map(v => fmt(v)).join(",")}\n`;
      });
      
      csvContent += `\n`;
      csvContent += `Total Allocated,${totals.map(v => fmt(v)).join(",")}\n`;
      csvContent += `Total People Capacity,${peopleCapacity.map(v => fmt(v)).join(",")}\n`;
      csvContent += `Remaining Capacity,${remainingCapacity.map(v => fmt(v)).join(",")}\n`;
      csvContent += `\nUtilization Analysis\nMonth,Utilization %\n`;
      
      months.forEach((month, idx) => {
        const utilization = peopleCapacity[idx] > 0 
          ? ((totals[idx] / peopleCapacity[idx]) * 100).toFixed(1)
          : "0.0";
        csvContent += `${month},${utilization}%\n`;
      });
    }

    // Trigger CSV download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ---------------------------------------------------------
     LOAD USER FROM LOCALSTORAGE
     -------------------------------------------------------*/
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  }, []);

  /* ---------------------------------------------------------
     SELECTABLE MONTHS GENERATION
     ---------------------------------------------------------
     • Generates last 12 months + current month for dropdown.
     • Format: "MMM-YY" (e.g. "Jan-24") with value as YYYYMM.
     -------------------------------------------------------*/
  useEffect(() => {
    if (!user) return;

    async function loadMonths() {
      try {
        const monthsArray = [];
        const today = new Date();

        for (let i = -11; i <= 0; i++) {
          const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
          const label = date.toLocaleString("default", { month: "short", year: "2-digit" }).replace(" ", "-");
          const value = date.getFullYear() * 100 + (date.getMonth() + 1);

          monthsArray.push({ label, value });
        }

        setSelectableMonths(monthsArray);
        const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);
        const match = monthsArray.find((m) => m.value === currentYYYYMM);
        setStartMonth(match ? match.value : monthsArray[monthsArray.length - 1].value);
      } catch (error) {
        console.error("Error generating months:", error);
      } finally {
        setLoadingMonths(false);
      }
    }

    loadMonths();
  }, [user]);

  /* ---------------------------------------------------------
     LOAD ALLOCATION BY CATEGORY (BACKEND FETCH)
     -------------------------------------------------------*/
  useEffect(() => {
    if (!user || !startMonth) return;

    async function loadSummary() {
      setLoadingSummary(true);
      try {
        // fetching summary data for category view
        const res = await api.get(`/capacity-summary?start=${encodeURIComponent(startMonth)}&months=6`);
        const data = res?.data || {};

        // Update states with fetched data
        setMonths(data.months || []);
        setCategories(data.categories || []);
        setTotals(data.totals || []);
        setPeopleCapacity(data.peopleCapacity || []);
        setRemainingCapacity(data.remainingCapacity || []);

      } catch (err) {
        console.error("Failed to load summary:", err);

      } finally {
        setLoadingSummary(false);
      }
    }

    loadSummary();
  }, [user, startMonth]);

  /* ---------------------------------------------------------
     LOAD ALLOCATION BY PERSON (BACKEND FETCH)
     -------------------------------------------------------*/
  useEffect(() => {
    if (!user || !startMonth) return;

    async function loadCapacity() {
      try {
        // fetching summary data for person view
        const res = await api.get(`/reports/capacity?start=${encodeURIComponent(startMonth)}&months=6`);
        const data = res?.data || {};

        // Update states with fetched data
        setReportMonths(data.months || []);
        setEmployees(data.data || []);
      } catch (error) {
        console.error("Error fetching capacity:", error);
      }
    }

    loadCapacity();
  }, [user, startMonth]);

  /* ---------------------------------------------------------
     LOAD ALLOCATION BY ACTIVITY (BACKEND FETCH)
     -------------------------------------------------------*/
  useEffect(() => {
    if (!user || !startMonth) return;

    // Load activity summary
    async function loadActivitySummary() {
      const params = new URLSearchParams({
        start: startMonth,
        months: 6,
        category: activityCategory,
        leader: leader,
        dept: requestingDept,
        requestor: requestor,
        requestor_vp: requestorVP,
      });

      try {
        // fetching summary data for activity view
        const res = await api.get(`/reports?${params.toString()}`);

        // Update states with fetched data
        setRows(res.data.data || []);
        setReportMonths(res.data.months || []);
      } catch (err) {
        console.error("Failed to fetch report data");
      }
    }

    // Load data for activity view filters
    async function loadFilters() {
      const res = await api.get("/reports/filters");
      const data = res?.data || {};

      // Update states with fetched data
      setLeaderList(data.leaders || []);
      setRequestorList(data.requestors || []);
      setRequestorVPList(data.requestor_vp || []);
      setDeptList(data.requesting_dept || []);
    }

    loadActivitySummary();
    loadFilters();
  }, [user, startMonth, activityCategory, leader, requestingDept, requestor, requestorVP]);

  // Render loading state if user or data is not yet loaded
  if (!user || loadingMonths || loadingSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" />
      </div>
    );
  }

  /* ---------------------------------------------------------
     RENDER TABLE BODY
     ---------------------------------------------------------
     • Renders table body based on current view mode.
     -------------------------------------------------------*/
  function renderTableBody() {
    // Activity view table body
    if (viewMode === "activity") {
      return (
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.activity} className={idx % 2 === 0 ? "bg-gray-200" : "bg-white"}>
              <td className="px-6 py-3 font-medium border border-black">{row.activity}</td>
              {reportMonths.map((m) => (
                <td key={m} className="px-6 py-3 text-center text-gray-700 border border-black">
                  {fmt(row.months?.[m])}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-gray-200 font-semibold">
            <td className="px-6 py-3 border border-black">Grand Total</td>
            {reportMonths.map((m) => {
              const monthTotal = rows.reduce((sum, r) => sum + (r.months?.[m] || 0), 0);
              return (
                <td key={m} className="px-6 py-3 text-center text-gray-700 border border-black">
                  {fmt(monthTotal)}
                </td>
              );
            })}
          </tr>
        </tbody>
      );
    }

    // Person view table body
    if (viewMode === "person") {
      return (
        <tbody>
          {employees.map((emp, idx) => (
            <tr key={emp.emp_name} className={idx % 2 === 0 ? "bg-gray-200" : "bg-white"}>
              <td className="px-6 py-3 font-medium border border-black">{emp.emp_name}</td>
              {reportMonths.map((m) => {
                const value = emp.months?.[m] || 0;
                const isOverCapacity = value > 1;
                return (
                  <td
                    key={m}
                    className={`px-6 py-3 text-center border border-black ${
                      isOverCapacity ? "bg-red-400 text-white font-bold" : "text-gray-700"
                    }`}
                  >
                    {fmt(emp.months?.[m])}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="bg-gray-100 font-semibold">
            <td className="px-6 py-3 border border-black">Grand Total</td>
            {reportMonths.map((m) => {
              const monthTotal = employees.reduce((sum, r) => sum + (r.months?.[m] || 0), 0);
              return (
                <td key={m} className="px-6 py-3 text-center text-gray-700 border border-black">
                  {fmt(monthTotal)}
                </td>
              );
            })}
          </tr>
        </tbody>
      );
    }

    // Category view table body
    return (
      <tbody className="divide-y">
        {categories.map((cat, idx) => (
          <tr key={cat.label} className={idx % 2 === 0 ? "bg-gray-200" : "bg-white"}>
            <td className="px-6 py-3 border border-black font-medium">{cat.label}</td>
            {cat.values.map((val, i) => (
              <td key={i} className="px-6 py-3 text-center border border-black">
                {fmt(val)}
              </td>
            ))}
          </tr>
        ))}
        <tr className="bg-gray-200 font-semibold">
          <td className="px-6 py-3 border border-black">Total Allocated</td>
          {totals.map((val, idx) => (
            <td key={idx} className="px-6 py-3 text-center border border-black">
              {fmt(val)}
            </td>
          ))}
        </tr>
        <tr className="bg-white">
          <td className="px-6 py-3 border border-black font-semibold">Total People Capacity</td>
          {peopleCapacity.map((val, idx) => (
            <td key={idx} className="px-6 py-3 text-center border border-black">
              {fmt(val)}
            </td>
          ))}
        </tr>
        <tr className="bg-gray-200">
          <td className="px-6 py-3 border border-black font-semibold">Remaining Capacity</td>
          {remainingCapacity.map((val, idx) => (
            <td key={idx} className="px-6 py-3 text-center border border-black">
              {fmt(val)}
            </td>
          ))}
        </tr>
      </tbody>
    );
  }

  /* ---------------------------------------------------------
   MAIN PAGE RENDER
   ---------------------------------------------------------*/
  return (
    <div className="h-[600px] bg-white">
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-bold text-gray-900" style={styles.outfitFont}>
              Capacity Report
            </h2>

            {/* Back to Dashboard Button */}
            <button
              onClick={() => router.push('/resource-manager/dashboard')}
              className="px-4 py-2 rounded text-sm
              bg-gray-200 text-gray-700 border
              hover:bg-[#017ACB]/20 transition-colors
              shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
              style={styles.outfitFont}
            >
              ← Back to Dashboard
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* View Mode Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700" style={styles.outfitFont}>View:</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="px-4 py-2 rounded text-sm bg-white text-gray-700 border hover:bg-gray-100 transition"
                style={styles.outfitFont}
              >
                <option value="month">Allocation per Category</option>
                <option value="person">Allocation per Person</option>
                <option value="activity">Allocation per Activity</option>
              </select>
            </div>

            {/* Start Month Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700" style={styles.outfitFont}>Start Month:</label>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(Number(e.target.value))}
                className="px-4 py-2 rounded text-sm bg-white text-gray-700 border hover:bg-gray-100 transition"
                style={styles.outfitFont}
              >
                {selectableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Export CSV Button */}
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 rounded text-sm
              bg-gray-200 text-gray-700 border
              hover:bg-[#017ACB]/20 transition-colors
              shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
              style={styles.outfitFont}
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters - Only show for Activity view */}
        {viewMode === "activity" && (
          <div className="flex flex-col md:flex-row flex-wrap gap-4 mb-6">

            {/* Activity Category Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block" style={styles.outfitFont}>Activity Category:</label>
              <select
                value={activityCategory}
                onChange={(e) => setActivityCategory(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white hover:bg-gray-50 w-full transition"
                style={styles.outfitFont}
              >
                <option value="all">All</option>
                <option value="Vacation">Vacation</option>
                <option value="Baseline">Baseline</option>
                <option value="Strategic">Strategic</option>
                <option value="Discretionary Project / Enhancement">Discretionary Project / Enhancement</option>
              </select>
            </div>

            {/* Leader Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block" style={styles.outfitFont}>Leader:</label>
              <select
                value={leader}
                onChange={(e) => setLeader(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white hover:bg-gray-50 w-full transition"
                style={styles.outfitFont}
              >
                <option value="all">All</option>
                {leaderList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Requesting Department Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block" style={styles.outfitFont}>Requesting Dept:</label>
              <select
                value={requestingDept}
                onChange={(e) => setRequestingDept(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white hover:bg-gray-50 w-full transition"
                style={styles.outfitFont}
              >
                <option value="all">All</option>
                {deptList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Requestor Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block" style={styles.outfitFont}>Requestor:</label>
              <select
                value={requestor}
                onChange={(e) => setRequestor(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white hover:bg-gray-50 w-full transition"
                style={styles.outfitFont}
              >
                <option value="all">All</option>
                {requestorList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Requestor VP Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block" style={styles.outfitFont}>Requestor VP:</label>
              <select
                value={requestorVP}
                onChange={(e) => setRequestorVP(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white hover:bg-gray-50 w-full transition"
                style={styles.outfitFont}
              >
                <option value="all">All</option>
                {requestorVPList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Main Table */}
        <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
            <table className="min-w-full text-sm border-collapse border border-black">
              
              {/* Table headers */}
              <thead className="bg-[#017ACB] text-white sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold border border-black" style={styles.outfitFont}>Row Labels</th>
                  {months.map((month) => (
                    <th key={month} className="px-6 py-3 text-center font-semibold border border-black" style={styles.outfitFont}>
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table body */}
              {renderTableBody()}
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
