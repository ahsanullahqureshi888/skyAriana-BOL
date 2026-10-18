import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Power,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/client';
import GlassCard from '../components/GlassCard';

const roles = ['Admin', 'Accountant', 'Viewer'];
const pageSize = 6;

const createForm = {
  name: '',
  email: '',
  password: '',
  role: 'Viewer',
};

const profileForm = {
  name: '',
  email: '',
  role: 'Viewer',
};

const passwordForm = {
  password: '',
  confirmPassword: '',
};

const apiMessage = (error, fallback) =>
  error?.response?.data?.detail || error?.response?.data?.message || error?.message || fallback;

const getPasswordStrength = (password) => {
  if (!password) return { label: 'Not set', width: '0%', color: 'bg-slate-200', text: 'text-slate-400' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { label: 'Weak', width: '35%', color: 'bg-rose-500', text: 'text-rose-600' };
  if (score <= 4) return { label: 'Good', width: '70%', color: 'bg-amber-500', text: 'text-amber-600' };
  return { label: 'Strong', width: '100%', color: 'bg-emerald-500', text: 'text-emerald-600' };
};

const safeUserText = (value) => String(value ?? '');

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('sky_banking_user') || '{}');
  } catch {
    localStorage.removeItem('sky_banking_user');
    return {};
  }
};

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-black shadow-2xl backdrop-blur-xl ${
        isSuccess ? 'border-emerald-100 bg-emerald-50/95 text-emerald-700' : 'border-rose-100 bg-rose-50/95 text-rose-700'
      }`}
      role="status"
    >
      {isSuccess ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} className="ml-2 rounded-lg p-0.5 opacity-70 hover:bg-white/60" aria-label="Close notification">
        <X size={14} />
      </button>
    </div>
  );
}

function ActionButton({ title, children, onClick, disabled, tone = 'sky' }) {
  const toneClass = {
    sky: 'text-sky-600 hover:bg-sky-50',
    amber: 'text-amber-600 hover:bg-amber-50',
    emerald: 'text-emerald-600 hover:bg-emerald-50',
    rose: 'text-rose-600 hover:bg-rose-50',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
  );
}

export default function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [mode, setMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(createForm);
  const [password, setPassword] = useState(passwordForm);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const formRef = useRef(null);

  const scrollToForm = () => {
    if (window.innerWidth < 1280) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  };

  const currentUser = getStoredUser();
  const isAdmin = currentUser.role === 'Admin';
  const strength = getPasswordStrength(mode === 'password' ? password.password : form.password);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authAPI.listUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users list', err);
      showToast('error', apiMessage(err, 'Failed to load users.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
    else setLoading(false);
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !needle || safeUserText(user.name).toLowerCase().includes(needle) || safeUserText(user.email).toLowerCase().includes(needle);
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || String(user.is_active) === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const resetPanel = () => {
    setMode('create');
    setSelectedUser(null);
    setForm(createForm);
    setPassword(passwordForm);
    setErrors({});
    setShowPassword(false);
    scrollToForm();
  };

  const startEdit = (user) => {
    setMode('edit');
    setSelectedUser(user);
    setForm({ name: user.name || '', email: user.email || '', role: user.role || 'Viewer' });
    setPassword(passwordForm);
    setErrors({});
    setShowPassword(false);
    scrollToForm();
  };

  const startPassword = (user) => {
    setMode('password');
    setSelectedUser(user);
    setForm({ name: user.name || '', email: user.email || '', role: user.role || 'Viewer' });
    setPassword(passwordForm);
    setErrors({});
    setShowPassword(false);
    scrollToForm();
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPassword((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateProfile = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Full name is required.';
    if (!form.email.trim()) nextErrors.email = 'Email address is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Enter a valid email address.';
    if (!roles.includes(form.role)) nextErrors.role = 'Choose a valid security role.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validatePassword = (values = password) => {
    const nextErrors = {};
    if (!values.password || values.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    if (values.password !== values.confirmPassword) nextErrors.confirmPassword = 'Passwords must match.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (mode === 'password') {
      if (!selectedUser || !validatePassword()) return;
      setSaving(true);
      try {
        await authAPI.changePassword(selectedUser.id, password.password);
        setPassword(passwordForm);
        showToast('success', 'Password updated successfully.');
      } catch (err) {
        console.error(err);
        showToast('error', apiMessage(err, 'Failed to update password.'));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!validateProfile()) return;
    if (mode === 'create' && !validatePassword({ password: form.password, confirmPassword: form.password })) return;

    setSaving(true);
    try {
      if (mode === 'edit' && selectedUser) {
        const res = await authAPI.updateUser(selectedUser.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        });
        setSelectedUser(res.data);
        if (String(selectedUser.id) === String(currentUser.id)) {
          localStorage.setItem('sky_banking_user', JSON.stringify(res.data));
        }
        showToast('success', 'User updated successfully.');
      } else {
        await authAPI.register(form.name.trim(), form.email.trim(), form.password, form.role);
        showToast('success', 'User created successfully.');
        resetPanel();
      }
      await fetchUsers();
    } catch (err) {
      console.error(err);
      showToast('error', apiMessage(err, 'Failed to save user.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (String(user.id) === String(currentUser.id)) {
      showToast('error', 'You cannot deactivate your own active account.');
      return;
    }

    setProcessingId(user.id);
    try {
      await authAPI.toggleUser(user.id);
      await fetchUsers();
      showToast('success', user.is_active ? 'User deactivated successfully.' : 'User activated successfully.');
    } catch (err) {
      console.error(err);
      showToast('error', apiMessage(err, 'Failed to modify user status.'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setProcessingId(deleteTarget.id);
    try {
      await authAPI.deleteUser(deleteTarget.id);
      if (selectedUser?.id === deleteTarget.id) resetPanel();
      setDeleteTarget(null);
      await fetchUsers();
      showToast('success', 'User deleted successfully.');
    } catch (err) {
      console.error(err);
      showToast('error', apiMessage(err, 'Failed to delete user.'));
    } finally {
      setProcessingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-grow items-center justify-center p-4">
        <GlassCard className="max-w-md space-y-4 p-8 text-center">
          <div className="inline-flex rounded-full bg-amber-50 p-4 text-amber-600">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-lg font-black text-sky-900">{t('userManagement.access_restricted')}</h2>
          <p className="text-xs font-semibold leading-relaxed text-sky-500">
            Only administrators are authorized to manage users, add accountants, or view the accounts directory.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black leading-tight text-sky-900">{t('userManagement.user_directory')}</h1>
          <p className="mt-1 text-sm font-medium text-sky-500">{t('userManagement.manage_operators')}</p>
        </div>
        <button
          type="button"
          onClick={resetPanel}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white shadow-lg shadow-sky-900/10 transition-colors hover:bg-sky-700"
        >
          <Plus size={16} />
          New User
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <GlassCard className="min-w-0 p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 border-b border-sky-100 pb-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-extrabold text-sky-900">{t('userManagement.registered_users')}</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">{t('userManagement.vault_access')}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
              <label className="relative block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-sky-100 bg-white/70 pl-11 pr-4 text-sm font-bold text-sky-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10"
                  placeholder="Search users"
                  aria-label="Search users"
                />
              </label>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-12 rounded-2xl border border-sky-100 bg-white/70 px-4 text-sm font-bold text-sky-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10"
                aria-label="Filter by role"
              >
                <option value="">All roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-12 rounded-2xl border border-sky-100 bg-white/70 px-4 text-sm font-bold text-sky-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10"
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="grid animate-pulse grid-cols-5 gap-4 rounded-2xl bg-white/45 p-4">
                  <span className="h-4 rounded bg-sky-100" />
                  <span className="h-4 rounded bg-sky-100" />
                  <span className="h-4 rounded bg-sky-100" />
                  <span className="h-4 rounded bg-sky-100" />
                  <span className="h-4 rounded bg-sky-100" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-sky-100 bg-white/35 p-8 text-center">
              <UserCheck size={38} className="mb-3 text-sky-300" />
              <h3 className="text-base font-black text-sky-900">No users found</h3>
              <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-sky-500">
                Adjust the search or filters, or create a new operator account from the panel.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-3xl border border-sky-100/70 bg-white/35 md:block">
                <table className="w-full min-w-[840px] border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-sky-50/90 backdrop-blur">
                    <tr className="border-b border-sky-100 text-[10px] font-black uppercase tracking-[0.14em] text-sky-500">
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Email / Username</th>
                      <th className="px-4 py-3">Security Role</th>
                      <th className="px-4 py-3">Account Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100/60 text-sm font-bold text-sky-900">
                    {pagedUsers.map((user, index) => (
                      <tr key={user.id} className={`${index % 2 ? 'bg-sky-50/25' : 'bg-white/20'} transition-colors hover:bg-sky-50/70`}>
                        <td className="px-4 py-4 font-black">{user.name}</td>
                        <td className="px-4 py-4 text-sky-600">{user.email}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-sky-600">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                            user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {user.is_active ? t('userManagement.active') : t('userManagement.disabled')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <ActionButton title={`Edit ${user.name}`} onClick={() => startEdit(user)}>
                              <Edit2 size={15} />
                            </ActionButton>
                            <ActionButton title={`Change password for ${user.name}`} onClick={() => startPassword(user)} tone="amber">
                              <KeyRound size={15} />
                            </ActionButton>
                            <ActionButton
                              title={user.is_active ? `Deactivate ${user.name}` : `Activate ${user.name}`}
                              onClick={() => handleToggleActive(user)}
                              disabled={String(user.id) === String(currentUser.id) || processingId === user.id}
                              tone={user.is_active ? 'rose' : 'emerald'}
                            >
                              {processingId === user.id ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}
                            </ActionButton>
                            <ActionButton
                              title={`Delete ${user.name}`}
                              onClick={() => setDeleteTarget(user)}
                              disabled={String(user.id) === String(currentUser.id) || processingId === user.id}
                              tone="rose"
                            >
                              <Trash2 size={15} />
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {pagedUsers.map((user) => (
                  <div key={user.id} className="rounded-3xl border border-sky-100 bg-white/55 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-sky-950">{user.name}</h3>
                        <p className="truncate text-xs font-bold text-sky-500">{user.email}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[9px] font-black uppercase ${user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {user.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-sky-100 pt-3">
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase text-sky-600">{user.role}</span>
                      <div className="flex items-center gap-1">
                        <ActionButton title={`Edit ${user.name}`} onClick={() => startEdit(user)}><Edit2 size={15} /></ActionButton>
                        <ActionButton title={`Change password for ${user.name}`} onClick={() => startPassword(user)} tone="amber"><KeyRound size={15} /></ActionButton>
                        <ActionButton title={user.is_active ? `Deactivate ${user.name}` : `Activate ${user.name}`} onClick={() => handleToggleActive(user)} disabled={String(user.id) === String(currentUser.id) || processingId === user.id} tone={user.is_active ? 'rose' : 'emerald'}><Power size={15} /></ActionButton>
                        <ActionButton title={`Delete ${user.name}`} onClick={() => setDeleteTarget(user)} disabled={String(user.id) === String(currentUser.id) || processingId === user.id} tone="rose"><Trash2 size={15} /></ActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-sky-100 pt-4 text-xs font-black text-sky-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Showing {pagedUsers.length} of {filteredUsers.length} users</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1} className="rounded-xl border border-sky-100 bg-white/60 px-3 py-2 disabled:opacity-40">Previous</button>
                  <span className="rounded-xl bg-sky-50 px-3 py-2 text-sky-700">{page} / {totalPages}</span>
                  <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages} className="rounded-xl border border-sky-100 bg-white/60 px-3 py-2 disabled:opacity-40">Next</button>
                </div>
              </div>
            </>
          )}
        </GlassCard>

        <div ref={formRef}>
          <GlassCard className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between border-b border-sky-100 pb-4">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-sky-900">
              {mode === 'create' && <UserPlus size={18} className="text-sky-500" />}
              {mode === 'edit' && <Edit2 size={18} className="text-sky-500" />}
              {mode === 'password' && <KeyRound size={18} className="text-sky-500" />}
              <span>{mode === 'create' ? 'Add System User' : mode === 'edit' ? 'Edit User' : 'Change Password'}</span>
            </h2>
            {mode !== 'create' && (
              <button type="button" onClick={resetPanel} className="rounded-xl p-2 text-sky-500 hover:bg-sky-50" aria-label="Close editor">
                <X size={17} />
              </button>
            )}
          </div>

          {selectedUser && mode !== 'create' && (
            <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50/45 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-sky-500">Selected Account</p>
              <p className="mt-1 text-sm font-black text-sky-950">{selectedUser.name}</p>
              <p className="text-xs font-bold text-sky-600">{selectedUser.email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode !== 'password' && (
              <>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-sky-900/60">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    className="h-12 w-full rounded-2xl border border-sky-100 bg-white/60 px-4 text-sm font-bold text-sky-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10"
                    placeholder="Enter full name"
                    value={form.name}
                    onChange={handleFormChange}
                  />
                  {errors.name && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-sky-900/60">Email / Username</label>
                  <input
                    type="text"
                    name="email"
                    autoComplete="off"
                    className="h-12 w-full rounded-2xl border border-sky-100 bg-white/60 px-4 text-sm font-bold text-sky-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10"
                    placeholder="Enter email address"
                    value={form.email || ''}
                    onChange={handleFormChange}
                  />
                  {errors.email && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.email}</p>}
                </div>

                {mode === 'create' && (
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-sky-900/60">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        autoComplete="new-password"
                        className="h-12 w-full rounded-2xl border border-sky-100 bg-white/60 px-4 pr-12 text-sm font-bold text-sky-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10"
                        placeholder="Create temporary password"
                        value={form.password}
                        onChange={handleFormChange}
                      />
                      <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-sky-500 hover:bg-sky-50" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.password}</p>}
                    <div className="mt-2">
                      <div className="h-1.5 overflow-hidden rounded-full bg-sky-50">
                        <div className={`h-full rounded-full ${strength.color}`} style={{ width: strength.width }} />
                      </div>
                      <p className={`mt-1 text-[10px] font-black uppercase ${strength.text}`}>{strength.label}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-sky-900/60">Security Role</label>
                  <select
                    name="role"
                    className="h-12 w-full rounded-2xl border border-sky-100 bg-white/60 px-4 text-sm font-bold text-sky-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10"
                    value={form.role}
                    onChange={handleFormChange}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  {errors.role && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.role}</p>}
                </div>
              </>
            )}

            {mode === 'password' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-sky-900/60">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="new-password"
                      className="h-12 w-full rounded-2xl border border-sky-100 bg-white/60 px-4 pr-12 text-sm font-bold text-sky-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10"
                      placeholder="Enter new password"
                      value={password.password}
                      onChange={handlePasswordChange}
                    />
                    <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-sky-500 hover:bg-sky-50" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.password}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-sky-900/60">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    className="h-12 w-full rounded-2xl border border-sky-100 bg-white/60 px-4 text-sm font-bold text-sky-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10"
                    placeholder="Confirm new password"
                    value={password.confirmPassword}
                    onChange={handlePasswordChange}
                  />
                  {errors.confirmPassword && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.confirmPassword}</p>}
                </div>

                <div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sky-50">
                    <div className={`h-full rounded-full ${strength.color}`} style={{ width: strength.width }} />
                  </div>
                  <p className={`mt-1 text-[10px] font-black uppercase ${strength.text}`}>{strength.label}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-tr from-sky-500 to-sky-600 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-600 hover:to-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : mode === 'password' ? <KeyRound size={16} /> : <UserCheck size={16} />}
              <span>{mode === 'create' ? 'Add User Account' : mode === 'edit' ? 'Save User Changes' : 'Update Password'}</span>
            </button>
          </form>
        </GlassCard>
      </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
          <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-2xl shadow-slate-900/20">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Trash2 size={22} />
              </div>
              <div>
                <h2 id="delete-user-title" className="text-xl font-black text-slate-950">Delete User?</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  This will remove <span className="font-black text-slate-950">{deleteTarget.name}</span> from system access. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(processingId)} className="h-12 rounded-2xl border border-sky-100 bg-white px-5 text-sm font-black text-slate-700 hover:bg-sky-50 disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={handleDeleteUser} disabled={Boolean(processingId)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-70">
                {processingId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
