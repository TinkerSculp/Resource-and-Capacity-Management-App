// // 'use client';
// // export const dynamic = 'force-dynamic';
// // /* =============================================================================
// //    EditInitiativeModal.jsx
// //    -----------------------------------------------------------------------------
// //    PURPOSE:
// //      Full-page modal for editing an existing initiative. Navigated to via the
// //      Edit button on the Initiatives table. Loads the initiative, populates the
// //      form, and PUTs the update to /api/initiatives.

// //    HOW IT WORKS:
// //      1. Reads the initiative ID from URL params (?id=)
// //      2. Fetches employees, requestors, and the current initiative data in parallel
// //      3. When a Requestor is changed, auto-resolves the VP and fetches the dept
// //      4. On submit: validates → profanity check → PUT
// //      5. On success: navigates back and triggers a refresh on the Initiatives page

// //    DIFFERENCES FROM AddInitiativeModal:
// //      • Pre-populates the form from the existing initiative record
// //      • Uses PUT /initiatives instead of POST
// //      • Requestor VP auto-updates if the Requestor is changed — existing VP
// //        is preserved from the loaded data on initial render

// //    AUTO-FILL FIELDS:
// //      Same as AddInitiativeModal — Requestor VP and Requesting Dept are
// //      read-only and auto-filled when the Requestor is selected or changed.

// //    SECURITY MODEL:
// //      • initiative ID from URL params passed through encodeURIComponent().
// //      • Profanity checks on project, target_period, description, and
// //        resource_consideration before submit.
// //      • VP name passed through encodeURIComponent() in the dept lookup URL.
// //      • All dropdown options come from the backend — never user-typed input.
// //      • API errors surfaced via error banner — never exposed as raw exceptions.

// //    DEPENDENCIES:
// //      • @/lib/api       — Axios instance with JWT Bearer token auto-injection
// //      • next/navigation  — useRouter, useSearchParams
// //    ============================================================================= */

// // import { Suspense } from 'react';
// // import { useRouter, useSearchParams } from 'next/navigation';
// // import { useState, useEffect, useRef } from 'react';
// // import api from '@/lib/api';

// // const btnClass = `
// //   px-4 py-2 rounded text-sm
// //   bg-[#017ACB] text-white border border-black/50 dark:border-slate-500/60
// //   hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100 transition
// //   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
// //   dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
// //   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
// //   dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
// //   relative
// //   before:content-[''] before:absolute before:inset-0 before:rounded
// //   before:pointer-events-none
// //   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
// //   dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
// // `;

// // const btnGrayClass = `
// //   px-4 py-2 rounded text-sm
// //   bg-gray-200 text-black border border-black/50 dark:border-slate-500/60
// //   dark:bg-slate-800 dark:text-slate-200
// //   hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100 transition
// //   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
// //   dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
// //   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
// //   dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
// //   relative
// //   before:content-[''] before:absolute before:inset-0 before:rounded
// //   before:pointer-events-none
// //   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
// //   dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
// // `;

// // const btnDarkClass = `
// //   px-4 py-2 rounded text-sm
// //   bg-[#003A5C] text-white border border-black/50 dark:border-slate-500/60
// //   dark:bg-[#0A5F8A] dark:text-white
// //   hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100 transition
// //   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
// //   dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
// //   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
// //   dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
// //   relative before:content-[''] before:absolute before:inset-0 before:rounded
// //   before:pointer-events-none
// //   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
// //   dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
// // `;

// // const styles        = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };
// // const inputClass    = 'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black w-full dark:bg-[#1f1f1f] dark:text-slate-100 dark:border-slate-600 dark:hover:bg-[#017ACB]/30 dark:focus:ring-slate-400';
// // const readOnlyClass = 'bg-gray-100 text-gray-500 border border-black p-2 rounded cursor-not-allowed w-full dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600';

// // const BLOCKED_WORDS = [
// //   "kill","murder","stab","shoot","die","death","dead","attack","hate","sucks",
// //   "stupid","idiot","moron","dumb","loser","trash","ass","bastard","bitch","damn",
// //   "hell","crap","shit","fuck","cunt","dick","cock","pussy","whore","slut",
// //   "nigger","faggot","retard","rape","bomb","terror","threat","hurt","harm",
// //   "destroy","beat","punch","fight","abuse","violent","violence","weapon","knife","gun",
// // ];

// // function containsBlockedWords(text) {
// //   if (!text) return false;
// //   return BLOCKED_WORDS.some(word => new RegExp(`\\b${word}\\b`, "i").test(text));
// // }

// // /* =============================================================================
// //    COMPONENT: SearchableDropdown — for Requestor (long list with search).
// //    Sorts results so prefix matches appear first.
// //    ============================================================================= */
// // function SearchableDropdown({ label, value, onChange, list }) {
// //   const [open, setOpen]     = useState(false);
// //   const [search, setSearch] = useState('');
// //   const ref = useRef(null);

// //   useEffect(() => {
// //     const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
// //     document.addEventListener('mousedown', handler);
// //     return () => document.removeEventListener('mousedown', handler);
// //   }, []);

// //   const filtered = (list || [])
// //     .filter(p => p.emp_name?.toLowerCase().includes(search.toLowerCase()))
// //     .sort((a, b) => {
// //       const s = search.toLowerCase();
// //       const aMatch = a.emp_name?.toLowerCase().startsWith(s);
// //       const bMatch = b.emp_name?.toLowerCase().startsWith(s);
// //       return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
// //     });

