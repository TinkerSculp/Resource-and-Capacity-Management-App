"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const styles = {
  outfitFont: { fontFamily: "Outfit, sans-serif" },
};

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return "0.00";
  return Number(n).toFixed(2);
}

export default function CapacitySummary() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState("month");

  const [selectableMonths, setSelectableMonths] = useState([]);
  const [startMonth, setStartMonth] = useState(null);

  const [months, setMonths] = useState([]);
  const [reportMonths, setReportMonths] = useState([]);
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totals, setTotals] = useState([]);
  const [peopleCapacity, setPeopleCapacity] = useState([]);
  const [remainingCapacity, setRemainingCapacity] = useState([]);

  const [loadingMonths, setLoadingMonths] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [activityCategory, setActivityCategory] = useState("all");
  const [leader, setLeader] = useState("all");
  const [requestingDept, setRequestingDept] = useState("all");
  const [requestor, setRequestor] = useState("all");

  const [leaderList, setLeaderList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [requestorList, setRequestorList] = useState([]);

  const [employees, setEmployees] = useState([]);

  // Enhanced CSV Export Function
  const handleExportCSV = () => {
    let csvContent = "";
    let filename = "";
    const timestamp = new Date().toISOString().split('T')[0];

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
    } else if (viewMode === "person") {
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
    } else {
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    async function loadMonths() {
      try {
        const res = await api.get("/capacity-summary/months");
        const data = res?.data;
        if (!data?.months) return;

        setSelectableMonths(data.months);

        const today = new Date();
        const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);

        const match = data.months.find((m) => m.value === currentYYYYMM);

        setStartMonth(match ? match.value : data.months[data.months.length - 1].value);
      } finally {
        setLoadingMonths(false);
      }
    }

    loadMonths();
  }, [user]);

  useEffect(() => {
    if (!user || !startMonth) return;

    async function loadSummary() {
      setLoadingSummary(true);
      try {
        const res = await api.get(`/capacity-summary?start=${encodeURIComponent(startMonth)}&months=6`);

        const data = res?.data || {};

        setMonths(data.months || []);
        setCategories(data.categories || []);
        setTotals(data.totals || []);
        setPeopleCapacity(data.peopleCapacity || []);
        setRemainingCapacity(data.remainingCapacity || []);
      } finally {
        setLoadingSummary(false);
      }
    }

    loadSummary();
  }, [user, startMonth]);

  useEffect(() => {
    if (!user || !startMonth) return;

    async function loadCapacity() {
      try {
        const res = await api.get(`/reports/capacity?start=${encodeURIComponent(startMonth)}&months=6`);
        const data = res?.data || {};

        setReportMonths(data.months || []);
        setEmployees(data.data || []);
      } catch (error) {
        console.error("Error fetching capacity:", error);
      }
    }

    loadCapacity();
  }, [user, startMonth]);

  useEffect(() => {
    if (!user || !startMonth) return;

    async function loadActivitySummary() {
      const params = new URLSearchParams({
        start: startMonth,
        months: 6,
        category: activityCategory,
        leader: leader,
        dept: requestingDept,
        requestor: requestor,
      });

      try {
        const res = await api.get(`/reports?${params.toString()}`);
        setRows(res.data.data || []);
        setReportMonths(res.data.months || []);
      } catch (err) {
        console.error("Failed to fetch report data");
      }
    }

    async function loadFilters() {
      const res = await api.get("/reports/filters");
      const data = res?.data || {};

      setLeaderList(data.leaders || []);
      setRequestorList(data.requestors || []);
      setDeptList(data.requesting_dept || []);
    }

    loadActivitySummary();
    loadFilters();
  }, [user, startMonth, activityCategory, leader, requestingDept, requestor]);

  if (!user || loadingMonths || loadingSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" />
      </div>
    );
  }

  function renderTableBody() {
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

  return (
    <div className="h-[600px] bg-white">
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-bold text-gray-900" style={styles.outfitFont}>
              Capacity Report
            </h2>

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
            {/* View Selector */}
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
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
            <table className="min-w-full text-sm border-collapse border border-black">
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
              {renderTableBody()}
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}