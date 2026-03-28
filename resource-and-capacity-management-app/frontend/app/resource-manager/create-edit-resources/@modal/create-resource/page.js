// // 'use client';

// // /* =============================================================================
// //    CreateResourceModal.jsx
// //    -----------------------------------------------------------------------------
// //    PURPOSE:
// //      Modal form for creating a new employee/resource record. Fields include:
// //        • Employee ID (numbers only)
// //        • Name, Title (letters, spaces, commas, periods allowed)
// //        • Department (styled dropdown)
// //        • Reports To, Manager Level, Director Level, VP (searchable dropdowns)
// //        • Other Information (free text textarea)
// //        • Status (Active / Inactive toggle buttons)

// //    SECURITY MODEL:
// //      • emp_id is validated client-side to be numeric only — non-numeric
// //        characters are stripped on input so invalid data never reaches the API.
// //      • Text fields (name, title, other_info) strip leading/trailing whitespace
// //        before submit — prevents blank-looking but non-empty values.
// //      • dept_no, reports_to, manager_level, director_level, requestor_vp are
// //        resolved from server-sourced lookup lists — user cannot inject arbitrary
// //        IDs by typing in these fields.
// //      • All fetch calls use try/catch — network failures show an error message
// //        rather than crashing or silently losing data.
// //      • No dangerouslySetInnerHTML is used anywhere.
// //      • API base URL is a single constant — not constructed from user input.

// //    RESPONSIVENESS:
// //      • Modal uses max-w-3xl w-full — fills screen on mobile, capped on desktop.
// //      • Form grid uses grid-cols-1 sm:grid-cols-2 — single column on mobile.
// //      • Buttons use w-full sm:w-auto — full width on mobile, auto on desktop.
// //      • max-h-[90vh] overflow-y-auto on modal body — scrollable on short screens.

// //    DEPENDENCIES:
// //      • next/navigation — useRouter
// //    ============================================================================= */

// // import { useState, useEffect, useRef } from 'react';
// // import { useRouter } from 'next/navigation';

// // const API_BASE = 'http://localhost:3001/api';

// // /* -----------------------------------------------------------------------------
// //    SHARED BUTTON CLASS — neumorphic, matches all other pages in the app.
// // ----------------------------------------------------------------------------- */
// // const btnClass = `
// //   px-4 py-2 rounded text-sm
// //   bg-[#017ACB] text-white border border-black/50
// //   hover:bg-[#017ACB]/20 hover:text-gray-700 transition
// //   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
// //   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
// //   relative
// //   before:content-[''] before:absolute before:inset-0 before:rounded
// //   before:pointer-events-none
// //   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
// // `;

// // const btnGrayClass = `
// //   px-4 py-2 rounded text-sm
// //   bg-gray-200 text-black border border-black/50
// //   hover:bg-[#017ACB]/20 transition
// //   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
// //   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
// //   relative
// //   before:content-[''] before:absolute before:inset-0 before:rounded
// //   before:pointer-events-none
// //   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
// // `;

// // /* -----------------------------------------------------------------------------
// //    STYLES
// // ----------------------------------------------------------------------------- */
// // const styles = {
// //   outfitFont: { fontFamily: 'Outfit, sans-serif' },
// // };

// // /* -----------------------------------------------------------------------------
// //    SHARED INPUT CLASS — box style matches ResourcesPage read-only fields.
// // ----------------------------------------------------------------------------- */
// // const BLOCKED_WORDS = [
// //   "kill", "murder", "stab", "shoot", "die", "death", "dead", "attack",
// //   "hate", "sucks", "stupid", "idiot", "moron", "dumb", "loser", "trash",
// //   "ass", "bastard", "bitch", "damn", "hell", "crap", "shit", "fuck",
// //   "cunt", "dick", "cock", "pussy", "whore", "slut", "nigger", "faggot",
// //   "retard", "rape", "bomb", "terror", "threat", "hurt", "harm", "destroy",
// //   "beat", "punch", "fight", "abuse", "violent", "violence", "weapon", "knife", "gun",
// // ];

// // function containsBlockedWords(text) {
// //   if (!text) return false;
// //   const lower = text.toLowerCase();
// //   return BLOCKED_WORDS.some((word) => {
// //     const regex = new RegExp(`\\b${word}\\b`, "i");
// //     return regex.test(lower);
// //   });
// // }

// // const inputClass =
// //   'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:border-black [&:focus]:shadow-[0_0_0_1px_black] w-full';

// // /* =============================================================================
// //    COMPONENT: StyledDropdown
// //    Simple single-select dropdown for fixed option lists (e.g. Department).
// //    Closes on outside click via the blur trick on the wrapper div.
// //    ============================================================================= */
// // function StyledDropdown({ label, value, onChange, options }) {
// //   const [open, setOpen] = useState(false);
// //   const ref = useRef(null);

// //   // Close on outside click
// //   useEffect(() => {
// //     const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
// //     document.addEventListener('mousedown', handler);
// //     return () => document.removeEventListener('mousedown', handler);
// //   }, []);

