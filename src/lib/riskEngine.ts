import { ParsedUpiUrl, RiskAnalysisResult, MessageAnalysisResult } from '../types';
import { DataStore } from './supabase';

export const RiskEngine = {
  /**
   * Parse UPI QR Code URL strings (e.g. upi://pay?pa=... or upi://collect?pa=...)
   * Automatically extracts receiver name, UPI ID, amount, and detects transaction intent.
   */
  parseUpiUri(rawUrl: string): ParsedUpiUrl {
    const clean = rawUrl.trim();
    const isUpiScheme = clean.toLowerCase().startsWith('upi://');
    const isCollectScheme = clean.toLowerCase().startsWith('upi://collect') || clean.toLowerCase().includes('mode=02');

    if (!isUpiScheme) {
      // Check if it's a bare UPI ID e.g. someone@okaxis
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (upiRegex.test(clean)) {
        return {
          raw: clean,
          isUpi: true,
          isCollect: false,
          intent: 'STATIC_PAYEE_QR',
          intentDescription: 'Static Payee Handle (You will be PAYING money to this recipient)',
          isReceivingTrap: false,
          pa: clean,
          pn: clean.split('@')[0],
        };
      }
      return {
        raw: clean,
        isUpi: false,
        isCollect: false,
        intent: 'UNKNOWN',
        intentDescription: 'Unrecognized barcode payload or non-UPI link',
        isReceivingTrap: false,
      };
    }

    let pa = '';
    let pn = '';
    let mc = '';
    let tr = '';
    let tn = '';
    let am = '';
    let cu = 'INR';

    try {
      const urlObj = new URL(clean.replace('upi://', 'http://upi/'));
      const params = urlObj.searchParams;
      pa = params.get('pa') || '';
      pn = params.get('pn') || '';
      mc = params.get('mc') || '';
      tr = params.get('tr') || '';
      tn = params.get('tn') || '';
      am = params.get('am') || '';
      cu = params.get('cu') || 'INR';
    } catch {
      // Manual query string parsing if URL constructor fails
      const queryPart = clean.split('?')[1] || '';
      const params = new URLSearchParams(queryPart);
      pa = params.get('pa') || '';
      pn = params.get('pn') || '';
      mc = params.get('mc') || '';
      tr = params.get('tr') || '';
      tn = params.get('tn') || '';
      am = params.get('am') || '';
      cu = params.get('cu') || 'INR';
    }

    // Determine Intent & Trap Detection
    const noteLower = (tn || '').toLowerCase();
    const nameLower = (pn || '').toLowerCase();
    const indicatesReceivingClaim =
      noteLower.includes('receive') ||
      noteLower.includes('credit') ||
      noteLower.includes('refund') ||
      noteLower.includes('advance') ||
      noteLower.includes('cashback') ||
      noteLower.includes('lottery') ||
      noteLower.includes('prize') ||
      noteLower.includes('reward') ||
      noteLower.includes('enter pin to get') ||
      nameLower.includes('refund') ||
      nameLower.includes('cashback') ||
      nameLower.includes('lottery');

    const isReceivingTrap = isCollectScheme || indicatesReceivingClaim;

    let intent: ParsedUpiUrl['intent'] = 'PAYING_MONEY';
    let intentDescription = 'Standard P2P Payment (Outgoing transfer - You are SENDING money)';

    if (isCollectScheme) {
      intent = 'RECEIVING_MONEY_TRAP';
      intentDescription = '🚨 COLLECT REQUEST TRAP: Disguised as receiving money, but will DEBIT from your bank account!';
    } else if (indicatesReceivingClaim) {
      intent = 'RECEIVING_MONEY_TRAP';
      intentDescription = '⚠️ DECEPTIVE PAY QR: Note/Name claims you are "receiving" money, but scanning this DEBITS your account!';
    } else if (am && Number(am) > 0) {
      intent = 'DYNAMIC_INVOICE_PAY';
      intentDescription = `Pre-filled Invoice (You will be PAYING ₹${Number(am).toLocaleString('en-IN')})`;
    } else {
      intent = 'STATIC_PAYEE_QR';
      intentDescription = 'Static Merchant/Payee QR (You specify amount to PAY this recipient)';
    }

    return {
      raw: clean,
      isUpi: true,
      isCollect: isCollectScheme,
      intent,
      intentDescription,
      isReceivingTrap,
      pa,
      pn: pn ? decodeURIComponent(pn.replace(/\+/g, ' ')) : '',
      mc,
      tr,
      tn: tn ? decodeURIComponent(tn.replace(/\+/g, ' ')) : '',
      am,
      cu,
      url: clean,
    };
  },

  /**
   * Perform comprehensive AI + Heuristic Transaction Risk Analysis
   */
  async analyzeTransaction(params: {
    receiver_name: string;
    receiver_upi: string;
    amount: number;
    note?: string;
    is_collect_request?: boolean;
  }): Promise<RiskAnalysisResult> {
    const { receiver_name, receiver_upi, amount, note = '', is_collect_request = false } = params;

    // Check if recipient is in verified Trusted Contacts
    const contacts = DataStore.getContacts();
    const isTrusted = contacts.some(
      (c) =>
        c.verified &&
        (c.contact_info.toLowerCase() === receiver_upi.toLowerCase() ||
          c.name.toLowerCase() === receiver_name.toLowerCase())
    );

    if (isTrusted && !is_collect_request && amount < 100000) {
      return {
        risk_score: 5,
        risk_level: 'Low',
        category: 'Trusted Contact',
        scam_pattern: 'Verified Beneficiary',
        triggers: [],
        ai_explanation: `Recipient ${receiver_name} (${receiver_upi}) is listed in your verified Trusted Contacts directory. No risk indicators detected.`,
        recommendations: ['Safe to proceed with authorization.'],
      };
    }

    try {
      const res = await fetch('/api/analyze-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_name,
          receiver_upi,
          amount,
          note,
          is_collect_request,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      return {
        risk_score: Number(data.risk_score) || 10,
        risk_level: data.risk_level || (data.risk_score >= 70 ? 'High' : data.risk_score >= 35 ? 'Medium' : 'Low'),
        category: data.category || 'P2P Transfer',
        scam_pattern: data.scam_pattern || 'Standard Transfer',
        triggers: Array.isArray(data.triggers) ? data.triggers : [],
        ai_explanation: data.ai_explanation || 'AI evaluated transaction parameters against fraud patterns.',
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : ['Review details carefully.'],
      };
    } catch (err) {
      console.warn('Backend /api/analyze-transaction failed, applying local fallback:', err);
      // Local fallback
      const isHigh = is_collect_request || (note && note.toLowerCase().includes('lottery')) || (receiver_upi && receiver_upi.includes('refund'));
      return {
        risk_score: is_collect_request ? 95 : isHigh ? 88 : 20,
        risk_level: is_collect_request || isHigh ? 'High' : 'Low',
        category: is_collect_request ? 'Collect Trap' : 'P2P Transfer',
        scam_pattern: is_collect_request ? 'UPI Collect Scam' : 'Standard Transfer',
        triggers: is_collect_request ? ['UPI Collect request will debit money'] : [],
        ai_explanation: is_collect_request
          ? 'CRITICAL ALERT: This is a UPI Collect request. Approving this will immediately deduct money from your account.'
          : 'Standard transaction verified against baseline security heuristics.',
        recommendations: is_collect_request
          ? ['Reject this collect request immediately. Entering your UPI PIN will send money, not receive it.']
          : ['Proceed with caution and verify the receiver details.'],
      };
    }
  },

  /**
   * Perform comprehensive AI + Heuristic Message / Screenshot Analysis
   */
  async analyzeMessage(content: string, source: 'sms' | 'whatsapp' | 'screenshot' | 'manual' = 'sms'): Promise<MessageAnalysisResult> {
    try {
      const res = await fetch('/api/analyze-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, source }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      return {
        risk_score: Number(data.risk_score) || 20,
        verdict: data.verdict || (data.risk_score >= 70 ? 'Dangerous Fraud' : data.risk_score >= 35 ? 'Suspicious' : 'Safe'),
        flags: Array.isArray(data.flags) ? data.flags : [],
        psychological_triggers: Array.isArray(data.psychological_triggers) ? data.psychological_triggers : [],
        explanation: data.explanation || 'Message analysis complete.',
        extracted_entities: {
          phone_numbers: data.extracted_entities?.phone_numbers || [],
          upi_ids: data.extracted_entities?.upi_ids || [],
          links: data.extracted_entities?.links || [],
        },
        safe_action_steps: Array.isArray(data.safe_action_steps)
          ? data.safe_action_steps
          : ['Do not share OTP or click unverified links.'],
      };
    } catch (err) {
      console.warn('Backend /api/analyze-message error, falling back:', err);
      const isUrgent = content.toLowerCase().includes('electricity') || content.toLowerCase().includes('lottery') || content.toLowerCase().includes('blocked');
      return {
        risk_score: isUrgent ? 90 : 25,
        verdict: isUrgent ? 'Dangerous Fraud' : 'Safe',
        flags: isUrgent ? ['Urgent Payment Demand / Threat'] : ['No obvious red flags'],
        psychological_triggers: isUrgent ? ['Urgency & Fear'] : ['Neutral tone'],
        explanation: isUrgent
          ? 'The message attempts to exploit fear or urgency to rush you into making a hasty financial transfer or clicking a link.'
          : 'No critical scam patterns detected.',
        extracted_entities: {
          phone_numbers: content.match(/\b[6-9]\d{9}\b/g) || [],
          upi_ids: content.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g) || [],
          links: content.match(/https?:\/\/[^\s]+/g) || [],
        },
        safe_action_steps: ['Never call numbers given inside unsolicited SMS.'],
      };
    }
  },

  /**
   * Generate formal Cyber Crime & Bank Dispute Incident Report
   */
  async generateIncidentReport(data: {
    victim_name: string;
    victim_phone: string;
    scammer_upi: string;
    scammer_phone: string;
    amount_lost: number;
    incident_date: string;
    platform: string;
    bank_reference_no: string;
    fraud_category: string;
    incident_description: string;
  }): Promise<string> {
    try {
      const res = await fetch('/api/generate-incident-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('API failed');
      const json = await res.json();
      return json.report_text || '';
    } catch (err) {
      console.warn('Report generation fallback:', err);
      return `NATIONAL CYBER CRIME REPORTING PORTAL & BANK COMPLAINT
Reference: UPG-${Date.now().toString().slice(-6)}
Complainant: ${data.victim_name} (${data.victim_phone})
Date: ${data.incident_date}
Defrauded Amount: ₹${data.amount_lost}
UPI Platform: ${data.platform}
UTR/Reference: ${data.bank_reference_no || 'Pending Statement'}
Suspect UPI ID: ${data.scammer_upi}
Suspect Phone: ${data.scammer_phone}
Category: ${data.fraud_category}

Description:
${data.incident_description}

Demand: Immediate account freeze under RBI unauthorized electronic transaction guidelines and registration under IT Act Section 66D.`;
    }
  },
};
