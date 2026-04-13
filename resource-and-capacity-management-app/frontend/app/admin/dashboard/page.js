"use client";

export const dynamic = 'force-dynamic';

/* =============================================================================
   DashboardPage.jsx  (Admin Dashboard)
   -----------------------------------------------------------------------------
   PURPOSE:
     The Admin Dashboard — the only page accessible to account type 4 (Admin).
     Allows admins to view, create, and edit all user accounts in the system.
     Full dark mode support on all elements.

   HOW IT WORKS:
     1. On mount, validates the admin session from localStorage
     2. Loads all accounts, dropdown data, and the next available emp_id in parallel
     3. Renders an accounts table with search + Role column filter
     4. Create Account button opens CreateAccountModal
     5. Edit button on each row opens EditAccountModal for that account
     6. AI chatbot panel available via the chat button in the header

   SUB-COMPONENTS:
     • Checkbox           — Visual checkbox used inside column filter menus
     • EyeToggle          — Reusable show/hide password button
     • StyledDropdown     — Custom single-select dropdown (fixed option list)
     • SearchableDropdown — Custom searchable dropdown (long lists)
     • EmployeeSection    — Conditional employee fields based on account type
     • CreateAccountModal — Full-page modal for creating a new account
     • EditAccountModal   — Full-page modal for editing an existing account

   ACCOUNT TYPE RULES:
     Type 1 (Resource Manager) — account + full employee doc (hierarchy fields)
     Type 2 (Stakeholder)      — account + minimal employee doc (requestor_vp only)
     Type 3 (Team Member)      — account + full employee doc (same as type 1)
     Type 4 (Admin)            — account only, no employee doc

   DARK MODE:
     All elements use Tailwind dark: variants. Page, modals, table, inputs,
     dropdowns, chatbot, and badges all adapt to the system colour scheme.

   SESSION TIMEOUT:
     Same 30-minute inactivity timeout as Header.jsx. Tracked via localStorage
     timestamp, checked every minute. On expiry shows a modal and blocks all
     interactions until the user clicks Back to Login.

   SECURITY MODEL:
     • Session validated on mount — missing token redirects to /login.
     • All API calls use the shared api instance (JWT injected automatically).
     • All numeric ID fields coerced to Number() before POST/PUT.
     • Password only included in edit payload if a new one was entered.
     • Blocked words checked on username, name, title, and other info before submit.

   DEPENDENCIES:
     • @/lib/api        — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter for login redirect
     • next/image       — Optimised logo image
   ============================================================================= */

import { useEffect, useState, useTransition, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';

/* -----------------------------------------------------------------------------
   FONT STYLE
   Shared style object applied to all text elements for consistent typography.
----------------------------------------------------------------------------- */
const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

/* -----------------------------------------------------------------------------
   SESSION TIMEOUT CONSTANTS — matches Header.jsx exactly.
----------------------------------------------------------------------------- */
const TIMEOUT_MS      = 30 * 60 * 1000; // 30 minutes
const CHECK_EVERY_MS  = 60 * 1000;      // Check once per minute
const LAST_ACTIVE_KEY = 'lastActive';
const LOGIN_PATH      = '/login';

/* -----------------------------------------------------------------------------
   SHARED BUTTON CLASSES
   btnClass     — Primary blue button (Create, Save, Submit actions)
   btnDarkClass — Dark navy/slate button (Cancel actions)
   Both use neumorphic shadow styling matching all other pages in the app.
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

/* -----------------------------------------------------------------------------
   SHARED INPUT CLASSES
   inputClass    — Standard editable text/textarea inputs
   readOnlyClass — Non-editable display fields (emp_id, acc_type_id in edit modal)
----------------------------------------------------------------------------- */
const inputClass = `
  bg-white dark:bg-slate-800
  text-black dark:text-slate-100
  border border-black dark:border-slate-600
  p-2 rounded
  hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/20
  transition
  focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400
  w-full text-sm
`;

const readOnlyClass = `
  bg-gray-100 dark:bg-slate-700
  text-gray-500 dark:text-slate-400
  border border-black dark:border-slate-600
  p-2 rounded cursor-not-allowed w-full text-sm
`;

/* -----------------------------------------------------------------------------
   COLUMN FILTER BUTTON CLASS
   ▼ button inside the Role table header. Matches the style used across
   ResourcesPage, AssignmentsAllocationsPage, and InitiativesPage.
----------------------------------------------------------------------------- */
const colBtnClass = `
  ml-2
  bg-white dark:bg-slate-700
  text-[#017ACB] dark:text-[#4DAEFF]
  px-2 py-1 rounded text-xs font-bold
  border border-black/50 dark:border-slate-500
  hover:bg-[#CDE6F7] dark:hover:bg-slate-600
  transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.10),inset_0_-1px_2px_rgba(0,0,0,0.10)]
`;

/* -----------------------------------------------------------------------------
   COLUMN FILTER MENU CLASS
   Fixed-position overlay that floats above sticky table headers.
   z-[30000] ensures it renders above all other positioned elements.
----------------------------------------------------------------------------- */
const menuClass = `
  dropdown-menu fixed
  bg-white dark:bg-slate-800
  text-black dark:text-slate-100
  shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
  rounded
  min-w-[12rem] w-max max-w-xs
  max-h-[min(60vh,420px)] overflow-y-auto
  z-[30000]
  border border-gray-300 dark:border-slate-600
  pointer-events-auto
`;

/* -----------------------------------------------------------------------------
   BLOCKED WORDS LIST
   Applied to all free-text fields (username, emp_name, emp_title, other_info)
   before any POST or PUT to prevent inappropriate content being stored.
----------------------------------------------------------------------------- */
const BLOCKED_WORDS = [
  "kill", "murder", "stab", "shoot", "die", "death", "dead", "attack", "hate", "sucks",
  "stupid", "idiot", "moron", "dumb", "loser", "trash", "ass", "bastard", "bitch", "damn",
  "hell", "crap", "shit", "fuck", "cunt", "dick", "cock", "pussy", "whore", "slut",
  "nigger", "faggot", "retard", "rape", "bomb", "terror", "threat", "hurt", "harm",
  "destroy", "beat", "punch", "fight", "abuse", "violent", "violence", "weapon", "knife", "gun",
];

/* Checks if a string contains any blocked word using whole-word regex matching. */
function containsBlockedWords(text) {
  if (!text) return false;
  return BLOCKED_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text));
}

