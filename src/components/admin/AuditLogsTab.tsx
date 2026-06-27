import React, { useCallback, useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { getAuditLogs } from "../../lib/api/admin.functions";
import {
  Loader2,
  Shield,
  UserPlus,
  UserX,
  UserCheck,
  Mail,
  Trash2,
  Edit3,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight,
  ScrollText,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface AuditLogEntry {
  id: string;
  action: string;
  actorEmail: string;
  details: Record<string, any>;
  complaintId: string | null;
  timestamp: number | null;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }
> = {
  INVITE_STAFF: {
    label: "Staff Invited",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: <UserPlus size={14} />,
  },
  REVOKE_INVITE: {
    label: "Invite Revoked",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: <X size={14} />,
  },
  RESEND_INVITE: {
    label: "Invite Resent",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: <Mail size={14} />,
  },
  ACCEPT_INVITE: {
    label: "Invite Accepted",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: <UserCheck size={14} />,
  },
  REJECT_INVITE: {
    label: "Invite Rejected",
    color: "text-slate-700",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    icon: <UserX size={14} />,
  },
  TOGGLE_STAFF_STATUS: {
    label: "Status Changed",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: <Shield size={14} />,
  },
  UPDATE_COMPLAINT: {
    label: "Complaint Updated",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    icon: <Edit3 size={14} />,
  },
  BULK_DELETE_COMPLAINTS: {
    label: "Complaints Deleted",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    icon: <Trash2 size={14} />,
  },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "INVITE_STAFF", label: "Staff Invited" },
  { value: "REVOKE_INVITE", label: "Invite Revoked" },
  { value: "RESEND_INVITE", label: "Invite Resent" },
  { value: "ACCEPT_INVITE", label: "Invite Accepted" },
  { value: "REJECT_INVITE", label: "Invite Rejected" },
  { value: "TOGGLE_STAFF_STATUS", label: "Status Changed" },
  { value: "UPDATE_COMPLAINT", label: "Complaint Updated" },
  { value: "BULK_DELETE_COMPLAINTS", label: "Complaints Deleted" },
];

function formatRelativeTime(ts: number | null): string {
  if (!ts) return "Unknown";
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFullDate(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDetailsSummary(entry: AuditLogEntry): string {
  const d = entry.details;
  switch (entry.action) {
    case "INVITE_STAFF":
    case "RESEND_INVITE":
    case "REVOKE_INVITE":
      return `${d.email || "?"} as ${(d.role || "").replace("_", " ")}${d.department ? ` in ${d.department}` : ""}`;
    case "ACCEPT_INVITE":
    case "REJECT_INVITE":
      return `${(d.role || "").replace("_", " ")}${d.department ? ` in ${d.department}` : ""}`;
    case "TOGGLE_STAFF_STATUS":
      return `Set to ${d.newStatus || "?"}`;
    case "UPDATE_COMPLAINT":
      if (d.status) return `Status → ${d.status}`;
      return `Updated fields`;
    case "BULK_DELETE_COMPLAINTS":
      return `${d.deletedIds?.length || 0} complaints`;
    default:
      return JSON.stringify(d).slice(0, 80);
  }
}

export function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setRefreshing(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const data = await getAuditLogs({
        data: { adminToken: token, limit: 50, actionFilter: filter === "all" ? undefined : filter },
      });
      setLogs(data as AuditLogEntry[]);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between bg-gray-50/50">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ScrollText size={20} className="text-blue-600" /> Audit Logs
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track every action performed by administrators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Filter
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          <button
            onClick={fetchLogs}
            className="p-2.5 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="divide-y divide-gray-50">
        {logs.length === 0 && (
          <div className="px-6 py-16 text-center text-gray-400">
            <ScrollText size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No audit logs found</p>
            <p className="text-sm mt-1">
              Actions will appear here as administrators use the platform.
            </p>
          </div>
        )}

        {logs.map((entry) => {
          const config = ACTION_CONFIG[entry.action] || {
            label: entry.action,
            color: "text-gray-700",
            bgColor: "bg-gray-50",
            borderColor: "border-gray-200",
            icon: <Edit3 size={14} />,
          };
          const isExpanded = expandedId === entry.id;

          return (
            <div
              key={entry.id}
              className="px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`mt-0.5 w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center shrink-0 ${config.color}`}
                >
                  {config.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${config.bgColor} ${config.color} border ${config.borderColor}`}
                    >
                      {config.label}
                    </span>
                    <span
                      className="text-sm text-gray-500 truncate"
                      title={formatFullDate(entry.timestamp)}
                    >
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-medium text-gray-900">{entry.actorEmail}</span>
                    {" — "}
                    <span className="text-gray-500">{getDetailsSummary(entry)}</span>
                  </p>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs font-mono text-slate-600 overflow-auto max-h-40">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                      {entry.complaintId && (
                        <p className="mt-2 text-slate-500">Complaint ID: {entry.complaintId}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Expand indicator */}
                <div className="mt-1 text-gray-300 shrink-0">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