// //   return (
// //     <div className="flex flex-col relative" ref={ref}>
// //       <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
// //       <div className="bg-white dark:bg-[#1f1f1f] text-black dark:text-slate-100 border border-black dark:border-slate-600 p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition flex justify-between items-center" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
// //         <span className={value ? 'text-black dark:text-slate-100' : 'text-gray-400 dark:text-slate-400'}>{value || `Select ${label}`}</span>
// //         <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
// //       </div>
// //       {open && (
// //         <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#1f1f1f] border border-black dark:border-slate-600 rounded mt-1 z-50 shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
// //           <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ''))} onClick={e => e.stopPropagation()} className="w-full p-2 border-b border-gray-300 dark:border-slate-700 text-black dark:text-slate-100 bg-white dark:bg-[#1f1f1f] focus:outline-none focus:border-black dark:focus:border-slate-400 text-sm" style={styles.outfitFont} />
// //           <div className="max-h-40 overflow-y-auto">
// //             {filtered.map(emp => (
// //               <div key={emp.emp_name} onClick={() => { onChange(emp.emp_name); setOpen(false); setSearch(''); }} className={`p-2 cursor-pointer text-black dark:text-slate-100 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition text-sm ${value === emp.emp_name ? 'font-bold bg-[#CDE6F7] dark:bg-[#0A5F8A]/40' : ''}`} style={styles.outfitFont}>
// //                 {emp.emp_name}
// //               </div>
// //             ))}
// //             {filtered.length === 0 && <div className="p-2 text-gray-500 dark:text-slate-400 text-sm" style={styles.outfitFont}>No results</div>}
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // /* =============================================================================
// //    COMPONENT: StyledDropdown — for fixed option lists.
// //    ============================================================================= */
// // function StyledDropdown({ label, value, onChange, options }) {
// //   const [open, setOpen] = useState(false);
// //   const ref = useRef(null);
// //   useEffect(() => {
// //     const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
// //     document.addEventListener('mousedown', handler);
// //     return () => document.removeEventListener('mousedown', handler);
// //   }, []);
// //   return (
// //     <div className="flex flex-col relative" ref={ref}>
// //       <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
// //       <div className="bg-white dark:bg-[#1f1f1f] text-black dark:text-slate-100 border border-black dark:border-slate-600 p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition flex justify-between items-center" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
// //         <span className={value ? 'text-black dark:text-slate-100' : 'text-gray-400 dark:text-slate-400'}>{value || `Select ${label}`}</span>
// //         <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
// //       </div>
// //       {open && (
// //         <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#1f1f1f] border border-black dark:border-slate-600 rounded mt-1 z-50 max-h-60 overflow-y-auto shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
// //           {(options || []).map(opt => (
// //             <div key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`p-2 cursor-pointer text-black dark:text-slate-100 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition text-sm ${value === opt ? 'font-bold bg-[#CDE6F7] dark:bg-[#0A5F8A]/40' : ''}`} style={styles.outfitFont}>
// //               {opt}
// //             </div>
// //           ))}
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // /* =============================================================================
// //    MAIN COMPONENT: EditInitiativeModal
// //    ============================================================================= */
// // export default function EditInitiativeModal() {
// //   const router = useRouter();
// //   const params = useSearchParams();
// //   const id     = params.get('id'); // Initiative ID from URL — passed through encodeURIComponent on navigation

// //   const [loading, setLoading] = useState(false);
// //   const [error, setError]     = useState('');
// //   const [success, setSuccess] = useState(false);

// //   const [employees, setEmployees]   = useState([]);
// //   const [requestors, setRequestors] = useState([]);
// //   const [dept, setDept]             = useState('');

// //   const [form, setForm] = useState({
// //     project: '', category: '', lead: '', status: '',
// //     requestor: '', requestor_vp: '', completion_date: '',
// //     target_period: '', description: '', resource_consideration: '',
// //   });

// //   const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

// //   /* ---------------------------------------------------------------------------
// //      EFFECT: LOAD DROPDOWNS
// //   --------------------------------------------------------------------------- */
// //   useEffect(() => {
// //     const loadDropdowns = async () => {
// //       try {
// //         const res = await api.get('/initiatives/dropdowns');
// //         if (!res?.data) throw new Error('Invalid dropdown response');
// //         setEmployees(res.data.employees   || []);
// //         setRequestors(res.data.requestors || []);
// //       } catch (err) { console.error('Failed to load dropdowns:', err); }
// //     };
// //     loadDropdowns();
// //   }, []);

// //   /* ---------------------------------------------------------------------------
// //      EFFECT: LOAD INITIATIVE DATA
// //      Pre-populates the form from the existing initiative record.
// //   --------------------------------------------------------------------------- */
// //   useEffect(() => {
// //     if (!id) return;
// //     const loadInitiative = async () => {
// //       try {
// //         const res = await api.get(`/initiatives/${encodeURIComponent(id)}`);
// //         if (!res?.data) throw new Error('Invalid initiative response');
// //         const data = res.data;
// //         setForm({
// //           project:                data.project_name    || '',
// //           category:               data.category        || '',
// //           lead:                   data.leader          || '',
// //           status:                 data.status          || '',
// //           requestor:              data.requestor       || '',
// //           requestor_vp:           data.requestor_vp    || '',
// //           completion_date:        data.completion_date || '',
// //           target_period:          data.target_period   || '',
// //           description:            data.description     || '',
// //           resource_consideration: data.resource_notes  || '',
// //         });
// //         setDept(data.requesting_dept || '');
// //       } catch (err) {
// //         console.error('Failed to load initiative:', err);
// //         setError('Failed to load initiative data. Please try again.');
// //       }
// //     };
// //     loadInitiative();
// //   }, [id]);

// //   /* ---------------------------------------------------------------------------
// //      HANDLER: fetchDept
// //      Looks up the requesting department for a VP name — non-fatal on error.
// //   --------------------------------------------------------------------------- */
// //   const fetchDept = async (vpName) => {
// //     if (!vpName?.trim()) return;
// //     try {
// //       const res = await api.get(`/initiatives/dept/search?name=${encodeURIComponent(vpName)}`);
// //       setDept(res?.data?.dept_name || '');
// //     } catch { setDept(''); }
// //   };

// //   /* ---------------------------------------------------------------------------
// //      HANDLER: handleSubmit
// //      Validates → profanity check → PUT to /initiatives.
// //   --------------------------------------------------------------------------- */
// //   const handleSubmit = async (e) => {
// //     e.preventDefault();
// //     setError('');

