'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

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

  const visibleStatuses =
    activeTab === "completed"
      ? ["Completed"]
      : activeTab === "cancelled"
      ? ["Cancelled"]
      : availableStatuses.filter(
          (s) => s !== "Completed" && s !== "Cancelled"
        );

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

  // SECURE INITIATIVES FETCH (ONLY THIS SECTION WAS MODIFIED)
  useEffect(() => {
    if (!user) return;

    let aborted = false;

    async function fetchInitiatives() {
      try {
        const params = {};

        if (activeTab === 'completed') params.status = 'Completed';
        else if (activeTab === 'cancelled') params.status = 'Cancelled';

        
        const res = await api.get('/initiatives', { 
          params: { 
            ...params,
            username: user.username  
          }
        });

        if (!res?.data || aborted) return;

        const data = res.data;

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

        const sourceAll =
          data.allAssignments || data.completed || data.cancelled || [];

        const mappedAll = safeMap(sourceAll);
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
}, [user, refresh, activeTab]);

  // Apply filters + sorting
  useEffect(() => {
    if (!user) return;

const base =
  activeTab === 'mine'
    ? mine
    : activeTab === 'completed'
    ? initiatives.filter(i => i.status === 'Completed')
    : activeTab === 'cancelled'
    ? initiatives.filter(i => i.status === 'Cancelled')
    : initiatives.filter(i => i.status !== 'Completed' && i.status !== 'Cancelled');

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



  // Reusable checkbox
  const Checkbox = ({ checked }) => (
  <span
    className="
      w-4 h-4
      border border-black rounded-sm
      flex items-center justify-center
      transition relative overflow-hidden
      flex-shrink-0
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
        <span className="absolute inset-0" style={{ backgroundColor: '#003A5C' }}></span>
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

  // Navigation
  const handleAddInitiative = () => {
    router.push('/resource-manager/create-edit-initiatives/add-initiative');
  };

  const handleEditInitiative = (id) => {
    router.push(`/resource-manager/create-edit-initiatives/edit-initiative?id=${encodeURIComponent(id)}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

return (
  <>
    {/* --------------------------------------------------------------------
       HEADER SECTION
       --------------------------------------------------------------------
       SECURITY NOTES:
       • No sensitive data displayed here.
       • Navigation actions do not expose user identity.
       • All protected data is fetched securely elsewhere (via JWT API calls).
       -------------------------------------------------------------------- */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <h2 className="text-4xl font-bold text-gray-900" style={styles.outfitFont}>
          Initiatives
        </h2>

        {/* Back navigation (safe — no sensitive state passed) */}
        <button
          onClick={() => router.push('/resource-manager/dashboard')}
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

      {/* --------------------------------------------------------------------
         TAB CONTROLS
         --------------------------------------------------------------------
         SECURITY NOTES:
         • These tabs only toggle client‑side filters.
         • No sensitive data is stored or transmitted.
         • All protected data is fetched securely via JWT API calls.
         -------------------------------------------------------------------- */}
      <div className="flex items-center gap-3">

        {/* ALL INITIATIVES */}
        <button
          onClick={() => setActiveTab('all')}
          className={`
            px-4 py-2 rounded text-sm transition-colors
            ${
              activeTab === 'all'
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                : 'bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20'
            }
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
          `}
          style={styles.outfitFont}
        >
          All Initiatives
        </button>

        {/* MY INITIATIVES */}
        <button
          onClick={() => setActiveTab('mine')}
          className={`
            px-4 py-2 rounded text-sm transition-colors
            ${
              activeTab === 'mine'
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                : 'bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20'
            }
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
          `}
          style={styles.outfitFont}
        >
          My Initiatives
        </button>

        {/* COMPLETED */}
        <button
          onClick={() => setActiveTab('completed')}
          className={`
            px-4 py-2 rounded text-sm transition-colors
            ${
              activeTab === 'completed'
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                : 'bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20'
            }
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
          `}
          style={styles.outfitFont}
        >
          Completed
        </button>

        {/* CANCELLED */}
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`
            px-4 py-2 rounded text-sm transition-colors
            ${
              activeTab === 'cancelled'
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                : 'bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20'
            }
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
          `}
          style={styles.outfitFont}
        >
          Cancelled
        </button>

        {/* ADD INITIATIVE (secure — navigation only) */}
        <button
          onClick={handleAddInitiative}
          className="
            px-4 py-2 rounded text-sm
            bg-gray-200 text-gray-700 border
            hover:bg-[#017ACB]/20 transition-colors
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
          "
          style={styles.outfitFont}
        >
          + Add Initiative
        </button>

      </div>
    </div>

    {/* --------------------------------------------------------------------
       INITIATIVES TABLE
       --------------------------------------------------------------------
       SECURITY NOTES:
       • All data shown here has already been sanitized.
       • No raw backend values are rendered without cleaning.
       • No sensitive identifiers (tokens, roles, emails) are displayed.
       • Edit buttons only navigate — actual editing is protected by JWT.
       -------------------------------------------------------------------- */}
    <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
        <table className="min-w-max w-full border-collapse">
          <thead className="bg-[#017ACB] text-white">
            <tr className="sticky top-0 z-[100] bg-[#017ACB]">

            {/* EDIT HEADER — sticky, blue preserved */}
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

              {/* PROJECT COLUMN (sorting + filtering only) */}
              <th
                className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                style={styles.outfitFont}
              >
                <div className="flex justify-between items-center">
                  <span>Project</span>

                  {/* Sorting button — UI only, no security impact */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.target.getBoundingClientRect();
                      setMenuPosition({ x: rect.left, y: rect.bottom });
                      setShowProjectSortMenu(prev => !prev);

                      // Close other menus
                      setShowCategoryMenu(false);
                      setShowStatusMenu(false);
                      setShowVPMenu(false);
                      setShowDeptMenu(false);
                      setShowLeadMenu(false);
                      setShowRequestorMenu(false);
                    }}
                    className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
                  >
                    ▼
                  </button>
                </div>

                {/* Sort menu — UI only */}
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
                      className="px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2"
                      onClick={() => setProjectSort(prev => (prev === 'asc' ? null : 'asc'))}
                    >
                      <Checkbox checked={projectSort === 'asc'} />
                      A → Z
                    </div>

                    <div
                      className="px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2"
                      onClick={() => setProjectSort(prev => (prev === 'desc' ? null : 'desc'))}
                    >
                      <Checkbox checked={projectSort === 'desc'} />
                      Z → A
                    </div>

                    <div className="border-t mt-1 pt-1 px-3 py-2 text-xs font-semibold text-gray-500">
                      Filter by project
                    </div>

                    <div
                      className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                        selectedProjects.length === 0 ? 'font-semibold' : ''
                      }`}
                      onClick={() => setSelectedProjects([])}
                    >
                      <Checkbox checked={selectedProjects.length === 0} />
                      All
                    </div>

                    {availableProjects.map((proj) => (
                      <div
                        key={proj}
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                          selectedProjects.includes(proj) ? 'font-semibold' : ''
                        }`}
                        onClick={() =>
                          toggleSelection(proj, setSelectedProjects, selectedProjects)
                        }
                      >
                        <Checkbox checked={selectedProjects.includes(proj)} />
                        {proj}
                      </div>
                    ))}
                  </div>
                )}
              </th>

              {/* CATEGORY COLUMN (UI only) */}
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
                    className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
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
                    {/* 
                      SECURITY:
                      • Pure client‑side filtering — no backend calls.
                      • Values displayed here come from sanitized initiative data.
                      • No sensitive identifiers or tokens rendered.
                    */}

                    {/* ALL */}
                    <div
                      className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                        selectedCategories.length === 0 ? 'font-semibold' : ''
                      }`}
                      onClick={() => setSelectedCategories([])}
                    >
                      <Checkbox checked={selectedCategories.length === 0} />
                      All
                    </div>

                    {/* INDIVIDUAL CATEGORIES */}
                    {availableCategories.map((cat) => (
                      <div
                        key={cat}
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                          selectedCategories.includes(cat) ? 'font-semibold' : ''
                        }`}
                        onClick={() =>
                          toggleSelection(cat, setSelectedCategories, selectedCategories)
                        }
                      >
                        <Checkbox checked={selectedCategories.includes(cat)} />
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

                        // SECURITY: UI‑only state toggles — no data exposure
                        setShowLeadMenu(prev => !prev);
                        setShowCategoryMenu(false);
                        setShowStatusMenu(false);
                        setShowVPMenu(false);
                        setShowDeptMenu(false);
                        setShowProjectSortMenu(false);
                        setShowRequestorMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                      shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
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
                      {/* 
                        SECURITY:
                        • All values shown here are sanitized.
                        • No backend calls triggered by menu interaction.
                      */}

                      {/* ALL */}
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                          selectedLeads.length === 0 ? 'font-semibold' : ''
                        }`}
                        onClick={() => setSelectedLeads([])}
                      >
                        <Checkbox checked={selectedLeads.length === 0} />
                        All
                      </div>

                      {/* INDIVIDUAL LEADS */}
                      {availableLeads.map((lead) => (
                        <div
                          key={lead}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                            selectedLeads.includes(lead) ? 'font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(lead, setSelectedLeads, selectedLeads)
                          }
                        >
                          <Checkbox checked={selectedLeads.includes(lead)} />
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

                        // SECURITY: UI‑only toggles, no sensitive data exposed
                        setShowStatusMenu(prev => !prev);
                        setShowCategoryMenu(false);
                        setShowVPMenu(false);
                        setShowDeptMenu(false);
                        setShowLeadMenu(false);
                        setShowProjectSortMenu(false);
                        setShowRequestorMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                      shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
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
                      {/* ALL */}
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                          selectedStatuses.length === 0 ? 'font-semibold' : ''
                        }`}
                        onClick={() => setSelectedStatuses([])}
                      >
                        <Checkbox checked={selectedStatuses.length === 0} />
                        All
                      </div>

                      {/* INDIVIDUAL STATUSES */}
                      {visibleStatuses.map((status) => (
                        <div
                          key={status}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                            selectedStatuses.includes(status) ? 'font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(status, setSelectedStatuses, selectedStatuses)
                          }
                        >
                          <Checkbox checked={selectedStatuses.includes(status)} />
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
                  <div className="flex justify_between items-center">
                    <span>Requestor</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.target.getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom });

                        // SECURITY: UI‑only, no backend interaction
                        setShowRequestorMenu(prev => !prev);
                        setShowCategoryMenu(false);
                        setShowStatusMenu(false);
                        setShowVPMenu(false);
                        setShowDeptMenu(false);
                        setShowLeadMenu(false);
                        setShowProjectSortMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                      shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
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
                      {/* ALL */}
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                          selectedRequestors.length === 0 ? 'font-semibold' : ''
                        }`}
                        onClick={() => setSelectedRequestors([])}
                      >
                        <Checkbox checked={selectedRequestors.length === 0} />
                        All
                      </div>

                      {/* INDIVIDUAL REQUESTORS */}
                      {availableRequestors.map((req) => (
                        <div
                          key={req}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                            selectedRequestors.includes(req) ? 'font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(req, setSelectedRequestors, selectedRequestors)
                          }
                        >
                          <Checkbox checked={selectedRequestors.includes(req)} />
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

                        /* 
                          SECURITY:
                          • UI-only state toggles — no backend calls.
                          • VP values shown here come from sanitized initiative data.
                          • No sensitive identifiers or tokens exposed.
                        */
                        setShowVPMenu(prev => !prev);
                        setShowCategoryMenu(false);
                        setShowStatusMenu(false);
                        setShowDeptMenu(false);
                        setShowLeadMenu(false);
                        setShowProjectSortMenu(false);
                        setShowRequestorMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                      shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
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
                      {/* 
                        SECURITY:
                        • Pure client-side filtering.
                        • All VP names sanitized before rendering.
                      */}

                      {/* ALL */}
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                          selectedVPs.length === 0 ? 'font-semibold' : ''
                        }`}
                        onClick={() => setSelectedVPs([])}
                      >
                        <Checkbox checked={selectedVPs.length === 0} />
                        All
                      </div>

                      {/* INDIVIDUAL VPs */}
                      {availableVPs.map((vp) => (
                        <div
                          key={vp}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                            selectedVPs.includes(vp) ? 'font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(vp, setSelectedVPs, selectedVPs)
                          }
                        >
                          <Checkbox checked={selectedVPs.includes(vp)} />
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

                        /* 
                          SECURITY:
                          • Department values are sanitized backend data.
                          • No sensitive backend identifiers shown.
                        */
                        setShowDeptMenu(prev => !prev);
                        setShowCategoryMenu(false);
                        setShowStatusMenu(false);
                        setShowVPMenu(false);
                        setShowLeadMenu(false);
                        setShowProjectSortMenu(false);
                        setShowRequestorMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition
                      shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]"
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
                      {/* ALL */}
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                          selectedDepts.length === 0 ? 'font-semibold' : ''
                        }`}
                        onClick={() => setSelectedDepts([])}
                      >
                        <Checkbox checked={selectedDepts.length === 0} />
                        All
                      </div>

                      {/* INDIVIDUAL DEPARTMENTS */}
                      {availableDepts.map((dept) => (
                        <div
                          key={dept}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-[#017ACB]/20 flex items-center gap-2 ${
                            selectedDepts.includes(dept) ? 'font-semibold' : ''
                          }`}
                          onClick={() =>
                            toggleSelection(dept, setSelectedDepts, selectedDepts)
                          }
                        >
                          <Checkbox checked={selectedDepts.includes(dept)} />
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
                        <button
                          onClick={() => handleEditInitiative(item.id)}
                          className="
                            px-2 py-1
                            bg-[#017ACB] text-white text-xs rounded
                            hover:bg-[#017ACB]/20 hover:text-gray-700 transition
                            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                          "
                          style={styles.outfitFont}
                        >
                          Edit
                        </button>
                      </td>

                      {/* NORMAL COLUMNS — all values sanitized earlier */}
                      <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
                        {item.project}
                      </td>
                      <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
                        {item.category}
                      </td>
                      <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
                        {item.lead}
                      </td>
                      <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
                        {item.status}
                      </td>
                      <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
                        {item.requestor}
                      </td>
                      <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
                        {item.requestor_vp}
                      </td>
                      <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
                        {item.requesting_dept}
                      </td>

                      <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
                        {item.completion_date
                          ? new Date(item.completion_date).toLocaleDateString()
                          : ''}
                      </td>

                      <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
                        {item.target_period}
                      </td>

                      <td
                        className="
                          px-4 py-2 border text-sm text-black
                          whitespace-normal break-words align-top
                          max-w-[750px]
                        "
                      >
                        {item.description}
                      </td>

                      <td
                        className="
                          px-4 py-2 border text-sm text-black
                          whitespace-normal break-words align-top
                          max-w-[500px]
                        "
                      >
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