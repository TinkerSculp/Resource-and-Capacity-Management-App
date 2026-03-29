"use client";

/* =============================================================================
   DashboardPage.jsx  (Admin Dashboard)
   -----------------------------------------------------------------------------
   PURPOSE:
     The Admin Dashboard — the only page accessible to account type 4 (Admin).
     Allows admins to view, create, and edit all user accounts in the system.

   HOW IT WORKS:
     1. On mount, validates the admin session from localStorage
     2. Loads all accounts, dropdown data, and the next available emp_id in parallel
     3. Renders an accounts table with search + column filters (Role, Type)
     4. Create Account button opens CreateAccountModal
     5. Edit button on each row opens EditAccountModal for that account
     6. AI chatbot panel available via the chat button in the header

   SUB-COMPONENTS:
     • EyeToggle          — Reusable show/hide password button
     • StyledDropdown     — Custom single-select dropdown (fixed option list)
     • SearchableDropdown — Custom searchable dropdown (long lists)
     • Checkbox           — Visual checkbox used inside column filter menus
     • EmployeeSection    — Conditional employee fields based on account type
     • CreateAccountModal — Full-page modal for creating a new account
     • EditAccountModal   — Full-page modal for editing an existing account

   COLUMN FILTERS (Role, Type):
     Role and Type columns have ▼ filter buttons matching the style used in
     ResourcesPage, InitiativesPage, and AssignmentsAllocationsPage.
     Filter menus use fixed positioning via menuPosition computed from the
     button's bounding rect — never clipped by overflow containers.
     Option lists are derived from the loaded accounts — never user-typed input.

   AI CHATBOT:
     Identical implementation to Header.jsx — same panel layout, same
     sendMessage handler, same typing indicator, same Enter-to-send behaviour.
     The admin dashboard manages its own chatbot because the global Header is
     suppressed on /admin routes by HeaderWrapper.

   ACCOUNT TYPE RULES:
     Type 1 (Resource Manager) — account + full employee doc (hierarchy fields)
     Type 2 (Stakeholder)      — account + minimal employee doc (requestor_vp only)
     Type 3 (Team Member)      — account + full employee doc (same as type 1)
     Type 4 (Admin)            — account only, no employee doc

   SESSION TIMEOUT:
     Same 30-minute inactivity timeout as Header.jsx — tracked via
     localStorage timestamp, checked every minute. On expiry, shows a modal
     and blocks all interactions until the user clicks Back to Login.

   SECURITY MODEL:
     • Session validated on mount — missing token redirects to /login.
     • All API calls use the shared api instance (JWT injected automatically).
     • All numeric ID fields coerced to Number() before POST/PUT.
     • Password only included in edit payload if a new one was entered.
     • Blocked words checked on Other Information before submit.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter for login redirect
     • next/image       — Optimised logo image
   ============================================================================= */

import { useEffect, useState, useTransition, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

/* -----------------------------------------------------------------------------
   SESSION TIMEOUT CONSTANTS — matches Header.jsx exactly.
----------------------------------------------------------------------------- */
const TIMEOUT_MS      = 30 * 60 * 1000;
const CHECK_EVERY_MS  = 60 * 1000;
const LAST_ACTIVE_KEY = 'lastActive';
const LOGIN_PATH      = '/login';

/* -----------------------------------------------------------------------------
   SHARED BUTTON CLASSES — neumorphic, matches all other pages in the app.
----------------------------------------------------------------------------- */
const btnClass = `px-4 py-2 rounded text-sm bg-[#017ACB] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]`;

const btnDarkClass = `px-4 py-2 rounded text-sm bg-[#003A5C] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]`;

const inputClass    = 'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black w-full text-sm';
const readOnlyClass = 'bg-gray-100 text-gray-500 border border-black p-2 rounded cursor-not-allowed w-full text-sm';

/* -----------------------------------------------------------------------------
   COLUMN FILTER BUTTON CLASS — ▼ inside table header cells.
   Matches the colBtnClass used in AssignmentsAllocationsPage, ResourcesPage, etc.
----------------------------------------------------------------------------- */
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
  min-w-[12rem] w-max max-w-xs max-h-[min(60vh,420px)] overflow-y-auto
  z-[30000] border border-gray-300 pointer-events-auto
`;

/* =============================================================================
   COMPONENT: Checkbox — used inside column filter menus.
   ============================================================================= */
const Checkbox = ({ checked }) => (
  <span className="w-4 h-4 flex-shrink-0 border border-black rounded-sm flex items-center justify-center transition relative overflow-hidden">
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
   COMPONENT: EyeToggle — show/hide password button.
   ============================================================================= */
function EyeToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7a9.77 9.77 0 012.168-3.832M6.343 6.343A9.956 9.956 0 0112 5c5 0 9 4 9 7a9.77 9.77 0 01-1.657 2.343M3 3l18 18" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

/* =============================================================================
   COMPONENT: StyledDropdown — single-select, fixed option list.
   ============================================================================= */
function StyledDropdown({ label, value, onChange, options, placeholder, required }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>
        {label}{required && ' *'}
      </label>
      <div
        className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center text-sm"
        onClick={() => setOpen(o => !o)}
        style={styles.outfitFont}
      >
        <span className={selected ? 'text-black' : 'text-gray-400'}>
          {selected ? selected.label : (placeholder || `Select ${label}`)}
        </span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 max-h-48 overflow-y-auto shadow-lg">
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm font-semibold ${String(value) === String(opt.value) ? 'bg-[#CDE6F7]' : ''}`}
              style={styles.outfitFont}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   COMPONENT: SearchableDropdown — searchable, for long employee lists.
   ============================================================================= */