// //     if (!form.project.trim())       return setError('Project Name is required.');
// //     if (!form.category)             return setError('Category is required.');
// //     if (!form.lead)                 return setError('Lead is required.');
// //     if (!form.status)               return setError('Status is required.');
// //     if (!form.requestor)            return setError('Requestor is required.');
// //     if (!form.target_period.trim()) return setError('Target Period is required.');
// //     if (!form.description.trim())   return setError('Description is required.');
// //     if ((form.status === 'Completed' || form.status === 'Cancelled') && !form.completion_date)
// //       return setError('Completion date is required when status is Completed or Cancelled.');

// //     if (containsBlockedWords(form.project))               return setError('Project Name contains inappropriate language. Please revise.');
// //     if (containsBlockedWords(form.target_period))         return setError('Target Period contains inappropriate language. Please revise.');
// //     if (containsBlockedWords(form.description))           return setError('Description contains inappropriate language. Please revise.');
// //     if (containsBlockedWords(form.resource_consideration)) return setError('Resource Consideration contains inappropriate language. Please revise.');

// //     const payload = { id, ...form, requesting_dept: dept };

// //     try {
// //       setLoading(true);
// //       const res = await api.put('/initiatives', payload);
// //       if (!res?.data) throw new Error('Invalid server response');
// //       setSuccess(true);
// //       setTimeout(() => {
// //         router.back();
// //         setTimeout(() => router.replace(`/resource-manager/create-edit-initiatives?refresh=${Date.now()}`), 100);
// //       }, 1500);
// //     } catch (err) {
// //       console.error('Update error:', err);
// //       setError(err?.response?.data?.error || err?.message || 'Failed to update initiative.');
// //     } finally { setLoading(false); }
// //   };

// //   /* ===========================================================================
// //      RENDER
// //   =========================================================================== */
// //   return (
// //     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
// //       <div className="bg-white dark:bg-[#212121] rounded-lg shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-transparent dark:border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
// //         {success && (
// //           <div role="status" className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-200 rounded text-sm text-center font-semibold" style={styles.outfitFont}>
// //             ✓ Changes saved successfully.
// //           </div>
// //         )}
// //         <div className="p-6">
// //           <h2 className="text-2xl font-bold mb-4 text-black dark:text-white" style={styles.outfitFont}>Edit Initiative</h2>
// //           {error && (
// //             <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200 rounded text-sm" style={styles.outfitFont}>
// //               {error}<button onClick={() => setError('')} className="ml-3 font-bold text-red-900 dark:text-red-100" aria-label="Dismiss">×</button>
// //             </div>
// //           )}
// //           <form onSubmit={handleSubmit} noValidate>
// //             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
// //               <div className="flex flex-col">
// //                 <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Project Name *</label>
// //                 <input value={form.project} onChange={e => updateField('project', e.target.value.replace(/[^a-zA-Z0-9 .,\-'&]/g, ''))} maxLength={150} required className={inputClass} style={styles.outfitFont} />
// //               </div>

// //               <StyledDropdown label="Category *" value={form.category} onChange={val => updateField('category', val)} options={['Baseline', 'Strategic', 'Discretionary Project / Enhancement', 'Vacation']} />
// //               <StyledDropdown label="Lead *"     value={form.lead}     onChange={val => updateField('lead', val)}     options={employees.map(e => e.emp_name)} />
// //               <StyledDropdown label="Status *"   value={form.status}   onChange={val => updateField('status', val)}   options={['Backlog', 'On Going', 'In Progress', 'On Hold', 'Cancelled', 'Completed']} />

// //               <SearchableDropdown
// //                 label="Requestor *"
// //                 value={form.requestor}
// //                 onChange={name => {
// //                   updateField('requestor', name);
// //                   const req = requestors.find(r => r.emp_name === name);
// //                   if (!req) { updateField('requestor_vp', ''); setDept(''); return; }
// //                   updateField('requestor_vp', req.requestor_vp_name);
// //                   fetchDept(req.requestor_vp_name);
// //                 }}
// //                 list={requestors}
// //               />

// //               {/* Requestor VP + Requesting Dept — read-only, auto-filled */}
// //               <div className="flex flex-col">
// //                 <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Requestor VP</label>
// //                 <input value={form.requestor_vp} readOnly className={readOnlyClass} style={styles.outfitFont} />
// //                 <span className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5" style={styles.outfitFont}>Auto-filled from Requestor</span>
// //               </div>
// //               <div className="flex flex-col">
// //                 <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Requesting Dept</label>
// //                 <input value={dept} readOnly className={readOnlyClass} style={styles.outfitFont} />
// //                 <span className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5" style={styles.outfitFont}>Auto-filled from Requestor</span>
// //               </div>

// //               <div className="flex flex-col">
// //                 <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>
// //                   Completion Date{(form.status === 'Completed' || form.status === 'Cancelled') ? ' *' : ''}
// //                 </label>
// //                 <input type="date" value={form.completion_date} onChange={e => updateField('completion_date', e.target.value)} onFocus={e => e.target.showPicker?.()} className={inputClass} style={styles.outfitFont} />
// //               </div>

// //               <div className="flex flex-col">
// //                 <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Target Period *</label>
// //                 <input value={form.target_period} onChange={e => updateField('target_period', e.target.value.replace(/[^a-zA-Z0-9 .,\-'/]/g, ''))} maxLength={100} required className={inputClass} style={styles.outfitFont} />
// //               </div>
// //             </div>

// //             <div className="flex flex-col mt-4">
// //               <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Description *</label>
// //               <textarea value={form.description} onChange={e => updateField('description', e.target.value.replace(/[^a-zA-Z0-9 .,\-'&()]/g, ''))} maxLength={1000} required rows={3} className={inputClass} style={styles.outfitFont} />
// //             </div>

