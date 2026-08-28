import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Profile, Transaction, AnalyzedMessage, TrustedContact, IncidentReport, RecoveryEvidence, ScamTimelineEvent, RecoverySession, TrustedPersonReview } from '../types';

// Environment variables or fallback local storage configuration
const envSupabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || '';
const envSupabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || '';

// Let users configure Supabase credentials at runtime if desired
const runtimeUrl = typeof window !== 'undefined' ? localStorage.getItem('upg_custom_supabase_url') || '' : '';
const runtimeKey = typeof window !== 'undefined' ? localStorage.getItem('upg_custom_supabase_key') || '' : '';

export const SUPABASE_URL = runtimeUrl || envSupabaseUrl;
export const SUPABASE_ANON_KEY = runtimeKey || envSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Synthetic email conversion for mobile numbers (e.g. +91 9876543210 -> 9876543210@upiguardian.internal)
export function mobileToSyntheticEmail(mobile: string): string {
  const digitsOnly = mobile.replace(/\D/g, '');
  const cleanNumber = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
  return `${cleanNumber || 'guest'}@upiguardian.internal`;
}

export function cleanMobileDisplay(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return mobile;
}

// Initial Sample Seed Data for instant interactive demo
const DEFAULT_PROFILE: Profile = {
  id: 'usr-demo-777',
  username: 'Vikram Sharma',
  mobile_number: '9876543210',
  safety_score: 94,
  trust_threshold: 40,
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
};

const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-101',
    user_id: 'usr-demo-777',
    receiver_name: 'Tata Power Electricity Board Support',
    receiver_upi: 'tatapower.billdesk.urgent@ybl',
    amount: 3450,
    category: 'Utility Threat',
    risk_score: 94,
    risk_level: 'High',
    ai_explanation: 'AI detected fake electricity bill collection spoofing. The UPI ID is a personal @ybl handle rather than the official Tata Power BBPS merchant identifier.',
    status: 'cancelled',
    is_collect_request: false,
    note: 'Urgent Electricity Bill payment to avoid power cut tonight',
    triggers: [
      'Spoofed utility name on personal VPA (@ybl)',
      'High urgency fear-based note',
      'No BBPS verification token'
    ],
    scam_pattern: 'Electricity Disconnection Threat',
    recommendations: [
      'Pay only via official electricity board portal or BBPS on your bank app.',
      'Report this UPI ID to 1930 Cyber Fraud Helpline.'
    ],
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'tx-102',
    user_id: 'usr-demo-777',
    receiver_name: 'OLX Buyer Col. Arvind Sharma',
    receiver_upi: 'defence.canteen.pay@okaxis',
    amount: 15000,
    category: 'Marketplace Scam',
    risk_score: 96,
    risk_level: 'High',
    ai_explanation: 'COLLECT REQUEST TRAP: The scammer sent a collect request posing as an Indian Army officer purchasing furniture, claiming you will "receive" ₹15,000 upon entering your PIN.',
    status: 'flagged',
    is_collect_request: true,
    note: 'Advance for Sofa set via Army Canteen Barcode',
    triggers: [
      'UPI Collect request claiming to credit money',
      'Impersonation of military/defense personnel',
      'High amount with deceptive instruction to enter UPI PIN'
    ],
    scam_pattern: 'OLX Army Officer QR Scam',
    recommendations: [
      'DO NOT enter your UPI PIN. Entering your PIN transfers money out of your account.',
      'Decline this collect request in your UPI app immediately.'
    ],
    created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
  },
  {
    id: 'tx-103',
    user_id: 'usr-demo-777',
    receiver_name: 'Blinkit Quick Commerce',
    receiver_upi: 'blinkit.groceries@icici',
    amount: 680,
    category: 'E-commerce',
    risk_score: 8,
    risk_level: 'Low',
    ai_explanation: 'Verified merchant gateway with authentic corporate VPA and standard transaction telemetry.',
    status: 'completed',
    is_collect_request: false,
    note: 'Groceries & fruits order #BK-99201',
    triggers: [],
    scam_pattern: 'Legitimate Merchant Transaction',
    recommendations: ['Safe to authorize.'],
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'tx-104',
    user_id: 'usr-demo-777',
    receiver_name: 'Ananya Verma (Flatmate)',
    receiver_upi: 'ananya.verma@okhdfcbank',
    amount: 4500,
    category: 'Peer to Peer',
    risk_score: 5,
    risk_level: 'Low',
    ai_explanation: 'Recipient is in your trusted contacts list with verified historical transaction consistency.',
    status: 'completed',
    is_collect_request: false,
    note: 'Wi-Fi & Maid shared monthly bill',
    triggers: [],
    scam_pattern: 'Legitimate Peer Transfer',
    recommendations: ['Verified contact transaction.'],
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
];

