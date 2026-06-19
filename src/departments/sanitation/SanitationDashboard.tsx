import React from 'react';
import { AdminDashboard } from '../../components/admin/AdminDashboard';
import { Trash2, Recycle } from 'lucide-react';

export default function SanitationDashboard() {
  return (
    <div className="sanitation-department-wrapper flex flex-col min-h-screen bg-gray-50">
      {/* Department Specific Custom Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-500 text-white px-6 py-3 flex items-center justify-between shadow-md z-10 relative">
        <div className="flex items-center gap-3">
          <Trash2 size={20} />
          <span className="font-semibold tracking-wide text-sm uppercase">Dept of Sanitation & Waste</span>
        </div>
        <div className="flex items-center gap-2 text-xs bg-black/20 px-3 py-1 rounded-full font-medium">
          <Recycle size={14} /> Fleet Status: 24/24 Active
        </div>
      </div>
      
      {/* Unified Table Engine */}
      <div className="flex-1">
        <AdminDashboard role="department_admin" department="Sanitation" squadId={null} />
      </div>
    </div>
  );
}
