"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const styles = {
  outfitFont: { fontFamily: "Outfit, sans-serif" },
};

function sanitize(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/script|onerror|onload|javascript:/gi, "")
    .trim();
}

function formatMonth(yyyymm) {
  const str = String(yyyymm);
  const year = str.slice(0, 4);
  const month = parseInt(str.slice(4, 6), 10);
  const date = new Date(year, month - 1);

  return date.toLocaleString("default", { month: "short" }) + "-" + year.slice(2);
}

export default function TeamMemberAssignments() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const [allRows, setAllRows] = useState([]);
  const [filteredAllRows, setFilteredAllRows] = useState([]);
  const [myRows, setMyRows] = useState([]);
  const [months, setMonths] = useState([]);

  const [selectedResources, setSelectedResources] = useState([]);

  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedReportsTo, setSelectedReportsTo] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedLeaders, setSelectedLeaders] = useState([]);
  const [selectedRequestors, setSelectedRequestors] = useState([]);
  const [selectedRequestorVPs, setSelectedRequestorVPs] = useState([]);
  const [selectedRequestingDepts, setSelectedRequestingDepts] = useState([]);

  const [availableResources, setAvailableResources] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableReportsTo, setAvailableReportsTo] = useState([]);
  const [availableActivities, setAvailableActivities] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableLeaders, setAvailableLeaders] = useState([]);
  const [availableRequestors, setAvailableRequestors] = useState([]);
  const [availableRequestorVPs, setAvailableRequestorVPs] = useState([]);
  const [availableRequestingDepts, setAvailableRequestingDepts] = useState([]);

  const [filteredMyRows, setFilteredMyRows] = useState([]);
  const [matchedAllRows, setMatchedAllRows] = useState([]);

  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const [resourceSort, setResourceSort] = useState("");
  const [showResourceMenu, setShowResourceMenu] = useState(false);
  const [showDeptMenu, setShowDeptMenu] = useState(false);
  const [showReportsToMenu, setShowReportsToMenu] = useState(false);
  const [showActivityMenu, setShowActivityMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showLeaderMenu, setShowLeaderMenu] = useState(false);
  const [showRequestorMenu, setShowRequestorMenu] = useState(false);
  const [showVPMenu, setShowVPMenu] = useState(false);
  const [showReqDeptMenu, setShowReqDeptMenu] = useState(false);

  function toggleSelection(name) {
    setSelectedResources((prev) => {
      if (!name) return prev;
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      return [...prev, name];
    });
  }

  function toggleList(setter, name) {
    setter((prev) => {
      if (!name) return prev;
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      return [...prev, name];
    });
  }

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!stored || !token) {
        localStorage.clear();
        router.push("/login");
        return;
      }

      setUser(JSON.parse(stored));
    } catch {
      router.push("/login");
    }
  }, [router]);

  /* ---------------- FETCH ---------------- */
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const res = await fetch(
          `http://localhost:3001/api/assignments-allocations?username=${encodeURIComponent(user.username)}`,
        );

        if (!res.ok) return;

        const data = await res.json();

        setMonths(data.months || []);

        const mapRows = (source) =>
          source.map((r) => ({
            emp_id: r.employee.emp_id,
            resource_name: sanitize(r.employee.emp_name),
            department: sanitize(r.employee.dept_name),
            reports_to: sanitize(r.employee.manager_name),
            activity: sanitize(r.assignment.project_name),
            category: sanitize(r.assignment.category),
            leader: sanitize(r.assignment.leader),
            requestor: sanitize(r.assignment.requestor),
            requestor_vp: sanitize(r.assignment.requestor_vp),
            requesting_dept: sanitize(r.assignment.requesting_dept_name),
            allocations: r.allocations || {},
          }));

        const mappedAll = mapRows(data.allAssignments || []);
        const mappedMine = mapRows(data.myAssignments || []);

        setAllRows(mappedAll);
        setMyRows(mappedMine);
        setFilteredMyRows(mappedMine);

        setAvailableResources([...new Set(mappedAll.map((i) => i.resource_name).filter(Boolean))]);

        /* ---------------- CORRECT FILTER LOGIC ---------------- */

        if (!mappedMine.length) {
          setMatchedAllRows([]);
          setFilteredAllRows([]);
          return;
        }

        // Collect ALL unique activity+category combinations user belongs to
        const userActivityPairs = new Set(mappedMine.map((row) => `${row.activity}||${row.category}`));

        // Filter ALL rows that match ANY of those combinations
        const matched = mappedAll.filter((row) => userActivityPairs.has(`${row.activity}||${row.category}`));

        setMatchedAllRows(matched);
        setFilteredAllRows(matched);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    }

    fetchData();
  }, [user, resourceSort]);

  useEffect(() => {
    if (!user) return;

    // base for all: prefer matchedAllRows (activity/category restricted); fallback to allRows
    const baseAll = matchedAllRows && matchedAllRows.length ? matchedAllRows : allRows;
    const baseMine = myRows || [];

    const applyFilters = (base) => {
      let out = base.filter((row) => {
        // resources
        if (selectedResources && selectedResources.length > 0 && !selectedResources.includes(row.resource_name))
          return false;
        // departments
        if (selectedDepartments && selectedDepartments.length > 0 && !selectedDepartments.includes(row.department))
          return false;
        // reports to
        if (selectedReportsTo && selectedReportsTo.length > 0 && !selectedReportsTo.includes(row.reports_to))
          return false;
        // activities
        if (selectedActivities && selectedActivities.length > 0 && !selectedActivities.includes(row.activity))
          return false;
        // categories
        if (selectedCategories && selectedCategories.length > 0 && !selectedCategories.includes(row.category))
          return false;
        // leaders
        if (selectedLeaders && selectedLeaders.length > 0 && !selectedLeaders.includes(row.leader)) return false;
        // requestors
        if (selectedRequestors && selectedRequestors.length > 0 && !selectedRequestors.includes(row.requestor))
          return false;
        // requestor VPs
        if (selectedRequestorVPs && selectedRequestorVPs.length > 0 && !selectedRequestorVPs.includes(row.requestor_vp))
          return false;
        // requesting depts
        if (
          selectedRequestingDepts &&
          selectedRequestingDepts.length > 0 &&
          !selectedRequestingDepts.includes(row.requesting_dept)
        )
          return false;

        return true;
      });

      if (resourceSort === "az") {
        out.sort((a, b) => (a.resource_name || "").localeCompare(b.resource_name || ""));
      } else if (resourceSort === "za") {
        out.sort((a, b) => (b.resource_name || "").localeCompare(a.resource_name || ""));
      }

      return out;
    };

    const newAll = applyFilters(baseAll);
    const newMine = applyFilters(baseMine);
    setTimeout(() => {
      setFilteredAllRows(newAll);
      setFilteredMyRows(newMine);
    }, 0);
  }, [
    user,
    activeTab,
    selectedResources,
    selectedDepartments,
    selectedReportsTo,
    selectedActivities,
    selectedCategories,
    selectedLeaders,
    selectedRequestors,
    selectedRequestorVPs,
    selectedRequestingDepts,
    resourceSort,
    allRows,
    myRows,
    matchedAllRows,
  ]);

  useEffect(() => {
    if (activeTab === "mine") {
      const list = [...new Set((myRows || []).map((r) => r.resource_name).filter(Boolean))];
      const depts = [...new Set((myRows || []).map((r) => r.department).filter(Boolean))];
      const reps = [...new Set((myRows || []).map((r) => r.reports_to).filter(Boolean))];
      const acts = [...new Set((myRows || []).map((r) => r.activity).filter(Boolean))];
      const cats = [...new Set((myRows || []).map((r) => r.category).filter(Boolean))];
      const leads = [...new Set((myRows || []).map((r) => r.leader).filter(Boolean))];
      const reqs = [...new Set((myRows || []).map((r) => r.requestor).filter(Boolean))];
      const reqvps = [...new Set((myRows || []).map((r) => r.requestor_vp).filter(Boolean))];
      const reqdepts = [...new Set((myRows || []).map((r) => r.requesting_dept).filter(Boolean))];
      setTimeout(() => {
        setAvailableResources(list);
        setAvailableDepartments(depts);
        setAvailableReportsTo(reps);
        setAvailableActivities(acts);
        setAvailableCategories(cats);
        setAvailableLeaders(leads);
        setAvailableRequestors(reqs);
        setAvailableRequestorVPs(reqvps);
        setAvailableRequestingDepts(reqdepts);
      }, 0);
    } else {
      const list = [...new Set((allRows || []).map((r) => r.resource_name).filter(Boolean))];
      const depts = [...new Set((allRows || []).map((r) => r.department).filter(Boolean))];
      const reps = [...new Set((allRows || []).map((r) => r.reports_to).filter(Boolean))];
      const acts = [...new Set((allRows || []).map((r) => r.activity).filter(Boolean))];
      const cats = [...new Set((allRows || []).map((r) => r.category).filter(Boolean))];
      const leads = [...new Set((allRows || []).map((r) => r.leader).filter(Boolean))];
      const reqs = [...new Set((allRows || []).map((r) => r.requestor).filter(Boolean))];
      const reqvps = [...new Set((allRows || []).map((r) => r.requestor_vp).filter(Boolean))];
      const reqdepts = [...new Set((allRows || []).map((r) => r.requesting_dept).filter(Boolean))];
      setTimeout(() => {
        setAvailableResources(list);
        setAvailableDepartments(depts);
        setAvailableReportsTo(reps);
        setAvailableActivities(acts);
        setAvailableCategories(cats);
        setAvailableLeaders(leads);
        setAvailableRequestors(reqs);
        setAvailableRequestorVPs(reqvps);
        setAvailableRequestingDepts(reqdepts);
      }, 0);
    }
  }, [activeTab, allRows, myRows]);

  useEffect(() => {
    const closeAll = () => {
      setShowDeptMenu(false);
      setShowResourceMenu(false);
      setShowReportsToMenu(false);
      setShowActivityMenu(false);
      setShowCategoryMenu(false);
      setShowLeaderMenu(false);
      setShowRequestorMenu(false);
      setShowVPMenu(false);
      setShowReqDeptMenu(false);
    };
    window.addEventListener("click", closeAll);
    return () => window.removeEventListener("click", closeAll);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-[#017ACB] rounded-full"></div>
      </div>
    );
  }

  const rows =
    activeTab === "mine" ? (filteredMyRows && filteredMyRows.length ? filteredMyRows : myRows) : filteredAllRows;

  // SIMPLE 12-MONTH ROLLING WINDOW - start from current month and show 12 months
  const displayMonths = (() => {
    const out = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      out.push(`${y}${m}`);
    }
    return out;
  })();

  const dropdownBtnClass =
    "ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition";

  return (
    <>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-4xl font-bold text-gray-900" style={styles.outfitFont}>
            Assignments
          </h2>

          <button
            onClick={() => router.push("/team-member/dashboard")}
            className="px-4 py-2 rounded text-sm
              bg-[#017ACB] text-white border border-black
              hover:bg-[#017ACB]/20 transition-colors hover:text-gray-700
          
              shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
              active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
              relative
              before:content-[''] before:absolute before:inset-0 before:rounded
              before:pointer-events-none
              before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
            "
            style={styles.outfitFont}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("all")}
            className={`
              relative px-4 py-2 rounded text-sm transition-colors
              border border-black
              before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none
              before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
              ${
                activeTab === "all"
                  ? "bg-[#017ACB] text-white shadow-none"
                  : "bg-gray-200 text-gray-700 hover:bg-[#017ACB]/20 shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]"
              }
            `}
            style={styles.outfitFont}
          >
            All Assignments
          </button>

          <button
            onClick={() => setActiveTab("mine")}
            className={`
              relative px-4 py-2 rounded text-sm transition-colors
              border border-black
              before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none
              before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
              ${
                activeTab === "mine"
                  ? "bg-[#017ACB] text-white shadow-none"
                  : "bg-gray-200 text-gray-700 hover:bg-[#017ACB]/20 shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]"
              }
            `}
            style={styles.outfitFont}
          >
            My Assignments
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-max w-full border-collapse">
            <thead className="bg-[#017ACB] text-white sticky top-0 z-10">
              <tr>
                {/* RESOURCE NAME */}
                <th
                  className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Resource Name</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowResourceMenu((prev) => !prev);
                        setShowDeptMenu(false);
                        setShowReportsToMenu(false);
                        setShowActivityMenu(false);
                        setShowCategoryMenu(false);
                        setShowLeaderMenu(false);
                        setShowRequestorMenu(false);
                        setShowVPMenu(false);
                        setShowReqDeptMenu(false);
                      }}
                      className={dropdownBtnClass}
                    >
                      ▼
                    </button>
                  </div>
                  {showResourceMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-56 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500">Sort by name</div>
                      <div
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${resourceSort === "az" ? "bg-gray-100 font-semibold" : ""}`}
                        onClick={() => setResourceSort("az")}
                      >
                        A → Z
                      </div>
                      <div
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${resourceSort === "za" ? "bg-gray-100 font-semibold" : ""}`}
                        onClick={() => setResourceSort("za")}
                      >
                        Z → A
                      </div>
                      {/* <div className="border-t mt-1 pt-1 px-3 py-2 text-xs font-semibold text-gray-500">Filter by project</div> */}
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedResources.length === 0 ? "bg-gray-100 font-semibold" : ""}`}
                        onClick={() => setSelectedResources([])}
                      >
                        <input type="checkbox" checked={selectedResources.length === 0} readOnly /> All
                      </div>
                      {availableResources.map((name) => (
                        <div
                          key={name}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedResources.includes(name) ? "bg-gray-100 font-semibold" : ""}`}
                          onClick={() => toggleSelection(name)}
                        >
                          <input type="checkbox" checked={selectedResources.includes(name)} readOnly /> {name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm whitespace-nowrap" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Department</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowDeptMenu((p) => !p);
                        setShowResourceMenu(false);
                        setShowReportsToMenu(false);
                        setShowActivityMenu(false);
                        setShowCategoryMenu(false);
                        setShowLeaderMenu(false);
                        setShowRequestorMenu(false);
                        setShowVPMenu(false);
                        setShowReqDeptMenu(false);
                      }}
                      className={dropdownBtnClass}
                    >
                      ▼
                    </button>
                  </div>
                  {showDeptMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-56 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedDepartments.length === 0 ? "bg-gray-100 font-semibold" : ""}`}
                        onClick={() => setSelectedDepartments([])}
                      >
                        <input type="checkbox" checked={selectedDepartments.length === 0} readOnly /> All
                      </div>
                      {availableDepartments.map((name) => (
                        <div
                          key={name}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedDepartments.includes(name) ? "bg-gray-100 font-semibold" : ""}`}
                          onClick={() => toggleList(setSelectedDepartments, name)}
                        >
                          <input type="checkbox" checked={selectedDepartments.includes(name)} readOnly /> {name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm whitespace-nowrap" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Reports To</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowReportsToMenu((p) => !p);
                        setShowResourceMenu(false);
                        setShowDeptMenu(false);
                        setShowActivityMenu(false);
                        setShowCategoryMenu(false);
                        setShowLeaderMenu(false);
                        setShowRequestorMenu(false);
                        setShowVPMenu(false);
                        setShowReqDeptMenu(false);
                      }}
                      className={dropdownBtnClass}
                    >
                      ▼
                    </button>
                  </div>
                  {showReportsToMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-56 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedReportsTo.length === 0 ? "bg-gray-100 font-semibold" : ""}`}
                        onClick={() => setSelectedReportsTo([])}
                      >
                        <input type="checkbox" checked={selectedReportsTo.length === 0} readOnly /> All
                      </div>
                      {availableReportsTo.map((name) => (
                        <div
                          key={name}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedReportsTo.includes(name) ? "bg-gray-100 font-semibold" : ""}`}
                          onClick={() => toggleList(setSelectedReportsTo, name)}
                        >
                          <input type="checkbox" checked={selectedReportsTo.includes(name)} readOnly /> {name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm whitespace-nowrap" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Activity</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowActivityMenu((p) => !p);
                        setShowResourceMenu(false);
                        setShowDeptMenu(false);
                        setShowReportsToMenu(false);
                        setShowCategoryMenu(false);
                        setShowLeaderMenu(false);
                        setShowRequestorMenu(false);
                        setShowVPMenu(false);
                        setShowReqDeptMenu(false);
                      }}
                      className={dropdownBtnClass}
                    >
                      ▼
                    </button>
                  </div>
                  {showActivityMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-56 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedActivities.length === 0 ? "bg-gray-100 font-semibold" : ""}`}
                        onClick={() => setSelectedActivities([])}
                      >
                        <input type="checkbox" checked={selectedActivities.length === 0} readOnly /> All
                      </div>
                      {availableActivities.map((name) => (
                        <div
                          key={name}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedActivities.includes(name) ? "bg-gray-100 font-semibold" : ""}`}
                          onClick={() => toggleList(setSelectedActivities, name)}
                        >
                          <input type="checkbox" checked={selectedActivities.includes(name)} readOnly /> {name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm whitespace-nowrap" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Activity Category</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowCategoryMenu((p) => !p);
                        setShowResourceMenu(false);
                        setShowDeptMenu(false);
                        setShowReportsToMenu(false);
                        setShowActivityMenu(false);
                        setShowLeaderMenu(false);
                        setShowRequestorMenu(false);
                        setShowVPMenu(false);
                        setShowReqDeptMenu(false);
                      }}
                      className={dropdownBtnClass}
                    >
                      ▼
                    </button>
                  </div>
                  {showCategoryMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-56 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedCategories.length === 0 ? "bg-gray-100 font-semibold" : ""}`}
                        onClick={() => setSelectedCategories([])}
                      >
                        <input type="checkbox" checked={selectedCategories.length === 0} readOnly /> All
                      </div>
                      {availableCategories.map((name) => (
                        <div
                          key={name}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedCategories.includes(name) ? "bg-gray-100 font-semibold" : ""}`}
                          onClick={() => toggleList(setSelectedCategories, name)}
                        >
                          <input type="checkbox" checked={selectedCategories.includes(name)} readOnly /> {name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm whitespace-nowrap" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Leader Accountable</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowLeaderMenu((p) => !p);
                        setShowResourceMenu(false);
                        setShowDeptMenu(false);
                        setShowReportsToMenu(false);
                        setShowActivityMenu(false);
                        setShowCategoryMenu(false);
                        setShowRequestorMenu(false);
                        setShowVPMenu(false);
                        setShowReqDeptMenu(false);
                      }}
                      className={dropdownBtnClass}
                    >
                      ▼
                    </button>
                  </div>
                  {showLeaderMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-56 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedLeaders.length === 0 ? "bg-gray-100 font-semibold" : ""}`}
                        onClick={() => setSelectedLeaders([])}
                      >
                        <input type="checkbox" checked={selectedLeaders.length === 0} readOnly /> All
                      </div>
                      {availableLeaders.map((name) => (
                        <div
                          key={name}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedLeaders.includes(name) ? "bg-gray-100 font-semibold" : ""}`}
                          onClick={() => toggleList(setSelectedLeaders, name)}
                        >
                          <input type="checkbox" checked={selectedLeaders.includes(name)} readOnly /> {name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm whitespace-nowrap" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requestor</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowRequestorMenu((p) => !p);
                        setShowResourceMenu(false);
                        setShowDeptMenu(false);
                        setShowReportsToMenu(false);
                        setShowActivityMenu(false);
                        setShowCategoryMenu(false);
                        setShowLeaderMenu(false);
                        setShowVPMenu(false);
                        setShowReqDeptMenu(false);
                      }}
                      className={dropdownBtnClass}
                    >
                      ▼
                    </button>
                  </div>
                  {showRequestorMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-56 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedRequestors.length === 0 ? "bg-gray-100 font-semibold" : ""}`}
                        onClick={() => setSelectedRequestors([])}
                      >
                        <input type="checkbox" checked={selectedRequestors.length === 0} readOnly /> All
                      </div>
                      {availableRequestors.map((name) => (
                        <div
                          key={name}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedRequestors.includes(name) ? "bg-gray-100 font-semibold" : ""}`}
                          onClick={() => toggleList(setSelectedRequestors, name)}
                        >
                          <input type="checkbox" checked={selectedRequestors.includes(name)} readOnly /> {name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm whitespace-nowrap" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requestor VP</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowVPMenu((p) => !p);
                        setShowResourceMenu(false);
                        setShowDeptMenu(false);
                        setShowReportsToMenu(false);
                        setShowActivityMenu(false);
                        setShowCategoryMenu(false);
                        setShowLeaderMenu(false);
                        setShowRequestorMenu(false);
                        setShowReqDeptMenu(false);
                      }}
                      className={dropdownBtnClass}
                    >
                      ▼
                    </button>
                  </div>
                  {showVPMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-56 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedRequestorVPs.length === 0 ? "bg-gray-100 font-semibold" : ""}`}
                        onClick={() => setSelectedRequestorVPs([])}
                      >
                        <input type="checkbox" checked={selectedRequestorVPs.length === 0} readOnly /> All
                      </div>
                      {availableRequestorVPs.map((name) => (
                        <div
                          key={name}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedRequestorVPs.includes(name) ? "bg-gray-100 font-semibold" : ""}`}
                          onClick={() => toggleList(setSelectedRequestorVPs, name)}
                        >
                          <input type="checkbox" checked={selectedRequestorVPs.includes(name)} readOnly /> {name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm whitespace-nowrap" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requesting Dept</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowReqDeptMenu((p) => !p);
                        setShowResourceMenu(false);
                        setShowDeptMenu(false);
                        setShowReportsToMenu(false);
                        setShowActivityMenu(false);
                        setShowCategoryMenu(false);
                        setShowLeaderMenu(false);
                        setShowRequestorMenu(false);
                        setShowVPMenu(false);
                      }}
                      className={dropdownBtnClass}
                    >
                      ▼
                    </button>
                  </div>
                  {showReqDeptMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-56 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedRequestingDepts.length === 0 ? "bg-gray-100 font-semibold" : ""}`}
                        onClick={() => setSelectedRequestingDepts([])}
                      >
                        <input type="checkbox" checked={selectedRequestingDepts.length === 0} readOnly /> All
                      </div>
                      {availableRequestingDepts.map((name) => (
                        <div
                          key={name}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${selectedRequestingDepts.includes(name) ? "bg-gray-100 font-semibold" : ""}`}
                          onClick={() => toggleList(setSelectedRequestingDepts, name)}
                        >
                          <input type="checkbox" checked={selectedRequestingDepts.includes(name)} readOnly /> {name}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {displayMonths.map((m) => (
                  <th key={m} className="px-4 py-2 border text-sm whitespace-nowrap">
                    {formatMonth(m)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className={`hover:bg-[#017ACB]/20 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <td className="px-4 py-2 border text-sm">{row.resource_name}</td>
                  <td className="px-4 py-2 border text-sm">{row.department}</td>
                  <td className="px-4 py-2 border text-sm">{row.reports_to}</td>
                  <td className="px-4 py-2 border text-sm">{row.activity}</td>
                  <td className="px-4 py-2 border text-sm">{row.category}</td>
                  <td className="px-4 py-2 border text-sm">{row.leader}</td>
                  <td className="px-4 py-2 border text-sm">{row.requestor}</td>
                  <td className="px-4 py-2 border text-sm">{row.requestor_vp}</td>
                  <td className="px-4 py-2 border text-sm">{row.requesting_dept}</td>

                  {displayMonths.map((m) => (
                    <td key={m} className="px-4 py-2 border text-sm text-center">
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
