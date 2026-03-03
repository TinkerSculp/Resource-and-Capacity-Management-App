'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

function sanitize(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/script|onerror|onload|javascript:/gi, '')
    .trim();
}

function formatMonth(yyyymm) {
  const str = String(yyyymm);
  const year = str.slice(0, 4);
  const month = parseInt(str.slice(4, 6), 10);
  const date = new Date(year, month - 1);

  return (
    date.toLocaleString('default', { month: 'short' }) +
    '-' +
    year.slice(2)
  );
}

export default function TeamMemberAssignments() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const [allRows, setAllRows] = useState([]);
  const [filteredAllRows, setFilteredAllRows] = useState([]);
  const [myRows, setMyRows] = useState([]);
  const [months, setMonths] = useState([]);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (!stored || !token) {
        localStorage.clear();
        router.push('/login');
        return;
      }

      setUser(JSON.parse(stored));
    } catch {
      router.push('/login');
    }
  }, [router]);

  /* ---------------- FETCH ---------------- */
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const res = await fetch(
          `http://localhost:3001/api/assignments-allocations?username=${encodeURIComponent(
            user.username
          )}`
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
            allocations: r.allocations || {}
          }));

        const mappedAll = mapRows(data.allAssignments || []);
        const mappedMine = mapRows(data.myAssignments || []);

        setAllRows(mappedAll);
        setMyRows(mappedMine);

        /* ---------------- CORRECT FILTER LOGIC ---------------- */

        if (!mappedMine.length) {
          setFilteredAllRows([]);
          return;
        }

        // Collect ALL unique activity+category combinations user belongs to
        const userActivityPairs = new Set(
          mappedMine.map(
            (row) => `${row.activity}||${row.category}`
          )
        );

        // Filter ALL rows that match ANY of those combinations
        const matched = mappedAll.filter((row) =>
          userActivityPairs.has(`${row.activity}||${row.category}`)
        );

        setFilteredAllRows(matched);

      } catch (err) {
        console.error('Fetch error:', err);
      }
    }

    fetchData();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-[#017ACB] rounded-full"></div>
      </div>
    );
  }

  const rows = activeTab === 'mine' ? myRows : filteredAllRows;

  return (
    <>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">

        <div className="flex items-center gap-4">
          <h2
            className="text-4xl font-bold text-gray-900"
            style={styles.outfitFont}
          >
            Assignments
          </h2>

          <button
            onClick={() => router.push('/team-member/dashboard')}
            className="px-4 py-2 rounded text-sm bg-white text-gray-700 border hover:bg-[#017ACB]/20 transition"
            style={styles.outfitFont}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded text-sm transition ${
              activeTab === 'all'
                ? 'bg-[#017ACB] text-white'
                : 'bg-white text-gray-700 border hover:bg-[#017ACB]/20'
            }`}
            style={styles.outfitFont}
          >
            All Assignments
          </button>

          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 rounded text-sm transition ${
              activeTab === 'mine'
                ? 'bg-[#017ACB] text-white'
                : 'bg-white text-gray-700 border hover:bg-[#017ACB]/20'
            }`}
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
                <th className="px-4 py-2 border text-sm whitespace-nowrap">Resource Name</th>
                <th className="px-4 py-2 border text-sm whitespace-nowrap">Department</th>
                <th className="px-4 py-2 border text-sm whitespace-nowrap">Reports To</th>
                <th className="px-4 py-2 border text-sm whitespace-nowrap">Activity</th>
                <th className="px-4 py-2 border text-sm whitespace-nowrap">Activity Category</th>
                <th className="px-4 py-2 border text-sm whitespace-nowrap">Leader Accountable</th>
                <th className="px-4 py-2 border text-sm whitespace-nowrap">Requestor</th>
                <th className="px-4 py-2 border text-sm whitespace-nowrap">Requestor VP</th>
                <th className="px-4 py-2 border text-sm whitespace-nowrap">Requesting Dept</th>

                {months.map((m) => (
                  <th key={m} className="px-4 py-2 border text-sm whitespace-nowrap">
                    {formatMonth(m)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className={`hover:bg-[#017ACB]/20 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-2 border text-sm">{row.resource_name}</td>
                  <td className="px-4 py-2 border text-sm">{row.department}</td>
                  <td className="px-4 py-2 border text-sm">{row.reports_to}</td>
                  <td className="px-4 py-2 border text-sm">{row.activity}</td>
                  <td className="px-4 py-2 border text-sm">{row.category}</td>
                  <td className="px-4 py-2 border text-sm">{row.leader}</td>
                  <td className="px-4 py-2 border text-sm">{row.requestor}</td>
                  <td className="px-4 py-2 border text-sm">{row.requestor_vp}</td>
                  <td className="px-4 py-2 border text-sm">{row.requesting_dept}</td>

                  {months.map((m) => (
                    <td key={m} className="px-4 py-2 border text-sm text-center">
                      {row.allocations[m] ?? ''}
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