// //   return (
// //     <div className="flex flex-col relative" ref={ref}>
// //       <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
// //       <div
// //         className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center"
// //         onClick={() => setOpen((o) => !o)}
// //         style={styles.outfitFont}
// //       >
// //         <span className={value ? 'text-black' : 'text-gray-400'}>{value || `Select ${label}`}</span>
// //         <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
// //           <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
// //         </svg>
// //       </div>
// //       {open && (
// //         <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 max-h-48 overflow-y-auto shadow-lg">
// //           {options.map((opt) => (
// //             <div
// //               key={opt}
// //               onClick={() => { onChange(opt); setOpen(false); }}
// //               className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === opt ? 'font-bold bg-[#CDE6F7]' : ''}`}
// //               style={styles.outfitFont}
// //             >
// //               {opt}
// //             </div>
// //           ))}
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // /* =============================================================================
// //    COMPONENT: SearchableDropdown
// //    Dropdown with a live search input for long lists (managers, directors, VPs).
// //    ============================================================================= */
// // function SearchableDropdown({ label, value, onChange, list }) {
// //   const [open, setOpen] = useState(false);
// //   const [search, setSearch] = useState('');
// //   const ref = useRef(null);

// //   // Close on outside click
// //   useEffect(() => {
// //     const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
// //     document.addEventListener('mousedown', handler);
// //     return () => document.removeEventListener('mousedown', handler);
// //   }, []);

// //   const filtered = list.filter((item) =>
// //     item.emp_name.toLowerCase().includes(search.toLowerCase())
// //   );

// //   return (
// //     <div className="flex flex-col relative" ref={ref}>
// //       <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
// //       <div
// //         className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center"
// //         onClick={() => setOpen((o) => !o)}
// //         style={styles.outfitFont}
// //       >
// //         <span className={value ? 'text-black' : 'text-gray-400'}>{value || `Select ${label}`}</span>
// //         <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
// //           <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
// //         </svg>
// //       </div>
// //       {open && (
// //         <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 max-h-64 overflow-y-auto shadow-lg">
// //           {/* Search input — stopPropagation prevents the outer click handler from closing the menu */}
// //           <input
// //             className="w-full p-2 border-b border-gray-300 text-black focus:outline-none focus:border-black text-sm"
// //             placeholder="Search..."
// //             value={search}
// //             onChange={(e) => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ''))}
// //             onClick={(e) => e.stopPropagation()}
// //             style={styles.outfitFont}
// //           />
// //           {filtered.map((item) => (
// //             <div
// //               key={item.emp_id}
// //               onClick={() => { onChange(item.emp_name); setOpen(false); setSearch(''); }}
// //               className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === item.emp_name ? 'font-bold bg-[#CDE6F7]' : ''}`}
// //               style={styles.outfitFont}
// //             >
// //               {item.emp_name}
// //             </div>
// //           ))}
// //           {filtered.length === 0 && (
// //             <div className="p-2 text-gray-500 text-sm" style={styles.outfitFont}>No results</div>
// //           )}
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // /* =============================================================================
// //    MAIN COMPONENT: CreateResourceModal
// //    ============================================================================= */
// // export default function CreateResourceModal() {
// //   const router = useRouter();

// //   /* ---------------------------------------------------------------------------
// //      STATE
// //   --------------------------------------------------------------------------- */
// //   const [departments, setDepartments] = useState([]);
// //   const [managers, setManagers]       = useState([]);

// //   const [loading, setLoading]   = useState(false);
// //   const [error, setError]       = useState('');
// //   const [success, setSuccess]   = useState(false); // true = show "Resource added" banner

// //   const [formData, setFormData] = useState({
// //     emp_id:         '',
// //     emp_name:       '',
// //     emp_title:      '',
// //     dept_no:        '',   // stores dept_name in UI — resolved to dept_no on submit
// //     reports_to:     '',   // stores emp_name in UI — resolved to emp_id on submit
// //     manager_level:  '',
// //     director_level: '',
// //     requestor_vp:   '',
// //     other_info:     '',
// //     current_status: 'Active',
// //   });

// //   /* ---------------------------------------------------------------------------
// //      EFFECT: LOAD DEPARTMENTS + MANAGERS
// //      Both fetches run in parallel. Failures set an error message without
// //      crashing — the form is still usable for fields that don't need them.
// //   --------------------------------------------------------------------------- */
// //   useEffect(() => {
// //     const load = async () => {
// //       try {
// //         const [deptRes, mgrRes] = await Promise.all([
// //           fetch(`${API_BASE}/resources/departments`),
// //           fetch(`${API_BASE}/resources/managers`),
// //         ]);
// //         if (deptRes.ok) setDepartments(await deptRes.json());
// //         if (mgrRes.ok)  setManagers(await mgrRes.json());
// //       } catch {
// //         setError('Failed to load departments or managers. Some dropdowns may be unavailable.');
// //       }
// //     };
// //     load();
// //   }, []);

// //   /* ---------------------------------------------------------------------------
// //      HELPERS — resolve UI display values back to DB IDs before submit.
// //      All lookups search server-sourced arrays — never user-typed strings.
// //   --------------------------------------------------------------------------- */
// //   const getDeptNo  = (name) => departments.find((d) => d.dept_name === name)?.dept_no   || null;
// //   const getEmpId   = (name) => managers.find((m) => m.emp_name === name)?.emp_id        || null;

