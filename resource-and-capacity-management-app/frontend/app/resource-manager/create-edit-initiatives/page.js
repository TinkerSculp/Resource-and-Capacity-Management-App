'use client';
 
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
 
const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };
 
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
 
// Sortable column header text — 3D pop on hover, matching project button style
const sortableSpanClass = `
  cursor-pointer select-none px-2 py-1 rounded transition
  hover:bg-white hover:text-[#017ACB] hover:border hover:border-black/50
  hover:shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
`;
 
const menuClass = `
  dropdown-menu fixed bg-white text-black shadow-lg rounded
  min-w-[12rem] w-max max-w-xs max-h-[min(80vh,580px)] overflow-y-auto
  z-[30000] border border-gray-300 pointer-events-auto
`;
 
/* =============================================================================
   SECURITY HELPERS
   ============================================================================= */
function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/script|onerror|onload|javascript:/gi, '')
    .trim();
}
 
function isValidUser(user) {
  return user && typeof user.username === 'string' && user.username.trim();
}
 
function isValidInitiative(item) {
  return item && item._id;
}
 
/* =============================================================================
   COMPONENT: Checkbox
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
 
  const [initiatives, setInitiatives]                 = useState([]);
  const [mine, setMine]                               = useState([]);
  const [filteredInitiatives, setFilteredInitiatives] = useState([]);
 
  const [searchTerm, setSearchTerm] = useState('');
 
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatuses, setSelectedStatuses]     = useState([]);
  const [selectedVPs, setSelectedVPs]               = useState([]);
  const [selectedDepts, setSelectedDepts]           = useState([]);
  const [selectedLeads, setSelectedLeads]           = useState([]);
  const [selectedRequestors, setSelectedRequestors] = useState([]);
  const [selectedProjects, setSelectedProjects]     = useState([]);
 
  // ---------------------------------------------------------------------------
  // SORT STATE — column: "project"|"category"|"lead"|"status"|"requestor"|"vp"|"dept"|null
  // Cycles: asc → desc → null (3rd click clears)
  // Numbers always sort to the bottom.
  // ---------------------------------------------------------------------------
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
 
  const handleHeaderSort = (column) => {
    setSortConfig(prev => {
      if (prev.column !== column)               return { column, direction: 'asc' };
      if (prev.direction === 'asc')             return { column, direction: 'desc' };
      return { column: null, direction: 'asc' }; // 3rd click clears
    });
  };
 
  const sortArrow = (column) => {
    if (sortConfig.column !== column) return '';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };
 
  const [highlightedId, setHighlightedId] = useState(null);
  const toggleHighlight = (id) => setHighlightedId(prev => prev === id ? null : id);
 
  const [showProjectSortMenu, setShowProjectSortMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu]       = useState(false);
  const [showStatusMenu, setShowStatusMenu]           = useState(false);
  const [showVPMenu, setShowVPMenu]                   = useState(false);
  const [showDeptMenu, setShowDeptMenu]               = useState(false);
  const [showLeadMenu, setShowLeadMenu]               = useState(false);
  const [showRequestorMenu, setShowRequestorMenu]     = useState(false);
  const [menuPosition, setMenuPosition]               = useState({ x: 0, y: 0 });
 
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableStatuses, setAvailableStatuses]     = useState([]);
  const [availableVPs, setAvailableVPs]               = useState([]);
  const [availableDepts, setAvailableDepts]           = useState([]);
  const [availableLeads, setAvailableLeads]           = useState([]);
  const [availableRequestors, setAvailableRequestors] = useState([]);
  const [availableProjects, setAvailableProjects]     = useState([]);
 
  /* ---------------------------------------------------------------------------
     DERIVED
  --------------------------------------------------------------------------- */
  const visibleStatuses =
    activeTab === 'completed' ? ['Completed'] :
    activeTab === 'cancelled' ? ['Cancelled'] :
    availableStatuses.filter(s => s !== 'Completed' && s !== 'Cancelled');
 
  /* ---------------------------------------------------------------------------
     HELPERS
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
    if (currentlyOpen) { closeAllMenus(); return; }
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
     EFFECT 3: FILTER + SORT
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
 
    // --- SORT — numbers always go to the bottom regardless of direction ---
    const { column, direction } = sortConfig;
    if (column) {
      const dir = direction === 'asc' ? 1 : -1;
      const isNumericStart = (s) => /^\d/.test(s || '');
      filtered = [...filtered].sort((a, b) => {
        let aVal = '';
        let bVal = '';
        if (column === 'project')   { aVal = a.project;       bVal = b.project; }
        if (column === 'category')  { aVal = a.category;      bVal = b.category; }
        if (column === 'lead')      { aVal = a.lead;          bVal = b.lead; }
        if (column === 'status')    { aVal = a.status;        bVal = b.status; }
        if (column === 'requestor') { aVal = a.requestor;     bVal = b.requestor; }
        if (column === 'vp')        { aVal = a.requestor_vp;  bVal = b.requestor_vp; }
        if (column === 'dept')      { aVal = a.requesting_dept; bVal = b.requesting_dept; }
        const aIsNum = isNumericStart(aVal);
        const bIsNum = isNumericStart(bVal);
        if (aIsNum && !bIsNum) return 1;
        if (!aIsNum && bIsNum) return -1;
        return aVal.localeCompare(bVal) * dir;
      });
    }
 
    setFilteredInitiatives(filtered);
  }, [
    activeTab, initiatives, mine, user, searchTerm, sortConfig,
    selectedCategories, selectedStatuses, selectedVPs, selectedDepts,
    selectedLeads, selectedRequestors, selectedProjects,
  ]);
 
  /* ---------------------------------------------------------------------------
     EFFECT 4: CLOSE MENUS ON OUTSIDE CLICK
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.dropdown-menu')) closeAllMenus(); };
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
     RENDER HELPER: renderMenuItems — filter-only dropdowns (no sort rows)
  --------------------------------------------------------------------------- */
  const renderMenuItems = (available, selected, setSelected) => (
    <>
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
                setSortConfig({ column: null, direction: 'asc' });
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
 
                {/* PROJECT */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span className={sortableSpanClass} onClick={() => handleHeaderSort('project')}>
                      Project{sortArrow('project')}
                    </span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowProjectSortMenu, showProjectSortMenu)}>▼</button>
                  </div>
                  {showProjectSortMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableProjects, selectedProjects, setSelectedProjects)}
                    </div>
                  )}
                </th>
 
                {/* CATEGORY */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span className={sortableSpanClass} onClick={() => handleHeaderSort('category')}>
                      Category{sortArrow('category')}
                    </span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowCategoryMenu, showCategoryMenu)}>▼</button>
                  </div>
                  {showCategoryMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableCategories, selectedCategories, setSelectedCategories)}
                    </div>
                  )}
                </th>
 
                {/* LEADER ACCOUNTABLE */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span className={sortableSpanClass} onClick={() => handleHeaderSort('lead')}>
                      Leader Accountable{sortArrow('lead')}
                    </span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowLeadMenu, showLeadMenu)}>▼</button>
                  </div>
                  {showLeadMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableLeads, selectedLeads, setSelectedLeads)}
                    </div>
                  )}
                </th>
 
                {/* STATUS */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span className={sortableSpanClass} onClick={() => handleHeaderSort('status')}>
                      Status{sortArrow('status')}
                    </span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowStatusMenu, showStatusMenu)}>▼</button>
                  </div>
                  {showStatusMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(visibleStatuses, selectedStatuses, setSelectedStatuses)}
                    </div>
                  )}
                </th>
 
                {/* REQUESTOR */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span className={sortableSpanClass} onClick={() => handleHeaderSort('requestor')}>
                      Requestor{sortArrow('requestor')}
                    </span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowRequestorMenu, showRequestorMenu)}>▼</button>
                  </div>
                  {showRequestorMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableRequestors, selectedRequestors, setSelectedRequestors)}
                    </div>
                  )}
                </th>
 
                {/* REQUESTOR VP */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span className={sortableSpanClass} onClick={() => handleHeaderSort('vp')}>
                      Requestor VP{sortArrow('vp')}
                    </span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowVPMenu, showVPMenu)}>▼</button>
                  </div>
                  {showVPMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableVPs, selectedVPs, setSelectedVPs)}
                    </div>
                  )}
                </th>
 
                {/* REQUESTING DEPT */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span className={sortableSpanClass} onClick={() => handleHeaderSort('dept')}>
                      Requesting Dept{sortArrow('dept')}
                    </span>
                    <button className={colBtnClass} onClick={e => openMenu(e, setShowDeptMenu, showDeptMenu)}>▼</button>
                  </div>
                  {showDeptMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                      {renderMenuItems(availableDepts, selectedDepts, setSelectedDepts)}
                    </div>
                  )}
                </th>
 
                {/* NON-SORTABLE COLUMNS */}
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