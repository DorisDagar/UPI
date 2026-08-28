export type RiskLevel = 'Low' | 'Medium' | 'High';
export type TransactionStatus = 'completed' | 'flagged' | 'cancelled';
export type MessageVerdict = 'Safe' | 'Suspicious' | 'Dangerous Fraud';

export interface Profile {
  id: string;
  username: string;
  mobile_number: string;
  safety_score: number; // 0 to 100, default 100
  trust_threshold: number; // default e.g. 40
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  receiver_name: string;
  receiver_upi: string;
  amount: number;
  category: string;
  risk_score: number;
  risk_level: RiskLevel;
  ai_explanation: string;
  status: TransactionStatus;
  is_collect_request?: boolean;
  note?: string;
  triggers?: string[];
  scam_pattern?: string;
  recommendations?: string[];
  created_at: string;
}

export interface AnalyzedMessage {
  id: string;
  user_id: string;
  content: string;
  risk_score: number;
  verdict: MessageVerdict;
  flags: string[];
  psychological_triggers?: string[];
  explanation: string;
  source?: 'sms' | 'whatsapp' | 'screenshot' | 'manual';
  extracted_entities?: {
    phone_numbers?: string[];
    upi_ids?: string[];
    links?: string[];
  };
  safe_action_steps?: string[];
  created_at: string;
}

export interface TrustedContact {
  id: string;
  user_id: string;
  name: string;
  contact_info: string; // Phone or UPI ID
  verified: boolean;
  notes?: string;
  created_at: string;
}

export interface IncidentReport {
  id: string;
  user_id: string;
  victim_name: string;
  victim_phone: string;
  scammer_upi: string;
  scammer_phone: string;
  amount_lost: number;
  incident_date: string;
  platform: 'GPay' | 'PhonePe' | 'Paytm' | 'BHIM' | 'Other UPI';
  bank_reference_no: string;
  fraud_category: string;
  incident_description: string;
  generated_report: string;
  status: 'draft' | 'filed_1930' | 'reported_bank' | 'resolved';
  created_at: string;
}

export type TransactionIntent = 'PAYING_MONEY' | 'RECEIVING_MONEY_TRAP' | 'STATIC_PAYEE_QR' | 'DYNAMIC_INVOICE_PAY' | 'UNKNOWN';

export interface ParsedUpiUrl {
  raw: string;
  isUpi: boolean;
  isCollect: boolean;
  intent: TransactionIntent;
  intentDescription: string;
  isReceivingTrap: boolean;
  pa?: string; // payee address (VPA/UPI ID)
  pn?: string; // payee name
  mc?: string; // merchant code
  tr?: string; // transaction ref
  tn?: string; // transaction note
  am?: string; // amount
  cu?: string; // currency (INR)
  url?: string;
}

export interface RiskAnalysisResult {
  risk_score: number;
  risk_level: RiskLevel;
  category: string;
  scam_pattern: string;
  triggers: string[];
  ai_explanation: string;
  recommendations: string[];
}

export interface MessageAnalysisResult {
  risk_score: number;
  verdict: MessageVerdict;
  flags: string[];
  psychological_triggers: string[];
  explanation: string;
  extracted_entities: {
    phone_numbers: string[];
    upi_ids: string[];
    links: string[];
  };
  safe_action_steps: string[];
}

export interface RecoveryEvidence {
  id: string;
  user_id: string;
  transaction_id?: string;
  title: string;
  type: 'screenshot' | 'sms' | 'link' | 'qr_code' | 'note' | 'audio_log' | 'bank_statement';
  content: string; // text, URL, or base64 data URI
  file_name?: string;
  file_size?: string;
  tags?: string[];
  created_at: string;
}

export interface TrustedPersonReview {
  id: string;
  transaction_id?: string;
  trusted_contact_id: string;
  trusted_contact_name: string;
  trusted_contact_phone?: string;
  status: 'pending' | 'reviewed' | 'approved_safe' | 'warned_scam';
  advice_note?: string;
  suggested_action?: 'block' | 'hold' | 'proceed';
  requested_at: string;
  responded_at?: string;
}

export interface ScamTimelineEvent {
  id: string;
  user_id: string;
  transaction_id?: string;
  step_type:
    | 'sms_received'
    | 'unknown_link'
    | 'new_receiver'
    | 'urgent_request'
    | 'fraud_detected'
    | 'trusted_advised'
    | 'blocked_safe'
    | 'link_clicked'
    | 'scammer_contacted'
    | 'payment_made'
    | 'recovery_started'
    | 'bank_notified'
    | 'cybercell_reported'
    | 'recovery_complete'
    | 'custom';
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'in_progress' | 'pending';
  actor?: 'victim' | 'scammer' | 'system' | 'trusted_person' | 'bank_police';
  evidence_ref?: string;
  metadata?: {
    stage_number?: number;
    urgency_level?: 'low' | 'medium' | 'high' | 'critical';
    channel?: string;
  };
}

export interface RecoveryActionChecklist {
  report_suspicious: boolean;
  contact_bank_provider: boolean;
  secure_account_mpin: boolean;
  block_scammer_comm: boolean;
  file_1930_cybercrime: boolean;
}

export interface RecoverySession {
  id: string;
  user_id: string;
  selected_transaction_id?: string;
  selected_transaction?: Transaction;
  status: 'active' | 'in_progress' | 'recovered' | 'resolved';
  checklist: RecoveryActionChecklist;
  created_at: string;
  updated_at: string;
}
