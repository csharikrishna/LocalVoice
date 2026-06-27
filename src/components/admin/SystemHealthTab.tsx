import React, { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { getSystemHealth } from "../../lib/api/admin.functions";
import {
  Loader2,
  Activity,
  AlertTriangle,
  Server,
  Settings,
  ShieldAlert,
  Database,
  Users,
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface SystemHealthData {
  totalComplaints: number;
  openComplaints: number;
  orphanedComplaints: Array<{ id: string; category: string; timestamp: number | null }>;
  staleComplaints: Array<{
    id: string;
    category: string;
    department: string | null;
    timestamp: number | null;
    status: string;
  }>;
  totalStaff: number;
  pendingInvites: number;
  configStatus: {
    smtp: boolean;
    cloudinary: boolean;
    recaptcha: boolean;
    firebaseAdmin: boolean;
  };
  recentAudit: Array<{
    id: string;
    action: string;
    actorEmail: string;
    timestamp: number | null;
  }>;
}

function formatRelativeTime(ts: number | null): string {
  if (!ts) return "Unknown";
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours === 0 ? "Just now" : `${hours}h ago`;
  }
  return `${days}d ago`;
}

export default function SystemHealthTab() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getSystemHealth({ data: { adminToken: token } });
      setHealth(data as SystemHealthData);
    } catch (err) {
      console.error("Failed to load system health", err);
      toast.error("Failed to load system health metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle size={48} className="text-amber-500 mb-4" />
        <p className="text-gray-500 font-medium">Unable to load system health.</p>
        <button
          onClick={() => fetchHealth(true)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-blue-600" size={20} />
            System Health Overview
          </h2>
          <p className="text-sm text-gray-500">
            Monitor application configuration, data integrity, and potential issues.
          </p>
        </div>
        <button
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Environment Configuration */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Settings size={18} className="text-gray-600" />
            <h3 className="font-semibold text-gray-800">Environment Configuration</h3>
          </div>
          <div className="p-5">
            <ul className="space-y-4">
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Firebase Admin SDK</p>
                    <p className="text-xs text-gray-500">
                      Required for server-side auth & DB access
                    </p>
                  </div>
                </div>
                {health.configStatus.firebaseAdmin ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={14} /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                    <XCircle size={14} /> Missing
                  </span>
                )}
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">SMTP Email Services</p>
                    <p className="text-xs text-gray-500">
                      Required for invitations and notifications
                    </p>
                  </div>
                </div>
                {health.configStatus.smtp ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={14} /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                    <AlertTriangle size={14} /> Not Configured
                  </span>
                )}
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Cloudinary Integration</p>
                    <p className="text-xs text-gray-500">Required for photo uploads</p>
                  </div>
                </div>
                {health.configStatus.cloudinary ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={14} /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                    <XCircle size={14} /> Missing
                  </span>
                )}
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">reCAPTCHA Verification</p>
                    <p className="text-xs text-gray-500">Bot protection for public forms</p>
                  </div>
                </div>
                {health.configStatus.recaptcha ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={14} /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                    <AlertTriangle size={14} /> Missing
                  </span>
                )}
              </li>
            </ul>
          </div>
        </div>

        {/* Data Integrity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-gray-600" />
              <h3 className="font-semibold text-gray-800">Data Anomalies</h3>
            </div>
            {(health.orphanedComplaints.length > 0 || health.staleComplaints.length > 0) && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                {health.orphanedComplaints.length + health.staleComplaints.length} Issues Found
              </span>
            )}
          </div>

          <div className="p-5 flex-1 flex flex-col gap-5 overflow-y-auto max-h-[300px]">
            {health.orphanedComplaints.length === 0 && health.staleComplaints.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
                <CheckCircle2 size={40} className="text-green-400 mb-3" />
                <p className="font-medium text-gray-600">Database looks healthy</p>
                <p className="text-xs">No orphaned or severely stale complaints found.</p>
              </div>
            ) : (
              <>
                {health.orphanedComplaints.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-red-600 flex items-center gap-1.5 mb-2 uppercase tracking-wide">
                      <AlertTriangle size={14} /> Orphaned Complaints (Unassigned &gt; 24h)
                    </h4>
                    <div className="space-y-2">
                      {health.orphanedComplaints.map((c) => (
                        <div
                          key={c.id}
                          className="bg-red-50 border border-red-100 p-3 rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{c.category}</p>
                            <p className="text-xs text-gray-500">ID: {c.id}</p>
                          </div>
                          <span className="text-xs text-red-600 font-medium">
                            {formatRelativeTime(c.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {health.staleComplaints.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-amber-600 flex items-center gap-1.5 mb-2 uppercase tracking-wide">
                      <Clock size={14} /> Stale Complaints (Open &gt; 7 Days)
                    </h4>
                    <div className="space-y-2">
                      {health.staleComplaints.map((c) => (
                        <div
                          key={c.id}
                          className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{c.category}</p>
                            <p className="text-xs text-gray-500">{c.department || "Unassigned"}</p>
                          </div>
                          <span className="text-xs text-amber-600 font-medium">
                            {formatRelativeTime(c.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* System Stats Overview */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden md:col-span-2">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Users size={18} className="text-gray-600" />
            <h3 className="font-semibold text-gray-800">Operational Metrics & Logs</h3>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                Total Staff
              </p>
              <p className="text-2xl font-bold text-gray-900">{health.totalStaff}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                Pending Invites
              </p>
              <p className="text-2xl font-bold text-blue-600">{health.pendingInvites}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                Database Records
              </p>
              <p className="text-2xl font-bold text-gray-900">{health.totalComplaints}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                Active Issues
              </p>
              <p className="text-2xl font-bold text-amber-600">{health.openComplaints}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
