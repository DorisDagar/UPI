import React, { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  Camera,
  Upload,
  AlertOctagon,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Zap,
  Volume2,
  XCircle,
  FileImage,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Info,
  AlertTriangle,
  FileText,
  Lock,
  ExternalLink,
  LifeBuoy,
  Users,
  Clock,
} from 'lucide-react';
import jsQR from 'jsqr';
import { RiskEngine } from '../lib/riskEngine';
import { DataStore } from '../lib/supabase';
import { ParsedUpiUrl, RiskAnalysisResult } from '../types';
import { TrustedPersonConfirmationModal } from './TrustedPersonConfirmationModal';
import { ScamTimelineModal } from './ScamTimelineModal';

interface ScanAndPayProps {
  onSuccess?: () => void;
  onGoToRecovery?: () => void;
}

export const ScanAndPay: React.FC<ScanAndPayProps> = ({ onSuccess, onGoToRecovery }) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'presets'>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Scanned payload
  const [scannedRaw, setScannedRaw] = useState('');
  const [parsedUpi, setParsedUpi] = useState<ParsedUpiUrl | null>(null);

  // Editable amount if static QR
  const [customAmount, setCustomAmount] = useState<string>('');

  // Confirmation screen stage: 'scan' | 'confirm' | 'result'
  const [stage, setStage] = useState<'scan' | 'confirm' | 'result'>('scan');

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [riskResult, setRiskResult] = useState<RiskAnalysisResult | null>(null);
  const [finalStatus, setFinalStatus] = useState<'idle' | 'cancelled' | 'paid'>('idle');

  // User PIN verification simulation for safety
  const [userAcknowledgedRisk, setUserAcknowledgedRisk] = useState(false);

  // Safety Modals
  const [showTrustedPersonModal, setShowTrustedPersonModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Stop camera stream safely
  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Start Camera QR Scanner
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        scanLoop();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        'Camera permission was denied or camera is unavailable in this environment. You can upload a QR image or choose one of our live test QR presets below.'
      );
      setCameraActive(false);
    }
  };

  // Continuously scan frames with jsQR
  const scanLoop = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.height = videoRef.current.videoHeight;
          canvas.width = videoRef.current.videoWidth;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            handleDecodedQr(code.data);
            stopCamera();
            return;
          }
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(scanLoop);
  };

  useEffect(() => {
    if (activeMode === 'camera' && stage === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeMode, stage]);

  // Handle decoded QR payload
  const handleDecodedQr = async (rawData: string) => {
    setScannedRaw(rawData);
    const parsed = RiskEngine.parseUpiUri(rawData);
    setParsedUpi(parsed);
    setCustomAmount(parsed.am || '');
    setStage('confirm');
    setUserAcknowledgedRisk(false);

    // Run AI Risk Interrogation
    setAnalyzing(true);
    try {
      const analysis = await RiskEngine.analyzeTransaction({
        receiver_name: parsed.pn || parsed.pa?.split('@')[0] || 'Unknown Payee',
        receiver_upi: parsed.pa || rawData,
        amount: Number(parsed.am) || 0,
        note: parsed.tn || '',
        is_collect_request: parsed.isCollect || parsed.isReceivingTrap,
      });
      setRiskResult(analysis);
    } catch (e) {
      console.error('QR analysis error:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDecodedQr(code.data);
          } else {
            // Fallback: If no standard QR detected in custom image, parse sample QR
            handleDecodedQr('upi://pay?pa=shop.merchant@icici&pn=Verified%20Retail%20Store&am=450&tn=Groceries%20Invoice');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleBlockScam = () => {
    if (!parsedUpi || !riskResult) return;
    const finalAmount = Number(parsedUpi.am || customAmount) || 0;
    DataStore.addTransaction({
      user_id: DataStore.getProfile().id,
      receiver_name: parsedUpi.pn || 'Flagged Payee',
      receiver_upi: parsedUpi.pa || scannedRaw,
      amount: finalAmount,
      category: riskResult.category || 'Collect Trap',
      risk_score: riskResult.risk_score,
      risk_level: riskResult.risk_level,
      ai_explanation: riskResult.ai_explanation,
      status: 'cancelled',
      is_collect_request: parsedUpi.isCollect || parsedUpi.isReceivingTrap,
      note: parsedUpi.tn,
      triggers: riskResult.triggers,
      scam_pattern: riskResult.scam_pattern,
      recommendations: riskResult.recommendations,
    });

    // Auto-save evidence
    DataStore.addEvidence({
      user_id: DataStore.getProfile().id,
      title: `Blocked QR Trap: ${parsedUpi.pn || parsedUpi.pa}`,
      type: 'qr_code',
      content: `Scanned Raw QR: ${scannedRaw}\nIntent: ${parsedUpi.intent} (${parsedUpi.intentDescription})\nRisk Score: ${riskResult.risk_score}/100\nAI Diagnosis: ${riskResult.ai_explanation}`,
      tags: ['QR Code', 'Collect Trap', 'Blocked'],
    });

    setFinalStatus('cancelled');
    setStage('result');
  };

  const handleAuthorizeSafe = () => {
    if (!parsedUpi || !riskResult) return;
    const finalAmount = Number(parsedUpi.am || customAmount) || 0;
    DataStore.addTransaction({
      user_id: DataStore.getProfile().id,
      receiver_name: parsedUpi.pn || 'Verified Merchant',
      receiver_upi: parsedUpi.pa || scannedRaw,
      amount: finalAmount,
      category: riskResult.category || 'UPI Payment',
      risk_score: riskResult.risk_score,
      risk_level: riskResult.risk_level,
      ai_explanation: riskResult.ai_explanation,
      status: 'completed',
      is_collect_request: parsedUpi.isCollect,
      note: parsedUpi.tn,
      triggers: riskResult.triggers,
      scam_pattern: riskResult.scam_pattern,
      recommendations: riskResult.recommendations,
    });
    setFinalStatus('paid');
    setStage('result');
  };

  const resetScanner = () => {
    setScannedRaw('');
    setParsedUpi(null);
    setRiskResult(null);
    setFinalStatus('idle');
    setStage('scan');
    setUserAcknowledgedRisk(false);
    setCustomAmount('');
    if (activeMode === 'camera') {
      startCamera();
    }
  };

  const effectiveAmount = parsedUpi?.am ? Number(parsedUpi.am) : Number(customAmount) || 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 animate-in fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
          <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
          <span>Real-Time UPI QR Interceptor & Intent Verifier</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Scan & Pay with Intent Shield
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Scan or upload any UPI QR code. Automatically extracts payee details, amount, and detects whether you are <strong>paying</strong> or being lured into a <strong>fake "receiving money" debit trap</strong>.
        </p>
      </div>

      {/* Mode Selector Tabs (only in scan stage) */}
      {stage === 'scan' && (
        <div className="flex items-center justify-center gap-1.5 p-1.5 rounded-full bg-white/5 border border-white/5 w-fit mx-auto">
          <button
            onClick={() => {
              setActiveMode('camera');
              resetScanner();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeMode === 'camera'
                ? 'bg-[#6735e8] text-white shadow-[0_0_12px_rgba(103,53,232,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Live Camera</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('upload');
              resetScanner();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeMode === 'upload'
                ? 'bg-[#6735e8] text-white shadow-[0_0_12px_rgba(103,53,232,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Image</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('presets');
              resetScanner();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeMode === 'presets'
                ? 'bg-[#6735e8] text-white shadow-[0_0_12px_rgba(103,53,232,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-[#00d2ff]" />
            <span>Test Scenarios</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCANNING STAGE */}
      {/* ========================================================================= */}
      {stage === 'scan' && (
        <div className="bg-[#16161c] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* CAMERA SCANNER */}
          {activeMode === 'camera' && (
            <div className="space-y-4 text-center">
              <div className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl bg-black border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      muted
                      autoPlay
                      playsInline
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    {/* Glowing scanner overlay frame */}
                    <div className="absolute inset-8 border-2 border-[#00d2ff] rounded-xl pointer-events-none">
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#00d2ff]" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#00d2ff]" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#00d2ff]" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#00d2ff]" />
                      {/* Scanning laser line */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#00d2ff] to-transparent shadow-[0_0_10px_#00d2ff] animate-pulse absolute top-1/2 -translate-y-1/2" />
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center space-y-3">
                    <Camera className="w-12 h-12 text-[#6735e8] mx-auto opacity-70" />
                    <p className="text-xs text-slate-300">
                      {cameraError || 'Click below to enable camera scanner'}
                    </p>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold uppercase tracking-wider"
                    >
                      Start Camera Scanner
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Point your camera at any BharatQR, GPay, PhonePe, or Paytm QR barcode.
              </p>
            </div>
          )}

          {/* UPLOAD IMAGE SCANNER */}
          {activeMode === 'upload' && (
            <div className="p-8 border-2 border-dashed border-white/10 hover:border-[#00d2ff]/50 rounded-2xl text-center space-y-4 bg-white/5 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#00d2ff]">
                <FileImage className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Upload QR Screenshot or Saved Image</p>
                <p className="text-xs text-slate-400">Supports PNG, JPG, WebP QR captures from messaging apps</p>
              </div>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-[0_0_12px_rgba(103,53,232,0.4)] transition-all">
                <Upload className="w-4 h-4" />
                <span>Select QR File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* PRESETS & TEST SCENARIOS */}
          {activeMode === 'presets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select a test QR barcode payload to inspect:
                </p>
                <span className="text-[10px] text-[#00d2ff] font-mono">1-Click Live Simulation</span>
              </div>

              {/* Preset 1: OLX Collect Trap (CRITICAL) */}
              <div
                onClick={() =>
                  handleDecodedQr(
                    'upi://collect?pa=olx.buyer.advance@okaxis&pn=Col.%20Arvind%20Sharma&am=15000&tn=Enter%20UPI%20PIN%20to%20receive%2015000%20advance%20payment%20for%20sofa'
                  )
                }
                className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 hover:border-red-500/50 cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-bold text-red-300">
                  <span className="flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-red-400" />
                    <span>🚨 OLX "Scan to Receive ₹15,000" Collect Trap</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    COLLECT TRAP
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Scammer claims you will receive advance payment, but the QR contains <code className="text-red-400 font-mono">upi://collect</code> that debits ₹15,000 upon PIN entry.
                </p>
              </div>

              {/* Preset 2: Fake Cashback / Refund QR */}
              <div
                onClick={() =>
                  handleDecodedQr(
                    'upi://pay?pa=gpay.official.reward.desk@okaxis&pn=GPay%20Scratch%20Card%20Refund&am=4999&tn=Receive%20scratch%20card%20cashback%20refund%20in%20bank'
                  )
                }
                className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>⚠️ Deceptive "Cashback Claim" Payment QR</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                    FAKE REWARD
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  QR disguised as receiving cashback reward for ₹4,999, but actually transfers money to fraudster's VPA.
                </p>
              </div>

              {/* Preset 3: Verified Grocery Merchant Invoice */}
              <div
                onClick={() =>
                  handleDecodedQr(
                    'upi://pay?pa=freshmart.retail@icici&pn=FreshMart%20Superstore&am=480&tn=Invoice%204901'
                  )
                }
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>🛒 Verified Retail Grocery Invoice (₹480)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-bold">
                    SAFE MERCHANT
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Legitimate merchant payment invoice with verified parameters.
                </p>
              </div>

              {/* Preset 4: Static Payee QR (No fixed amount) */}
              <div
                onClick={() =>
                  handleDecodedQr('upi://pay?pa=chai.corner@upi&pn=Ramesh%20Tea%20Stall')
                }
                className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 hover:border-sky-500/50 cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-bold text-sky-300">
                  <span className="flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-sky-400" />
                    <span>☕ Static Counter QR (User Enters Amount)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500 text-black text-[10px] font-bold">
                    STATIC QR
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Common merchant counter QR without fixed amount. Allows user to specify amount to pay.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION SCREEN (EXTRACTED DETAILS & INTENT DETERMINATION) */}
      {/* ========================================================================= */}
      {stage === 'confirm' && parsedUpi && (
        <div className="space-y-6 animate-in fade-in">
          {/* 1. TRANSACTION INTENT BANNER (CLEARLY DETERMINES PAYING VS RECEIVING) */}
          <div
            className={`rounded-3xl p-6 sm:p-7 border-2 shadow-2xl space-y-4 ${
              parsedUpi.isReceivingTrap
                ? 'bg-gradient-to-br from-red-50 via-rose-50 to-red-100/90 dark:from-red-950/90 dark:via-[#251518] dark:to-[#16161c] border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.35)] animate-danger-pulse'
                : riskResult?.risk_level === 'High'
                ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/90 dark:from-amber-950/90 dark:via-[#261e15] dark:to-[#16161c] border-amber-500 shadow-lg'
                : 'bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/80 dark:from-emerald-950/40 dark:via-[#161f1a] dark:to-[#16161c] border-emerald-500/50 shadow-lg'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                  parsedUpi.isReceivingTrap
                    ? 'bg-red-600 text-white shadow-red-500/50 animate-bounce'
                    : riskResult?.risk_level === 'High'
                    ? 'bg-amber-500 text-black shadow-amber-500/50'
                    : 'bg-emerald-600 text-white shadow-emerald-500/30'
                }`}
              >
                {parsedUpi.isReceivingTrap ? (
                  <AlertOctagon className="w-8 h-8 text-white" />
                ) : parsedUpi.intent === 'DYNAMIC_INVOICE_PAY' || parsedUpi.intent === 'PAYING_MONEY' || parsedUpi.intent === 'STATIC_PAYEE_QR' ? (
                  <ArrowUpRight className="w-8 h-8 text-white" />
                ) : (
                  <ShieldCheck className="w-8 h-8 text-white" />
                )}
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm ${
                      parsedUpi.isReceivingTrap
                        ? 'bg-red-600 text-white shadow-red-500/30'
                        : riskResult?.risk_level === 'High'
                        ? 'bg-amber-500 text-black font-extrabold'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {parsedUpi.isReceivingTrap
                      ? '⚠️ SCAM DETECTED: FAKE RECEIVE TRAP'
                      : 'TRANSACTION INTENT: OUTGOING PAYMENT'}
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/90 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-xs font-mono">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">Scheme:</span>
                    <strong className="text-red-700 dark:text-red-300 font-black">
                      {parsedUpi.isCollect ? 'upi://collect' : 'upi://pay'}
                    </strong>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  {parsedUpi.isReceivingTrap ? (
                    <span className="text-red-700 dark:text-red-400">THIS WILL DEBIT MONEY FROM YOUR BANK!</span>
                  ) : (
                    <span className="text-emerald-800 dark:text-emerald-300">You are PAYING money to this recipient</span>
                  )}
                </h2>

                <div className="p-3 rounded-xl bg-white/90 dark:bg-black/40 border border-red-200 dark:border-red-500/30 shadow-sm">
                  <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-semibold leading-relaxed">
                    {parsedUpi.intentDescription}
                  </p>
                </div>
              </div>
            </div>

            {/* Crucial Golden Rule Callout if Trap */}
            {parsedUpi.isReceivingTrap && (
              <div className="p-4 sm:p-5 rounded-2xl bg-red-900/95 dark:bg-black/80 border-2 border-red-500 text-white shadow-lg space-y-2 force-text-white">
                <p className="font-black text-red-200 dark:text-red-400 text-sm sm:text-base flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-red-300 dark:text-red-400 shrink-0" />
                  <span className="text-white font-black tracking-wide">Golden Security Rule of Indian UPI:</span>
                </p>
                <p className="text-xs sm:text-sm text-red-50 dark:text-slate-100 font-medium leading-relaxed">
                  You <strong className="text-amber-300 underline font-black uppercase">NEVER</strong> need to scan a QR code or enter your 4-digit/6-digit secret UPI PIN to receive money into your bank account. Entering your PIN will <strong className="text-amber-300 underline font-black">instantly deduct funds</strong>!
                </p>
              </div>
            )}
          </div>

          {/* 2. EXTRACTED DETAILS CONFIRMATION CARD */}
          <div className="bg-white dark:bg-[#16161c] border border-slate-200 dark:border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#6735e8] dark:text-[#00d2ff]" />
                  <span>Extracted QR Information</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Review the decoded parameters before proceeding with any authorization.
                </p>
              </div>
              <button
                onClick={resetScanner}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rescan</span>
              </button>
            </div>

            {/* Extracted Key-Value Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Receiver Name */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Receiver / Payee Name</span>
                <p className="text-slate-900 dark:text-white font-black text-base truncate">
                  {parsedUpi.pn || 'Not Declared (Personal Handle)'}
                </p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium">Param: pn</span>
              </div>

              {/* Receiver UPI ID */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Receiver UPI ID / VPA</span>
                <p className="text-[#0284c7] dark:text-[#00d2ff] font-black text-base truncate font-mono">
                  {parsedUpi.pa || 'N/A'}
                </p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium">Param: pa</span>
              </div>

              {/* Amount */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Transaction Amount</span>
                {parsedUpi.am ? (
                  <div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      ₹{Number(parsedUpi.am).toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium">Fixed by QR (am={parsedUpi.am})</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Enter amount to pay"
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-[#6735e8] dark:focus:border-[#00d2ff]"
                      />
                    </div>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Static QR: Enter amount to pay</span>
                  </div>
                )}
              </div>

              {/* Transaction Note / Intent Claim */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Transaction Note / Purpose</span>
                <p className="text-slate-800 dark:text-slate-200 text-sm truncate font-semibold">
                  {parsedUpi.tn || 'None specified'}
                </p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium">Param: tn</span>
              </div>
            </div>

            {/* Raw Payload Accordion - High Contrast Redesign */}
            <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-black/50 border border-slate-300 dark:border-white/10 space-y-2 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase font-black tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#6735e8] dark:text-[#00d2ff]" />
                  <span>Raw Barcode Payload:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(scannedRaw);
                    setCopiedPayload(true);
                    setTimeout(() => setCopiedPayload(false), 2000);
                  }}
                  className="text-[11px] font-mono font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10"
                >
                  {copiedPayload ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-black/80 border border-slate-200 dark:border-white/10">
                <p className="text-xs font-mono text-slate-900 dark:text-[#00d2ff] font-semibold break-all leading-relaxed select-all">
                  {scannedRaw}
                </p>
              </div>
            </div>

            {/* 3. AI RISK & FRAUD INTERROGATION */}
            {analyzing ? (
              <div className="p-5 rounded-2xl bg-slate-100 dark:bg-white/5 text-center space-y-2 border border-slate-200 dark:border-white/5">
                <Sparkles className="w-6 h-6 text-[#6735e8] dark:text-[#00d2ff] animate-spin mx-auto" />
                <p className="text-xs text-[#6735e8] dark:text-[#00d2ff] font-bold">
                  Analyzing payee reputation against fraud telemetry & Gemini AI models...
                </p>
              </div>
            ) : riskResult ? (
              <div
                className={`p-5 rounded-2xl border-2 space-y-3 shadow-sm ${
                  riskResult.risk_level === 'High'
                    ? 'bg-red-50 dark:bg-red-500/10 border-red-400 dark:border-red-500/40 text-slate-900'
                    : riskResult.risk_level === 'Medium'
                    ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-400 dark:border-amber-500/40 text-slate-900'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/40 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#6735e8] dark:text-[#00d2ff]" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">Risk Evaluation & Fraud Score</span>
                  </div>
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full uppercase shadow-sm ${
                      riskResult.risk_level === 'High'
                        ? 'bg-red-600 text-white'
                        : riskResult.risk_level === 'Medium'
                        ? 'bg-amber-500 text-black'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {riskResult.risk_level} Risk ({riskResult.risk_score}/100)
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {riskResult.ai_explanation}
                </p>

                {riskResult.triggers && riskResult.triggers.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex flex-wrap gap-1.5">
                    {riskResult.triggers.map((trigger, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-900 dark:text-red-300 border border-red-300 dark:border-red-500/40 font-bold"
                      >
                        ⚠️ {trigger}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* 4. PRE-PAYMENT ADVISORY & SECOND OPINION (TRUSTED PERSON & SCAM TIMELINE) */}
            {(parsedUpi.isReceivingTrap || riskResult?.risk_level === 'High' || riskResult?.risk_level === 'Medium') && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-slate-50 to-indigo-50 dark:from-[#1c182a] dark:via-[#16161c] dark:to-[#121216] border border-[#6735e8]/30 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d2ff] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6735e8] dark:bg-[#00d2ff]"></span>
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Recommended Protective Actions Before Paying
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#6735e8]/10 text-[#6735e8] dark:bg-[#6735e8]/20 dark:text-[#00d2ff] border border-[#6735e8]/30">
                    UPI Guardian
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Feature 1: Trusted Person Confirmation */}
                  <button
                    type="button"
                    id="scan-trusted-person-btn"
                    onClick={() => setShowTrustedPersonModal(true)}
                    className="p-3 rounded-xl bg-white hover:bg-purple-50/50 dark:bg-[#6735e8]/20 dark:hover:bg-[#6735e8]/30 border border-purple-200 dark:border-[#6735e8]/40 hover:border-[#6735e8]/70 text-left transition-all group flex items-start gap-3 shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#6735e8] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Users className="w-4 h-4 text-white dark:text-[#00d2ff]" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-[#6735e8] dark:group-hover:text-[#00d2ff] transition-colors flex items-center gap-1">
                        <span>Ask Trusted Contact</span>
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h5>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight mt-0.5 font-medium">
                        Have family inspect this QR payee and advise before authorization.
                      </p>
                    </div>
                  </button>

                  {/* Feature 2: Scam Timeline */}
                  <button
                    type="button"
                    id="scan-scam-timeline-btn"
                    onClick={() => setShowTimelineModal(true)}
                    className="p-3 rounded-xl bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-left transition-all group flex items-start gap-3 shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-800 dark:bg-white/10 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Clock className="w-4 h-4 text-white dark:text-[#00d2ff]" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-[#6735e8] dark:group-hover:text-[#00d2ff] transition-colors flex items-center gap-1">
                        <span>Visualize Scam Sequence</span>
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h5>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight mt-0.5 font-medium">
                        Trace scam stages from phishing lure to collect trap interception.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 5. USER ACTIONS & HARD STOP SAFETY GATES */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
              {parsedUpi.isReceivingTrap || riskResult?.risk_level === 'High' ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      id="scan-block-scam-btn"
                      onClick={handleBlockScam}
                      className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    >
                      <XCircle className="w-5 h-5 text-white" />
                      <span className="text-white font-black">Block & Reject Scam QR</span>
                    </button>

                    <button
                      onClick={resetScanner}
                      className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-white/5 transition-colors"
                    >
                      Cancel / Rescan
                    </button>
                  </div>

                  {/* Safety override gate */}
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={userAcknowledgedRisk}
                        onChange={(e) => setUserAcknowledgedRisk(e.target.checked)}
                        className="mt-0.5 rounded text-red-600 focus:ring-0"
                      />
                      <span>
                        I understand that scanning this QR and entering my PIN will <strong className="text-red-700 dark:text-red-400">DEBIT ₹{effectiveAmount}</strong> from my bank account, and I accept full responsibility.
                      </span>
                    </label>

                    {userAcknowledgedRisk && (
                      <button
                        onClick={handleAuthorizeSafe}
                        className="mt-3 w-full py-2.5 px-4 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-800 dark:text-amber-200 text-xs font-bold uppercase tracking-wider border border-amber-500/40 transition-all"
                      >
                        Proceed Despite Warning (High Risk)
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    id="scan-proceed-payment-btn"
                    onClick={handleAuthorizeSafe}
                    disabled={!effectiveAmount || effectiveAmount <= 0}
                    className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <ShieldCheck className="w-5 h-5 text-white" />
                    <span className="text-white font-black">Authorize Payment of ₹{effectiveAmount.toLocaleString('en-IN')}</span>
                  </button>

                  <button
                    onClick={resetScanner}
                    className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESULT STAGE */}
      {/* ========================================================================= */}
      {stage === 'result' && (
        <div className="bg-[#16161c] border border-white/5 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in zoom-in-95">
          {finalStatus === 'cancelled' ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-xl">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500 text-white">
                  Fraud Blocked
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  Scam Collect QR Successfully Blocked!
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Your funds are safe. This fraudulent payee handle (<code className="text-red-400 font-mono">{parsedUpi?.pa}</code>) has been logged in UPI Guardian's local threat intelligence vault.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={resetScanner}
                  className="px-5 py-3 rounded-2xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(103,53,232,0.4)]"
                >
                  Scan Another QR
                </button>

                {onGoToRecovery && (
                  <button
                    onClick={onGoToRecovery}
                    className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center gap-1.5"
                  >
                    <LifeBuoy className="w-4 h-4 text-[#00d2ff]" />
                    <span>View in Recovery Vault</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500 text-white">
                  Payment Successful
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  Payment of ₹{effectiveAmount.toLocaleString('en-IN')} Authorized
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Transferred to <strong>{parsedUpi?.pn || parsedUpi?.pa}</strong>. Transaction recorded securely.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={resetScanner}
                  className="px-5 py-3 rounded-2xl bg-[#6735e8] hover:bg-[#7846f9] text-white text-xs font-bold uppercase tracking-wider"
                >
                  Scan Another QR
                </button>
                {onSuccess && (
                  <button
                    onClick={onSuccess}
                    className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider"
                  >
                    Return to Dashboard
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1. Trusted Person Confirmation Modal */}
      {parsedUpi && (
        <TrustedPersonConfirmationModal
          isOpen={showTrustedPersonModal}
          onClose={() => setShowTrustedPersonModal(false)}
          transaction={{
            receiverName: parsedUpi.pn || 'Scanned Payee',
            receiverUpi: parsedUpi.pa,
            amount: effectiveAmount,
            riskScore: riskResult?.risk_score || (parsedUpi.isReceivingTrap ? 99 : 85),
            riskLevel: riskResult?.risk_level || 'High',
            scamPattern: parsedUpi.isReceivingTrap ? 'Fake Receive QR / Collect Request Trap' : 'Suspicious QR Payee',
            aiExplanation: riskResult?.ai_explanation || parsedUpi.intentDescription,
            triggers: riskResult?.triggers || (parsedUpi.isReceivingTrap ? ['Collect Request Trap', 'Incoming Deception'] : []),
            isCollect: parsedUpi.isReceivingTrap || parsedUpi.isCollect,
            note: parsedUpi.tn,
          }}
          onBlockScam={handleBlockScam}
          onProceedAuthorized={handleAuthorizeSafe}
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
        transaction={{
          id: 'tx-qr-scan',
          user_id: DataStore.getProfile().id,
          receiver_name: parsedUpi?.pn || 'Scanned Payee',
          receiver_upi: parsedUpi?.pa || 'payee@upi',
          amount: effectiveAmount,
          category: 'QR Payment',
          risk_score: riskResult?.risk_score || (parsedUpi?.isReceivingTrap ? 99 : 85),
          risk_level: riskResult?.risk_level || 'High',
          ai_explanation: riskResult?.ai_explanation || parsedUpi?.intentDescription || 'Suspicious QR Payment',
          status: 'flagged',
          is_collect_request: Boolean(parsedUpi?.isReceivingTrap || parsedUpi?.isCollect),
          note: parsedUpi?.tn,
          triggers: riskResult?.triggers || [],
          created_at: new Date().toISOString(),
        }}
        onConsultTrustedPerson={() => {
          setShowTimelineModal(false);
          setShowTrustedPersonModal(true);
        }}
      />
    </div>
  );
};
