import React, { useState } from 'react';
import {
  Send,
  ShieldCheck,
  AlertOctagon,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  UserCheck,
  Lock,
  Users,
  Eye,
} from 'lucide-react';
import { RiskEngine } from '../lib/riskEngine';
import { DataStore } from '../lib/supabase';
import { RiskAnalysisResult, Transaction } from '../types';
import { TrustedPersonConfirmationModal } from './TrustedPersonConfirmationModal';
import { ScamTimelineModal } from './ScamTimelineModal';
import confetti from 'canvas-confetti';

interface SendMoneyFlowProps {
  onCompleted?: () => void;
}

type Step = 'input' | 'analyzing' | 'verdict' | 'confirmation';

export const SendMoneyFlow: React.FC<SendMoneyFlowProps> = ({ onCompleted }) => {
  const [step, setStep] = useState<Step>('input');

  // Form inputs
  const [receiverName, setReceiverName] = useState('');
  const [receiverUpi, setReceiverUpi] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Peer to Peer');
  const [note, setNote] = useState('');
  const [isCollect, setIsCollect] = useState(false);

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysisResult | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisMessage, setAnalysisMessage] = useState('Initializing AI Risk Engine...');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastCreatedTx, setLastCreatedTx] = useState<Transaction | null>(null);

  // New Safety Feature Modals
  const [showTrustedPersonModal, setShowTrustedPersonModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  // Quick preset test cases
  const applyPreset = (preset: {
    name: string;
    upi: string;
    amount: string;
    category: string;
    note: string;
    isCollect: boolean;
  }) => {
    setReceiverName(preset.name);
    setReceiverUpi(preset.upi);
    setAmount(preset.amount);
    setCategory(preset.category);
    setNote(preset.note);
    setIsCollect(preset.isCollect);
  };

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverName || !receiverUpi || !amount) {
      setErrorMsg('Please fill in Receiver Name, UPI ID, and Amount.');
      return;
    }
    setErrorMsg('');
    setStep('analyzing');
    setAnalysisProgress(15);
    setAnalysisMessage('Interrogating VPA handle reputation & fraud database...');

    const timer1 = setTimeout(() => {
      setAnalysisProgress(45);
      setAnalysisMessage('Analyzing transaction note for psychological pressure & urgency cues...');
    }, 600);

    const timer2 = setTimeout(() => {
      setAnalysisProgress(75);
      setAnalysisMessage('Evaluating payment mode (Pay vs Collect Request trap)...');
    }, 1200);

    try {
      const result = await RiskEngine.analyzeTransaction({
        receiver_name: receiverName,
        receiver_upi: receiverUpi,
        amount: Number(amount) || 0,
        note,
        is_collect_request: isCollect,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      setAnalysisProgress(100);
      setAnalysisResult(result);
      setStep('verdict');
    } catch (err) {
      console.error('Analysis error:', err);
      clearTimeout(timer1);
      clearTimeout(timer2);
      setErrorMsg('Risk evaluation encountered an error. Please retry.');
      setStep('input');
    }
  };

  // Final actions
  const handleProceedPayment = () => {
    if (!analysisResult) return;

    const newTx = DataStore.addTransaction({
      user_id: DataStore.getProfile().id,
      receiver_name: receiverName,
      receiver_upi: receiverUpi,
      amount: Number(amount) || 0,
      category: analysisResult.category || category,
      risk_score: analysisResult.risk_score,
      risk_level: analysisResult.risk_level,
      ai_explanation: analysisResult.ai_explanation,
      status: 'completed',
      is_collect_request: isCollect,
      note,
      triggers: analysisResult.triggers,
      scam_pattern: analysisResult.scam_pattern,
      recommendations: analysisResult.recommendations,
    });

    setLastCreatedTx(newTx);
    setStep('confirmation');
  };

  const handleCancelScam = () => {
    if (!analysisResult) return;

    const newTx = DataStore.addTransaction({
      user_id: DataStore.getProfile().id,
      receiver_name: receiverName,
      receiver_upi: receiverUpi,
      amount: Number(amount) || 0,
      category: analysisResult.category || category,
      risk_score: analysisResult.risk_score,
      risk_level: analysisResult.risk_level,
      ai_explanation: analysisResult.ai_explanation,
      status: 'cancelled',
      is_collect_request: isCollect,
      note,
      triggers: analysisResult.triggers,
      scam_pattern: analysisResult.scam_pattern,
      recommendations: analysisResult.recommendations,
    });

    setLastCreatedTx(newTx);

    // Trigger celebration confetti for avoiding a fraud scam
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6735e8', '#00f0ff', '#10b981'],
      });
    } catch (e) {
      // ignore
    }

    setStep('confirmation');
  };

  const resetForm = () => {
    setReceiverName('');
    setReceiverUpi('');
    setAmount('');
    setNote('');
    setIsCollect(false);
    setAnalysisResult(null);
    setLastCreatedTx(null);
    setStep('input');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header & Step progress tracker */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6735e8]/10 border border-[#6735e8]/20 text-[#6735e8] text-[10px] font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#00d2ff]" />
          <span>Explain Before You Pay</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Send Money AI Pre-Check</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Verify payee authenticity and detect disguised collect requests before entering your secret UPI PIN.
        </p>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <div className={`flex items-center gap-1.5 text-xs font-bold ${step === 'input' ? 'text-[#00d2ff]' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'input' ? 'bg-[#00d2ff] text-black' : 'bg-white/10 text-white'}`}>1</span>
            <span>Details</span>
          </div>
          <span className="text-slate-700">―</span>
          <div className={`flex items-center gap-1.5 text-xs font-bold ${step === 'analyzing' ? 'text-[#00d2ff]' : step === 'verdict' || step === 'confirmation' ? 'text-slate-300' : 'text-slate-600'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'analyzing' ? 'bg-[#00d2ff] text-black' : step === 'verdict' || step === 'confirmation' ? 'bg-[#6735e8] text-white' : 'bg-white/5 text-slate-500'}`}>2</span>
            <span>AI Interrogation</span>
          </div>
          <span className="text-slate-700">―</span>
          <div className={`flex items-center gap-1.5 text-xs font-bold ${step === 'verdict' ? 'text-[#00d2ff]' : step === 'confirmation' ? 'text-slate-300' : 'text-slate-600'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'verdict' ? 'bg-[#00d2ff] text-black' : step === 'confirmation' ? 'bg-[#6735e8] text-white' : 'bg-white/5 text-slate-500'}`}>3</span>
            <span>Risk Verdict</span>
          </div>
        </div>
      </div>

      {/* STEP 1: INPUT FORM */}
      {step === 'input' && (
        <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Quick Presets for Easy Demo & Testing */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Quick Test Scenarios (Click to Load):
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    name: 'Tata Power Electricity Board Helpline',
                    upi: 'tatapower.billdesk.urgent@ybl',
                    amount: '4200',
                    category: 'Utility Threat',
                    note: 'Pay bill immediately to prevent power cut tonight',
                    isCollect: false,
                  })
                }
                className="px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-[11px] font-medium transition-colors"
              >
                ⚡ Fake Electricity Threat (High Risk)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    name: 'OLX Buyer Col. Arvind Sharma',
                    upi: 'defence.canteen.pay@okaxis',
                    amount: '12000',
                    category: 'Marketplace Scam',
                    note: 'Enter UPI PIN to receive ₹12,000 advance for Sofa',
                    isCollect: true,
                  })
                }
                className="px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-[11px] font-medium transition-colors"
              >
                🪖 OLX Collect Trap (Scam)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    name: 'Swiggy Food Delivery',
                    upi: 'swiggy.orders@icici',
                    amount: '450',
                    category: 'E-commerce',
                    note: 'Order #SW-88192 Biryani',
                    isCollect: false,
                  })
                }
                className="px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium transition-colors"
              >
                🍔 Safe Food Order (Low Risk)
              </button>
            </div>
          </div>

          <form onSubmit={handleStartAnalysis} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Recipient Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Payee / Beneficiary Name <span className="text-red-400">*</span>
              </label>
              <input
                id="send-receiver-name-input"
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="e.g. Rahul Verma or Amazon Customer Care"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 focus:outline-none focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] text-sm"
              />
            </div>

            {/* UPI ID / VPA */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Receiver UPI ID (VPA) or Mobile Number <span className="text-red-400">*</span>
              </label>
              <input
                id="send-receiver-upi-input"
                type="text"
                value={receiverUpi}
                onChange={(e) => setReceiverUpi(e.target.value)}
                placeholder="e.g. rahul@okaxis, support.refund@paytm, 9876543210@ybl"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] text-sm"
              />
            </div>

            {/* Amount & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Amount (INR ₹) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₹</span>
                  <input
                    id="send-amount-input"
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-white font-extrabold text-lg placeholder-slate-500 focus:outline-none focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Transaction Category</label>
                <select
                  id="send-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-white text-sm focus:outline-none focus:border-[#00d2ff]"
                >
                  <option value="Peer to Peer" className="bg-[#16161c]">Peer to Peer (Friend / Family)</option>
                  <option value="E-commerce" className="bg-[#16161c]">E-commerce / Merchant</option>
                  <option value="Marketplace Scam" className="bg-[#16161c]">Second-hand Goods (OLX / Quikr / FB)</option>
                  <option value="Utility Threat" className="bg-[#16161c]">Electricity / Water / Gas Bill</option>
                  <option value="Customer Care" className="bg-[#16161c]">Customer Care / Refund</option>
                  <option value="Lottery/Reward" className="bg-[#16161c]">Lottery / Cashback Prize</option>
                  <option value="Other" className="bg-[#16161c]">Other / Unknown</option>
                </select>
              </div>
            </div>

            {/* Transaction Note / Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Payment Remarks / Instructions Note
              </label>
              <input
                id="send-note-input"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Advance fee for courier, urgent power bill, refund processing"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 focus:outline-none focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] text-sm"
              />
              <p className="text-[11px] text-slate-500">
                AI analyzes language for urgency cues, intimidation, or fake refund terms.
              </p>
            </div>

            {/* Collect Request Checkbox */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Is this a "Collect / Request Money" notification?</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Enable if this was requested by someone claiming to send you funds.
                </p>
              </div>
              <input
                id="send-is-collect-checkbox"
                type="checkbox"
                checked={isCollect}
                onChange={(e) => setIsCollect(e.target.checked)}
                className="w-5 h-5 rounded accent-red-500 cursor-pointer"
              />
            </div>

            <button
              id="send-submit-analysis-btn"
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white font-bold text-xs shadow-[0_0_15px_rgba(103,53,232,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] uppercase tracking-wider"
            >
              <Sparkles className="w-4 h-4 text-[#00d2ff]" />
              <span>Interrogate with Gemini AI Risk Engine</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: AI SCANNING & INTERROGATION ANIMATION */}
      {step === 'analyzing' && (
        <div className="bg-[#16161c] border border-white/5 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full bg-[#00d2ff]/20 animate-ping" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-[#6735e8] to-[#00d2ff] p-1 flex items-center justify-center shadow-lg shadow-[#00d2ff]/30">
              <div className="w-full h-full bg-[#111115] rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#00d2ff] animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white tracking-tight">AI Fraud Interrogation in Progress</h2>
            <p className="text-xs text-[#00d2ff] font-mono animate-pulse">{analysisMessage}</p>
          </div>

          <div className="w-full max-w-md mx-auto bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6735e8] to-[#00d2ff] transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>

          <div className="text-[11px] text-slate-400 space-y-1 font-mono">
            <p>Target VPA: {receiverUpi}</p>
            <p>Declared Amount: ₹{amount}</p>
          </div>
        </div>
      )}

      {/* STEP 3: RISK VERDICT DISPLAY */}
      {step === 'verdict' && analysisResult && (
        <div className="space-y-6">
          {/* Main Risk Alert Banner */}
          <div
            className={`rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 ${
              analysisResult.risk_level === 'High'
                ? 'bg-[#16161c] border-red-500/30 shadow-red-950/20'
                : analysisResult.risk_level === 'Medium'
                ? 'bg-[#16161c] border-amber-500/30 shadow-amber-950/20'
                : 'bg-[#16161c] border-emerald-500/30 shadow-emerald-950/20'
            }`}
          >
            {/* Top Score Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    analysisResult.risk_level === 'High'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                      : analysisResult.risk_level === 'Medium'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {analysisResult.risk_level === 'High' ? (
                    <AlertOctagon className="w-7 h-7 animate-pulse" />
                  ) : analysisResult.risk_level === 'Medium' ? (
                    <ShieldAlert className="w-7 h-7" />
                  ) : (
                    <ShieldCheck className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white uppercase tracking-wide">
                      {analysisResult.risk_level} Risk Verdict
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 font-mono border border-white/5">
                      Risk Score: {analysisResult.risk_score}/100
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Pattern Identified: <strong className="text-slate-200">{analysisResult.scam_pattern}</strong>
                  </p>
                </div>
              </div>

              {/* Amount reminder */}
              <div className="text-right">
                <span className="text-xs text-slate-400">Intended Transfer:</span>
                <p className="text-2xl font-black text-white font-mono">₹{Number(amount).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Plain-Language Explanation (Requirement 4) */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00d2ff]">
                <Sparkles className="w-4 h-4 text-[#00d2ff]" />
                <span>Explain Before You Pay Breakdown:</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {analysisResult.ai_explanation}
              </p>
            </div>

            {/* Red Flags / Triggers */}
            {analysisResult.triggers && analysisResult.triggers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Detected Threat Vectors ({analysisResult.triggers.length})</span>
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {analysisResult.triggers.map((trig, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-red-500/5 border border-red-500/15 text-xs text-red-300 flex items-start gap-2"
                    >
                      <span className="text-red-400 font-bold shrink-0">✕</span>
                      <span>{trig}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#00d2ff] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Actionable Safety Advice</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {analysisResult.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#00d2ff] font-bold">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pre-Payment Safety Features: Trusted Person & Scam Timeline */}
            {(analysisResult.risk_level === 'High' || analysisResult.risk_level === 'Medium' || isCollect) && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1c182a] via-[#16161c] to-[#121216] border border-[#6735e8]/30 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d2ff] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d2ff]"></span>
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      Recommended Protective Actions Before Paying
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6735e8]/20 text-[#00d2ff] border border-[#6735e8]/30">
                    UPI Guardian Safety
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Feature 1: Trusted Person Confirmation */}
                  <button
                    type="button"
                    id="verdict-trusted-person-btn"
                    onClick={() => setShowTrustedPersonModal(true)}
                    className="p-3 rounded-xl bg-[#6735e8]/20 hover:bg-[#6735e8]/30 border border-[#6735e8]/40 hover:border-[#6735e8]/70 text-left transition-all group flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#6735e8] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Users className="w-4 h-4 text-[#00d2ff]" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white group-hover:text-[#00d2ff] transition-colors flex items-center gap-1">
                        <span>Ask Trusted Person</span>
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h5>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        Let family/friend inspect risk breakdown and advise before you decide.
                      </p>
                    </div>
                  </button>

                  {/* Feature 2: Scam Timeline */}
                  <button
                    type="button"
                    id="verdict-scam-timeline-btn"
                    onClick={() => setShowTimelineModal(true)}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-left transition-all group flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Clock className="w-4 h-4 text-[#00d2ff]" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white group-hover:text-[#00d2ff] transition-colors flex items-center gap-1">
                        <span>Visualize Scam Sequence</span>
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h5>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        Trace chronological chain: Lure SMS ➔ Link ➔ New VPA ➔ Panic demand.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Decision Buttons */}
            <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3">
              {analysisResult.risk_level === 'High' ? (
                <>
                  <button
                    id="verdict-block-scam-btn"
                    onClick={handleCancelScam}
                    className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  >
                    <XCircle className="w-5 h-5" />
                    <span>Block & Cancel Fraud (Save ₹{amount})</span>
                  </button>

                  <button
                    id="verdict-override-btn"
                    onClick={handleProceedPayment}
                    className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold border border-white/5 transition-colors"
                  >
                    I Know This Person, Proceed Anyway
                  </button>
                </>
              ) : (
                <>
                  <button
                    id="verdict-proceed-safe-btn"
                    onClick={handleProceedPayment}
                    className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Authorize Safe Payment of ₹{amount}</span>
                  </button>

                  <button
                    onClick={resetForm}
                    className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: FINAL CONFIRMATION / RECEIPT */}
      {step === 'confirmation' && lastCreatedTx && (
        <div className="bg-[#16161c] border border-white/5 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div
            className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
              lastCreatedTx.status === 'cancelled'
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}
          >
            {lastCreatedTx.status === 'cancelled' ? (
              <XCircle className="w-8 h-8" />
            ) : (
              <CheckCircle2 className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              {lastCreatedTx.status === 'cancelled'
                ? 'Transaction Blocked & Scammer Thwarted!'
                : 'Payment Successfully Authenticated'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {lastCreatedTx.status === 'cancelled'
                ? `You successfully prevented a potential loss of ₹${lastCreatedTx.amount.toLocaleString('en-IN')}. Your safety score and savings counter have been updated.`
                : `Verified transfer of ₹${lastCreatedTx.amount.toLocaleString('en-IN')} to ${lastCreatedTx.receiver_name}.`}
            </p>
          </div>

          {/* Mini receipt breakdown */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left text-xs space-y-2 font-mono max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-slate-500">Ref ID:</span>
              <span className="text-slate-200">{lastCreatedTx.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Beneficiary:</span>
              <span className="text-slate-200">{lastCreatedTx.receiver_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">VPA Handle:</span>
              <span className="text-[#00d2ff]">{lastCreatedTx.receiver_upi}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount:</span>
              <span className="text-white font-bold">₹{lastCreatedTx.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Risk Assessment:</span>
              <span className={lastCreatedTx.risk_level === 'High' ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                {lastCreatedTx.risk_level} ({lastCreatedTx.risk_score}/100)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              id="confirmation-new-tx-btn"
              onClick={resetForm}
              className="px-5 py-2.5 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]"
            >
              Analyze Another Transaction
            </button>

            <button
              onClick={() => setShowTimelineModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/5 flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-[#00d2ff]" />
              <span>View Incident Timeline</span>
            </button>

            {onCompleted && (
              <button
                onClick={onCompleted}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/5"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Trusted Person Confirmation Modal */}
      {analysisResult && (
        <TrustedPersonConfirmationModal
          isOpen={showTrustedPersonModal}
          onClose={() => setShowTrustedPersonModal(false)}
          transaction={{
            receiverName,
            receiverUpi,
            amount: Number(amount) || 0,
            riskScore: analysisResult.risk_score,
            riskLevel: analysisResult.risk_level,
            scamPattern: analysisResult.scam_pattern,
            aiExplanation: analysisResult.ai_explanation,
            triggers: analysisResult.triggers,
            isCollect,
            note,
          }}
          onBlockScam={handleCancelScam}
          onProceedAuthorized={handleProceedPayment}
          onOpenScamTimeline={() => {
            setShowTrustedPersonModal(false);
            setShowTimelineModal(true);
          }}
        />
      )}

      {/* 2. Scam Timeline Modal */}
      <ScamTimelineModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        transaction={
          lastCreatedTx || {
            id: 'tx-preview',
            user_id: DataStore.getProfile().id,
            receiver_name: receiverName || 'Suspicious Payee',
            receiver_upi: receiverUpi || 'payee@upi',
            amount: Number(amount) || 0,
            category: analysisResult?.category || category,
            risk_score: analysisResult?.risk_score || 90,
            risk_level: analysisResult?.risk_level || 'High',
            ai_explanation: analysisResult?.ai_explanation || 'Suspicious transaction pattern',
            status: 'flagged',
            is_collect_request: isCollect,
            note,
            triggers: analysisResult?.triggers || [],
            created_at: new Date().toISOString(),
          }
        }
        onConsultTrustedPerson={() => {
          setShowTimelineModal(false);
          setShowTrustedPersonModal(true);
        }}
      />
    </div>
  );
};
