import React, { useState } from 'react';
import {
  X,
  Database,
  Shield,
  Key,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  User,
  Sliders,
  Sun,
  Moon,
} from 'lucide-react';
import { Profile } from '../types';
import { DataStore } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onProfileUpdate: (updated: Profile) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdate,
}) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'supabase'>('profile');
  const [username, setUsername] = useState(profile.username);
  const [mobileNumber, setMobileNumber] = useState(profile.mobile_number);
  const [trustThreshold, setTrustThreshold] = useState(profile.trust_threshold);

  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('supabase_url') || ''
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem('supabase_anon_key') || ''
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const sqlSchema = `-- =========================================================================
-- UPI GUARDIAN: SUPABASE POSTGRES SCHEMA MIGRATION SCRIPT
-- =========================================================================

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null,
  mobile_number text not null,
  safety_score integer default 100,
  trust_threshold integer default 50,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Transactions Table
create table if not exists public.transactions (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  receiver_name text not null,
  receiver_upi text not null,
  amount numeric not null,
  category text not null,
  risk_score integer not null,
  risk_level text not null check (risk_level in ('Low', 'Medium', 'High')),
  ai_explanation text not null,
  status text not null default 'completed' check (status in ('completed', 'flagged', 'cancelled')),
  is_collect_request boolean default false,
  note text,
  triggers text[],
  scam_pattern text,
  recommendations text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Analyzed Messages Table
create table if not exists public.analyzed_messages (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  risk_score integer not null,
  verdict text not null,
  flags text[],
  psychological_triggers text[],
  explanation text not null,
  source text default 'sms',
  extracted_entities jsonb,
  safe_action_steps text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Incident Reports Table
create table if not exists public.incident_reports (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  victim_name text not null,
  victim_phone text not null,
  scammer_upi text,
  scammer_phone text,
  amount_lost numeric not null,
  incident_date text not null,
  platform text not null,
  bank_reference_no text,
  fraud_category text not null,
  incident_description text not null,
  generated_report text not null,
  status text default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Realtime publication for live stream
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.analyzed_messages;`;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = DataStore.updateProfile({
      username,
      mobile_number: mobileNumber,
      trust_threshold: trustThreshold,
    });
    onProfileUpdate(updated);

    if (supabaseUrl) localStorage.setItem('supabase_url', supabaseUrl);
    if (supabaseKey) localStorage.setItem('supabase_anon_key', supabaseKey);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#16161c] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10 text-[#00d2ff]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">UPI Guardian Settings & Database</h3>
              <p className="text-xs text-slate-400">Manage security thresholds, profile, and Supabase connection</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex items-center border-b border-white/5 px-6 bg-white/[0.02]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-[#00d2ff] text-[#00d2ff]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Security</span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'supabase'
                ? 'border-[#00d2ff] text-[#00d2ff]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Supabase Schema & Config</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Account Username / Alias</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-white focus:outline-none focus:border-[#00d2ff] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Registered Mobile Number</label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-white focus:outline-none focus:border-[#00d2ff] text-xs"
                />
              </div>

              {/* Theme / Appearance Selection */}
              <div className="space-y-2 p-5 rounded-2xl bg-white/5 border border-white/5">
                <label className="text-xs font-semibold text-slate-300">Interface Appearance</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      theme === 'dark'
                        ? 'bg-[#6735e8]/20 border-[#6735e8] text-white shadow-[0_0_12px_rgba(103,53,232,0.3)]'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-[#00d2ff]" />
                    <span className="text-xs font-medium">Dark Canvas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      theme === 'light'
                        ? 'bg-amber-500/20 border-amber-500 text-slate-900 font-bold shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium">Light Canvas</span>
                  </button>
                </div>
              </div>

              {/* Trust Threshold Slider */}
              <div className="space-y-3 p-5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">AI Alert Sensitivity Threshold</span>
                  <span className="font-mono text-[#00d2ff] font-bold px-2 py-0.5 rounded-full bg-[#00d2ff]/10 border border-[#00d2ff]/20">{trustThreshold} / 100</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={trustThreshold}
                  onChange={(e) => setTrustThreshold(Number(e.target.value))}
                  className="w-full accent-[#00d2ff] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Aggressive Shield (Strict)</span>
                  <span>Standard (Balanced)</span>
                  <span>Permissive</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  Transactions scoring above {trustThreshold} will immediately trigger an interactive warning dialog.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(103,53,232,0.4)] transition-all"
              >
                {savedSuccess ? 'Settings Saved Successfully!' : 'Save Preferences'}
              </button>
            </form>
          )}

          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-[#00d2ff]" />
                  <span>Connect External Supabase Database (Optional)</span>
                </h4>
                <p className="text-xs text-slate-300">
                  UPI Guardian stores data locally with instant reactive listeners, and can connect to your Supabase project URL and anon public key.
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[11px] text-slate-400">Supabase Project URL</label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0c] border border-white/5 text-white text-xs font-mono focus:outline-none focus:border-[#00d2ff]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400">Supabase Anon Key</label>
                    <input
                      type="password"
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0c] border border-white/5 text-white text-xs font-mono focus:outline-none focus:border-[#00d2ff]"
                    />
                  </div>
                </div>
              </div>

              {/* SQL Migration Script */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">PostgreSQL DDL Schema:</span>
                  <button
                    onClick={copySql}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold border border-white/5 transition-colors"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'SQL Copied' : 'Copy SQL Migration'}</span>
                  </button>
                </div>
                <div className="p-4 rounded-2xl bg-[#0a0a0c] border border-white/5 max-h-48 overflow-y-auto font-mono text-[10px] text-[#00d2ff] leading-relaxed whitespace-pre">
                  {sqlSchema}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
