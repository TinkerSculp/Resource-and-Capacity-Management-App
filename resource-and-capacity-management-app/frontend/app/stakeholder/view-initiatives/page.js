'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

// Strict sanitization
function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/script|onerror|onload|javascript:/gi, '')
    .trim();
}

// Validate user object
function isValidUser(user) {
  return user && typeof user.username === 'string' && user.username.trim();
}

// Validate initiative object
function isValidInitiative(item) {
  return item && item._id;
}

export default function InitiativesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refresh = searchParams.get('refresh');

  // User + view state
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  // Initiatives
  const [initiatives, setInitiatives] = useState([]);
  const [mine, setMine] = useState([]);
  const [filteredInitiatives, setFilteredInitiatives] = useState([]);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedVPs, setSelectedVPs] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectedRequestors, setSelectedRequestors] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);

  // Sorting
  const [projectSort, setProjectSort] = useState('');
  const [showProjectSortMenu, setShowProjectSortMenu] = useState(false);

  // Dropdown visibility
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showVPMenu, setShowVPMenu] = useState(false);
  const [showDeptMenu, setShowDeptMenu] = useState(false);
  const [showLeadMenu, setShowLeadMenu] = useState(false);
  const [showRequestorMenu, setShowRequestorMenu] = useState(false);

  // Dropdown positioning
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Available filter values
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [availableVPs, setAvailableVPs] = useState([]);
  const [availableDepts, setAvailableDepts] = useState([]);
  const [availableLeads, setAvailableLeads] = useState([]);
  const [availableRequestors, setAvailableRequestors] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);

  // Load user
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return router.push('/resource-and-capacity-management-app/frontend/app/login');

      const parsed = JSON.parse(raw);
      if (!isValidUser(parsed)) return router.push('/resource-and-capacity-management-app/frontend/app/login');

      setUser(parsed);
    } catch {
      router.push('/resource-and-capacity-management-app/frontend/app/login');
    }
  }, [router]);

  // Fetch initiatives
  useEffect(() => {
    if (!user) return;

    let aborted = false;

    async function fetchInitiatives() {
      try {
        const url = `http://localhost:3001/api/initiatives?username=${encodeURIComponent(
          user.username
        )}&ts=${Date.now()}`;

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0'
          }
        });

        if (!res.ok) return;

        const data = await res.json();
        if (!data) return;

        const safeMap = (items) =>
          Array.isArray(items)
            ? items
                .filter(isValidInitiative)
                .map((item) => ({
                  id: sanitizeText(String(item._id)),
                  project: sanitizeText(item.project_name),
                  category: sanitizeText(item.category),
                  lead: sanitizeText(item.leader),
                  status: sanitizeText(item.status),
                  requestor: sanitizeText(item.requestor),
                  requestor_vp: sanitizeText(item.requestor_vp),
                  requesting_dept: sanitizeText(item.requesting_dept),
                  completion_date: item.completion_date || null,
                  target_period: sanitizeText(item.target_period),
                  description: sanitizeText(item.description),
                  resource_consideration: sanitizeText(item.resource_notes)
                }))
            : [];

        const mappedAll = safeMap(data.allAssignments || []);
        const mappedMine = safeMap(data.myInitiatives || []);

        if (aborted) return;

        setInitiatives(mappedAll);
        setMine(mappedMine);
        setFilteredInitiatives(mappedAll);

        setAvailableCategories([...new Set(mappedAll.map(i => i.category).filter(Boolean))]);
        setAvailableStatuses([...new Set(mappedAll.map(i => i.status).filter(Boolean))]);
        setAvailableVPs([...new Set(mappedAll.map(i => i.requestor_vp).filter(Boolean))]);
        setAvailableDepts([...new Set(mappedAll.map(i => i.requesting_dept).filter(Boolean))]);
        setAvailableLeads([...new Set(mappedAll.map(i => i.lead).filter(Boolean))]);
        setAvailableRequestors([...new Set(mappedAll.map(i => i.requestor).filter(Boolean))]);
        setAvailableProjects([...new Set(mappedAll.map(i => i.project).filter(Boolean))]);
      } catch (err) {
        console.error('Fetch error:', err);
      }
    }

    fetchInitiatives();
    return () => (aborted = true);
  }, [user, refresh]);

  // Apply filters + sorting
  useEffect(() => {
    if (!user) return;

    const base =
      activeTab === 'mine'
        ? mine
        : activeTab === 'completed'
        ? initiatives.filter(i => i.status === 'Completed')
        : initiatives.filter(i => i.status !== 'Completed');

    let filtered = base.filter((i) =>
      (selectedCategories.length ? selectedCategories.includes(i.category) : true) &&
      (selectedStatuses.length ? selectedStatuses.includes(i.status) : true) &&
      (selectedVPs.length ? selectedVPs.includes(i.requestor_vp) : true) &&
      (selectedDepts.length ? selectedDepts.includes(i.requesting_dept) : true) &&
      (selectedLeads.length ? selectedLeads.includes(i.lead) : true) &&
      (selectedRequestors.length ? selectedRequestors.includes(i.requestor) : true) &&
      (selectedProjects.length ? selectedProjects.includes(i.project) : true)
    );

    if (projectSort === 'asc') filtered = [...filtered].sort((a, b) => a.project.localeCompare(b.project));
    if (projectSort === 'desc') filtered = [...filtered].sort((a, b) => b.project.localeCompare(a.project));

    setFilteredInitiatives(filtered);
  }, [
    activeTab,
    initiatives,
    mine,
    user,
    selectedCategories,
    selectedStatuses,
    selectedVPs,
    selectedDepts,
    selectedLeads,
    selectedRequestors,
    selectedProjects,
    projectSort
  ]);

  // Toggle helper
  const toggleSelection = (value, setFn, current) => {
    if (!value) return;
    setFn(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  // Close dropdowns
  useEffect(() => {
    const closeAll = () => {
      setShowCategoryMenu(false);
      setShowStatusMenu(false);
      setShowVPMenu(false);
      setShowDeptMenu(false);
      setShowLeadMenu(false);
      setShowProjectSortMenu(false);
      setShowRequestorMenu(false);
    };
    window.addEventListener('click', closeAll);
    return () => window.removeEventListener('click', closeAll);
  }, []);


  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-4xl font-bold text-gray-900" style={styles.outfitFont}>
            Initiatives
          </h2>

          <button
            onClick={() => router.push('/resource-manager/dashboard')}
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
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20'
                : 'bg-white text-gray-700 border hover:bg-[#017ACB]/20'
            }`}
            style={styles.outfitFont}
          >
            All Initiatives
          </button>

          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 rounded text-sm transition ${
              activeTab === 'mine'
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20'
                : 'bg-white text-gray-700 border hover:bg-[#017ACB]/20'
            }`}
            style={styles.outfitFont}
          >
            My Initiatives
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded text-sm transition ${
              activeTab === 'completed'
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20'
                : 'bg-white text-gray-700 border hover:bg-[#017ACB]/20'
            }`}
            style={styles.outfitFont}
          >
            Completed
          </button>

        
        </div>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-max w-full border-collapse">
            <thead className="bg-[#017ACB] text-white sticky top-0 z-10">
              <tr>

             

                {/* PROJECT */}
                <th
                  className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Project</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.target.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowProjectSortMenu(prev => !prev);
                        setShowCategoryMenu(false);
                        setShowStatusMenu(false);
                        setShowVPMenu(false);
                        setShowDeptMenu(false);
                        setShowLeadMenu(false);
                        setShowRequestorMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition"
                    >
                      ▼
                    </button>
                  </div>

                  {showProjectSortMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-56 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500">
                        Sort by project
                      </div>

                     

                      <div
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                          projectSort === 'asc' ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setProjectSort('asc')}
                      >
                        A → Z
                      </div>

                      <div
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                          projectSort === 'desc' ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setProjectSort('desc')}
                      >
                        Z → A
                      </div>

                      <div className="border-t mt-1 pt-1 px-3 py-2 text-xs font-semibold text-gray-500">
                        Filter by project
                      </div>

                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                          selectedProjects.length === 0 ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setSelectedProjects([])}
                      >
                        <input type="checkbox" checked={selectedProjects.length === 0} readOnly />
                        All
                      </div>

                      {availableProjects.map((proj) => (
                        <div
                          key={proj}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                            selectedProjects.includes(proj) ? 'bg-gray-100 font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(proj, setSelectedProjects, selectedProjects)
                          }
                        >
                          <input type="checkbox" checked={selectedProjects.includes(proj)} readOnly />
                          {proj}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* CATEGORY */}
                <th
                  className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Category</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.target.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowCategoryMenu(prev => !prev);
                        setShowStatusMenu(false);
                        setShowVPMenu(false);
                        setShowDeptMenu(false);
                        setShowLeadMenu(false);
                        setShowProjectSortMenu(false);
                        setShowRequestorMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition"
                    >
                      ▼
                    </button>
                  </div>

                  {showCategoryMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                          selectedCategories.length === 0 ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setSelectedCategories([])}
                      >
                        <input type="checkbox" checked={selectedCategories.length === 0} readOnly />
                        All
                      </div>

                      {availableCategories.map((cat) => (
                        <div
                          key={cat}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                            selectedCategories.includes(cat) ? 'bg-gray-100 font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(cat, setSelectedCategories, selectedCategories)
                          }
                        >
                          <input type="checkbox" checked={selectedCategories.includes(cat)} readOnly />
                          {cat}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* LEADER */}
                <th
                  className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                  style={styles.outfitFont}
                >
                <div className="flex justify-between items-center">
                  <span>Leader Accountable</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.target.getBoundingClientRect();
                      setMenuPosition({ x: rect.left, y: rect.bottom });

                      setShowLeadMenu(prev => !prev);
                      setShowCategoryMenu(false);
                      setShowStatusMenu(false);
                      setShowVPMenu(false);
                      setShowDeptMenu(false);
                      setShowProjectSortMenu(false);
                      setShowRequestorMenu(false);
                    }}
                    className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition"
                  >
                    ▼
                  </button>
                </div>

                  {showLeadMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                          selectedLeads.length === 0 ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setSelectedLeads([])}
                      >
                        <input type="checkbox" checked={selectedLeads.length === 0} readOnly />
                        All
                      </div>

                      {availableLeads.map((lead) => (
                        <div
                          key={lead}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                            selectedLeads.includes(lead) ? 'bg-gray-100 font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(lead, setSelectedLeads, selectedLeads)
                          }
                        >
                          <input type="checkbox" checked={selectedLeads.includes(lead)} readOnly />
                          {lead}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* STATUS */}
                <th
                  className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Status</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.target.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowStatusMenu(prev => !prev);
                        setShowCategoryMenu(false);
                        setShowVPMenu(false);
                        setShowDeptMenu(false);
                        setShowLeadMenu(false);
                        setShowProjectSortMenu(false);
                        setShowRequestorMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition"
                    >
                      ▼
                    </button>
                  </div>

                  {showStatusMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                          selectedStatuses.length === 0 ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setSelectedStatuses([])}
                      >
                        <input type="checkbox" checked={selectedStatuses.length === 0} readOnly />
                        All
                      </div>

                      {availableStatuses.map((status) => (
                        <div
                          key={status}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                            selectedStatuses.includes(status) ? 'bg-gray-100 font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(status, setSelectedStatuses, selectedStatuses)
                          }
                        >
                          <input type="checkbox" checked={selectedStatuses.includes(status)} readOnly />
                          {status}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* REQUESTOR */}
                <th
                  className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Requestor</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.target.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowRequestorMenu(prev => !prev);
                        setShowCategoryMenu(false);
                        setShowStatusMenu(false);
                        setShowVPMenu(false);
                        setShowDeptMenu(false);
                        setShowLeadMenu(false);
                        setShowProjectSortMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#017ACB]/20 transition"
                    >
                      ▼
                    </button>
                  </div>

                  {showRequestorMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                          selectedRequestors.length === 0 ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setSelectedRequestors([])}
                      >
                        <input type="checkbox" checked={selectedRequestors.length === 0} readOnly />
                        All
                      </div>

                      {availableRequestors.map((req) => (
                        <div
                          key={req}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                            selectedRequestors.includes(req) ? 'bg-gray-100 font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(req, setSelectedRequestors, selectedRequestors)
                          }
                        >
                          <input type="checkbox" checked={selectedRequestors.includes(req)} readOnly />
                          {req}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* REQUESTOR VP */}
                <th
                  className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Requestor VP</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.target.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowVPMenu(prev => !prev);
                        setShowCategoryMenu(false);
                        setShowStatusMenu(false);
                        setShowDeptMenu(false);
                        setShowLeadMenu(false);
                        setShowProjectSortMenu(false);
                        setShowRequestorMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#017ACB]/20 transition"
                    >
                      ▼
                    </button>
                  </div>

                  {showVPMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                          selectedVPs.length === 0 ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setSelectedVPs([])}
                      >
                        <input type="checkbox" checked={selectedVPs.length === 0} readOnly />
                        All
                      </div>

                      {availableVPs.map((vp) => (
                        <div
                          key={vp}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                            selectedVPs.includes(vp) ? 'bg-gray-100 font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(vp, setSelectedVPs, selectedVPs)
                          }
                        >
                          <input type="checkbox" checked={selectedVPs.includes(vp)} readOnly />
                          {vp}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* REQUESTING DEPT */}
                <th
                  className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Requesting Dept</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.target.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });
                        setShowDeptMenu(prev => !prev);
                        setShowCategoryMenu(false);
                        setShowStatusMenu(false);
                        setShowVPMenu(false);
                        setShowLeadMenu(false);
                        setShowProjectSortMenu(false);
                        setShowRequestorMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#017ACB]/20 transition"
                    >
                      ▼
                    </button>
                  </div>

                  {showDeptMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                          selectedDepts.length === 0 ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setSelectedDepts([])}
                      >
                        <input type="checkbox" checked={selectedDepts.length === 0} readOnly />
                        All
                      </div>

                      {availableDepts.map((dept) => (
                        <div
                          key={dept}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
                            selectedDepts.includes(dept) ? 'bg-gray-100 font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(dept, setSelectedDepts, selectedDepts)
                          }
                        >
                          <input type="checkbox" checked={selectedDepts.includes(dept)} readOnly />
                          {dept}
                        </div>
                      ))}
                    </div>
                  )}
                </th>

                {/* COMPLETION DATE */}
                <th
                  className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  Completion Date
                </th>

                {/* TARGET PERIOD */}
                <th
                  className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  Target Period
                </th>

                {/* DESCRIPTION */}
                <th
                  className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  Description
                </th>

                {/* RESOURCE NOTES */}
                <th
                  className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  Resource Consideration
                </th>

              </tr>
            </thead>

            {/* BODY */}
            <tbody>
              {filteredInitiatives.map((item, index) => (
                <tr
                  key={item.id}
                  className={`hover:bg-[#017ACB]/20 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  

                  {/* NORMAL SCROLLING COLUMNS */}
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.project}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.category}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.lead}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.status}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.requestor}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.requestor_vp}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.requesting_dept}</td>

                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
                    {item.completion_date
                      ? new Date(item.completion_date).toLocaleDateString()
                      : ''}
                  </td>

                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.target_period}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.description}</td>
                  <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
                    {item.resource_consideration}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>
    </>
  );
}