// //   /* ---------------------------------------------------------------------------
// //      INPUT HANDLERS
// //      emp_id    — numbers only, strip anything that isn't a digit.
// //      text fields — allow letters, spaces, commas, periods, hyphens, apostrophes.
// //                    Strips characters outside that set to prevent unexpected input.
// //   --------------------------------------------------------------------------- */
// //   const handleEmpIdChange = (e) => {
// //     // Only digits allowed — replace any non-digit character immediately
// //     const numeric = e.target.value.replace(/[^0-9]/g, '');
// //     setFormData((prev) => ({ ...prev, emp_id: numeric }));
// //   };

// //   const handleTextField = (field) => (e) => {
// //     // Allow: letters (any case), digits, spaces, commas, periods, hyphens, apostrophes
// //     const cleaned = e.target.value.replace(/[^a-zA-Z0-9 .,\-']/g, '');
// //     setFormData((prev) => ({ ...prev, [field]: cleaned }));
// //   };

// //   /* ---------------------------------------------------------------------------
// //      HANDLER: handleCreate
// //      Validates required fields, resolves display values to IDs, POSTs to API.
// //      On success: shows the "Resource added" banner for 2 seconds then navigates.
// //      On failure: shows inline error — never silently swallows failures.
// //   --------------------------------------------------------------------------- */
// //   const handleCreate = async (e) => {
// //     e.preventDefault();
// //     setError('');

// //     // Client-side validation — all fields except Other Information are required
// //     if (containsBlockedWords(formData.other_info)) return setError('Other Information contains inappropriate language. Please revise.');
// //     if (!formData.emp_id.trim())        return setError('Employee ID is required.');
// //     if (!formData.emp_name.trim())      return setError('Name is required.');

// //     // Duplicate check — ensure emp_id and name don't already exist
// //     try {
// //       const checkRes = await fetch(`${API_BASE}/resources/employees`);
// //       if (checkRes.ok) {
// //         const existing = await checkRes.json();
// //         const empIdTaken = existing.some(e => String(e.emp_id) === String(formData.emp_id.trim()));
// //         if (empIdTaken) return setError(`Employee ID ${formData.emp_id.trim()} is already in use. Please use a different ID.`);
// //         const nameTaken = existing.some(e => e.emp_name?.toLowerCase().trim() === formData.emp_name.toLowerCase().trim());
// //         if (nameTaken) return setError(`An employee named "${formData.emp_name.trim()}" already exists. Please check the name.`);
// //       }
// //     } catch {
// //       // Non-fatal — let backend handle it if check fails
// //     }
// //     if (!formData.emp_title.trim())     return setError('Title is required.');
// //     if (!formData.dept_no)              return setError('Department is required.');
// //     if (!formData.reports_to)           return setError('Reports To is required.');
// //     if (!formData.manager_level)        return setError('Manager Level is required.');
// //     if (!formData.director_level)       return setError('Director Level is required.');
// //     if (!formData.requestor_vp)         return setError('VP is required.');

// //     const payload = {
// //       emp_id:         Number(formData.emp_id.trim()),   // always numeric — safe to cast
// //       emp_name:       formData.emp_name.trim(),
// //       emp_title:      formData.emp_title.trim(),
// //       dept_no:        getDeptNo(formData.dept_no),
// //       reports_to:     getEmpId(formData.reports_to),
// //       manager_level:  getEmpId(formData.manager_level),
// //       director_level: getEmpId(formData.director_level),
// //       requestor_vp:   getEmpId(formData.requestor_vp),
// //       other_info:     formData.other_info.trim(),
// //       current_status: formData.current_status,
// //     };

// //     try {
// //       setLoading(true);
// //       const res = await fetch(`${API_BASE}/resources/employees`, {
// //         method:  'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body:    JSON.stringify(payload),
// //       });

// //       if (!res.ok) {
// //         const body = await res.json().catch(() => ({}));
// //         setError(body.message || 'Failed to create resource. Please try again.');
// //         return;
// //       }

// //       // Show success banner then navigate back
// //       setSuccess(true);
// //       setTimeout(() => {
// //         router.back();
// //         setTimeout(() => {
// //           router.replace(`/resource-manager/create-edit-resources?refresh=${Date.now()}`);
// //         }, 50);
// //       }, 1500);

// //     } catch {
// //       setError('Network error. Please check your connection and try again.');
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   /* ---------------------------------------------------------------------------
// //      RENDER
// //   --------------------------------------------------------------------------- */
// //   return (
// //     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
// //       <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

// //         {/* ----------------------------------------------------------------- */}
// //         {/* SUCCESS BANNER                                                      */}
// //         {/* Shown for 1.5s after successful creation before navigating away.   */}
// //         {/* ----------------------------------------------------------------- */}
// //         {success && (
// //           <div
// //             role="status"
// //             className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm text-center font-semibold"
// //             style={styles.outfitFont}
// //           >
// //             ✓ Resource added successfully.
// //           </div>
// //         )}

// //         <div className="p-6">
// //           <h2 className="text-2xl font-bold mb-6 text-black" style={styles.outfitFont}>
// //             Create Resource
// //           </h2>

// //           {/* ERROR BANNER */}
// //           {error && (
// //             <div
// //               role="alert"
// //               className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm"
// //               style={styles.outfitFont}
// //             >
// //               {error}
// //               <button onClick={() => setError('')} className="ml-3 font-bold text-red-900" aria-label="Dismiss">×</button>
// //             </div>
// //           )}

