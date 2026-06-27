import React from "react";
import { AdminDashboard } from "../../components/admin/AdminDashboard";
import { Wrench, LogOut } from "lucide-react";
import { auth } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import { AdminRole, Complaint } from "../../types";

export default function PublicWorksDashboard({
  role,
  initialComplaints,
}: {
  role: AdminRole;
  initialComplaints?: Complaint[];
}) {
  return (
    <div className="public-works-department-wrapper flex flex-col min-h-screen bg-gray-50">
      {/* Department Specific Custom Banner */}
      <div className="bg-gradient-to-r from-orange-600 to-red-500 text-white px-6 py-3 flex items-center justify-between shadow-md z-10 relative">
        <div className="flex items-center gap-3">
          <Wrench size={20} />
          <span className="font-semibold tracking-wide text-sm uppercase">
            Department of Public Works
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
          department="Public Works"
          squadId={null}
          initialComplaints={initialComplaints}
        />
      </div>
    </div>
  );
}
