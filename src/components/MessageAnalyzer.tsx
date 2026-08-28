import React, { useState } from 'react';
import {
  MessageSquareWarning,
  Upload,
  Sparkles,
  AlertOctagon,
  ShieldCheck,
  ShieldAlert,
  FileImage,
  Copy,
  Check,
  LifeBuoy,
  RefreshCw,
  Phone,
  Link,
  Shield,
  Zap,
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { RiskEngine } from '../lib/riskEngine';
import { DataStore } from '../lib/supabase';
import { MessageAnalysisResult, AnalyzedMessage } from '../types';

interface MessageAnalyzerProps {
  onGoToRecovery?: () => void;
}

export const MessageAnalyzer: React.FC<MessageAnalyzerProps> = ({ onGoToRecovery }) => {
  const [inputText, setInputText] = useState('');
  const [source, setSource] = useState<'sms' | 'whatsapp' | 'screenshot' | 'manual'>('sms');

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');

  // AI analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MessageAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Pre-configured scam scenarios for 1-click test
  const sampleScenarios = [
    {
      title: '⚡ Electricity Bill Threat',
      type: 'sms' as const,
      text: 'Dear consumer, your electricity power will be disconnected tonight at 9:30 PM because your previous month bill was not updated. Please immediately contact our Electricity Officer at 9811223344 or pay via UPI to avoid disconnection.',
    },
    {
      title: '🎁 KBC Lottery Prize',
      type: 'whatsapp' as const,
      text: 'Congratulations! You won ₹25,00,000 in KBC Lucky Draw 2026. Send ₹1,500 government tax processing fee via UPI to lottery.rbi.tax@paytm to claim check instantly.',
    },
    {
      title: '🏦 Bank KYC Account Suspension',
      type: 'sms' as const,
      text: 'Dear Customer, Your SBI YONO Account will be blocked today within 24 hours due to pending KYC verification. Please click here http://sbi-kyc-update.apk or contact Manager at 9123456789 to update PAN card immediately.',
    },
    {
      title: '💼 Work From Home YouTube Task',
      type: 'whatsapp' as const,
      text: 'Part time job offer! Earn ₹3,000 to ₹8,000 daily by simply liking YouTube videos and rating hotels on Google Maps. No experience needed. Join Telegram channel @fastcash_india and deposit ₹500 refundable security fee to start.',
    },
  ];

  // Run OCR with Tesseract.js on uploaded screenshot
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrProgress(10);
    setOcrStatus('Initializing OCR engine...');
    setSource('screenshot');

    try {
      const worker = await createWorker('eng');
      setOcrProgress(40);
      setOcrStatus('Recognizing text in screenshot...');

      const ret = await worker.recognize(file);
      setOcrProgress(90);
      setOcrStatus('Text extracted successfully!');

      const extracted = ret.data.text.trim();
      setInputText(extracted);
      await worker.terminate();

      setOcrLoading(false);
      setOcrProgress(100);

      // Auto-trigger Gemini analysis if meaningful text found
      if (extracted.length > 10) {
        handleAnalyze(extracted, 'screenshot');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setOcrStatus('OCR failed to parse image. You can paste the text manually.');
      setOcrLoading(false);
    }
  };

  const handleAnalyze = async (textToAnalyze?: string, customSource?: typeof source) => {
    const text = (textToAnalyze || inputText).trim();
    if (!text) return;

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await RiskEngine.analyzeMessage(text, customSource || source);
      setAnalysisResult(result);

      // Save to Supabase / Local storage
      DataStore.addMessage({
        user_id: DataStore.getProfile().id,
        content: text,
        risk_score: result.risk_score,
        verdict: result.verdict,
        flags: result.flags,
        psychological_triggers: result.psychological_triggers,
        explanation: result.explanation,
        source: customSource || source,
        extracted_entities: result.extracted_entities,
        safe_action_steps: result.safe_action_steps,
      });
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const copyBreakdown = () => {
    if (!analysisResult) return;
    const text = `UPI GUARDIAN FRAUD BREAKDOWN:
Verdict: ${analysisResult.verdict} (Risk: ${analysisResult.risk_score}/100)
Detected Flags: ${analysisResult.flags.join(', ')}
Psychological Triggers: ${analysisResult.psychological_triggers.join(', ')}
Explanation: ${analysisResult.explanation}
Safe Action Steps:
${analysisResult.safe_action_steps.map((s) => `- ${s}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00d2ff]/10 border border-[#00d2ff]/20 text-[#00d2ff] text-[10px] font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#00d2ff]" />
          <span>Tesseract OCR & Gemini 1.5/3.7 Flash Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          AI Message & Screenshot Fraud Analyzer
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
          Paste suspicious SMS/WhatsApp messages or upload screenshot images. Our AI brain exposes psychological urgency triggers, fake customer care traps, and malicious phishing payloads.
        </p>
      </div>

      {/* Quick Scenario Buttons */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Try Common Indian Cyber Scam Templates:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sampleScenarios.map((sc, i) => (
            <button
              key={i}
              onClick={() => {
                setInputText(sc.text);
                setSource(sc.type);
                handleAnalyze(sc.text, sc.type);
              }}
              className="p-3 rounded-2xl bg-[#16161c] hover:bg-[#1f1f27] border border-white/5 text-left transition-all hover:border-white/10 flex items-center justify-between group"
            >
              <span className="text-xs font-bold text-slate-300 group-hover:text-[#00d2ff] transition-colors">
                {sc.title}
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                {sc.type}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Input Box & Screenshot Upload */}
      <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
        {/* Source selector & OCR Upload Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Message Source:</span>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
              {(['sms', 'whatsapp', 'screenshot', 'manual'] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => setSource(src)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase transition-colors ${
                    source === src
                      ? 'bg-[#6735e8] text-white shadow-[0_0_10px_rgba(103,53,232,0.4)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          {/* Screenshot OCR upload input */}
          <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#00d2ff] text-xs font-semibold cursor-pointer transition-colors">
            <FileImage className="w-4 h-4 text-[#00d2ff]" />
            <span>Upload Screenshot (OCR)</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* OCR Progress banner */}
        {ocrLoading && (
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#00d2ff]">
              <span className="font-semibold">{ocrStatus}</span>
              <span>{ocrProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00d2ff] transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Text Area */}
        <div className="space-y-1.5">
          <textarea
            id="message-analyzer-textarea"
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste text here... e.g. 'Dear customer, your power will be disconnected at 9:30 PM, call 9811223344' or upload screenshot above."
            className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-white placeholder-slate-500 focus:outline-none focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] text-sm leading-relaxed"
          />
        </div>

        {/* Submit button */}
        <button
          id="message-analyzer-submit-btn"
          disabled={analyzing || !inputText.trim()}
          onClick={() => handleAnalyze()}
          className="w-full py-3.5 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(103,53,232,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
        >
          {analyzing ? (
            <>
              <Sparkles className="w-4 h-4 text-[#00d2ff] animate-spin" />
              <span>Analyzing Psychological Triggers with Gemini AI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#00d2ff]" />
              <span>Run Deep Fraud & Psychological Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* ANALYSIS RESULTS CARD */}
      {analysisResult && (
        <div
          className={`rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 ${
            analysisResult.verdict === 'Dangerous Fraud'
              ? 'bg-[#16161c] border-red-500/30 shadow-red-950/20'
              : analysisResult.verdict === 'Suspicious'
              ? 'bg-[#16161c] border-amber-500/30 shadow-amber-950/20'
              : 'bg-[#16161c] border-emerald-500/30 shadow-emerald-950/20'
          }`}
        >
          {/* Header Verdict */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  analysisResult.verdict === 'Dangerous Fraud'
                    ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                    : analysisResult.verdict === 'Suspicious'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {analysisResult.verdict === 'Dangerous Fraud' ? (
                  <AlertOctagon className="w-7 h-7 animate-pulse" />
                ) : analysisResult.verdict === 'Suspicious' ? (
                  <ShieldAlert className="w-7 h-7" />
                ) : (
                  <ShieldCheck className="w-7 h-7" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white uppercase tracking-wide">
                    {analysisResult.verdict}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/5">
                    Risk: {analysisResult.risk_score}/100
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Evaluated against known Indian cybercrime Modus Operandi
                </p>
              </div>
            </div>

            <button
              onClick={copyBreakdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Report' : 'Copy Breakdown'}</span>
            </button>
          </div>

          {/* Plain Language Breakdown */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00d2ff]">
              <Sparkles className="w-4 h-4 text-[#00d2ff]" />
              <span>Plain-Language Fraud Explanation:</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{analysisResult.explanation}</p>
          </div>

          {/* Psychological Triggers & Flags Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Psychological Triggers */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Psychological Exploitation Triggers</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {analysisResult.psychological_triggers.map((trig, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-400">⚡</span>
                    <span>{trig}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Scam Flags */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Identified Threat Flags</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {analysisResult.flags.map((fl, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-red-400">🚩</span>
                    <span>{fl}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Extracted Entities (Phone, UPI, Links) */}
          {(analysisResult.extracted_entities?.phone_numbers?.length ||
            analysisResult.extracted_entities?.upi_ids?.length ||
            analysisResult.extracted_entities?.links?.length) ? (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 font-mono text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500">Extracted Suspect Entities:</span>
              <div className="flex flex-wrap gap-2">
                {analysisResult.extracted_entities.phone_numbers?.map((ph, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{ph}</span>
                  </span>
                ))}
                {analysisResult.extracted_entities.upi_ids?.map((upi, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-[#6735e8]/10 border border-[#6735e8]/20 text-[#00d2ff] flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>{upi}</span>
                  </span>
                ))}
                {analysisResult.extracted_entities.links?.map((lk, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-1 truncate max-w-xs">
                    <Link className="w-3 h-3" />
                    <span>{lk}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Safe Action Steps & Recovery Link */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#00d2ff]">
              Immediate Safe Action Protocol:
            </h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              {analysisResult.safe_action_steps.map((st, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2">
                  <span className="text-[#00d2ff] font-bold">Step {i + 1}:</span>
                  <span>{st}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Help Actions */}
          {analysisResult.verdict === 'Dangerous Fraud' && onGoToRecovery && (
            <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-red-300 flex items-center gap-1.5">
                  <LifeBuoy className="w-3.5 h-3.5" />
                  <span>Did you already click, transfer money, or share OTP?</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Activate Recovery Mode to lock this evidence and secure your account immediately.
                </p>
              </div>
              <button
                onClick={() => {
                  // Save analyzed message to Evidence Locker
                  DataStore.addEvidence({
                    user_id: DataStore.getProfile().id,
                    title: `Scam SMS Analysis (${analysisResult.verdict})`,
                    type: 'sms',
                    content: `Content: ${inputText}\nVerdict: ${analysisResult.verdict} (${analysisResult.risk_score}/100)\nExplanation: ${analysisResult.explanation}\nExtracted Entities: ${JSON.stringify(analysisResult.extracted_entities)}`,
                    tags: ['Scam SMS', 'Urgency', 'Gemini Analyzed'],
                  });
                  onGoToRecovery();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <LifeBuoy className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Enter Post-Fraud Recovery Mode</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
