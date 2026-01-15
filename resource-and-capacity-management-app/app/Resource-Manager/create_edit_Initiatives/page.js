'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function InitiativesPage() {
  const router = useRouter();

  /* ---------------------------------------------------------
     STATE MANAGEMENT
     ---------------------------------------------------------
     - user: stores logged‑in user info from localStorage
     - activeTab: controls filtering (all / mine / completed)
     - initiatives: raw dataset (mock for now, DB later)
     - filteredInitiatives: table-ready filtered list
  --------------------------------------------------------- */
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [initiatives, setInitiatives] = useState([]);
  const [filteredInitiatives, setFilteredInitiatives] = useState([]);

  /* ---------------------------------------------------------
     USER SESSION LOADING
     ---------------------------------------------------------
     Purpose:
     - Ensures only authenticated users can access this page
     - Redirects to login if no user session is found
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
     MOCK DATA (TEMPORARY UNTIL DB INTEGRATION)
     ---------------------------------------------------------
     Purpose:
     - Provides placeholder initiative data for UI development
     - Will be replaced with MongoDB fetch once backend is ready
  --------------------------------------------------------- */
  useEffect(() => {
    const mockData = [
      {
        id: 1,
        project: 'CDA Replacement',
        category: 'Strategic',
        lead: 'Charlotte Nguyen',
        status: 'Backlog',
        requestor: 'Sophia Grant',
        requestor_vp: 'Lauren Mitchell',
        requesting_dept: 'IT',
        completion_date: '',
        target_period: 'Q1 2026',
        description: 'Replace legacy CDA system with vendor-supported streaming architecture.',
        resource_consideration: 'Requires 2 backend engineers and 1 data architect.'
      },
      {
        id: 2,
        project: 'Marketplace Expansion',
        category: 'Strategic',
        lead: 'Charlotte Nguyen',
        status: 'Completed',
        requestor: 'Jane Kraft',
        requestor_vp: 'Victoria Hayes',
        requesting_dept: 'Data & Analytics Office',
        completion_date: 'Dec-2025',
        target_period: 'Jan–Dec 2025',
        description: 'Expand Marketplace content and automate onboarding workflows.',
        resource_consideration: 'Completed using existing D&A team capacity.'
      },
      {
        id: 3,
        project: 'Valuation Line - Claims',
        category: 'Strategic',
        lead: 'Charlotte Nguyen',
        status: 'Completed',
        requestor: 'Greg Walters',
        requestor_vp: 'Jonathan Reid',
        requesting_dept: 'Finance',
        completion_date: 'Jun-2025',
        target_period: 'Apr–Jun 2025',
        description: 'Implement matrix logic for valuation line reporting in claims.',
        resource_consideration: 'Requires actuarial SME and 1 reporting analyst.'
      },
      {
        id: 4,
        project: 'Data Governance Portal',
        category: 'Baseline',
        lead: 'Jackson Lee',
        status: 'In Process',
        requestor: 'Amira Patel',
        requestor_vp: 'David Chen',
        requesting_dept: 'Compliance',
        completion_date: '',
        target_period: 'Feb–Aug 2026',
        description: 'Build centralized portal for data governance policies and approvals.',
        resource_consideration: 'Needs 1 frontend dev, 1 backend dev, and 1 UX designer.'
      },
      {
        id: 5,
        project: 'Claims Audit Automation',
        category: 'Discretionary',
        lead: 'Jackson Lee',
        status: 'On Hold',
        requestor: 'Liam Brooks',
        requestor_vp: 'Natalie Singh',
        requesting_dept: 'Audit',
        completion_date: '',
        target_period: 'TBD',
        description: 'Automate sampling and audit trail generation for claims review.',
        resource_consideration: 'Pending approval for 2 automation engineers.'
      }
    ];

    setInitiatives(mockData);
  }, []);

  /* ---------------------------------------------------------
     FILTERING LOGIC
     ---------------------------------------------------------
     Purpose:
     - Applies tab-based filtering to initiatives
     - "all"       → all non-completed initiatives
     - "mine"      → initiatives where user is the lead
     - "completed" → completed initiatives only

     Notes:
     - This logic will remain identical when DB data replaces mock data
  --------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    let filtered = [...initiatives];

    if (activeTab === 'mine') {
      filtered = filtered.filter(
        (i) => i.lead === user.username && i.status !== 'Completed'
      );
    } else if (activeTab === 'completed') {
      filtered = filtered.filter((i) => i.status === 'Completed');
    } else if (activeTab === 'all') {
      filtered = filtered.filter((i) => i.status !== 'Completed');
    }

    setFilteredInitiatives(filtered);
  }, [activeTab, initiatives, user]);

  /* ---------------------------------------------------------
     NAVIGATION HANDLERS
     ---------------------------------------------------------
     - handleAddInitiative: navigates to creation form
     - handleEditInitiative: navigates to edit form with ID
  --------------------------------------------------------- */
  const handleAddInitiative = () => {
    router.push('/Resource-Manager/create_edit_Initiatives');
  };

  const handleEditInitiative = (id) => {
    router.push(`/Resource-Manager/create_edit_Initiatives/EditButton?id=${id}`);
  };

  /* ---------------------------------------------------------
     LOADING STATE
     ---------------------------------------------------------
     Purpose:
     - Displays a loading spinner while user session loads
  --------------------------------------------------------- */
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     MAIN PAGE RENDER
     ---------------------------------------------------------
     Purpose:
     - Renders header, filters, and initiatives table
     - Table is fully dynamic based on filteredInitiatives
  --------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">

      {/* -----------------------------------------------------
         HEADER BAR
         -----------------------------------------------------
         - Displays logo, title, and user profile access
      ----------------------------------------------------- */}
      <header className="bg-[#017ACB] shadow-sm relative">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 relative">

            {/* Logo + Home Navigation */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => router.push('/Resource-Manager/dashboard')}
            >
              <img src="/CapstoneDynamicsLogo.png" alt="Logo" className="h-12 w-auto" />
              <div className="flex flex-col ml-3">
                <h1 className="text-2xl font-bold text-white" style={styles.outfitFont}>
                  Capstone Dynamics
                </h1>
              </div>
            </div>

            {/* Centered Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
              <h1 className="text-xl font-bold text-white" style={styles.outfitFont}>
                Resource &amp; Capacity Management Planner
              </h1>
            </div>

            {/* User Profile Access */}
            <div className="flex items-center gap-4">
              <span className="text-white font-semibold" style={styles.outfitFont}>
                {user?.username || ''}
              </span>

              <div
                onClick={() => router.push('/Resource-Manager/Profile/view-profile')}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center cursor-pointer hover:opacity-90 transition"
              >
                <span className="text-[#017ACB] font-bold text-lg">
                  {user?.username?.charAt(0)?.toUpperCase() || ''}
                </span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* -----------------------------------------------------
         MAIN CONTENT AREA
         ----------------------------------------------------- */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* -----------------------------------------------------
           PAGE TITLE + FILTER BUTTONS
           -----------------------------------------------------
           - Controls which initiatives appear in the table
        ----------------------------------------------------- */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-4xl font-bold text-gray-900" style={styles.outfitFont}>
            Initiatives
          </h2>

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

            {/* Completed Initiatives */}
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded text-sm ${
                activeTab === 'completed' ? 'bg-[#017ACB] text-white' : 'bg-white text-gray-700 border'
              }`}
              style={styles.outfitFont}
            >
              Completed
            </button>

            {/* Add New Initiative */}
            <button
              onClick={handleAddInitiative}
              className="px-4 py-2 bg-[#017ACB] text-white rounded hover:bg-blue-700 transition text-sm"
              style={styles.outfitFont}
            >
              + Add Initiative
            </button>
          </div>
        </div>

        {/* -----------------------------------------------------
           INITIATIVES TABLE
           -----------------------------------------------------
           - Displays filtered initiatives
           - Edit column is sticky for usability
        ----------------------------------------------------- */}
        <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
          <table className="min-w-max w-full border-collapse">
            <thead className="bg-[#017ACB] text-white">
              <tr>
                <th className="sticky left-0 bg-[#017ACB] px-4 py-2 border text-sm font-semibold" style={styles.outfitFont}>
                  Edit
                </th>
                <th className="px-4 py-2 border text-sm font-semibold" style={styles.outfitFont}>Project</th>
                <th className="px-4 py-2 border text-sm font-semibold" style={styles.outfitFont}>Category</th>
                <th className="px-4 py-2 border text-sm font-semibold" style={styles.outfitFont}>Lead</th>
                <th className="px-4 py-2 border text-sm font-semibold" style={styles.outfitFont}>Status</th>
                <th className="px-4 py-2 border text-sm font-semibold" style={styles.outfitFont}>Requestor</th>
                <th className="px-4 py-2 border text-sm font-semibold" style={styles.outfitFont}>Requestor VP</th>
                <th className="px-4 py-2 border text-sm font-semibold" style={styles.outfitFont}>Requesting Dept</th>
                <th className="px-4 py-2 border text-sm font-semibold" style={styles.outfitFont}>Completion Date</th>
                <th className="px-4 py-2 border text-sm font-semibold" style={styles.outfitFont}>Target Period</th>
                <th className="px-4 py-2 border text-sm font-semibold" style={styles.outfitFont}>Description</th>
                <th className="px-4 py-2 border text-sm font-semibold" style={styles.outfitFont}>Resource Consideration</th>
              </tr>
            </thead>

            <tbody>
              {filteredInitiatives.map((item, index) => (
                <tr
                  key={item.id}
                  className={`hover:bg-black/5 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  {/* Sticky Edit Button */}
                  <td className="sticky left-0 px-4 py-2 border bg-inherit text-black">
                    <button
                      onClick={() => handleEditInitiative(item.id)}
                      className="px-2 py-1 bg-[#017ACB] text-white text-xs rounded hover:bg-blue-700"
                      style={styles.outfitFont}
                    >
                      Edit
                    </button>
                  </td>

                  {/* Data Columns */}
                  <td className="px-4 py-2 border text-sm text-black" style={styles.outfitFont}>{item.project}</td>
                  <td className="px-4 py-2 border text-sm text-black" style={styles.outfitFont}>{item.category}</td>
                  <td className="px-4 py-2 border text-sm text-black" style={styles.outfitFont}>{item.lead}</td>
                  <td className="px-4 py-2 border text-sm text-black" style={styles.outfitFont}>{item.status}</td>
                  <td className="px-4 py-2 border text-sm text-black" style={styles.outfitFont}>{item.requestor}</td>
                  <td className="px-4 py-2 border text-sm text-black" style={styles.outfitFont}>{item.requestor_vp}</td>
                  <td className="px-4 py-2 border text-sm text-black" style={styles.outfitFont}>{item.requesting_dept}</td>
                  <td className="px-4 py-2 border text-sm text-black" style={styles.outfitFont}>{item.completion_date}</td>
                  <td className="px-4 py-2 border text-sm text-black" style={styles.outfitFont}>{item.target_period}</td>
                  <td className="px-4 py-2 border text-sm text-black" style={styles.outfitFont}>{item.description}</td>
                  <td className="px-4 py-2 border text-sm text-black" style={styles.outfitFont}>{item.resource_consideration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}