// //           <form onSubmit={handleCreate} noValidate>

// //             {/* FORM GRID — 1 col on mobile, 2 col on sm+ */}
// //             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

// //               {/* EMPLOYEE ID — numbers only */}
// //               <div className="flex flex-col">
// //                 <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
// //                   Employee ID *
// //                 </label>
// //                 <input
// //                   type="text"
// //                   inputMode="numeric"
// //                   value={formData.emp_id}
// //                   onChange={handleEmpIdChange}
// //                   placeholder="e.g. 12345"
// //                   maxLength={10}
// //                   required
// //                   className={inputClass}
// //                   style={styles.outfitFont}
// //                 />
// //                 <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Numbers only</span>
// //               </div>

// //               {/* NAME — letters, spaces, commas, periods */}
// //               <div className="flex flex-col">
// //                 <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
// //                   Name *
// //                 </label>
// //                 <input
// //                   type="text"
// //                   value={formData.emp_name}
// //                   onChange={handleTextField('emp_name')}
// //                   placeholder="e.g. Jane Smith"
// //                   maxLength={100}
// //                   required
// //                   className={inputClass}
// //                   style={styles.outfitFont}
// //                 />
// //               </div>

// //               {/* TITLE */}
// //               <div className="flex flex-col">
// //                 <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
// //                   Title *
// //                 </label>
// //                 <input
// //                   type="text"
// //                   value={formData.emp_title}
// //                   onChange={handleTextField('emp_title')}
// //                   placeholder="e.g. Solution Analyst II"
// //                   maxLength={100}
// //                   required
// //                   className={inputClass}
// //                   style={styles.outfitFont}
// //                 />
// //               </div>

// //               {/* DEPARTMENT */}
// //               <StyledDropdown
// //                 label="Department *"
// //                 value={formData.dept_no}
// //                 onChange={(val) => setFormData((prev) => ({ ...prev, dept_no: val }))}
// //                 options={departments.filter((d) => d.dept_name === "Data Mgmt").map((d) => d.dept_name)}
// //               />

// //               {/* REPORTS TO */}
// //               <SearchableDropdown
// //                 label="Reports To *"
// //                 value={formData.reports_to}
// //                 onChange={(val) => setFormData((prev) => ({ ...prev, reports_to: val }))}
// //                 list={managers}
// //               />

// //               {/* MANAGER LEVEL */}
// //               <SearchableDropdown
// //                 label="Manager Level *"
// //                 value={formData.manager_level}
// //                 onChange={(val) => setFormData((prev) => ({ ...prev, manager_level: val }))}
// //                 list={managers}
// //               />

// //               {/* DIRECTOR LEVEL */}
// //               <SearchableDropdown
// //                 label="Director Level *"
// //                 value={formData.director_level}
// //                 onChange={(val) => setFormData((prev) => ({ ...prev, director_level: val }))}
// //                 list={managers}
// //               />

// //               {/* VP */}
// //               <SearchableDropdown
// //                 label="VP *"
// //                 value={formData.requestor_vp}
// //                 onChange={(val) => setFormData((prev) => ({ ...prev, requestor_vp: val }))}
// //                 list={managers}
// //               />

// //             </div>

// //             {/* OTHER INFORMATION — full width, free text */}
// //             <div className="flex flex-col mt-4">
// //               <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
// //                 Other Information
// //               </label>
// //               <textarea
// //                 value={formData.other_info}
// //                 onChange={(e) => {
// //                   // Allow: letters, digits, spaces, commas, periods only
// //                   const cleaned = e.target.value.replace(/[^a-zA-Z0-9 .,]/g, '');
// //                   setFormData((prev) => ({ ...prev, other_info: cleaned }));
// //                 }}
// //                 rows={3}
// //                 maxLength={500}
// //                 className={inputClass}
// //                 style={styles.outfitFont}
// //               />
// //             </div>

// //             {/* STATUS — Active / Inactive toggle buttons */}
// //             {/* Text is always black per design requirement */}
// //             <div className="mt-4">
// //               <label className="text-xs text-black font-semibold block mb-2" style={styles.outfitFont}>
// //                 Status
// //               </label>
// //               <div className="flex gap-3 flex-wrap">

// //                 <button
// //                   type="button"
// //                   onClick={() => setFormData((prev) => ({ ...prev, current_status: 'Active' }))}
// //                   className={`
// //                     px-4 py-2 rounded text-sm text-black font-semibold border border-black/50 transition
// //                     shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
// //                     ${formData.current_status === 'Active'
// //                       ? 'bg-green-200 border-green-600'
// //                       : 'bg-green-50 hover:bg-green-100'}
// //                   `}
// //                   style={styles.outfitFont}
// //                 >
// //                   Active
// //                 </button>

// //                 <button
// //                   type="button"
// //                   onClick={() => setFormData((prev) => ({ ...prev, current_status: 'Inactive' }))}
// //                   className={`
// //                     px-4 py-2 rounded text-sm text-black font-semibold border border-black/50 transition
// //                     shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
// //                     ${formData.current_status === 'Inactive'
// //                       ? 'bg-red-200 border-red-600'
// //                       : 'bg-red-50 hover:bg-red-100'}
// //                   `}
// //                   style={styles.outfitFont}
// //                 >
// //                   Inactive
// //                 </button>

