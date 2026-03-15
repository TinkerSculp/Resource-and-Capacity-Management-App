// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';

// const styles = {
//   outfitFont: { fontFamily: 'Outfit, sans-serif' }
// };

// // Strict sanitization
// function sanitizeText(value) {
//   if (typeof value !== 'string') return '';
//   return value
//     .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
//     .replace(/<[^>]*>/g, '')
//     .replace(/script|onerror|onload|javascript:/gi, '')
//     .trim();
// }

// // Validate user object
// function isValidUser(user) {
//   return user && typeof user.username === 'string' && user.username.trim();
// }

// // Validate initiative object
// function isValidInitiative(item) {
//   return item && item._id;
// }

// export default function InitiativesPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const refresh = searchParams.get('refresh');

//   // User + view state
//   const [user, setUser] = useState(null);
//   const [activeTab, setActiveTab] = useState('all');

//   // Initiatives
//   const [initiatives, setInitiatives] = useState([]);
//   const [mine, setMine] = useState([]);
//   const [filteredInitiatives, setFilteredInitiatives] = useState([]);

//   // Filters
//   const [selectedCategories, setSelectedCategories] = useState([]);
//   const [selectedStatuses, setSelectedStatuses] = useState([]);
//   const [selectedVPs, setSelectedVPs] = useState([]);
//   const [selectedDepts, setSelectedDepts] = useState([]);
//   const [selectedLeads, setSelectedLeads] = useState([]);
//   const [selectedRequestors, setSelectedRequestors] = useState([]);
//   const [selectedProjects, setSelectedProjects] = useState([]);

//   // Sorting
//   const [projectSort, setProjectSort] = useState('');
//   const [showProjectSortMenu, setShowProjectSortMenu] = useState(false);

//   // Dropdown visibility
//   const [showCategoryMenu, setShowCategoryMenu] = useState(false);
//   const [showStatusMenu, setShowStatusMenu] = useState(false);
//   const [showVPMenu, setShowVPMenu] = useState(false);
//   const [showDeptMenu, setShowDeptMenu] = useState(false);
//   const [showLeadMenu, setShowLeadMenu] = useState(false);
//   const [showRequestorMenu, setShowRequestorMenu] = useState(false);

//   // Dropdown positioning
//   const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

//   // Available filter values
//   const [availableCategories, setAvailableCategories] = useState([]);
//   const [availableStatuses, setAvailableStatuses] = useState([]);
//   const [availableVPs, setAvailableVPs] = useState([]);
//   const [availableDepts, setAvailableDepts] = useState([]);
//   const [availableLeads, setAvailableLeads] = useState([]);
//   const [availableRequestors, setAvailableRequestors] = useState([]);
//   const [availableProjects, setAvailableProjects] = useState([]);

//   // Load user
//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem('user');
//       if (!raw) return router.push('/resource-and-capacity-management-app/frontend/app/login');

//       const parsed = JSON.parse(raw);
//       if (!isValidUser(parsed)) return router.push('/resource-and-capacity-management-app/frontend/app/login');

//       setUser(parsed);
//     } catch {
//       router.push('/resource-and-capacity-management-app/frontend/app/login');
//     }
//   }, [router]);

//   // Fetch initiatives
//   useEffect(() => {
//     if (!user) return;

//     let aborted = false;

//     async function fetchInitiatives() {
//       try {
//         const url = `http://localhost:3001/api/initiatives?username=${encodeURIComponent(
//           user.username
//         )}&ts=${Date.now()}`;

//         const res = await fetch(url, {
//           method: 'GET',
//           headers: {
//             'Content-Type': 'application/json',
//             'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
//             Pragma: 'no-cache',
//             Expires: '0'
//           }
//         });

//         if (!res.ok) return;

//         const data = await res.json();
//         if (!data) return;

//         const safeMap = (items) =>
//           Array.isArray(items)
//             ? items
//                 .filter(isValidInitiative)
//                 .map((item) => ({
//                   id: sanitizeText(String(item._id)),
//                   project: sanitizeText(item.project_name),
//                   category: sanitizeText(item.category),
//                   lead: sanitizeText(item.leader),
//                   status: sanitizeText(item.status),
//                   requestor: sanitizeText(item.requestor),
//                   requestor_vp: sanitizeText(item.requestor_vp),
//                   requesting_dept: sanitizeText(item.requesting_dept),
//                   completion_date: item.completion_date || null,
//                   target_period: sanitizeText(item.target_period),
//                   description: sanitizeText(item.description),
//                   resource_consideration: sanitizeText(item.resource_notes)
//                 }))
//             : [];

