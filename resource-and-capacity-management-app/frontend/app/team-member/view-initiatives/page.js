'use client';
export const dynamic = 'force-dynamic';

/* =============================================================================
   TeamMemberInitiativesPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Read-only initiatives view for Team Member users (acc_type_id === 3).
     Displays initiatives in a filterable, scrollable table. Supports three tabs
     (All Initiatives, Completed, Cancelled) with per-column filter dropdowns.
     Rows can be highlighted by clicking to draw attention to a specific initiative.

   HOW IT WORKS:
     1. On mount, validates the session from localStorage
     2. Fetches initiatives from GET /api/initiatives scoped to the user's
        username — the backend returns only initiatives the stakeholder is
        associated with (requestor or requestor_vp match)
     3. When the tab changes, refetches with a status filter param
     4. Filter dropdowns build option lists from the current tab's data
     5. Clicking a row highlights it — clicking again unhighlights

   KEY DIFFERENCE FROM RESOURCE MANAGER VIEW:
     • No Edit button — Team Members cannot modify initiatives
     • No Add Initiative button — read-only view only
     • Back button routes to /team-member/dashboard (shared dashboard path)
     • sanitizeText() and isValidInitiative() guard all API data before render

   SECURITY MODEL:
     • Session validated on mount — missing user redirects to /login.
     • isValidUser() checks username is present before any API call.
     • aborted flag prevents setState from running if the component unmounts
       or the effect re-runs before the fetch completes — prevents race conditions.
     • All string fields are passed through sanitizeText() before storing in state.
     • isValidInitiative() checks for _id presence before mapping — prevents
       partial or malformed API objects from reaching the render.
     • All rendered values are plain text — no dangerouslySetInnerHTML.
     • Filter option lists are built from server response data only.

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
const btnDarkClass = `
  px-4 py-2 rounded text-sm
  bg-[#003A5C] text-white border border-black/50 dark:border-slate-500/60
  dark:bg-[#0A5F8A] dark:text-white
  hover:bg-[#017ACB]/20 hover:text-gray-700
  dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100
  transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
`;

const tabClass = (isActive) => `
  px-6 py-2 rounded text-sm
  border border-[#00263F]/50 dark:border-slate-500/60
  ${isActive
    ? 'bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
    : 'bg-[#017ACB] text-white hover:bg-[#017ACB]/80 dark:hover:bg-[#017ACB]/80'
  }
  transition whitespace-nowrap
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
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

const menuClass = `
  dropdown-menu fixed bg-white dark:bg-slate-800 text-black dark:text-slate-100 shadow-lg rounded
  min-w-[12rem] w-max max-w-xs max-h-[min(80vh,580px)] overflow-y-auto
  z-[30000] border border-gray-300 dark:border-slate-600 pointer-events-auto
`;

/* =============================================================================
   UTILITY: sanitizeText
   Strips control characters, HTML tags, and script injection patterns from
   API response strings before storing in state or rendering.
   ============================================================================= */
function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')    // Strip control characters
    .replace(/<[^>]*>/g, '')                            // Strip HTML tags
    .replace(/script|onerror|onload|javascript:/gi, '') // Strip script patterns
    .trim();
}

/* =============================================================================
   UTILITY: isValidUser
   Checks that the user object has a non-empty username — minimum requirement
   for making scoped API calls.
   ============================================================================= */
function isValidUser(user) {
  return user && typeof user.username === 'string' && user.username.trim();
}

/* =============================================================================
   UTILITY: isValidInitiative
   Checks that an initiative object has an _id before it is mapped and stored —
   prevents partial or malformed API objects from reaching the render.
   ============================================================================= */
function isValidInitiative(item) {
  return item && item._id;
}