// //               </div>
// //             </div>

// //             {/* ACTION BUTTONS */}
// //             <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">

// //               <button
// //                 type="button"
// //                 onClick={() => router.back()}
// //                 disabled={loading}
// //                 className="
// //                 px-4 py-2 rounded text-sm
// //                 bg-[#003A5C] text-white border border-black/50
// //                 hover:bg-[#017ACB]/20 hover:text-gray-700 transition
// //                 shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
// //                 active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
// //                 relative before:content-[''] before:absolute before:inset-0 before:rounded
// //                 before:pointer-events-none
// //                 before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
// //                 w-full sm:w-auto
// //               "
// //                 style={styles.outfitFont}
// //               >
// //                 Cancel
// //               </button>

// //               <button
// //                 type="submit"
// //                 disabled={loading || success}
// //                 className={`${btnClass} w-full sm:w-auto`}
// //                 style={styles.outfitFont}
// //               >
// //                 {loading ? 'Creating...' : 'Create'}
// //               </button>

// //             </div>

// //           </form>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }


// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import { useRouter } from 'next/navigation';
// import api from '@/lib/api';

// const btnClass = `
//   px-4 py-2 rounded text-sm
//   bg-[#017ACB] text-white border border-black/50
//   hover:bg-[#017ACB]/20 hover:text-gray-700 transition
//   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//   relative
//   before:content-[''] before:absolute before:inset-0 before:rounded
//   before:pointer-events-none
//   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
// `;

// const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

// const BLOCKED_WORDS = [
//   "kill","murder","stab","shoot","die","death","dead","attack","hate","sucks",
//   "stupid","idiot","moron","dumb","loser","trash","ass","bastard","bitch","damn",
//   "hell","crap","shit","fuck","cunt","dick","cock","pussy","whore","slut", "nigger",
//   "nigger","faggot","retard","rape","bomb","terror","threat","hurt","harm",
//   "destroy","beat","punch","fight","abuse","violent","violence","weapon","knife","gun",
// ];

// function containsBlockedWords(text) {
//   if (!text) return false;
//   return BLOCKED_WORDS.some(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
// }

// const inputClass = 'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:border-black [&:focus]:shadow-[0_0_0_1px_black] w-full';

// function StyledDropdown({ label, value, onChange, options }) {
//   const [open, setOpen] = useState(false);
//   const ref = useRef(null);
//   useEffect(() => {
//     const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
//     document.addEventListener('mousedown', handler);
//     return () => document.removeEventListener('mousedown', handler);
//   }, []);
//   return (
//     <div className="flex flex-col relative" ref={ref}>
//       <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
//       <div className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
//         <span className={value ? 'text-black' : 'text-gray-400'}>{value || `Select ${label}`}</span>
//         <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
//       </div>
//       {open && (
//         <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 max-h-48 overflow-y-auto shadow-lg">
//           {options.map(opt => (
//             <div key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === opt ? 'font-bold bg-[#CDE6F7]' : ''}`} style={styles.outfitFont}>{opt}</div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// function SearchableDropdown({ label, value, onChange, list }) {
//   const [open, setOpen] = useState(false);
//   const [search, setSearch] = useState('');
//   const ref = useRef(null);
//   useEffect(() => {
//     const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
//     document.addEventListener('mousedown', handler);
//     return () => document.removeEventListener('mousedown', handler);
//   }, []);
//   const filtered = list.filter(item => item.emp_name.toLowerCase().includes(search.toLowerCase()));
//   return (
//     <div className="flex flex-col relative" ref={ref}>
//       <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
//       <div className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
//         <span className={value ? 'text-black' : 'text-gray-400'}>{value || `Select ${label}`}</span>
//         <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
//       </div>
//       {open && (
//         <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 max-h-64 overflow-y-auto shadow-lg">
//           <input className="w-full p-2 border-b border-gray-300 text-black focus:outline-none focus:border-black text-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ''))} onClick={e => e.stopPropagation()} style={styles.outfitFont} />
//           {filtered.map(item => (
//             <div key={item.emp_id} onClick={() => { onChange(item.emp_name); setOpen(false); setSearch(''); }} className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === item.emp_name ? 'font-bold bg-[#CDE6F7]' : ''}`} style={styles.outfitFont}>{item.emp_name}</div>
//           ))}
//           {filtered.length === 0 && <div className="p-2 text-gray-500 text-sm" style={styles.outfitFont}>No results</div>}
//         </div>
//       )}
//     </div>
//   );
// }

// export default function CreateResourceModal() {
//   const router = useRouter();
//   const [departments, setDepartments] = useState([]);
//   const [managers, setManagers]       = useState([]);
//   const [loading, setLoading]         = useState(false);
//   const [error, setError]             = useState('');
//   const [success, setSuccess]         = useState(false);
//   const [formData, setFormData]       = useState({
//     emp_id: '', emp_name: '', emp_title: '', dept_no: '',
//     reports_to: '', manager_level: '', director_level: '', requestor_vp: '',
//     other_info: '', current_status: 'Active',
//   });

