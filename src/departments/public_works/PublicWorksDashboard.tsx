import React from "react";
import { AdminDashboard } from "../../components/admin/AdminDashboard";
import { Wrench, Truck } from "lucide-react";

export default function PublicWorksDashboard() {
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
        <div className="flex items-center gap-2 text-xs bg-black/20 px-3 py-1 rounded-full font-medium">
          <Truck size={14} /> Active Sites: 12
        </div>
      </div>

      {/* Unified Table Engine */}
      <div className="flex-1">
        <AdminDashboard role="department_admin" department="Public Works" squadId={null} />
      </div>
    </div>
  );
}
