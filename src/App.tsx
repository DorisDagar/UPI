import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SendMoneyFlow } from './components/SendMoneyFlow';
import { ScanAndPay } from './components/ScanAndPay';
import { MessageAnalyzer } from './components/MessageAnalyzer';
import { InsightsView } from './components/InsightsView';
import { RecoveryMode } from './components/RecoveryMode';
import { TrustedPersonView } from './components/TrustedPersonView';
import { ScamTimelineView } from './components/ScamTimelineView';
import { SettingsModal } from './components/SettingsModal';
import { DataStore } from './lib/supabase';
import { Transaction, AnalyzedMessage, Profile } from './types';
import { ThemeProvider } from './context/ThemeContext';

function MainAppContent() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [profile, setProfile] = useState<Profile>(DataStore.getProfile());
  const [transactions, setTransactions] = useState<Transaction[]>(DataStore.getTransactions());
  const [messages, setMessages] = useState<AnalyzedMessage[]>(DataStore.getMessages());
  const [stats, setStats] = useState(DataStore.getStats());

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Subscribe to reactive realtime changes
  useEffect(() => {
    const unsubscribe = DataStore.subscribeToRealtime(() => {
      setProfile(DataStore.getProfile());
      setTransactions(DataStore.getTransactions());
      setMessages(DataStore.getMessages());
      setStats(DataStore.getStats());
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 flex flex-col font-sans antialiased selection:bg-[#6735e8] selection:text-white transition-colors duration-200">
      {/* Top Navigation Bar */}
      <Navbar
        profile={profile}
        stats={stats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onOpenRecovery={() => setActiveTab('recovery')}
        onOpenAuth={() => setIsSettingsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Layout Body with Sleek Dark Canvas */}
      <div className="flex-1 flex w-full overflow-hidden bg-[radial-gradient(circle_at_top_right,#1a142e,transparent)]">
        {/* Sleek Desktop/Mobile Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          profile={profile}
          stats={stats}
          onOpenRecovery={() => setActiveTab('recovery')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              profile={profile}
              transactions={transactions}
              messages={messages}
              stats={stats}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'send-money' && (
            <SendMoneyFlow onCompleted={() => setActiveTab('dashboard')} />
          )}

          {activeTab === 'scan-pay' && (
            <ScanAndPay
              onSuccess={() => setActiveTab('dashboard')}
              onGoToRecovery={() => setActiveTab('recovery')}
            />
          )}

          {activeTab === 'message-analyzer' && (
            <MessageAnalyzer onGoToRecovery={() => setActiveTab('recovery')} />
          )}

          {activeTab === 'insights' && (
            <InsightsView transactions={transactions} messages={messages} />
          )}

          {activeTab === 'trusted-confirmation' && (
            <TrustedPersonView transactions={transactions} onNavigate={setActiveTab} />
          )}

          {activeTab === 'scam-timeline' && (
            <ScamTimelineView transactions={transactions} onNavigate={setActiveTab} />
          )}

          {(activeTab === 'recovery' || activeTab === 'trusted-contacts') && (
            <RecoveryMode profile={profile} />
          )}
        </main>
      </div>

      {/* Settings / Supabase Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onProfileUpdate={(updated) => setProfile(updated)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainAppContent />
    </ThemeProvider>
  );
}