//   useEffect(() => {
//     const load = async () => {
//       try {
//         const [deptRes, mgrRes] = await Promise.all([
//           api.get('/resources/departments'),
//           api.get('/resources/managers'),
//         ]);
//         setDepartments(deptRes.data || []);
//         setManagers(mgrRes.data || []);
//       } catch { setError('Failed to load departments or managers.'); }
//     };
//     load();
//   }, []);

//   const getDeptNo = (name) => departments.find(d => d.dept_name === name)?.dept_no || null;
//   const getEmpId  = (name) => managers.find(m => m.emp_name === name)?.emp_id || null;

//   const handleCreate = async (e) => {
//     e.preventDefault();
//     setError('');
//     if (containsBlockedWords(formData.other_info)) return setError('Other Information contains inappropriate language. Please revise.');
//     if (!formData.emp_id.trim())    return setError('Employee ID is required.');
//     if (!formData.emp_name.trim())  return setError('Name is required.');
//     try {
//       const { data: existing } = await api.get('/resources/employees');
//       if (existing.some(e => String(e.emp_id) === String(formData.emp_id.trim()))) return setError(`Employee ID ${formData.emp_id.trim()} is already in use.`);
//       if (existing.some(e => e.emp_name?.toLowerCase().trim() === formData.emp_name.toLowerCase().trim())) return setError(`An employee named "${formData.emp_name.trim()}" already exists.`);
//     } catch { /* non-fatal */ }
//     if (!formData.emp_title.trim()) return setError('Title is required.');
//     if (!formData.dept_no)          return setError('Department is required.');
//     if (!formData.reports_to)       return setError('Reports To is required.');
//     if (!formData.manager_level)    return setError('Manager Level is required.');
//     if (!formData.director_level)   return setError('Director Level is required.');
//     if (!formData.requestor_vp)     return setError('VP is required.');

//     const payload = {
//       emp_id: Number(formData.emp_id.trim()), emp_name: formData.emp_name.trim(),
//       emp_title: formData.emp_title.trim(), dept_no: getDeptNo(formData.dept_no),
//       reports_to: getEmpId(formData.reports_to), manager_level: getEmpId(formData.manager_level),
//       director_level: getEmpId(formData.director_level), requestor_vp: getEmpId(formData.requestor_vp),
//       other_info: formData.other_info.trim(), current_status: formData.current_status,
//     };

//     try {
//       setLoading(true);
//       await api.post('/resources/employees', payload);
//       setSuccess(true);
//       setTimeout(() => { router.back(); setTimeout(() => router.replace(`/resource-manager/create-edit-resources?refresh=${Date.now()}`), 50); }, 1500);
//     } catch (err) {
//       setError(err?.response?.data?.message || 'Failed to create resource. Please try again.');
//     } finally { setLoading(false); }
//   };

//   return (
//     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
//       <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
//         {success && <div role="status" className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm text-center font-semibold" style={styles.outfitFont}>✓ Resource added successfully.</div>}
//         <div className="p-6">
//           <h2 className="text-2xl font-bold mb-6 text-black" style={styles.outfitFont}>Create Resource</h2>
//           {error && <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm" style={styles.outfitFont}>{error}<button onClick={() => setError('')} className="ml-3 font-bold text-red-900">×</button></div>}
//           <form onSubmit={handleCreate} noValidate>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <div className="flex flex-col">
//                 <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Employee ID *</label>
//                 <input type="text" inputMode="numeric" value={formData.emp_id} onChange={e => setFormData(prev => ({ ...prev, emp_id: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="e.g. 12345" maxLength={10} required className={inputClass} style={styles.outfitFont} />
//                 <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Numbers only</span>
//               </div>
//               <div className="flex flex-col">
//                 <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Name *</label>
//                 <input type="text" value={formData.emp_name} onChange={e => setFormData(prev => ({ ...prev, emp_name: e.target.value.replace(/[^a-zA-Z0-9 .,\-']/g, '') }))} placeholder="e.g. Jane Smith" maxLength={100} required className={inputClass} style={styles.outfitFont} />
//               </div>
//               <div className="flex flex-col">
//                 <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Title *</label>
//                 <input type="text" value={formData.emp_title} onChange={e => setFormData(prev => ({ ...prev, emp_title: e.target.value.replace(/[^a-zA-Z0-9 .,\-']/g, '') }))} placeholder="e.g. Solution Analyst II" maxLength={100} required className={inputClass} style={styles.outfitFont} />
//               </div>
//               <StyledDropdown label="Department *" value={formData.dept_no} onChange={val => setFormData(prev => ({ ...prev, dept_no: val }))} options={departments.filter(d => d.dept_name === "Data Mgmt").map(d => d.dept_name)} />
//               <SearchableDropdown label="Reports To *"     value={formData.reports_to}     onChange={val => setFormData(prev => ({ ...prev, reports_to: val }))}     list={managers} />
//               <SearchableDropdown label="Manager Level *"  value={formData.manager_level}  onChange={val => setFormData(prev => ({ ...prev, manager_level: val }))}  list={managers} />
//               <SearchableDropdown label="Director Level *" value={formData.director_level} onChange={val => setFormData(prev => ({ ...prev, director_level: val }))} list={managers} />
//               <SearchableDropdown label="VP *"             value={formData.requestor_vp}   onChange={val => setFormData(prev => ({ ...prev, requestor_vp: val }))}   list={managers} />
//             </div>
//             <div className="flex flex-col mt-4">
//               <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Other Information</label>
//               <textarea value={formData.other_info} onChange={e => setFormData(prev => ({ ...prev, other_info: e.target.value.replace(/[^a-zA-Z0-9 .,]/g, '') }))} rows={3} maxLength={500} className={inputClass} style={styles.outfitFont} />
//             </div>
//             <div className="mt-4">
//               <label className="text-xs text-black font-semibold block mb-2" style={styles.outfitFont}>Status</label>
//               <div className="flex gap-3 flex-wrap">
//                 <button type="button" onClick={() => setFormData(prev => ({ ...prev, current_status: 'Active' }))} className={`px-4 py-2 rounded text-sm text-black font-semibold border border-black/50 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] ${formData.current_status === 'Active' ? 'bg-green-200 border-green-600' : 'bg-green-50 hover:bg-green-100'}`} style={styles.outfitFont}>Active</button>
//                 <button type="button" onClick={() => setFormData(prev => ({ ...prev, current_status: 'Inactive' }))} className={`px-4 py-2 rounded text-sm text-black font-semibold border border-black/50 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] ${formData.current_status === 'Inactive' ? 'bg-red-200 border-red-600' : 'bg-red-50 hover:bg-red-100'}`} style={styles.outfitFont}>Inactive</button>
//               </div>
//             </div>
//             <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
//               <button type="button" onClick={() => router.back()} disabled={loading} className="px-4 py-2 rounded text-sm bg-[#003A5C] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)] w-full sm:w-auto" style={styles.outfitFont}>Cancel</button>
//               <button type="submit" disabled={loading || success} className={`${btnClass} w-full sm:w-auto`} style={styles.outfitFont}>{loading ? 'Creating...' : 'Create'}</button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }



