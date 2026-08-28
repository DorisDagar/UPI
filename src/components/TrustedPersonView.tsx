import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  PhoneCall,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  UserPlus,
  Send,
  Clock,
  ThumbsDown,
  ThumbsUp,
  AlertTriangle,
  FileText,
  Lock,
  ExternalLink,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { DataStore } from '../lib/supabase';
import { TrustedContact, Transaction, TrustedPersonReview } from '../types';
import { TrustedPersonConfirmationModal } from './TrustedPersonConfirmationModal';

interface TrustedPersonViewProps {
  transactions: Transaction[];
  onNavigate: (tab: string) => void;
}

export const TrustedPersonView: React.FC<TrustedPersonViewProps> = ({
  transactions,
  onNavigate,
}) => {
  const [contacts, setContacts] = useState<TrustedContact[]>(DataStore.getContacts());
  const [reviews, setReviews] = useState<TrustedPersonReview[]>(DataStore.getTrustedPersonReviews());
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedReviewId, setCopiedReviewId] = useState<string | null>(null);

  // New Contact Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family Member');

  useEffect(() => {
    const unsub = DataStore.subscribeToRealtime(() => {
      setContacts(DataStore.getContacts());
      setReviews(DataStore.getTrustedPersonReviews());
    });
    return () => unsub();
  }, []);

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    DataStore.addContact({
      user_id: DataStore.getProfile().id,
      name: `${name.trim()} (${relationship})`,
      contact_info: phone.trim(),
      verified: true,
      notes: relationship,
    });

    setName('');
    setPhone('');
    setShowAddForm(false);
    setContacts(DataStore.getContacts());
  };

  const handleDeleteContact = (id: string) => {
    DataStore.deleteContact(id);
    setContacts(DataStore.getContacts());
  };

  const handleLaunchReview = (tx: Transaction) => {
    setSelectedTx(tx);
    setIsModalOpen(true);
  };

  // Target transaction for quick launch
  const defaultTx = transactions.find((t) => t.risk_level === 'High') || transactions[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1c162e] via-[#16161c] to-[#121216] border border-[#6735e8]/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#6735e8]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d2ff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00d2ff]"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-[#00d2ff]">
                UPI Guardian Pre-Payment Protocol
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Trust Person Confirmation
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Require dual authorization for suspicious or high-risk payments. Connect family members or trusted advisors to review VPAs and detect collect traps before funds leave your bank.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="view-launch-sample-review-btn"
              onClick={() => handleLaunchReview(defaultTx)}
              className="px-5 py-3 rounded-2xl bg-[#6735e8] hover:bg-[#7846f9] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(103,53,232,0.4)] transition-all hover:scale-[1.02]"
            >
              <Users className="w-4 h-4 text-[#00d2ff]" />
              <span>Simulate Review Request</span>
            </button>

            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center gap-2 transition-all"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Add Guardian</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Pillars Overview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-[#16161c] border border-white/5 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#6735e8]/20 text-[#00d2ff] flex items-center justify-center font-bold">
            1
          </div>
          <h4 className="text-sm font-bold text-white">Instant Verification Link</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Generate encrypted WhatsApp & SMS review links containing AI risk scores and decoded VPA metadata.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#16161c] border border-white/5 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            2
          </div>
          <h4 className="text-sm font-bold text-white">Elder & Coercion Defense</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Protects seniors from aggressive phone scammers and deceptive remote desk screen sharing software.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#16161c] border border-white/5 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            3
          </div>
          <h4 className="text-sm font-bold text-white">Real-Time Sync</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Approve or block advice updates instantly in the active checkout screen with zero delay.
          </p>
        </div>
      </div>

      {/* Add Contact Inline Form Modal / Card */}
      {showAddForm && (
        <form
          onSubmit={handleAddContact}
          className="p-6 rounded-3xl bg-[#1a1628] border border-[#6735e8]/40 shadow-xl space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#00d2ff]" />
              <span>Add New Trusted Guardian Contact</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6735e8]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6735e8]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Relationship
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#16161c] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6735e8]"
              >
                <option value="Parent / Guardian">Parent / Guardian</option>
                <option value="Spouse / Partner">Spouse / Partner</option>
                <option value="Sibling / Family">Sibling / Family</option>
                <option value="Tech Advisor / Friend">Tech Advisor / Friend</option>
                <option value="Financial Advisor">Financial Advisor</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold shadow-lg"
            >
              Save Guardian Contact
            </button>
          </div>
        </form>
      )}

      {/* Main Grid: Active Guardians & Recent Consultation Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Guardians List (1 col) */}
        <div className="space-y-6">
          <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00d2ff]" />
                  <span>Configured Guardians</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {contacts.length} trusted contact{contacts.length !== 1 ? 's' : ''} enrolled
                </p>
              </div>

              <button
                onClick={() => setShowAddForm(true)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#00d2ff]"
                title="Add Contact"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/5 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#6735e8]/20 border border-[#6735e8]/30 text-[#00d2ff] flex items-center justify-center font-bold text-sm">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">{c.contact_info}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                    <button
                      onClick={() => handleDeleteContact(c.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Suspicious Transactions Available For Review (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Flagged UPI Requests Awaiting Review</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Transactions with elevated risk scores recommend trusted person confirmation.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {transactions.filter((t) => t.risk_level === 'High' || t.risk_level === 'Medium').length} Flagged
              </span>
            </div>

            <div className="space-y-3">
              {transactions
                .filter((t) => t.risk_level === 'High' || t.risk_level === 'Medium')
                .map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-[#6735e8]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            tx.risk_level === 'High'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {tx.risk_level} Risk ({tx.risk_score}/100)
                        </span>

                        {tx.is_collect_request && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
                            Collect Trap
                          </span>
                        )}

                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white truncate">
                        {tx.receiver_name}{' '}
                        <span className="text-xs text-slate-400 font-mono font-normal">
                          ({tx.receiver_upi})
                        </span>
                      </h4>

                      <p className="text-xs text-slate-300 line-clamp-1">
                        {tx.ai_explanation || tx.note || 'Suspicious request detected'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 sm:self-center">
                      <div className="text-right">
                        <p className="text-base font-black text-white">
                          ₹{tx.amount.toLocaleString('en-IN')}
                        </p>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">Debit</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLaunchReview(tx)}
                        className="px-4 py-2.5 rounded-xl bg-[#6735e8]/20 hover:bg-[#6735e8] text-[#00d2ff] hover:text-white border border-[#6735e8]/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Consult</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Past Consultation Log */}
          {reviews.length > 0 && (
            <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00d2ff]" />
                <span>Guardian Consultation History</span>
              </h3>

              <div className="space-y-3">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                            r.status === 'blocked'
                              ? 'bg-red-500 text-white'
                              : r.status === 'approved'
                              ? 'bg-emerald-500 text-black'
                              : 'bg-amber-500 text-black'
                          }`}
                        >
                          {r.status === 'blocked' ? 'Scam Confirmed / Blocked' : r.status.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-white">{r.contact_name}</span>
                      </div>
                      <p className="text-xs text-slate-300 italic">"{r.advice_note}"</p>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Modal */}
      {selectedTx && (
        <TrustedPersonConfirmationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTx(null);
          }}
          transaction={{
            receiverName: selectedTx.receiver_name,
            receiverUpi: selectedTx.receiver_upi,
            amount: selectedTx.amount,
            riskScore: selectedTx.risk_score,
            riskLevel: selectedTx.risk_level,
            scamPattern: selectedTx.category || 'Suspicious Collect Request',
            aiExplanation: selectedTx.ai_explanation,
            triggers: selectedTx.triggers,
            isCollect: selectedTx.is_collect_request,
            note: selectedTx.note,
            txId: selectedTx.id,
          }}
          onBlockScam={() => {
            setIsModalOpen(false);
            onNavigate('dashboard');
          }}
        />
      )}
    </div>
  );
};
