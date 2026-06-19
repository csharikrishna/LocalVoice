import React from 'react';
import { AdminDashboard } from '../../components/admin/AdminDashboard';
import { Zap, AlertTriangle } from 'lucide-react';

export default function ElectricalDashboard() {
  return (
    <div className="electrical-department-wrapper flex flex-col min-h-screen bg-gray-50">
      {/* Department Specific Custom Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-6 py-3 flex items-center justify-between shadow-md z-10 relative">
        <div className="flex items-center gap-3">
          <Zap size={20} className="fill-current" />
          <span className="font-semibold tracking-wide text-sm uppercase">Electrical & Lighting Division</span>
        </div>
        <div className="flex items-center gap-2 text-xs bg-black/20 px-3 py-1 rounded-full font-medium">
          <AlertTriangle size={14} /> Grid Status: Stable
        </div>
      </div>
      
      {/* Unified Table Engine */}
      <div className="flex-1">
        <AdminDashboard role="department_admin" department="Electrical" squadId={null} />
      </div>
    </div>
  );
}