'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const btnClass = `
  px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

const BLOCKED_WORDS = [
  "kill","murder","stab","shoot","die","death","dead","attack","hate","sucks",
  "stupid","idiot","moron","dumb","loser","trash","ass","bastard","bitch","damn",
  "hell","crap","shit","fuck","cunt","dick","cock","pussy","whore","slut",
  "nigger","faggot","retard","rape","bomb","terror","threat","hurt","harm",
  "destroy","beat","punch","fight","abuse","violent","violence","weapon","knife","gun",
];

function containsBlockedWords(text) {
  if (!text) return false;
  return BLOCKED_WORDS.some(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
}

const inputClass = 'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:border-black [&:focus]:shadow-[0_0_0_1px_black] w-full';

function StyledDropdown({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
        <span className={value ? 'text-black' : 'text-gray-400'}>{value || `Select ${label}`}</span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 max-h-48 overflow-y-auto shadow-lg">
          {options.map(opt => (
            <div key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === opt ? 'font-bold bg-[#CDE6F7]' : ''}`} style={styles.outfitFont}>{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchableDropdown({ label, value, onChange, list }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const filtered = list.filter(item => item.emp_name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
        <span className={value ? 'text-black' : 'text-gray-400'}>{value || `Select ${label}`}</span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 max-h-64 overflow-y-auto shadow-lg">
          <input className="w-full p-2 border-b border-gray-300 text-black focus:outline-none focus:border-black text-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ''))} onClick={e => e.stopPropagation()} style={styles.outfitFont} />
          {filtered.map(item => (
            <div key={item.emp_id} onClick={() => { onChange(item.emp_name); setOpen(false); setSearch(''); }} className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === item.emp_name ? 'font-bold bg-[#CDE6F7]' : ''}`} style={styles.outfitFont}>{item.emp_name}</div>
          ))}
          {filtered.length === 0 && <div className="p-2 text-gray-500 text-sm" style={styles.outfitFont}>No results</div>}
        </div>
      )}
    </div>
  );
}

