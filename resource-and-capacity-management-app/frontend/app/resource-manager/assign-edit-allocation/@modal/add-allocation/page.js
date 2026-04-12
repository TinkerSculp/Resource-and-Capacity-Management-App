"use client";
 
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
 
const btnClass = `
  px-4 py-2 rounded text-sm border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  w-full sm:w-auto
`;
 
function SearchableStyledDropdown({ label, value, onChange, options, valueKey, displayKey }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const selectedLabel = options.find(o => String(o[valueKey]) === String(value))?.[displayKey] || "";
  const filtered = options.filter(opt => opt[displayKey].toLowerCase().includes(search.toLowerCase()));
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1">{label}</label>
      <div role="button" tabIndex={0} aria-haspopup="listbox" aria-expanded={open} onKeyDown={e => e.key === "Enter" && setOpen(!open)} className="bg-white text-black border border-gray-500 p-2 cursor-pointer flex justify-between items-center hover:bg-[#017ACB]/20 transition" onClick={() => setOpen(!open)}>
        <span className="truncate">{selectedLabel || `Select ${label}`}</span>
        <svg className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div role="listbox" className="absolute top-full left-0 w-full bg-white border border-gray-500 rounded shadow-lg z-50 mt-1">
          <input type="text" placeholder={`Search ${label}...`} value={search} onChange={e => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ""))} className="p-2 border-b border-gray-300 w-full text-black bg-white focus:outline-none focus:bg-[#017ACB]/10" aria-label={`Search ${label}`} />
          <div className="max-h-60 overflow-y-auto" role="group">
            {filtered.length === 0 && <div className="p-2 text-sm text-gray-400">No results</div>}
            {filtered.map(opt => (
              <div key={opt[valueKey]} role="option" aria-selected={String(opt[valueKey]) === String(value)} className={`p-2 cursor-pointer text-sm text-black transition hover:bg-[#017ACB]/20 ${String(opt[valueKey]) === String(value) ? "bg-[#017ACB]/10 font-medium" : ""}`}
                onClick={() => {
                  const raw = opt[valueKey];
                  onChange(typeof raw === 'number' || (raw !== null && !isNaN(Number(raw)) && raw !== '') ? Number(raw) : raw);
                  setOpen(false); setSearch("");
                }}
              >
                {opt[displayKey]}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
 
function ReadOnlyField({ label, value }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-black mb-1">{label}</label>
      <div className="bg-gray-200 text-black border border-gray-500 p-2">{value || "—"}</div>
    </div>
  );
}
 
export default function AddAllocationModal() {
  const router = useRouter();
  const [projects, setProjects]     = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [selectedProject, setSelectedProject]   = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [assignmentData, setAssignmentData]     = useState(null);
  const [employeeData, setEmployeeData]         = useState(null);
  const [managerName, setManagerName]           = useState("");
  const [departmentName, setDepartmentName]     = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
 
  useEffect(() => {
    async function load() {
      try {
        const [projRes, empRes] = await Promise.all([
          api.get('/assignments-allocations/projects'),
          api.get('/assignments-allocations/employees/dm'),
        ]);
        setProjects(projRes.data?.projects  || []);
        setEmployees(empRes.data?.employees || []);
      } catch { setError("Failed to load dropdown data. Please check your connection."); }
    }
    load();
  }, []);
 
  useEffect(() => {
    if (!selectedProject) return;
    async function loadAssignment() {
      try {
        const res = await api.get(`/assignments-allocations/projects?project=${encodeURIComponent(selectedProject)}`);
        setAssignmentData(res.data?.assignment || null);
      } catch { setAssignmentData(null); }
    }
    loadAssignment();
  }, [selectedProject]);
 
  useEffect(() => {
    if (!selectedEmployee) return;
    async function loadEmployee() {
      try {
        const res = await api.get(`/assignments-allocations/employee/${selectedEmployee}`);
        setEmployeeData(res.data?.employee || null);
        setDepartmentName(res.data?.department_name || "");
        if (res.data?.employee?.reports_to) {
          const mgrRes = await api.get(`/assignments-allocations/employee/${res.data.employee.reports_to}`);
          setManagerName(mgrRes.data?.employee?.emp_name || "");
        } else { setManagerName(""); }
      } catch { setEmployeeData(null); setManagerName(""); setDepartmentName(""); }
    }
    loadEmployee();
  }, [selectedEmployee]);
 
  async function handleSave() {
    if (!selectedProject || !selectedEmployee) {
      setError("Please select both a project and an employee."); return;
    }
    try {
      const dupRes = await api.get(`/assignments-allocations?emp_id=${encodeURIComponent(selectedEmployee)}&project=${encodeURIComponent(selectedProject)}`);
      const alreadyExists = (dupRes.data?.allAssignments || []).some(r =>
        String(r.employee?.emp_id) === String(selectedEmployee) && r.assignment?.project_name === selectedProject
      );
      if (alreadyExists) { setError("This employee is already assigned to this project."); return; }
    } catch { /* non-fatal */ }
 
    setLoading(true); setError("");
    try {
      const res = await api.post('/assignments-allocations', { emp_id: Number(selectedEmployee), project: selectedProject, date: null, amount: null });
      if (!res.data) { setError("Failed to save allocation. Please try again."); return; }
      setSuccess(true);
      setTimeout(() => {
        router.back();
        setTimeout(() => router.replace(`/resource-manager/assign-edit-allocation?refresh=${Date.now()}`), 120);
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save allocation. Please try again.");
    } finally { setLoading(false); }
  }
 
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
 
        {/* HEADER — title on the left, X exit button on the right */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold font-[Outfit] text-black">Add Allocation</h2>
          <button type="button" onClick={() => router.back()} disabled={loading} aria-label="Close" className="text-gray-500 hover:text-black transition text-2xl font-bold leading-none px-2 py-1 rounded hover:bg-gray-100">
            ×
          </button>
        </div>
 
        {error   && <div role="alert"  className="mb-4 p-3 bg-red-100   text-red-700   rounded border border-red-300   text-sm">{error}</div>}
        {success && <div role="status" className="mb-4 p-3 bg-green-100 text-green-800 rounded border border-green-400 text-sm flex items-center gap-2"><svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 11 8 15 16 6" /></svg>Allocation added successfully.</div>}
 
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SearchableStyledDropdown label="Project"  value={selectedProject}  onChange={val => { setSelectedProject(val);  setAssignmentData(null); }}  options={projects}   valueKey="project_name" displayKey="project_name" />
          <SearchableStyledDropdown label="Employee" value={selectedEmployee} onChange={val => { setSelectedEmployee(val); setEmployeeData(null); setManagerName(""); setDepartmentName(""); }} options={employees} valueKey="emp_id" displayKey="emp_name" />
          <ReadOnlyField label="Resource Name"      value={employeeData?.emp_name} />
          <ReadOnlyField label="Department"         value={departmentName} />
          <ReadOnlyField label="Reports To"         value={managerName} />
          <ReadOnlyField label="Activity Category"  value={assignmentData?.category} />
          <ReadOnlyField label="Leader Accountable" value={assignmentData?.leader} />
          <ReadOnlyField label="Requestor"          value={assignmentData?.requestor} />
          <ReadOnlyField label="Requestor VP"       value={assignmentData?.requestor_vp} />
          <ReadOnlyField label="Requesting Dept"    value={assignmentData?.requesting_dept} />
        </div>
 
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6">
          <button type="button" onClick={() => router.back()} className={`${btnClass} bg-[#003A5C] text-white`}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={loading} aria-disabled={loading} className={`${btnClass} bg-[#017ACB] text-white disabled:opacity-50 disabled:cursor-not-allowed`}>
            {loading ? "Saving..." : "Save Allocation"}
          </button>
        </div>
      </div>
    </div>
  );
}