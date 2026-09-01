import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { settingsAPI } from '../api/client';
import GlassCard from '../components/GlassCard';

export default function Settings() {
  const [form, setForm] = useState({
    company_name: '',
    address: '',
    phone: '',
    email: '',
    receipt_footer: '',
    default_currency: 'USD',
    receipt_prefix: 'TX',
    next_receipt_number: 1,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    settingsAPI.get()
      .then((res) => {
        const d = res.data;
        if (d) {
          setForm({
            company_name: d.company_name || '',
            address: d.address || '',
            phone: d.phone || '',
            email: d.email || '',
            receipt_footer: d.receipt_footer || '',
            default_currency: d.default_currency || 'USD',
            receipt_prefix: d.receipt_prefix || 'TX',
            next_receipt_number: d.next_receipt_number || 1,
          });
          if (d.logo_path) {
            setLogoPreview(d.logo_path);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load settings', err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = {
        ...form,
        next_receipt_number: Number(form.next_receipt_number || 1),
      };
      // Save metadata
      await settingsAPI.update(payload);

      // Save logo file if exists
      if (logoFile) {
        await settingsAPI.uploadLogo(logoFile);
      }

      setMessage('Branding settings updated successfully. Reload to apply.');
    } catch (err) {
      console.error(err);
      setMessage('Failed to save settings. Confirm Admin authorization.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="animate-spin text-sky-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black text-sky-900 leading-tight">Settings & Branding</h1>
        <p className="text-sm text-sky-500 font-medium mt-1">Configure your invoice company, logo, and receipt templates.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Settings Panel */}
        <GlassCard className="lg:col-span-2 p-6 md:p-8">
          <h2 className="text-base font-extrabold text-sky-900 border-b border-sky-100 pb-3 mb-6 flex items-center gap-2">
            <SettingsIcon size={18} className="text-sky-500" />
            <span>Company Profile Configuration</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  name="company_name"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                  value={form.company_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                  Default Vault Currency
                </label>
                <select
                  name="default_currency"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                  value={form.default_currency}
                  onChange={handleChange}
                >
                  <option value="USD">USD</option>
                  <option value="Toman">Toman</option>
                  <option value="Dirham">Dirham</option>
                  <option value="Afghani">Afghani</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                  Receipt Auto Prefix
                </label>
                <input
                  type="text"
                  name="receipt_prefix"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                  value={form.receipt_prefix}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                  Next Auto Number
                </label>
                <input
                  type="number"
                  name="next_receipt_number"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                  value={form.next_receipt_number}
                  onChange={handleChange}
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="email"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                  Business Address
                </label>
                <input
                  type="text"
                  name="address"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-sky-900/60 uppercase tracking-wide mb-1.5">
                  Receipt Footer Disclaimer
                </label>
                <textarea
                  name="receipt_footer"
                  rows="3"
                  className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold text-sky-900"
                  value={form.receipt_footer}
                  onChange={handleChange}
                />
              </div>
            </div>

            {message && (
              <div className={`p-3.5 border rounded-xl text-xs font-semibold leading-relaxed ${
                message.includes('successfully')
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                  : 'bg-red-50 border-red-100 text-red-600'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3.5 bg-gradient-to-tr from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-500/25 transition-all text-xs flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              <span>Save System Settings</span>
            </button>
          </form>
        </GlassCard>

        {/* Logo Configuration Column */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6 text-center space-y-6">
            <h2 className="text-base font-extrabold text-sky-900 border-b border-sky-100 pb-3 text-left">
              Logo Branding
            </h2>

            <div className="flex flex-col items-center">
              {logoPreview ? (
                <div className="relative group">
                  <img
                    src={logoPreview.startsWith('blob:') ? logoPreview : `/api/uploads/${logoPreview.split(/[\\/]/).pop()}`}
                    alt="Company logo preview"
                    className="w-24 h-24 rounded-2xl object-cover border border-sky-100 shadow-md"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.target.src = 'https://placehold.co/100x100/eaf4ff/0f6bdc?text=Logo';
                    }}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-300">
                  <ImageIcon size={32} />
                </div>
              )}
              
              <p className="text-xs text-sky-900/60 font-semibold mt-3">Company Header Logo</p>
              <p className="text-[10px] text-sky-400 font-bold block mt-1">Recommended size 120x120px</p>
            </div>

            <label className="w-full py-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all">
              <Upload size={14} />
              <span>Select Image Logo</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleLogoChange}
              />
            </label>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