export default function CreateResourceModal() {
  const router = useRouter();
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);
  const [formData, setFormData]       = useState({
    emp_id: '', emp_name: '', emp_title: '', dept_no: '',
    reports_to: '', manager_level: '', director_level: '', requestor_vp: '',
    other_info: '', current_status: 'Active',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [deptRes, mgrRes] = await Promise.all([
          api.get('/resources/departments'),
          api.get('/resources/managers'),
        ]);
        setDepartments(deptRes.data || []);
        setManagers(mgrRes.data || []);
      } catch { setError('Failed to load departments or managers.'); }
    };
    load();
  }, []);

  const getDeptNo = (name) => departments.find(d => d.dept_name === name)?.dept_no || null;
  const getEmpId  = (name) => managers.find(m => m.emp_name === name)?.emp_id || null;

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (containsBlockedWords(formData.emp_name))   return setError('Name contains inappropriate language. Please revise.');
    if (containsBlockedWords(formData.emp_title))  return setError('Title contains inappropriate language. Please revise.');
    if (containsBlockedWords(formData.other_info)) return setError('Other Information contains inappropriate language. Please revise.');
    if (!formData.emp_id.trim())    return setError('Employee ID is required.');
    if (!formData.emp_name.trim())  return setError('Name is required.');
    try {
      const { data: existing } = await api.get('/resources/employees');
      if (existing.some(e => String(e.emp_id) === String(formData.emp_id.trim()))) return setError(`Employee ID ${formData.emp_id.trim()} is already in use.`);
      if (existing.some(e => e.emp_name?.toLowerCase().trim() === formData.emp_name.toLowerCase().trim())) return setError(`An employee named "${formData.emp_name.trim()}" already exists.`);
    } catch { /* non-fatal */ }
    if (!formData.emp_title.trim()) return setError('Title is required.');
    if (!formData.dept_no)          return setError('Department is required.');
    if (!formData.reports_to)       return setError('Reports To is required.');
    if (!formData.manager_level)    return setError('Manager Level is required.');
    if (!formData.director_level)   return setError('Director Level is required.');
    if (!formData.requestor_vp)     return setError('VP is required.');

    const payload = {
      emp_id: Number(formData.emp_id.trim()), emp_name: formData.emp_name.trim(),
      emp_title: formData.emp_title.trim(), dept_no: getDeptNo(formData.dept_no),
      reports_to: getEmpId(formData.reports_to), manager_level: getEmpId(formData.manager_level),
      director_level: getEmpId(formData.director_level), requestor_vp: getEmpId(formData.requestor_vp),
      other_info: formData.other_info.trim(), current_status: formData.current_status,
    };

    try {
      setLoading(true);
      await api.post('/resources/employees', payload);
      setSuccess(true);
      setTimeout(() => { router.back(); setTimeout(() => router.replace(`/resource-manager/create-edit-resources?refresh=${Date.now()}`), 50); }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create resource. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {success && <div role="status" className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm text-center font-semibold" style={styles.outfitFont}>✓ Resource added successfully.</div>}
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-black" style={styles.outfitFont}>Create Resource</h2>
          {error && <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm" style={styles.outfitFont}>{error}<button onClick={() => setError('')} className="ml-3 font-bold text-red-900">×</button></div>}
          <form onSubmit={handleCreate} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Employee ID *</label>
                <input type="text" inputMode="numeric" value={formData.emp_id} onChange={e => setFormData(prev => ({ ...prev, emp_id: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="e.g. 12345" maxLength={10} required className={inputClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Numbers only</span>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Name *</label>
                <input type="text" value={formData.emp_name} onChange={e => setFormData(prev => ({ ...prev, emp_name: e.target.value.replace(/[^a-zA-Z0-9 .,\-']/g, '') }))} placeholder="e.g. Jane Smith" maxLength={100} required className={inputClass} style={styles.outfitFont} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Title *</label>
                <input type="text" value={formData.emp_title} onChange={e => setFormData(prev => ({ ...prev, emp_title: e.target.value.replace(/[^a-zA-Z0-9 .,\-']/g, '') }))} placeholder="e.g. Solution Analyst II" maxLength={100} required className={inputClass} style={styles.outfitFont} />
              </div>
              <StyledDropdown label="Department *" value={formData.dept_no} onChange={val => setFormData(prev => ({ ...prev, dept_no: val }))} options={departments.filter(d => d.dept_name === "Data Mgmt").map(d => d.dept_name)} />
              <SearchableDropdown label="Reports To *"     value={formData.reports_to}     onChange={val => setFormData(prev => ({ ...prev, reports_to: val }))}     list={managers} />
              <SearchableDropdown label="Manager Level *"  value={formData.manager_level}  onChange={val => setFormData(prev => ({ ...prev, manager_level: val }))}  list={managers} />
              <SearchableDropdown label="Director Level *" value={formData.director_level} onChange={val => setFormData(prev => ({ ...prev, director_level: val }))} list={managers} />
              <SearchableDropdown label="VP *"             value={formData.requestor_vp}   onChange={val => setFormData(prev => ({ ...prev, requestor_vp: val }))}   list={managers} />
            </div>
            <div className="flex flex-col mt-4">
              <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Other Information</label>
              <textarea value={formData.other_info} onChange={e => setFormData(prev => ({ ...prev, other_info: e.target.value.replace(/[^a-zA-Z0-9 .,]/g, '') }))} rows={3} maxLength={500} className={inputClass} style={styles.outfitFont} />
            </div>
            <div className="mt-4">
              <label className="text-xs text-black font-semibold block mb-2" style={styles.outfitFont}>Status</label>
              <div className="flex gap-3 flex-wrap">
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, current_status: 'Active' }))} className={`px-4 py-2 rounded text-sm text-black font-semibold border border-black/50 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] ${formData.current_status === 'Active' ? 'bg-green-200 border-green-600' : 'bg-green-50 hover:bg-green-100'}`} style={styles.outfitFont}>Active</button>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, current_status: 'Inactive' }))} className={`px-4 py-2 rounded text-sm text-black font-semibold border border-black/50 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] ${formData.current_status === 'Inactive' ? 'bg-red-200 border-red-600' : 'bg-red-50 hover:bg-red-100'}`} style={styles.outfitFont}>Inactive</button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button type="button" onClick={() => router.back()} disabled={loading} className="px-4 py-2 rounded text-sm bg-[#003A5C] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)] w-full sm:w-auto" style={styles.outfitFont}>Cancel</button>
              <button type="submit" disabled={loading || success} className={`${btnClass} w-full sm:w-auto`} style={styles.outfitFont}>{loading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
