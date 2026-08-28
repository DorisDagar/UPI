import React from 'react';
import { Shield, AlertTriangle, Key, Flame, LifeBuoy } from 'lucide-react';
import { Profile } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  profile: Profile;
  stats: {
    safetyScore: number;
    moneySaved: number;
    highRiskDetected: number;
  };
  onOpenRecovery: () => void;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  stats,
  onOpenRecovery,
  onOpenAuth,
  onOpenSettings,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
    return 'text-red-400 border-red-500/20 bg-red-500/10';
  };

  return (
    <header className="sticky top-0 z-30 bg-[#111115]/90 backdrop-blur-md border-b border-white/5 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      {/* Left: Mobile hamburger & Logo */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-toggle-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white border border-white/5 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 bg-[#6735e8] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(103,53,232,0.4)] group-hover:scale-105 transition-transform">
            <div className="w-3.5 h-3.5 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">
                UPI Guardian
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[#6735e8]/20 text-[#6735e8] border border-[#6735e8]/30 hidden sm:inline-block">
                AI Defense
              </span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest hidden md:block">
              Explain Before You Pay
            </p>
          </div>
        </div>
      </div>

      {/* Center: Live Stats Highlights */}
      <div className="hidden md:flex items-center gap-3">
        {/* Safety Score Pill */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${getScoreBadge(
            stats.safetyScore
          )}`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          <span className="text-slate-300">Safety Index:</span>
          <span className="font-bold">{stats.safetyScore}/100</span>
        </div>

        {/* Money Saved */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/5 text-slate-300 text-xs font-medium">
          <Flame className="w-3.5 h-3.5 text-[#00d2ff]" />
          <span>Scams Blocked:</span>
          <span className="font-bold text-emerald-400 font-mono">₹{stats.moneySaved.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Right: Actions, Dark/Light Mode Switch, Panic Recovery & User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Dark / Light Mode Switch */}
        <ThemeToggle variant="icon" />

        {/* Urgent Recovery / Panic Button */}
        <button
          id="panic-recovery-btn"
          onClick={onOpenRecovery}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-all hover:scale-[1.02]"
          title="Fell for a scam? Get instant 1930 Cyber Cell & Bank Complaint report"
        >
          <LifeBuoy className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span className="hidden sm:inline">Recovery Wizard</span>
          <span className="sm:hidden">Recovery</span>
        </button>

        {/* Settings button */}
        <button
          id="nav-settings-btn"
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-colors"
          title="Settings & System Configuration"
        >
          <Key className="w-4 h-4 text-slate-300" />
        </button>

        {/* User Profile Pill */}
        <button
          id="nav-user-profile-btn"
          onClick={onOpenAuth}
          className="flex items-center gap-3 p-1 rounded-2xl hover:bg-white/5 transition-colors text-left"
        >
          <div className="hidden xl:flex flex-col items-end text-right">
            <span className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Protected User</span>
            <span className="text-white text-xs font-medium">+{profile.mobile_number}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#6735e8] to-[#00d2ff] p-[2px]">
            <div className="w-full h-full rounded-full bg-[#111115] flex items-center justify-center text-xs font-bold text-white">
              {profile.username ? profile.username.slice(0, 2).toUpperCase() : 'AP'}
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};