function SearchableDropdown({ label, value, onChange, options, placeholder }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const ref               = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div
        className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center text-sm"
        onClick={() => setOpen(o => !o)}
        style={styles.outfitFont}
      >
        <span className={selected ? 'text-black' : 'text-gray-400'}>
          {selected ? selected.label : (placeholder || `Select ${label}`)}
        </span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 shadow-lg">
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClick={e => e.stopPropagation()}
            className="w-full p-2 border-b border-gray-300 text-black focus:outline-none focus:ring-1 focus:ring-black text-sm hover:bg-[#017ACB]/20 transition"
            style={styles.outfitFont}
          />
          <div className="max-h-40 overflow-y-auto">
            {filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm font-semibold ${String(value) === String(opt.value) ? 'bg-[#CDE6F7]' : ''}`}
                style={styles.outfitFont}
              >
                {opt.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-2 text-gray-400 text-sm" style={styles.outfitFont}>No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   BLOCKED WORDS — applied to Other Information before submit.
   ============================================================================= */
const BLOCKED_WORDS = [
  "kill","murder","stab","shoot","die","death","dead","attack","hate","sucks",
  "stupid","idiot","moron","dumb","loser","trash","ass","bastard","bitch","damn",
  "hell","crap","shit","fuck","cunt","dick","cock","pussy","whore","slut",
  "nigger","faggot","retard","rape","bomb","terror","threat","hurt","harm",
  "destroy","beat","punch","fight","abuse","violent","violence","weapon","knife","gun",
];

function containsBlockedWords(text) {
  if (!text) return false;
  return BLOCKED_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text));
}

/* =============================================================================
   COMPONENT: EmployeeSection
   Renders employee detail fields for account types 1, 2, 3. Null for type 4.
   Type 1 & 3: full hierarchy. Type 2: Requestor VP only.
   ============================================================================= */
function EmployeeSection({ accTypeId, form, update, deptOptions, empOptions, managerEmpOptions }) {
  const isStakeholder     = Number(accTypeId) === 2;
  const isTeamMember      = Number(accTypeId) === 3;
  const isResourceManager = Number(accTypeId) === 1;

  if (!isStakeholder && !isTeamMember && !isResourceManager) return null;

  return (
    <div className="border-t border-gray-200 pt-4 mb-4">
      <p className="text-sm font-semibold text-[#017ACB] mb-3" style={styles.outfitFont}>Employee Details</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Name *</label>
          <input value={form.emp_name} onChange={e => update('emp_name', e.target.value.replace(/[^a-zA-Z .'\-]/g, ''))} placeholder="e.g. Jane Smith" maxLength={100} className={inputClass} style={styles.outfitFont} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Title *</label>
          <input value={form.emp_title} onChange={e => update('emp_title', e.target.value.replace(/[^a-zA-Z .,\-]/g, ''))} placeholder="e.g. Solution Analyst II" maxLength={100} className={inputClass} style={styles.outfitFont} />
        </div>
        <StyledDropdown label="Department" value={form.dept_no} onChange={val => update('dept_no', val)} options={deptOptions} placeholder="Select Department" required />
        {isStakeholder && (
          <SearchableDropdown label="Requestor VP *" value={form.requestor_vp} onChange={val => update('requestor_vp', val)} options={managerEmpOptions || empOptions} placeholder="Select Requestor VP" />
        )}
        {(isTeamMember || isResourceManager) && (
          <>
            <SearchableDropdown label="Reports To *"     value={form.reports_to}     onChange={val => update('reports_to', val)}     options={managerEmpOptions || empOptions} placeholder="Select Reports To" />
            <SearchableDropdown label="Manager Level *"  value={form.manager_level}  onChange={val => update('manager_level', val)}  options={managerEmpOptions || empOptions} placeholder="Select Manager Level" />
            <SearchableDropdown label="Director Level *" value={form.director_level} onChange={val => update('director_level', val)} options={managerEmpOptions || empOptions} placeholder="Select Director Level" />
            <SearchableDropdown label="VP *"             value={form.requestor_vp}   onChange={val => update('requestor_vp', val)}   options={managerEmpOptions || empOptions} placeholder="Select VP" />
          </>
        )}
      </div>
      {(isTeamMember || isResourceManager) && (
        <>
          <div className="flex flex-col mt-4">
            <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Other Information</label>
            <textarea value={form.other_info} onChange={e => update('other_info', e.target.value.replace(/[^a-zA-Z0-9 .,]/g, ''))} rows={2} maxLength={500} className={inputClass} style={styles.outfitFont} />
          </div>
          <div className="mt-4">
            <label className="text-xs text-black mb-2 font-semibold block" style={styles.outfitFont}>Status</label>
            <div className="flex gap-3">
              {['Active', 'Inactive'].map(s => (
                <button key={s} type="button" onClick={() => update('current_status', s)}
                  className={`px-4 py-1.5 rounded text-sm border border-black/50 font-semibold transition shadow-[2px_2px_6px_rgba(0,0,0,0.2),-2px_-2px_6px_rgba(255,255,255,0.4)] ${form.current_status === s ? (s === 'Active' ? 'bg-green-100 text-black' : 'bg-red-100 text-black') : 'bg-white text-black hover:bg-gray-100'}`}
                  style={styles.outfitFont}>{s}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* =============================================================================
   COMPONENT: CreateAccountModal
   ============================================================================= */
function CreateAccountModal({ onClose, onSuccess, dropdowns, nextEmpId }) {
  const [form, setForm] = useState({
    acc_type_id: '', emp_id: nextEmpId || '', account_id: '', username: '', password: '',
    emp_name: '', emp_title: '', dept_no: '', requestor_vp: '',
    reports_to: '', manager_level: '', director_level: '', other_info: '', current_status: 'Active',
  });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update      = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const accTypeId   = Number(form.acc_type_id);
  const needsEmployee = accTypeId === 1 || accTypeId === 2 || accTypeId === 3;

  const accountTypeOptions = (dropdowns.accountTypes || []).map(t => ({ value: t.acc_type_id, label: `${t.acc_type_id} — ${t.acc_type}` }));
  const deptOptions        = (dropdowns.departments  || []).map(d => ({ value: d.dept_no,     label: `${d.dept_no} — ${d.dept_name}` }));
  const empOptions         = (dropdowns.employees    || []).map(e => ({ value: e.emp_id,      label: `${e.emp_name} (${e.emp_id})` }));
  const managerEmpOptions  = (dropdowns.employees    || [])
    .filter(e => e.acc_type_id === 1 || e.acc_type_id === 2)
    .map(e => ({ value: e.emp_id, label: `${e.emp_name} (${e.emp_id})` }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.acc_type_id)         return setError('Account type is required.');
    if (!form.account_id.trim())   return setError('Account ID is required.');
    if (!form.username.trim())     return setError('Username is required.');
    if (containsBlockedWords(form.username))  return setError('Username contains inappropriate language. Please revise.');
    if (!form.password.trim())     return setError('Password is required.');
    if (form.password.trim().length < 8) return setError('Password must be at least 8 characters.');
    if (!/[!@#$%^&*()_+=\[\]{};:',.|~`]/.test(form.password)) return setError('Password must contain at least one special character (e.g. ! @ # $ %).');
    if (needsEmployee && containsBlockedWords(form.other_info)) return setError('Other Information contains inappropriate language. Please revise.');
    if (needsEmployee && !form.emp_name.trim())  return setError('Name is required.');
    if (needsEmployee && containsBlockedWords(form.emp_name))  return setError('Name contains inappropriate language. Please revise.');
    if (needsEmployee && !form.emp_title.trim()) return setError('Title is required.');
    if (needsEmployee && containsBlockedWords(form.emp_title)) return setError('Title contains inappropriate language. Please revise.');
    if (needsEmployee && !form.dept_no)          return setError('Department is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.reports_to)     return setError('Reports To is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.manager_level)  return setError('Manager Level is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.director_level) return setError('Director Level is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.requestor_vp)   return setError('VP is required.');
    if (accTypeId === 2 && !form.requestor_vp) return setError('Requestor VP is required.');
    try {
      setLoading(true);
      await api.post('/admin/accounts', {
        ...form,
        acc_type_id: Number(form.acc_type_id), emp_id: Number(form.emp_id),
        requestor_vp:   form.requestor_vp   ? Number(form.requestor_vp)   : null,
        reports_to:     form.reports_to     ? Number(form.reports_to)     : null,
        manager_level:  form.manager_level  ? Number(form.manager_level)  : null,
        director_level: form.director_level ? Number(form.director_level) : null,
      });
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create account.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {success && <div role="status" className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm text-center font-semibold" style={styles.outfitFont}>✓ Account created successfully.</div>}
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-black" style={styles.outfitFont}>Create Account</h2>
          {error && <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm" style={styles.outfitFont}>{error}<button onClick={() => setError('')} className="ml-3 font-bold text-red-900">×</button></div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <StyledDropdown label="Account Type" value={form.acc_type_id} onChange={val => update('acc_type_id', val)} options={accountTypeOptions} placeholder="Select Account Type" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Employee ID</label>
                <input value={form.emp_id} onChange={e => update('emp_id', e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Auto-suggested — change if needed</span>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Account ID *</label>
                <input value={form.account_id} onChange={e => update('account_id', e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g. 000112" className={inputClass} style={styles.outfitFont} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Username *</label>
                <input value={form.username} onChange={e => update('username', e.target.value.replace(/[^a-zA-Z]/g, ''))} placeholder="e.g. jmulligan" className={inputClass} style={styles.outfitFont} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Password *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value.replace(/[<>\/\-"]/g, ''))} placeholder="Enter password" className={`${inputClass} pr-8`} style={styles.outfitFont} />
                  <EyeToggle show={showPassword} onToggle={() => setShowPassword(p => !p)} />
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Min 8 chars, must include a special character (e.g. ! @ # $)</span>
              </div>
            </div>
            <EmployeeSection accTypeId={form.acc_type_id} form={form} update={update} deptOptions={deptOptions} empOptions={empOptions} managerEmpOptions={managerEmpOptions} />
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} disabled={loading} className={`${btnDarkClass} w-full sm:w-auto`} style={styles.outfitFont}>Cancel</button>
              <button type="submit" disabled={loading || success} className={`${btnClass} w-full sm:w-auto`} style={styles.outfitFont}>{loading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   COMPONENT: EditAccountModal
   emp_id and acc_type_id are read-only — cannot be changed after creation.
   Password is optional — blank = keep existing.
   ============================================================================= */
function EditAccountModal({ account, onClose, onSuccess, dropdowns }) {
  const [form, setForm] = useState({
    acc_type_id:    account.acc_type_id   || '',
    account_id:     account.account_id    || '',
    username:       account.username      || '',
    password:       '',
    emp_name:       account.emp_name      || '',
    emp_title:      account.emp_title     || '',
    dept_no:        account.dept_no       || '',
    requestor_vp:   account.requestor_vp   != null ? String(account.requestor_vp)   : '',
    reports_to:     account.reports_to     != null ? String(account.reports_to)     : '',
    manager_level:  account.manager_level  != null ? String(account.manager_level)  : '',
    director_level: account.director_level != null ? String(account.director_level) : '',
    other_info:     account.other_info    || '',
    current_status: account.current_status || 'Active',
  });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update        = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const accTypeId     = account.acc_type_id;
  const needsEmployee = accTypeId === 1 || accTypeId === 2 || accTypeId === 3;

  const deptOptions       = (dropdowns.departments || []).map(d => ({ value: d.dept_no, label: `${d.dept_no} — ${d.dept_name}` }));
  const empOptions        = (dropdowns.employees   || []).map(e => ({ value: e.emp_id,  label: `${e.emp_name} (${e.emp_id})` }));
  const managerEmpOptions = (dropdowns.employees   || [])
    .filter(e => e.acc_type_id === 1 || e.acc_type_id === 2)
    .map(e => ({ value: e.emp_id, label: `${e.emp_name} (${e.emp_id})` }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username.trim())   return setError('Username is required.');
    if (containsBlockedWords(form.username))  return setError('Username contains inappropriate language. Please revise.');
    if (!form.account_id.trim()) return setError('Account ID is required.');
    if (form.password.trim() && form.password.trim().length < 8) return setError('Password must be at least 8 characters.');
    if (form.password.trim() && !/[!@#$%^&*()_+=\[\]{};:',.|~`]/.test(form.password)) return setError('Password must contain at least one special character (e.g. ! @ # $ %).');
    if (needsEmployee && containsBlockedWords(form.other_info)) return setError('Other Information contains inappropriate language. Please revise.');
    if (needsEmployee && !form.emp_name.trim())  return setError('Name is required.');
    if (needsEmployee && containsBlockedWords(form.emp_name))  return setError('Name contains inappropriate language. Please revise.');
    if (needsEmployee && !form.emp_title.trim()) return setError('Title is required.');
    if (needsEmployee && containsBlockedWords(form.emp_title)) return setError('Title contains inappropriate language. Please revise.');
    if (needsEmployee && !form.dept_no)          return setError('Department is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.reports_to)     return setError('Reports To is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.manager_level)  return setError('Manager Level is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.director_level) return setError('Director Level is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.requestor_vp)   return setError('VP is required.');
    if (accTypeId === 2 && !form.requestor_vp)   return setError('Requestor VP is required.');

    const payload = {
      account_id: form.account_id, username: form.username, acc_type_id: Number(form.acc_type_id),
      ...(form.password.trim() ? { password: form.password } : {}),
      ...(needsEmployee ? { emp_name: form.emp_name, emp_title: form.emp_title, dept_no: form.dept_no } : {}),
      ...(accTypeId === 2 ? { requestor_vp: form.requestor_vp ? Number(form.requestor_vp) : null } : {}),
      ...((accTypeId === 1 || accTypeId === 3) ? {
        reports_to:     form.reports_to     ? Number(form.reports_to)     : null,
        manager_level:  form.manager_level  ? Number(form.manager_level)  : null,
        director_level: form.director_level ? Number(form.director_level) : null,
        requestor_vp:   form.requestor_vp   ? Number(form.requestor_vp)   : null,
        other_info:     form.other_info, current_status: form.current_status,
      } : {}),
    };

    try {
      setLoading(true);
      await api.put(`/admin/accounts/${account.emp_id}`, payload);
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save changes.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {success && <div role="status" className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm text-center font-semibold" style={styles.outfitFont}>✓ Changes saved successfully.</div>}
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-1 text-black" style={styles.outfitFont}>Edit Account</h2>
          <p className="text-xs text-gray-400 mb-4" style={styles.outfitFont}>Employee ID: {account.emp_id} — cannot be changed</p>
          {error && <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm" style={styles.outfitFont}>{error}<button onClick={() => setError('')} className="ml-3 font-bold text-red-900">×</button></div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Employee ID</label>
                <input value={account.emp_id} readOnly className={readOnlyClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Cannot be changed</span>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Account Type</label>
                <input value={`${account.acc_type_id} — ${account.role}`} readOnly className={readOnlyClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Cannot be changed</span>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Account ID *</label>
                <input value={form.account_id} onChange={e => update('account_id', e.target.value.replace(/[^0-9]/g, ''))} className={inputClass} style={styles.outfitFont} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Username *</label>
                <input value={form.username} onChange={e => update('username', e.target.value.replace(/[^a-zA-Z]/g, ''))} className={inputClass} style={styles.outfitFont} />
              </div>
              <div className="flex flex-col sm:col-span-2">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>New Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value.replace(/[<>\/\-"]/g, ''))} placeholder="Leave blank to keep current password" className={`${inputClass} pr-8`} style={styles.outfitFont} />
                  <EyeToggle show={showPassword} onToggle={() => setShowPassword(p => !p)} />
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5" style={styles.outfitFont}>Min 8 chars, must include a special character (e.g. ! @ # $)</span>
              </div>
            </div>
            <EmployeeSection accTypeId={accTypeId} form={form} update={update} deptOptions={deptOptions} empOptions={empOptions} managerEmpOptions={managerEmpOptions} />
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} disabled={loading} className={`${btnDarkClass} w-full sm:w-auto`} style={styles.outfitFont}>Cancel</button>
              <button type="submit" disabled={loading || success} className={`${btnClass} w-full sm:w-auto`} style={styles.outfitFont}>{loading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   MAIN COMPONENT: DashboardPage (Admin)
   ============================================================================= */
export default function DashboardPage() {
  const [user, setUser]                     = useState(null);
  const [hydrated, setHydrated]             = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [accounts, setAccounts]             = useState([]);
  const [dropdowns, setDropdowns]           = useState({ departments: [], employees: [], accountTypes: [] });
  const [nextEmpId, setNextEmpId]           = useState(null);
  const [loadingData, setLoadingData]       = useState(true);
  const [dataError, setDataError]           = useState('');
  const [showCreate, setShowCreate]         = useState(false);
  const [editAccount, setEditAccount]       = useState(null);
  const [searchTerm, setSearchTerm]         = useState('');

  /* ---------------------------------------------------------------------------
     COLUMN FILTER STATE — Role and Type columns
  --------------------------------------------------------------------------- */
  const [selectedRoles, setSelectedRoles]   = useState([]); // [] = show all
  const [showRoleMenu, setShowRoleMenu]     = useState(false);
  const [menuPosition, setMenuPosition]     = useState({ x: 0, y: 0 });

  /* ---------------------------------------------------------------------------
     AI CHATBOT STATE — identical to Header.jsx
  --------------------------------------------------------------------------- */
  const [chatOpen, setChatOpen]       = useState(false);
  const [messages, setMessages]       = useState([
    { role: 'assistant', content: "Hi! I'm your Resource & Capacity Management assistant. Ask me anything about using this app — managing resources, allocations, initiatives, reports, or accounts." }
  ]);
  const [chatInput, setChatInput]     = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef                    = useRef(null);

  const [, startTransition] = useTransition();
  const router = useRouter();

  /* ---------------------------------------------------------------------------
     EFFECT: SESSION VALIDATION
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      const token  = localStorage.getItem('token');
      if (!stored || !token) {
        localStorage.removeItem('user'); localStorage.removeItem('token');
        router.push(LOGIN_PATH); return;
      }
      startTransition(() => setUser(JSON.parse(stored)));
    } catch {
      localStorage.removeItem('user'); localStorage.removeItem('token');
      router.push(LOGIN_PATH);
    }
  }, [router]);

  /* ---------------------------------------------------------------------------
     EFFECT: HYDRATION GATE
  --------------------------------------------------------------------------- */
  useLayoutEffect(() => { startTransition(() => setHydrated(true)); }, []);

  /* ---------------------------------------------------------------------------
     EFFECT: SESSION TIMEOUT — identical to Header.jsx
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reset = () => localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    reset();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, reset));
    const iv = setInterval(() => {
      if (Date.now() - parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10) >= TIMEOUT_MS) {
        localStorage.clear(); setSessionExpired(true); clearInterval(iv);
      }
    }, CHECK_EVERY_MS);
    return () => { events.forEach(e => window.removeEventListener(e, reset)); clearInterval(iv); };
  }, []);

  /* ---------------------------------------------------------------------------
     HANDLER: sendMessage — identical to Header.jsx
     Sends the conversation to /api/ai/chat (backend proxy to Llama 3.1).
  --------------------------------------------------------------------------- */
  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      const res   = await api.post('/ai/chat', { messages: newMessages.map(m => ({ role: m.role, content: m.content })) });
      const reply = res.data?.reply || "Sorry, I couldn't get a response. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const errMsg = err?.response?.data?.error
        || (err?.message?.includes('Network') ? 'Could not reach the server. Make sure your backend is running.' : 'Something went wrong. Please try again.');
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  /* ---------------------------------------------------------------------------
     FUNCTION: loadData
     Fetches accounts, dropdowns, and next emp_id in parallel.
     Called on mount and after create/edit to keep the table fresh.
  --------------------------------------------------------------------------- */
  const loadData = async () => {
    try {
      setLoadingData(true);
      const [{ data: a }, { data: d }, { data: n }] = await Promise.all([
        api.get('/admin/accounts'),
        api.get('/admin/dropdowns'),
        api.get('/admin/next-emp-id'),
      ]);
      setAccounts(a || []);
      setDropdowns(d || { departments: [], employees: [], accountTypes: [] });
      setNextEmpId(n?.nextEmpId || '');
      setDataError('');
    } catch { setDataError('Failed to load data. Please refresh.'); }
    finally { setLoadingData(false); }
  };

  useEffect(() => { if (user) loadData(); }, [user]);

  const handleLogout = () => { localStorage.removeItem('user'); localStorage.removeItem('token'); router.push(LOGIN_PATH); };

  /* ---------------------------------------------------------------------------
     COLUMN FILTER HELPERS
  --------------------------------------------------------------------------- */
  const toggleSelection = (value, setFn, current) => {
    setFn(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  const closeAllMenus = () => { setShowRoleMenu(false); };

  const openMenu = (e, setFn, currentlyOpen) => {
    e.stopPropagation();
    if (currentlyOpen) { closeAllMenus(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left, y = rect.bottom + 4;
    if (x + 224 > window.innerWidth) x = window.innerWidth - 224 - 10;
    setMenuPosition({ x, y });
    closeAllMenus();
    setFn(true);
  };

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.dropdown-menu')) closeAllMenus(); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  /* ---------------------------------------------------------------------------
     DERIVED: available filter option lists (built from loaded accounts)
  --------------------------------------------------------------------------- */
  const availableRoles = [...new Set(accounts.map(a => a.role).filter(Boolean))].sort();

  /* ---------------------------------------------------------------------------
     FILTERING — search + role + type column filters applied together
  --------------------------------------------------------------------------- */
  const filteredAccounts = accounts.filter(acc => {
    // Global search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (acc.username   || '').toLowerCase().includes(q) ||
        (acc.account_id || '').toLowerCase().includes(q) ||
        (acc.role       || '').toLowerCase().includes(q) ||
        String(acc.emp_id).includes(q);
      if (!matchesSearch) return false;
    }
    // Role column filter
    if (selectedRoles.length > 0 && !selectedRoles.includes(acc.role)) return false;
    return true;
  });

  /* ---------------------------------------------------------------------------
     LOADING STATE
  --------------------------------------------------------------------------- */
  if (!hydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-10 w-10 border-b-2 border-[#017ACB] rounded-full" role="status" />
      </div>
    );
  }

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">

      {/* SESSION EXPIRED MODAL */}
      {sessionExpired && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] px-4" role="alertdialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-black mb-2" style={styles.outfitFont}>Session Expired</h2>
            <p className="text-sm text-gray-600 mb-6" style={styles.outfitFont}>Your session has timed out due to 30 minutes of inactivity. Please log in again to continue.</p>
            <button onClick={() => router.push(LOGIN_PATH)} className={`w-full ${btnClass}`} style={styles.outfitFont}>Back to Login</button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showCreate  && <CreateAccountModal onClose={() => setShowCreate(false)}   onSuccess={loadData} dropdowns={dropdowns} nextEmpId={nextEmpId} />}
      {editAccount && <EditAccountModal   account={editAccount} onClose={() => setEditAccount(null)} onSuccess={loadData} dropdowns={dropdowns} />}

      {/* AI CHATBOT PANEL — identical to Header.jsx */}
      {chatOpen && (
        <div className="fixed z-[99998] flex flex-col bg-white shadow-2xl border border-gray-200 overflow-hidden bottom-0 right-0 left-0 rounded-t-xl sm:bottom-4 sm:right-4 sm:left-auto sm:rounded-xl w-full sm:w-[360px] h-[70vh] sm:h-[520px]" style={styles.outfitFont}>
          {/* Chat header */}
          <div className="bg-[#017ACB] px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.849L3 20l1.18-3.54A7.956 7.956 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">App Assistant</p>
                <p className="text-white/70 text-xs">Powered by Llama 3.1</p>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-white/80 hover:text-white transition touch-manipulation" aria-label="Close chat">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#017ACB] text-white rounded-br-sm' : 'bg-white text-black border border-gray-200 rounded-bl-sm shadow-sm'}`}
                  style={styles.outfitFont}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {/* Typing indicator */}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-[#017ACB] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="px-3 py-3 border-t border-gray-200 bg-white flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-3 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-black bg-gray-50 hover:bg-[#017ACB]/20 transition"
              style={styles.outfitFont}
              disabled={chatLoading}
              autoComplete="off"
            />
            <button
              onClick={sendMessage}
              disabled={chatLoading || !chatInput.trim()}
              className="px-3 py-2 rounded-lg text-sm flex-shrink-0 bg-[#017ACB] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded-lg before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)] disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
              aria-label="Send message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* PAGE HEADER */}
      <header className="bg-[#017ACB] shadow-sm w-full sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid items-center gap-x-3 h-[clamp(4rem,5vw,5.5rem)]" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            <div className="flex items-center gap-2 sm:gap-3 justify-start">
              <Image src="/CapstoneDynamicsLogoWhite.png" alt="Capstone Dynamics logo" width={92} height={92} className="w-auto h-[clamp(3rem,4.5vw,5.2rem)] flex-shrink-0" priority />
              <h1 className="hidden lg:block font-bold text-white leading-tight text-[clamp(1rem,1.4vw,1.75rem)] whitespace-nowrap" style={styles.outfitFont}>Capstone Dynamics</h1>
            </div>
            <div className="text-center">
              <h1 className="font-bold text-white leading-snug text-[clamp(0.8rem,1.6vw,1.6rem)]" style={{ ...styles.outfitFont, maxWidth: '34rem', textAlign: 'center' }}>
                Resource &amp; Capacity Management Planner
              </h1>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <span className="hidden sm:block font-semibold text-white text-[clamp(0.8rem,1.1vw,1.3rem)] whitespace-nowrap" style={styles.outfitFont}>{user.username}</span>

              {/* AI Chat button — same design as Header.jsx */}
              <button
                onClick={() => setChatOpen(o => !o)}
                aria-label="Open AI assistant"
                title="Ask the AI assistant"
                className="rounded-full bg-white flex items-center justify-center flex-shrink-0 cursor-pointer transition hover:bg-[#CCE4F4] hover:shadow-[0_0_6px_#017ACB] active:scale-95 touch-manipulation w-[clamp(2rem,2.6vw,3rem)] h-[clamp(2rem,2.6vw,3rem)]"
              >
                <svg className="w-[55%] h-[55%] text-[#017ACB]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.849L3 20l1.18-3.54A7.956 7.956 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              <button onClick={handleLogout} className="px-4 py-2 rounded text-sm whitespace-nowrap bg-white text-[#017ACB] font-semibold border border-black/50 hover:bg-[#CCE4F4] transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.14)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.10),inset_0_-1px_2px_rgba(0,0,0,0.10)]" style={styles.outfitFont}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto min-h-0">

        {/* PAGE HEADER ROW */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-3xl font-bold text-gray-900" style={styles.outfitFont}>Admin Dashboard</h2>
          <div className="flex-1 flex justify-center px-4">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''))}
              placeholder="Search..."
              className="px-3 py-2 border border-gray-500 bg-gray-200 rounded text-gray-700 text-sm w-64 hover:bg-[#017ACB]/20 transition-colors focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              style={styles.outfitFont}
            />
          </div>
          <button onClick={() => setShowCreate(true)} className={btnClass} style={styles.outfitFont}>
            + Create Account
          </button>
        </div>

        {dataError && (
          <div role="alert" className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm" style={styles.outfitFont}>
            {dataError}
            <button onClick={() => setDataError('')} className="ml-3 font-bold text-red-900">×</button>
          </div>
        )}

        {/* ACCOUNTS TABLE */}
        <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
          {loadingData ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-b-2 border-[#017ACB] rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)]">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
                  <tr>
                    {/* Static columns */}
                    {['Edit', 'Emp ID', 'Username', 'Account ID'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold border-r border-black last:border-r-0 whitespace-nowrap" style={styles.outfitFont}>{h}</th>
                    ))}

                    {/* ROLE — filterable */}
                    <th className="px-4 py-3 text-left font-semibold border-r border-black whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                      <div className="flex justify-between items-center">
                        <span>Role</span>
                        <button className={colBtnClass} onClick={e => openMenu(e, setShowRoleMenu, showRoleMenu)}>▼</button>
                      </div>
                      {showRoleMenu && (
                        <div className={menuClass} style={{ top: menuPosition.y, left: menuPosition.x }} onClick={e => e.stopPropagation()}>
                          {/* "All" clears the filter */}
                          <div className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${selectedRoles.length === 0 ? 'font-bold' : ''}`} onClick={() => setSelectedRoles([])}>
                            <Checkbox checked={selectedRoles.length === 0} />All
                          </div>
                          {availableRoles.map(role => (
                            <div key={role} className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 ${selectedRoles.includes(role) ? 'font-bold' : ''}`} onClick={() => toggleSelection(role, setSelectedRoles, selectedRoles)}>
                              <Checkbox checked={selectedRoles.includes(role)} />{role}
                            </div>
                          ))}
                        </div>
                      )}
                    </th>

                    <th className="px-4 py-3 text-left font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 border-t border-black" style={styles.outfitFont}>
                        {searchTerm || selectedRoles.length > 0 ? 'No accounts match the current filters.' : 'No accounts found.'}
                      </td>
                    </tr>
                  ) : filteredAccounts.map((acc, i) => (
                    <tr key={acc.emp_id} className={`border-t border-black hover:bg-[#017ACB]/10 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-2 border-r border-black">
                        <button
                          onClick={() => setEditAccount(acc)}
                          className="px-2 py-1 rounded text-xs bg-[#017ACB] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[2px_2px_6px_rgba(0,0,0,0.2),-2px_-2px_6px_rgba(255,255,255,0.3)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-1px_2px_rgba(0,0,0,0.12)]"
                          style={styles.outfitFont}
                        >
                          Edit
                        </button>
                      </td>
                      <td className="px-4 py-2 text-black border-r border-black" style={styles.outfitFont}>{acc.emp_id}</td>
                      <td className="px-4 py-2 text-black border-r border-black" style={styles.outfitFont}>{acc.username}</td>
                      <td className="px-4 py-2 text-black border-r border-black" style={styles.outfitFont}>{acc.account_id}</td>
                      <td className="px-4 py-2 text-black border-r border-black" style={styles.outfitFont}>{acc.role}</td>
                      <td className="px-4 py-2">
                        {/* Colour-coded badge per account type */}
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          acc.acc_type_id === 4 ? 'bg-purple-100 text-purple-800' :
                          acc.acc_type_id === 1 ? 'bg-blue-100   text-blue-800'   :
                          acc.acc_type_id === 2 ? 'bg-yellow-100 text-yellow-800' :
                                                  'bg-green-100  text-green-800'
                        }`}>
                          {acc.acc_type_id} — {acc.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ACCOUNT COUNT */}
        {!loadingData && (
          <p className="text-sm text-gray-500" style={styles.outfitFont}>
            {(searchTerm || selectedRoles.length > 0)
              ? `Showing ${filteredAccounts.length} of ${accounts.length} account${accounts.length !== 1 ? 's' : ''}`
              : `Showing ${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>
    </div>
  );
}