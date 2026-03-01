//here is the assignment view people thing for team member
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const styles = {
  outfitFont: { fontFamily: "Outfit, sans-serif" }
};

function formatMonth(yyyymm) {
  const year = yyyymm.substring(0, 4);
  const month = yyyymm.substring(4, 6);
  const date = new Date(`${year}-${month}-01`);
  return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

export default function TeamMemberAssignments() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [allAssignments, setAllAssignments] = useState([]);
  const [mineAssignments, setMineAssignments] = useState([]);
  const [months, setMonths] = useState([]);
  const [activeTab, setActiveTab] = useState("mine");

  // Auth Guard
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  // Fetch data
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const res = await fetch(
          `http://localhost:3001/api/assignments-allocations?username=${encodeURIComponent(
            user.username
          )}`
        );

        const data = await res.json();

        setAllAssignments(data.allAssignments || []);
        setMineAssignments(data.myAssignments || []);
        setMonths(data.months || []);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    }

    fetchData();
  }, [user]);

  const rows =
    activeTab === "mine" ? mineAssignments : allAssignments;

  return (
    <div className="max-w-9xl mx-auto bg-white mt-0 border border-white">

    {/* TITLE SECTION */}
    <div className="flex justify-between items-center px-6 py-4">

      <div className="flex items-center gap-9">
        <button
          onClick={() => router.push("/team-member/dashboard")}
          className="text-gray-700 text-lg"
        >
          ← 
        </button>

        <h2
          className="absolute left-1/2 transform -translate-x-1/2 text-4xl font-semibold text-gray-800"
          style={styles.outfitFont}
        >
          Current Assignments
        </h2>
      </div>
   

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-5 py-1.5 text-sm rounded-md border font-medium transition ${
              activeTab === "all"
                ? "bg-[#017ACB] text-white border-[#017ACB]"
                : "bg-gray-200 text-black border-gray-400 hover:bg-gray-300"
            }`}
          >
            All
           </button>
          

          <button
            onClick={() => setActiveTab("mine")}
            className={`px-4 py-1 text-sm rounded-md border font-medium transition ${
              activeTab === "mine"
                ? "bg-[#017ACB] text-white border-[#017ACB]"
                : "bg-gray-200 text-black border-gray-400 hover:bg-gray-300"
            }`}
          >
            Mine
          </button>
        </div>
      </div>

      <div className="border-t-2 border-gray-900 w-full"></div> <br></br>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">

          <thead className="bg-gray-200">

            {/* FIRST HEADER ROW */}
            <tr>

              <th className="border px-3 py-2 bg-[#CDE6F7] whitespace-nowrap">Resource Name</th>
              <th className="border px-3 py-2 border text-sm text-black whitespace-nowrap">Department</th>
              <th className="border px-3 py-2 border text-sm text-black whitespace-nowrap">Reports To</th>
              <th className="border px-3 py-2 bg-[#CDE6F7] whitespace-nowrap">Activity</th>
              <th className="border px-3 py-2 border text-sm text-black whitespace-nowrap">Activity Category</th>
              <th className="border px-3 py-2 border text-sm text-black whitespace-nowrap">Leader Accountable</th>
              <th className="border px-3 py-2 border text-sm text-black whitespace-nowrap">Requestor</th>
              <th className="border px-3 py-2 border text-sm text-black whitespace-nowrap">Requestor VP</th>
              <th className="border px-3 py-2 border text-sm text-black whitespace-nowrap">Requesting Department</th>

              {/* Empty cell to align months row */}
              {months.map((m, i) => (
                <th key={i} className="border px-3 py-2 text-sm whitespace-nowrap text-center">
                  {formatMonth(m)}
                </th>
              ))}
            </tr>

          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="hover:bg-blue-50">

                <td className="border px-2 py-1">
                  {row.employee.emp_name}
                </td>

                <td className="border px-2 py-1">
                  {row.employee.dept_name}
                </td>

                <td className="border px-2 py-1">
                  {row.employee.manager_name}
                </td>

                <td className="border px-2 py-1">
                  {row.assignment.project_name}
                </td>

                <td className="border px-2 py-1">
                  {row.assignment.category}
                </td>

                <td className="border px-2 py-1">
                  {row.assignment.leader}
                </td>

                <td className="border px-2 py-1">
                  {row.assignment.requestor}
                </td>

                <td className="border px-2 py-1">
                  {row.assignment.requestor_vp}
                </td>

                <td className="border px-2 py-1">
                  {row.assignment.requesting_dept_name}
                </td>

                {months.map((m) => (
                  <td key={m} className="border px-4 py-2 text-center">
                    {row.allocations?.[m] ?? ""}
                  </td>
                ))}

              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={9 + months.length} className="text-center py-6">
                  No assignments found
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>
    </div>
  );
}