const SEED_MESSAGES: AnalyzedMessage[] = [
  {
    id: 'msg-201',
    user_id: 'usr-demo-777',
    content: 'Dear consumer, your electricity power will be disconnected tonight at 9:30 PM because your previous month bill was not updated. Please immediately contact our Electricity Officer at 9811223344 or pay via UPI.',
    risk_score: 95,
    verdict: 'Dangerous Fraud',
    flags: ['Electricity Disconnection Urgency', 'Fake Official Helpline', 'Fear Exploitation'],
    psychological_triggers: ['Urgency: 9:30 PM deadline', 'Fear: Power cut intimidation'],
    explanation: 'High-frequency nationwide scam. DISCOMs never send messages with personal 10-digit mobile numbers or demand urgent personal UPI transfers.',
    source: 'sms',
    extracted_entities: {
      phone_numbers: ['9811223344'],
      upi_ids: [],
      links: [],
    },
    safe_action_steps: [
      'Do not call 9811223344.',
      'Check your electricity bill status exclusively on the official DISCOM website.',
      'Forward the SMS to 1909 (TRAI Spam reporting).'
    ],
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'msg-202',
    user_id: 'usr-demo-777',
    content: 'Congratulations! You won ₹25,00,000 in KBC Lucky Draw 2026. Send ₹1,500 government tax processing fee via UPI to lottery.rbi.tax@paytm to claim check instantly.',
    risk_score: 98,
    verdict: 'Dangerous Fraud',
    flags: ['Lottery / Fake Prize Bait', 'Advance Fee Scam', 'RBI Impersonation'],
    psychological_triggers: ['Greed: ₹25 Lakh reward', 'Authority: False RBI claim'],
    explanation: 'Classic Advance-Fee Fraud (419 scam). No legitimate lottery or institution asks winners to pay an upfront UPI fee to release prize money.',
    source: 'whatsapp',
    extracted_entities: {
      phone_numbers: [],
      upi_ids: ['lottery.rbi.tax@paytm'],
      links: [],
    },
    safe_action_steps: [
      'Block and report the sender on WhatsApp.',
      'Never send advance registration or tax fees.'
    ],
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
  }
];

