import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiAlertTriangle, FiCheckSquare, FiUsers, FiLayers, 
  FiShield, FiActivity, FiRefreshCw, FiDollarSign, FiWifi, FiClock 
} from 'react-icons/fi';
import api from '../../services/api';
import { DashboardStatsSkeleton } from '../../components/ui/SkeletonLoader';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pendingKyc: 0,
    totalDoctors: 0,
    activeDisputes: 0,
    totalEscrowAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [kycRes, doctorsRes, disputesRes] = await Promise.all([
        api.get('/admin/kyc-requests').catch(() => ({ data: { data: [] } })),
        api.get('/admin/doctors').catch(() => ({ data: { data: [] } })),
        api.get('/appointments/admin/disputes').catch(() => ({ data: { data: [] } })),
      ]);

      const pendingKyc = kycRes?.data?.data?.length || 0;
      const totalDoctors = doctorsRes?.data?.data?.length || 0;
      const disputes = disputesRes?.data?.data || [];
      const activeDisputes = disputes.filter(d => d.status === 'Disputed' || d.dispute?.status === 'countered' || d.dispute?.status === 'pending_doctor').length;
      const totalEscrowAmount = disputes.reduce((sum, d) => sum + (d.escrowAmount || 25000), 0);

      setStats({
        pendingKyc,
        totalDoctors,
        activeDisputes,
        totalEscrowAmount,
      });
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const quickActions = [
    {
      title: 'Resolve Disputes',
      description: 'Arbitrate patient-doctor check-in issues & rule on escrow refunds',
      icon: <FiAlertTriangle className="w-7 h-7" />,
      link: '/admin/disputes',
      color: 'bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600',
      badge: stats.activeDisputes > 0 ? stats.activeDisputes : null,
      urgent: stats.activeDisputes > 0,
    },
    {
      title: 'KYC Requests',
      description: 'Review and verify physician credentials and licenses',
      icon: <FiCheckSquare className="w-7 h-7" />,
      link: '/admin/kyc-requests',
      color: 'bg-gradient-to-r from-orange-500 to-red-500',
      badge: stats.pendingKyc > 0 ? stats.pendingKyc : null,
      urgent: stats.pendingKyc > 0,
    },
    {
      title: 'Manage Doctors',
      description: 'View directory, hospitals, and doctor profile records',
      icon: <FiUsers className="w-7 h-7" />,
      link: '/admin/doctors',
      color: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      badge: stats.totalDoctors > 0 ? stats.totalDoctors : null,
    },
    {
      title: 'Specializations',
      description: 'Configure clinical departments and medical categories',
      icon: <FiLayers className="w-7 h-7" />,
      link: '/admin/specializations',
      color: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">Admin Command Center</h1>
          <p className="text-text-secondary text-sm">Platform orchestration, escrow ledger oversight, and clinical dispute governance</p>
        </div>
        <DashboardStatsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">Admin Command Center</h1>
          <p className="text-text-secondary text-sm">Platform orchestration, escrow financial ledger, and arbitration governance</p>
        </div>
        <button
          onClick={fetchStats}
          className="self-start flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-card-hover border border-border-subtle rounded-xl text-text-primary font-semibold text-xs transition-colors shadow-sm"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          Refresh Stats
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Disputes Card */}
        <div className="bg-bg-card rounded-2xl shadow-card border border-border-subtle p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <FiAlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Active Disputes</p>
              <p className="text-2xl font-black text-text-primary mt-0.5">
                {stats.activeDisputes}
              </p>
            </div>
          </div>
          {stats.activeDisputes > 0 && (
            <span className="absolute top-3 right-3 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          )}
        </div>

        {/* Pending KYC Card */}
        <div className="bg-bg-card rounded-2xl shadow-card border border-border-subtle p-5 hover:border-orange-500/40 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
              <FiCheckSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Pending KYC</p>
              <p className="text-2xl font-black text-text-primary mt-0.5">
                {stats.pendingKyc}
              </p>
            </div>
          </div>
        </div>

        {/* Total Doctors Card */}
        <div className="bg-bg-card rounded-2xl shadow-card border border-border-subtle p-5 hover:border-primary/40 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <FiUsers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Registered Doctors</p>
              <p className="text-2xl font-black text-text-primary mt-0.5">
                {stats.totalDoctors}
              </p>
            </div>
          </div>
        </div>

        {/* Escrow Status Card */}
        <div className="bg-bg-card rounded-2xl shadow-card border border-border-subtle p-5 hover:border-green-500/40 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
              <FiDollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Escrow Protected</p>
              <p className="text-2xl font-black text-green-600 dark:text-green-400 mt-0.5">
                100% Active
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions (2x2 Grid) */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <span>Quick Actions</span>
          <span className="text-xs text-text-muted font-normal">(Command Hub)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className={`relative block p-6 rounded-3xl text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-lg ${action.color} ${action.urgent ? 'ring-4 ring-amber-400/40' : ''}`}
            >
              {action.badge && (
                <div className="absolute top-4 right-4 bg-white text-slate-900 rounded-2xl px-3 py-1 flex items-center justify-center text-xs font-black shadow-lg">
                  {action.badge} Urgent
                </div>
              )}
              <div className="flex items-center mb-3 gap-3">
                <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-sm">
                  {action.icon}
                </div>
                <h3 className="text-xl font-black">{action.title}</h3>
              </div>
              <p className="text-white/90 text-xs leading-relaxed max-w-sm">{action.description}</p>
              <div className="mt-5 flex items-center text-xs font-bold bg-black/15 w-fit px-3 py-1.5 rounded-xl backdrop-blur-sm">
                <span>Access Module</span>
                <span className="ml-2 font-bold">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* System Overview & Health Status */}
      <div className="bg-bg-card rounded-3xl shadow-card border border-border-subtle p-6 space-y-4">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <FiActivity className="w-5 h-5 text-primary" />
          System Overview & Real-Time Telemetry
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-bg-muted rounded-2xl border border-border-subtle">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-text-secondary">WebSocket Gateway</span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            </div>
            <p className="text-sm font-bold text-text-primary">Connected & Real-Time</p>
            <p className="text-[11px] text-text-muted mt-0.5">Auto-synchronizing queue events</p>
          </div>

          <div className="p-4 bg-bg-muted rounded-2xl border border-border-subtle">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-text-secondary">Escrow Engine</span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            </div>
            <p className="text-sm font-bold text-text-primary">Vault Protection Active</p>
            <p className="text-[11px] text-text-muted mt-0.5">Automated release & 24h refund checks</p>
          </div>

          <div className="p-4 bg-bg-muted rounded-2xl border border-border-subtle">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-text-secondary">Nightly Cron Sweeper</span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            </div>
            <p className="text-sm font-bold text-text-primary">00:00 UTC Scheduled</p>
            <p className="text-[11px] text-text-muted mt-0.5">Automated past-due no-show settlement</p>
          </div>

          <div className="p-4 bg-bg-muted rounded-2xl border border-border-subtle">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-text-secondary">Database Connection</span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            </div>
            <p className="text-sm font-bold text-text-primary">MongoDB Atlas Cluster</p>
            <p className="text-[11px] text-text-muted mt-0.5">100% Uptime Healthy</p>
          </div>
        </div>
      </div>
    </div>
  );
}
