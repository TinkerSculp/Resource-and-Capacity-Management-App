'use client';

/* =============================================================================
   InitiativesPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays all initiatives in a filterable, scrollable table. Supports:
       • "All Initiatives", "My Initiatives", "Completed", "Cancelled" tabs
       • Column-level filter menus (project, category, leader, status,
         requestor, requestor VP, requesting dept)
       • Project sort (A→Z / Z→A)
       • Inline Edit button per row — navigates to the edit page
       • Global search bar — filters visible rows across key initiative fields

   HOW IT WORKS:
     1. On mount, validates the session from localStorage
     2. Fetches initiatives from GET /api/initiatives scoped to the user's username
     3. When the tab changes, refetches with a status filter param
     4. Filter dropdowns are built from the tab-scoped base BEFORE filters are
        applied — so "My Initiatives" only shows values from that user's rows
     5. Clicking a row highlights it — clicking again unhighlights
     6. Global search is applied to the tab-scoped base before column filters

   FILTER OPTION LISTS — TAB-AWARE:
     Each dropdown's option list is derived from the current tab's base rows
     BEFORE any filter is applied. This means:
       • My Initiatives dropdowns only list values present in that user's rows
       • All/Mine project filter never lists Completed or Cancelled projects
       • Completed/Cancelled tabs only show their own statuses in the filter

   SECURITY MODEL:
     • localStorage accessed inside try/catch — malformed JSON redirects to login.
     • user.username validated via isValidUser() before any API call.
     • All initiative fields passed through sanitizeText() before storing in state.
     • encodeURIComponent() on initiative IDs in all URL constructions.
     • Filter menus built from sanitized server data only — no user-typed values.
     • Search input is restricted to letters and spaces only.
     • No dangerouslySetInnerHTML anywhere.
     • Fetch aborted on unmount via aborted flag — prevents setState after unmount.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter, useSearchParams
   ============================================================================= */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

/* -----------------------------------------------------------------------------
   SHARED BUTTON + DROPDOWN CLASSES — neumorphic, matches all other pages.
----------------------------------------------------------------------------- */
const btnClass = `
  px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

const btnDarkClass = `
  px-4 py-2 rounded text-sm
  bg-[#003A5C] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

const tabClass = (isActive) => `
  px-4 py-2 rounded text-sm border border-black/50
  ${isActive
    ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
    : 'bg-gray-200 text-gray-700 hover:bg-[#017ACB]/20'
  }
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  transition whitespace-nowrap
`;

const colBtnClass = `
  ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold
  border border-black/50 hover:bg-[#CDE6F7] transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.14)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.14)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.10),inset_0_-1px_2px_rgba(0,0,0,0.10)]
`;

/* menuClass — fixed-position overlay, z-[30000] floats above sticky headers */
const menuClass = `
  dropdown-menu fixed bg-white text-black shadow-lg rounded
  min-w-[12rem] w-max max-w-xs max-h-[min(80vh,580px)] overflow-y-auto
  z-[30000] border border-gray-300 pointer-events-auto
`;

/* =============================================================================
   SECURITY HELPERS
   ============================================================================= */

// Strip control characters, HTML tags, and common injection keywords
function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/script|onerror|onload|javascript:/gi, '')
    .trim();
}

// Validate that the stored user object has a usable username
function isValidUser(user) {
  return user && typeof user.username === 'string' && user.username.trim();
}

// Validate that an initiative has a usable _id before mapping
function isValidInitiative(item) {
  return item && item._id;
}

/* =============================================================================
   COMPONENT: Checkbox — used inside all dropdown filter menus.
   ============================================================================= */
const Checkbox = ({ checked }) => (
  <span className="w-4 h-4 border border-black rounded-sm flex items-center justify-center transition relative overflow-hidden flex-shrink-0">
    <input type="checkbox" checked={checked} readOnly className="opacity-0 absolute w-4 h-4 cursor-pointer" />
    {checked && (
      <>
        <span className="absolute inset-0" style={{ backgroundColor: '#003A5C' }} />
        <svg className="absolute w-3 h-3 text-white" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 11 8 15 16 6" />
        </svg>
      </>
    )}
  </span>
);

/* =============================================================================
   MAIN COMPONENT
   ============================================================================= */