//         const mappedAll = safeMap(data.allAssignments || []);
//         const mappedMine = safeMap(data.myInitiatives || []);

//         if (aborted) return;

//         setInitiatives(mappedAll);
//         setMine(mappedMine);
//         setFilteredInitiatives(mappedAll);

//         setAvailableCategories([...new Set(mappedAll.map(i => i.category).filter(Boolean))]);
//         setAvailableStatuses([...new Set(mappedAll.map(i => i.status).filter(Boolean))]);
//         setAvailableVPs([...new Set(mappedAll.map(i => i.requestor_vp).filter(Boolean))]);
//         setAvailableDepts([...new Set(mappedAll.map(i => i.requesting_dept).filter(Boolean))]);
//         setAvailableLeads([...new Set(mappedAll.map(i => i.lead).filter(Boolean))]);
//         setAvailableRequestors([...new Set(mappedAll.map(i => i.requestor).filter(Boolean))]);
//         setAvailableProjects([...new Set(mappedAll.map(i => i.project).filter(Boolean))]);
//       } catch (err) {
//         console.error('Fetch error:', err);
//       }
//     }

//     fetchInitiatives();
//     return () => (aborted = true);
//   }, [user, refresh]);

//   // Apply filters + sorting
//   useEffect(() => {
//     if (!user) return;

//     const base =
//       activeTab === 'mine'
//         ? mine
//         : activeTab === 'completed'
//         ? initiatives.filter(i => i.status === 'Completed')
//         : initiatives.filter(i => i.status !== 'Completed');

//     let filtered = base.filter((i) =>
//       (selectedCategories.length ? selectedCategories.includes(i.category) : true) &&
//       (selectedStatuses.length ? selectedStatuses.includes(i.status) : true) &&
//       (selectedVPs.length ? selectedVPs.includes(i.requestor_vp) : true) &&
//       (selectedDepts.length ? selectedDepts.includes(i.requesting_dept) : true) &&
//       (selectedLeads.length ? selectedLeads.includes(i.lead) : true) &&
//       (selectedRequestors.length ? selectedRequestors.includes(i.requestor) : true) &&
//       (selectedProjects.length ? selectedProjects.includes(i.project) : true)
//     );

//     if (projectSort === 'asc') filtered = [...filtered].sort((a, b) => a.project.localeCompare(b.project));
//     if (projectSort === 'desc') filtered = [...filtered].sort((a, b) => b.project.localeCompare(a.project));

//     setFilteredInitiatives(filtered);
//   }, [
//     activeTab,
//     initiatives,
//     mine,
//     user,
//     selectedCategories,
//     selectedStatuses,
//     selectedVPs,
//     selectedDepts,
//     selectedLeads,
//     selectedRequestors,
//     selectedProjects,
//     projectSort
//   ]);

//   // Toggle helper
//   const toggleSelection = (value, setFn, current) => {
//     if (!value) return;
//     setFn(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
//   };

//   // Close dropdowns
//   useEffect(() => {
//     const closeAll = () => {
//       setShowCategoryMenu(false);
//       setShowStatusMenu(false);
//       setShowVPMenu(false);
//       setShowDeptMenu(false);
//       setShowLeadMenu(false);
//       setShowProjectSortMenu(false);
//       setShowRequestorMenu(false);
//     };
//     window.addEventListener('click', closeAll);
//     return () => window.removeEventListener('click', closeAll);
//   }, []);


//   if (!user) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   return (
//     <>
//       {/* HEADER */}
//       <div className="flex items-center justify-between mb-6">
//         <div className="flex items-center gap-4">
//           <h2 className="text-4xl font-bold text-gray-900" style={styles.outfitFont}>
//             Initiatives
//           </h2>

//           <button
//             onClick={() => router.push('/resource-manager/dashboard')}
//             className="px-4 py-2 rounded text-sm bg-white text-gray-700 border hover:bg-[#017ACB]/20 transition"
//             style={styles.outfitFont}
//           >
//             Back to Dashboard
//           </button>
//         </div>

