import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Initialize Gemini SDK with User-Agent telemetry
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in environment. Fallback heuristics will be active.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "dummy-key",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper for heuristic transaction fallback if API is unreachable or key missing
function getTransactionHeuristic(receiverName: string, receiverUpi: string, amount: number, note: string, isCollect: boolean) {
  const noteLower = (note || "").toLowerCase();
  const upiLower = (receiverUpi || "").toLowerCase();
  const nameLower = (receiverName || "").toLowerCase();

  let riskScore = 15;
  const triggers: string[] = [];
  let scamPattern = "Standard Transfer";

  if (isCollect) {
    riskScore = 95;
    triggers.push("Collect Request Trap - This will DEBIT money from your bank account, NOT receive money!");
    scamPattern = "UPI Collect Scam";
  }

  if (noteLower.includes("lottery") || noteLower.includes("prize") || noteLower.includes("won") || noteLower.includes("cashback")) {
    riskScore = Math.max(riskScore, 90);
    triggers.push("Cashback / Lottery Bait keyword in transaction note");
    scamPattern = "Advance Fee / Lottery Scam";
  }

  if (upiLower.includes("refund") || upiLower.includes("customercare") || upiLower.includes("helpline") || upiLower.includes("support") || nameLower.includes("customer care")) {
    riskScore = Math.max(riskScore, 92);
    triggers.push("Fake Customer Care / Refund impersonation in UPI ID");
    scamPattern = "Fake Customer Care Impersonation";
  }

  if (upiLower.includes("olx") || noteLower.includes("olx") || noteLower.includes("advance") || noteLower.includes("courier fee") || noteLower.includes("armyman")) {
    riskScore = Math.max(riskScore, 85);
    triggers.push("Second-hand marketplace advance fee indicator");
    scamPattern = "OLX / Marketplace Advance Scam";
  }

  if (noteLower.includes("electricity") || noteLower.includes("bill") || noteLower.includes("disconnection") || noteLower.includes("urgent")) {
    if (amount > 100 && !upiLower.includes("billdesk") && !upiLower.includes("bbps")) {
      riskScore = Math.max(riskScore, 88);
      triggers.push("Unverified utility payment destination without BBPS integration");
      scamPattern = "Electricity Disconnection Threat";
    }
  }

  if (amount > 50000) {
    riskScore = Math.min(100, riskScore + 15);
    triggers.push("High value single transfer requires multi-factor caution");
  }

  const riskLevel = riskScore >= 70 ? "High" : riskScore >= 35 ? "Medium" : "Low";
  let explanation = "This transaction appears to be a normal recipient transfer with standard UPI parameters.";
  if (riskLevel === "High") {
    explanation = `High risk detected. ${triggers.join(". ")}. Fraudsters frequently use this pattern to trick victims into sending funds or approving fraudulent collect requests.`;
  } else if (riskLevel === "Medium") {
    explanation = `Moderate caution advised. Verify recipient identity before authenticating with your secret UPI PIN.`;
  }

  return {
    risk_score: riskScore,
    risk_level: riskLevel,
    category: scamPattern,
    scam_pattern: scamPattern,
    triggers,
    ai_explanation: explanation,
    recommendations: riskLevel === "High" ? [
      "DO NOT enter your UPI PIN. Entering your PIN always sends money, never receives it.",
      "Check official customer support numbers from verified apps, not search engine ads.",
      "Block and report this UPI ID immediately on the NPCI portal."
    ] : [
      "Ensure you recognize the beneficiary name before proceeding.",
      "Never share your UPI PIN or OTP over call or screen sharing apps (AnyDesk, TeamViewer)."
    ]
  };
}

