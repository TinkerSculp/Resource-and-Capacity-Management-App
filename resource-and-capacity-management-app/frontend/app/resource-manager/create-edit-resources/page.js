"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import api from "@/lib/api";

const styles = {
  outfitFont: { fontFamily: "Outfit, sans-serif" },
};

const DEPARTMENT_FILTER_NAME = "Data Mgmt";

function Checkbox({ checked }) {
  return (
    <span
      className="
        w-4 h-4 border border-black rounded-sm
        flex items-center justify-center
        relative overflow-hidden flex-shrink-0
      "
    >
      <input
        type="checkbox"
        checked={checked}
        readOnly
        className="opacity-0 absolute w-4 h-4 cursor-pointer"
      />
      {checked && (
        <>
          <span
            className="absolute inset-0"
            style={{ backgroundColor: "#003A5C" }}
          />
          <svg
            className="absolute w-3 h-3 text-white"
            viewBox="0 0 20 20"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="4 11 8 15 16 6" />
          </svg>
        </>
      )}
    </span>
  );
}

export default function ResourcesPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const searchParams = useSearchParams();
  const refresh = searchParams.get("refresh");

  const [employees, setEmployees] = useState([]);
  const [employeesWithCapacity, setEmployeesWithCapacity] = useState([]);
  const [allEmployeesWithCapacity, setAllEmployeesWithCapacity] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedNames, setSelectedNames] = useState([]);
  const [selectedTitles, setSelectedTitles] = useState([]);
  const [selectedReportsTo, setSelectedReportsTo] = useState([]);
  const [selectedCurrentStatuses, setSelectedCurrentStatuses] = useState([]);
  const [selectedManagerLevels, setSelectedManagerLevels] = useState([]);
  const [selectedDirectorLevels, setSelectedDirectorLevels] = useState([]);

  const [nameSort, setNameSort] = useState("none");

  const [showNameMenu, setShowNameMenu] = useState(false);
  const [showTitleMenu, setShowTitleMenu] = useState(false);
  const [showReportsToMenu, setShowReportsToMenu] = useState(false);
  const [showCurrentStatusMenu, setShowCurrentStatusMenu] = useState(false);
  const [showManagerLevelMenu, setShowManagerLevelMenu] = useState(false);
  const [showDirectorLevelMenu, setShowDirectorLevelMenu] = useState(false);

  // NEW MONTH SYSTEM
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthOptions, setMonthOptions] = useState([]);
  const [visibleMonths, setVisibleMonths] = useState([]);

  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const [availableNames, setAvailableNames] = useState([]);
  const [availableTitles, setAvailableTitles] = useState([]);
  const [availableReportsTo, setAvailableReportsTo] = useState([]);
  const [availableCurrentStatuses, setAvailableCurrentStatuses] = useState([]);
  const [availableManagerLevels, setAvailableManagerLevels] = useState([]);
  const [availableDirectorLevels, setAvailableDirectorLevels] = useState([]);

  const [portalReady, setPortalReady] = useState(false);

  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const monthMenuRef = useRef(null);

  /* ---------------------------------------------------------
     MONTH HELPERS
     --------------------------------------------------------- */

function generate12MonthsBackward() {
  const arr = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

    const key = d.getFullYear() * 100 + (d.getMonth() + 1); // NUMBER

    arr.push({
      key,
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
      date: d,
    });
  }

  return arr;
}