/* =============================================================================
   COMPONENT: Checkbox
   -----------------------------------------------------------------------------
   Visual-only checkbox used inside the Role column filter dropdown.
   Renders a custom styled checkbox with a dark-navy fill when checked.
   The hidden native input preserves accessibility semantics.
   ============================================================================= */
const Checkbox = ({ checked }) => (
  <span className="w-4 h-4 flex-shrink-0 border border-black dark:border-slate-400 rounded-sm flex items-center justify-center transition relative overflow-hidden">
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
   COMPONENT: EyeToggle
   -----------------------------------------------------------------------------
   Show/hide password toggle, absolutely positioned inside a relative container.
   Uses SVG eye icons to indicate current state.
   ============================================================================= */
function EyeToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition"
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? (
        /* Eye with slash — password is currently visible */
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7a9.77 9.77 0 012.168-3.832M6.343 6.343A9.956 9.956 0 0112 5c5 0 9 4 9 7a9.77 9.77 0 01-1.657 2.343M3 3l18 18" />
        </svg>
      ) : (
        /* Open eye — password is currently hidden */
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

/* =============================================================================
   COMPONENT: StyledDropdown
   -----------------------------------------------------------------------------
   Custom single-select dropdown for fixed option lists (account types, etc.).
   Closes on outside click via a mousedown listener on the document.
   Selected option is highlighted in brand blue.
   ============================================================================= */
function StyledDropdown({ label, value, onChange, options, placeholder, required }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);

  /* Close when clicking outside the dropdown */
  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div className="flex flex-col relative" ref={ref}>

      {/* Field label */}
      <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>
        {label}{required && ' *'}
      </label>

      {/* Trigger — displays selected value or placeholder */}
      <div
        className="bg-white dark:bg-slate-800 text-black dark:text-slate-100 border border-black dark:border-slate-600 p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/20 transition flex justify-between items-center text-sm"
        onClick={() => setOpen(o => !o)}
        style={styles.outfitFont}
      >
        <span className={selected ? 'text-black dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'}>
          {selected ? selected.label : (placeholder || `Select ${label}`)}
        </span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Options list */}
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-black dark:border-slate-600 rounded mt-1 z-50 max-h-48 overflow-y-auto shadow-lg dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`p-2 cursor-pointer text-black dark:text-slate-100 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition text-sm font-semibold ${String(value) === String(opt.value) ? 'bg-[#CDE6F7] dark:bg-[#0A5F8A]/40' : ''}`}
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
   COMPONENT: SearchableDropdown
   -----------------------------------------------------------------------------
   Custom searchable dropdown for long employee lists. Includes a text filter
   input at the top of the options list. Closes on outside click.
   ============================================================================= */
function SearchableDropdown({ label, value, onChange, options, placeholder }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const ref               = useRef(null);

  /* Close when clicking outside the dropdown */
  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  /* Filter options based on the current search query */
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div className="flex flex-col relative" ref={ref}>

      {/* Field label */}
      <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>
        {label}
      </label>

      {/* Trigger — displays selected value or placeholder */}
      <div
        className="bg-white dark:bg-slate-800 text-black dark:text-slate-100 border border-black dark:border-slate-600 p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/20 transition flex justify-between items-center text-sm"
        onClick={() => setOpen(o => !o)}
        style={styles.outfitFont}
      >
        <span className={selected ? 'text-black dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'}>
          {selected ? selected.label : (placeholder || `Select ${label}`)}
        </span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Searchable options list */}
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-black dark:border-slate-600 rounded mt-1 z-50 shadow-lg dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]">

          {/* Search filter input */}
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClick={e => e.stopPropagation()}
            className="w-full p-2 border-b border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-black dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400 text-sm hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/20 transition"
            style={styles.outfitFont}
          />

          {/* Filtered option rows */}
          <div className="max-h-40 overflow-y-auto">
            {filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                className={`p-2 cursor-pointer text-black dark:text-slate-100 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition text-sm font-semibold ${String(value) === String(opt.value) ? 'bg-[#CDE6F7] dark:bg-[#0A5F8A]/40' : ''}`}
                style={styles.outfitFont}
              >
                {opt.label}
              </div>
            ))}

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="p-2 text-gray-400 dark:text-slate-500 text-sm" style={styles.outfitFont}>
                No results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   COMPONENT: EmployeeSection
   -----------------------------------------------------------------------------
   Renders employee detail fields for account types 1, 2, and 3.
   Returns null for type 4 (Admin) — admins have no employee record.

   Type 2 (Stakeholder): Requestor VP only
   Type 1 (Resource Manager) & Type 3 (Team Member): full hierarchy fields
     — Reports To, Manager Level, Director Level, VP, Other Info, Status
   ============================================================================= */