//         <div className="flex items-center gap-3">
//           <button
//             onClick={() => setActiveTab('all')}
//             className={`px-4 py-2 rounded text-sm transition ${
//               activeTab === 'all'
//                 ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20'
//                 : 'bg-white text-gray-700 border hover:bg-[#017ACB]/20'
//             }`}
//             style={styles.outfitFont}
//           >
//             All Initiatives
//           </button>

//           <button
//             onClick={() => setActiveTab('mine')}
//             className={`px-4 py-2 rounded text-sm transition ${
//               activeTab === 'mine'
//                 ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20'
//                 : 'bg-white text-gray-700 border hover:bg-[#017ACB]/20'
//             }`}
//             style={styles.outfitFont}
//           >
//             My Initiatives
//           </button>

//           <button
//             onClick={() => setActiveTab('completed')}
//             className={`px-4 py-2 rounded text-sm transition ${
//               activeTab === 'completed'
//                 ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20'
//                 : 'bg-white text-gray-700 border hover:bg-[#017ACB]/20'
//             }`}
//             style={styles.outfitFont}
//           >
//             Completed
//           </button>

        
//         </div>
//       </div>

//       {/* TABLE */}
//       <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
//         <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
//           <table className="min-w-max w-full border-collapse">
//             <thead className="bg-[#017ACB] text-white sticky top-0 z-10">
//               <tr>

             

//                 {/* PROJECT */}
//                 <th
//                   className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
//                   style={styles.outfitFont}
//                 >
//                   <div className="flex justify-between items-center">
//                     <span>Project</span>
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         const rect = e.target.getBoundingClientRect();
//                         setMenuPosition({ x: rect.left, y: rect.bottom });
//                         setShowProjectSortMenu(prev => !prev);
//                         setShowCategoryMenu(false);
//                         setShowStatusMenu(false);
//                         setShowVPMenu(false);
//                         setShowDeptMenu(false);
//                         setShowLeadMenu(false);
//                         setShowRequestorMenu(false);
//                       }}
//                       className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition"
//                     >
//                       ▼
//                     </button>
//                   </div>

//                   {showProjectSortMenu && (
//                     <div
//                       className="fixed bg-white text-black shadow-lg rounded w-56 z-50"
//                       style={{ top: menuPosition.y, left: menuPosition.x }}
//                       onClick={(e) => e.stopPropagation()}
//                     >
//                       <div className="px-3 py-2 text-xs font-semibold text-gray-500">
//                         Sort by project
//                       </div>

                     

//                       <div
//                         className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
//                           projectSort === 'asc' ? 'bg-gray-100 font-semibold' : ''
//                         }`}
//                         onClick={() => setProjectSort('asc')}
//                       >
//                         A → Z
//                       </div>

//                       <div
//                         className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
//                           projectSort === 'desc' ? 'bg-gray-100 font-semibold' : ''
//                         }`}
//                         onClick={() => setProjectSort('desc')}
//                       >
//                         Z → A
//                       </div>

//                       <div className="border-t mt-1 pt-1 px-3 py-2 text-xs font-semibold text-gray-500">
//                         Filter by project
//                       </div>

//                       <div
//                         className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                           selectedProjects.length === 0 ? 'bg-gray-100 font-semibold' : ''
//                         }`}
//                         onClick={() => setSelectedProjects([])}
//                       >
//                         <input type="checkbox" checked={selectedProjects.length === 0} readOnly />
//                         All
//                       </div>

//                       {availableProjects.map((proj) => (
//                         <div
//                           key={proj}
//                           className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                             selectedProjects.includes(proj) ? 'bg-gray-100 font-semibold' : ''
//                           }`}
//                           onClick={() =>
//                             toggleSelection(proj, setSelectedProjects, selectedProjects)
//                           }
//                         >
//                           <input type="checkbox" checked={selectedProjects.includes(proj)} readOnly />
//                           {proj}
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </th>

