import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { Complaint } from "@/types";
import { SLA_BREACH_HOURS } from "@/config/features";
import { Clock, CheckCircle, AlertTriangle, TrendingUp, Settings2 } from "lucide-react";
import { motion, Variants } from "framer-motion";

interface AnalyticsTabProps {
  complaints: Complaint[];
  slaEnabled: boolean;
  setSlaEnabled: (enabled: boolean) => void;
}

export function AnalyticsTab({ complaints, slaEnabled, setSlaEnabled }: AnalyticsTabProps) {
  const stats = useMemo(() => {
    let totalResolutionTimeMs = 0;
    let resolvedCount = 0;
    let slaBreachCount = 0;

    const byDepartment: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    complaints.forEach((c) => {
      // Basic counts
      const dept = c.department || "Unassigned";
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;

      const cat = c.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + 1;

      // Time parsing
      const createdAt = c.timestamp ? new Date(c.timestamp) : new Date(0);

      if (!isNaN(createdAt.getTime())) {
        const monthKey = createdAt.toLocaleString("default", { month: "short", year: "numeric" });
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;

        // Resolution metrics
        if (c.status === "closed" && c.resolvedAt) {
          const resolvedDate = new Date(c.resolvedAt);
          if (!isNaN(resolvedDate.getTime())) {
            const resolutionTimeMs = resolvedDate.getTime() - createdAt.getTime();
            totalResolutionTimeMs += resolutionTimeMs;
            resolvedCount++;

            // SLA Check
            const resolutionTimeHours = resolutionTimeMs / (1000 * 60 * 60);
            if (resolutionTimeHours > SLA_BREACH_HOURS) {
              slaBreachCount++;
            }
          }
        } else if (c.status !== "closed") {
          // Open ticket SLA breach check
          const openTimeHours = (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          if (openTimeHours > SLA_BREACH_HOURS) {
            slaBreachCount++;
          }
        }
      }
    });

    const avgResolutionHours =
      resolvedCount > 0 ? totalResolutionTimeMs / resolvedCount / (1000 * 60 * 60) : 0;
    const slaBreachRate = complaints.length > 0 ? (slaBreachCount / complaints.length) * 100 : 0;

    return {
      total: complaints.length,
      resolved: resolvedCount,
      avgResolutionHours: avgResolutionHours.toFixed(1),
      slaBreachRate: slaBreachRate.toFixed(1),
      slaBreachCount,
      departmentData: Object.entries(byDepartment)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      categoryData: Object.entries(byCategory)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      trendData: Object.entries(byMonth)
        .map(([name, count]) => ({ name, count, _sortKey: new Date(name).getTime() }))
        .sort((a, b) => a._sortKey - b._sortKey)
        .map(({ name, count }) => ({ name, count })),
    };
  }, [complaints]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full flex flex-col gap-6"
    >
      {/* Header & Controls */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/50 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            System Analytics
          </h2>
          <p className="text-sm text-gray-500">Real-time performance and SLA monitoring</p>
        </div>

        <div className="flex items-center gap-4 bg-white/80 px-4 py-2 rounded-xl border border-gray-100 shadow-inner w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex flex-col text-right">
            <span className="text-sm font-semibold text-gray-700">SLA Tracking</span>
            <span className="text-[10px] text-gray-500">
              {slaEnabled ? "Active on dashboard" : "Hidden"}
            </span>
          </div>
          <button
            onClick={() => setSlaEnabled(!slaEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              slaEnabled ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                slaEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          variants={itemVariants}
          className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow"
        >
          <div className="p-3.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-blue-500/20 shadow-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Complaints</p>
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{stats.total}</h3>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow"
        >
          <div className="p-3.5 bg-gradient-to-br from-emerald-400 to-emerald-500 text-white rounded-xl shadow-emerald-500/20 shadow-lg">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Resolved Issues</p>
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{stats.resolved}</h3>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow"
        >
          <div className="p-3.5 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-purple-500/20 shadow-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Avg Resolution Time</p>
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
              {stats.avgResolutionHours}
              <span className="text-lg text-gray-500 font-normal">h</span>
            </h3>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow"
        >
          <div
            className={`p-3.5 text-white rounded-xl shadow-lg ${stats.slaBreachCount > 0 ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-red-500/20" : "bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-500/20"}`}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">SLA Breach Rate</p>
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
              {stats.slaBreachRate}
              <span className="text-lg text-gray-500 font-normal">%</span>
            </h3>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          variants={itemVariants}
          className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-500 rounded-full inline-block"></span> Issues by
            Department
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.departmentData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.4} />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <RechartsTooltip
                  cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar dataKey="count" fill="url(#colorDept)" radius={[0, 6, 6, 0]} />
                <defs>
                  <linearGradient id="colorDept" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-purple-500 rounded-full inline-block"></span> Issues by
            Category
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.categoryData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis />
                <RechartsTooltip
                  cursor={{ fill: "rgba(139, 92, 246, 0.05)" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar dataKey="count" fill="url(#colorCat)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="colorCat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:col-span-2"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block"></span> Reporting
            Trend (Monthly)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
                <XAxis dataKey="name" tick={{ fill: "#6b7280" }} />
                <YAxis />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={4}
                  dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