// 1. Transaction Risk Analysis Endpoint
app.post("/api/analyze-transaction", async (req, res) => {
  try {
    const { receiver_name, receiver_upi, amount, note, is_collect_request } = req.body;
    const cleanAmount = Number(amount) || 0;
    const cleanUpi = String(receiver_upi || "").trim();
    const cleanName = String(receiver_name || "").trim();
    const cleanNote = String(note || "").trim();
    const isCollect = Boolean(is_collect_request);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = getTransactionHeuristic(cleanName, cleanUpi, cleanAmount, cleanNote, isCollect);
      return res.json(fallback);
    }

    const ai = getGeminiClient();
    const prompt = `You are UPI Guardian's Core Fraud Detection Risk Engine. Analyze this upcoming UPI transaction:
- Recipient Name: "${cleanName}"
- Recipient UPI ID / VPA: "${cleanUpi}"
- Amount (INR): ₹${cleanAmount}
- Transaction Note/Remarks: "${cleanNote}"
- Request Type: ${isCollect ? "COLLECT REQUEST (Debits user's bank account!)" : "PAY REQUEST"}

Evaluate risk factors specific to the Indian UPI ecosystem:
1. Is this a Collect Request trap (claiming to send money but actually debiting)?
2. Is the UPI ID spoofing official entities (e.g. fake "customercare", "refunddesk", "electricityboard", "lottery", "amazonhelp" on personal handles like @ybl, @paytm, @okaxis)?
3. Are there psychological pressure triggers in the note (e.g., "Electricity Disconnect today", "Lottery tax ₹500", "OLX booking fee", "KYC update")?
4. Is it a known scam pattern (e.g., OLX Army officer scam, Fake customer care, Advance fee scam, Overpayment refund scam, Work-from-home task deposit)?

Return ONLY valid JSON matching this structure:
{
  "risk_score": <number 0-100, where 0-30 is Safe, 31-65 is Medium caution, 66-100 is High Risk Scam>,
  "risk_level": "<Low | Medium | High>",
  "category": "<e.g. P2P Transfer, Fake Customer Care, Utility Threat, Collect Trap, Marketplace Scam, Lottery/Gift>",
  "scam_pattern": "<Specific identified scam modus operandi or 'Legitimate Transaction'>",
  "triggers": ["<list of specific red flags found>"],
  "ai_explanation": "<Clear, plain-language 2-3 sentence explanation explaining EXACTLY why this is safe or dangerous to a non-technical user>",
  "recommendations": ["<actionable advice 1>", "<actionable advice 2>"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const text = response.text || "";
    try {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (parseError) {
      console.error("JSON parse error from Gemini:", parseError, text);
      const fallback = getTransactionHeuristic(cleanName, cleanUpi, cleanAmount, cleanNote, isCollect);
      return res.json(fallback);
    }
  } catch (error) {
    console.error("Error in /api/analyze-transaction:", error);
    const { receiver_name, receiver_upi, amount, note, is_collect_request } = req.body || {};
    const fallback = getTransactionHeuristic(receiver_name, receiver_upi, Number(amount) || 0, note, Boolean(is_collect_request));
    return res.json(fallback);
  }
});

// Helper for heuristic message analysis fallback
function getMessageHeuristic(text: string) {
  const lower = text.toLowerCase();
  let score = 15;
  const flags: string[] = [];
  const triggers: string[] = [];

  if (lower.includes("electricity") && (lower.includes("disconnected") || lower.includes("tonight") || lower.includes("power"))) {
    score = Math.max(score, 94);
    flags.push("Electricity Disconnection Threat");
    triggers.push("Urgency & Fear: Threatening to cut power within hours");
  }
  if (lower.includes("lottery") || lower.includes("won") || lower.includes("crore") || lower.includes("kbc") || lower.includes("lucky draw") || lower.includes("cash prize")) {
    score = Math.max(score, 96);
    flags.push("Lottery / Fake Prize Bait");
    triggers.push("Greed: False promise of massive unexpected windfall");
  }
  if (lower.includes("kyc") || lower.includes("pan") || lower.includes("blocked") || lower.includes("suspended") || lower.includes("yono") || lower.includes("sbi")) {
    score = Math.max(score, 92);
    flags.push("Fake Bank KYC Phishing");
    triggers.push("Fear: Threatening bank account or SIM block");
  }
  if (lower.includes("part time") || lower.includes("telegram") || lower.includes("like youtube") || lower.includes("daily 5000") || lower.includes("task job")) {
    score = Math.max(score, 90);
    flags.push("Work From Home Task Scam");
    triggers.push("Greed & Coercion: Fake rating tasks requesting prepaid deposits");
  }
  if (lower.includes("enter upi pin") || lower.includes("collect request") || lower.includes("scan qr to receive")) {
    score = Math.max(score, 98);
    flags.push("UPI PIN Receive Trap");
    triggers.push("Deception: Claiming you must enter PIN or scan QR to receive funds");
  }
  if (lower.includes("http://") || lower.includes("bit.ly") || lower.includes(".apk") || lower.includes("tinyurl")) {
    score = Math.min(100, score + 20);
    flags.push("Suspicious Shortlink or APK download");
  }

  const verdict = score >= 70 ? "Dangerous Fraud" : score >= 35 ? "Suspicious" : "Safe";
  return {
    risk_score: score,
    verdict,
    flags: flags.length > 0 ? flags : ["No critical scam keywords found"],
    psychological_triggers: triggers.length > 0 ? triggers : ["Normal communication tone"],
    explanation: score >= 70
      ? "This message uses classic fraud tactics (urgent threats or lottery incentives) to trick you into clicking malicious links or transferring money."
      : "No overt fraudulent indicators detected, but always verify sender credentials before sharing sensitive information.",
    extracted_entities: {
      phone_numbers: text.match(/\b[6-9]\d{9}\b/g) || [],
      upi_ids: text.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g) || [],
      links: text.match(/https?:\/\/[^\s]+/g) || [],
    },
    safe_action_steps: [
      "Do NOT click any links or download attached APK files.",
      "Never call the phone number provided inside the SMS.",
      "Forward fraudulent SMS to 1909 (Do Not Disturb) and report to Cyber Crime Helpline 1930."
    ]
  };
}

// 2. AI Message Analyzer (SMS / WhatsApp / OCR Screenshot) Endpoint
app.post("/api/analyze-message", async (req, res) => {
  try {
    const { content, source } = req.body;
    const textContent = String(content || "").trim();

    if (!textContent) {
      return res.status(400).json({ error: "Message content is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = getMessageHeuristic(textContent);
      return res.json(fallback);
    }

    const ai = getGeminiClient();
    const prompt = `You are UPI Guardian's expert Cyber Fraud & Social Engineering Analyzer.
Analyze the following text received via ${source || "SMS/WhatsApp/Screenshot"}:

--- MESSAGE TEXT START ---
${textContent}
--- MESSAGE TEXT END ---

Analyze specifically for Indian cyber fraud and UPI scam vectors:
1. Psychological Triggers:
   - Urgency: "Electricity cut at 9:30 PM", "SIM deactivation in 24 hours", "Immediate payment required"
   - Fear / Intimidation: "Police FIR issued", "Bank account suspended", "CBI / Cyber Cell warrant"
   - Greed: "KBC Lottery ₹25 Lakhs", "Free iPhone giveaway", "Work-from-home ₹3000/day by liking videos"
2. Modus Operandi & Traps:
   - "Collect Request" trap (asking victim to enter UPI PIN to 'receive' money or refund)
   - Fake customer care impersonation (fake helpline numbers for GPay, PhonePe, Paytm, Swiggy, Zomato, Airlines)
   - Malicious APK drop (asking to download 'SBI Support.apk', 'Electricity_Update.apk')
   - Screen-sharing tool coaxing (AnyDesk, TeamViewer, RustDesk)
   - Phishing web links or short URLs (bit.ly, ngrok, tinyurl)

Return ONLY valid JSON matching this schema:
{
  "risk_score": <number 0-100, where 0-30 is Safe, 31-65 is Suspicious, 66-100 is Dangerous Fraud>,
  "verdict": "<Safe | Suspicious | Dangerous Fraud>",
  "flags": ["<Specific scam flags detected, e.g. 'Electricity Disconnection Urgency', 'Fake KYC Phishing', 'Collect Trap'>"],
  "psychological_triggers": ["<Identified emotional triggers, e.g. 'Urgency: 2-hour deadline', 'Fear: Account closure threat'>"],
  "explanation": "<Clear, plain-language 2-3 sentence breakdown explaining the exact scam mechanism and why it is deceptive>",
  "extracted_entities": {
    "phone_numbers": ["<extracted suspicious phone numbers or sender IDs>"],
    "upi_ids": ["<extracted UPI IDs or VPAs>"],
    "links": ["<extracted URLs or domains>"]
  },
  "safe_action_steps": [
    "<Step 1 for user safety>",
    "<Step 2 for reporting or blocking>",
    "<Step 3 for securing bank accounts>"
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const rawText = response.text || "";
    try {
      const parsed = JSON.parse(rawText);
      return res.json(parsed);
    } catch (parseErr) {
      console.error("Failed to parse Gemini message analysis:", parseErr, rawText);
      const fallback = getMessageHeuristic(textContent);
      return res.json(fallback);
    }
  } catch (error) {
    console.error("Error in /api/analyze-message:", error);
    const { content } = req.body || {};
    const fallback = getMessageHeuristic(String(content || ""));
    return res.json(fallback);
  }
});

// 3. Incident Report Generator for Cyber Crime Portal & Bank Grievance
app.post("/api/generate-incident-report", async (req, res) => {
  try {
    const {
      victim_name,
      victim_phone,
      scammer_upi,
      scammer_phone,
      amount_lost,
      incident_date,
      platform,
      bank_reference_no,
      fraud_category,
      incident_description,
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallbackReport = `=====================================================
NATIONAL CYBER CRIME REPORTING PORTAL (1930) & BANK COMPLAINT
INCIDENT FORM: UPI FRAUD GRIEVANCE
=====================================================
Date of Filing: ${new Date().toLocaleDateString("en-IN")}
Incident Reference: UPG-${Date.now().toString().slice(-8)}

1. VICTIM DETAILS:
- Complainant Name: ${victim_name || "Anonymous User"}
- Registered Mobile: ${victim_phone || "Not Provided"}

2. TRANSACTION & FRAUD SPECIFICS:
- Date & Time of Incident: ${incident_date || new Date().toISOString()}
- Amount Defrauded: INR ₹${amount_lost || 0}
- Payment App Used: ${platform || "UPI"}
- Bank UTR / Reference No: ${bank_reference_no || "Pending Bank Statement"}
- Beneficiary (Scammer) UPI ID: ${scammer_upi || "Unknown"}
- Suspect Contact/Phone: ${scammer_phone || "Not Available"}
- Fraud Category: ${fraud_category || "Social Engineering UPI Scam"}

3. DETAILED CHRONOLOGY OF EVENT:
${incident_description || "The victim was approached under false pretenses and coerced into authorizing an unauthorized transaction."}

4. LEGAL PROVISIONS & RECOVERY REQUEST:
- Request for urgent debit freeze / lien on beneficiary account under RBI Circular on Limiting Liability of Customers in Unauthorized Electronic Banking Transactions.
- FIR registration under Section 66D of Information Technology Act, 2000 (Cheating by personation using computer resource) and Section 420 of IPC / BNS.

Report generated by UPI Guardian Fraud Defense Engine.`;
      return res.json({ report_text: fallbackReport });
    }

    const ai = getGeminiClient();
    const prompt = `You are a Legal and Cybercrime Incident Specialist for the Indian National Cyber Crime Reporting Portal (cybercrime.gov.in) and Banking Ombudsman.
Generate a formal, high-standard Fraud Incident Complaint & Bank Chargeback Letter for the following victim case:

Victim Information:
- Name: ${victim_name || "Complainant"}
- Phone: ${victim_phone || "N/A"}
- Defrauded Amount: ₹${amount_lost || "0"}
- Date of Incident: ${incident_date || new Date().toLocaleDateString("en-IN")}
- UPI App: ${platform || "UPI"}
- Bank Reference Number (UTR): ${bank_reference_no || "Pending statement"}
- Suspect's UPI ID: ${scammer_upi || "N/A"}
- Suspect's Contact: ${scammer_phone || "N/A"}
- Fraud Type: ${fraud_category || "UPI Fraud"}
- Description: ${incident_description || "Coerced transaction via deceptive social engineering."}

Draft a comprehensive, legally sound 4-part official document:
1. FORMAL POLICE / CYBER CRIME CELL COMPLAINT (Citing IT Act 2000 Section 66D & IPC/BNS provisions)
2. IMMEDIATE BANK DISPUTE & CHARGEBACK NOTICE (Citing RBI Circular on Customer Protection in Unauthorized Electronic Banking Transactions)
3. CHRONOLOGICAL SUMMARY OF EVIDENCE
4. STEP-BY-STEP IMMEDIATE ACTION CHECKLIST FOR THE VICTIM (Golden Hour actions, 1930 registration, freezing UPI ID)

Make it professional, unambiguous, ready to be printed or submitted directly.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
    });

    const reportText = response.text || "";
    return res.json({ report_text: reportText });
  } catch (err) {
    console.error("Error in /api/generate-incident-report:", err);
    res.status(500).json({ error: "Failed to generate incident report" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "UPI Guardian Backend",
    gemini_configured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Setup Vite middleware for development or static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`UPI Guardian Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