//                 {/* CATEGORY */}
//                 <th
//                   className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
//                   style={styles.outfitFont}
//                 >
//                   <div className="flex justify-between items-center">
//                     <span>Category</span>
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         const rect = e.target.getBoundingClientRect();
//                         setMenuPosition({ x: rect.left, y: rect.bottom });
//                         setShowCategoryMenu(prev => !prev);
//                         setShowStatusMenu(false);
//                         setShowVPMenu(false);
//                         setShowDeptMenu(false);
//                         setShowLeadMenu(false);
//                         setShowProjectSortMenu(false);
//                         setShowRequestorMenu(false);
//                       }}
//                       className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition"
//                     >
//                       ▼
//                     </button>
//                   </div>

//                   {showCategoryMenu && (
//                     <div
//                       className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
//                       style={{ top: menuPosition.y, left: menuPosition.x }}
//                       onClick={(e) => e.stopPropagation()}
//                     >
//                       <div
//                         className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                           selectedCategories.length === 0 ? 'bg-gray-100 font-semibold' : ''
//                         }`}
//                         onClick={() => setSelectedCategories([])}
//                       >
//                         <input type="checkbox" checked={selectedCategories.length === 0} readOnly />
//                         All
//                       </div>

//                       {availableCategories.map((cat) => (
//                         <div
//                           key={cat}
//                           className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                             selectedCategories.includes(cat) ? 'bg-gray-100 font-semibold' : ''
//                           }`}
//                           onClick={() =>
//                             toggleSelection(cat, setSelectedCategories, selectedCategories)
//                           }
//                         >
//                           <input type="checkbox" checked={selectedCategories.includes(cat)} readOnly />
//                           {cat}
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </th>

//                 {/* LEADER */}
//                 <th
//                   className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
//                   style={styles.outfitFont}
//                 >
//                 <div className="flex justify-between items-center">
//                   <span>Leader Accountable</span>
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       const rect = e.target.getBoundingClientRect();
//                       setMenuPosition({ x: rect.left, y: rect.bottom });

//                       setShowLeadMenu(prev => !prev);
//                       setShowCategoryMenu(false);
//                       setShowStatusMenu(false);
//                       setShowVPMenu(false);
//                       setShowDeptMenu(false);
//                       setShowProjectSortMenu(false);
//                       setShowRequestorMenu(false);
//                     }}
//                     className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition"
//                   >
//                     ▼
//                   </button>
//                 </div>

//                   {showLeadMenu && (
//                     <div
//                       className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
//                       style={{ top: menuPosition.y, left: menuPosition.x }}
//                       onClick={(e) => e.stopPropagation()}
//                     >
//                       <div
//                         className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                           selectedLeads.length === 0 ? 'bg-gray-100 font-semibold' : ''
//                         }`}
//                         onClick={() => setSelectedLeads([])}
//                       >
//                         <input type="checkbox" checked={selectedLeads.length === 0} readOnly />
//                         All
//                       </div>

//                       {availableLeads.map((lead) => (
//                         <div
//                           key={lead}
//                           className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                             selectedLeads.includes(lead) ? 'bg-gray-100 font-semibold' : ''
//                           }`}
//                           onClick={() =>
//                             toggleSelection(lead, setSelectedLeads, selectedLeads)
//                           }
//                         >
//                           <input type="checkbox" checked={selectedLeads.includes(lead)} readOnly />
//                           {lead}
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </th>

//                 {/* STATUS */}
//                 <th
//                   className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
//                   style={styles.outfitFont}
//                 >
//                   <div className="flex justify-between items-center">
//                     <span>Status</span>
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         const rect = e.target.getBoundingClientRect();
//                         setMenuPosition({ x: rect.left, y: rect.bottom });
//                         setShowStatusMenu(prev => !prev);
//                         setShowCategoryMenu(false);
//                         setShowVPMenu(false);
//                         setShowDeptMenu(false);
//                         setShowLeadMenu(false);
//                         setShowProjectSortMenu(false);
//                         setShowRequestorMenu(false);
//                       }}
//                       className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#CDE6F7] transition"
//                     >
//                       ▼
//                     </button>
//                   </div>

//                   {showStatusMenu && (
//                     <div
//                       className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
//                       style={{ top: menuPosition.y, left: menuPosition.x }}
//                       onClick={(e) => e.stopPropagation()}
//                     >
//                       <div
//                         className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                           selectedStatuses.length === 0 ? 'bg-gray-100 font-semibold' : ''
//                         }`}
//                         onClick={() => setSelectedStatuses([])}
//                       >
//                         <input type="checkbox" checked={selectedStatuses.length === 0} readOnly />
//                         All
//                       </div>

