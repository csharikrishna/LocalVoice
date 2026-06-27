import React, { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { getStaffMetrics } from "../../lib/api/admin.functions";
import {
  Loader2,
  X,
  Shield,
  Activity,
  CheckCircle2,
  Clock,
  Zap,
  UserPlus,
  UserX,
  UserCheck,
  Mail,
  Edit3,
  Trash2,
} from "lucide-react";
import { StaffMember } from "../../types";

interface StaffMetrics {
  totalActions: number;
  complaintsResolved: number;
  avgResolutionMs: number;
  lastActive: number | null;
  recentActivity: Array<{
    id: string;
    action: string;
    details: Record<string, any>;
    complaintId: string | null;
    timestamp: number | null;
  }>;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  INVITE_STAFF: <UserPlus size={14} />,
  REVOKE_INVITE: <X size={14} />,
  RESEND_INVITE: <Mail size={14} />,
  ACCEPT_INVITE: <UserCheck size={14} />,
  REJECT_INVITE: <UserX size={14} />,
  TOGGLE_STAFF_STATUS: <Shield size={14} />,
  UPDATE_COMPLAINT: <Edit3 size={14} />,
  BULK_DELETE_COMPLAINTS: <Trash2 size={14} />,
};

const ACTION_LABELS: Record<string, string> = {
  INVITE_STAFF: "Invited Staff",
  REVOKE_INVITE: "Revoked Invite",
  RESEND_INVITE: "Resent Invite",
  ACCEPT_INVITE: "Accepted Invite",
  REJECT_INVITE: "Rejected Invite",
  TOGGLE_STAFF_STATUS: "Changed Status",
  UPDATE_COMPLAINT: "Updated Complaint",
  BULK_DELETE_COMPLAINTS: "Deleted Complaints",
};

function formatDuration(ms: number): string {
  if (ms === 0) return "N/A";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return `${Math.floor(ms / (1000 * 60))}m`;
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatRelativeTime(ts: number | null): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface Props {
  member: StaffMember;
  onClose: () => void;
}

export function StaffDetailPanel({ member, onClose }: Props) {
  const [metrics, setMetrics] = useState<StaffMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getStaffMetrics({
        data: { adminToken: token, staffEmail: member.email },
      });
      setMetrics(data as StaffMetrics);
    } catch (err) {
      console.error("Failed to load staff metrics:", err);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [member.email]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {member.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">{member.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                      member.role === "admin"
                        ? "bg-indigo-100 text-indigo-700"
                        : member.role === "department_admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {member.role.replace("_", " ")}
                  </span>
                  {member.department && (
                    <span className="text-xs text-gray-500">{member.department}</span>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-1 mt-1.5 text-xs font-medium ${
                    member.status === "active"
                      ? "text-green-600"
                      : member.status === "suspended"
                        ? "text-red-600"
                        : "text-blue-600"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      member.status === "active"
                        ? "bg-green-500"
                        : member.status === "suspended"
                          ? "bg-red-500"
                          : "bg-blue-500"
                    }`}
                  />
                  {member.status === "pending"
                    ? "Invite Pending"
                    : member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : metrics ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Activity size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Total Actions
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{metrics.totalActions}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-4 rounded-xl border border-green-100">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <CheckCircle2 size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Resolved</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{metrics.complaintsResolved}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <Clock size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Avg Time</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-900">
                    {formatDuration(metrics.avgResolutionMs)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-2 text-purple-600 mb-2">
                    <Zap size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Last Active
                    </span>
                  </div>
                  <p className="text-lg font-bold text-purple-900">
                    {formatRelativeTime(metrics.lastActive)}
                  </p>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Recent Activity
                </h3>
                {metrics.recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No activity recorded yet.</p>
                ) : (
                  <div className="space-y-0">
                    {metrics.recentActivity.map((activity, idx) => (
                      <div key={activity.id} className="relative flex gap-3 pb-4">
                        {/* Timeline line */}
                        {idx < metrics.recentActivity.length - 1 && (
                          <div className="absolute left-[15px] top-8 w-0.5 h-full bg-gray-100" />
                        )}
                        {/* Icon */}
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 z-10">
                          {ACTION_ICONS[activity.action] || <Edit3 size={14} />}
                        </div>
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {ACTION_LABELS[activity.action] || activity.action}
                          </p>
                          {activity.details && Object.keys(activity.details).length > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                              {activity.details.status
                                ? `Status → ${activity.details.status}`
                                : activity.details.email
                                  ? activity.details.email
                                  : activity.details.newStatus
                                    ? `→ ${activity.details.newStatus}`
                                    : ""}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-gray-400 mb-4">Could not load metrics.</p>
              <button
                onClick={loadMetrics}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
