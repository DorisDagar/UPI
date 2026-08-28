import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  History,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  Lock,
  FolderLock,
  Clock,
  ArrowRight,
  ChevronRight,
  Plus,
  Trash2,
  Upload,
  Download,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Share2,
  PhoneCall,
  MessageSquare,
  Send,
  Smartphone,
  Search,
  Sparkles,
  Zap,
  AlertOctagon,
  FileImage,
  Link as LinkIcon,
  QrCode,
  Eye,
  RefreshCw,
  Info,
  BadgeAlert,
  HelpCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { RiskEngine } from '../lib/riskEngine';
import { DataStore } from '../lib/supabase';
import {
  Transaction,
  Profile,
  TrustedContact,
  RecoveryEvidence,
  ScamTimelineEvent,
  RecoverySession,
} from '../types';
import { useTheme } from '../context/ThemeContext';
import { ScamTimeline } from './ScamTimeline';
import { TrustedPersonConfirmationModal } from './TrustedPersonConfirmationModal';

interface RecoveryModeProps {
  profile: Profile;
  initialTransactionId?: string;
}

export const RecoveryMode: React.FC<RecoveryModeProps> = ({
  profile,
  initialTransactionId,
}) => {
  const { isDark } = useTheme();

  // Active module tab: 'history' | 'actions' | 'trusted' | 'evidence' | 'timeline'
  const [activeModule, setActiveModule] = useState<
    'history' | 'actions' | 'trusted' | 'evidence' | 'timeline'
  >('history');

  // Transactions & selected transaction state
  const [transactions, setTransactions] = useState<Transaction[]>(DataStore.getTransactions());
  const [selectedTxId, setSelectedTxId] = useState<string>(() => {
    if (initialTransactionId) return initialTransactionId;
    const session = DataStore.getRecoverySession();
    return session.selected_transaction_id || 'tx-101';
  });

  const selectedTx =
    transactions.find((t) => t.id === selectedTxId) ||
    transactions[0] ||
    null;

  // Search & filter in transaction history
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'high_risk' | 'flagged'>('all');

  // Recovery Session & Checklist state
  const [recoverySession, setRecoverySession] = useState<RecoverySession>(
    DataStore.getRecoverySession()
  );

  // Trusted contacts
  const [contacts, setContacts] = useState<TrustedContact[]>(DataStore.getContacts());
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('Family Member');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [alertSentStatus, setAlertSentStatus] = useState<string | null>(null);

  // Evidence locker state
  const [evidenceList, setEvidenceList] = useState<RecoveryEvidence[]>(
    DataStore.getEvidence()
  );
  const [showAddEvidenceModal, setShowAddEvidenceModal] = useState(false);
  const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
  const [newEvidenceType, setNewEvidenceType] = useState<RecoveryEvidence['type']>('screenshot');
  const [newEvidenceContent, setNewEvidenceContent] = useState('');
  const [newEvidenceTagInput, setNewEvidenceTagInput] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState<string>('all');
  const [previewEvidence, setPreviewEvidence] = useState<RecoveryEvidence | null>(null);

  // Timeline events state
  const [timelineEvents, setTimelineEvents] = useState<ScamTimelineEvent[]>(
    DataStore.getTimelineEvents()
  );
  const [showAddTimelineModal, setShowAddTimelineModal] = useState(false);
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [newTimelineDesc, setNewTimelineDesc] = useState('');
  const [newTimelineType, setNewTimelineType] = useState<ScamTimelineEvent['step_type']>('custom');
  const [newTimelineActor, setNewTimelineActor] = useState<ScamTimelineEvent['actor']>('victim');

  // Dispute Report Generation State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReportText, setGeneratedReportText] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Sync real-time updates
  useEffect(() => {
    const unsub = DataStore.subscribeToRealtime(() => {
      setTransactions(DataStore.getTransactions());
      setRecoverySession(DataStore.getRecoverySession());
      setContacts(DataStore.getContacts());
      setEvidenceList(DataStore.getEvidence());
      setTimelineEvents(DataStore.getTimelineEvents());
    });
    return () => unsub();
  }, []);

  // Update selected transaction when initialTransactionId prop changes
  useEffect(() => {
    if (initialTransactionId) {
      setSelectedTxId(initialTransactionId);
      DataStore.updateRecoverySession({ selected_transaction_id: initialTransactionId });
    }
  }, [initialTransactionId]);

  // Handle selecting a transaction for recovery
  const handleSelectTransaction = (tx: Transaction) => {
    setSelectedTxId(tx.id);
    DataStore.updateRecoverySession({
      selected_transaction_id: tx.id,
      selected_transaction: tx,
    });
    // Auto sync timeline for this transaction
    const newTimeline = DataStore.generateTimelineFromTransaction(tx);
    setTimelineEvents(newTimeline);
    setActiveModule('actions'); // auto advance to Immediate Action
  };

  // Checklist toggles
  const handleToggleChecklist = (key: keyof RecoverySession['checklist']) => {
    const newVal = !recoverySession.checklist[key];
    const updated = DataStore.updateRecoveryChecklist(key, newVal);
    setRecoverySession(updated);
  };

  // Calculate checklist progress percentage
  const checklistItems = [
    { key: 'report_suspicious' as const, label: 'Mark & Report Transaction as Suspicious' },
    { key: 'contact_bank_provider' as const, label: 'Contact Bank / UPI Provider (Call 1930)' },
    { key: 'secure_account_mpin' as const, label: 'Secure Account & Reset UPI MPIN' },
    { key: 'block_scammer_comm' as const, label: 'Block Scammer & Cease Communication' },
    { key: 'file_1930_cybercrime' as const, label: 'Generate & Submit 1930 Incident Complaint' },
  ];

  const completedCount = checklistItems.filter((i) => recoverySession.checklist[i.key]).length;
  const progressPercent = Math.round((completedCount / checklistItems.length) * 100);

  // Handle Flagging Transaction
  const handleMarkAsSuspicious = () => {
    if (selectedTx) {
      DataStore.updateTransactionStatus(selectedTx.id, 'flagged');
      handleToggleChecklist('report_suspicious');
    }
  };

  // Add trusted contact
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    DataStore.addContact({
      user_id: profile.id,
      name: `${newContactName.trim()} (${newContactRelation})`,
      contact_info: newContactPhone.trim(),
      verified: true,
      notes: `Trusted Guardian • ${newContactRelation}`,
    });

    setNewContactName('');
    setNewContactPhone('');
    setShowAddContactModal(false);
  };

  // Delete trusted contact
  const handleDeleteContact = (id: string) => {
    DataStore.deleteContact(id);
  };

  // Dispatch Emergency Alert to Trusted Contacts
  const handleDispatchEmergencyAlert = () => {
    setAlertSentStatus('Broadcasting recovery alert to all trusted guardians...');
    setTimeout(() => {
      setAlertSentStatus('Emergency SOS and live recovery dossier shared with 2 trusted guardians!');
      setTimeout(() => setAlertSentStatus(null), 5000);
    }, 1200);
  };

  // WhatsApp SOS Share text generator
  const generateSosShareText = () => {
    const tx = selectedTx;
    return `🚨 *UPI GUARDIAN EMERGENCY RECOVERY ALERT* 🚨
Victim: ${profile.username || 'Account Holder'}
Defrauded Amount: ₹${tx ? tx.amount.toLocaleString('en-IN') : '0'}
Scammer UPI / Payee: ${tx ? tx.receiver_upi : 'Unknown'}
Platform Ref / Txn ID: ${tx ? tx.id : 'N/A'}
Status: Recovery In Progress (${progressPercent}% actions taken)

Live Incident Dossier: Bank helpline contacted & evidence locked in UPI Guardian Vault.
Please assist and do not send any funds to this recipient!`;
  };

  // Add Evidence item
  const handleAddEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvidenceTitle.trim() || !newEvidenceContent.trim()) return;

    const tags = newEvidenceTagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    DataStore.addEvidence({
      user_id: profile.id,
      transaction_id: selectedTxId,
      title: newEvidenceTitle.trim(),
      type: newEvidenceType,
      content: newEvidenceContent.trim(),
      tags: tags.length ? tags : [newEvidenceType.toUpperCase()],
    });

    setNewEvidenceTitle('');
    setNewEvidenceContent('');
    setNewEvidenceTagInput('');
    setShowAddEvidenceModal(false);
  };

  // Handle image upload in evidence
  const handleFileUploadEvidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      DataStore.addEvidence({
        user_id: profile.id,
        transaction_id: selectedTxId,
        title: `Screenshot: ${file.name}`,
        type: 'screenshot',
        content: dataUri,
        file_name: file.name,
        file_size: `${(file.size / 1024).toFixed(1)} KB`,
        tags: ['Screenshot', 'Visual Evidence'],
      });
    };
    reader.readAsDataURL(file);
  };

  // Add Timeline Event
  const handleAddTimelineEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimelineTitle.trim()) return;

    DataStore.addTimelineEvent({
      user_id: profile.id,
      transaction_id: selectedTxId,
      step_type: newTimelineType,
      title: newTimelineTitle.trim(),
      description: newTimelineDesc.trim(),
      timestamp: new Date().toISOString(),
      status: 'completed',
      actor: newTimelineActor,
    });

    setNewTimelineTitle('');
    setNewTimelineDesc('');
    setShowAddTimelineModal(false);
  };

  // Reset timeline to default auto-generated for current selected tx
  const handleResetTimeline = () => {
    if (selectedTx) {
      const regenerated = DataStore.generateTimelineFromTransaction(selectedTx);
      setTimelineEvents(regenerated);
    }
  };

  // Generate Official Incident Report using RiskEngine
  const handleGenerateDisputeReport = async () => {
    if (!selectedTx) return;
    setIsGeneratingReport(true);

    try {
      const text = await RiskEngine.generateIncidentReport({
        victim_name: profile.username || 'Complainant',
        victim_phone: profile.mobile_number || 'N/A',
        scammer_upi: selectedTx.receiver_upi,
        scammer_phone: 'N/A (Identified from VPA handle)',
        amount_lost: selectedTx.amount,
        incident_date: selectedTx.created_at,
        platform: 'GPay',
        bank_reference_no: selectedTx.id,
        fraud_category: selectedTx.category || 'UPI Collect / Impersonation Scam',
        incident_description: `Victim was misled into authorizing transaction ID ${selectedTx.id} of amount ₹${selectedTx.amount} to suspect VPA ${selectedTx.receiver_upi}. UPI Guardian AI Explanation: ${selectedTx.ai_explanation}`,
      });

      setGeneratedReportText(text);
      handleToggleChecklist('file_1930_cybercrime');
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Download PDF Dossier
  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      const maxLineWidth = pageWidth - margin * 2;

      // Header Banner
      doc.setFillColor(15, 23, 42); // dark navy
      doc.rect(0, 0, pageWidth, 75, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('UPI GUARDIAN POST-FRAUD DISPUTE & RECOVERY DOSSIER', margin, 35);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(56, 189, 248); // sky cyan
      doc.text(`National Cybercrime 1930 & Bank Nodal Filing • Case Ref: UPG-${selectedTxId}`, margin, 55);

      // Section 1: Transaction Summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('1. INCIDENT & TRANSACTION SUMMARY', margin, 105);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`• Complainant Name: ${profile.username} (${profile.mobile_number})`, margin, 125);
      doc.text(`• Suspect / Beneficiary UPI: ${selectedTx ? selectedTx.receiver_upi : 'N/A'}`, margin, 140);
      doc.text(`• Disputed Amount: INR ₹${selectedTx ? selectedTx.amount.toLocaleString('en-IN') : '0'}`, margin, 155);
      doc.text(`• Transaction / UTR ID: ${selectedTx ? selectedTx.id : 'N/A'}`, margin, 170);
      doc.text(`• Incident Timestamp: ${selectedTx ? new Date(selectedTx.created_at).toLocaleString() : 'N/A'}`, margin, 185);

      // Section 2: Timeline Summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('2. RECONSTRUCTED SCAM TIMELINE', margin, 215);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let currentY = 235;
      timelineEvents.slice(0, 6).forEach((evt, idx) => {
        doc.text(`${idx + 1}. [${new Date(evt.timestamp).toLocaleTimeString()}] ${evt.title}: ${evt.description}`, margin, currentY);
        currentY += 16;
      });

      // Section 3: Evidence Manifest
      currentY += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('3. EVIDENCE LOCKER LOGS', margin, currentY);
      currentY += 20;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      evidenceList.slice(0, 5).forEach((ev, idx) => {
        doc.text(`• [${ev.type.toUpperCase()}] ${ev.title}: ${ev.content.slice(0, 90)}...`, margin, currentY);
        currentY += 16;
      });

      // Legal complaint narrative
      if (generatedReportText) {
        currentY += 15;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text('4. FORMAL LEGAL COMPLAINT TEXT', margin, currentY);
        currentY += 20;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        const splitText = doc.splitTextToSize(generatedReportText, maxLineWidth);
        doc.text(splitText, margin, currentY);
      }

      doc.save(`UPI_Guardian_Recovery_Dossier_${selectedTxId}.pdf`);
    } catch (e) {
      console.error('PDF generation error:', e);
    }
  };

  // Filtered transactions list
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.receiver_name.toLowerCase().includes(txSearch.toLowerCase()) ||
      t.receiver_upi.toLowerCase().includes(txSearch.toLowerCase()) ||
      t.id.toLowerCase().includes(txSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (txFilter === 'high_risk') return t.risk_level === 'High';
    if (txFilter === 'flagged') return t.status === 'flagged' || t.status === 'cancelled';
    return true;
  });

  // Filtered evidence list
  const filteredEvidence = evidenceList.filter((e) => {
    if (evidenceFilter === 'all') return true;
    return e.type === evidenceFilter;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in">
      {/* Recovery Top Banner & Golden Hour Urgent Helpline */}
      <div className="rounded-3xl bg-gradient-to-r from-red-950/50 via-[#16161c] to-[#16161c] border border-red-500/30 p-6 sm:p-7 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <LifeBuoy className="w-7 h-7 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                  Active Recovery Mode
                </span>
                <span className="text-xs text-slate-400">
                  Target Case: <strong className="text-white font-mono">{selectedTxId}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Post-Fraud Incident Recovery System
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl">
                5-module workflow to secure accounts, contact bank/1930 nodal officers, notify trusted guardians, lock evidence, and trace chronological scam events.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <a
              href="tel:1930"
              className="flex-1 lg:flex-none px-5 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call 1930 Helpline</span>
            </a>

            <button
              onClick={handleDownloadPdf}
              className="flex-1 lg:flex-none px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4 text-[#00d2ff]" />
              <span>Export Dossier (PDF)</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Current Status */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Recovery Checklist Progress</span>
            </span>
            <span className="font-mono font-bold text-[#00d2ff]">
              {completedCount} / {checklistItems.length} Completed ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                progressPercent === 100
                  ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-gradient-to-r from-red-500 via-amber-500 to-[#00d2ff]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5-Module Navigation Bar */}
      <div className="flex overflow-x-auto pb-2 border-b border-white/5 gap-2 scrollbar-none">
        <button
          onClick={() => setActiveModule('history')}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
            activeModule === 'history'
              ? 'bg-[#6735e8] text-white shadow-[0_0_15px_rgba(103,53,232,0.4)]'
              : 'bg-[#16161c] text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>1. Transaction History</span>
          {selectedTx && (
            <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveModule('actions')}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
            activeModule === 'actions'
              ? 'bg-[#6735e8] text-white shadow-[0_0_15px_rgba(103,53,232,0.4)]'
              : 'bg-[#16161c] text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>2. Immediate Action</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
            {completedCount}/{checklistItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveModule('trusted')}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
            activeModule === 'trusted'
              ? 'bg-[#6735e8] text-white shadow-[0_0_15px_rgba(103,53,232,0.4)]'
              : 'bg-[#16161c] text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. Trusted Person</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
            {contacts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveModule('evidence')}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
            activeModule === 'evidence'
              ? 'bg-[#6735e8] text-white shadow-[0_0_15px_rgba(103,53,232,0.4)]'
              : 'bg-[#16161c] text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <FolderLock className="w-4 h-4" />
          <span>4. Evidence Locker</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
            {evidenceList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveModule('timeline')}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
            activeModule === 'timeline'
              ? 'bg-[#6735e8] text-white shadow-[0_0_15px_rgba(103,53,232,0.4)]'
              : 'bg-[#16161c] text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>5. Scam Timeline</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
            {timelineEvents.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODULE 1: TRANSACTION HISTORY */}
      {/* ========================================================================= */}
      {activeModule === 'history' && (
        <div className="space-y-6">
          <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <History className="w-5 h-5 text-[#00d2ff]" />
                  <span>Select Suspicious Transaction for Recovery</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Choose the fraudulent or disputed UPI transaction to auto-populate dispute reports, evidence, and timeline.
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Search by receiver, UPI, ID..."
                    className="pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00d2ff]"
                  />
                </div>

                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setTxFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      txFilter === 'all' ? 'bg-[#6735e8] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTxFilter('high_risk')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      txFilter === 'high_risk' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    High Risk
                  </button>
                  <button
                    onClick={() => setTxFilter('flagged')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      txFilter === 'flagged' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Flagged
                  </button>
                </div>
              </div>
            </div>

            {/* Transactions Grid / Table */}
            <div className="space-y-3">
              {filteredTransactions.map((tx) => {
                const isSelected = tx.id === selectedTxId;
                return (
                  <div
                    key={tx.id}
                    onClick={() => handleSelectTransaction(tx)}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-[#1f1f27] border-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.2)] ring-1 ring-[#00d2ff]'
                        : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          tx.risk_level === 'High'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : tx.risk_level === 'Medium'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {tx.risk_level === 'High' ? (
                          <AlertOctagon className="w-5 h-5" />
                        ) : tx.risk_level === 'Medium' ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : (
                          <ShieldCheck className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-sm">{tx.receiver_name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/5">
                            {tx.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              tx.risk_level === 'High'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : tx.risk_level === 'Medium'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            Risk: {tx.risk_level} ({tx.risk_score}/100)
                          </span>
                          {tx.status === 'flagged' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white uppercase">
                              Flagged Fraud
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                          <span>VPA: {tx.receiver_upi}</span>
                          <span>•</span>
                          <span>{new Date(tx.created_at).toLocaleString()}</span>
                          {tx.category && (
                            <>
                              <span>•</span>
                              <span className="text-slate-300">{tx.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-base font-extrabold text-white">
                          ₹{tx.amount.toLocaleString('en-IN')}
                        </span>
                        <p className="text-[10px] text-slate-500">
                          {tx.is_collect_request ? 'Collect Request Trap' : 'Direct UPI Transfer'}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTransaction(tx);
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-[#00d2ff] text-black shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                            : 'bg-[#6735e8] hover:bg-[#7846f9] text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Active Case</span>
                          </>
                        ) : (
                          <>
                            <span>Select & Start</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 2: IMMEDIATE ACTION CHECKLIST */}
      {/* ========================================================================= */}
      {activeModule === 'actions' && (
        <div className="space-y-6">
          <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#00d2ff]" />
                  <span>Immediate Action & Security Protocol</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Critical steps required within the 2-hour Golden Hour window to freeze unauthorized funds and safeguard accounts.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Action Completion:</span>
                <span className="text-sm font-extrabold text-[#00d2ff] ml-2">
                  {completedCount} of 5 Completed
                </span>
              </div>
            </div>

            {/* Interactive Checklist Cards */}
            <div className="space-y-4">
              {/* ACTION 1: Report / Mark Suspicious */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  recoverySession.checklist.report_suspicious
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleChecklist('report_suspicious')}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 transition-all ${
                        recoverySession.checklist.report_suspicious
                          ? 'bg-emerald-500 text-black'
                          : 'border border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {recoverySession.checklist.report_suspicious && <Check className="w-4 h-4 font-bold" />}
                    </button>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>1. Mark Transaction as Suspicious / Fraudulent</span>
                        {selectedTx?.status === 'flagged' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500 text-white uppercase font-bold">
                            Flagged in Database
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-300">
                        Flags transaction {selectedTxId} in local and bank telemetry. Prevents recurring debits and alerts fraud monitoring networks.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleMarkAsSuspicious}
                    className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider shrink-0 transition-colors"
                  >
                    Flag Now
                  </button>
                </div>
              </div>

              {/* ACTION 2: Contact Bank / UPI Provider & 1930 */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  recoverySession.checklist.contact_bank_provider
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleChecklist('contact_bank_provider')}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 transition-all ${
                        recoverySession.checklist.contact_bank_provider
                          ? 'bg-emerald-500 text-black'
                          : 'border border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {recoverySession.checklist.contact_bank_provider && <Check className="w-4 h-4 font-bold" />}
                    </button>

                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-white">
                        2. Contact Bank & National Cyber Fraud Helpline (1930)
                      </h4>
                      <p className="text-xs text-slate-300">
                        Immediately report the 12-digit UTR/Txn reference to initiate a lien/freeze on the scammer's bank account before withdrawal.
                      </p>

                      {/* Bank Helplines Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <a
                          href="tel:1930"
                          className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-red-500/30"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>1930 (Cyber Cell)</span>
                        </a>
                        <a
                          href="tel:18001234"
                          className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-300 text-xs font-medium flex items-center justify-center gap-1 hover:bg-white/10"
                        >
                          <span>SBI: 1800 1234</span>
                        </a>
                        <a
                          href="tel:18001600"
                          className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-300 text-xs font-medium flex items-center justify-center gap-1 hover:bg-white/10"
                        >
                          <span>HDFC: 1800 1600</span>
                        </a>
                        <a
                          href="tel:08068727374"
                          className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-300 text-xs font-medium flex items-center justify-center gap-1 hover:bg-white/10"
                        >
                          <span>PhonePe: 080-68727374</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleChecklist('contact_bank_provider')}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold shrink-0"
                  >
                    {recoverySession.checklist.contact_bank_provider ? 'Done' : 'Mark Done'}
                  </button>
                </div>
              </div>

              {/* ACTION 3: Secure Account & Reset MPIN */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  recoverySession.checklist.secure_account_mpin
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleChecklist('secure_account_mpin')}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 transition-all ${
                        recoverySession.checklist.secure_account_mpin
                          ? 'bg-emerald-500 text-black'
                          : 'border border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {recoverySession.checklist.secure_account_mpin && <Check className="w-4 h-4 font-bold" />}
                    </button>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#00d2ff]" />
                        <span>3. Secure Account & Reset 6-Digit UPI MPIN</span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        Open your UPI app (GPay / PhonePe / Paytm), go to Bank Accounts &gt; Reset MPIN. Never share the new OTP or PIN with anyone.
                      </p>
                      <ul className="text-[11px] text-slate-400 list-disc list-inside pt-1 space-y-0.5">
                        <li>De-link unfamiliar secondary devices or browsers</li>
                        <li>Disable biometric / auto-fill for banking apps temporarily</li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleChecklist('secure_account_mpin')}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold shrink-0"
                  >
                    {recoverySession.checklist.secure_account_mpin ? 'Secured' : 'Mark Secured'}
                  </button>
                </div>
              </div>

              {/* ACTION 4: Block Scammer & Cease Communication */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  recoverySession.checklist.block_scammer_comm
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleChecklist('block_scammer_comm')}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 transition-all ${
                        recoverySession.checklist.block_scammer_comm
                          ? 'bg-emerald-500 text-black'
                          : 'border border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {recoverySession.checklist.block_scammer_comm && <Check className="w-4 h-4 font-bold" />}
                    </button>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-red-400" />
                        <span>4. Avoid Further Communication & Block Scammer</span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        Scammers often attempt a secondary extortion or fake refund fee (Advance Fee Fraud). Do NOT respond or install remote screen sharing apps (AnyDesk, TeamViewer).
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleChecklist('block_scammer_comm')}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold shrink-0"
                  >
                    {recoverySession.checklist.block_scammer_comm ? 'Blocked' : 'Mark Blocked'}
                  </button>
                </div>
              </div>

              {/* ACTION 5: Generate Formal Dispute Report */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  recoverySession.checklist.file_1930_cybercrime
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleChecklist('file_1930_cybercrime')}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 transition-all ${
                        recoverySession.checklist.file_1930_cybercrime
                          ? 'bg-emerald-500 text-black'
                          : 'border border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {recoverySession.checklist.file_1930_cybercrime && <Check className="w-4 h-4 font-bold" />}
                    </button>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#00d2ff]" />
                        <span>5. File Official Complaint on cybercrime.gov.in</span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        Generate legal grievance narrative compliant with IT Act Section 66D and RBI Limiting Liability framework.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateDisputeReport}
                    disabled={isGeneratingReport}
                    className="px-4 py-2 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold uppercase tracking-wider shrink-0 shadow-[0_0_12px_rgba(103,53,232,0.4)] transition-all"
                  >
                    {isGeneratingReport ? 'Generating...' : 'Generate Legal Text'}
                  </button>
                </div>

                {/* Generated Complaint Drawer */}
                {generatedReportText && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#00d2ff] uppercase tracking-wider">
                        Official Complaint Text Ready:
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedReportText);
                          setCopiedReport(true);
                          setTimeout(() => setCopiedReport(false), 2000);
                        }}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium"
                      >
                        {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedReport ? 'Copied' : 'Copy Text'}</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/5 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {generatedReportText}
                    </div>

                    <div className="flex justify-end gap-2">
                      <a
                        href="https://cybercrime.gov.in"
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <span>Open cybercrime.gov.in</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 3: TRUSTED PERSON */}
      {/* ========================================================================= */}
      {activeModule === 'trusted' && (
        <div className="space-y-6">
          <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#00d2ff]" />
                  <span>Trusted Person & Family Co-Guardian Network</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Add family members or co-signers who will receive live recovery updates, evidence briefs, and emergency fraud alerts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddContactModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(103,53,232,0.4)] transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Trusted Person</span>
                </button>
              </div>
            </div>

            {/* Emergency Broadcast Bar */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#6735e8]/15 via-white/5 to-white/5 border border-[#6735e8]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#00d2ff]" />
                  <span>Share Live Incident Dossier With Guardians</span>
                </h4>
                <p className="text-xs text-slate-300">
                  Sends formatted WhatsApp and SMS summary containing transaction details, frozen status, and recovery progress.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDispatchEmergencyAlert}
                  className="px-4 py-2.5 rounded-xl bg-[#00d2ff] hover:bg-[#00b8e6] text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,210,255,0.4)] transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch SOS Alert</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(generateSosShareText())}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp SOS</span>
                </a>
              </div>
            </div>

            {alertSentStatus && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{alertSentStatus}</span>
              </div>
            )}

            {/* List of Contacts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-start justify-between gap-3 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#6735e8]/20 border border-[#6735e8]/30 flex items-center justify-center text-[#00d2ff] font-bold text-sm shrink-0">
                      {c.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{c.name}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                          Verified
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono">{c.contact_info}</p>
                      {c.notes && <p className="text-[11px] text-slate-400">{c.notes}</p>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteContact(c.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Remove Contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 4: EVIDENCE LOCKER */}
      {/* ========================================================================= */}
      {activeModule === 'evidence' && (
        <div className="space-y-6">
          <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <FolderLock className="w-5 h-5 text-[#00d2ff]" />
                  <span>Digital Evidence Locker & Forensic Vault</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Safely preserve scam SMS transcripts, fake QR barcodes, payment screenshots, and investigator logs for Police FIR & chargebacks.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Upload Screenshot button */}
                <label className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#00d2ff] text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Upload Screenshot</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUploadEvidence}
                    className="hidden"
                  />
                </label>

                {/* Add Text Evidence */}
                <button
                  onClick={() => setShowAddEvidenceModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(103,53,232,0.4)] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Evidence Note</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'screenshot', 'sms', 'link', 'qr_code', 'audio_log'] as const).map((ft) => (
                <button
                  key={ft}
                  onClick={() => setEvidenceFilter(ft)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase transition-colors ${
                    evidenceFilter === ft
                      ? 'bg-[#00d2ff] text-black font-bold shadow-[0_0_10px_rgba(0,210,255,0.4)]'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {ft.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Evidence Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvidence.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between space-y-3 hover:border-white/10 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.type === 'screenshot'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : item.type === 'sms'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : item.type === 'qr_code'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {item.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{item.title}</h4>

                    {/* Content Preview */}
                    {item.type === 'screenshot' && item.content.startsWith('data:') ? (
                      <div
                        onClick={() => setPreviewEvidence(item)}
                        className="w-full h-32 rounded-xl overflow-hidden bg-black/40 border border-white/5 cursor-pointer relative group"
                      >
                        <img
                          src={item.content}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                          Click to Enlarge
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 font-mono leading-relaxed bg-[#0a0a0c] p-3 rounded-xl border border-white/5 line-clamp-4">
                        {item.content}
                      </p>
                    )}

                    {/* Tag chips */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.content);
                        alert('Evidence copied to clipboard!');
                      }}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Item</span>
                    </button>

                    <button
                      onClick={() => DataStore.deleteEvidence(item.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                      title="Delete Evidence"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 5: SCAM TIMELINE */}
      {/* ========================================================================= */}
      {activeModule === 'timeline' && (
        <div className="space-y-6">
          <ScamTimeline
            transaction={selectedTx}
            events={timelineEvents}
            onConsultTrustedPerson={() => setActiveModule('trusted')}
            onLaunchRecovery={() => setActiveModule('actions')}
            showActions={true}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-[#16161c] border border-white/10 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#00d2ff]" />
              <span>Add Family / Trusted Guardian</span>
            </h3>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Guardian Full Name</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="e.g. Ramesh Verma"
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-white text-xs focus:outline-none focus:border-[#00d2ff]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Mobile Phone / WhatsApp</label>
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-white text-xs focus:outline-none focus:border-[#00d2ff]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Relationship</label>
                <select
                  value={newContactRelation}
                  onChange={(e) => setNewContactRelation(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#1f1f27] border border-white/5 text-white text-xs focus:outline-none focus:border-[#00d2ff]"
                >
                  <option value="Family Member">Family Member</option>
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Financial Guardian">Financial Guardian / Lawyer</option>
                  <option value="Close Friend">Close Friend</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(103,53,232,0.4)] transition-all"
                >
                  Save Guardian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Evidence Note Modal */}
      {showAddEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#16161c] border border-white/10 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FolderLock className="w-5 h-5 text-[#00d2ff]" />
              <span>Record Evidence Item</span>
            </h3>

            <form onSubmit={handleAddEvidence} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Evidence Title</label>
                <input
                  type="text"
                  value={newEvidenceTitle}
                  onChange={(e) => setNewEvidenceTitle(e.target.value)}
                  placeholder="e.g. Scammer WhatsApp Chat Transcript"
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-white text-xs focus:outline-none focus:border-[#00d2ff]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Evidence Type</label>
                <select
                  value={newEvidenceType}
                  onChange={(e: any) => setNewEvidenceType(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#1f1f27] border border-white/5 text-white text-xs focus:outline-none focus:border-[#00d2ff]"
                >
                  <option value="sms">Scam SMS / Message</option>
                  <option value="link">Phishing Link / Malicious APK</option>
                  <option value="qr_code">QR Barcode Payload / VPA</option>
                  <option value="audio_log">Phone Call Notes / Extortion Log</option>
                  <option value="bank_statement">Bank Debit Statement Reference</option>
                  <option value="note">Investigator Remarks</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Content / Verbatim Details</label>
                <textarea
                  rows={4}
                  value={newEvidenceContent}
                  onChange={(e) => setNewEvidenceContent(e.target.value)}
                  placeholder="Paste SMS content, phone numbers, scammer instructions, links..."
                  required
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-white text-xs focus:outline-none focus:border-[#00d2ff] leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newEvidenceTagInput}
                  onChange={(e) => setNewEvidenceTagInput(e.target.value)}
                  placeholder="e.g. Electricity, Urgency, +91 9811223344"
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-white text-xs focus:outline-none focus:border-[#00d2ff]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEvidenceModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(103,53,232,0.4)] transition-all"
                >
                  Save Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Timeline Event Modal */}
      {showAddTimelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-[#16161c] border border-white/10 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00d2ff]" />
              <span>Add Custom Timeline Milestone</span>
            </h3>

            <form onSubmit={handleAddTimelineEvent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Event Title</label>
                <input
                  type="text"
                  value={newTimelineTitle}
                  onChange={(e) => setNewTimelineTitle(e.target.value)}
                  placeholder="e.g. Bank Acknowledged Nodal Complaint #HD-9921"
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-white text-xs focus:outline-none focus:border-[#00d2ff]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Actor / Initiator</label>
                <select
                  value={newTimelineActor}
                  onChange={(e: any) => setNewTimelineActor(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#1f1f27] border border-white/5 text-white text-xs focus:outline-none focus:border-[#00d2ff]"
                >
                  <option value="victim">Victim / Complainant</option>
                  <option value="scammer">Scammer / Fraudster</option>
                  <option value="bank_police">Bank Nodal Officer / Cyber Cell</option>
                  <option value="system">UPI Guardian AI System</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={newTimelineDesc}
                  onChange={(e) => setNewTimelineDesc(e.target.value)}
                  placeholder="Detailed notes regarding this milestone..."
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-white text-xs focus:outline-none focus:border-[#00d2ff] leading-relaxed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTimelineModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(103,53,232,0.4)] transition-all"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Full Evidence Modal */}
      {previewEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-[#16161c] border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white">{previewEvidence.title}</h3>
              <button
                onClick={() => setPreviewEvidence(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {previewEvidence.type === 'screenshot' ? (
              <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/5 flex items-center justify-center bg-black/60 p-2">
                <img
                  src={previewEvidence.content}
                  alt={previewEvidence.title}
                  className="max-h-[65vh] w-auto object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#0a0a0c] border border-white/5 font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                {previewEvidence.content}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