// //             <div className="flex flex-col mt-4">
// //               <label className="text-xs text-black dark:text-slate-100 mb-1 font-semibold" style={styles.outfitFont}>Resource Consideration</label>
// //               <textarea value={form.resource_consideration} onChange={e => updateField('resource_consideration', e.target.value.replace(/[^a-zA-Z0-9 .,\-'&()]/g, ''))} maxLength={500} rows={3} className={inputClass} style={styles.outfitFont} />
// //             </div>

// //             <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
// //               <button type="button" onClick={() => router.back()} disabled={loading} className={`${btnDarkClass} w-full sm:w-auto`} style={styles.outfitFont}>Cancel</button>
// //               <button type="submit" disabled={loading || success} className={`${btnClass} w-full sm:w-auto`} style={styles.outfitFont}>{loading ? 'Saving...' : 'Save Changes'}</button>
// //             </div>
// //           </form>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }


// 'use client';
// export const dynamic = 'force-dynamic';

// /* =============================================================================
//    EditInitiativeModal.jsx
//    -----------------------------------------------------------------------------
//    PURPOSE:
//      Full-page modal for editing an existing initiative. Navigated to via the
//      Edit button on the Initiatives table. Loads the initiative, populates the
//      form, and PUTs the update to /api/initiatives.

//    HOW IT WORKS:
//      1. Reads the initiative ID from URL params (?id=)
//      2. Fetches employees, requestors, and the current initiative data in parallel
//      3. When a Requestor is changed, auto-resolves the VP and fetches the dept
//      4. On submit: validates → profanity check → PUT
//      5. On success: navigates back and triggers a refresh on the Initiatives page

//    DIFFERENCES FROM AddInitiativeModal:
//      • Pre-populates the form from the existing initiative record
//      • Uses PUT /initiatives instead of POST
//      • Requestor VP auto-updates if the Requestor is changed — existing VP
//        is preserved from the loaded data on initial render

//    AUTO-FILL FIELDS:
//      Same as AddInitiativeModal — Requestor VP and Requesting Dept are
//      read-only and auto-filled when the Requestor is selected or changed.

//    SECURITY MODEL:
//      • initiative ID from URL params passed through encodeURIComponent().
//      • Profanity checks on project, target_period, description, and
//        resource_consideration before submit.
//      • VP name passed through encodeURIComponent() in the dept lookup URL.
//      • All dropdown options come from the backend — never user-typed input.
//      • API errors surfaced via error banner — never exposed as raw exceptions.

//    DEPENDENCIES:
//      • @/lib/api       — Axios instance with JWT Bearer token auto-injection
//      • next/navigation  — useRouter, useSearchParams
//    ============================================================================= */

// import { Suspense } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import { useState, useEffect, useRef } from 'react';
// import api from '@/lib/api';

// const btnClass = `
//   px-4 py-2 rounded text-sm
//   bg-[#017ACB] text-white border border-black/50
//   hover:bg-[#017ACB]/20 hover:text-gray-700 transition
//   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//   relative before:content-[''] before:absolute before:inset-0 before:rounded
//   before:pointer-events-none
//   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
// `;

// const btnDarkClass = `
//   px-4 py-2 rounded text-sm
//   bg-[#003A5C] text-white border border-black/50
//   hover:bg-[#017ACB]/20 hover:text-gray-700 transition
//   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//   relative before:content-[''] before:absolute before:inset-0 before:rounded
//   before:pointer-events-none
//   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
// `;

// const styles        = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };
// const inputClass    = 'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black w-full';
// const readOnlyClass = 'bg-gray-100 text-gray-500 border border-black p-2 rounded cursor-not-allowed w-full';

// const BLOCKED_WORDS = [
//   "kill","murder","stab","shoot","die","death","dead","attack","hate","sucks",
//   "stupid","idiot","moron","dumb","loser","trash","ass","bastard","bitch","damn",
//   "hell","crap","shit","fuck","cunt","dick","cock","pussy","whore","slut",
//   "nigger","faggot","retard","rape","bomb","terror","threat","hurt","harm",
//   "destroy","beat","punch","fight","abuse","violent","violence","weapon","knife","gun",
// ];

// function containsBlockedWords(text) {
//   if (!text) return false;
//   return BLOCKED_WORDS.some(word => new RegExp(`\\b${word}\\b`, "i").test(text));
// }

// /* =============================================================================
//    COMPONENT: SearchableDropdown — for Requestor (long list with search).
//    Sorts results so prefix matches appear first.
//    ============================================================================= */
// function SearchableDropdown({ label, value, onChange, list }) {
//   const [open, setOpen]     = useState(false);
//   const [search, setSearch] = useState('');
//   const ref = useRef(null);

//   useEffect(() => {
//     const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
//     document.addEventListener('mousedown', handler);
//     return () => document.removeEventListener('mousedown', handler);
//   }, []);

//   const filtered = (list || [])
//     .filter(p => p.emp_name?.toLowerCase().includes(search.toLowerCase()))
//     .sort((a, b) => {
//       const s = search.toLowerCase();
//       const aMatch = a.emp_name?.toLowerCase().startsWith(s);
//       const bMatch = b.emp_name?.toLowerCase().startsWith(s);
//       return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
//     });

