import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  X,
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
} from 'lucide-react';
import { DataStore } from '../lib/supabase';
import { TrustedContact, TrustedPersonReview } from '../types';

export interface TransactionReviewTarget {
  receiverName: string;
  receiverUpi: string;
  amount: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  scamPattern?: string;
  aiExplanation?: string;
  triggers?: string[];
  isCollect?: boolean;
  note?: string;
  txId?: string;
}

interface TrustedPersonConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionReviewTarget;
  onBlockScam: () => void;
  onHoldPayment?: () => void;
  onProceedAuthorized?: () => void;
  onOpenScamTimeline?: () => void;
}

export const TrustedPersonConfirmationModal: React.FC<TrustedPersonConfirmationModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onBlockScam,
  onHoldPayment,
  onProceedAuthorized,
  onOpenScamTimeline,
}) => {
  const [contacts, setContacts] = useState<TrustedContact[]>(DataStore.getContacts());
  const [selectedContactId, setSelectedContactId] = useState<string>(() => {
    const list = DataStore.getContacts();
    return list.length > 0 ? list[0].id : '';
  });

  // Add contact inline mode
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelation, setNewRelation] = useState('Family Member');

  // Consultation state: 'select' | 'sent' | 'responded'
  const [consultState, setConsultState] = useState<'select' | 'sent' | 'responded'>('select');
  const [simulatedResponse, setSimulatedResponse] = useState<TrustedPersonReview | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  // Selected contact object
  const selectedContact = contacts.find((c) => c.id === selectedContactId) || contacts[0] || null;

  useEffect(() => {
    if (isOpen) {
      setContacts(DataStore.getContacts());
      setConsultState('select');
      setSimulatedResponse(null);
      setIsSimulating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle adding new contact quickly
  const handleAddNewContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    const created = DataStore.addContact({
      user_id: DataStore.getProfile().id,
      name: `${newName.trim()} (${newRelation})`,
      contact_info: newPhone.trim(),
      verified: true,
      notes: 'Added for transaction co-verification',
    });
    setContacts(DataStore.getContacts());
    setSelectedContactId(created.id);
    setIsAddingContact(false);
    setNewName('');
    setNewPhone('');
  };

  // Generate shareable briefing text
  const shareText = `⚠️ *URGENT UPI VERIFICATION REQUEST*\n\nHey, I need your quick advice on an urgent payment flagged by UPI Guardian:\n\n👤 *Recipient:* ${transaction.receiverName}\n🏦 *UPI ID:* ${transaction.receiverUpi}\n💰 *Amount:* ₹${transaction.amount.toLocaleString('en-IN')}\n🚨 *Risk Level:* ${transaction.riskLevel} (${transaction.riskScore}/100)\n🔍 *Suspected Scam:* ${transaction.scamPattern || 'High Risk Suspicious Payee'}\n${transaction.isCollect ? '⚠️ *Warning:* Disguised Collect Request Trap (Will debit my account!)\n' : ''}\n*AI Guardian Note:* ${transaction.aiExplanation || 'Suspicious signals detected'}\n\nPlease review and let me know if you advise me to CANCEL or PROCEED.`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const phoneClean = selectedContact?.contact_info?.replace(/[^0-9]/g, '') || '';
    const url = `https://wa.me/${phoneClean}?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    triggerSentState();
  };

  const triggerSentState = () => {
    setConsultState('sent');
    // Save review record
    const review = DataStore.addTrustedPersonReview({
      transaction_id: transaction.txId,
      trusted_contact_id: selectedContact?.id || 'tc-1',
      trusted_contact_name: selectedContact?.name || 'Trusted Contact',
      trusted_contact_phone: selectedContact?.contact_info,
      status: 'pending',
      suggested_action: 'hold',
    });

    // Automatically trigger simulated response after short delay for rich interactive demo
    setIsSimulating(true);
    setTimeout(() => {
      let advice = '';
      let suggestedAction: 'block' | 'hold' | 'proceed' = 'block';

      if (transaction.isCollect) {
        advice = `🚨 DO NOT PAY! This is a classic QR Collect Scam. Remember the golden rule: You NEVER need to enter your UPI PIN or approve a request to receive money. Cancel this right away!`;
        suggestedAction = 'block';
      } else if (transaction.scamPattern?.toLowerCase().includes('electricity')) {
        advice = `🛑 STOP! Electricity departments NEVER demand instant UPI payments to personal @ybl or @paytm handles. They always send official bills through the state discom portal. Block this scammer immediately!`;
        suggestedAction = 'block';
      } else if (transaction.scamPattern?.toLowerCase().includes('lottery') || transaction.scamPattern?.toLowerCase().includes('prize')) {
        advice = `⛔️ 100% FRAUD. Genuine prizes never demand advance processing tax over UPI. Do not send even 1 Rupee!`;
        suggestedAction = 'block';
      } else if (transaction.riskLevel === 'High') {
        advice = `⚠️ I checked the details and agree with UPI Guardian. This VPA handle (${transaction.receiverUpi}) looks highly suspicious and the amount is high. I strongly advise you to CANCEL.`;
        suggestedAction = 'block';
      } else {
        advice = `I reviewed the transfer to ${transaction.receiverName}. If you personally know this person or ordered from them, double check the invoice amount before authorizing.`;
        suggestedAction = 'hold';
      }

      const updated = DataStore.updateTrustedPersonReview(review.id, {
        status: suggestedAction === 'block' ? 'warned_scam' : 'reviewed',
        advice_note: advice,
        suggested_action: suggestedAction,
        responded_at: new Date().toISOString(),
      });

      setSimulatedResponse(updated);
      setIsSimulating(false);
      setConsultState('responded');
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-[#121216] border border-white/10 rounded-3xl max-w-2xl w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden my-6">
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-[#1c182a] via-[#16161c] to-[#121216] border-b border-white/10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#6735e8]/20 border border-[#6735e8]/40 text-[#00d2ff] flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Trusted Person Confirmation
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#6735e8]/30 text-[#00d2ff] border border-[#6735e8]/40">
                  Second Pair of Eyes
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Have a family member or friend inspect this transaction and advise before money leaves your account.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          {/* 1. Transaction Risk Dossier */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Flagged Transaction
                </span>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{transaction.receiverName}</span>
                  <span className="text-xs font-mono text-slate-400 font-normal">
                    ({transaction.receiverUpi})
                  </span>
                </h4>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Amount
                </span>
                <p className="text-xl font-black text-white font-mono">
                  ₹{transaction.amount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Risk Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  transaction.riskLevel === 'High'
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : transaction.riskLevel === 'Medium'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>
                  {transaction.riskLevel} Risk ({transaction.riskScore}/100)
                </span>
              </span>

              {transaction.isCollect && (
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                  ⚠️ COLLECT REQUEST TRAP
                </span>
              )}

              {transaction.scamPattern && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/5">
                  Pattern: {transaction.scamPattern}
                </span>
              )}
            </div>

            {/* AI Explanation for Advisor */}
            <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
              <strong className="text-[#00d2ff]">AI Risk Finding: </strong>
              {transaction.aiExplanation || 'High risk triggers detected in recipient handle reputation and transaction pretext.'}
            </p>

            {onOpenScamTimeline && (
              <button
                onClick={onOpenScamTimeline}
                className="text-xs text-[#00d2ff] hover:underline font-semibold flex items-center gap-1.5 pt-1"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>View Full Scam Sequence Timeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Contact Selection / Consultation View */}
          {consultState === 'select' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#00d2ff]" />
                  <span>Choose Trusted Family / Friend to Consult</span>
                </label>
                <button
                  onClick={() => setIsAddingContact(!isAddingContact)}
                  className="text-xs text-[#00d2ff] hover:underline font-semibold flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isAddingContact ? 'Cancel' : '+ Add Contact'}</span>
                </button>
              </div>

              {/* Add contact inline form */}
              {isAddingContact && (
                <form
                  onSubmit={handleAddNewContact}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-in fade-in"
                >
                  <h5 className="text-xs font-bold text-white">Add Trusted Contact</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Name (e.g. Papa)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00d2ff]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Mobile (+91 98765 43210)"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00d2ff]"
                      required
                    />
                    <select
                      value={newRelation}
                      onChange={(e) => setNewRelation(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00d2ff]"
                    >
                      <option value="Sister">Sister</option>
                      <option value="Brother">Brother</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Friend">Friend</option>
                      <option value="Financial Advisor">Advisor</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold"
                  >
                    Save & Select
                  </button>
                </form>
              )}

              {/* Contacts Radio List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                      selectedContactId === contact.id
                        ? 'bg-[#6735e8]/15 border-[#6735e8] shadow-lg shadow-[#6735e8]/10'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white truncate">{contact.name}</span>
                        {contact.verified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">{contact.contact_info}</p>
                      {contact.notes && (
                        <p className="text-[10px] text-slate-500 truncate">{contact.notes}</p>
                      )}
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        selectedContactId === contact.id
                          ? 'border-[#00d2ff] bg-[#00d2ff]'
                          : 'border-slate-600'
                      }`}
                    >
                      {selectedContactId === contact.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-black" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Share & Request Advice Actions */}
              <div className="pt-3 border-t border-white/5 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.01]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Send Dossier via WhatsApp</span>
                  </button>

                  <button
                    onClick={triggerSentState}
                    className="flex-1 py-3.5 px-4 rounded-2xl bg-[#6735e8] hover:bg-[#7846f9] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#6735e8]/30 transition-all hover:scale-[1.01]"
                  >
                    <Send className="w-4 h-4 text-[#00d2ff]" />
                    <span>Request In-App Verification</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <button
                    onClick={handleCopyText}
                    className="hover:text-white flex items-center gap-1.5"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied Summary to Clipboard</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Warning Summary to Clipboard</span>
                      </>
                    )}
                  </button>

                  <span>Recipient: {selectedContact?.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Waiting / Simulating State */}
          {consultState === 'sent' && (
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-5">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full bg-[#00d2ff]/20 animate-ping" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-[#6735e8] to-[#00d2ff] flex items-center justify-center text-white shadow-xl">
                  <Clock className="w-7 h-7 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-white">
                  Awaiting Advice from {selectedContact?.name}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Transaction risk breakdown and collect request alerts were dispatched to{' '}
                  <strong className="text-slate-200">{selectedContact?.contact_info}</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 inline-flex items-center gap-2 text-xs text-[#00d2ff] font-mono">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Simulating real-time trusted family review response...</span>
              </div>
            </div>
          )}

          {/* 4. Responded State: Trusted Person's Advice & Final Decision Gate */}
          {consultState === 'responded' && simulatedResponse && (
            <div className="space-y-5 animate-in fade-in">
              {/* Advisor Verdict Banner */}
              <div
                className={`p-6 rounded-3xl border-2 shadow-2xl space-y-4 ${
                  simulatedResponse.suggested_action === 'block'
                    ? 'bg-gradient-to-br from-red-950/70 via-[#1a1417] to-[#121216] border-red-500/80 shadow-red-950/50'
                    : 'bg-gradient-to-br from-amber-950/60 via-[#1a1814] to-[#121216] border-amber-500/80 shadow-amber-950/50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg ${
                      simulatedResponse.suggested_action === 'block'
                        ? 'bg-red-500 shadow-red-500/40'
                        : 'bg-amber-500 shadow-amber-500/40'
                    }`}
                  >
                    {simulatedResponse.suggested_action === 'block' ? (
                      <ThumbsDown className="w-6 h-6" />
                    ) : (
                      <AlertTriangle className="w-6 h-6" />
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/40 text-white border border-white/10">
                        Advisor Recommendation Received
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Just now
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-white">
                      {simulatedResponse.suggested_action === 'block' ? (
                        <span className="text-red-400">
                          {selectedContact?.name}: "DO NOT PAY — THIS IS A SCAM!"
                        </span>
                      ) : (
                        <span className="text-amber-400">
                          {selectedContact?.name}: "HOLD & VERIFY OFFLINE FIRST"
                        </span>
                      )}
                    </h4>
                  </div>
                </div>

                {/* Exact advice message from trusted contact */}
                <div className="p-4 rounded-2xl bg-black/60 border border-white/10 text-sm text-slate-200 leading-relaxed font-medium space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <MessageSquare className="w-3.5 h-3.5 text-[#00d2ff]" />
                    <span>Message from {selectedContact?.name}:</span>
                  </div>
                  <p className="italic font-sans">
                    "{simulatedResponse.advice_note}"
                  </p>
                </div>
              </div>

              {/* Action Buttons Based on Advisor Recommendation */}
              <div className="space-y-3 pt-2">
                <button
                  id="trusted-follow-advice-block-btn"
                  onClick={() => {
                    onBlockScam();
                    onClose();
                  }}
                  className="w-full py-4 px-6 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>
                    Follow {selectedContact?.name.split(' ')[0]}'s Advice: Cancel & Block Scam (Save ₹{transaction.amount})
                  </span>
                </button>

                <div className="flex flex-col sm:flex-row gap-3">
                  {onHoldPayment && (
                    <button
                      onClick={() => {
                        onHoldPayment();
                        onClose();
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold uppercase tracking-wider border border-white/10"
                    >
                      Hold Payment for 24h Investigation
                    </button>
                  )}

                  {onProceedAuthorized && (
                    <button
                      onClick={() => {
                        onProceedAuthorized();
                        onClose();
                      }}
                      className="py-3 px-4 rounded-xl bg-transparent hover:bg-red-500/10 text-slate-500 hover:text-red-400 text-xs font-medium border border-transparent hover:border-red-500/20"
                    >
                      Ignore Advice & Proceed (High Risk)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
