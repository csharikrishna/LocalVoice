import React from "react";
import { AdminDashboard } from "../../components/admin/AdminDashboard";
import { Droplets, Waves } from "lucide-react";

export default function WaterDashboard() {
  return (
    <div className="water-department-wrapper flex flex-col min-h-screen bg-gray-50">
      {/* Department Specific Custom Banner */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-500 text-white px-6 py-3 flex items-center justify-between shadow-md z-10 relative">
        <div className="flex items-center gap-3">
          <Droplets size={20} />
          <span className="font-semibold tracking-wide text-sm uppercase">
            Municipal Water Board
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs bg-black/20 px-3 py-1 rounded-full font-medium">
          <Waves size={14} /> Main Pressure: Normal
        </div>
      </div>

      {/* Unified Table Engine */}
      <div className="flex-1">
        <AdminDashboard role="department_admin" department="Water Board" squadId={null} />
      </div>
    </div>
  );
}