function generate16MonthsForward(startDate) {
  const arr = [];
  for (let i = 0; i < 16; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);

    const key = d.getFullYear() * 100 + (d.getMonth() + 1); // NUMBER

    arr.push({
      key,
      label:
        d.toLocaleString("default", { month: "short" }) +
        "-" +
        String(d.getFullYear()).slice(-2),
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
  if (showMonthMenu && monthMenuRef.current) {
    const el = monthMenuRef.current.querySelector(
      `[data-month-key="${selectedMonth?.key}"]`
    );
    if (el) {
      el.scrollIntoView({ block: "center" });
    }
  }
}, [showMonthMenu, selectedMonth]);
  /* ---------------------------------------------------------
     INITIAL MONTH SETUP
     --------------------------------------------------------- */

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
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    const close = () => {
      setShowNameMenu(false);
      setShowTitleMenu(false);
      setShowReportsToMenu(false);
      setShowCurrentStatusMenu(false);
      setShowManagerLevelMenu(false);
      setShowDirectorLevelMenu(false);
      setShowMonthMenu(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [{ data: empData }, { data: deptData }, { data: mgrData }] =
          await Promise.all([
            api.get("/resources/employees"),
            api.get("/resources/departments"),
            api.get("/resources/managers"),
          ]);

        const employeesRaw = Array.isArray(empData) ? empData : [];
        const departmentsRaw = Array.isArray(deptData) ? deptData : [];
        const managersRaw = Array.isArray(mgrData) ? mgrData : [];

        setDepartments(departmentsRaw);
        setManagers(managersRaw);

        const withCap = await Promise.all(
          employeesRaw.map(async (emp) => {
            try {
              const { data: capData } = await api.get(
                `/resources/employees/${emp.emp_id}/capacity`
              );
              const cap = {};
              (Array.isArray(capData) ? capData : []).forEach((c) => {
                cap[c.date] = {
                  amount: typeof c.amount === "number" ? c.amount : null,
                };
              });
              return { ...emp, capacity: cap };
            } catch {
              return { ...emp, capacity: {} };
            }
          })
        );

        const filtered = withCap.filter((emp) => {
          const dept = departmentsRaw.find(
            (d) => d.dept_no === emp.dept_no
          );
          return (
            dept &&
            dept.dept_name &&
            dept.dept_name.toLowerCase() ===
              DEPARTMENT_FILTER_NAME.toLowerCase()
          );
        });

        setAllEmployeesWithCapacity(withCap);
        setEmployeesWithCapacity(filtered);
        setEmployees(filtered);

        setAvailableNames([
          ...new Set(filtered.map((e) => e.emp_name).filter(Boolean)),
        ]);

        setAvailableTitles([
          ...new Set(filtered.map((e) => e.emp_title).filter(Boolean)),
        ]);

        const getReportsToNameFromList = (id) => {
          if (!id && id !== 0) return null;
          const match = withCap.find(
            (e) => String(e.emp_id) === String(id)
          );
          return match ? match.emp_name : null;
        };

        setAvailableReportsTo([
          ...new Set(
            filtered
              .map((e) => getReportsToNameFromList(e.reports_to))
              .filter(Boolean)
          ),
        ]);

        const getCurrentStatusLocal = (emp) =>
          emp.current_status || "Active";

        setAvailableCurrentStatuses([
          ...new Set(
            filtered
              .map((e) => getCurrentStatusLocal(e))
              .filter(Boolean)
          ),
        ]);

        const getLevelNameLocal = (id) => {
          if (!id && id !== 0) return "";
          const match = managersRaw.find(
            (m) => String(m.emp_id) === String(id)
          );
          return match ? match.emp_name : "";
        };

        setAvailableManagerLevels([
          ...new Set(
            filtered
              .map((e) => getLevelNameLocal(e.manager_level))
              .filter(Boolean)
          ),
        ]);

        setAvailableDirectorLevels([
          ...new Set(
            filtered
              .map((e) => getLevelNameLocal(e.director_level))
              .filter(Boolean)
          ),
        ]);

        setError("");
      } catch {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [refresh]);

  /* ---------------------------------------------------------
     THE SECTION YOU JUST GAVE ME (MERGED AS-IS)
     --------------------------------------------------------- */

  const toggleSelection = (value, setFn, current) => {
    setFn(
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  };

  const getDepartmentName = (deptNo) =>
    departments.find((d) => d.dept_no === deptNo)?.dept_name || deptNo;

  const getReportsToName = (emp) => {
    const match = allEmployeesWithCapacity.find(
      (e) => String(e.emp_id) === String(emp.reports_to)
    );
    return match ? match.emp_name : "-";
  };

  const getLevelName = (id) => {
    if (!id && id !== 0) return "";
    const match = managers.find(
      (m) => String(m.emp_id) === String(id)
    );
    return match ? match.emp_name : id;
  };

  const getCurrentStatus = (emp) => emp.current_status || "Active";

  const getMonthValue = (emp, key) => {
    const val =
      emp.capacity && emp.capacity[key]
        ? emp.capacity[key].amount
        : null;
    return typeof val === "number" ? val : "";
  };

  const startEditMonth = (emp, key) => {
    setEditingCell({ empId: emp.emp_id, monthKey: key });
    const v = getMonthValue(emp, key);
    setEditingValue(v === "" ? "" : String(v));
  };

  const cancelEditMonth = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const saveMonthValue = async (emp, key) => {
    const raw = editingValue.trim();

    if (raw === "") {
      const updates = [
        {
          date: key,
          amount: null,
        },
      ];

      try {
        await api.put(`/resources/employees/${emp.emp_id}/capacity`, {
          capacityEntries: updates,
        });

        setEmployeesWithCapacity((prev) =>
          prev.map((e) =>
            e.emp_id === emp.emp_id
              ? {
                  ...e,
                  capacity: {
                    ...(e.capacity || {}),
                    [key]: { amount: null },
                  },
                }
              : e
          )
        );

        setError("");
        cancelEditMonth();
      } catch {
        setError("Unable to update capacity");
      }

      return;
    }

    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
      setError("Capacity must be a number between 0 and 1");
      return;
    }

    const updates = [
      {
        date: key,
        amount: parsed,
      },
    ];

    try {
      await api.put(
        `/resources/employees/${emp.emp_id}/capacity`,
        {
          capacityEntries: updates,
        }
      );

      setEmployeesWithCapacity((prev) =>
        prev.map((e) =>
          e.emp_id === emp.emp_id
            ? {
                ...e,
                capacity: {
                  ...(e.capacity || {}),
                  [key]: {
                    ...(e.capacity?.[key] || {}),
                    amount: parsed,
                  },
                },
              }
            : e
        )
      );

      setError("");
      cancelEditMonth();
    } catch {
      setError("Unable to update capacity");
    }
  };

  const renderDropdownPortal = (menu) => {
    if (!portalReady) return null;

    return createPortal(
      <>
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => {
            setShowNameMenu(false);
            setShowTitleMenu(false);
            setShowReportsToMenu(false);
            setShowCurrentStatusMenu(false);
            setShowManagerLevelMenu(false);
            setShowDirectorLevelMenu(false);
            setShowMonthMenu(false);
          }}
        />
        <div
          className="fixed z-[9999]"
          style={{ top: menuPosition.y, left: menuPosition.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {menu}
        </div>
      </>,
      document.body
    );
  };

  useEffect(() => {
    let filtered = [...employeesWithCapacity];

    if (activeFilter === "mine" && user) {
      filtered = filtered.filter(
        (emp) => String(emp.emp_id) === String(user.emp_id)
      );
    }

    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.emp_name.toLowerCase().includes(t) ||
          e.emp_title.toLowerCase().includes(t)
      );
    }

    const deptName = (no) =>
      departments.find((d) => d.dept_no === no)?.dept_name || "";

    filtered = filtered.filter(
      (e) =>
        deptName(e.dept_no).toLowerCase() ===
        DEPARTMENT_FILTER_NAME.toLowerCase()
    );

    if (selectedNames.length > 0) {
      filtered = filtered.filter((e) =>
        selectedNames.includes(e.emp_name)
      );
    }

    if (selectedTitles.length > 0) {
      filtered = filtered.filter((e) =>
        selectedTitles.includes(e.emp_title)
      );
    }

    if (selectedReportsTo.length > 0) {
      filtered = filtered.filter((e) =>
        selectedReportsTo.includes(getReportsToName(e))
      );
    }

    if (selectedCurrentStatuses.length > 0) {
      filtered = filtered.filter((e) =>
        selectedCurrentStatuses.includes(getCurrentStatus(e))
      );
    }

    if (selectedManagerLevels.length > 0) {
      filtered = filtered.filter((e) =>
        selectedManagerLevels.includes(
          getLevelName(e.manager_level)
        )
      );
    }

    if (selectedDirectorLevels.length > 0) {
      filtered = filtered.filter((e) =>
        selectedDirectorLevels.includes(
          getLevelName(e.director_level)
        )
      );
    }

    if (nameSort === "asc") {
      filtered.sort((a, b) =>
        a.emp_name.localeCompare(b.emp_name)
      );
    } else if (nameSort === "desc") {
      filtered.sort((a, b) =>
        b.emp_name.localeCompare(a.emp_name)
      );
    }

    setEmployees(filtered);
  }, [
    employeesWithCapacity,
    activeFilter,
    searchTerm,
    user,
    nameSort,
    selectedNames,
    selectedTitles,
    selectedReportsTo,
    selectedCurrentStatuses,
    selectedManagerLevels,
    selectedDirectorLevels,
    departments,
  ]);


  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-white p-2 flex flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-4">
          <h2
            className="text-4xl font-bold text-gray-900"
            style={styles.outfitFont}
          >
            Resources
          </h2>

          <button
            onClick={() => router.push("/resource-manager/dashboard")}
            className="
              px-4 py-2 rounded text-sm
              bg-gray-200 text-gray-700 border
              hover:bg-[#017ACB]/20 transition-colors
              shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            "
            style={styles.outfitFont}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="flex-1 flex justify-center">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-500 bg-gray-200 rounded text-gray-700 text-sm w-64 hover:bg-[#017ACB]/20 transition-colors"
            style={styles.outfitFont}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded overflow-hidden border border-gray-300">
            {/* ALL */}
            <button
              onClick={() => setActiveFilter("all")}
              className={`
                px-6 py-2 rounded-none text-sm transition-colors 
                ${
                  activeFilter === "all"
                    ? "bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700"
                    : "bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20"
                }
                shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              `}
              style={styles.outfitFont}
            >
              All
            </button>

            {/* MINE */}
            <button
              onClick={() => setActiveFilter("mine")}
              className={`
                px-5 py-2 rounded-none text-sm transition-colors
                ${
                  activeFilter === "mine"
                    ? "bg-[#017ACB] text-white  hover:bg-[#017ACB]/20 hover:text-gray-700"
                    : "bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20"
                }
                shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              `}
              style={styles.outfitFont}
            >
              Mine
            </button>
          </div>

          <Link
            href="/resource-manager/create-edit-resources/create-resource"
            className="
              px-4 py-2 rounded text-sm
              bg-gray-200 text-gray-700 border
              hover:bg-[#017ACB]/20 transition-colors
              shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            "
            style={styles.outfitFont}
          >
            + Create Resource
          </Link>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded shrink-0">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-4 text-red-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* TABLE WRAPPER */}
      <div className="border rounded-lg shadow-sm bg-white overflow-hidden shrink-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-max w-full border-collapse text-sm">
            {/* HEADER */}
            <thead className="bg-[#017ACB] text-white">
              <tr className="sticky top-0 z-[100] bg-[#017ACB]">
                {/* EDIT HEADER */}
                <th
                  className="
                    sticky left-0 top-0
                    z-[9999]
                    bg-[#017ACB] bg-opacity-100
                    px-4 py-2
                    text-sm font-semibold
                    whitespace-nowrap
                    align-middle
                    [background-clip:padding-box]
                  "
                  style={styles.outfitFont}
                >
                  Edit
                </th>

                {/* NAME HEADER */}
                <th
                  className="
                    px-2 py-2 text-left font-semibold
                    border-l border-black border-r border-black
                    min-w-[150px] relative
                  "
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Name</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect =
                          e.currentTarget.getBoundingClientRect();
                        setMenuPosition({
                          x: rect.left,
                          y: rect.bottom,
                        });
                        setShowNameMenu((prev) => !prev);
                        setShowTitleMenu(false);
                        setShowReportsToMenu(false);
                        setShowCurrentStatusMenu(false);
                        setShowManagerLevelMenu(false);
                        setShowDirectorLevelMenu(false);
                      }}
                      className="
                        ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold
                        hover:bg-[#CDE6F7] transition
                        shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                        active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                      "
                    >
                      ▼
                    </button>
                  </div>

                  {showNameMenu &&
                    renderDropdownPortal(
                      <div className="bg-white text-black shadow-lg rounded w-56 max-h-110 overflow-y-auto border border-gray-200">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 text-center">
                          Sort by name
                        </div>

                        <div
                          className="
                            px-3 py-2 cursor-pointer text-sm flex items-center gap-2
                            hover:bg-[#017ACB]/20
                            shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                                    inset_-2px_-2px_0_rgba(0,0,0,0.12)]
                          "
                          onClick={() =>
                            setNameSort((prev) =>
                              prev === "asc" ? "none" : "asc"
                            )
                          }
                        >
                          <Checkbox checked={nameSort === "asc"} />
                          A → Z
                        </div>

                        <div
                          className="
                            px-3 py-2 cursor-pointer text-sm flex items-center gap-2
                            hover:bg-[#017ACB]/20
                            shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                                    inset_-2px_-2px_0_rgba(0,0,0,0.12)]
                          "
                          onClick={() =>
                            setNameSort((prev) =>
                              prev === "desc" ? "none" : "desc"
                            )
                          }
                        >
                          <Checkbox checked={nameSort === "desc"} />
                          Z → A
                        </div>

                        <div className="border-t mt-1 pt-1 px-3 py-2 text-xs font-semibold text-gray-500 text-center">
                          Filter by name
                        </div>

                        <div
                          className={`
                            px-3 py-2 cursor-pointer text-sm flex items-center gap-2
                            hover:bg-[#017ACB]/20
                            ${
                              selectedNames.length === 0 ||
                              selectedNames.length ===
                                availableNames.length
                                ? "font-semibold"
                                : ""
                            }
                            shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                                    inset_-2px_-2px_0_rgba(0,0,0,0.12)]
                          `}
                          onClick={() => setSelectedNames([])}
                        >
                          <Checkbox
                            checked={
                              selectedNames.length === 0 ||
                              selectedNames.length ===
                                availableNames.length
                            }
                          />
                          All
                        </div>

                        {availableNames.map((name) => (
                          <div
                            key={name}
                            className={`
                              px-3 py-2 cursor-pointer text-sm flex items-center gap-2
                              hover:bg-[#017ACB]/20
                              ${
                                selectedNames.includes(name)
                                  ? "font-semibold"
                                  : ""
                              }
                              shadow-[inset_2px_2px_0_rgba(255,255,255,1),
                                      inset_-2px_-2px_0_rgba(0,0,0,0.12)]
                            `}
                            onClick={() =>
                              toggleSelection(
                                name,
                                setSelectedNames,
                                selectedNames
                              )
                            }
                          >
                            <Checkbox
                              checked={selectedNames.includes(name)}
                            />
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                </th>

                {/* TITLE HEADER */}
                <th
                  className="
                    px-2 py-2 text-left font-semibold
                    border-r border-black
                    min-w-[150px] relative
                  "
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Title</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect =
                          e.currentTarget.getBoundingClientRect();
                        setMenuPosition({
                          x: rect.left,
                          y: rect.bottom,
                        });
                        setShowTitleMenu((prev) => !prev);
                        setShowNameMenu(false);
                        setShowReportsToMenu(false);
                        setShowCurrentStatusMenu(false);
                        setShowManagerLevelMenu(false);
                        setShowDirectorLevelMenu(false);
                      }}
                      className="
                        ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold
                        hover:bg-[#CDE6F7] transition
                        shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                        active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                      "
                    >
                      ▼
                    </button>
                  </div>

                  {showTitleMenu &&
                    renderDropdownPortal(
                      <div className="bg-white text-black shadow-lg rounded w-56 max-h-110 overflow-y-auto border border-gray-200">
                        <div
                          className={`
                            px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20
                            flex items-center gap-2
                            ${
                              selectedTitles.length === 0 ||
                              selectedTitles.length ===
                                availableTitles.length
                                ? "font-semibold"
                                : ""
                            }
                          `}
                          onClick={() => setSelectedTitles([])}
                        >
                          <Checkbox
                            checked={
                              selectedTitles.length === 0 ||
                              selectedTitles.length ===
                                availableTitles.length
                            }
                          />
                          All
                        </div>

                        {availableTitles.map((title) => (
                          <div
                            key={title}
                            className={`
                              px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20
                              flex items-center gap-2
                              ${
                                selectedTitles.includes(title)
                                  ? "font-semibold"
                                  : ""
                              }
                            `}
                            onClick={() =>
                              toggleSelection(
                                title,
                                setSelectedTitles,
                                selectedTitles
                              )
                            }
                          >
                            <Checkbox
                              checked={selectedTitles.includes(
                                title
                              )}
                            />
                            {title}
                          </div>
                        ))}
                      </div>
                    )}
                </th>

                {/* DEPARTMENT HEADER */}
                <th
                  className="
                    px-2 py-2 text-left font-semibold
                    border-r border-black
                    min-w-[150px]
                  "
                  style={styles.outfitFont}
                >
                  Department
                </th>

                {/* REPORTS TO HEADER */}
                <th
                  className="
                    px-2 py-2 text-left font-semibold
                    border-r border-black
                    min-w-[150px] relative
                  "
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Reports To</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect =
                          e.currentTarget.getBoundingClientRect();
                        setMenuPosition({
                          x: rect.left,
                          y: rect.bottom,
                        });
                        setShowReportsToMenu((prev) => !prev);
                        setShowNameMenu(false);
                        setShowTitleMenu(false);
                        setShowCurrentStatusMenu(false);
                        setShowManagerLevelMenu(false);
                        setShowDirectorLevelMenu(false);
                      }}
                      className="
                        ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold
                        hover:bg-[#CDE6F7] transition
                        shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                        active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                      "
                    >
                      ▼
                    </button>
                  </div>

                  {showReportsToMenu &&
                    renderDropdownPortal(
                      <div className="bg-white text-black shadow-lg rounded w-56 max-h-64 overflow-y-auto border border-gray-200">
                        <div
                          className={`
                            px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20
                            flex items-center gap-2
                            ${
                              selectedReportsTo.length === 0 ||
                              selectedReportsTo.length ===
                                availableReportsTo.length
                                ? "font-semibold"
                                : ""
                            }
                          `}
                          onClick={() => setSelectedReportsTo([])}
                        >
                          <Checkbox
                            checked={
                              selectedReportsTo.length === 0 ||
                              selectedReportsTo.length ===
                                availableReportsTo.length
                            }
                          />
                          All
                        </div>

                        {availableReportsTo.map((name) => (
                          <div
                            key={name}
                            className={`
                              px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20
                              flex items-center gap-2
                              ${
                                selectedReportsTo.includes(name)
                                  ? "font-semibold"
                                  : ""
                              }
                            `}
                            onClick={() =>
                              toggleSelection(
                                name,
                                setSelectedReportsTo,
                                selectedReportsTo
                              )
                            }
                          >
                            <Checkbox
                              checked={selectedReportsTo.includes(
                                name
                              )}
                            />
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                </th>

                {/* MANAGER LEVEL HEADER */}
                <th
                  className="
                    px-2 py-2 text-left font-semibold
                    border-r border-black
                    min-w-[150px] relative
                  "
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Manager Level</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect =
                          e.currentTarget.getBoundingClientRect();
                        setMenuPosition({
                          x: rect.left,
                          y: rect.bottom,
                        });
                        setShowManagerLevelMenu((prev) => !prev);
                        setShowNameMenu(false);
                        setShowTitleMenu(false);
                        setShowReportsToMenu(false);
                        setShowCurrentStatusMenu(false);
                        setShowDirectorLevelMenu(false);
                      }}
                      className="
                        ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold
                        hover:bg-[#CDE6F7] transition
                        shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                        active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                      "
                    >
                      ▼
                    </button>
                  </div>

                  {showManagerLevelMenu &&
                    renderDropdownPortal(
                      <div className="bg-white text-black shadow-lg rounded w-56 max-h-64 overflow-y-auto border border-gray-200">
                        <div
                          className={`
                            px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20
                            flex items-center gap-2
                            ${
                              selectedManagerLevels.length === 0 ||
                              selectedManagerLevels.length ===
                                availableManagerLevels.length
                                ? "font-semibold"
                                : ""
                            }
                          `}
                          onClick={() => setSelectedManagerLevels([])}
                        >
                          <Checkbox
                            checked={
                              selectedManagerLevels.length === 0 ||
                              selectedManagerLevels.length ===
                                availableManagerLevels.length
                            }
                          />
                          All
                        </div>

                        {availableManagerLevels.map((name) => (
                          <div
                            key={name}
                            className={`
                              px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20
                              flex items-center gap-2
                              ${
                                selectedManagerLevels.includes(name)
                                  ? "font-semibold"
                                  : ""
                              }
                            `}
                            onClick={() =>
                              toggleSelection(
                                name,
                                setSelectedManagerLevels,
                                selectedManagerLevels
                              )
                            }
                          >
                            <Checkbox
                              checked={selectedManagerLevels.includes(
                                name
                              )}
                            />
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                </th>

                {/* DIRECTOR LEVEL HEADER */}
                <th
                  className="
                    px-2 py-2 text-left font-semibold
                    border-r border-black
                    min-w-[150px] relative
                  "
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Director Level</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect =
                          e.currentTarget.getBoundingClientRect();
                        setMenuPosition({
                          x: rect.left,
                          y: rect.bottom,
                        });
                        setShowDirectorLevelMenu((prev) => !prev);
                        setShowNameMenu(false);
                        setShowTitleMenu(false);
                        setShowReportsToMenu(false);
                        setShowCurrentStatusMenu(false);
                        setShowManagerLevelMenu(false);
                      }}
                      className="
                        ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold
                        hover:bg-[#CDE6F7] transition
                        shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                        active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                      "
                    >
                      ▼
                    </button>
                  </div>

                  {showDirectorLevelMenu &&
                    renderDropdownPortal(
                      <div className="bg-white text-black shadow-lg rounded w-56 max-h-64 overflow-y-auto border border-gray-200">
                        <div
                          className={`
                            px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20
                            flex items-center gap-2
                            ${
                              selectedDirectorLevels.length === 0 ||
                              selectedDirectorLevels.length ===
                                availableDirectorLevels.length
                                ? "font-semibold"
                                : ""
                            }
                          `}
                          onClick={() => setSelectedDirectorLevels([])}
                        >
                          <Checkbox
                            checked={
                              selectedDirectorLevels.length === 0 ||
                              selectedDirectorLevels.length ===
                                availableDirectorLevels.length
                            }
                          />
                          All
                        </div>

                        {availableDirectorLevels.map((name) => (
                          <div
                            key={name}
                            className={`
                              px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20
                              flex items-center gap-2
                              ${
                                selectedDirectorLevels.includes(name)
                                  ? "font-semibold"
                                  : ""
                              }
                            `}
                            onClick={() =>
                              toggleSelection(
                                name,
                                setSelectedDirectorLevels,
                                selectedDirectorLevels
                              )
                            }
                          >
                            <Checkbox
                              checked={selectedDirectorLevels.includes(
                                name
                              )}
                            />
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                </th>

                {/* OTHER INFO HEADER */}
                <th
                  className="
                    px-2 py-2 text-left font-semibold
                    border-r border-black
                    min-w-[200px] max-w[400px]
                  "
                  style={styles.outfitFont}
                >
                  Other Information
                </th>

                {/* CURRENT STATUS HEADER */}
                <th
                  className="
                    px-2 py-2 text-left font-semibold
                    border-r border-black
                    min-w-[130px] relative
                  "
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Status</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect =
                          e.currentTarget.getBoundingClientRect();
                        setMenuPosition({
                          x: rect.left,
                          y: rect.bottom,
                        });
                        setShowCurrentStatusMenu((prev) => !prev);
                        setShowNameMenu(false);
                        setShowTitleMenu(false);
                        setShowReportsToMenu(false);
                        setShowManagerLevelMenu(false);
                        setShowDirectorLevelMenu(false);
                      }}
                      className="
                        ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold
                        hover:bg-[#CDE6F7] transition
                        shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                        active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                      "
                    >
                      ▼
                    </button>
                  </div>

                  {showCurrentStatusMenu &&
                    renderDropdownPortal(
                      <div className="bg-white text-black shadow-lg rounded w-56 max-h-64 overflow-y-auto border border-gray-200">
                        <div
                          className={`
                            px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20
                            flex items-center gap-2
                            ${
                              selectedCurrentStatuses.length === 0 ||
                              selectedCurrentStatuses.length ===
                                availableCurrentStatuses.length
                                ? "font-semibold"
                                : ""
                            }
                          `}
                          onClick={() =>
                            setSelectedCurrentStatuses([])
                          }
                        >
                          <Checkbox
                            checked={
                              selectedCurrentStatuses.length === 0 ||
                              selectedCurrentStatuses.length ===
                                availableCurrentStatuses.length
                            }
                          />
                          All
                        </div>

                        {availableCurrentStatuses.map((status) => (
                          <div
                            key={status}
                            className={`
                              px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20
                              flex items-center gap-2
                              ${
                                selectedCurrentStatuses.includes(
                                  status
                                )
                                  ? "font-semibold"
                                  : ""
                              }
                            `}
                            onClick={() =>
                              toggleSelection(
                                status,
                                setSelectedCurrentStatuses,
                                selectedCurrentStatuses
                              )
                            }
                          >
                            <Checkbox
                              checked={selectedCurrentStatuses.includes(
                                status
                              )}
                            />
                            {status}
                          </div>
                        ))}
                      </div>
                    )}
                </th>
{showMonthMenu &&
  renderDropdownPortal(
    <div
      ref={monthMenuRef}
      className="bg-white text-black shadow-lg rounded w-56 max-h-64 overflow-y-auto border border-gray-200"
    >
      {[...monthOptions].reverse().map((m) => (
        <div
          key={m.key}
          data-month-key={m.key}   // ← ADD THIS
          className="
            px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20
            flex items-center gap-2
          "
          onClick={() => handleMonthSelect(m)}
        >
          <Checkbox checked={selectedMonth?.key === m.key} />
          {m.label}
        </div>
      ))}
    </div>
  )}
{/* MONTH COLUMNS */}
{visibleMonths.map((month, index) => (
  <th
    key={month.key}
    className="
      px-2 py-2 text-center text-white
      border-r border-black min-w-[60px]
      relative
    "
    style={styles.outfitFont}
  >
    <div className="flex justify-center items-center gap-1">
      <span>{month.label}</span>

      {/* FILTER BUTTON ONLY ON FIRST MONTH */}
      {index === 0 && (
<button
  onClick={(e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.left, y: rect.bottom });
    setShowMonthMenu((prev) => !prev);
  }}
  className="
    bg-white text-[#017ACB]
    px-2 py-1 text-xs rounded
    hover:bg-[#CDE6F7] transition
    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
  "
>
  ▼
</button>
      )}
    </div>
  </th>
))}

              </tr>
            </thead>

            {/* BODY */}
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={9 + visibleMonths.length}
                    className="px-4 py-8 text-center text-black border-t border-black"
                    style={styles.outfitFont}
                  >
                    No employees found
                  </td>
                </tr>
              ) : (
                employees.map((employee) => {
                  const isSelected =
                    selectedEmpId === employee.emp_id;

                  return (
                    <tr
                      key={employee.emp_id}
                      className={`
                        border-t border-black
                        hover:bg-[#017ACB]/10
                        ${isSelected ? "bg-[#CDE6F7]" : ""}
                      `}
                      onClick={() =>
                        setSelectedEmpId(
                          isSelected ? null : employee.emp_id
                        )
                      }
                    >
                      {/* EDIT BUTTON */}
                      <td
                        className="
                          sticky left-0 z-30
                          px-4 py-2
                          bg-white
                          border-r border-black
                          text-black
                          whitespace-nowrap
                        "
                      >
                        <Link
                          href={`/resource-manager/create-edit-resources/edit-resource?id=${employee.emp_id}`}
                          className="
                            px-2 py-1
                            bg-[#017ACB] text-white text-xs rounded
                            hover:bg-[#017ACB]/20 hover:text-gray-700 transition
                            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                          "
                          style={styles.outfitFont}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Edit
                        </Link>
                      </td>

                      {/* NAME */}
                      <td
                        className="
                          px-2 py-2 text-black border-l border-black border-r border-black
                        "
                        style={styles.outfitFont}
                      >
                        {employee.emp_name}
                      </td>

                      {/* TITLE */}
                      <td
                        className="px-2 py-2 text-black border-r border-black"
                        style={styles.outfitFont}
                      >
                        {employee.emp_title}
                      </td>

                      {/* DEPARTMENT */}
                      <td
                        className="px-2 py-2 text-black border-r border-black"
                        style={styles.outfitFont}
                      >
                        {getDepartmentName(employee.dept_no)}
                      </td>

                      {/* REPORTS TO */}
                      <td
                        className="px-2 py-2 text-black border-r border-black"
                        style={styles.outfitFont}
                      >
                        {getReportsToName(employee)}
                      </td>

                      {/* MANAGER LEVEL */}
                      <td
                        className="px-2 py-2 text-black border-r border-black"
                        style={styles.outfitFont}
                      >
                        {getLevelName(employee.manager_level)}
                      </td>

                      {/* DIRECTOR LEVEL */}
                      <td
                        className="px-2 py-2 text-black border-r border-black"
                        style={styles.outfitFont}
                      >
                        {getLevelName(employee.director_level)}
                      </td>

                      {/* OTHER INFO */}
                      <td
                        className="px-2 py-2 text-black border-r border-black"
                        style={styles.outfitFont}
                      >
                        {employee.other_info || ""}
                      </td>

                      {/* CURRENT STATUS */}
                      <td
                        className="px-2 py-2 border-r border-black"
                        style={styles.outfitFont}
                      >
                        <span
                          className={`
                            px-2 py-1 text-xs rounded
                            ${
                              getCurrentStatus(employee) === "Active"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          `}
                        >
                          {getCurrentStatus(employee)}
                        </span>
                      </td>


{/* MONTH CELLS */}
{visibleMonths.map((month) => (
  <td
    key={month.key}
    className="
      px-2 py-2 text-center text-black
      border-r border-black
      cursor-pointer
    "
    style={styles.outfitFont}
    onClick={(e) => {
      e.stopPropagation();
      startEditMonth(employee, month.key);
    }}
  >
    {editingCell?.empId === employee.emp_id &&
    editingCell?.monthKey === month.key ? (
      <input
        type="number"
        min="0"
        max="1"
        step="0.25"
        value={editingValue}
        onChange={(e) => setEditingValue(e.target.value)}
        onBlur={() => saveMonthValue(employee, month.key)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            saveMonthValue(employee, month.key);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancelEditMonth();
          }
        }}
        autoFocus
        className="
          w-14 px-1 py-0.5 border border-gray-300 rounded
          text-center text-sm
        "
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <div className="inline-block px-1 py-0.5">
        {getMonthValue(employee, month.key)}
      </div>
    )}
  </td>
))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER */}
      <div
        className="mt-3 text-gray-600 text-sm shrink-0"
        style={styles.outfitFont}
      >
        Showing {employees.length} of{" "}
        {employeesWithCapacity.length} employees
      </div>
    </div>
  );
}