//                       {availableStatuses.map((status) => (
//                         <div
//                           key={status}
//                           className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                             selectedStatuses.includes(status) ? 'bg-gray-100 font-semibold' : ''
//                           }`}
//                           onClick={() =>
//                             toggleSelection(status, setSelectedStatuses, selectedStatuses)
//                           }
//                         >
//                           <input type="checkbox" checked={selectedStatuses.includes(status)} readOnly />
//                           {status}
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </th>

//                 {/* REQUESTOR */}
//                 <th
//                   className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
//                   style={styles.outfitFont}
//                 >
//                   <div className="flex justify-between items-center">
//                     <span>Requestor</span>
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         const rect = e.target.getBoundingClientRect();
//                         setMenuPosition({ x: rect.left, y: rect.bottom });
//                         setShowRequestorMenu(prev => !prev);
//                         setShowCategoryMenu(false);
//                         setShowStatusMenu(false);
//                         setShowVPMenu(false);
//                         setShowDeptMenu(false);
//                         setShowLeadMenu(false);
//                         setShowProjectSortMenu(false);
//                       }}
//                       className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#017ACB]/20 transition"
//                     >
//                       ▼
//                     </button>
//                   </div>

//                   {showRequestorMenu && (
//                     <div
//                       className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
//                       style={{ top: menuPosition.y, left: menuPosition.x }}
//                       onClick={(e) => e.stopPropagation()}
//                     >
//                       <div
//                         className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                           selectedRequestors.length === 0 ? 'bg-gray-100 font-semibold' : ''
//                         }`}
//                         onClick={() => setSelectedRequestors([])}
//                       >
//                         <input type="checkbox" checked={selectedRequestors.length === 0} readOnly />
//                         All
//                       </div>

//                       {availableRequestors.map((req) => (
//                         <div
//                           key={req}
//                           className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                             selectedRequestors.includes(req) ? 'bg-gray-100 font-semibold' : ''
//                           }`}
//                           onClick={() =>
//                             toggleSelection(req, setSelectedRequestors, selectedRequestors)
//                           }
//                         >
//                           <input type="checkbox" checked={selectedRequestors.includes(req)} readOnly />
//                           {req}
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </th>

//                 {/* REQUESTOR VP */}
//                 <th
//                   className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
//                   style={styles.outfitFont}
//                 >
//                   <div className="flex justify-between items-center">
//                     <span>Requestor VP</span>
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         const rect = e.target.getBoundingClientRect();
//                         setMenuPosition({ x: rect.left, y: rect.bottom });
//                         setShowVPMenu(prev => !prev);
//                         setShowCategoryMenu(false);
//                         setShowStatusMenu(false);
//                         setShowDeptMenu(false);
//                         setShowLeadMenu(false);
//                         setShowProjectSortMenu(false);
//                         setShowRequestorMenu(false);
//                       }}
//                       className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#017ACB]/20 transition"
//                     >
//                       ▼
//                     </button>
//                   </div>

//                   {showVPMenu && (
//                     <div
//                       className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
//                       style={{ top: menuPosition.y, left: menuPosition.x }}
//                       onClick={(e) => e.stopPropagation()}
//                     >
//                       <div
//                         className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                           selectedVPs.length === 0 ? 'bg-gray-100 font-semibold' : ''
//                         }`}
//                         onClick={() => setSelectedVPs([])}
//                       >
//                         <input type="checkbox" checked={selectedVPs.length === 0} readOnly />
//                         All
//                       </div>

//                       {availableVPs.map((vp) => (
//                         <div
//                           key={vp}
//                           className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                             selectedVPs.includes(vp) ? 'bg-gray-100 font-semibold' : ''
//                           }`}
//                           onClick={() =>
//                             toggleSelection(vp, setSelectedVPs, selectedVPs)
//                           }
//                         >
//                           <input type="checkbox" checked={selectedVPs.includes(vp)} readOnly />
//                           {vp}
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </th>