//   return (
//     <div className="flex flex-col relative" ref={ref}>
//       <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
//       <div className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
//         <span className={value ? 'text-black' : 'text-gray-400'}>{value || `Select ${label}`}</span>
//         <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
//       </div>
//       {open && (
//         <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 shadow-lg">
//           <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ''))} onClick={e => e.stopPropagation()} className="w-full p-2 border-b border-gray-300 text-black focus:outline-none focus:border-black text-sm" style={styles.outfitFont} />
//           <div className="max-h-40 overflow-y-auto">
//             {filtered.map(emp => (
//               <div key={emp.emp_name} onClick={() => { onChange(emp.emp_name); setOpen(false); setSearch(''); }} className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === emp.emp_name ? 'font-bold bg-[#CDE6F7]' : ''}`} style={styles.outfitFont}>
//                 {emp.emp_name}
//               </div>
//             ))}
//             {filtered.length === 0 && <div className="p-2 text-gray-500 text-sm" style={styles.outfitFont}>No results</div>}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// /* =============================================================================
//    COMPONENT: StyledDropdown — for fixed option lists.
//    ============================================================================= */
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
//           {(options || []).map(opt => (
//             <div key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm ${value === opt ? 'font-bold bg-[#CDE6F7]' : ''}`} style={styles.outfitFont}>
//               {opt}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// /* =============================================================================
//    MAIN COMPONENT: EditInitiativeModalInner
//    Uses useSearchParams — must be wrapped in Suspense by parent.
//    ============================================================================= */
// function EditInitiativeModalInner() {
//   const router = useRouter();
//   const params = useSearchParams();
//   const id     = params.get('id'); // Initiative ID from URL — passed through encodeURIComponent on navigation

//   const [loading, setLoading] = useState(false);
//   const [error, setError]     = useState('');
//   const [success, setSuccess] = useState(false);

//   const [employees, setEmployees]   = useState([]);
//   const [requestors, setRequestors] = useState([]);
//   const [dept, setDept]             = useState('');

//   const [form, setForm] = useState({
//     project: '', category: '', lead: '', status: '',
//     requestor: '', requestor_vp: '', completion_date: '',
//     target_period: '', description: '', resource_consideration: '',
//   });

//   const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

//   /* ---------------------------------------------------------------------------
//      EFFECT: LOAD DROPDOWNS
//   --------------------------------------------------------------------------- */
//   useEffect(() => {
//     const loadDropdowns = async () => {
//       try {
//         const res = await api.get('/initiatives/dropdowns');
//         if (!res?.data) throw new Error('Invalid dropdown response');
//         setEmployees(res.data.employees   || []);
//         setRequestors(res.data.requestors || []);
//       } catch (err) { console.error('Failed to load dropdowns:', err); }
//     };
//     loadDropdowns();
//   }, []);

//   /* ---------------------------------------------------------------------------
//      EFFECT: LOAD INITIATIVE DATA
//      Pre-populates the form from the existing initiative record.
//   --------------------------------------------------------------------------- */
//   useEffect(() => {
//     if (!id) return;
//     const loadInitiative = async () => {
//       try {
//         const res = await api.get(`/initiatives/${encodeURIComponent(id)}`);
//         if (!res?.data) throw new Error('Invalid initiative response');
//         const data = res.data;
//         setForm({
//           project:                data.project_name    || '',
//           category:               data.category        || '',
//           lead:                   data.leader          || '',
//           status:                 data.status          || '',
//           requestor:              data.requestor       || '',
//           requestor_vp:           data.requestor_vp    || '',
//           completion_date:        data.completion_date || '',
//           target_period:          data.target_period   || '',
//           description:            data.description     || '',
//           resource_consideration: data.resource_notes  || '',
//         });
//         setDept(data.requesting_dept || '');
//       } catch (err) {
//         console.error('Failed to load initiative:', err);
//         setError('Failed to load initiative data. Please try again.');
//       }
//     };
//     loadInitiative();
//   }, [id]);

//   /* ---------------------------------------------------------------------------
//      HANDLER: fetchDept
//      Looks up the requesting department for a VP name — non-fatal on error.
//   --------------------------------------------------------------------------- */
//   const fetchDept = async (vpName) => {
//     if (!vpName?.trim()) return;
//     try {
//       const res = await api.get(`/initiatives/dept/search?name=${encodeURIComponent(vpName)}`);
//       setDept(res?.data?.dept_name || '');
//     } catch { setDept(''); }
//   };

//   /* ---------------------------------------------------------------------------
//      HANDLER: handleSubmit
//      Validates → profanity check → PUT to /initiatives.
//   --------------------------------------------------------------------------- */
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');

//     if (!form.project.trim())       return setError('Project Name is required.');
//     if (!form.category)             return setError('Category is required.');
//     if (!form.lead)                 return setError('Lead is required.');
//     if (!form.status)               return setError('Status is required.');
//     if (!form.requestor)            return setError('Requestor is required.');
//     if (!form.target_period.trim()) return setError('Target Period is required.');
//     if (!form.description.trim())   return setError('Description is required.');
//     if ((form.status === 'Completed' || form.status === 'Cancelled') && !form.completion_date)
//       return setError('Completion date is required when status is Completed or Cancelled.');

//     if (containsBlockedWords(form.project))               return setError('Project Name contains inappropriate language. Please revise.');
//     if (containsBlockedWords(form.target_period))         return setError('Target Period contains inappropriate language. Please revise.');
//     if (containsBlockedWords(form.description))           return setError('Description contains inappropriate language. Please revise.');
//     if (containsBlockedWords(form.resource_consideration)) return setError('Resource Consideration contains inappropriate language. Please revise.');

//     const payload = { id, ...form, requesting_dept: dept };

//     try {
//       setLoading(true);
//       const res = await api.put('/initiatives', payload);
//       if (!res?.data) throw new Error('Invalid server response');
//       setSuccess(true);
//       setTimeout(() => {
//         router.back();
//         setTimeout(() => router.replace(`/resource-manager/create-edit-initiatives?refresh=${Date.now()}`), 100);
//       }, 1500);
//     } catch (err) {
//       console.error('Update error:', err);
//       setError(err?.response?.data?.error || err?.message || 'Failed to update initiative.');
//     } finally { setLoading(false); }
//   };

