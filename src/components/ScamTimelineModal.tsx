import React from 'react';
import { X, Clock, AlertOctagon, ArrowLeft } from 'lucide-react';
import { ScamTimeline } from './ScamTimeline';
import { Transaction } from '../types';

interface ScamTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onConsultTrustedPerson?: () => void;
  onLaunchRecovery?: () => void;
}

export const ScamTimelineModal: React.FC<ScamTimelineModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onConsultTrustedPerson,
  onLaunchRecovery,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-[#121216] border border-white/10 rounded-3xl max-w-3xl w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden my-6">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-[#1c182a] via-[#16161c] to-[#121216] border-b border-white/10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6735e8] to-[#00d2ff] p-0.5 shadow-lg">
              <div className="w-full h-full bg-[#111115] rounded-[14px] flex items-center justify-center text-[#00d2ff]">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Scam Sequence Visualization
                </h3>
                {transaction && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                    ₹{transaction.amount.toLocaleString('en-IN')} Threat
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Step-by-step chronology: Initial SMS lure ➔ Malicious link ➔ New VPA ➔ High-pressure demand ➔ AI interception
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

        {/* Modal Body */}
        <div className="p-6 sm:p-7 max-h-[75vh] overflow-y-auto">
          <ScamTimeline
            transaction={transaction}
            onConsultTrustedPerson={() => {
              onClose();
              if (onConsultTrustedPerson) onConsultTrustedPerson();
            }}
            onLaunchRecovery={() => {
              onClose();
              if (onLaunchRecovery) onLaunchRecovery();
            }}
          />
        </div>
      </div>
    </div>
  );
};
