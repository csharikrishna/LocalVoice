import React from "react";
import { AdminDashboard } from "../../components/admin/AdminDashboard";
import { Zap, LogOut } from "lucide-react";
import { auth } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import { AdminRole, Complaint } from "../../types";

export default function ElectricalDashboard({
  role,
  initialComplaints,
}: {
  role: AdminRole;
  initialComplaints?: Complaint[];
}) {
  return (
    <div className="electrical-department-wrapper flex flex-col min-h-screen bg-gray-50">
      {/* Department Specific Custom Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-6 py-3 flex items-center justify-between shadow-md z-10 relative">
        <div className="flex items-center gap-3">
          <Zap size={20} className="fill-current" />
          <span className="font-semibold tracking-wide text-sm uppercase">
            Electrical & Lighting Division
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs bg-black/20 px-3 py-1 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Systems Online
          </div>
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* Unified Table Engine */}
      <div className="flex-1">
        <AdminDashboard
          role={role}
          department="Electrical"
          squadId={null}
          initialComplaints={initialComplaints}
        />
      </div>
    </div>
  );
}