//   /* ===========================================================================
//      RENDER
//   =========================================================================== */
//   return (
//     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
//       <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
//         {success && (
//           <div role="status" className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm text-center font-semibold" style={styles.outfitFont}>
//             ✓ Changes saved successfully.
//           </div>
//         )}
//         <div className="p-6">
//           <h2 className="text-2xl font-bold mb-4 text-black" style={styles.outfitFont}>Edit Initiative</h2>
//           {error && (
//             <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm" style={styles.outfitFont}>
//               {error}<button onClick={() => setError('')} className="ml-3 font-bold text-red-900" aria-label="Dismiss">×</button>
//             </div>
//           )}
//           <form onSubmit={handleSubmit} noValidate>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <div className="flex flex-col">
//                 <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Project Name *</label>
//                 <input value={form.project} onChange={e => updateField('project', e.target.value.replace(/[^a-zA-Z0-9 .,\-'&]/g, ''))} maxLength={150} required className={inputClass} style={styles.outfitFont} />
//               </div>

//               <StyledDropdown label="Category *" value={form.category} onChange={val => updateField('category', val)} options={['Baseline', 'Strategic', 'Discretionary Project / Enhancement', 'Vacation']} />
//               <StyledDropdown label="Lead *"     value={form.lead}     onChange={val => updateField('lead', val)}     options={employees.map(e => e.emp_name)} />
//               <StyledDropdown label="Status *"   value={form.status}   onChange={val => updateField('status', val)}   options={['Backlog', 'On Going', 'In Progress', 'On Hold', 'Cancelled', 'Completed']} />

//               <SearchableDropdown
//                 label="Requestor *"
//                 value={form.requestor}
//                 onChange={name => {
//                   updateField('requestor', name);
//                   const req = requestors.find(r => r.emp_name === name);
//                   if (!req) { updateField('requestor_vp', ''); setDept(''); return; }
//                   updateField('requestor_vp', req.requestor_vp_name);
//                   fetchDept(req.requestor_vp_name);
//                 }}
//                 list={requestors}
//               />

//               {/* Requestor VP + Requesting Dept — read-only, auto-filled */}
//               <div className="flex flex-col">
//                 <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Requestor VP</label>
//                 <input value={form.requestor_vp} readOnly className={readOnlyClass} style={styles.outfitFont} />
//                 <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Auto-filled from Requestor</span>
//               </div>
//               <div className="flex flex-col">
//                 <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Requesting Dept</label>
//                 <input value={dept} readOnly className={readOnlyClass} style={styles.outfitFont} />
//                 <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Auto-filled from Requestor</span>
//               </div>

//               <div className="flex flex-col">
//                 <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
//                   Completion Date{(form.status === 'Completed' || form.status === 'Cancelled') ? ' *' : ''}
//                 </label>
//                 <input type="date" value={form.completion_date} onChange={e => updateField('completion_date', e.target.value)} onFocus={e => e.target.showPicker?.()} className={inputClass} style={styles.outfitFont} />
//               </div>

//               <div className="flex flex-col">
//                 <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Target Period *</label>
//                 <input value={form.target_period} onChange={e => updateField('target_period', e.target.value.replace(/[^a-zA-Z0-9 .,\-'/]/g, ''))} maxLength={100} required className={inputClass} style={styles.outfitFont} />
//               </div>
//             </div>

//             <div className="flex flex-col mt-4">
//               <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Description *</label>
//               <textarea value={form.description} onChange={e => updateField('description', e.target.value.replace(/[^a-zA-Z0-9 .,\-'&()]/g, ''))} maxLength={1000} required rows={3} className={inputClass} style={styles.outfitFont} />
//             </div>

//             <div className="flex flex-col mt-4">
//               <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Resource Consideration</label>
//               <textarea value={form.resource_consideration} onChange={e => updateField('resource_consideration', e.target.value.replace(/[^a-zA-Z0-9 .,\-'&()]/g, ''))} maxLength={500} rows={3} className={inputClass} style={styles.outfitFont} />
//             </div>

//             <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
//               <button type="button" onClick={() => router.back()} disabled={loading} className={`${btnDarkClass} w-full sm:w-auto`} style={styles.outfitFont}>Cancel</button>
//               <button type="submit" disabled={loading || success} className={`${btnClass} w-full sm:w-auto`} style={styles.outfitFont}>{loading ? 'Saving...' : 'Save Changes'}</button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }


// /* =============================================================================
//    DEFAULT EXPORT — wraps inner component in Suspense so useSearchParams()
//    does not cause a prerender error during Next.js build.
//    ============================================================================= */
// export default function EditInitiativeModal() {
//   return (
//     <Suspense fallback={null}>
//       <EditInitiativeModalInner />
//     </Suspense>
//   );
// }


'use client';
export const dynamic = 'force-dynamic';

/* =============================================================================
   EditInitiativeModal.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Full-page modal for editing an existing initiative. Navigated to via the
     Edit button on the Initiatives table. Loads the initiative, populates the
     form, and PUTs the update to /api/initiatives.
     Full dark mode support on all elements.

   HOW IT WORKS:
     1. Reads the initiative ID from URL params (?id=)
     2. Fetches employees, requestors, and the current initiative data in parallel
     3. When a Requestor is changed, auto-resolves the VP and fetches the dept
     4. On submit: validates → profanity check → PUT
     5. On success: navigates back and triggers a refresh on the Initiatives page

   SECURITY MODEL:
     • initiative ID from URL params passed through encodeURIComponent().
     • Profanity checks on project, target_period, description, and
       resource_consideration before submit.
     • VP name passed through encodeURIComponent() in the dept lookup URL.
     • All dropdown options come from the backend — never user-typed input.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter, useSearchParams
   ============================================================================= */

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

/* -----------------------------------------------------------------------------
   SHARED BUTTON CLASSES — full dark mode support.
----------------------------------------------------------------------------- */
const btnClass = `
  px-4 py-2 rounded text-sm
  bg-[#017ACB] dark:bg-[#005a96] text-white
  border border-black/50 dark:border-slate-500
  hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30
  hover:text-gray-700 dark:hover:text-slate-100
  transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
`;

const btnDarkClass = `
  px-4 py-2 rounded text-sm
  bg-[#003A5C] dark:bg-slate-700 text-white
  border border-black/50 dark:border-slate-500
  hover:bg-[#017ACB]/20 dark:hover:bg-slate-600
  hover:text-gray-700 dark:hover:text-slate-100
  transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
`;

