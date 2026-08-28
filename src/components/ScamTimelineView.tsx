import React from 'react';
import { Clock, ShieldAlert, Sparkles, ArrowLeft, ArrowRight, LifeBuoy } from 'lucide-react';
import { ScamTimeline } from './ScamTimeline';
import { Transaction } from '../types';

interface ScamTimelineViewProps {
  transactions: Transaction[];
  onNavigate: (tab: string) => void;
}

export const ScamTimelineView: React.FC<ScamTimelineViewProps> = ({
  transactions,
  onNavigate,
}) => {
  const highRiskTx = transactions.find((t) => t.risk_level === 'High') || transactions[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#14232c] via-[#16161c] to-[#121216] border border-[#00d2ff]/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00d2ff]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d2ff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00d2ff]"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-[#00d2ff]">
                Forensic Incident Chronology
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Scam Sequence Timeline
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Step-by-step visual forensics mapping the entire deception lifecycle: SMS Phishing Lure → Malicious URL APK → Impersonation Call → Intercepted Collect Request.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('recovery')}
              className="px-5 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all hover:scale-[1.02]"
            >
              <LifeBuoy className="w-4 h-4 text-white" />
              <span>Launch 1930 Recovery</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Timeline Component */}
      <ScamTimeline
        transaction={highRiskTx}
        onConsultTrustedPerson={() => onNavigate('trusted-confirmation')}
        onLaunchRecovery={() => onNavigate('recovery')}
        showActions={true}
      />
    </div>
  );
};