const SEED_CONTACTS: TrustedContact[] = [
  {
    id: 'tc-1',
    user_id: 'usr-demo-777',
    name: 'Ananya Verma (Sister)',
    contact_info: '+91 98765 11223',
    verified: true,
    notes: 'Family Contact & Emergency Financial Alert',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'tc-2',
    user_id: 'usr-demo-777',
    name: 'Rohan Sharma (Brother)',
    contact_info: '+91 98220 33445',
    verified: true,
    notes: 'Trusted Co-Signer & Family Member',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
];

const SEED_EVIDENCE: RecoveryEvidence[] = [
  {
    id: 'ev-1',
    user_id: 'usr-demo-777',
    transaction_id: 'tx-101',
    title: 'Fraudulent Electricity Cut SMS',
    type: 'sms',
    content: 'Dear consumer, your electricity power will be disconnected tonight at 9:30 PM because your previous month bill was not updated. Please immediately contact our Electricity Officer at 9811223344 or pay via UPI to avoid disconnection.',
    tags: ['SMS', 'Electricity Threat', 'Fake Officer'],
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'ev-2',
    user_id: 'usr-demo-777',
    transaction_id: 'tx-101',
    title: 'Deceptive Payment VPA Handle',
    type: 'qr_code',
    content: 'tatapower.billdesk.urgent@ybl (Spoofed personal Yes Bank handle masquerading as Tata Power Corporate Merchant)',
    tags: ['UPI VPA', 'Spoofed ID', 'Personal Handle'],
    created_at: new Date(Date.now() - 1.8 * 3600000).toISOString(),
  },
  {
    id: 'ev-3',
    user_id: 'usr-demo-777',
    transaction_id: 'tx-101',
    title: 'Scammer Phone Contact Log',
    type: 'audio_log',
    content: 'Scammer spoke with urgency in Hindi, claiming to be "Chief Engineer Sharma" demanding immediate deposit of ₹3,450 to avoid grid disconnection.',
    tags: ['Phone Call', 'Impersonation', 'Urgency'],
    created_at: new Date(Date.now() - 1.5 * 3600000).toISOString(),
  },
];

const SEED_TIMELINE_EVENTS: ScamTimelineEvent[] = [
  {
    id: 'tl-1',
    user_id: 'usr-demo-777',
    transaction_id: 'tx-101',
    step_type: 'sms_received',
    title: 'Threat SMS Received',
    description: 'Received SMS from +91 9811223344 warning of electricity disconnection at 9:30 PM.',
    timestamp: new Date(Date.now() - 2.5 * 3600000).toISOString(),
    status: 'completed',
    actor: 'scammer',
  },
  {
    id: 'tl-2',
    user_id: 'usr-demo-777',
    transaction_id: 'tx-101',
    step_type: 'scammer_contacted',
    title: 'Scammer Contacted on Phone',
    description: 'Victim dialed the phone number listed in the SMS to inquire about the bill.',
    timestamp: new Date(Date.now() - 2.2 * 3600000).toISOString(),
    status: 'completed',
    actor: 'victim',
  },
  {
    id: 'tl-3',
    user_id: 'usr-demo-777',
    transaction_id: 'tx-101',
    step_type: 'payment_made',
    title: 'Payment / Collect Requested',
    description: 'Scammer sent a collect request of ₹3,450 to tatapower.billdesk.urgent@ybl.',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: 'completed',
    actor: 'scammer',
  },
  {
    id: 'tl-4',
    user_id: 'usr-demo-777',
    transaction_id: 'tx-101',
    step_type: 'fraud_detected',
    title: 'Fraud Detected by UPI Guardian',
    description: 'UPI Guardian identified spoofed VPA (@ybl) and high psychological urgency trigger.',
    timestamp: new Date(Date.now() - 1.9 * 3600000).toISOString(),
    status: 'completed',
    actor: 'system',
  },
  {
    id: 'tl-5',
    user_id: 'usr-demo-777',
    transaction_id: 'tx-101',
    step_type: 'recovery_started',
    title: 'Recovery Mode Initiated',
    description: 'Immediate action checklist triggered: Bank helpline dialed, evidence saved to locker.',
    timestamp: new Date(Date.now() - 1.5 * 3600000).toISOString(),
    status: 'completed',
    actor: 'victim',
  },
  {
    id: 'tl-6',
    user_id: 'usr-demo-777',
    transaction_id: 'tx-101',
    step_type: 'cybercell_reported',
    title: 'National Cyber Crime 1930 FIR Drafted',
    description: 'Official dispute dossier generated with UTR and scammer details for nodal officer.',
    timestamp: new Date(Date.now() - 0.5 * 3600000).toISOString(),
    status: 'in_progress',
    actor: 'bank_police',
  },
];

const DEFAULT_RECOVERY_SESSION: RecoverySession = {
  id: 'rec-session-1',
  user_id: 'usr-demo-777',
  selected_transaction_id: 'tx-101',
  status: 'in_progress',
  checklist: {
    report_suspicious: true,
    contact_bank_provider: true,
    secure_account_mpin: false,
    block_scammer_comm: true,
    file_1930_cybercrime: false,
  },
  created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  updated_at: new Date().toISOString(),
};

// Reactive Event Bus for Realtime UI Updates
type EventListener = (data: any) => void;
const eventListeners: { [channel: string]: EventListener[] } = {};

export function subscribeToRealtime(channel: string, callback: EventListener) {
  if (!eventListeners[channel]) {
    eventListeners[channel] = [];
  }
  eventListeners[channel].push(callback);

  // If real Supabase is configured, also listen to postgres_changes
  let supabaseChannel: any = null;
  if (supabase && (channel === 'transactions' || channel === 'analyzed_messages')) {
    try {
      supabaseChannel = supabase
        .channel(`public:${channel}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: channel }, (payload) => {
          callback(payload);
        })
        .subscribe();
    } catch (err) {
      console.warn('Supabase realtime subscription failed:', err);
    }
  }

  return () => {
    if (eventListeners[channel]) {
      eventListeners[channel] = eventListeners[channel].filter((cb) => cb !== callback);
    }
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}

export function broadcastRealtimeEvent(channel: string, payload: any) {
  if (eventListeners[channel]) {
    eventListeners[channel].forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.error('Error in realtime listener:', e);
      }
    });
  }
}

// Local Storage Handlers with reactive sync
export const DataStore = {
  getProfile(): Profile {
    if (typeof window === 'undefined') return DEFAULT_PROFILE;
    const stored = localStorage.getItem('upg_profile');
    if (!stored) {
      localStorage.setItem('upg_profile', JSON.stringify(DEFAULT_PROFILE));
      return DEFAULT_PROFILE;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  updateProfile(updates: Partial<Profile>): Profile {
    const current = this.getProfile();
    const updated = { ...current, ...updates };
    localStorage.setItem('upg_profile', JSON.stringify(updated));
    broadcastRealtimeEvent('profile', updated);
    return updated;
  },

  getTransactions(): Transaction[] {
    if (typeof window === 'undefined') return SEED_TRANSACTIONS;
    const stored = localStorage.getItem('upg_transactions');
    if (!stored) {
      localStorage.setItem('upg_transactions', JSON.stringify(SEED_TRANSACTIONS));
      return SEED_TRANSACTIONS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return SEED_TRANSACTIONS;
    }
  },

  addTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Transaction {
    const transactions = this.getTransactions();
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newTx, ...transactions];
    localStorage.setItem('upg_transactions', JSON.stringify(updated));

    // Update safety score dynamically based on user avoiding high risk scams
    const profile = this.getProfile();
    if (newTx.risk_level === 'High' && newTx.status === 'cancelled') {
      const newScore = Math.min(100, profile.safety_score + 2);
      this.updateProfile({ safety_score: newScore });
    } else if (newTx.risk_level === 'High' && newTx.status === 'completed') {
      const newScore = Math.max(20, profile.safety_score - 15);
      this.updateProfile({ safety_score: newScore });
    }

    broadcastRealtimeEvent('transactions', { eventType: 'INSERT', new: newTx });
    return newTx;
  },

  updateTransactionStatus(id: string, status: Transaction['status']): Transaction | null {
    const transactions = this.getTransactions();
    const target = transactions.find((t) => t.id === id);
    if (!target) return null;

    target.status = status;
    localStorage.setItem('upg_transactions', JSON.stringify(transactions));
    broadcastRealtimeEvent('transactions', { eventType: 'UPDATE', new: target });
    return target;
  },

  getMessages(): AnalyzedMessage[] {
    if (typeof window === 'undefined') return SEED_MESSAGES;
    const stored = localStorage.getItem('upg_messages');
    if (!stored) {
      localStorage.setItem('upg_messages', JSON.stringify(SEED_MESSAGES));
      return SEED_MESSAGES;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return SEED_MESSAGES;
    }
  },

  addMessage(msg: Omit<AnalyzedMessage, 'id' | 'created_at'>): AnalyzedMessage {
    const messages = this.getMessages();
    const newMsg: AnalyzedMessage = {
      ...msg,
      id: `msg-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newMsg, ...messages];
    localStorage.setItem('upg_messages', JSON.stringify(updated));
    broadcastRealtimeEvent('analyzed_messages', { eventType: 'INSERT', new: newMsg });
    return newMsg;
  },

  getContacts(): TrustedContact[] {
    if (typeof window === 'undefined') return SEED_CONTACTS;
    const stored = localStorage.getItem('upg_contacts');
    if (!stored) {
      localStorage.setItem('upg_contacts', JSON.stringify(SEED_CONTACTS));
      return SEED_CONTACTS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return SEED_CONTACTS;
    }
  },

  addContact(contact: Omit<TrustedContact, 'id' | 'created_at'>): TrustedContact {
    const contacts = this.getContacts();
    const newContact: TrustedContact = {
      ...contact,
      id: `tc-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newContact, ...contacts];
    localStorage.setItem('upg_contacts', JSON.stringify(updated));
    broadcastRealtimeEvent('trusted_contacts', { eventType: 'INSERT', new: newContact });
    return newContact;
  },

  deleteContact(id: string) {
    const contacts = this.getContacts().filter((c) => c.id !== id);
    localStorage.setItem('upg_contacts', JSON.stringify(contacts));
    broadcastRealtimeEvent('trusted_contacts', { eventType: 'DELETE', id });
  },

  getReports(): IncidentReport[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('upg_reports');
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  addReport(report: Omit<IncidentReport, 'id' | 'created_at'>): IncidentReport {
    const reports = this.getReports();
    const newReport: IncidentReport = {
      ...report,
      id: `rep-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newReport, ...reports];
    localStorage.setItem('upg_reports', JSON.stringify(updated));
    broadcastRealtimeEvent('incident_reports', { eventType: 'INSERT', new: newReport });
    return newReport;
  },

  // Recovery Session management
  getRecoverySession(): RecoverySession {
    if (typeof window === 'undefined') return DEFAULT_RECOVERY_SESSION;
    const stored = localStorage.getItem('upg_recovery_session');
    if (!stored) {
      localStorage.setItem('upg_recovery_session', JSON.stringify(DEFAULT_RECOVERY_SESSION));
      return DEFAULT_RECOVERY_SESSION;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_RECOVERY_SESSION;
    }
  },

  updateRecoverySession(updates: Partial<RecoverySession>): RecoverySession {
    const current = this.getRecoverySession();
    const updated: RecoverySession = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('upg_recovery_session', JSON.stringify(updated));
    broadcastRealtimeEvent('recovery_session', updated);
    return updated;
  },

  updateRecoveryChecklist(key: keyof RecoverySession['checklist'], value: boolean): RecoverySession {
    const current = this.getRecoverySession();
    const updatedChecklist = { ...current.checklist, [key]: value };
    const allCompleted = Object.values(updatedChecklist).every(Boolean);
    const newStatus = allCompleted ? 'recovered' : 'in_progress';
    return this.updateRecoverySession({
      checklist: updatedChecklist,
      status: newStatus,
    });
  },

  // Evidence Locker management
  getEvidence(transactionId?: string): RecoveryEvidence[] {
    if (typeof window === 'undefined') return SEED_EVIDENCE;
    const stored = localStorage.getItem('upg_evidence');
    let evidenceList: RecoveryEvidence[] = SEED_EVIDENCE;
    if (stored) {
      try {
        evidenceList = JSON.parse(stored);
      } catch {
        evidenceList = SEED_EVIDENCE;
      }
    } else {
      localStorage.setItem('upg_evidence', JSON.stringify(SEED_EVIDENCE));
    }
    if (transactionId) {
      return evidenceList.filter((e) => !e.transaction_id || e.transaction_id === transactionId);
    }
    return evidenceList;
  },

  addEvidence(evidence: Omit<RecoveryEvidence, 'id' | 'created_at'>): RecoveryEvidence {
    const list = this.getEvidence();
    const newEv: RecoveryEvidence = {
      ...evidence,
      id: `ev-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newEv, ...list];
    localStorage.setItem('upg_evidence', JSON.stringify(updated));
    broadcastRealtimeEvent('recovery_evidence', { eventType: 'INSERT', new: newEv });
    return newEv;
  },

  deleteEvidence(id: string) {
    const list = this.getEvidence().filter((e) => e.id !== id);
    localStorage.setItem('upg_evidence', JSON.stringify(list));
    broadcastRealtimeEvent('recovery_evidence', { eventType: 'DELETE', id });
  },

  // Scam Timeline management
  getTimelineEvents(transactionId?: string): ScamTimelineEvent[] {
    if (typeof window === 'undefined') return SEED_TIMELINE_EVENTS;
    const stored = localStorage.getItem('upg_timeline');
    let timelineList: ScamTimelineEvent[] = SEED_TIMELINE_EVENTS;
    if (stored) {
      try {
        timelineList = JSON.parse(stored);
      } catch {
        timelineList = SEED_TIMELINE_EVENTS;
      }
    } else {
      localStorage.setItem('upg_timeline', JSON.stringify(SEED_TIMELINE_EVENTS));
    }
    if (transactionId) {
      const filtered = timelineList.filter((e) => !e.transaction_id || e.transaction_id === transactionId);
      if (filtered.length > 0) return filtered;
    }
    return timelineList;
  },

  addTimelineEvent(event: Omit<ScamTimelineEvent, 'id'>): ScamTimelineEvent {
    const list = this.getTimelineEvents();
    const newEvent: ScamTimelineEvent = {
      ...event,
      id: `tl-${Date.now().toString().slice(-6)}`,
    };
    const updated = [...list, newEvent].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    localStorage.setItem('upg_timeline', JSON.stringify(updated));
    broadcastRealtimeEvent('scam_timeline', { eventType: 'INSERT', new: newEvent });
    return newEvent;
  },

  updateTimelineEvent(id: string, updates: Partial<ScamTimelineEvent>): ScamTimelineEvent | null {
    const list = this.getTimelineEvents();
    const index = list.findIndex((e) => e.id === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates };
    localStorage.setItem('upg_timeline', JSON.stringify(list));
    broadcastRealtimeEvent('scam_timeline', { eventType: 'UPDATE', new: list[index] });
    return list[index];
  },

  deleteTimelineEvent(id: string) {
    const list = this.getTimelineEvents().filter((e) => e.id !== id);
    localStorage.setItem('upg_timeline', JSON.stringify(list));
    broadcastRealtimeEvent('scam_timeline', { eventType: 'DELETE', id });
  },

  // Trusted Person Reviews management
  getTrustedPersonReviews(transactionId?: string): TrustedPersonReview[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('upg_trusted_reviews');
    let list: TrustedPersonReview[] = [];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch {
        list = [];
      }
    }
    if (transactionId) {
      return list.filter((r) => r.transaction_id === transactionId);
    }
    return list;
  },

  addTrustedPersonReview(review: Omit<TrustedPersonReview, 'id' | 'requested_at'>): TrustedPersonReview {
    const list = this.getTrustedPersonReviews();
    const newRev: TrustedPersonReview = {
      ...review,
      id: `rev-${Date.now().toString().slice(-6)}`,
      requested_at: new Date().toISOString(),
    };
    const updated = [newRev, ...list];
    localStorage.setItem('upg_trusted_reviews', JSON.stringify(updated));
    broadcastRealtimeEvent('trusted_reviews', { eventType: 'INSERT', new: newRev });
    return newRev;
  },

  updateTrustedPersonReview(id: string, updates: Partial<TrustedPersonReview>): TrustedPersonReview | null {
    const list = this.getTrustedPersonReviews();
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates };
    localStorage.setItem('upg_trusted_reviews', JSON.stringify(list));
    broadcastRealtimeEvent('trusted_reviews', { eventType: 'UPDATE', new: list[index] });
    return list[index];
  },

  // Auto-generate chronological scam timeline from any selected transaction
  // Sequence: suspicious message -> unknown link -> new receiver -> urgent payment request -> high-risk alert -> protective resolution
  generateTimelineFromTransaction(tx: Transaction): ScamTimelineEvent[] {
    const baseTime = new Date(tx.created_at || Date.now()).getTime();
    const isCollect = Boolean(tx.is_collect_request);
    const category = tx.category || 'UPI Payment';
    const noteText = tx.note || '';

    const generated: ScamTimelineEvent[] = [
      {
        id: `tl-${Date.now()}-1`,
        user_id: tx.user_id,
        transaction_id: tx.id,
        step_type: 'sms_received',
        title: '1. Suspicious Message / Initial Lure',
        description:
          category === 'Utility Threat'
            ? 'Victim received deceptive SMS claiming urgent electricity disconnection due to an unpaid bill.'
            : category === 'Marketplace Scam'
            ? 'Scammer contacted seller on OLX/Quikr offering advance payment for listed items without bargaining.'
            : category === 'Lottery/Reward'
            ? 'Received WhatsApp/SMS announcement promising a lottery prize or cashback reward.'
            : `Initial contact established under pretext of ${category}: "${noteText || 'Urgent payment required'}"`,
        timestamp: new Date(baseTime - 40 * 60000).toISOString(),
        status: 'completed',
        actor: 'scammer',
        metadata: { stage_number: 1, urgency_level: 'medium', channel: 'SMS / Messaging' },
      },
      {
        id: `tl-${Date.now()}-2`,
        user_id: tx.user_id,
        transaction_id: tx.id,
        step_type: 'unknown_link',
        title: '2. Unknown Link / Pretext Contact',
        description:
          category === 'Utility Threat'
            ? 'Victim tapped an unverified link or called the fake 10-digit electricity officer helpline number.'
            : isCollect
            ? 'Scammer requested victim to open their UPI app or tap a shared payment link/barcode.'
            : `Victim accessed unverified portal or payment prompt to resolve "${noteText || 'pending request'}"`,
        timestamp: new Date(baseTime - 25 * 60000).toISOString(),
        status: 'completed',
        actor: 'victim',
        metadata: { stage_number: 2, urgency_level: 'high', channel: 'Web / Phone Call' },
      },
      {
        id: `tl-${Date.now()}-3`,
        user_id: tx.user_id,
        transaction_id: tx.id,
        step_type: 'new_receiver',
        title: '3. New & Unverified Receiver Handle',
        description: `Unfamiliar VPA handle (${tx.receiver_upi}) introduced. Claimed identity "${tx.receiver_name}" lacks official merchant validation.`,
        timestamp: new Date(baseTime - 12 * 60000).toISOString(),
        status: 'completed',
        actor: 'scammer',
        metadata: { stage_number: 3, urgency_level: 'high', channel: 'UPI Network' },
      },
      {
        id: `tl-${Date.now()}-4`,
        user_id: tx.user_id,
        transaction_id: tx.id,
        step_type: 'urgent_request',
        title: `4. Urgent Payment Request (₹${tx.amount.toLocaleString('en-IN')})`,
        description: isCollect
          ? `Disguised COLLECT REQUEST sent for ₹${tx.amount.toLocaleString('en-IN')}. Scammer deceptively instructed victim to "enter UPI PIN to receive money".`
          : `High-pressure demand for immediate ₹${tx.amount.toLocaleString('en-IN')} transfer with strict deadline. Note: "${noteText || 'Urgent payment'}"`,
        timestamp: new Date(baseTime - 3 * 60000).toISOString(),
        status: 'completed',
        actor: 'scammer',
        metadata: { stage_number: 4, urgency_level: 'critical', channel: 'UPI Collect / Payment' },
      },
      {
        id: `tl-${Date.now()}-5`,
        user_id: tx.user_id,
        transaction_id: tx.id,
        step_type: 'fraud_detected',
        title: `5. High-Risk Alert & AI Interception (${tx.risk_score}/100)`,
        description: `UPI Guardian AI flagged transaction: ${tx.ai_explanation || 'Suspicious recipient reputation, deceptive collect request, and emotional panic triggers detected.'}`,
        timestamp: new Date(baseTime).toISOString(),
        status: 'completed',
        actor: 'system',
        metadata: { stage_number: 5, urgency_level: 'critical', channel: 'UPI Guardian Shield' },
      },
      {
        id: `tl-${Date.now()}-6`,
        user_id: tx.user_id,
        transaction_id: tx.id,
        step_type: tx.status === 'cancelled' ? 'blocked_safe' : 'trusted_advised',
        title:
          tx.status === 'cancelled'
            ? '6. Scam Blocked & Capital Preserved'
            : '6. Trusted Person Confirmation & Recovery',
        description:
          tx.status === 'cancelled'
            ? `User rejected the fraudulent transaction, safeguarding ₹${tx.amount.toLocaleString('en-IN')}. Evidence locked to threat database.`
            : 'User engaged trusted family advisory and initiated protective recovery steps before final decision.',
        timestamp: new Date(baseTime + 2 * 60000).toISOString(),
        status: tx.status === 'cancelled' ? 'completed' : 'in_progress',
        actor: tx.status === 'cancelled' ? 'victim' : 'trusted_person',
        metadata: { stage_number: 6, urgency_level: 'low', channel: 'Protection Engine' },
      },
    ];

    localStorage.setItem('upg_timeline', JSON.stringify(generated));
    broadcastRealtimeEvent('scam_timeline', { eventType: 'RESET', list: generated });
    return generated;
  },

  // Calculate live dynamic dashboard stats
  getDashboardStats() {
    const profile = this.getProfile();
    const transactions = this.getTransactions();
    const messages = this.getMessages();

    // Money Saved = Sum of high-risk transactions user cancelled or blocked
    const moneySaved = transactions
      .filter((tx) => tx.risk_level === 'High' && (tx.status === 'cancelled' || tx.status === 'flagged'))
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const totalAnalyzed = transactions.length + messages.length;
    const highRiskDetected = transactions.filter((tx) => tx.risk_level === 'High').length +
      messages.filter((m) => m.verdict === 'Dangerous Fraud').length;

    return {
      safetyScore: profile.safety_score,
      transactionsAnalyzed: transactions.length,
      messagesAnalyzed: messages.length,
      totalAnalyzed,
      moneySaved,
      highRiskDetected,
      completedTransactions: transactions.filter((t) => t.status === 'completed').length,
    };
  },

  getStats() {
    return this.getDashboardStats();
  },

  subscribeToRealtime(callback: () => void) {
    const unsubs = [
      subscribeToRealtime('profile', callback),
      subscribeToRealtime('transactions', callback),
      subscribeToRealtime('analyzed_messages', callback),
      subscribeToRealtime('trusted_contacts', callback),
      subscribeToRealtime('incident_reports', callback),
      subscribeToRealtime('recovery_session', callback),
      subscribeToRealtime('recovery_evidence', callback),
      subscribeToRealtime('scam_timeline', callback),
      subscribeToRealtime('trusted_reviews', callback),
    ];
    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  },
};