const styles        = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };
const inputClass    = 'bg-white dark:bg-slate-800 text-black dark:text-slate-100 border border-black dark:border-slate-600 p-2 rounded hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400 w-full';
const readOnlyClass = 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border border-black dark:border-slate-600 p-2 rounded cursor-not-allowed w-full';

const BLOCKED_WORDS = [
  "kill","murder","stab","shoot","die","death","dead","attack","hate","sucks",
  "stupid","idiot","moron","dumb","loser","trash","ass","bastard","bitch","damn",
  "hell","crap","shit","fuck","cunt","dick","cock","pussy","whore","slut",
  "nigger","faggot","retard","rape","bomb","terror","threat","hurt","harm",
  "destroy","beat","punch","fight","abuse","violent","violence","weapon","knife","gun",
];

function containsBlockedWords(text) {
  if (!text) return false;
  return BLOCKED_WORDS.some(word => new RegExp(`\\b${word}\\b`, "i").test(text));
}

/* =============================================================================
   COMPONENT: SearchableDropdown — dark mode aware, for long lists with search.
   ============================================================================= */
function SearchableDropdown({ label, value, onChange, list }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = (list || [])
    .filter(p => p.emp_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const s = search.toLowerCase();
      const aM = a.emp_name?.toLowerCase().startsWith(s);
      const bM = b.emp_name?.toLowerCase().startsWith(s);
      return aM === bM ? 0 : aM ? -1 : 1;
    });

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div
        className="bg-white dark:bg-slate-800 text-black dark:text-slate-100 border border-black dark:border-slate-600 p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/20 transition flex justify-between items-center"
        onClick={() => setOpen(o => !o)}
        style={styles.outfitFont}
      >
        <span className={value ? 'text-black dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'}>
          {value || `Select ${label}`}
        </span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-black dark:border-slate-600 rounded mt-1 z-50 shadow-lg dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value.replace(/[^a-zA-Z ]/g, ''))}
            onClick={e => e.stopPropagation()}
            className="w-full p-2 border-b border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-black dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:outline-none text-sm"
            style={styles.outfitFont}
          />
          <div className="max-h-40 overflow-y-auto">
            {filtered.map(emp => (
              <div
                key={emp.emp_name}
                onClick={() => { onChange(emp.emp_name); setOpen(false); setSearch(''); }}
                className={`p-2 cursor-pointer text-black dark:text-slate-100 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition text-sm ${value === emp.emp_name ? 'font-bold bg-[#CDE6F7] dark:bg-[#0A5F8A]/40' : ''}`}
                style={styles.outfitFont}
              >
                {emp.emp_name}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-2 text-gray-500 dark:text-slate-400 text-sm" style={styles.outfitFont}>No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   COMPONENT: StyledDropdown — dark mode aware, for fixed option lists.
   ============================================================================= */
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
      <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div
        className="bg-white dark:bg-slate-800 text-black dark:text-slate-100 border border-black dark:border-slate-600 p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/20 transition flex justify-between items-center"
        onClick={() => setOpen(o => !o)}
        style={styles.outfitFont}
      >
        <span className={value ? 'text-black dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'}>
          {value || `Select ${label}`}
        </span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-black dark:border-slate-600 rounded mt-1 z-50 max-h-48 overflow-y-auto shadow-lg dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          {(options || []).map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`p-2 cursor-pointer text-black dark:text-slate-100 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition text-sm ${value === opt ? 'font-bold bg-[#CDE6F7] dark:bg-[#0A5F8A]/40' : ''}`}
              style={styles.outfitFont}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   MAIN COMPONENT: EditInitiativeModalInner
   Uses useSearchParams — wrapped in Suspense by the default export.
   ============================================================================= */
function EditInitiativeModalInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id     = params.get('id');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const [employees, setEmployees]   = useState([]);
  const [requestors, setRequestors] = useState([]);
  const [dept, setDept]             = useState('');

  const [form, setForm] = useState({
    project: '', category: '', lead: '', status: '',
    requestor: '', requestor_vp: '', completion_date: '',
    target_period: '', description: '', resource_consideration: '',
  });

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD DROPDOWNS
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const res = await api.get('/initiatives/dropdowns');
        if (!res?.data) throw new Error('Invalid dropdown response');
        setEmployees(res.data.employees   || []);
        setRequestors(res.data.requestors || []);
      } catch (err) { console.error('Failed to load dropdowns:', err); }
    };
    loadDropdowns();
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD INITIATIVE DATA — pre-populates the form
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!id) return;
    const loadInitiative = async () => {
      try {
        const res = await api.get(`/initiatives/${encodeURIComponent(id)}`);
        if (!res?.data) throw new Error('Invalid initiative response');
        const data = res.data;
        setForm({
          project:                data.project_name    || '',
          category:               data.category        || '',
          lead:                   data.leader          || '',
          status:                 data.status          || '',
          requestor:              data.requestor       || '',
          requestor_vp:           data.requestor_vp    || '',
          completion_date:        data.completion_date || '',
          target_period:          data.target_period   || '',
          description:            data.description     || '',
          resource_consideration: data.resource_notes  || '',
        });
        setDept(data.requesting_dept || '');
      } catch (err) {
        console.error('Failed to load initiative:', err);
        setError('Failed to load initiative data. Please try again.');
      }
    };
    loadInitiative();
  }, [id]);

  /* ---------------------------------------------------------------------------
     HANDLER: fetchDept — looks up requesting dept from VP name
  --------------------------------------------------------------------------- */
  const fetchDept = async (vpName) => {
    if (!vpName?.trim()) return;
    try {
      const res = await api.get(`/initiatives/dept/search?name=${encodeURIComponent(vpName)}`);
      setDept(res?.data?.dept_name || '');
    } catch { setDept(''); }
  };

  /* ---------------------------------------------------------------------------
     HANDLER: handleSubmit
  --------------------------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.project.trim())       return setError('Project Name is required.');
    if (!form.category)             return setError('Category is required.');
    if (!form.lead)                 return setError('Lead is required.');
    if (!form.status)               return setError('Status is required.');
    if (!form.requestor)            return setError('Requestor is required.');
    if (!form.target_period.trim()) return setError('Target Period is required.');
    if (!form.description.trim())   return setError('Description is required.');
    if ((form.status === 'Completed' || form.status === 'Cancelled') && !form.completion_date)
      return setError('Completion date is required when status is Completed or Cancelled.');

    if (containsBlockedWords(form.project))                return setError('Project Name contains inappropriate language. Please revise.');
    if (containsBlockedWords(form.target_period))          return setError('Target Period contains inappropriate language. Please revise.');
    if (containsBlockedWords(form.description))            return setError('Description contains inappropriate language. Please revise.');
    if (containsBlockedWords(form.resource_consideration)) return setError('Resource Consideration contains inappropriate language. Please revise.');

    const payload = { id, ...form, requesting_dept: dept };

    try {
      setLoading(true);
      const res = await api.put('/initiatives', payload);
      if (!res?.data) throw new Error('Invalid server response');
      setSuccess(true);
      setTimeout(() => {
        router.back();
        setTimeout(() => router.replace(`/resource-manager/create-edit-initiatives?refresh=${Date.now()}`), 100);
      }, 1500);
    } catch (err) {
      console.error('Update error:', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to update initiative.');
    } finally { setLoading(false); }
  };

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-transparent dark:border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* Success banner */}
        {success && (
          <div role="status" className="mx-6 mt-6 p-3 bg-green-100 dark:bg-emerald-900/40 border border-green-400 dark:border-emerald-700 text-green-800 dark:text-emerald-200 rounded text-sm text-center font-semibold" style={styles.outfitFont}>
            ✓ Changes saved successfully.
          </div>
        )}

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-black dark:text-white" style={styles.outfitFont}>
            Edit Initiative
          </h2>

          {/* Error banner */}
          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded text-sm" style={styles.outfitFont}>
              {error}
              <button onClick={() => setError('')} className="ml-3 font-bold text-red-900 dark:text-red-200" aria-label="Dismiss">×</button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Project Name */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Project Name *</label>
                <input
                  value={form.project}
                  onChange={e => updateField('project', e.target.value.replace(/[^a-zA-Z0-9 .,\-'&]/g, ''))}
                  maxLength={150}
                  required
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

              <StyledDropdown label="Category *" value={form.category} onChange={val => updateField('category', val)} options={['Baseline', 'Strategic', 'Discretionary Project / Enhancement', 'Vacation']} />
              <StyledDropdown label="Lead *"     value={form.lead}     onChange={val => updateField('lead', val)}     options={employees.map(e => e.emp_name)} />
              <StyledDropdown label="Status *"   value={form.status}   onChange={val => updateField('status', val)}   options={['Backlog', 'On Going', 'In Progress', 'On Hold', 'Cancelled', 'Completed']} />

              {/* Requestor — auto-fills VP + Dept */}
              <SearchableDropdown
                label="Requestor *"
                value={form.requestor}
                onChange={name => {
                  updateField('requestor', name);
                  const req = requestors.find(r => r.emp_name === name);
                  if (!req) { updateField('requestor_vp', ''); setDept(''); return; }
                  updateField('requestor_vp', req.requestor_vp_name);
                  fetchDept(req.requestor_vp_name);
                }}
                list={requestors}
              />

              {/* Requestor VP — read-only, auto-filled */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Requestor VP</label>
                <input value={form.requestor_vp} readOnly className={readOnlyClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5" style={styles.outfitFont}>Auto-filled from Requestor</span>
              </div>

              {/* Requesting Dept — read-only, auto-filled */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Requesting Dept</label>
                <input value={dept} readOnly className={readOnlyClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5" style={styles.outfitFont}>Auto-filled from Requestor</span>
              </div>

              {/* Completion Date */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>
                  Completion Date{(form.status === 'Completed' || form.status === 'Cancelled') ? ' *' : ''}
                </label>
                <input
                  type="date"
                  value={form.completion_date}
                  onChange={e => updateField('completion_date', e.target.value)}
                  onFocus={e => e.target.showPicker?.()}
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

              {/* Target Period */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Target Period *</label>
                <input
                  value={form.target_period}
                  onChange={e => updateField('target_period', e.target.value.replace(/[^a-zA-Z0-9 .,\-'/]/g, ''))}
                  maxLength={100}
                  required
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col mt-4">
              <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Description *</label>
              <textarea
                value={form.description}
                onChange={e => updateField('description', e.target.value.replace(/[^a-zA-Z0-9 .,\-'&()]/g, ''))}
                maxLength={1000}
                required
                rows={3}
                className={inputClass}
                style={styles.outfitFont}
              />
            </div>

            {/* Resource Consideration */}
            <div className="flex flex-col mt-4">
              <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Resource Consideration</label>
              <textarea
                value={form.resource_consideration}
                onChange={e => updateField('resource_consideration', e.target.value.replace(/[^a-zA-Z0-9 .,\-'&()]/g, ''))}
                maxLength={500}
                rows={3}
                className={inputClass}
                style={styles.outfitFont}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button type="button" onClick={() => router.back()} disabled={loading} className={`${btnDarkClass} w-full sm:w-auto`} style={styles.outfitFont}>
                Cancel
              </button>
              <button type="submit" disabled={loading || success} className={`${btnClass} w-full sm:w-auto`} style={styles.outfitFont}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   DEFAULT EXPORT — wraps inner component in Suspense so useSearchParams()
   does not cause a prerender error during Next.js build.
   ============================================================================= */
export default function EditInitiativeModal() {
  return (
    <Suspense fallback={null}>
      <EditInitiativeModalInner />
    </Suspense>
  );
}