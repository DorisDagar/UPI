import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Share2,
  Users,
  Smartphone,
  Link as LinkIcon,
  QrCode,
  DollarSign,
  Info,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Shield,
  FileText,
  HelpCircle,
  Eye,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { DataStore } from '../lib/supabase';
import { ScamTimelineEvent, Transaction } from '../types';

interface ScamTimelineProps {
  transaction?: Transaction | null;
  events?: ScamTimelineEvent[];
  onConsultTrustedPerson?: () => void;
  onLaunchRecovery?: () => void;
  showActions?: boolean;
}

export const ScamTimeline: React.FC<ScamTimelineProps> = ({
  transaction,
  events: propEvents,
  onConsultTrustedPerson,
  onLaunchRecovery,
  showActions = true,
}) => {
  const [events, setEvents] = useState<ScamTimelineEvent[]>(() => {
    if (propEvents && propEvents.length > 0) return propEvents;
    if (transaction) return DataStore.generateTimelineFromTransaction(transaction);
    return DataStore.getTimelineEvents();
  });

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activePlaybackIndex, setActivePlaybackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [filterActor, setFilterActor] = useState<string>('all');
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);

  // New event form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newActor, setNewActor] = useState<ScamTimelineEvent['actor']>('victim');
  const [newType, setNewType] = useState<ScamTimelineEvent['step_type']>('custom');

  // Update when transaction or propEvents change
  useEffect(() => {
    if (propEvents && propEvents.length > 0) {
      setEvents(propEvents);
    } else if (transaction) {
      const gen = DataStore.generateTimelineFromTransaction(transaction);
      setEvents(gen);
    } else {
      setEvents(DataStore.getTimelineEvents());
    }
  }, [transaction, propEvents]);

  // Subscribe to real-time timeline changes
  useEffect(() => {
    const unsub = DataStore.subscribeToRealtime(() => {
      if (!propEvents && !transaction) {
        setEvents(DataStore.getTimelineEvents());
      }
    });
    return () => unsub();
  }, [propEvents, transaction]);

  // Step-by-step playback timer
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setActivePlaybackIndex((prev) => {
          if (prev === null || prev >= events.length - 1) {
            setIsPlaying(false);
            return events.length - 1;
          }
          return prev + 1;
        });
      }, 2500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, events.length]);

  const handleStartPlayback = () => {
    setActivePlaybackIndex(0);
    setIsPlaying(true);
  };

  const handleStopPlayback = () => {
    setIsPlaying(false);
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    setActivePlaybackIndex(null);
  };

  const getActorBadge = (actor?: ScamTimelineEvent['actor']) => {
    switch (actor) {
      case 'scammer':
        return {
          label: 'Scammer Action',
          className: 'bg-red-500/15 text-red-400 border-red-500/30',
          dot: 'bg-red-500',
          icon: AlertOctagon,
        };
      case 'victim':
        return {
          label: 'User / Victim Response',
          className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
          icon: Smartphone,
        };
      case 'system':
        return {
          label: 'UPI Guardian AI Shield',
          className: 'bg-[#6735e8]/20 text-[#00d2ff] border-[#6735e8]/40',
          dot: 'bg-[#00d2ff]',
          icon: Shield,
        };
      case 'trusted_person':
        return {
          label: 'Trusted Contact Advice',
          className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
          icon: Users,
        };
      case 'bank_police':
        return {
          label: 'Bank / 1930 Cyber Cell',
          className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          dot: 'bg-blue-500',
          icon: FileText,
        };
      default:
        return {
          label: 'System Log',
          className: 'bg-white/10 text-slate-300 border-white/10',
          dot: 'bg-slate-400',
          icon: Clock,
        };
    }
  };

  const getStepIcon = (type: ScamTimelineEvent['step_type']) => {
    switch (type) {
      case 'sms_received':
        return '📩';
      case 'unknown_link':
      case 'link_clicked':
        return '🔗';
      case 'new_receiver':
        return '👤';
      case 'urgent_request':
        return '⚡️';
      case 'fraud_detected':
        return '🚨';
      case 'trusted_advised':
        return '👥';
      case 'blocked_safe':
        return '🛡️';
      case 'payment_made':
        return '💸';
      case 'recovery_started':
        return '🛟';
      case 'cybercell_reported':
        return '⚖️';
      default:
        return '📌';
    }
  };

  // Psychological insight for each stage
  const getStageInsight = (type: ScamTimelineEvent['step_type']) => {
    switch (type) {
      case 'sms_received':
        return {
          technique: 'Phishing Bait & Lure Pretext',
          explanation:
            'Scammers initiate contact with alarming news (electricity disconnection, lottery reward, blocked account) to disrupt rational decision-making.',
        };
      case 'unknown_link':
      case 'link_clicked':
        return {
          technique: 'Redirection to Fake Portal / Spoofed Line',
          explanation:
            'Bypasses verified brand channels by redirecting the victim to personal contact numbers or credential-harvesting web forms.',
        };
      case 'new_receiver':
        return {
          technique: 'Mule Account / Spoofed VPA Handle',
          explanation:
            'Scammer utilizes unverified personal VPA handles (@ybl, @axl, @paytm) rather than legitimate corporate merchant acquiring gateways.',
        };
      case 'urgent_request':
        return {
          technique: 'Artificial Time Pressure & Collect Traps',
          explanation:
            'Scammer insists on immediate PIN authorization, disguising outgoing collect debits as "refund deposits".',
        };
      case 'fraud_detected':
        return {
          technique: 'Algorithmic Behavioral Shield Interception',
          explanation:
            'UPI Guardian analyzes velocity, payee reputation, psychological pressure keywords, and collect payloads to halt unauthorized loss.',
        };
      case 'trusted_advised':
        return {
          technique: 'Social Co-Verification Defense',
          explanation:
            'Second pair of eyes breaks the scammer’s psychological isolation and emotional pressure loop.',
        };
      case 'blocked_safe':
        return {
          technique: 'Proactive Loss Prevention',
          explanation:
            'Zero capital lost. Incident patterns recorded to protect the broader Indian UPI ecosystem.',
        };
      default:
        return null;
    }
  };

  // Add custom event handler
  const handleAddCustomEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const added = DataStore.addTimelineEvent({
      user_id: DataStore.getProfile().id,
      transaction_id: transaction?.id || 'tx-custom',
      step_type: newType,
      title: newTitle.trim(),
      description: newDesc.trim() || 'Custom timeline observation recorded by user.',
      timestamp: new Date().toISOString(),
      status: 'completed',
      actor: newActor,
    });
    setEvents(DataStore.getTimelineEvents(transaction?.id));
    setShowAddEventModal(false);
    setNewTitle('');
    setNewDesc('');
  };

  // Export Chronological Narrative
  const handleCopyTimelineSummary = () => {
    const lines = [
      `=== UPI GUARDIAN: SCAM TIMELINE RECONSTRUCTION ===`,
      `Target Transaction: ${transaction?.receiver_name || 'Flagged Payee'} (${transaction?.receiver_upi || 'VPA'})`,
      `Amount: ₹${transaction?.amount?.toLocaleString('en-IN') || '0'} | Risk Score: ${transaction?.risk_score || 95}/100`,
      `Generated: ${new Date().toLocaleString()}`,
      ``,
      ...events.map((ev, idx) => {
        return `[Stage ${idx + 1}] ${ev.title} (${new Date(ev.timestamp).toLocaleTimeString()})\nActor: ${ev.actor?.toUpperCase()} | Status: ${ev.status}\nDescription: ${ev.description}\n`;
      }),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('UPI Guardian - Chronological Scam Timeline Report', 14, 20);

      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      if (transaction) {
        doc.text(
          `Target Payee: ${transaction.receiver_name} (${transaction.receiver_upi}) | Amount: Rs. ${transaction.amount}`,
          14,
          35
        );
      }

      let y = 48;
      events.forEach((ev, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(11);
        doc.text(`${idx + 1}. ${ev.title}`, 14, y);
        doc.setFontSize(9);
        doc.text(`Actor: ${ev.actor || 'system'} | Time: ${new Date(ev.timestamp).toLocaleTimeString()}`, 14, y + 5);
        const splitText = doc.splitTextToSize(ev.description, 180);
        doc.text(splitText, 14, y + 10);
        y += 18 + splitText.length * 4;
      });

      doc.save(`Scam_Timeline_${transaction?.id || 'Report'}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
    }
  };

  const filteredEvents =
    filterActor === 'all'
      ? events
      : events.filter((e) => e.actor === filterActor);

  return (
    <div className="space-y-6">
      {/* 1. Header & Interactive Playback Controller */}
      <div className="p-6 rounded-3xl bg-[#16161c] border border-white/5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#6735e8] to-[#00d2ff] p-0.5 shadow-lg">
              <div className="w-full h-full bg-[#111115] rounded-[14px] flex items-center justify-center text-[#00d2ff]">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Chronological Scam Sequence Timeline
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#6735e8]/20 text-[#00d2ff] border border-[#6735e8]/30">
                  {events.length} Stages Mapped
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Visualizing how scam messages, fake links, new payees, and urgent demands unfold step-by-step.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyTimelineSummary}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 border border-white/5"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Report</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 border border-white/5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={() => setShowAddEventModal(true)}
              className="px-3 py-2 rounded-xl bg-[#6735e8]/30 hover:bg-[#6735e8]/50 text-[#00d2ff] text-xs font-bold flex items-center gap-1 border border-[#6735e8]/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {/* 2. Interactive Walkthrough Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00d2ff]" />
              <span>Walkthrough Player:</span>
            </span>

            {isPlaying ? (
              <button
                onClick={handleStopPlayback}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1 border border-amber-500/30"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Auto-Play</span>
              </button>
            ) : (
              <button
                onClick={handleStartPlayback}
                className="px-3.5 py-1.5 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold flex items-center gap-1 shadow-lg shadow-[#6735e8]/30"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Auto-Play Sequence</span>
              </button>
            )}

            {activePlaybackIndex !== null && (
              <button
                onClick={handleResetPlayback}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                title="Reset walkthrough"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Actor Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Filter:</span>
            {['all', 'scammer', 'victim', 'system', 'trusted_person'].map((act) => (
              <button
                key={act}
                onClick={() => setFilterActor(act)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all ${
                  filterActor === act
                    ? 'bg-[#6735e8] text-white'
                    : 'bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {act === 'all'
                  ? 'All Actors'
                  : act === 'trusted_person'
                  ? 'Trusted Contact'
                  : act}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. The Vertical Timeline Node Graph */}
      <div className="relative pl-6 sm:pl-10 space-y-6 before:absolute before:top-4 before:bottom-4 before:left-[19px] sm:before:left-[35px] before:w-0.5 before:bg-gradient-to-b before:from-red-500 before:via-[#6735e8] before:to-emerald-500">
        {filteredEvents.map((ev, index) => {
          const actorMeta = getActorBadge(ev.actor);
          const ActorIcon = actorMeta.icon;
          const stageInsight = getStageInsight(ev.step_type);
          const isHighlighted = activePlaybackIndex === index;
          const isExpanded = selectedEventId === ev.id || isHighlighted;

          return (
            <div
              key={ev.id}
              id={`timeline-node-${ev.id}`}
              onClick={() => setSelectedEventId(isExpanded ? null : ev.id)}
              className={`relative rounded-3xl border transition-all cursor-pointer p-5 sm:p-6 ${
                isHighlighted
                  ? 'border-[#00d2ff] bg-gradient-to-r from-[#1b162b] to-[#16161c] shadow-[0_0_30px_rgba(0,210,255,0.2)] scale-[1.01]'
                  : isExpanded
                  ? 'border-white/20 bg-[#1a1a22]'
                  : 'border-white/5 bg-[#16161c] hover:border-white/10 hover:bg-white/[0.04]'
              }`}
            >
              {/* Timeline Connector Dot on the Left Rail */}
              <div
                className={`absolute -left-[31px] sm:-left-[47px] top-6 w-6 h-6 rounded-full border-2 border-[#121216] flex items-center justify-center text-[10px] font-bold text-white shadow-lg transition-all ${
                  isHighlighted
                    ? 'bg-[#00d2ff] ring-4 ring-[#00d2ff]/30 scale-125'
                    : actorMeta.dot
                }`}
              >
                {index + 1}
              </div>

              {/* Node Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">{getStepIcon(ev.step_type)}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-white tracking-tight">{ev.title}</h4>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${actorMeta.className}`}
                      >
                        <ActorIcon className="w-3 h-3" />
                        <span>{actorMeta.label}</span>
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(ev.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      ev.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {ev.status}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${
                      isExpanded ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Event Description */}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-3">
                {ev.description}
              </p>

              {/* Stage Insight Breakdown (Expanded) */}
              {stageInsight && (
                <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#00d2ff]">
                    <Sparkles className="w-3.5 h-3.5 text-[#00d2ff]" />
                    <span>Scam Mechanism Analysis: {stageInsight.technique}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {stageInsight.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Bottom Action Callouts */}
      {showActions && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#1a142e] via-[#16161c] to-[#121216] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Next Protective Actions for This Sequence</span>
            </h4>
            <p className="text-xs text-slate-400">
              Engage trusted family advisory or file official dispute with bank & Cyber Cell 1930.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onConsultTrustedPerson && (
              <button
                onClick={onConsultTrustedPerson}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-[#6735e8]/30"
              >
                <Users className="w-3.5 h-3.5 text-[#00d2ff]" />
                <span>Consult Trusted Person</span>
              </button>
            )}

            {onLaunchRecovery && (
              <button
                onClick={onLaunchRecovery}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center justify-center gap-1.5"
              >
                <span>Recovery Mode (1930)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add Custom Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#16161c] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00d2ff]" />
              <span>Add Custom Timeline Event</span>
            </h4>

            <form onSubmit={handleAddCustomEvent} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Scammer called back demanding AnyDesk APK"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00d2ff]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400">Actor</label>
                  <select
                    value={newActor}
                    onChange={(e: any) => setNewActor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00d2ff]"
                  >
                    <option value="scammer">Scammer</option>
                    <option value="victim">Victim / User</option>
                    <option value="trusted_person">Trusted Person</option>
                    <option value="system">UPI Guardian</option>
                    <option value="bank_police">Bank / Police</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400">Event Type</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00d2ff]"
                  >
                    <option value="sms_received">SMS / Message</option>
                    <option value="unknown_link">Fake Link / Call</option>
                    <option value="new_receiver">New Payee VPA</option>
                    <option value="urgent_request">Urgent Request</option>
                    <option value="fraud_detected">Fraud Alert</option>
                    <option value="trusted_advised">Trusted Advice</option>
                    <option value="custom">Custom Observation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400">Description</label>
                <textarea
                  rows={3}
                  placeholder="Details of what occurred at this step..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00d2ff]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold"
                >
                  Add to Timeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