//                 {/* REQUESTING DEPT */}
//                 <th
//                   className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap"
//                   style={styles.outfitFont}
//                 >
//                   <div className="flex justify-between items-center">
//                     <span>Requesting Dept</span>
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         const rect = e.target.getBoundingClientRect();
//                         setMenuPosition({ x: rect.left, y: rect.bottom });
//                         setShowDeptMenu(prev => !prev);
//                         setShowCategoryMenu(false);
//                         setShowStatusMenu(false);
//                         setShowVPMenu(false);
//                         setShowLeadMenu(false);
//                         setShowProjectSortMenu(false);
//                         setShowRequestorMenu(false);
//                       }}
//                       className="ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold hover:bg-[#017ACB]/20 transition"
//                     >
//                       ▼
//                     </button>
//                   </div>

//                   {showDeptMenu && (
//                     <div
//                       className="fixed bg-white text-black shadow-lg rounded w-48 z-50"
//                       style={{ top: menuPosition.y, left: menuPosition.x }}
//                       onClick={(e) => e.stopPropagation()}
//                     >
//                       <div
//                         className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                           selectedDepts.length === 0 ? 'bg-gray-100 font-semibold' : ''
//                         }`}
//                         onClick={() => setSelectedDepts([])}
//                       >
//                         <input type="checkbox" checked={selectedDepts.length === 0} readOnly />
//                         All
//                       </div>

//                       {availableDepts.map((dept) => (
//                         <div
//                           key={dept}
//                           className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 flex items-center gap-2 ${
//                             selectedDepts.includes(dept) ? 'bg-gray-100 font-semibold' : ''
//                           }`}
//                           onClick={() =>
//                             toggleSelection(dept, setSelectedDepts, selectedDepts)
//                           }
//                         >
//                           <input type="checkbox" checked={selectedDepts.includes(dept)} readOnly />
//                           {dept}
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </th>

//                 {/* COMPLETION DATE */}
//                 <th
//                   className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
//                   style={styles.outfitFont}
//                 >
//                   Completion Date
//                 </th>

//                 {/* TARGET PERIOD */}
//                 <th
//                   className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
//                   style={styles.outfitFont}
//                 >
//                   Target Period
//                 </th>

//                 {/* DESCRIPTION */}
//                 <th
//                   className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
//                   style={styles.outfitFont}
//                 >
//                   Description
//                 </th>

//                 {/* RESOURCE NOTES */}
//                 <th
//                   className="px-4 py-2 border text-sm font-semibold whitespace-nowrap"
//                   style={styles.outfitFont}
//                 >
//                   Resource Consideration
//                 </th>

//               </tr>
//             </thead>

//             {/* BODY */}
//             <tbody>
//               {filteredInitiatives.map((item, index) => (
//                 <tr
//                   key={item.id}
//                   className={`hover:bg-[#017ACB]/20 ${
//                     index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
//                   }`}
//                 >
                  

//                   {/* NORMAL SCROLLING COLUMNS */}
//                   <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.project}</td>
//                   <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.category}</td>
//                   <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.lead}</td>
//                   <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.status}</td>
//                   <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.requestor}</td>
//                   <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.requestor_vp}</td>
//                   <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.requesting_dept}</td>

//                   <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
//                     {item.completion_date
//                       ? new Date(item.completion_date).toLocaleDateString()
//                       : ''}
//                   </td>

//                   <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.target_period}</td>
//                   <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">{item.description}</td>
//                   <td className="px-4 py-2 border text-sm text-black whitespace-nowrap">
//                     {item.resource_consideration}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>

//           </table>
//         </div>
//       </div>
//     </>
//   );
// }

'use client';

/* =============================================================================
   StakeholderInitiativesPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Read-only initiatives view for Stakeholder users. Same table and filters
     as the Resource Manager page but with no Edit button and no Add Initiative
     button. Back button routes to the stakeholder dashboard.
   ============================================================================= */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

const btnDarkClass = `
  px-4 py-2 rounded text-sm
  bg-[#003A5C] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
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
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  transition whitespace-nowrap
`;

const colBtnClass = `
  ml-2 bg-white text-[#017ACB] px-2 py-1 rounded text-xs font-bold
  border border-black/50
  hover:bg-[#CDE6F7] transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.14)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.14)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.10),inset_0_-1px_2px_rgba(0,0,0,0.10)]
`;

const menuClass = `
  dropdown-menu
  fixed bg-white text-black shadow-lg rounded
  min-w-[12rem] w-max max-w-xs max-h-[min(60vh,420px)] overflow-y-auto
  z-[30000] border border-gray-300 pointer-events-auto
`;

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