function EmployeeSection({ accTypeId, form, update, deptOptions, empOptions, managerEmpOptions }) {
  const isStakeholder     = Number(accTypeId) === 2;
  const isTeamMember      = Number(accTypeId) === 3;
  const isResourceManager = Number(accTypeId) === 1;

  /* No employee fields for Admin (type 4) */
  if (!isStakeholder && !isTeamMember && !isResourceManager) return null;

  return (
    <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mb-4">

      {/* Section heading */}
      <p className="text-sm font-semibold text-[#017ACB] dark:text-[#4DAEFF] mb-3" style={styles.outfitFont}>
        Employee Details
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Name — all employee types */}
        <div className="flex flex-col">
          <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Name *</label>
          <input
            value={form.emp_name}
            onChange={e => update('emp_name', e.target.value.replace(/[^a-zA-Z .'\-]/g, ''))}
            placeholder="e.g. Jane Smith"
            maxLength={100}
            className={inputClass}
            style={styles.outfitFont}
          />
        </div>

        {/* Title — all employee types */}
        <div className="flex flex-col">
          <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Title *</label>
          <input
            value={form.emp_title}
            onChange={e => update('emp_title', e.target.value.replace(/[^a-zA-Z .,\-]/g, ''))}
            placeholder="e.g. Solution Analyst II"
            maxLength={100}
            className={inputClass}
            style={styles.outfitFont}
          />
        </div>

        {/* Department — all employee types */}
        <StyledDropdown
          label="Department"
          value={form.dept_no}
          onChange={val => update('dept_no', val)}
          options={deptOptions}
          placeholder="Select Department"
          required
        />

        {/* Requestor VP — Stakeholder (type 2) only */}
        {isStakeholder && (
          <SearchableDropdown
            label="Requestor VP *"
            value={form.requestor_vp}
            onChange={val => update('requestor_vp', val)}
            options={managerEmpOptions || empOptions}
            placeholder="Select Requestor VP"
          />
        )}

        {/* Full hierarchy — Resource Manager (type 1) and Team Member (type 3) */}
        {(isTeamMember || isResourceManager) && (
          <>
            <SearchableDropdown label="Reports To *"     value={form.reports_to}     onChange={val => update('reports_to', val)}     options={managerEmpOptions || empOptions} placeholder="Select Reports To" />
            <SearchableDropdown label="Manager Level *"  value={form.manager_level}  onChange={val => update('manager_level', val)}  options={managerEmpOptions || empOptions} placeholder="Select Manager Level" />
            <SearchableDropdown label="Director Level *" value={form.director_level} onChange={val => update('director_level', val)} options={managerEmpOptions || empOptions} placeholder="Select Director Level" />
            <SearchableDropdown label="VP *"             value={form.requestor_vp}   onChange={val => update('requestor_vp', val)}   options={managerEmpOptions || empOptions} placeholder="Select VP" />
          </>
        )}
      </div>

      {/* Other Information + Status — Resource Manager and Team Member only */}
      {(isTeamMember || isResourceManager) && (
        <>
          <div className="flex flex-col mt-4">
            <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Other Information</label>
            <textarea
              value={form.other_info}
              onChange={e => update('other_info', e.target.value.replace(/[^a-zA-Z0-9 .,]/g, ''))}
              rows={2}
              maxLength={500}
              className={inputClass}
              style={styles.outfitFont}
            />
          </div>

          {/* Active / Inactive status toggle buttons */}
          <div className="mt-4">
            <label className="text-xs text-black dark:text-slate-200 mb-2 font-semibold block" style={styles.outfitFont}>Status</label>
            <div className="flex gap-3">
              {['Active', 'Inactive'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update('current_status', s)}
                  className={`px-4 py-1.5 rounded text-sm border border-black/50 dark:border-slate-500 font-semibold transition shadow-[2px_2px_6px_rgba(0,0,0,0.2)] ${
                    form.current_status === s
                      ? (s === 'Active'
                          ? 'bg-green-100 dark:bg-green-900/40 text-black dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900/40 text-black dark:text-red-200')
                      : 'bg-white dark:bg-slate-700 text-black dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-600'
                  }`}
                  style={styles.outfitFont}
                >
                  {s}
                </button>
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
   -----------------------------------------------------------------------------
   Full-page modal overlay for creating a new user account.
   Validates all required fields, runs profanity checks, then POSTs to
   /admin/accounts. Shows a success banner for 1.5s then closes.

   FORM FIELDS:
     • Account Type — determines which employee fields are shown below
     • Employee ID  — auto-suggested from the backend, editable if needed
     • Account ID   — numeric string, required
     • Username     — letters only, required, profanity checked
     • Password     — min 8 chars, must include a special character
     • EmployeeSection — conditional fields based on the selected account type
   ============================================================================= */
function CreateAccountModal({ onClose, onSuccess, dropdowns, nextEmpId }) {

  /* ---------------------------------------------------------------------------
     FORM STATE — emp_id pre-populated with the next available value
  --------------------------------------------------------------------------- */
  const [form, setForm] = useState({
    acc_type_id:    '',
    emp_id:         nextEmpId || '',
    account_id:     '',
    username:       '',
    password:       '',
    emp_name:       '',
    emp_title:      '',
    dept_no:        '',
    requestor_vp:   '',
    reports_to:     '',
    manager_level:  '',
    director_level: '',
    other_info:     '',
    current_status: 'Active',
  });

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* Helper: update a single field in the form */
  const update        = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const accTypeId     = Number(form.acc_type_id);
  const needsEmployee = accTypeId === 1 || accTypeId === 2 || accTypeId === 3;

  /* ---------------------------------------------------------------------------
     DROPDOWN OPTION LISTS — built from backend-supplied dropdown data
  --------------------------------------------------------------------------- */
  const accountTypeOptions = (dropdowns.accountTypes || []).map(t => ({
    value: t.acc_type_id,
    label: `${t.acc_type_id} — ${t.acc_type}`,
  }));

  const deptOptions = (dropdowns.departments || []).map(d => ({
    value: d.dept_no,
    label: `${d.dept_no} — ${d.dept_name}`,
  }));

  const empOptions = (dropdowns.employees || []).map(e => ({
    value: e.emp_id,
    label: `${e.emp_name} (${e.emp_id})`,
  }));

  /* Only Resource Managers (1) and Stakeholders (2) can appear in hierarchy dropdowns */
  const managerEmpOptions = (dropdowns.employees || [])
    .filter(e => e.acc_type_id === 1 || e.acc_type_id === 2)
    .map(e => ({ value: e.emp_id, label: `${e.emp_name} (${e.emp_id})` }));

  /* ---------------------------------------------------------------------------
     SUBMIT HANDLER
     Validates all required fields and profanity, then POSTs to the backend.
  --------------------------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    /* --- Core account field validation --- */
    if (!form.acc_type_id)         return setError('Account type is required.');
    if (!form.account_id.trim())   return setError('Account ID is required.');
    if (!form.username.trim())     return setError('Username is required.');
    if (containsBlockedWords(form.username)) return setError('Username contains inappropriate language. Please revise.');
    if (!form.password.trim())     return setError('Password is required.');
    if (form.password.trim().length < 8) return setError('Password must be at least 8 characters.');
    if (!/[!@#$%^&*()_+=\[\]{};:',.|~`]/.test(form.password)) return setError('Password must contain at least one special character (e.g. ! @ # $ %).');

    /* --- Employee field validation (types 1, 2, 3 only) --- */
    if (needsEmployee && containsBlockedWords(form.other_info)) return setError('Other Information contains inappropriate language. Please revise.');
    if (needsEmployee && !form.emp_name.trim())                 return setError('Name is required.');
    if (needsEmployee && containsBlockedWords(form.emp_name))   return setError('Name contains inappropriate language. Please revise.');
    if (needsEmployee && !form.emp_title.trim())                return setError('Title is required.');
    if (needsEmployee && containsBlockedWords(form.emp_title))  return setError('Title contains inappropriate language. Please revise.');
    if (needsEmployee && !form.dept_no)                         return setError('Department is required.');

    /* --- Hierarchy validation (types 1 and 3 only) --- */
    if ((accTypeId === 3 || accTypeId === 1) && !form.reports_to)     return setError('Reports To is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.manager_level)  return setError('Manager Level is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.director_level) return setError('Director Level is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.requestor_vp)   return setError('VP is required.');

    /* --- Requestor VP validation (type 2 only) --- */
    if (accTypeId === 2 && !form.requestor_vp) return setError('Requestor VP is required.');

    /* --- POST to backend --- */
    try {
      setLoading(true);
      await api.post('/admin/accounts', {
        ...form,
        acc_type_id:    Number(form.acc_type_id),
        emp_id:         Number(form.emp_id),
        requestor_vp:   form.requestor_vp   ? Number(form.requestor_vp)   : null,
        reports_to:     form.reports_to     ? Number(form.reports_to)     : null,
        manager_level:  form.manager_level  ? Number(form.manager_level)  : null,
        director_level: form.director_level ? Number(form.director_level) : null,
      });
      setSuccess(true);
      /* Close after 1.5s to allow the user to see the success banner */
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------------------------
     RENDER
  --------------------------------------------------------------------------- */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-transparent dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Success banner */}
        {success && (
          <div role="status" className="mx-6 mt-6 p-3 bg-green-100 dark:bg-emerald-900/40 border border-green-400 dark:border-emerald-700 text-green-800 dark:text-emerald-200 rounded text-sm text-center font-semibold" style={styles.outfitFont}>
            ✓ Account created successfully.
          </div>
        )}

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-black dark:text-white" style={styles.outfitFont}>
            Create Account
          </h2>

          {/* Error banner */}
          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded text-sm" style={styles.outfitFont}>
              {error}
              <button onClick={() => setError('')} className="ml-3 font-bold text-red-900 dark:text-red-200">×</button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* Account type — controls which employee fields appear */}
            <div className="mb-4">
              <StyledDropdown
                label="Account Type"
                value={form.acc_type_id}
                onChange={val => update('acc_type_id', val)}
                options={accountTypeOptions}
                placeholder="Select Account Type"
                required
              />
            </div>

            {/* Core account fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

              {/* Employee ID */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Employee ID</label>
                <input
                  value={form.emp_id}
                  onChange={e => update('emp_id', e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  className={inputClass}
                  style={styles.outfitFont}
                />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5" style={styles.outfitFont}>
                  Auto-suggested — change if needed
                </span>
              </div>

              {/* Account ID */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Account ID *</label>
                <input
                  value={form.account_id}
                  onChange={e => update('account_id', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 000112"
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

              {/* Username */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Username *</label>
                <input
                  value={form.username}
                  onChange={e => update('username', e.target.value.replace(/[^a-zA-Z]/g, ''))}
                  placeholder="e.g. jmulligan"
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

              {/* Password with show/hide toggle */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => update('password', e.target.value.replace(/[<>\/\-"]/g, ''))}
                    placeholder="Enter password"
                    className={`${inputClass} pr-8`}
                    style={styles.outfitFont}
                  />
                  <EyeToggle show={showPassword} onToggle={() => setShowPassword(p => !p)} />
                </div>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5" style={styles.outfitFont}>
                  Min 8 chars, must include a special character (e.g. ! @ # $)
                </span>
              </div>
            </div>

            {/* Employee fields — shown for types 1, 2, 3 only */}
            <EmployeeSection
              accTypeId={form.acc_type_id}
              form={form}
              update={update}
              deptOptions={deptOptions}
              empOptions={empOptions}
              managerEmpOptions={managerEmpOptions}
            />

            {/* Form action buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} disabled={loading} className={`${btnDarkClass} w-full sm:w-auto`} style={styles.outfitFont}>
                Cancel
              </button>
              <button type="submit" disabled={loading || success} className={`${btnClass} w-full sm:w-auto`} style={styles.outfitFont}>
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   COMPONENT: EditAccountModal
   -----------------------------------------------------------------------------
   Full-page modal overlay for editing an existing user account.
   emp_id and acc_type_id are read-only — cannot be changed after creation.
   Password field is optional — leave blank to keep the existing password.
   Validates all fields, runs profanity checks, then PUTs to /admin/accounts/:id.
   ============================================================================= */
function EditAccountModal({ account, onClose, onSuccess, dropdowns }) {

  /* ---------------------------------------------------------------------------
     FORM STATE — pre-populated from the existing account record
  --------------------------------------------------------------------------- */
  const [form, setForm] = useState({
    acc_type_id:    account.acc_type_id    || '',
    account_id:     account.account_id     || '',
    username:       account.username       || '',
    password:       '', // blank = keep existing password
    emp_name:       account.emp_name       || '',
    emp_title:      account.emp_title      || '',
    dept_no:        account.dept_no        || '',
    requestor_vp:   account.requestor_vp   != null ? String(account.requestor_vp)   : '',
    reports_to:     account.reports_to     != null ? String(account.reports_to)     : '',
    manager_level:  account.manager_level  != null ? String(account.manager_level)  : '',
    director_level: account.director_level != null ? String(account.director_level) : '',
    other_info:     account.other_info     || '',
    current_status: account.current_status || 'Active',
  });

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* Helper: update a single field in the form */
  const update        = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const accTypeId     = account.acc_type_id; // Read from the account — not editable
  const needsEmployee = accTypeId === 1 || accTypeId === 2 || accTypeId === 3;

  /* ---------------------------------------------------------------------------
     DROPDOWN OPTION LISTS
  --------------------------------------------------------------------------- */
  const deptOptions = (dropdowns.departments || []).map(d => ({
    value: d.dept_no,
    label: `${d.dept_no} — ${d.dept_name}`,
  }));

  const empOptions = (dropdowns.employees || []).map(e => ({
    value: e.emp_id,
    label: `${e.emp_name} (${e.emp_id})`,
  }));

  const managerEmpOptions = (dropdowns.employees || [])
    .filter(e => e.acc_type_id === 1 || e.acc_type_id === 2)
    .map(e => ({ value: e.emp_id, label: `${e.emp_name} (${e.emp_id})` }));

  /* ---------------------------------------------------------------------------
     SUBMIT HANDLER
  --------------------------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    /* --- Core account field validation --- */
    if (!form.username.trim())   return setError('Username is required.');
    if (containsBlockedWords(form.username)) return setError('Username contains inappropriate language. Please revise.');
    if (!form.account_id.trim()) return setError('Account ID is required.');

    /* --- Password only validated if a new one was entered --- */
    if (form.password.trim() && form.password.trim().length < 8) return setError('Password must be at least 8 characters.');
    if (form.password.trim() && !/[!@#$%^&*()_+=\[\]{};:',.|~`]/.test(form.password)) return setError('Password must contain at least one special character (e.g. ! @ # $ %).');

    /* --- Employee field validation --- */
    if (needsEmployee && containsBlockedWords(form.other_info)) return setError('Other Information contains inappropriate language. Please revise.');
    if (needsEmployee && !form.emp_name.trim())                 return setError('Name is required.');
    if (needsEmployee && containsBlockedWords(form.emp_name))   return setError('Name contains inappropriate language. Please revise.');
    if (needsEmployee && !form.emp_title.trim())                return setError('Title is required.');
    if (needsEmployee && containsBlockedWords(form.emp_title))  return setError('Title contains inappropriate language. Please revise.');
    if (needsEmployee && !form.dept_no)                         return setError('Department is required.');

    /* --- Hierarchy validation (types 1 and 3) --- */
    if ((accTypeId === 3 || accTypeId === 1) && !form.reports_to)     return setError('Reports To is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.manager_level)  return setError('Manager Level is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.director_level) return setError('Director Level is required.');
    if ((accTypeId === 3 || accTypeId === 1) && !form.requestor_vp)   return setError('VP is required.');

    /* --- Requestor VP validation (type 2) --- */
    if (accTypeId === 2 && !form.requestor_vp) return setError('Requestor VP is required.');

    /* Build payload — only include password if a new one was entered */
    const payload = {
      account_id:  form.account_id,
      username:    form.username,
      acc_type_id: Number(form.acc_type_id),
      ...(form.password.trim() ? { password: form.password } : {}),
      ...(needsEmployee ? { emp_name: form.emp_name, emp_title: form.emp_title, dept_no: form.dept_no } : {}),
      ...(accTypeId === 2 ? { requestor_vp: form.requestor_vp ? Number(form.requestor_vp) : null } : {}),
      ...((accTypeId === 1 || accTypeId === 3) ? {
        reports_to:     form.reports_to     ? Number(form.reports_to)     : null,
        manager_level:  form.manager_level  ? Number(form.manager_level)  : null,
        director_level: form.director_level ? Number(form.director_level) : null,
        requestor_vp:   form.requestor_vp   ? Number(form.requestor_vp)   : null,
        other_info:     form.other_info,
        current_status: form.current_status,
      } : {}),
    };

    /* --- PUT to backend --- */
    try {
      setLoading(true);
      await api.put(`/admin/accounts/${account.emp_id}`, payload);
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save changes.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------------------------
     RENDER
  --------------------------------------------------------------------------- */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-transparent dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Success banner */}
        {success && (
          <div role="status" className="mx-6 mt-6 p-3 bg-green-100 dark:bg-emerald-900/40 border border-green-400 dark:border-emerald-700 text-green-800 dark:text-emerald-200 rounded text-sm text-center font-semibold" style={styles.outfitFont}>
            ✓ Changes saved successfully.
          </div>
        )}

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-1 text-black dark:text-white" style={styles.outfitFont}>
            Edit Account
          </h2>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-4" style={styles.outfitFont}>
            Employee ID: {account.emp_id} — cannot be changed
          </p>

          {/* Error banner */}
          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded text-sm" style={styles.outfitFont}>
              {error}
              <button onClick={() => setError('')} className="ml-3 font-bold text-red-900 dark:text-red-200">×</button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

              {/* Employee ID — read-only, cannot be changed */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Employee ID</label>
                <input value={account.emp_id} readOnly className={readOnlyClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5" style={styles.outfitFont}>Cannot be changed</span>
              </div>

              {/* Account Type — read-only, cannot be changed */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Account Type</label>
                <input value={`${account.acc_type_id} — ${account.role}`} readOnly className={readOnlyClass} style={styles.outfitFont} />
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5" style={styles.outfitFont}>Cannot be changed</span>
              </div>

              {/* Account ID — editable */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Account ID *</label>
                <input
                  value={form.account_id}
                  onChange={e => update('account_id', e.target.value.replace(/[^0-9]/g, ''))}
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

              {/* Username — editable */}
              <div className="flex flex-col">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>Username *</label>
                <input
                  value={form.username}
                  onChange={e => update('username', e.target.value.replace(/[^a-zA-Z]/g, ''))}
                  className={inputClass}
                  style={styles.outfitFont}
                />
              </div>

              {/* New password — optional, spans both columns */}
              <div className="flex flex-col sm:col-span-2">
                <label className="text-xs text-black dark:text-slate-200 mb-1 font-semibold" style={styles.outfitFont}>New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => update('password', e.target.value.replace(/[<>\/\-"]/g, ''))}
                    placeholder="Leave blank to keep current password"
                    className={`${inputClass} pr-8`}
                    style={styles.outfitFont}
                  />
                  <EyeToggle show={showPassword} onToggle={() => setShowPassword(p => !p)} />
                </div>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5" style={styles.outfitFont}>
                  Min 8 chars, must include a special character (e.g. ! @ # $)
                </span>
              </div>
            </div>

            {/* Employee fields — shown for types 1, 2, 3 only */}
            <EmployeeSection
              accTypeId={accTypeId}
              form={form}
              update={update}
              deptOptions={deptOptions}
              empOptions={empOptions}
              managerEmpOptions={managerEmpOptions}
            />

            {/* Form action buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} disabled={loading} className={`${btnDarkClass} w-full sm:w-auto`} style={styles.outfitFont}>
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
   MAIN COMPONENT: DashboardPage (Admin)
   ============================================================================= */
export default function DashboardPage() {

  /* ---------------------------------------------------------------------------
     STATE: SESSION + HYDRATION
  --------------------------------------------------------------------------- */
  const [user, setUser]                     = useState(null);
  const [hydrated, setHydrated]             = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  /* ---------------------------------------------------------------------------
     STATE: TABLE DATA
  --------------------------------------------------------------------------- */
  const [accounts, setAccounts]       = useState([]);
  const [dropdowns, setDropdowns]     = useState({ departments: [], employees: [], accountTypes: [] });
  const [nextEmpId, setNextEmpId]     = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError]     = useState('');

  /* ---------------------------------------------------------------------------
     STATE: MODALS
  --------------------------------------------------------------------------- */
  const [showCreate, setShowCreate]   = useState(false);
  const [editAccount, setEditAccount] = useState(null);

  /* ---------------------------------------------------------------------------
     STATE: SEARCH + COLUMN FILTERS
  --------------------------------------------------------------------------- */
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedRoles, setSelectedRoles]   = useState([]); // [] = show all roles
  const [showRoleMenu, setShowRoleMenu]     = useState(false);
  const [menuPosition, setMenuPosition]     = useState({ x: 0, y: 0 });

  /* ---------------------------------------------------------------------------
     STATE: AI CHATBOT — identical structure to Header.jsx
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
     Reads the user and token from localStorage on mount.
     Redirects to /login if either is missing or malformed.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      const token  = localStorage.getItem('token');
      if (!stored || !token) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        router.push(LOGIN_PATH);
        return;
      }
      startTransition(() => setUser(JSON.parse(stored)));
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push(LOGIN_PATH);
    }
  }, [router]);

  /* ---------------------------------------------------------------------------
     EFFECT: HYDRATION GATE
     Delays rendering until the client has fully hydrated — prevents mismatches.
  --------------------------------------------------------------------------- */
  useLayoutEffect(() => {
    startTransition(() => setHydrated(true));
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT: SESSION TIMEOUT
     Tracks last activity via localStorage timestamp, checks every minute.
     On expiry: clears storage, shows the session expired modal.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resetTimer = () => localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    resetTimer();

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));

    const iv = setInterval(() => {
      const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);
      if (Date.now() - lastActive >= TIMEOUT_MS) {
        localStorage.clear();
        setSessionExpired(true);
        clearInterval(iv);
      }
    }, CHECK_EVERY_MS);

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearInterval(iv);
    };
  }, []);

  /* ---------------------------------------------------------------------------
     HANDLER: sendMessage (AI Chatbot)
     Posts the conversation to /api/ai/chat (backend proxy to Llama 3.1).
     The HF API key never touches the browser — kept server-side only.
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
        || (err?.message?.includes('Network')
          ? 'Could not reach the server. Make sure your backend is running.'
          : 'Something went wrong. Please try again.');
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  /* ---------------------------------------------------------------------------
     FUNCTION: loadData
     Fetches accounts, dropdowns, and the next emp_id in parallel.
     Called on mount (when user is available) and after create/edit
     to keep the table in sync with the backend.
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
    } catch {
      setDataError('Failed to load data. Please refresh.');
    } finally {
      setLoadingData(false);
    }
  };

  /* Load data once the user session is validated */
  useEffect(() => { if (user) loadData(); }, [user]);

  /* ---------------------------------------------------------------------------
     HANDLER: handleLogout
     Clears session data and redirects to the login page.
  --------------------------------------------------------------------------- */
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push(LOGIN_PATH);
  };

  /* ---------------------------------------------------------------------------
     COLUMN FILTER HELPERS
  --------------------------------------------------------------------------- */

  /* Toggle a value in a multi-select filter array */
  const toggleSelection = (value, setFn, current) => {
    setFn(current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    );
  };

  /* Close all open filter menus */
  const closeAllMenus = () => { setShowRoleMenu(false); };

  /* Open a filter menu at the position of the clicked button */
  const openMenu = (e, setFn, currentlyOpen) => {
    e.stopPropagation();
    if (currentlyOpen) { closeAllMenus(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left, y = rect.bottom + 4;
    /* Prevent menu from overflowing the right edge of the viewport */
    if (x + 224 > window.innerWidth) x = window.innerWidth - 224 - 10;
    setMenuPosition({ x, y });
    closeAllMenus();
    setFn(true);
  };

  /* Close all menus when clicking anywhere outside a .dropdown-menu element */
  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.dropdown-menu')) closeAllMenus(); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  /* ---------------------------------------------------------------------------
     DERIVED VALUES
  --------------------------------------------------------------------------- */

  /* Unique sorted role list for the Role column filter menu */
  const availableRoles = [...new Set(accounts.map(a => a.role).filter(Boolean))].sort();

  /* Accounts after applying global search + Role column filter */
  const filteredAccounts = accounts.filter(acc => {
    /* Global search — matches username, account_id, role, or emp_id */
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matches =
        (acc.username   || '').toLowerCase().includes(q) ||
        (acc.account_id || '').toLowerCase().includes(q) ||
        (acc.role       || '').toLowerCase().includes(q) ||
        String(acc.emp_id).includes(q);
      if (!matches) return false;
    }
    /* Role column filter */
    if (selectedRoles.length > 0 && !selectedRoles.includes(acc.role)) return false;
    return true;
  });

  /* ---------------------------------------------------------------------------
     LOADING STATE — shown while session is being validated or user is null
  --------------------------------------------------------------------------- */
  if (!hydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="animate-spin h-10 w-10 border-b-2 border-[#017ACB] rounded-full" role="status" />
      </div>
    );
  }

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="fixed inset-0 flex flex-col bg-white dark:bg-slate-950 overflow-hidden">

      {/* =================================================================
          SESSION EXPIRED MODAL
          Shown when the 30-minute inactivity timer fires.
          Blocks all interaction — user must click Back to Login.
      ================================================================= */}
      {sessionExpired && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] px-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-transparent dark:border-slate-700 w-full max-w-sm p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#FEE2E2] dark:bg-red-900/40 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-black dark:text-white mb-2" style={styles.outfitFont}>Session Expired</h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-6" style={styles.outfitFont}>
              Your session has timed out due to 30 minutes of inactivity. Please log in again to continue.
            </p>
            <button onClick={() => router.push(LOGIN_PATH)} className={`w-full ${btnClass}`} style={styles.outfitFont}>
              Back to Login
            </button>
          </div>
        </div>
      )}

      {/* =================================================================
          ACCOUNT MODALS — rendered when showCreate or editAccount is set
      ================================================================= */}
      {showCreate  && (
        <CreateAccountModal
          onClose={() => setShowCreate(false)}
          onSuccess={loadData}
          dropdowns={dropdowns}
          nextEmpId={nextEmpId}
        />
      )}
      {editAccount && (
        <EditAccountModal
          account={editAccount}
          onClose={() => setEditAccount(null)}
          onSuccess={loadData}
          dropdowns={dropdowns}
        />
      )}

      {/* =================================================================
          AI CHATBOT PANEL
          Mobile: full-width bottom sheet (70vh)
          Desktop: fixed bottom-right panel (360×520px)
          Dark mode fully supported.
      ================================================================= */}
      {chatOpen && (
        <div
          className="
            fixed z-[99998] flex flex-col overflow-hidden
            bg-white dark:bg-slate-900
            shadow-2xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)]
            border border-gray-200 dark:border-slate-700
            bottom-0 right-0 left-0 rounded-t-xl
            sm:bottom-4 sm:right-4 sm:left-auto sm:rounded-xl
            w-full sm:w-[360px]
            h-[70vh] sm:h-[520px]
          "
          style={styles.outfitFont}
        >
          {/* Chat panel header */}
          <div className="bg-[#017ACB] dark:bg-[#005a96] px-4 py-3 flex items-center justify-between flex-shrink-0">
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
            <button onClick={() => setChatOpen(false)} className="text-white/80 hover:text-white transition" aria-label="Close chat">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 bg-gray-50 dark:bg-slate-800">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#017ACB] dark:bg-[#005a96] text-white rounded-br-sm'
                      : 'bg-white dark:bg-slate-700 text-black dark:text-slate-100 border border-gray-200 dark:border-slate-600 rounded-bl-sm shadow-sm dark:shadow-none'
                  }`}
                  style={styles.outfitFont}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator — shown while waiting for the AI response */}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-[#017ACB] dark:bg-[#4DAEFF] rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="px-3 py-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-3 sm:py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400 focus:border-black dark:focus:border-slate-400 text-black dark:text-slate-100 bg-gray-50 dark:bg-slate-800 placeholder:text-gray-400 dark:placeholder:text-slate-500 hover:bg-[#017ACB]/10 dark:hover:bg-[#017ACB]/20 transition"
              style={styles.outfitFont}
              disabled={chatLoading}
              autoComplete="off"
            />
            <button
              onClick={sendMessage}
              disabled={chatLoading || !chatInput.trim()}
              className="px-3 py-2 rounded-lg text-sm flex-shrink-0 bg-[#017ACB] dark:bg-[#005a96] text-white border border-black/50 dark:border-slate-500 hover:bg-[#017ACB]/80 dark:hover:bg-[#017ACB]/70 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25)] relative before:content-[''] before:absolute before:inset-0 before:rounded-lg before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)] dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)] disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
              aria-label="Send message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================
          PAGE HEADER — blue bar with logo, title, username, chat + logout
      ================================================================= */}
      <header className="bg-[#017ACB] shadow-sm w-full sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 w-full">
          <div
            className="grid items-center gap-x-3 h-[clamp(4rem,5vw,5.5rem)]"
            style={{ gridTemplateColumns: '1fr auto 1fr' }}
          >
            {/* LEFT — Logo + company name */}
            <div className="flex items-center gap-2 sm:gap-3 justify-start">
              <Image
                src="/CapstoneDynamicsLogoWhite.png"
                alt="Capstone Dynamics logo"
                width={92}
                height={92}
                className="w-auto h-[clamp(3rem,4.5vw,5.2rem)] flex-shrink-0"
                priority
              />
              <h1 className="hidden lg:block font-bold text-white leading-tight text-[clamp(1rem,1.4vw,1.75rem)] whitespace-nowrap" style={styles.outfitFont}>
                Capstone Dynamics
              </h1>
            </div>

            {/* CENTER — App title */}
            <div className="text-center">
              <h1
                className="font-bold text-white leading-snug text-[clamp(0.8rem,1.6vw,1.6rem)]"
                style={{ ...styles.outfitFont, maxWidth: '34rem', textAlign: 'center' }}
              >
                Resource &amp; Capacity Management Planner
              </h1>
            </div>

            {/* RIGHT — Username, AI chat button, Logout */}
            <div className="flex items-center gap-3 justify-end">
              <span className="hidden sm:block font-semibold text-white text-[clamp(0.8rem,1.1vw,1.3rem)] whitespace-nowrap" style={styles.outfitFont}>
                {user.username}
              </span>

              {/* AI Chat toggle button */}
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

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded text-sm whitespace-nowrap bg-white text-[#017ACB] font-semibold border border-black/50 hover:bg-[#CCE4F4] transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.14)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.10),inset_0_-1px_2px_rgba(0,0,0,0.10)]"
                style={styles.outfitFont}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =================================================================
          PAGE CONTENT — scrollable area below the header
      ================================================================= */}
      <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto min-h-0">

        {/* Page title row — heading, search, create button */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white" style={styles.outfitFont}>
            Admin Dashboard
          </h2>

          {/* Global search input — centred in the row */}
          <div className="flex-1 flex justify-center px-4">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''))}
              placeholder="Search..."
              className="px-3 py-2 border border-gray-500 dark:border-slate-600 bg-gray-200 dark:bg-slate-800 rounded text-gray-700 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 text-sm w-64 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/20 transition-colors focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400 focus:border-black dark:focus:border-slate-400"
              style={styles.outfitFont}
            />
          </div>

          {/* Create Account button */}
          <button onClick={() => setShowCreate(true)} className={btnClass} style={styles.outfitFont}>
            + Create Account
          </button>
        </div>

        {/* Data error banner */}
        {dataError && (
          <div role="alert" className="p-3 bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded text-sm" style={styles.outfitFont}>
            {dataError}
            <button onClick={() => setDataError('')} className="ml-3 font-bold text-red-900 dark:text-red-200">×</button>
          </div>
        )}

        {/* =============================================================
            ACCOUNTS TABLE
        ============================================================= */}
        <div className="border dark:border-slate-700 rounded-lg shadow-sm dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)] bg-white dark:bg-slate-900 overflow-hidden">

          {/* Loading spinner */}
          {loadingData ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-b-2 border-[#017ACB] rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)]">
              <table className="min-w-full border-collapse text-sm">

                {/* Table header — sticky so it stays visible while scrolling */}
                <thead className="bg-[#017ACB] text-white sticky top-0 z-[100]">
                  <tr>
                    {/* Static column headers */}
                    {['Edit', 'Emp ID', 'Username', 'Account ID'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold border-r border-black last:border-r-0 whitespace-nowrap" style={styles.outfitFont}>
                        {h}
                      </th>
                    ))}

                    {/* Role — filterable column header with ▼ dropdown */}
                    <th className="px-4 py-3 text-left font-semibold border-r border-black whitespace-nowrap relative bg-[#017ACB]" style={styles.outfitFont}>
                      <div className="flex justify-between items-center">
                        <span>Role</span>
                        <button className={colBtnClass} onClick={e => openMenu(e, setShowRoleMenu, showRoleMenu)}>▼</button>
                      </div>

                      {/* Role filter dropdown menu */}
                      {showRoleMenu && (
                        <div
                          className={menuClass}
                          style={{ top: menuPosition.y, left: menuPosition.x }}
                          onClick={e => e.stopPropagation()}
                        >
                          {/* "All" option — clears the filter */}
                          <div
                            className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${selectedRoles.length === 0 ? 'font-bold' : ''}`}
                            onClick={() => setSelectedRoles([])}
                          >
                            <Checkbox checked={selectedRoles.length === 0} />All
                          </div>

                          {/* One row per available role */}
                          {availableRoles.map(role => (
                            <div
                              key={role}
                              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${selectedRoles.includes(role) ? 'font-bold' : ''}`}
                              onClick={() => toggleSelection(role, setSelectedRoles, selectedRoles)}
                            >
                              <Checkbox checked={selectedRoles.includes(role)} />{role}
                            </div>
                          ))}
                        </div>
                      )}
                    </th>

                    {/* Type — static header (colour-coded badges in rows) */}
                    <th className="px-4 py-3 text-left font-semibold whitespace-nowrap bg-[#017ACB]" style={styles.outfitFont}>
                      Type
                    </th>
                  </tr>
                </thead>

                {/* Table body */}
                <tbody>
                  {filteredAccounts.length === 0 ? (

                    /* Empty state */
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400 border-t border-black dark:border-slate-700" style={styles.outfitFont}>
                        {searchTerm || selectedRoles.length > 0
                          ? 'No accounts match the current filters.'
                          : 'No accounts found.'}
                      </td>
                    </tr>

                  ) : filteredAccounts.map((acc, i) => (

                    /* Account row — alternating background, hover highlight */
                    <tr
                      key={acc.emp_id}
                      className={`border-t border-black dark:border-slate-700 hover:bg-[#017ACB]/10 dark:hover:bg-[#017ACB]/20 transition-colors ${
                        i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50 dark:bg-slate-800/60'
                      }`}
                    >
                      {/* Edit button */}
                      <td className="px-3 py-2 border-r border-black dark:border-slate-700">
                        <button
                          onClick={() => setEditAccount(acc)}
                          className="px-2 py-1 rounded text-xs bg-[#017ACB] text-white border border-black/50 dark:border-slate-500 hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:text-white transition shadow-[2px_2px_6px_rgba(0,0,0,0.2)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-1px_2px_rgba(0,0,0,0.12)]"
                          style={styles.outfitFont}
                        >
                          Edit
                        </button>
                      </td>

                      {/* Data cells */}
                      <td className="px-4 py-2 text-black dark:text-slate-100 border-r border-black dark:border-slate-700" style={styles.outfitFont}>{acc.emp_id}</td>
                      <td className="px-4 py-2 text-black dark:text-slate-100 border-r border-black dark:border-slate-700" style={styles.outfitFont}>{acc.username}</td>
                      <td className="px-4 py-2 text-black dark:text-slate-100 border-r border-black dark:border-slate-700" style={styles.outfitFont}>{acc.account_id}</td>
                      <td className="px-4 py-2 text-black dark:text-slate-100 border-r border-black dark:border-slate-700" style={styles.outfitFont}>{acc.role}</td>

                      {/* Colour-coded Type badge — colour varies by acc_type_id */}
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          acc.acc_type_id === 4 ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200' :
                          acc.acc_type_id === 1 ? 'bg-blue-100   dark:bg-blue-900/40   text-blue-800   dark:text-blue-200'   :
                          acc.acc_type_id === 2 ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200' :
                                                  'bg-green-100  dark:bg-green-900/40  text-green-800  dark:text-green-200'
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

        {/* Account count footer — shows filtered count vs total */}
        {!loadingData && (
          <p className="text-sm text-gray-500 dark:text-slate-400" style={styles.outfitFont}>
            {(searchTerm || selectedRoles.length > 0)
              ? `Showing ${filteredAccounts.length} of ${accounts.length} account${accounts.length !== 1 ? 's' : ''}`
              : `Showing ${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>
    </div>
  );
}