export default function InitiativesPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refresh      = searchParams.get('refresh');

  /* ---------------------------------------------------------------------------
     STATE
  --------------------------------------------------------------------------- */
  const [user, setUser]           = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const [initiatives, setInitiatives]                  = useState([]);
  const [mine, setMine]                                = useState([]);
  const [filteredInitiatives, setFilteredInitiatives]  = useState([]);

  const [searchTerm, setSearchTerm] = useState('');

  // Filter selections — [] = no filter (show all)
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatuses, setSelectedStatuses]     = useState([]);
  const [selectedVPs, setSelectedVPs]               = useState([]);
  const [selectedDepts, setSelectedDepts]           = useState([]);
  const [selectedLeads, setSelectedLeads]           = useState([]);
  const [selectedRequestors, setSelectedRequestors] = useState([]);
  const [selectedProjects, setSelectedProjects]     = useState([]);

  const [projectSort, setProjectSort]     = useState('');
  const [highlightedId, setHighlightedId] = useState(null);
  const toggleHighlight = (id) => setHighlightedId(prev => prev === id ? null : id);

  // Dropdown visibility flags
  const [showProjectSortMenu, setShowProjectSortMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu]       = useState(false);
  const [showStatusMenu, setShowStatusMenu]           = useState(false);
  const [showVPMenu, setShowVPMenu]                   = useState(false);
  const [showDeptMenu, setShowDeptMenu]               = useState(false);
  const [showLeadMenu, setShowLeadMenu]               = useState(false);
  const [showRequestorMenu, setShowRequestorMenu]     = useState(false);
  const [menuPosition, setMenuPosition]               = useState({ x: 0, y: 0 });

  // Available option lists — built from sanitized server data, scoped by tab
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableStatuses, setAvailableStatuses]     = useState([]);
  const [availableVPs, setAvailableVPs]               = useState([]);
  const [availableDepts, setAvailableDepts]           = useState([]);
  const [availableLeads, setAvailableLeads]           = useState([]);
  const [availableRequestors, setAvailableRequestors] = useState([]);
  const [availableProjects, setAvailableProjects]     = useState([]);

  /* ---------------------------------------------------------------------------
     DERIVED: visibleStatuses
  --------------------------------------------------------------------------- */
  const visibleStatuses =
    activeTab === 'completed' ? ['Completed'] :
    activeTab === 'cancelled' ? ['Cancelled'] :
    availableStatuses.filter(s => s !== 'Completed' && s !== 'Cancelled');

  /* ---------------------------------------------------------------------------
     HELPERS: menu open/close and filter toggle
  --------------------------------------------------------------------------- */
  const toggleSelection = (value, setFn, current) => {
    if (!value) return;
    setFn(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  const closeAllMenus = () => {
    setShowProjectSortMenu(false);
    setShowCategoryMenu(false);
    setShowStatusMenu(false);
    setShowVPMenu(false);
    setShowDeptMenu(false);
    setShowLeadMenu(false);
    setShowRequestorMenu(false);
  };

  const openMenu = (e, setFn, currentlyOpen) => {
    e.stopPropagation();
    if (currentlyOpen) {
      closeAllMenus();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left;
    let y = rect.bottom + 4;
    if (x + 320 > window.innerWidth) x = window.innerWidth - 320 - 10;
    setMenuPosition({ x, y });
    closeAllMenus();
    setFn(true);
  };

  /* ---------------------------------------------------------------------------
     EFFECT 1: LOAD USER SESSION
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return router.push('/login');
      const parsed = JSON.parse(raw);
      if (!isValidUser(parsed)) return router.push('/login');
      setUser(parsed);
    } catch {
      router.push('/login');
    }
  }, [router]);

  /* ---------------------------------------------------------------------------
     EFFECT 2: FETCH INITIATIVES
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;
    let aborted = false;

    const fetchInitiatives = async () => {
      try {
        const params = { username: user.username };
        if (activeTab === 'completed') params.status = 'Completed';
        else if (activeTab === 'cancelled') params.status = 'Cancelled';

        const res = await api.get('/initiatives', { params });
        if (!res?.data || aborted) return;

        const data = res.data;

        const safeMap = (items) =>
          Array.isArray(items)
            ? items.filter(isValidInitiative).map(item => ({
                id:                     sanitizeText(String(item._id)),
                project:                sanitizeText(item.project_name),
                category:               sanitizeText(item.category),
                lead:                   sanitizeText(item.leader),
                status:                 sanitizeText(item.status),
                requestor:              sanitizeText(item.requestor),
                requestor_vp:           sanitizeText(item.requestor_vp),
                requesting_dept:        sanitizeText(item.requesting_dept),
                completion_date:        item.completion_date || null,
                target_period:          sanitizeText(item.target_period),
                description:            sanitizeText(item.description),
                resource_consideration: sanitizeText(item.resource_notes),
              }))
            : [];

        const sourceAll = data.allAssignments || data.completed || data.cancelled || [];
        if (aborted) return;

        setInitiatives(safeMap(sourceAll));
        setMine(safeMap(data.myInitiatives || []));
        setFilteredInitiatives(safeMap(sourceAll));
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    fetchInitiatives();
    return () => { aborted = true; };
  }, [user, refresh, activeTab]);

  /* ---------------------------------------------------------------------------
     EFFECT 3: APPLY SEARCH + FILTERS + SORT + BUILD AVAILABLE FILTER LISTS
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    const base =
      activeTab === 'mine'
        ? mine.filter(i => i.status !== 'Completed' && i.status !== 'Cancelled')
        : activeTab === 'completed'
          ? initiatives.filter(i => i.status === 'Completed')
          : activeTab === 'cancelled'
            ? initiatives.filter(i => i.status === 'Cancelled')
            : initiatives.filter(i => i.status !== 'Completed' && i.status !== 'Cancelled');

    const uniq = (arr) => [...new Set(arr)].filter(Boolean);
    setAvailableCategories(uniq(base.map(i => i.category)));
    setAvailableStatuses(uniq(base.map(i => i.status)));
    setAvailableVPs(uniq(base.map(i => i.requestor_vp)));
    setAvailableDepts(uniq(base.map(i => i.requesting_dept)));
    setAvailableLeads(uniq(base.map(i => i.lead)));
    setAvailableRequestors(uniq(base.map(i => i.requestor)));
    setAvailableProjects(uniq(base.map(i => i.project)));

    let filtered = base;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();

      filtered = filtered.filter(i =>
        (i.project || '').toLowerCase().includes(term) ||
        (i.category || '').toLowerCase().includes(term) ||
        (i.lead || '').toLowerCase().includes(term) ||
        (i.status || '').toLowerCase().includes(term) ||
        (i.requestor || '').toLowerCase().includes(term) ||
        (i.requestor_vp || '').toLowerCase().includes(term) ||
        (i.requesting_dept || '').toLowerCase().includes(term) ||
        (i.target_period || '').toLowerCase().includes(term) ||
        (i.description || '').toLowerCase().includes(term) ||
        (i.resource_consideration || '').toLowerCase().includes(term)
      );
    }

    filtered = filtered.filter(i =>
      (!selectedCategories.length || selectedCategories.includes(i.category)) &&
      (!selectedStatuses.length   || selectedStatuses.includes(i.status)) &&
      (!selectedVPs.length        || selectedVPs.includes(i.requestor_vp)) &&
      (!selectedDepts.length      || selectedDepts.includes(i.requesting_dept)) &&
      (!selectedLeads.length      || selectedLeads.includes(i.lead)) &&
      (!selectedRequestors.length || selectedRequestors.includes(i.requestor)) &&
      (!selectedProjects.length   || selectedProjects.includes(i.project))
    );

    if (projectSort === 'asc')  filtered = [...filtered].sort((a, b) => a.project.localeCompare(b.project));
    if (projectSort === 'desc') filtered = [...filtered].sort((a, b) => b.project.localeCompare(a.project));

    setFilteredInitiatives(filtered);
  }, [
    activeTab,
    initiatives,
    mine,
    user,
    searchTerm,
    selectedCategories,
    selectedStatuses,
    selectedVPs,
    selectedDepts,
    selectedLeads,
    selectedRequestors,
    selectedProjects,
    projectSort
  ]);

  /* ---------------------------------------------------------------------------
     EFFECT 4: CLOSE MENUS ON OUTSIDE CLICK
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.dropdown-menu')) closeAllMenus();
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  /* ---------------------------------------------------------------------------
     LOADING STATE
  --------------------------------------------------------------------------- */
  if (!user) {
    return (
      <div className="h-[600px] bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" aria-label="Loading" />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RENDER HELPER: renderMenuItems
  --------------------------------------------------------------------------- */
  const renderMenuItems = (available, selected, setSelected, sortOptions = false) => (
    <>
      {sortOptions && (
        <>
          {[{ val: 'asc', label: 'A → Z' }, { val: 'desc', label: 'Z → A' }].map(({ val, label }) => (
            <div
              key={val}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${projectSort === val ? 'font-bold' : ''}`}
              onClick={() => setProjectSort(projectSort === val ? '' : val)}
            >
              <Checkbox checked={projectSort === val} />{label}
            </div>
          ))}
          <div className="border-t my-1 text-xs font-semibold text-gray-500 px-3 py-1">Filter by project</div>
        </>
      )}

      <div
        className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${selected.length === 0 ? 'font-bold' : ''}`}
        onClick={() => setSelected([])}
      >
        <Checkbox checked={selected.length === 0} />All
      </div>

      {available.map(val => (
        <div
          key={val}
          className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${selected.includes(val) ? 'font-bold' : ''}`}
          onClick={() => toggleSelection(val, setSelected, selected)}
        >
          <Checkbox checked={selected.includes(val)} />{val}
        </div>
      ))}
    </>
  );

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-4xl font-bold text-gray-900" style={styles.outfitFont}>Initiatives</h2>
          <button onClick={() => router.push('/resource-manager/dashboard')} className={btnDarkClass} style={styles.outfitFont}>
            Back to Dashboard
          </button>
        </div>

        <div className="flex-1 flex justify-center min-w-[220px]">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value.replace(/[^a-zA-Z ]/g, ''))}
            maxLength={100}
            className="px-3 py-2 border border-gray-500 bg-gray-200 rounded text-gray-700 text-sm w-64 hover:bg-[#017ACB]/20 transition-colors"
            style={styles.outfitFont}
          />
        </div>

        {/* TABS + ADD BUTTON — switching tabs clears all filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {['all', 'mine', 'completed', 'cancelled'].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchTerm('');
                setSelectedCategories([]);
                setSelectedStatuses([]);
                setSelectedVPs([]);
                setSelectedDepts([]);
                setSelectedLeads([]);
                setSelectedRequestors([]);
                setSelectedProjects([]);
                setProjectSort('');
              }}
              aria-pressed={activeTab === tab}
              className={tabClass(activeTab === tab)}
              style={styles.outfitFont}
            >
              {{ all: 'All Initiatives', mine: 'My Initiatives', completed: 'Completed', cancelled: 'Cancelled' }[tab]}
            </button>
          ))}

          <button
            onClick={() => router.push('/resource-manager/create-edit-initiatives/add-initiative')}
            className={btnClass}
            style={styles.outfitFont}
          >
            + Add Initiative
          </button>
        </div>
      </div>

      {/* INITIATIVES TABLE */}
      <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-max w-full border-collapse">
            <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
              <tr>
                {/* EDIT — sticky left */}
                <th className="sticky left-0 top-0 z-[9999] bg-[#017ACB] px-4 py-2 text-sm font-semibold whitespace-nowrap align-middle [background-clip:padding-box]" style={styles.outfitFont}>
                  Edit
                </th>

                {/* PROJECT — sort + filter */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Project</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowProjectSortMenu, showProjectSortMenu)}>▼</button>
                  </div>
                  {showProjectSortMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableProjects, selectedProjects, setSelectedProjects, true)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Category</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowCategoryMenu, showCategoryMenu)}>▼</button>
                  </div>
                  {showCategoryMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableCategories, selectedCategories, setSelectedCategories)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Leader Accountable</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowLeadMenu, showLeadMenu)}>▼</button>
                  </div>
                  {showLeadMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableLeads, selectedLeads, setSelectedLeads)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Status</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowStatusMenu, showStatusMenu)}>▼</button>
                  </div>
                  {showStatusMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(visibleStatuses, selectedStatuses, setSelectedStatuses)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requestor</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowRequestorMenu, showRequestorMenu)}>▼</button>
                  </div>
                  {showRequestorMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableRequestors, selectedRequestors, setSelectedRequestors)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requestor VP</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowVPMenu, showVPMenu)}>▼</button>
                  </div>
                  {showVPMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableVPs, selectedVPs, setSelectedVPs)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requesting Dept</span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowDeptMenu, showDeptMenu)}>▼</button>
                  </div>
                  {showDeptMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableDepts, selectedDepts, setSelectedDepts)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>Completion Date</th>
                <th className="px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>Target Period</th>
                <th className="px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>Description</th>
                <th className="px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>Resource Consideration</th>
              </tr>
            </thead>

            <tbody>
              {filteredInitiatives.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-gray-500 border" style={styles.outfitFont}>
                    No initiatives found.
                  </td>
                </tr>
              )}

              {filteredInitiatives.map(item => {
                const isHighlighted = highlightedId === item.id;

                return (
                  <tr
                    key={item.id}
                    onClick={() => toggleHighlight(item.id)}
                    className={`cursor-pointer transition-colors hover:bg-[#017ACB]/20 ${isHighlighted ? 'bg-[#CDE6F7]' : 'bg-white'}`}
                  >
                    <td
                      className="sticky left-0 z-30 px-4 py-2 bg-white border-r border-black text-black whitespace-nowrap"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => router.push(`/resource-manager/create-edit-initiatives/edit-initiative?id=${encodeURIComponent(item.id)}`)}
                        className="
                          px-2 py-1 rounded text-xs bg-[#017ACB] text-white border border-black/50
                          hover:bg-[#017ACB]/20 hover:text-gray-700 transition
                          shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                          active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
                          relative before:content-[''] before:absolute before:inset-0 before:rounded
                          before:pointer-events-none
                          before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
                        "
                        style={styles.outfitFont}
                      >
                        Edit
                      </button>
                    </td>

                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.project}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.category}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.lead}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.status}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.requestor}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.requestor_vp}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.requesting_dept}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">
                      {item.completion_date ? new Date(item.completion_date).toLocaleDateString() : ''}
                    </td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.target_period}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-normal break-words align-top max-w-[750px] bg-inherit">{item.description}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-normal break-words align-top max-w-[500px] bg-inherit">{item.resource_consideration}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