export default function StakeholderInitiativesPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refresh      = searchParams.get('refresh');

  const [user, setUser]           = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const [initiatives, setInitiatives]                   = useState([]);
  const [mine, setMine]                                 = useState([]);
  const [filteredInitiatives, setFilteredInitiatives]   = useState([]);

  const [selectedCategories, setSelectedCategories]   = useState([]);
  const [selectedStatuses, setSelectedStatuses]       = useState([]);
  const [selectedVPs, setSelectedVPs]                 = useState([]);
  const [selectedDepts, setSelectedDepts]             = useState([]);
  const [selectedLeads, setSelectedLeads]             = useState([]);
  const [selectedRequestors, setSelectedRequestors]   = useState([]);
  const [selectedProjects, setSelectedProjects]       = useState([]);

  const [projectSort, setProjectSort] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);
  const toggleHighlight = (id) => setHighlightedId((prev) => (prev === id ? null : id));

  const [showProjectSortMenu, setShowProjectSortMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu]       = useState(false);
  const [showStatusMenu, setShowStatusMenu]           = useState(false);
  const [showVPMenu, setShowVPMenu]                   = useState(false);
  const [showDeptMenu, setShowDeptMenu]               = useState(false);
  const [showLeadMenu, setShowLeadMenu]               = useState(false);
  const [showRequestorMenu, setShowRequestorMenu]     = useState(false);

  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const [availableCategories, setAvailableCategories]   = useState([]);
  const [availableStatuses, setAvailableStatuses]       = useState([]);
  const [availableVPs, setAvailableVPs]                 = useState([]);
  const [availableDepts, setAvailableDepts]             = useState([]);
  const [availableLeads, setAvailableLeads]             = useState([]);
  const [availableRequestors, setAvailableRequestors]   = useState([]);
  const [availableProjects, setAvailableProjects]       = useState([]);

  const visibleStatuses =
    activeTab === 'completed' ? ['Completed'] :
    activeTab === 'cancelled' ? ['Cancelled'] :
    availableStatuses.filter((s) => s !== 'Completed' && s !== 'Cancelled');

  const toggleSelection = (value, setFn, current) => {
    if (!value) return;
    setFn(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
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
            ? items.filter(isValidInitiative).map((item) => ({
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

        const sourceAll  = data.allAssignments || data.completed || data.cancelled || [];
        const mappedAll  = safeMap(sourceAll);
        const mappedMine = safeMap(data.myInitiatives || []);

        if (aborted) return;

        setInitiatives(mappedAll);
        setMine(mappedMine);
        setFilteredInitiatives(mappedAll);
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    fetchInitiatives();
    return () => { aborted = true; };
  }, [user, refresh, activeTab]);

  useEffect(() => {
    if (!user) return;

    const base =
      activeTab === 'mine'      ? mine.filter((i) => i.status !== 'Completed' && i.status !== 'Cancelled') :
      activeTab === 'completed' ? initiatives.filter((i) => i.status === 'Completed') :
      activeTab === 'cancelled' ? initiatives.filter((i) => i.status === 'Cancelled') :
      initiatives.filter((i) => i.status !== 'Completed' && i.status !== 'Cancelled');

    const uniq = (arr) => [...new Set(arr)].filter(Boolean);
    setAvailableCategories(uniq(base.map((i) => i.category)));
    setAvailableStatuses(uniq(base.map((i) => i.status)));
    setAvailableVPs(uniq(base.map((i) => i.requestor_vp)));
    setAvailableDepts(uniq(base.map((i) => i.requesting_dept)));
    setAvailableLeads(uniq(base.map((i) => i.lead)));
    setAvailableRequestors(uniq(base.map((i) => i.requestor)));
    setAvailableProjects(uniq(base.map((i) => i.project)));

    let filtered = base.filter((i) =>
      (!selectedCategories.length  || selectedCategories.includes(i.category))  &&
      (!selectedStatuses.length    || selectedStatuses.includes(i.status))       &&
      (!selectedVPs.length         || selectedVPs.includes(i.requestor_vp))      &&
      (!selectedDepts.length       || selectedDepts.includes(i.requesting_dept)) &&
      (!selectedLeads.length       || selectedLeads.includes(i.lead))            &&
      (!selectedRequestors.length  || selectedRequestors.includes(i.requestor))  &&
      (!selectedProjects.length    || selectedProjects.includes(i.project))
    );

    if (projectSort === 'asc')  filtered = [...filtered].sort((a, b) => a.project.localeCompare(b.project));
    if (projectSort === 'desc') filtered = [...filtered].sort((a, b) => b.project.localeCompare(a.project));

    setFilteredInitiatives(filtered);
  }, [
    activeTab, initiatives, mine, user,
    selectedCategories, selectedStatuses, selectedVPs,
    selectedDepts, selectedLeads, selectedRequestors,
    selectedProjects, projectSort
  ]);

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.dropdown-menu')) closeAllMenus(); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" />
      </div>
    );
  }

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
              <Checkbox checked={projectSort === val} />
              {label}
            </div>
          ))}
          <div className="border-t my-1 text-xs font-semibold text-gray-500 px-3 py-1">Filter by project</div>
        </>
      )}
      <div
        className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${selected.length === 0 ? 'font-bold' : ''}`}
        onClick={() => setSelected([])}
      >
        <Checkbox checked={selected.length === 0} />
        All
      </div>
      {available.map((val) => (
        <div
          key={val}
          className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${selected.includes(val) ? 'font-bold' : ''}`}
          onClick={() => toggleSelection(val, setSelected, selected)}
        >
          <Checkbox checked={selected.includes(val)} />
          {val}
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-4xl font-bold text-gray-900" style={styles.outfitFont}>Initiatives</h2>
          <button onClick={() => router.push('/stakeholder/dashboard')} className={btnDarkClass} style={styles.outfitFont}>
            Back to Dashboard
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {['all', 'mine', 'completed', 'cancelled'].map((tab) => (
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
              {{ all: 'All Initiatives', mine: 'My Initiatives', completed: 'Completed', cancelled: 'Cancelled' }[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-max w-full border-collapse">
            <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
              <tr>

                {/* PROJECT */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Project</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowProjectSortMenu, showProjectSortMenu)}>▼</button>
                  </div>
                  {showProjectSortMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                      {renderMenuItems(availableProjects, selectedProjects, setSelectedProjects, true)}
                    </div>
                  )}
                </th>

                {/* CATEGORY */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Category</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowCategoryMenu, showCategoryMenu)}>▼</button>
                  </div>
                  {showCategoryMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                      {renderMenuItems(availableCategories, selectedCategories, setSelectedCategories)}
                    </div>
                  )}
                </th>

                {/* LEADER */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Leader Accountable</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowLeadMenu, showLeadMenu)}>▼</button>
                  </div>
                  {showLeadMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                      {renderMenuItems(availableLeads, selectedLeads, setSelectedLeads)}
                    </div>
                  )}
                </th>

                {/* STATUS */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Status</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowStatusMenu, showStatusMenu)}>▼</button>
                  </div>
                  {showStatusMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                      {renderMenuItems(visibleStatuses, selectedStatuses, setSelectedStatuses)}
                    </div>
                  )}
                </th>

                {/* REQUESTOR */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requestor</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowRequestorMenu, showRequestorMenu)}>▼</button>
                  </div>
                  {showRequestorMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                      {renderMenuItems(availableRequestors, selectedRequestors, setSelectedRequestors)}
                    </div>
                  )}
                </th>

                {/* REQUESTOR VP */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requestor VP</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowVPMenu, showVPMenu)}>▼</button>
                  </div>
                  {showVPMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
                      {renderMenuItems(availableVPs, selectedVPs, setSelectedVPs)}
                    </div>
                  )}
                </th>

                {/* REQUESTING DEPT */}
                <th className="px-4 py-2 border text-sm font-semibold relative whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                  <div className="flex justify-between items-center">
                    <span>Requesting Dept</span>
                    <button className={colBtnClass} onClick={(e) => openMenu(e, setShowDeptMenu, showDeptMenu)}>▼</button>
                  </div>
                  {showDeptMenu && (
                    <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={(e) => e.stopPropagation()}>
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
                    onClick={() => toggleHighlight(item.id)}
                    className={`cursor-pointer transition-colors hover:bg-[#017ACB]/20 ${isHighlighted ? 'bg-[#CDE6F7]' : 'bg-white'}`}
                  >
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