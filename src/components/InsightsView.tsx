import React, { useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  LineChart as LineChartIcon,
  ShieldCheck,
  AlertOctagon,
  ShieldAlert,
  Clock,
  Filter,
  Layers,
  HelpCircle,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Transaction, AnalyzedMessage } from '../types';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

interface InsightsViewProps {
  transactions: Transaction[];
  messages: AnalyzedMessage[];
}

export const InsightsView: React.FC<InsightsViewProps> = ({ transactions, messages }) => {
  const { isDark } = useTheme();
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'high_risk' | 'transactions' | 'messages'>('all');

  // Compute Risk Breakdown counts for Chart.js
  const lowRiskTx = transactions.filter((t) => t.risk_level === 'Low').length;
  const medRiskTx = transactions.filter((t) => t.risk_level === 'Medium').length;
  const highRiskTx = transactions.filter((t) => t.risk_level === 'High').length;

  const safeMsg = messages.filter((m) => m.verdict === 'Safe').length;
  const suspMsg = messages.filter((m) => m.verdict === 'Suspicious').length;
  const dangerMsg = messages.filter((m) => m.verdict === 'Dangerous Fraud').length;

  const totalLow = lowRiskTx + safeMsg;
  const totalMed = medRiskTx + suspMsg;
  const totalHigh = highRiskTx + dangerMsg;

  // Doughnut Chart: Risk Distribution
  const doughnutData = {
    labels: ['Safe / Low Risk', 'Suspicious / Medium', 'Critical / Dangerous Fraud'],
    datasets: [
      {
        data: [Math.max(1, totalLow), Math.max(1, totalMed), Math.max(1, totalHigh)],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderColor: isDark ? ['#047857', '#d97706', '#b91c1c'] : ['#ffffff', '#ffffff', '#ffffff'],
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: isDark ? '#cbd5e1' : '#475569',
          font: { size: 11, weight: 'bold' as const },
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#0f172a' : '#1e293b',
        titleColor: '#38bdf8',
        bodyColor: '#f8fafc',
        borderColor: isDark ? '#334155' : '#64748b',
        borderWidth: 1,
        padding: 10,
      },
    },
    cutout: '65%',
  };

  // Category Distribution Bar Chart
  const categoryCounts: { [cat: string]: number } = {};
  transactions.forEach((t) => {
    const cat = t.category || 'Peer to Peer';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  messages.forEach((m) => {
    const cat = m.flags[0] || 'Phishing SMS';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const topCategories = Object.entries(categoryCounts).slice(0, 5);
  const barData = {
    labels: topCategories.map(([cat]) => (cat.length > 18 ? `${cat.slice(0, 16)}...` : cat)),
    datasets: [
      {
        label: 'Incidents Analyzed',
        data: topCategories.map(([, count]) => count),
        backgroundColor: '#6735e8',
        borderColor: isDark ? '#00f0ff' : '#6735e8',
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#0f172a' : '#1e293b',
        titleColor: '#38bdf8',
        bodyColor: '#f8fafc',
        borderColor: isDark ? '#334155' : '#64748b',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 10 } },
        grid: { color: isDark ? '#1e293b' : 'rgba(0,0,0,0.06)' },
      },
      y: {
        ticks: { color: isDark ? '#94a3b8' : '#64748b', stepSize: 1, font: { size: 10 } },
        grid: { color: isDark ? '#1e293b' : 'rgba(0,0,0,0.06)' },
      },
    },
  };

  // Unified Chronological Scam Timeline
  interface TimelineItem {
    id: string;
    type: 'transaction' | 'message';
    date: string;
    title: string;
    subtitle: string;
    riskLevel: 'Low' | 'Medium' | 'High';
    riskScore: number;
    explanation: string;
    amount?: number;
    status?: string;
  }

  const mergedTimeline: TimelineItem[] = [
    ...transactions.map((tx) => ({
      id: tx.id,
      type: 'transaction' as const,
      date: tx.created_at,
      title: `${tx.is_collect_request ? '🚨 Collect Request: ' : 'Payment to '}${tx.receiver_name}`,
      subtitle: `${tx.receiver_upi} • ₹${tx.amount.toLocaleString('en-IN')}`,
      riskLevel: tx.risk_level,
      riskScore: tx.risk_score,
      explanation: tx.ai_explanation,
      amount: tx.amount,
      status: tx.status,
    })),
    ...messages.map((msg) => ({
      id: msg.id,
      type: 'message' as const,
      date: msg.created_at,
      title: `SMS / WhatsApp: ${msg.flags[0] || 'Message Alert'}`,
      subtitle: `Source: ${msg.source?.toUpperCase() || 'SMS'} • ${msg.content.slice(0, 60)}...`,
      riskLevel: msg.verdict === 'Dangerous Fraud' ? 'High' : msg.verdict === 'Suspicious' ? 'Medium' : 'Low',
      riskScore: msg.risk_score,
      explanation: msg.explanation,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTimeline = mergedTimeline.filter((item) => {
    if (timelineFilter === 'high_risk') return item.riskLevel === 'High';
    if (timelineFilter === 'transactions') return item.type === 'transaction';
    if (timelineFilter === 'messages') return item.type === 'message';
    return true;
  });

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6735e8]/10 border border-[#6735e8]/20 text-[#6735e8] text-[10px] font-bold uppercase tracking-wider">
          <LineChartIcon className="w-3.5 h-3.5 text-[#00d2ff]" />
          <span>Chart.js Insights & Timeline</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Fraud Activity Breakdown & Timeline
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Visual analytics mapping threat frequencies, behavioral risk distributions, and your unified UPI security history.
        </p>
      </div>

      {/* 2 Interactive Chart.js Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Doughnut Risk Breakdown */}
        <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h3 className="text-sm font-bold text-white">Risk Profile Breakdown</h3>
              <p className="text-xs text-slate-400">Low vs Medium vs High risk activity</p>
            </div>
            <span className="text-xs font-bold text-[#00d2ff] font-mono">
              {totalLow + totalMed + totalHigh} Total Scanned
            </span>
          </div>

          <div className="h-64 relative flex items-center justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs pt-3 border-t border-white/5">
            <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <span className="text-emerald-400 font-bold text-sm font-mono">{totalLow}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Safe</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10">
              <span className="text-amber-400 font-bold text-sm font-mono">{totalMed}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Caution</p>
            </div>
            <div className="p-3 rounded-2xl bg-red-500/5 border border-red-500/10">
              <span className="text-red-400 font-bold text-sm font-mono">{totalHigh}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Scams Blocked</p>
            </div>
          </div>
        </div>

        {/* Chart 2: Modus Operandi Distribution */}
        <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h3 className="text-sm font-bold text-white">Top Identified Fraud Vectors</h3>
              <p className="text-xs text-slate-400">Classification by scam modus operandi</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/5 text-slate-300 text-[10px] font-semibold border border-white/5">
              Live Taxonomy
            </span>
          </div>

          <div className="h-64 relative">
            <Bar data={barData} options={barOptions} />
          </div>

          <p className="text-[11px] text-slate-400 text-center pt-3 border-t border-white/5">
            Utility threats and disguised collect requests account for majority of intercepted scams.
          </p>
        </div>
      </div>

      {/* UNIFIED SCAM TIMELINE SECTION */}
      <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00d2ff]" />
              <span>Unified Scam & Security Timeline</span>
            </h2>
            <p className="text-xs text-slate-400">
              Merged historical log of transactions, decoded QR links, and scanned messages
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/5">
            {(['all', 'high_risk', 'transactions', 'messages'] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setTimelineFilter(filterKey)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                  timelineFilter === filterKey
                    ? 'bg-[#6735e8] text-white shadow-[0_0_10px_rgba(103,53,232,0.4)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filterKey.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline list */}
        <div className="space-y-3">
          {filteredTimeline.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No events matching this filter.</p>
          ) : (
            filteredTimeline.map((item) => {
              const isHigh = item.riskLevel === 'High';
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                    isHigh
                      ? 'bg-red-500/5 border-red-500/20'
                      : item.riskLevel === 'Medium'
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-white/5 border-white/5'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isHigh
                          ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                          : item.riskLevel === 'Medium'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isHigh ? (
                        <AlertOctagon className="w-5 h-5" />
                      ) : item.riskLevel === 'Medium' ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : (
                        <ShieldCheck className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            isHigh
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          Risk: {item.riskScore}/100
                        </span>
                        {item.status && (
                          <span className="text-[10px] text-slate-400 capitalize">
                            • Status: {item.status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate font-mono">{item.subtitle}</p>
                      <p className="text-xs text-slate-300 leading-relaxed pt-1">
                        {item.explanation}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 sm:self-center">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(item.date).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(item.date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* UPI FRAUD PLAYBOOK & ENCYCLOPEDIA */}
      <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#00d2ff]" />
          <h2 className="text-lg font-bold text-white">UPI Defense Playbook: Anatomy of Scams</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">
              1. The QR Code Receive Fallacy
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Myth:</strong> "Scan this QR code to receive money."<br />
              <strong>Truth:</strong> QR codes and UPI PIN entries are ONLY used to DEBIT funds. Entering your PIN transfers money out, never in.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              2. Spoofed Customer Care
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Fraudsters buy Google Search Ads with fake helpline numbers for GPay/Zomato. They ask victims to install screen-sharing apps (AnyDesk) to steal OTPs.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <h4 className="text-xs font-bold text-[#00d2ff] uppercase tracking-wider">
              3. Utility Disconnection Threats
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              DISCOM electricity boards NEVER use personal 10-digit mobile numbers or WhatsApp. Official bill payments always process through BBPS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
