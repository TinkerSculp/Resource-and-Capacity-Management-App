'use client';

/* =============================================================================
   DashboardPage.jsx  (Admin Dashboard)
   -----------------------------------------------------------------------------
   ACCOUNT TYPES:
     1 = Resource Manager — account fields only
     2 = Stakeholder      — account fields + employee: emp_name, emp_title,
                            dept_no, requestor_vp
     3 = Team Member      — account fields + full employee record
     4 = Admin            — account fields only

   API ENDPOINTS:
     GET  /api/admin/dropdowns           — departments, employees, account types
     GET  /api/admin/next-emp-id         — next available emp_id
     GET  /api/admin/accounts            — list all accounts
     POST /api/admin/accounts            — create account
     PUT  /api/admin/accounts/:empId     — edit account
   ============================================================================= */

import { useEffect, useState, useTransition, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

const TIMEOUT_MS      = 30 * 60 * 1000;
const CHECK_EVERY_MS  = 60 * 1000;
const LAST_ACTIVE_KEY = 'lastActive';
const LOGIN_PATH      = '/login';

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

const inputClass = 'bg-white text-black border border-black p-2 rounded hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-1 focus:ring-black w-full text-sm';
const readOnlyClass = 'bg-gray-100 text-gray-500 border border-black p-2 rounded cursor-not-allowed w-full text-sm';

/* =============================================================================
   StyledDropdown
   ============================================================================= */
function StyledDropdown({ label, value, onChange, options, placeholder, required }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const selected = options.find((o) => String(o.value) === String(value));
  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}{required && ' *'}</label>
      <div className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center text-sm" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
        <span className={selected ? 'text-black' : 'text-gray-400'}>{selected ? selected.label : (placeholder || `Select ${label}`)}</span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 max-h-48 overflow-y-auto shadow-lg">
          {options.map((opt) => (
            <div key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm font-semibold ${String(value) === String(opt.value) ? 'bg-[#CDE6F7]' : ''}`}
              style={styles.outfitFont}>{opt.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   SearchableDropdown
   ============================================================================= */
function SearchableDropdown({ label, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(o => String(o.value) === String(value));
  return (
    <div className="flex flex-col relative" ref={ref}>
      <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>{label}</label>
      <div className="bg-white text-black border border-black p-2 rounded cursor-pointer hover:bg-[#017ACB]/20 transition flex justify-between items-center text-sm" onClick={() => setOpen(o => !o)} style={styles.outfitFont}>
        <span className={selected ? 'text-black' : 'text-gray-400'}>{selected ? selected.label : (placeholder || `Select ${label}`)}</span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-black rounded mt-1 z-50 shadow-lg">
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} onClick={e => e.stopPropagation()} className="w-full p-2 border-b border-gray-300 text-black focus:outline-none text-sm" style={styles.outfitFont} />
          <div className="max-h-40 overflow-y-auto">
            {filtered.map(opt => (
              <div key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}
                className={`p-2 cursor-pointer text-black hover:bg-[#017ACB]/20 transition text-sm font-semibold ${String(value) === String(opt.value) ? 'bg-[#CDE6F7]' : ''}`}
                style={styles.outfitFont}>{opt.label}</div>
            ))}
            {filtered.length === 0 && <div className="p-2 text-gray-400 text-sm" style={styles.outfitFont}>No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   EmployeeSection — shared between Create and Edit for types 2 and 3
   ============================================================================= */
function EmployeeSection({ accTypeId, form, update, deptOptions, empOptions }) {
  const isStakeholder = Number(accTypeId) === 2;
  const isTeamMember  = Number(accTypeId) === 3;
  if (!isStakeholder && !isTeamMember) return null;

  return (
    <div className="border-t border-gray-200 pt-4 mb-4">
      <p className="text-sm font-semibold text-[#017ACB] mb-3" style={styles.outfitFont}>Employee Details</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className="flex flex-col">
          <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Name *</label>
          <input value={form.emp_name} onChange={e => update('emp_name', e.target.value.replace(/[^a-zA-Z0-9 .,'\-]/g, ''))} placeholder="e.g. Jane Smith" className={inputClass} style={styles.outfitFont} />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Title *</label>
          <input value={form.emp_title} onChange={e => update('emp_title', e.target.value.replace(/[^a-zA-Z0-9 .,'\-]/g, ''))} placeholder="e.g. VP, IT" className={inputClass} style={styles.outfitFont} />
        </div>

        <StyledDropdown label="Department" value={form.dept_no} onChange={val => update('dept_no', val)} options={deptOptions} placeholder="Select Department" required />

        {/* Stakeholder: requestor_vp only */}
        {isStakeholder && (
          <SearchableDropdown label="Requestor VP" value={form.requestor_vp} onChange={val => update('requestor_vp', val)} options={empOptions} placeholder="Select Requestor VP" />
        )}

        {/* Team Member: full set */}
        {isTeamMember && (
          <>
            <SearchableDropdown label="Reports To"     value={form.reports_to}     onChange={val => update('reports_to', val)}     options={empOptions} placeholder="Select Reports To" />
            <SearchableDropdown label="Manager Level"  value={form.manager_level}  onChange={val => update('manager_level', val)}  options={empOptions} placeholder="Select Manager Level" />
            <SearchableDropdown label="Director Level" value={form.director_level} onChange={val => update('director_level', val)} options={empOptions} placeholder="Select Director Level" />
          </>
        )}
      </div>

      {isTeamMember && (
        <>
          <div className="flex flex-col mt-4">
            <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Other Information</label>
            <textarea value={form.other_info} onChange={e => update('other_info', e.target.value.replace(/[^a-zA-Z0-9 .,]/g, ''))} rows={2} className={inputClass} style={styles.outfitFont} />
          </div>
          <div className="mt-4">
            <label className="text-xs text-black mb-2 font-semibold block" style={styles.outfitFont}>Status</label>
            <div className="flex gap-3">
              {['Active', 'Inactive'].map(s => (
                <button key={s} type="button" onClick={() => update('current_status', s)}
                  className={`px-4 py-1.5 rounded text-sm border border-black/50 font-semibold transition shadow-[2px_2px_6px_rgba(0,0,0,0.2),-2px_-2px_6px_rgba(255,255,255,0.4)] ${form.current_status === s ? (s === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700') : 'bg-white text-gray-500 hover:bg-gray-100'}`}
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
   CreateAccountModal
   ============================================================================= */
function CreateAccountModal({ onClose, onSuccess, dropdowns, nextEmpId }) {
  const [form, setForm] = useState({
    acc_type_id: '', emp_id: nextEmpId || '', account_id: '', username: '', password: '',
    emp_name: '', emp_title: '', dept_no: '', requestor_vp: '',
    reports_to: '', manager_level: '', director_level: '', other_info: '', current_status: 'Active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const accTypeId = Number(form.acc_type_id);
  const needsEmployee = accTypeId === 2 || accTypeId === 3;

  const accountTypeOptions = (dropdowns.accountTypes || []).map(t => ({ value: t.acc_type_id, label: `${t.acc_type_id} — ${t.acc_type}` }));
  const deptOptions        = (dropdowns.departments  || []).map(d => ({ value: d.dept_no,     label: `${d.dept_no} — ${d.dept_name}` }));
  const empOptions         = (dropdowns.employees    || []).map(e => ({ value: e.emp_id,      label: `${e.emp_name} (${e.emp_id})` }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.acc_type_id)          return setError('Account type is required.');
    if (!form.account_id.trim())    return setError('Account ID is required.');
    if (!form.username.trim())      return setError('Username is required.');
    if (!form.password.trim())      return setError('Password is required.');
    if (needsEmployee && !form.emp_name.trim())  return setError('Name is required.');
    if (needsEmployee && !form.emp_title.trim()) return setError('Title is required.');
    if (needsEmployee && !form.dept_no)          return setError('Department is required.');

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
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
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
                <input value={form.account_id} onChange={e => update('account_id', e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} placeholder="e.g. 000112" className={inputClass} style={styles.outfitFont} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Username *</label>
                <input value={form.username} onChange={e => update('username', e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))} placeholder="e.g. jmulligan" className={inputClass} style={styles.outfitFont} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Password *</label>
                <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Enter password" className={inputClass} style={styles.outfitFont} />
              </div>
            </div>

            <EmployeeSection accTypeId={form.acc_type_id} form={form} update={update} deptOptions={deptOptions} empOptions={empOptions} />

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
   EditAccountModal
   ============================================================================= */
function EditAccountModal({ account, onClose, onSuccess, dropdowns }) {
  const [form, setForm] = useState({
    acc_type_id:    account.acc_type_id  || '',
    account_id:     account.account_id   || '',
    username:       account.username     || '',
    password:       '',
    emp_name:       account.emp_name     || '',
    emp_title:      account.emp_title    || '',
    dept_no:        account.dept_no      || '',
    requestor_vp:   account.requestor_vp  != null ? String(account.requestor_vp)  : '',
    reports_to:     account.reports_to    != null ? String(account.reports_to)    : '',
    manager_level:  account.manager_level != null ? String(account.manager_level) : '',
    director_level: account.director_level != null ? String(account.director_level) : '',
    other_info:     account.other_info   || '',
    current_status: account.current_status || 'Active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const accTypeId     = account.acc_type_id;
  const needsEmployee = accTypeId === 2 || accTypeId === 3;

  const accountTypeOptions = (dropdowns.accountTypes || []).map(t => ({ value: t.acc_type_id, label: `${t.acc_type_id} — ${t.acc_type}` }));
  const deptOptions        = (dropdowns.departments  || []).map(d => ({ value: d.dept_no,     label: `${d.dept_no} — ${d.dept_name}` }));
  const empOptions         = (dropdowns.employees    || []).map(e => ({ value: e.emp_id,      label: `${e.emp_name} (${e.emp_id})` }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username.trim())   return setError('Username is required.');
    if (!form.account_id.trim()) return setError('Account ID is required.');
    if (needsEmployee && !form.emp_name.trim())  return setError('Name is required.');
    if (needsEmployee && !form.emp_title.trim()) return setError('Title is required.');
    if (needsEmployee && !form.dept_no)          return setError('Department is required.');

    // Build payload — only send password if admin entered one
    const payload = {
      account_id:     form.account_id,
      username:       form.username,
      acc_type_id:    Number(form.acc_type_id),
      ...(form.password.trim() ? { password: form.password } : {}),
      ...(needsEmployee ? {
        emp_name:  form.emp_name,
        emp_title: form.emp_title,
        dept_no:   form.dept_no,
      } : {}),
      ...(accTypeId === 2 ? {
        requestor_vp: form.requestor_vp ? Number(form.requestor_vp) : null,
      } : {}),
      ...(accTypeId === 3 ? {
        reports_to:     form.reports_to     ? Number(form.reports_to)     : null,
        manager_level:  form.manager_level  ? Number(form.manager_level)  : null,
        director_level: form.director_level ? Number(form.director_level) : null,
        other_info:     form.other_info,
        current_status: form.current_status,
      } : {}),
    };

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {success && <div role="status" className="mx-6 mt-6 p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm text-center font-semibold" style={styles.outfitFont}>✓ Changes saved successfully.</div>}
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-1 text-black" style={styles.outfitFont}>Edit Account</h2>
          <p className="text-xs text-gray-400 mb-4" style={styles.outfitFont}>Employee ID: {account.emp_id} — cannot be changed</p>
          {error && <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm" style={styles.outfitFont}>{error}<button onClick={() => setError('')} className="ml-3 font-bold text-red-900">×</button></div>}
          <form onSubmit={handleSubmit} noValidate>

            {/* emp_id — read only */}
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
                <input value={form.account_id} onChange={e => update('account_id', e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} className={inputClass} style={styles.outfitFont} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>Username *</label>
                <input value={form.username} onChange={e => update('username', e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))} className={inputClass} style={styles.outfitFont} />
              </div>
              <div className="flex flex-col sm:col-span-2">
                <label className="text-xs text-black mb-1 font-semibold" style={styles.outfitFont}>New Password</label>
                <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Leave blank to keep current password" className={inputClass} style={styles.outfitFont} />
              </div>
            </div>

            <EmployeeSection accTypeId={accTypeId} form={form} update={update} deptOptions={deptOptions} empOptions={empOptions} />

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
   DashboardPage (main)
   ============================================================================= */
export default function DashboardPage() {
  const [user, setUser]             = useState(null);
  const [hydrated, setHydrated]     = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [accounts, setAccounts]     = useState([]);
  const [dropdowns, setDropdowns]   = useState({ departments: [], employees: [], accountTypes: [] });
  const [nextEmpId, setNextEmpId]   = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError]   = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editAccount, setEditAccount] = useState(null); // account object to edit

  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      const token  = localStorage.getItem('token');
      if (!stored || !token) { localStorage.removeItem('user'); localStorage.removeItem('token'); router.push(LOGIN_PATH); return; }
      startTransition(() => setUser(JSON.parse(stored)));
    } catch { localStorage.removeItem('user'); localStorage.removeItem('token'); router.push(LOGIN_PATH); }
  }, [router]);

  useLayoutEffect(() => { startTransition(() => setHydrated(true)); }, []);

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

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-10 w-10 border-b-2 border-[#017ACB] rounded-full" role="status" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-y-auto flex flex-col bg-white">

      {/* SESSION EXPIRED MODAL */}
      {sessionExpired && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] px-4" role="alertdialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-black mb-2" style={styles.outfitFont}>Session Expired</h2>
            <p className="text-sm text-gray-600 mb-6" style={styles.outfitFont}>Your session has timed out due to 30 minutes of inactivity. Please log in again to continue.</p>
            <button onClick={() => router.push(LOGIN_PATH)} className={`w-full ${btnClass}`} style={styles.outfitFont}>Back to Login</button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showCreate && <CreateAccountModal onClose={() => setShowCreate(false)} onSuccess={loadData} dropdowns={dropdowns} nextEmpId={nextEmpId} />}
      {editAccount && <EditAccountModal account={editAccount} onClose={() => setEditAccount(null)} onSuccess={loadData} dropdowns={dropdowns} />}

      {/* HEADER */}
      <header className="bg-[#017ACB] shadow-sm w-full sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid items-center gap-x-3 h-[clamp(4rem,5vw,5.5rem)]" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            <div className="flex items-center gap-2 sm:gap-3 justify-start">
              <Image src="/CapstoneDynamicsLogoWhite.png" alt="Capstone Dynamics logo" width={92} height={92} className="w-auto h-[clamp(3rem,4.5vw,5.2rem)] flex-shrink-0" priority />
              <h1 className="hidden lg:block font-bold text-white leading-tight text-[clamp(1rem,1.4vw,1.75rem)] whitespace-nowrap" style={styles.outfitFont}>Capstone Dynamics</h1>
            </div>
            <div className="text-center">
              <h1 className="font-bold text-white leading-snug text-[clamp(0.8rem,1.6vw,1.6rem)]" style={{ ...styles.outfitFont, maxWidth: '34rem', textAlign: 'center' }}>Resource &amp; Capacity Management Planner</h1>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <span className="hidden sm:block font-semibold text-white text-[clamp(0.8rem,1.1vw,1.3rem)] whitespace-nowrap" style={styles.outfitFont}>{user.username}</span>
              <button onClick={handleLogout} className="px-4 py-2 rounded text-sm whitespace-nowrap bg-white text-[#017ACB] font-semibold border border-black/50 hover:bg-[#CCE4F4] transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.14)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.10),inset_0_-1px_2px_rgba(0,0,0,0.10)]" style={styles.outfitFont}>Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-3xl font-bold text-gray-900" style={styles.outfitFont}>Admin Dashboard</h2>
          <button onClick={() => setShowCreate(true)} className={btnClass} style={styles.outfitFont}>+ Create Account</button>
        </div>

        {dataError && (
          <div role="alert" className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm" style={styles.outfitFont}>
            {dataError}<button onClick={() => setDataError('')} className="ml-3 font-bold text-red-900">×</button>
          </div>
        )}

        {/* ACCOUNTS TABLE */}
        <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
          {loadingData ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-b-2 border-[#017ACB] rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#017ACB] text-white">
                  <tr>
                    {['Edit', 'Emp ID', 'Username', 'Account ID', 'Role', 'Type'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold border-r border-black last:border-r-0 whitespace-nowrap" style={styles.outfitFont}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 border-t border-black" style={styles.outfitFont}>No accounts found.</td></tr>
                  ) : accounts.map((acc, i) => (
                    <tr key={acc.emp_id} className={`border-t border-black hover:bg-[#017ACB]/10 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {/* EDIT BUTTON */}
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
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${acc.acc_type_id === 4 ? 'bg-purple-100 text-purple-800' : acc.acc_type_id === 1 ? 'bg-blue-100 text-blue-800' : acc.acc_type_id === 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
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

        {!loadingData && <p className="text-sm text-gray-500" style={styles.outfitFont}>Showing {accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>}
      </div>
    </div>
  );
}
