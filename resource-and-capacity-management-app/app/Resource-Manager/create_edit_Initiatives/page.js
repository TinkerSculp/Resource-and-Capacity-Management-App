'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function InitiativesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refresh = searchParams.get("refresh"); // Forces data reload after closing Add/Edit modals

  /* ---------------------------------------------------------
     STATE MANAGEMENT
     ---------------------------------------------------------
     PURPOSE:
     - Stores user session data
     - Tracks active tab selection
     - Holds full initiative dataset, user-specific dataset,
       and the final filtered dataset
     - Manages all multi-select filter states
     - Controls sorting and dropdown visibility
     - Stores absolute positioning for dropdown menus
  --------------------------------------------------------- */

  const [user, setUser] = useState(null); // Logged-in user object
  const [activeTab, setActiveTab] = useState('all'); // all | mine | completed

  const [initiatives, setInitiatives] = useState([]); // All initiatives from DB
  const [mine, setMine] = useState([]); // Initiatives assigned to logged-in user
  const [filteredInitiatives, setFilteredInitiatives] = useState([]); // Final filtered dataset

  // Multi-select filter states
  const [selectedCategories, setSelectedCategories] = useState([]); // Category filter
  const [selectedStatuses, setSelectedStatuses] = useState([]); // Status filter
  const [selectedVPs, setSelectedVPs] = useState([]); // Requestor VP filter
  const [selectedDepts, setSelectedDepts] = useState([]); // Department filter
  const [selectedLeads, setSelectedLeads] = useState([]); // Lead filter

  // Sorting state
  const [projectSort, setProjectSort] = useState(''); // asc | desc | none
  const [showProjectSortMenu, setShowProjectSortMenu] = useState(false); // Sort dropdown visibility

  // Dropdown visibility toggles
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showVPMenu, setShowVPMenu] = useState(false);
  const [showDeptMenu, setShowDeptMenu] = useState(false);
  const [showLeadMenu, setShowLeadMenu] = useState(false);

  // Dropdown absolute positioning
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Unique dropdown option lists (extracted from DB)
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [availableVPs, setAvailableVPs] = useState([]);
  const [availableDepts, setAvailableDepts] = useState([]);
  const [availableLeads, setAvailableLeads] = useState([]);

  /* ---------------------------------------------------------
     LOAD USER SESSION
     ---------------------------------------------------------
     PURPOSE:
     - Retrieves user from localStorage
     - Redirects to login page if no session exists
  --------------------------------------------------------- */
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/Resource-Manager/Profile/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  /* ---------------------------------------------------------
     FETCH INITIATIVES
     ---------------------------------------------------------
     PURPOSE:
     - Loads all initiatives and user-specific initiatives
     - Normalizes DB fields into consistent frontend structure
     - Builds unique dropdown option lists
     - Ensures fresh data using timestamp + no-cache headers
  --------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    const fetchInitiatives = async () => {
      try {
        const res = await fetch(
          `/api/Resource-Manager/Initiatives?username=${user.username}&ts=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );

        const { allAssignments, myInitiatives } = await res.json();

        // Normalize DB fields → frontend structure
        const mapFields = (data) =>
          data.map((item) => ({
            id: item._id,
            project: item.project_name,
            category: item.category,
            lead: item.leader,
            status: item.status,
            requestor: item.requestor,
            requestor_vp: item.requestor_vp,
            requesting_dept: item.requesting_dept,
            completion_date: item.completion_date,
            target_period: item.target_period,
            description: item.description,
            resource_consideration: item.resource_notes,
          }));

        const mappedAll = mapFields(allAssignments);
        const mappedMine = mapFields(myInitiatives);

        setInitiatives(mappedAll);
        setMine(mappedMine);
        setFilteredInitiatives(mappedAll); // Default view = all initiatives

        // Build unique dropdown lists
        setAvailableCategories([...new Set(mappedAll.map(i => i.category).filter(Boolean))]);
        setAvailableStatuses([...new Set(mappedAll.map(i => i.status).filter(Boolean))]);
        setAvailableVPs([...new Set(mappedAll.map(i => i.requestor_vp).filter(Boolean))]);
        setAvailableDepts([...new Set(mappedAll.map(i => i.requesting_dept).filter(Boolean))]);
        setAvailableLeads([...new Set(mappedAll.map(i => i.lead).filter(Boolean))]);

      } catch (err) {
        console.error("Initiatives fetch error:", err);
      }
    };

    fetchInitiatives();
  }, [user, refresh]);

  /* ---------------------------------------------------------
     FILTERING + SORTING LOGIC
     ---------------------------------------------------------
     PURPOSE:
     - Applies tab filters (all, mine, completed)
     - Applies all multi-select filters
     - Applies alphabetical sorting on project name
     - Produces final filteredInitiatives dataset
  --------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    // Base dataset depending on active tab
    let base = activeTab === 'mine'
      ? mine
      : activeTab === 'completed'
      ? initiatives.filter(i => i.status === 'Completed')
      : initiatives.filter(i => i.status !== 'Completed');

    // Apply multi-select filters
    let filtered = base.filter((i) =>
      (selectedCategories.length ? selectedCategories.includes(i.category) : true) &&
      (selectedStatuses.length ? selectedStatuses.includes(i.status) : true) &&
      (selectedVPs.length ? selectedVPs.includes(i.requestor_vp) : true) &&
      (selectedDepts.length ? selectedDepts.includes(i.requesting_dept) : true) &&
      (selectedLeads.length ? selectedLeads.includes(i.lead) : true)
    );

    // Apply sorting
    if (projectSort === 'asc') {
      filtered = [...filtered].sort((a, b) => a.project.localeCompare(b.project));
    } else if (projectSort === 'desc') {
      filtered = [...filtered].sort((a, b) => b.project.localeCompare(a.project));
    }

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
    projectSort
  ]);

  /* ---------------------------------------------------------
     TOGGLE HELPERS
     ---------------------------------------------------------
     PURPOSE:
     - Adds or removes a value from any multi‑select filter array
     - Used by all dropdown filter components
  --------------------------------------------------------- */
  const toggleSelection = (value, setFn, current) => {
    setFn(current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    );
  };

  /* ---------------------------------------------------------
     CLOSE ALL DROPDOWNS ON OUTSIDE CLICK
     ---------------------------------------------------------
     PURPOSE:
     - Ensures only one dropdown is open at a time
     - Closes all menus when clicking anywhere outside
  --------------------------------------------------------- */
  useEffect(() => {
    const handleClickOutside = () => {
      setShowCategoryMenu(false);
      setShowStatusMenu(false);
      setShowVPMenu(false);
      setShowDeptMenu(false);
      setShowLeadMenu(false);
      setShowProjectSortMenu(false);
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  /* ---------------------------------------------------------
     NAVIGATION HELPERS
     ---------------------------------------------------------
     PURPOSE:
     - Opens Add Initiative modal route
     - Opens Edit Initiative modal route
  --------------------------------------------------------- */
  const handleAddInitiative = () => {
    router.push('/Resource-Manager/create_edit_Initiatives/AddInitiative');
  };

  const handleEditInitiative = (id) => {
    router.push(`/Resource-Manager/create_edit_Initiatives/EditButton?id=${id}`);
  };

  /* ---------------------------------------------------------
     LOADING STATE
     ---------------------------------------------------------
     PURPOSE:
     - Displays a loading spinner while user session is loading
  --------------------------------------------------------- */
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // HEADER + FILTER BUTTONS
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ---------------------------------------------------------
         TOP NAVIGATION BAR
         ---------------------------------------------------------
         PURPOSE:
         - Displays logo, app name, centered title, and user profile
         - Provides navigation back to dashboard
      --------------------------------------------------------- */}
      <header className="bg-[#017ACB] shadow-sm w-full relative">
        <div className="px-4 sm:px-6 lg:px-8 w-full">

          {/* Balanced height for all screen sizes */}
          <div className="relative flex items-center h-[clamp(4.5rem,5vw,5.5rem)] w-full">

            {/* Logo + App Name (clickable → dashboard) */}
            <div
              className="flex items-center cursor-pointer flex-none"
              onClick={() => router.push('/Resource-Manager/dashboard')}
            >
              <img
                src="/CapstoneDynamicsLogo.png"
                alt="Logo"
                className="w-auto h-[clamp(3.2rem,3.8vw,4rem)]"
              />

              <h1
                className="font-bold text-white leading-tight ml-4 text-[clamp(1.6rem,1.7vw,2rem)]"
                style={styles.outfitFont}
              >
                Capstone Dynamics
              </h1>
            </div>

            {/* Centered Page Title */}
            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <h1
                className="font-bold text-white leading-tight text-[clamp(1.2rem,1.3vw,1.6rem)]"
                style={styles.outfitFont}
              >
                Resource & Capacity Management Planner
              </h1>
            </div>

            {/* User Profile (username + avatar circle) */}
            <div className="flex items-center gap-4 ml-auto flex-none">
              <span
                className="font-semibold text-white text-[clamp(1rem,1.15vw,1.25rem)]"
                style={styles.outfitFont}
              >
                {user?.username || ''}
              </span>

              <div
                onClick={() => router.push('/Resource-Manager/Profile/view-profile')}
                className="rounded-full bg-white flex items-center justify-center cursor-pointer hover:opacity-90 transition
                           w-[clamp(2.4rem,2.8vw,3.0rem)] h-[clamp(2.4rem,2.8vw,3.0rem)]"
              >
                <span className="text-[#017ACB] font-bold text-[clamp(1.1rem,1.3vw,1.5rem)]">
                  {user?.username?.charAt(0)?.toUpperCase() || ''}
                </span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------
         MAIN CONTENT AREA
         ---------------------------------------------------------
         PURPOSE:
         - Contains page title, navigation buttons, tab controls,
           and the full initiatives table
      --------------------------------------------------------- */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Page Title + Dashboard Button */}
        <div className="flex justify-between items-center mb-4">

          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-4xl font-bold text-gray-900" style={styles.outfitFont}>
              Initiatives
            </h2>

            {/* Back to Dashboard */}
            <button
              onClick={() => router.push('/Resource-Manager/dashboard')}
              className="px-4 py-2 rounded text-sm bg-white text-gray-700 border hover:bg-gray-100 transition"
              style={styles.outfitFont}
            >
              Back to Dashboard
            </button>
          </div>

          {/* -----------------------------------------------------
             TAB BUTTONS
             -----------------------------------------------------
             PURPOSE:
             - Switches between All, Mine, and Completed views
             - Provides quick access to Add Initiative modal
          ----------------------------------------------------- */}
          <div className="flex gap-4">

            {/* All Initiatives */}
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded text-sm ${
                activeTab === 'all' ? 'bg-[#017ACB] text-white' : 'bg-white text-gray-700 border'
              }`}
              style={styles.outfitFont}
            >
              All Initiatives
            </button>

            {/* My Initiatives */}
            <button
              onClick={() => setActiveTab('mine')}
              className={`px-4 py-2 rounded text-sm ${
                activeTab === 'mine' ? 'bg-[#017ACB] text-white' : 'bg-white text-gray-700 border'
              }`}
              style={styles.outfitFont}
            >
              My Initiatives
            </button>

            {/* Completed */}
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded text-sm ${
                activeTab === 'completed' ? 'bg-[#017ACB] text-white' : 'bg-white text-gray-700 border'
              }`}
              style={styles.outfitFont}
            >
              Completed
            </button>

            {/* Add Initiative */}
            <button
              onClick={() => router.push('/Resource-Manager/create_edit_Initiatives/AddInitiative')}
              className="px-4 py-2 rounded text-sm bg-white text-gray-700 border hover:bg-gray-100 transition"
              style={styles.outfitFont}
            >
              + Add Initiative
            </button>

          </div>
        </div>

        {/* ---------------------------------------------------------
           INITIATIVES TABLE WRAPPER
           ---------------------------------------------------------
           PURPOSE:
           - Provides scrollable container for large datasets
           - Sticky header for visibility during scroll
           - Sticky left column for Edit button
        --------------------------------------------------------- */}
        <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">

            <table className="min-w-max w-full border-collapse">

              {/* -----------------------------------------------------
                 TABLE HEADER (sticky)
                 -----------------------------------------------------
                 PURPOSE:
                 - Displays column labels
                 - Contains sorting and filtering controls
              ----------------------------------------------------- */}
              <thead className="bg-[#017ACB] text-white sticky top-0 z-10">
                <tr>

                  {/* EDIT COLUMN (sticky left) */}
                  <th
                    className="sticky left-0 bg-[#017ACB] px-4 py-2 border text-sm font-semibold"
                    style={styles.outfitFont}
                  >
                    Edit
                  </th>

                  {/* -------------------------------------------------
                     PROJECT SORT COLUMN
                     -------------------------------------------------
                     PURPOSE:
                     - Displays project name
                     - Provides A→Z / Z→A sorting menu
                  ------------------------------------------------- */}
                  <th
                    className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                    style={styles.outfitFont}
                  >
                    <div className="flex justify-between items-center">
                      <span>Project</span>

                      {/* Sort dropdown trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.target.getBoundingClientRect();
                          setMenuPosition({ x: rect.left, y: rect.bottom });

                          // Toggle sort menu
                          setShowProjectSortMenu((prev) => !prev);

                          // Close all other menus
                          setShowCategoryMenu(false);
                          setShowStatusMenu(false);
                          setShowVPMenu(false);
                          setShowDeptMenu(false);
                          setShowLeadMenu(false);
                        }}
                        className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-gray-100 transition"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Sort dropdown menu */}
                    {showProjectSortMenu && (
                      <div
                        className="fixed bg-white text-black shadow-lg rounded w-40 z-50"
                        style={{ top: menuPosition.y, left: menuPosition.x }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-200 ${
                            projectSort === '' ? 'bg-gray-100 font-semibold' : ''
                          }`}
                          onClick={() => setProjectSort('')}
                        >
                          None
                        </div>

                        <div
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-200 ${
                            projectSort === 'asc' ? 'bg-gray-100 font-semibold' : ''
                          }`}
                          onClick={() => setProjectSort('asc')}
                        >
                          A → Z
                        </div>

                        <div
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-200 ${
                            projectSort === 'desc' ? 'bg-gray-100 font-semibold' : ''
                          }`}
                          onClick={() => setProjectSort('desc')}
                        >
                          Z → A
                        </div>
                      </div>
                    )}
                  </th>

                  {/* -------------------------------------------------
                     CATEGORY FILTER COLUMN
                     -------------------------------------------------
                     PURPOSE:
                     - Multi-select dropdown for filtering by category
                  ------------------------------------------------- */}
                  <th
                    className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                    style={styles.outfitFont}
                  >
                    <div className="flex justify-between items-center">
                      <span>Category</span>

                      {/* Category filter dropdown trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.target.getBoundingClientRect();

                          // Position dropdown under button
                          setMenuPosition({ x: rect.left, y: rect.bottom });

                          // Toggle category menu
                          setShowCategoryMenu((prev) => !prev);

                          // Close all other menus
                          setShowStatusMenu(false);
                          setShowVPMenu(false);
                          setShowDeptMenu(false);
                          setShowLeadMenu(false);
                          setShowProjectSortMenu(false);
                        }}
                        className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-gray-100 transition"
                      >
                        ▼
                      </button>
                    </div>

                  {/* -------------------------------------------------
                     CATEGORY DROPDOWN MENU
                     -------------------------------------------------
                     PURPOSE:
                     - Displays multi‑select options for Category filter
                     - Includes “All” option and individual categories
                  ------------------------------------------------- */}
                  {showCategoryMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* "All" option */}
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                          selectedCategories.length === 0 ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setSelectedCategories([])}
                      >
                        <input type="checkbox" checked={selectedCategories.length === 0} readOnly />
                        All
                      </div>

                      {/* Individual category options */}
                      {availableCategories.map((cat) => (
                        <div
                          key={cat}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
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

                {/* -------------------------------------------------
                   LEAD FILTER COLUMN
                   -------------------------------------------------
                   PURPOSE:
                   - Multi‑select dropdown for filtering by Lead
                ------------------------------------------------- */}
                <th
                  className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Lead</span>

                    {/* Lead filter dropdown trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.target.getBoundingClientRect();

                        // Position dropdown under button
                        setMenuPosition({ x: rect.left, y: rect.bottom });

                        // Toggle lead menu
                        setShowLeadMenu((prev) => !prev);

                        // Close all other menus
                        setShowCategoryMenu(false);
                        setShowStatusMenu(false);
                        setShowVPMenu(false);
                        setShowDeptMenu(false);
                        setShowProjectSortMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-gray-100 transition"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Lead dropdown menu */}
                  {showLeadMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* "All" option */}
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                          selectedLeads.length === 0 ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setSelectedLeads([])}
                      >
                        <input type="checkbox" checked={selectedLeads.length === 0} readOnly />
                        All
                      </div>

                      {/* Individual lead options */}
                      {availableLeads.map((lead) => (
                        <div
                          key={lead}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
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

                {/* -------------------------------------------------
                   STATUS FILTER COLUMN
                   -------------------------------------------------
                   PURPOSE:
                   - Multi‑select dropdown for filtering by Status
                ------------------------------------------------- */}
                <th
                  className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
                  style={styles.outfitFont}
                >
                  <div className="flex justify-between items-center">
                    <span>Status</span>

                    {/* Status filter dropdown trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.target.getBoundingClientRect();

                        // Position dropdown under button
                        setMenuPosition({ x: rect.left, y: rect.bottom });

                        // Toggle status menu
                        setShowStatusMenu((prev) => !prev);

                        // Close all other menus
                        setShowCategoryMenu(false);
                        setShowVPMenu(false);
                        setShowDeptMenu(false);
                        setShowLeadMenu(false);
                        setShowProjectSortMenu(false);
                      }}
                      className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-gray-100 transition"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Status dropdown menu */}
                  {showStatusMenu && (
                    <div
                      className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* "All" option */}
                      <div
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                          selectedStatuses.length === 0 ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => setSelectedStatuses([])}
                      >
                        <input type="checkbox" checked={selectedStatuses.length === 0} readOnly />
                        All
                      </div>

                  {/* -------------------------------------------------
                     INDIVIDUAL STATUS OPTIONS
                     -------------------------------------------------
                     PURPOSE:
                     - Renders each available status as a selectable
                       checkbox option within the Status filter menu
                  ------------------------------------------------- */}
                  {availableStatuses.map((status) => (
                    <div
                      key={status}
                      className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
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

            {/* -------------------------------------------------
               REQUESTOR COLUMN
               -------------------------------------------------
               PURPOSE:
               - Displays the Requestor name
               - No filtering applied to this column
            ------------------------------------------------- */}
            <th
              className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
              style={styles.outfitFont}
            >
              Requestor
            </th>

            {/* -------------------------------------------------
               REQUESTOR VP FILTER COLUMN
               -------------------------------------------------
               PURPOSE:
               - Multi‑select dropdown for filtering by Requestor VP
            ------------------------------------------------- */}
            <th
              className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
              style={styles.outfitFont}
            >
              <div className="flex justify-between items-center">
                <span>Requestor VP</span>

                {/* Dropdown trigger for VP filter */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent table click events
                    const rect = e.target.getBoundingClientRect();

                    // Position dropdown under the clicked button
                    setMenuPosition({ x: rect.left, y: rect.bottom });

                    // Toggle VP dropdown
                    setShowVPMenu((prev) => !prev);

                    // Close all other dropdowns
                    setShowCategoryMenu(false);
                    setShowStatusMenu(false);
                    setShowDeptMenu(false);
                    setShowLeadMenu(false);
                    setShowProjectSortMenu(false);
                  }}
                  className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-gray-100 transition"
                >
                  ▼
                </button>
              </div>

              {/* VP dropdown menu */}
              {showVPMenu && (
                <div
                  className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                  style={{ top: menuPosition.y, left: menuPosition.x }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* "All" option */}
                  <div
                    className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                      selectedVPs.length === 0 ? 'bg-gray-100 font-semibold' : ''
                    }`}
                    onClick={() => setSelectedVPs([])}
                  >
                    <input type="checkbox" checked={selectedVPs.length === 0} readOnly />
                    All
                  </div>

                  {/* -------------------------------------------------
                     INDIVIDUAL VP OPTIONS
                     -------------------------------------------------
                     PURPOSE:
                     - Renders each unique VP as a selectable option
                  ------------------------------------------------- */}
                  {availableVPs.map((vp) => (
                    <div
                      key={vp}
                      className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                        selectedVPs.includes(vp) ? 'bg-gray-100 font-semibold' : ''
                      }`}
                      onClick={() => toggleSelection(vp, setSelectedVPs, selectedVPs)}
                    >
                      <input type="checkbox" checked={selectedVPs.includes(vp)} readOnly />
                      {vp}
                    </div>
                  ))}
                </div>
              )}
            </th>

            {/* -------------------------------------------------
               REQUESTING DEPARTMENT FILTER COLUMN
               -------------------------------------------------
               PURPOSE:
               - Multi‑select dropdown for filtering by department
            ------------------------------------------------- */}
            <th
              className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
              style={styles.outfitFont}
            >
              <div className="flex justify-between items-center">
                <span>Requesting Dept</span>

                {/* Dropdown trigger for Department filter */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.target.getBoundingClientRect();

                    // Position dropdown under the clicked button
                    setMenuPosition({ x: rect.left, y: rect.bottom });

                    // Toggle department dropdown
                    setShowDeptMenu((prev) => !prev);

                    // Close all other dropdowns
                    setShowCategoryMenu(false);
                    setShowStatusMenu(false);
                    setShowVPMenu(false);
                    setShowLeadMenu(false);
                    setShowProjectSortMenu(false);
                  }}
                  className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-gray-100 transition"
                >
                  ▼
                </button>
              </div>

                {/* -------------------------------------------------
                   DEPARTMENT DROPDOWN MENU
                   -------------------------------------------------
                   PURPOSE:
                   - Displays multi‑select options for Requesting Dept
                   - Includes “All” option and individual departments
                ------------------------------------------------- */}
                {showDeptMenu && (
                  <div
                    className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
                    style={{ top: menuPosition.y, left: menuPosition.x }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* "All" option */}
                    <div
                      className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                        selectedDepts.length === 0 ? 'bg-gray-100 font-semibold' : ''
                      }`}
                      onClick={() => setSelectedDepts([])}
                    >
                      <input type="checkbox" checked={selectedDepts.length === 0} readOnly />
                      All
                    </div>

                    {/* Individual department options */}
                    {availableDepts.map((dept) => (
                      <div
                        key={dept}
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-200 flex items-center gap-2 ${
                          selectedDepts.includes(dept) ? 'bg-gray-100 font-semibold' : ''
                        }`}
                        onClick={() => toggleSelection(dept, setSelectedDepts, selectedDepts)}
                      >
                        <input type="checkbox" checked={selectedDepts.includes(dept)} readOnly />
                        {dept}
                      </div>
                    ))}
                  </div>
                )}
              </th>

              {/* -------------------------------------------------
                 COMPLETION DATE COLUMN
                 -------------------------------------------------
                 PURPOSE:
                 - Displays the initiative’s completion date
                 - Formatted safely using toLocaleDateString()
              ------------------------------------------------- */}
              <th
                className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
                style={styles.outfitFont}
              >
                Completion Date
              </th>

              {/* -------------------------------------------------
                 TARGET PERIOD COLUMN
                 -------------------------------------------------
                 PURPOSE:
                 - Displays the initiative’s target period value
              ------------------------------------------------- */}
              <th
                className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
                style={styles.outfitFont}
              >
                Target Period
              </th>

              {/* -------------------------------------------------
                 DESCRIPTION COLUMN
                 -------------------------------------------------
                 PURPOSE:
                 - Displays the initiative’s description text
              ------------------------------------------------- */}
              <th
                className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
                style={styles.outfitFont}
              >
                Description
              </th>

              {/* -------------------------------------------------
                 RESOURCE NOTES COLUMN
                 -------------------------------------------------
                 PURPOSE:
                 - Displays resource considerations / notes
              ------------------------------------------------- */}
              <th
                className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
                style={styles.outfitFont}
              >
                Resource Consideration
              </th>
            </tr>
          </thead>

          {/* ---------------------------------------------------------
             TABLE BODY — RENDERS EACH INITIATIVE ROW
             ---------------------------------------------------------
             PURPOSE:
             - Iterates through filteredInitiatives
             - Renders each initiative as a table row
             - Alternates row background for readability
             - Keeps Edit button column sticky on scroll
          --------------------------------------------------------- */}
          <tbody>
            {filteredInitiatives.map((item, index) => (
              <tr
                key={item.id}
                className={`hover:bg-black/5 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                {/* Sticky Edit Button (left column stays fixed while scrolling) */}
                <td className="sticky left-0 px-4 py-2 border bg-inherit text-black">
                  <button
                    onClick={() => handleEditInitiative(item.id)}
                    className="px-2 py-1 bg-[#017ACB] text-white text-xs rounded hover:bg-blue-700"
                    style={styles.outfitFont}
                  >
                    Edit
                  </button>
                </td>

                {/* Initiative fields */}
                <td className="px-4 py-2 border text-sm text-black">{item.project}</td>
                <td className="px-4 py-2 border text-sm text-black">{item.category}</td>
                <td className="px-4 py-2 border text-sm text-black">{item.lead}</td>
                <td className="px-4 py-2 border text-sm text-black">{item.status}</td>
                <td className="px-4 py-2 border text-sm text-black">{item.requestor}</td>
                <td className="px-4 py-2 border text-sm text-black">{item.requestor_vp}</td>
                <td className="px-4 py-2 border text-sm text-black">{item.requesting_dept}</td>

                {/* Completion date formatted safely */}
                <td className="px-4 py-2 border text-sm text-black">
                  {item.completion_date
                    ? new Date(item.completion_date).toLocaleDateString()
                    : ''}
                </td>

                <td className="px-4 py-2 border text-sm text-black">{item.target_period}</td>
                <td className="px-4 py-2 border text-sm text-black">{item.description}</td>
                <td className="px-4 py-2 border text-sm text-black">
                  {item.resource_consideration}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </main>
</div>
);
}