/* =============================================================================
   COMPONENT: Checkbox
   Custom styled checkbox consistent with the rest of the app's design system.
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
export default function TeamMemberInitiativesPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refresh      = searchParams.get('refresh');

  /* ---------------------------------------------------------------------------
     STATE
  --------------------------------------------------------------------------- */
  const [user, setUser]           = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const [initiatives, setInitiatives]               = useState([]);
  const [filteredInitiatives, setFilteredInitiatives] = useState([]);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatuses, setSelectedStatuses]     = useState([]);
  const [selectedVPs, setSelectedVPs]               = useState([]);
  const [selectedDepts, setSelectedDepts]           = useState([]);
  const [selectedLeads, setSelectedLeads]           = useState([]);
  const [selectedRequestors, setSelectedRequestors] = useState([]);
  const [selectedProjects, setSelectedProjects]     = useState([]);

  const [projectSort, setProjectSort]     = useState('');
  const [highlightedId, setHighlightedId] = useState(null); // Row click highlight state
  const toggleHighlight = (id) => setHighlightedId(prev => prev === id ? null : id);

  const [showProjectSortMenu, setShowProjectSortMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu]       = useState(false);
  const [showStatusMenu, setShowStatusMenu]           = useState(false);
  const [showVPMenu, setShowVPMenu]                   = useState(false);
  const [showDeptMenu, setShowDeptMenu]               = useState(false);
  const [showLeadMenu, setShowLeadMenu]               = useState(false);
  const [showRequestorMenu, setShowRequestorMenu]     = useState(false);

  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableStatuses, setAvailableStatuses]     = useState([]);
  const [availableVPs, setAvailableVPs]               = useState([]);
  const [availableDepts, setAvailableDepts]           = useState([]);
  const [availableLeads, setAvailableLeads]           = useState([]);
  const [availableRequestors, setAvailableRequestors] = useState([]);
  const [availableProjects, setAvailableProjects]     = useState([]);

  // Status dropdown options are scoped to the active tab —
  // Completed tab only shows "Completed", Cancelled only "Cancelled",
  // All tab excludes both terminal statuses from the status filter.
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
    setShowProjectSortMenu(false); setShowCategoryMenu(false); setShowStatusMenu(false);
    setShowVPMenu(false); setShowDeptMenu(false); setShowLeadMenu(false);
    setShowRequestorMenu(false);
  };

  const openMenu = (e, setFn, currentlyOpen) => {
    e.stopPropagation();
    if (currentlyOpen) { closeAllMenus(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left, y = rect.bottom + 4;
    if (x + 320 > window.innerWidth) x = window.innerWidth - 320 - 10;
    setMenuPosition({ x, y });
    closeAllMenus();
    setFn(true);
  };

  /* ---------------------------------------------------------------------------
     EFFECT: SESSION VALIDATION
     isValidUser() checks username presence before any API call is made.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return router.push('/login');
      const parsed = JSON.parse(raw);
      if (!isValidUser(parsed)) return router.push('/login');
      setUser(parsed);
    } catch { router.push('/login'); }
  }, [router]);

  /* ---------------------------------------------------------------------------
     EFFECT: FETCH INITIATIVES
     ---------------------------------------------------------------------------
     Re-runs when user, refresh param, or activeTab changes. Uses an aborted
     flag to prevent setState from running if the component unmounts or the
     effect re-runs before the fetch completes — prevents race conditions.

     Tab-to-status mapping:
       all       → no status param (backend returns non-terminal statuses)
       completed → status=Completed
       cancelled → status=Cancelled
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

        // sanitizeText() on every string field — XSS defence-in-depth
        // isValidInitiative() filters out any malformed objects missing _id
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

        // Backend returns different keys depending on the tab/status param
        const sourceAll = data.allAssignments || data.completed || data.cancelled || [];
        if (aborted) return;

        setInitiatives(safeMap(sourceAll));
        setFilteredInitiatives(safeMap(sourceAll));

      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    fetchInitiatives();
    return () => { aborted = true; }; // Cleanup — prevent setState on stale fetch
  }, [user, refresh, activeTab]);

  /* ---------------------------------------------------------------------------
     EFFECT: BUILD FILTER LISTS + APPLY FILTERS
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    // Scope base rows to the active tab's status group
    const base =
      activeTab === 'completed' ? initiatives.filter(i => i.status === 'Completed') :
      activeTab === 'cancelled' ? initiatives.filter(i => i.status === 'Cancelled') :
      initiatives.filter(i => i.status !== 'Completed' && i.status !== 'Cancelled');

    const uniq = (arr) => [...new Set(arr)].filter(Boolean);
    setAvailableCategories(uniq(base.map(i => i.category)));
    setAvailableStatuses(uniq(base.map(i => i.status)));
    setAvailableVPs(uniq(base.map(i => i.requestor_vp)));
    setAvailableDepts(uniq(base.map(i => i.requesting_dept)));
    setAvailableLeads(uniq(base.map(i => i.lead)));
    setAvailableRequestors(uniq(base.map(i => i.requestor)));
    setAvailableProjects(uniq(base.map(i => i.project)));

    let filtered = base.filter(i =>
      (!selectedCategories.length || selectedCategories.includes(i.category))       &&
      (!selectedStatuses.length   || selectedStatuses.includes(i.status))            &&
      (!selectedVPs.length        || selectedVPs.includes(i.requestor_vp))           &&
      (!selectedDepts.length      || selectedDepts.includes(i.requesting_dept))      &&
      (!selectedLeads.length      || selectedLeads.includes(i.lead))                 &&
      (!selectedRequestors.length || selectedRequestors.includes(i.requestor))       &&
      (!selectedProjects.length   || selectedProjects.includes(i.project))
    );

    if (projectSort === 'asc')  filtered = [...filtered].sort((a, b) => a.project.localeCompare(b.project));
    if (projectSort === 'desc') filtered = [...filtered].sort((a, b) => b.project.localeCompare(a.project));

    setFilteredInitiatives(filtered);
  }, [
    activeTab, initiatives, user,
    selectedCategories, selectedStatuses, selectedVPs,
    selectedDepts, selectedLeads, selectedRequestors,
    selectedProjects, projectSort
  ]);

  /* ---------------------------------------------------------------------------
     EFFECT: CLOSE MENUS ON OUTSIDE CLICK
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.dropdown-menu')) closeAllMenus(); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  /* ---------------------------------------------------------------------------
     RENDER HELPER: renderMenuItems
     Optionally includes sort options (A→Z / Z→A) for the Project column.
  --------------------------------------------------------------------------- */
  const renderMenuItems = (available, selected, setSelected, sortOptions = false) => (
    <>
      {sortOptions && (
        <>
          {[{ val: 'asc', label: 'A → Z' }, { val: 'desc', label: 'Z → A' }].map(({ val, label }) => (
            <div key={val}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${projectSort === val ? 'font-bold' : ''}`}
              onClick={() => setProjectSort(projectSort === val ? '' : val)}
            >
              <Checkbox checked={projectSort === val} />{label}
            </div>
          ))}
          <div className="border-t my-1 dark:border-slate-600 text-xs font-semibold text-gray-500 dark:text-slate-400 px-3 py-1">Filter by project</div>
        </>
      )}
      {/* "All" clears the filter for this column */}
      <div
        className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${selected.length === 0 ? 'font-bold' : ''}`}
        onClick={() => setSelected([])}
      >
        <Checkbox checked={selected.length === 0} />All
      </div>
      {available.map(val => (
        <div key={val}
          className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${selected.includes(val) ? 'font-bold' : ''}`}
          onClick={() => toggleSelection(val, setSelected, selected)}
        >
          <Checkbox checked={selected.includes(val)} />{val}
        </div>
      ))}
    </>
  );

  /* ---------------------------------------------------------------------------
     LOADING STATE
  --------------------------------------------------------------------------- */
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" />
      </div>
    );
  }

  /* ===========================================================================
     RENDER
     All cell values come from sanitized API data — no dangerouslySetInnerHTML.
  =========================================================================== */
  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white" style={styles.outfitFont}>Initiatives</h2>
          <button onClick={() => router.push('/team-member/dashboard')} className={btnDarkClass} style={styles.outfitFont}>
            Back to Dashboard
          </button>
        </div>

        {/* TAB BUTTONS — switching tabs clears all active filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {['all', 'completed', 'cancelled'].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedCategories([]); setSelectedStatuses([]); setSelectedVPs([]);
                setSelectedDepts([]); setSelectedLeads([]); setSelectedRequestors([]);
                setSelectedProjects([]); setProjectSort('');
              }}
              aria-pressed={activeTab === tab}
              className={tabClass(activeTab === tab)}
              style={styles.outfitFont}
            >
              {{ all: 'All Initiatives', completed: 'Completed', cancelled: 'Cancelled' }[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* INITIATIVES TABLE
          overflow-x-auto — horizontal scroll on narrow screens.
          max-h-[70vh] + overflow-y-auto — vertical scroll within the viewport.
          sticky thead — headers stay visible while scrolling down.
          Row click toggles highlight — bg-inherit on cells so hover works correctly. */}
      <div className="table-surface border rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-max w-full border-collapse">
            <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
              <tr>

                {/* PROJECT — includes sort options in its dropdown */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Project</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowProjectSortMenu, showProjectSortMenu)}>▼</button>
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
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowCategoryMenu, showCategoryMenu)}>▼</button>
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
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowLeadMenu, showLeadMenu)}>▼</button>
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
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowStatusMenu, showStatusMenu)}>▼</button>
                  </div>
                  {showStatusMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {/* visibleStatuses is scoped to the active tab */}
                      {renderMenuItems(visibleStatuses, selectedStatuses, setSelectedStatuses)}
                    </div>
                  )}
                </th>

                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requestor</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowRequestorMenu, showRequestorMenu)}>▼</button>
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
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowVPMenu, showVPMenu)}>▼</button>
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
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowDeptMenu, showDeptMenu)}>▼</button>
                  </div>
                  {showDeptMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableDepts, selectedDepts, setSelectedDepts)}
                    </div>
                  )}
                </th>

                {/* Static columns — no filter needed */}
                <th className="px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>Completion Date</th>
                <th className="px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>Target Period</th>
                <th className="px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>Description</th>
                <th className="px-4 py-2 border text-sm font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>Resource Consideration</th>

              </tr>
            </thead>

            <tbody>
              {filteredInitiatives.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500 border" style={styles.outfitFont}>
                    No initiatives found.
                  </td>
                </tr>
              )}

              {filteredInitiatives.map((item, index) => {
                const isHighlighted = highlightedId === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => toggleHighlight(item.id)} // Row click toggles highlight
                    className={`cursor-pointer transition-colors hover:bg-[#017ACB]/20 ${isHighlighted ? 'bg-[#CDE6F7]' : 'bg-white'}`}
                  >
                    {/* bg-inherit on all cells so row hover/highlight colour shows through */}
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.project}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.category}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.lead}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.status}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.requestor}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.requestor_vp}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.requesting_dept}</td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">
                      {/* Completion date formatted to locale string — null shown as blank */}
                      {item.completion_date ? new Date(item.completion_date).toLocaleDateString() : ''}
                    </td>
                    <td className="px-4 py-2 border text-sm text-black whitespace-nowrap bg-inherit">{item.target_period}</td>
                    {/* Description and Resource Consideration allow wrapping — max-w constrains width */}
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
