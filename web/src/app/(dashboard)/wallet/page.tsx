'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  Plus,
} from 'lucide-react';
import { useWalletStore } from '@/store/wallet.store';
import { QRCodeDisplay } from '@/components/wallet/QRCode';
import { SendForm } from '@/components/wallet/SendForm';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { useKeplrEvents } from '@/hooks/useKeplrEvents';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

type TabType = 'overview' | 'send' | 'receive' | 'history';

const statusIcons = {
  pending: Clock,
  success: CheckCircle,
  failed: XCircle,
};

const statusColors = {
  pending: 'text-yellow-400',
  success: 'text-green-400',
  failed: 'text-red-400',
};

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showConnect, setShowConnect] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { walletAddress, balance, isConnected, transactions, updateBalance, connectMode, keplrName } = useWalletStore();

  useKeplrEvents();

  const handleRefresh = async () => {
    setRefreshing(true);
    await updateBalance();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Wallet },
    { id: 'send', label: 'Send', icon: Send },
    { id: 'receive', label: 'Receive', icon: Download },
    { id: 'history', label: 'History', icon: Clock },
  ];

  if (!isConnected) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-primary-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
          <p className="tamil-text text-primary-400 mb-2">உங்கள் நிதியிடத்தை இணைக்கவும்</p>
          <p className="text-text-secondary mb-8">
            Create a new TMZ wallet or import your existing one to start managing your assets.
          </p>
          <button
            onClick={() => setShowConnect(true)}
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Connect Wallet
          </button>
        </motion.div>
        {showConnect && <WalletConnect onClose={() => setShowConnect(false)} />}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
          <p className="tamil-text text-primary-400 text-sm">நிதியிடம்</p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-xl bg-surface-DEFAULT border border-background-border text-text-secondary hover:text-white transition-colors"
        >
          <RefreshCw className={clsx('w-5 h-5', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative p-6 rounded-2xl overflow-hidden mb-6"
        style={{
          background: 'linear-gradient(135deg, #E8500A15 0%, #1A1A2E 50%, #F5C51815 100%)',
          border: '1px solid rgba(232, 80, 10, 0.2)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="relative">
          <div className="text-text-muted text-sm mb-1">Total Balance</div>
          <div className="text-4xl font-bold text-white mb-1">
            {balance?.tmz ?? '0.000000'} <span className="text-primary-400">TMZ</span>
          </div>
          <div className="text-text-secondary text-sm font-mono">
            {balance?.utmz ?? '0'} utmz
          </div>
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-xs text-text-muted">Wallet Address</div>
              {connectMode === 'keplr' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400 font-medium">
                  {keplrName ? `Keplr · ${keplrName}` : 'Keplr'}
                </span>
              )}
            </div>
            <div className="text-sm text-text-secondary font-mono break-all">{walletAddress}</div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-DEFAULT rounded-xl border border-background-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 flex-1 justify-center py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-text-secondary hover:text-white'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatedTabContent activeTab={activeTab}>
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Send', icon: Send, action: () => setActiveTab('send'), color: 'text-primary-400' },
                { label: 'Receive', icon: Download, action: () => setActiveTab('receive'), color: 'text-accent' },
                { label: 'History', icon: Clock, action: () => setActiveTab('history'), color: 'text-blue-400' },
                { label: 'Refresh', icon: RefreshCw, action: handleRefresh, color: 'text-green-400' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={action.action}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-background-card border border-background-border hover:border-primary-500/30 transition-all"
                >
                  <action.icon className={clsx('w-5 h-5', action.color)} />
                  <span className="text-sm text-text-secondary">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Recent Transactions */}
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-3">Recent Transactions</h3>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">
                  No transactions yet
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 5).map((tx, i) => {
                    const StatusIcon = statusIcons[tx.status];
                    const isSend = tx.from === walletAddress;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-background-card border border-background-border"
                      >
                        <div className={clsx('p-2 rounded-lg', isSend ? 'bg-red-500/10' : 'bg-green-500/10')}>
                          {isSend
                            ? <ArrowUpRight className="w-4 h-4 text-red-400" />
                            : <ArrowDownLeft className="w-4 h-4 text-green-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-text-primary font-medium">
                            {isSend ? 'Sent' : 'Received'}
                          </div>
                          <div className="text-xs text-text-muted font-mono truncate">
                            {isSend ? tx.to : tx.from}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={clsx('text-sm font-semibold', isSend ? 'text-red-400' : 'text-green-400')}>
                            {isSend ? '-' : '+'}{tx.amount} TMZ
                          </div>
                          <div className="flex items-center gap-1 justify-end">
                            <StatusIcon className={clsx('w-3 h-3', statusColors[tx.status])} />
                            <span className="text-xs text-text-muted">
                              {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'send' && <SendForm />}

        {activeTab === 'receive' && walletAddress && (
          <div className="flex justify-center">
            <QRCodeDisplay address={walletAddress} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-text-secondary">All Transactions</h3>
              <Badge variant="secondary">{transactions.length} total</Badge>
            </div>
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-text-muted text-sm">
                No transactions yet
              </div>
            ) : (
              transactions.map((tx, i) => {
                const StatusIcon = statusIcons[tx.status];
                const isSend = tx.from === walletAddress;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 rounded-xl bg-background-card border border-background-border hover:border-background-border/60 transition-colors"
                  >
                    <div className={clsx('p-2 rounded-lg flex-shrink-0', isSend ? 'bg-red-500/10' : 'bg-green-500/10')}>
                      {isSend
                        ? <ArrowUpRight className="w-5 h-5 text-red-400" />
                        : <ArrowDownLeft className="w-5 h-5 text-green-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-text-primary font-medium">
                          {isSend ? 'Sent' : 'Received'}
                        </span>
                        <Badge variant={tx.status === 'success' ? 'success' : tx.status === 'failed' ? 'error' : 'warning'}>
                          {tx.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-text-muted font-mono truncate">
                        Hash: {tx.txHash || 'Pending...'}
                      </div>
                      {tx.memo && (
                        <div className="text-xs text-text-muted mt-0.5">
                          Memo: {tx.memo}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={clsx('text-sm font-semibold mb-1', isSend ? 'text-red-400' : 'text-green-400')}>
                        {isSend ? '-' : '+'}{tx.amount} TMZ
                      </div>
                      <div className="text-xs text-text-muted">
                        {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </AnimatedTabContent>

      {showConnect && <WalletConnect onClose={() => setShowConnect(false)} />}
    </div>
  );
}

function AnimatedTabContent({ children, activeTab }: { children: React.ReactNode; activeTab: string }) {
  return (
    <motion.div
      key={activeTab}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
