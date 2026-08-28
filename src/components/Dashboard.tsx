import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertOctagon,
  ArrowUpRight,
  QrCode,
  Send,
  MessageSquareWarning,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  Zap,
  Users,
  Eye,
  LifeBuoy,
  ArrowRight,
  FileText,
  ShieldQuestion,
  History,
} from 'lucide-react';
import { Transaction, AnalyzedMessage, Profile } from '../types';
import { DataStore } from '../lib/supabase';
import { TrustedPersonConfirmationModal } from './TrustedPersonConfirmationModal';
import { ScamTimelineModal } from './ScamTimelineModal';

interface DashboardProps {
  profile: Profile;
  transactions: Transaction[];
  messages: AnalyzedMessage[];
  stats: {
    safetyScore: number;
    transactionsAnalyzed: number;
    messagesAnalyzed: number;
    totalAnalyzed: number;
    moneySaved: number;
    highRiskDetected: number;
  };
  onNavigate: (tab: string) => void;
  onSelectTransaction?: (tx: Transaction) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  transactions,
  messages,
  stats,
  onNavigate,
}) => {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Safety Modals State
  const [modalTx, setModalTx] = useState<Transaction | null>(null);
  const [showTrustedModal, setShowTrustedModal] = useState<boolean>(false);
  const [showTimelineModal, setShowTimelineModal] = useState<boolean>(false);

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'High':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'cancelled':
        return { label: 'Scam Blocked', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 };
      case 'flagged':
        return { label: 'Flagged High Risk', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertOctagon };
      default:
        return { label: 'Completed', color: 'bg-white/5 text-slate-300 border-white/5', icon: CheckCircle2 };
    }
  };

  const handleCancelTx = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    DataStore.updateTransactionStatus(id, 'cancelled');
  };

  const latestHighRisk = transactions.find((t) => t.risk_level === 'High') || transactions[0];

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Top Threat Banner: Sleek Intercepted Scams Card */}
      {latestHighRisk && (
        <div className="bg-[#16161c] border border-red-500/20 rounded-3xl p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-red-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  Live Interception Alert
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                  Score: {latestHighRisk.risk_score}/100 Risk
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {latestHighRisk.is_collect_request
                  ? `Deceptive Collect Request Intercepted (₹${latestHighRisk.amount.toLocaleString('en-IN')})`
                  : `High-Risk UPI Transfer Flagged: ${latestHighRisk.receiver_name}`}
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Target VPA <strong className="text-slate-200 font-mono">{latestHighRisk.receiver_upi}</strong> exhibits suspicious patterns. Receiver category: <span className="text-red-300 font-semibold">{latestHighRisk.category}</span>.
              </p>

              {/* AI Quote Box */}
              <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-200/80 italic leading-relaxed">
                    "{latestHighRisk.ai_explanation}"
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto shrink-0">
              <button
                id="dashboard-scan-btn"
                onClick={() => onNavigate('scan-pay')}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/5 text-xs font-semibold transition-all hover:scale-[1.02]"
              >
                <QrCode className="w-4 h-4 text-[#00d2ff]" />
                <span>Scan QR Code</span>
              </button>

              <button
                id="dashboard-send-btn"
                onClick={() => onNavigate('send-money')}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold shadow-[0_0_15px_rgba(103,53,232,0.4)] transition-all hover:scale-[1.02] uppercase tracking-wider"
              >
                <Send className="w-4 h-4" />
                <span>Inspect Transfer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3 Core Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Safety Score */}
        <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-white/10 transition-all shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Account Safety Index</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="my-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white font-mono">{stats.safetyScore}</span>
                <span className="text-xs text-slate-500">/100</span>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                stats.safetyScore >= 80
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : stats.safetyScore >= 50
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {stats.safetyScore >= 80 ? 'Optimal Defense' : stats.safetyScore >= 50 ? 'Moderate Alert' : 'Vulnerable'}
              </span>
            </div>
          </div>
          <div className="pt-3">
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6735e8] to-[#00d2ff] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, stats.safetyScore)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Computed from transaction vigilance, contact verification, and scam refusals.
            </p>
          </div>
        </div>

        {/* Card 2: Transactions Analyzed */}
        <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-white/10 transition-all shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Live Traffic Analyzed</span>
              <TrendingUp className="w-4 h-4 text-[#00d2ff]" />
            </div>
            <div className="my-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white font-mono">{stats.totalAnalyzed}</span>
                <span className="text-xs text-[#00d2ff] font-medium">scanned</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                {stats.highRiskDetected} Flagged
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-white/5">
            <span>{stats.transactionsAnalyzed} Transfers / QRs</span>
            <span>{stats.messagesAnalyzed} SMS / WhatsApp</span>
          </div>
        </div>

        {/* Card 3: Money Saved */}
        <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-white/10 transition-all shadow-lg sm:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Defrauded Capital Blocked</span>
              <Flame className="w-4 h-4 text-[#00d2ff]" />
            </div>
            <div className="my-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">
                  ₹{stats.moneySaved.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Preserved
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 pt-3 border-t border-white/5">
            Sum of fraudulent requests, collect traps, and scam invoices cancelled before PIN entry.
          </p>
        </div>
      </div>

      {/* Main Grid: Live Transactions Stream & High-Risk Scam Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Real-Time Transaction Stream */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Live UPI Inspection Stream</span>
                  <span className="text-[10px] font-normal px-2.5 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                    {transactions.length} records
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Real-time risk verdicts with plain language explainability</p>
              </div>
              <button
                onClick={() => onNavigate('send-money')}
                className="text-xs text-[#00d2ff] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Verify New</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Transactions List */}
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white/5 border border-white/5 text-center space-y-3">
                  <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm text-slate-300">No transactions recorded yet.</p>
                  <button
                    onClick={() => onNavigate('send-money')}
                    className="px-4 py-2 rounded-xl bg-[#6735e8] text-white text-xs font-bold"
                  >
                    Analyze First Transaction
                  </button>
                </div>
              ) : (
                transactions.map((tx) => {
                  const statusMeta = getStatusBadge(tx.status);
                  const StatusIcon = statusMeta.icon;
                  const isSelected = selectedTx?.id === tx.id;

                  return (
                    <div
                      key={tx.id}
                      id={`tx-card-${tx.id}`}
                      onClick={() => setSelectedTx(isSelected ? null : tx)}
                      className={`rounded-2xl border transition-all cursor-pointer p-4.5 ${
                        tx.risk_level === 'High' && tx.status !== 'cancelled'
                          ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
                          : isSelected
                          ? 'border-[#6735e8]/50 bg-[#6735e8]/10'
                          : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              tx.risk_level === 'High'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                                : tx.risk_level === 'Medium'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {tx.risk_level === 'High' ? (
                              <AlertOctagon className="w-5 h-5 animate-pulse" />
                            ) : tx.risk_level === 'Medium' ? (
                              <ShieldAlert className="w-5 h-5" />
                            ) : (
                              <ShieldCheck className="w-5 h-5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-white truncate">{tx.receiver_name}</h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRiskBadge(tx.risk_level)}`}>
                                {tx.risk_level} Risk ({tx.risk_score}/100)
                              </span>
                              {tx.is_collect_request && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                                  COLLECT REQUEST
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono truncate">{tx.receiver_upi}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base font-extrabold text-white font-mono">₹{tx.amount.toLocaleString('en-IN')}</p>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <StatusIcon className="w-3 h-3 text-slate-400" />
                            <span className="text-[11px] text-slate-400">{statusMeta.label}</span>
                          </div>
                        </div>
                      </div>

                      {/* Transaction note if present */}
                      {tx.note && (
                        <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Note:</span>
                          <span className="truncate italic">"{tx.note}"</span>
                        </div>
                      )}

                      {/* AI Explanation Box */}
                      <div className="mt-3 p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00d2ff]">
                          <Sparkles className="w-3.5 h-3.5 text-[#00d2ff]" />
                          <span>AI Verdict Explanation:</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {tx.ai_explanation}
                        </p>

                        {/* Triggers list */}
                        {tx.triggers && tx.triggers.length > 0 && (
                          <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1.5">
                            {tx.triggers.map((trig, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"
                              >
                                🚩 {trig}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Expanded Actions */}
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(tx.created_at).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {tx.risk_level === 'High' && tx.status !== 'cancelled' && (
                            <button
                              id={`cancel-tx-btn-${tx.id}`}
                              onClick={(e) => handleCancelTx(tx.id, e)}
                              className="px-2.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[11px] transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Block Scam</span>
                            </button>
                          )}

                          {/* Trusted Person Review trigger */}
                          <button
                            id={`trusted-person-btn-${tx.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalTx(tx);
                              setShowTrustedModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-[#6735e8]/20 hover:bg-[#6735e8]/35 text-[#00d2ff] border border-[#6735e8]/40 text-[11px] font-bold transition-colors flex items-center gap-1"
                            title="Ask family or trusted person to verify"
                          >
                            <Users className="w-3 h-3" />
                            <span>Trusted Person</span>
                          </button>

                          {/* Scam Sequence Timeline trigger */}
                          <button
                            id={`timeline-btn-${tx.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalTx(tx);
                              setShowTimelineModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-[11px] font-semibold transition-colors flex items-center gap-1"
                            title="View chronological scam sequence"
                          >
                            <Clock className="w-3 h-3 text-[#00d2ff]" />
                            <span>Timeline</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              DataStore.updateRecoverySession({
                                selected_transaction_id: tx.id,
                                selected_transaction: tx,
                              });
                              DataStore.generateTimelineFromTransaction(tx);
                              onNavigate('recovery');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] transition-colors"
                          >
                            Recovery Mode
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Threat Radar & Quick Tools */}
        <div className="space-y-6">
          {/* Live Indian UPI Threat Radar */}
          <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span>Active UPI Threat Radar</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">India Live</span>
            </div>

            <div className="space-y-2.5">
              {/* Threat 1 */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center justify-between text-xs font-semibold text-red-300">
                  <span>Electricity Bill SMS Phishing</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Critical</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Threatening power disconnection at 9:30 PM with personal 10-digit mobile contacts.
                </p>
              </div>

              {/* Threat 2 */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                  <span>OLX / Army Officer QR Trap</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">High Volume</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Buyer sends a collect QR code claiming seller must scan & enter UPI PIN to receive payment.
                </p>
              </div>

              {/* Threat 3 */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center justify-between text-xs font-semibold text-[#00d2ff]">
                  <span>Fake Customer Care on Google</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Active</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  SEO spoofed customer care numbers redirecting users to install AnyDesk/TeamViewer.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Analyzer Shortcut Card */}
          <div className="bg-gradient-to-br from-[#16161c] to-[#1e1430] border border-white/5 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#6735e8] flex items-center justify-center text-white">
                <MessageSquareWarning className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Received a Suspicious SMS?</h4>
                <p className="text-[11px] text-slate-400">Upload screenshot or paste text for instant OCR & AI verdict</p>
              </div>
            </div>

            <button
              id="dashboard-goto-message-analyzer-btn"
              onClick={() => onNavigate('message-analyzer')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-xs transition-colors"
            >
              <span>Open AI Message Analyzer</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Emergency 1930 Cyber Fraud Card */}
          <div className="bg-[#16161c] border border-red-500/20 rounded-3xl p-6 space-y-2.5 shadow-xl">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
              <AlertOctagon className="w-4 h-4 text-red-400" />
              <span>National Cyber Crime Helpline: 1930</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              If unauthorized money was debited from your bank, report within the <strong>Golden Hour (2-3 hours)</strong> to maximize chances of freezing beneficiary accounts.
            </p>
            <button
              onClick={() => onNavigate('recovery')}
              className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 pt-1 transition-colors"
            >
              <span>Launch Recovery Wizard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dedicated Quick Action Links below Message Analyzer & Risk Insights */}
          <div className="bg-[#16161c] border border-white/5 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00d2ff]" />
                <span>Quick Defense Features</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Tools</span>
            </div>

            <div className="space-y-2">
              {/* 1. Trust Person Confirmation Link */}
              <button
                type="button"
                id="sidebar-quick-trusted-person-btn"
                onClick={() => {
                  const targetTx = transactions.find((t) => t.risk_level === 'High') || transactions[0];
                  setModalTx(targetTx || null);
                  setShowTrustedModal(true);
                }}
                className="w-full p-3 rounded-2xl bg-white/5 hover:bg-[#6735e8]/20 border border-white/5 hover:border-[#6735e8]/40 transition-all text-left group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#6735e8]/20 group-hover:bg-[#6735e8] text-[#00d2ff] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-[#00d2ff] transition-colors">
                      Trust Person Confirmation
                    </h5>
                    <p className="text-[10px] text-slate-400">Ask family to verify suspicious VPAs</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* 2. Scam Timeline Link */}
              <button
                type="button"
                id="sidebar-quick-scam-timeline-btn"
                onClick={() => {
                  const targetTx = transactions.find((t) => t.risk_level === 'High') || transactions[0];
                  setModalTx(targetTx || null);
                  setShowTimelineModal(true);
                }}
                className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#00d2ff]/15 group-hover:bg-[#00d2ff] text-[#00d2ff] group-hover:text-black flex items-center justify-center transition-colors shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-[#00d2ff] transition-colors">
                      Scam Timeline
                    </h5>
                    <p className="text-[10px] text-slate-400">Chronological fraud step reconstruction</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* 3. Recovery Method Link */}
              <button
                type="button"
                id="sidebar-quick-recovery-method-btn"
                onClick={() => onNavigate('recovery')}
                className="w-full p-3 rounded-2xl bg-white/5 hover:bg-red-500/15 border border-white/5 hover:border-red-500/30 transition-all text-left group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-500/15 group-hover:bg-red-500 text-red-400 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <LifeBuoy className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-red-300 transition-colors">
                      Recovery Method
                    </h5>
                    <p className="text-[10px] text-slate-400">1930 helpline & bank dispute protocol</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH DEDICATED HUB: TRUST PERSON CONFIRMATION, SCAM TIMELINE, RECOVERY METHOD */}
      <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d2ff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00d2ff]"></span>
              </span>
              <h3 className="text-lg font-black text-white tracking-tight">
                Guardian Defense & Recovery Framework
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-tiered anti-fraud mechanisms covering pre-payment advisory, forensic chronology, and rapid capital recovery.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-[#6735e8]/20 text-[#00d2ff] border border-[#6735e8]/30 self-start sm:self-auto">
            3-Pillar Security Suite
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Feature 1: Trust Person Confirmation */}
          <div
            id="hub-trusted-person-card"
            className="p-6 rounded-2xl bg-gradient-to-b from-[#1f1a30] to-[#16161c] border border-[#6735e8]/30 hover:border-[#6735e8]/70 transition-all flex flex-col justify-between group shadow-lg space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#6735e8] text-white flex items-center justify-center shadow-[0_0_15px_rgba(103,53,232,0.4)] group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6 text-[#00d2ff]" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#6735e8]/20 text-purple-300 border border-[#6735e8]/30">
                  Pre-Payment Shield
                </span>
              </div>

              <h4 className="text-base font-bold text-white group-hover:text-[#00d2ff] transition-colors">
                Trust Person Confirmation
              </h4>

              <p className="text-xs text-slate-300 leading-relaxed">
                Connect a trusted contact or family member to review suspicious VPAs and collect requests before authorizing any payment.
              </p>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>WhatsApp & SMS instant verification link</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Real-time guardian approve or block signals</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              id="dashboard-open-trusted-person-modal-btn"
              onClick={() => {
                const targetTx = transactions.find((t) => t.risk_level === 'High') || transactions[0];
                setModalTx(targetTx || null);
                setShowTrustedModal(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(103,53,232,0.3)] transition-all group-hover:shadow-[0_0_18px_rgba(103,53,232,0.5)]"
            >
              <span>Launch Confirmation Review</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Feature 2: Scam Timeline */}
          <div
            id="hub-scam-timeline-card"
            className="p-6 rounded-2xl bg-gradient-to-b from-[#14232c] to-[#16161c] border border-[#00d2ff]/30 hover:border-[#00d2ff]/70 transition-all flex flex-col justify-between group shadow-lg space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock className="w-6 h-6 text-[#00d2ff]" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#00d2ff]/15 text-[#00d2ff] border border-[#00d2ff]/30">
                  Forensic Trace
                </span>
              </div>

              <h4 className="text-base font-bold text-white group-hover:text-[#00d2ff] transition-colors">
                Scam Sequence Timeline
              </h4>

              <p className="text-xs text-slate-300 leading-relaxed">
                Step-by-step chronological visualization tracing the scam progression: Phishing Lure → Malicious URL → Call Impersonation → Interception.
              </p>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00d2ff] shrink-0" />
                  <span>Sequential playback with timestamps</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00d2ff] shrink-0" />
                  <span>Evidence mapping & actor categorization</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              id="dashboard-open-scam-timeline-modal-btn"
              onClick={() => {
                const targetTx = transactions.find((t) => t.risk_level === 'High') || transactions[0];
                setModalTx(targetTx || null);
                setShowTimelineModal(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 text-[#00d2ff] border border-[#00d2ff]/40 hover:border-[#00d2ff] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <span>View Interactive Timeline</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Feature 3: Recovery Method */}
          <div
            id="hub-recovery-method-card"
            className="p-6 rounded-2xl bg-gradient-to-b from-[#2b171c] to-[#16161c] border border-red-500/30 hover:border-red-500/70 transition-all flex flex-col justify-between group shadow-lg space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)] group-hover:scale-105 transition-transform">
                  <LifeBuoy className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  Post-Incident Protocol
                </span>
              </div>

              <h4 className="text-base font-bold text-white group-hover:text-red-300 transition-colors">
                Dispute & Recovery Method
              </h4>

              <p className="text-xs text-slate-300 leading-relaxed">
                Standardized 6-step recovery protocol for 1930 portal dispatch, bank lien freeze, evidence compilation, and police cyber cell FIRs.
              </p>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>Golden Hour 1930 reporting script</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>Automated bank dispute formal letter generator</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              id="dashboard-open-recovery-method-btn"
              onClick={() => onNavigate('recovery')}
              className="w-full py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(239,68,68,0.3)] transition-all group-hover:shadow-[0_0_18px_rgba(239,68,68,0.5)]"
            >
              <span>Open Recovery Wizard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. Trusted Person Confirmation Modal */}
      {showTrustedModal && (
        <TrustedPersonConfirmationModal
          isOpen={showTrustedModal}
          onClose={() => {
            setShowTrustedModal(false);
            setModalTx(null);
          }}
          transaction={{
            receiverName: (modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0])?.receiver_name || 'SBI KYC Verification Desk',
            receiverUpi: (modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0])?.receiver_upi || 'sbiyono.kyc@oksbi',
            amount: (modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0])?.amount || 4999,
            riskScore: (modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0])?.risk_score || 95,
            riskLevel: (modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0])?.risk_level || 'High',
            scamPattern: (modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0])?.category || 'Fake Bank KYC Collect Trap',
            aiExplanation: (modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0])?.ai_explanation || 'Collect request trap sent under the guise of an urgent KYC update to debit funds.',
            triggers: (modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0])?.triggers || ['Collect Trap', 'Urgent KYC Coercion'],
            isCollect: (modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0])?.is_collect_request ?? true,
            note: (modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0])?.note || 'Urgent KYC Update',
            txId: (modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0])?.id || 'tx-sample-1',
          }}
          onBlockScam={() => {
            if (modalTx) {
              DataStore.updateTransactionStatus(modalTx.id, 'cancelled');
            }
          }}
          onOpenScamTimeline={() => {
            setShowTrustedModal(false);
            setShowTimelineModal(true);
          }}
        />
      )}

      {/* 2. Scam Timeline Modal */}
      <ScamTimelineModal
        isOpen={showTimelineModal}
        onClose={() => {
          setShowTimelineModal(false);
          setModalTx(null);
        }}
        transaction={modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0] || null}
        onConsultTrustedPerson={() => {
          setShowTimelineModal(false);
          setShowTrustedModal(true);
        }}
        onLaunchRecovery={() => {
          setShowTimelineModal(false);
          const target = modalTx || transactions.find((t) => t.risk_level === 'High') || transactions[0];
          if (target) {
            DataStore.updateRecoverySession({
              selected_transaction_id: target.id,
              selected_transaction: target,
            });
          }
          onNavigate('recovery');
        }}
      />
    </div>
  );
};

