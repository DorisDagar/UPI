import React from 'react';
import {
  LayoutDashboard,
  Send,
  QrCode,
  MessageSquareWarning,
  LineChart,
  LifeBuoy,
  Users,
  Clock,
  ShieldCheck,
  Zap,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { Profile } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: Profile;
  stats: {
    safetyScore: number;
    moneySaved: number;
    highRiskDetected: number;
  };
  onOpenRecovery: () => void;
  onOpenSettings: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  stats,
  onOpenRecovery,
  onOpenSettings,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const mainMenuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'send-money',
      label: 'Send Money',
      icon: Send,
      badge: 'AI Shield',
    },
    {
      id: 'scan-pay',
      label: 'Scan & Pay',
      icon: QrCode,
      badge: 'Anti-Collect',
    },
    {
      id: 'message-analyzer',
      label: 'Message Analyzer',
      icon: MessageSquareWarning,
      badge: 'OCR',
    },
    {
      id: 'insights',
      label: 'Risk Insights',
      icon: LineChart,
      badge: 'Timeline',
    },
    {
      id: 'trusted-confirmation',
      label: 'Trust Person Confirmation',
      icon: Users,
      badge: 'Verify',
    },
    {
      id: 'scam-timeline',
      label: 'Scam Timeline',
      icon: Clock,
      badge: 'Forensic',
    },
    {
      id: 'recovery',
      label: 'Recovery Method',
      icon: LifeBuoy,
      badge: '1930',
    },
  ];

  const supportMenuItems = [
    {
      id: 'recovery',
      label: 'Recovery Mode',
      icon: LifeBuoy,
      badge: '1930',
    },
    {
      id: 'trusted-confirmation',
      label: 'Trusted Contacts',
      icon: Users,
      badge: null,
    },
  ];

  const handleSelect = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 lg:top-[61px] left-0 z-50 lg:z-20 w-64 h-screen lg:h-[calc(100vh-61px)] bg-[#111115] border-r border-white/5 flex flex-col justify-between p-6 transition-transform duration-300 select-none ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Navigation list */}
        <div className="space-y-6 overflow-y-auto pr-1">
          {/* Mobile Header Inside Drawer */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#6735e8] rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(103,53,232,0.4)]">
                <div className="w-3 h-3 border-2 border-white rounded-full"></div>
              </div>
              <span className="font-bold text-sm text-white">UPI Guardian</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Main Menu Section */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-3 px-2">
              Main Menu
            </p>
            <nav className="space-y-1.5">
              {mainMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <div
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => handleSelect(item.id)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#6735e8]/10 text-[#6735e8] border border-[#6735e8]/20 font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? 'bg-[#6735e8]' : 'bg-slate-700'
                        }`}
                      />
                      <span className="text-xs font-medium">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-[#6735e8]/20 text-[#6735e8]'
                            : 'bg-white/5 text-slate-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Support Section */}
          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-3 px-2">
              Support & Tools
            </p>
            <nav className="space-y-1.5">
              {supportMenuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <div
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => handleSelect(item.id)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#6735e8]/10 text-[#6735e8] border border-[#6735e8]/20 font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? 'bg-[#6735e8]' : 'bg-slate-700'
                        }`}
                      />
                      <span className="text-xs font-medium">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-[#6735e8]/20 text-[#6735e8]'
                            : 'bg-white/5 text-slate-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              })}

              <div
                id="sidebar-settings-link"
                onClick={onOpenSettings}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  <span className="text-xs font-medium">Settings & DB</span>
                </div>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-500">
                  Config
                </span>
              </div>
            </nav>
          </div>
        </div>

        {/* Bottom Theme Switch & System Status Badge */}
        <div className="pt-4 mt-auto space-y-3">
          {/* Quick Theme Switcher in Sidebar */}
          <div className="px-1">
            <ThemeToggle variant="switch" />
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">
              System Status
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-xs text-emerald-500 font-medium">
                Gemini AI Engine Active
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

