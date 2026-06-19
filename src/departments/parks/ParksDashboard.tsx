import React from 'react';
import { AdminDashboard } from '../../components/admin/AdminDashboard';
import { Leaf, Map as MapIcon } from 'lucide-react';

export default function ParksDashboard() {
  return (
    <div className="parks-department-wrapper flex flex-col min-h-screen bg-gray-50">
      {/* Department Specific Custom Banner */}
      <div className="bg-gradient-to-r from-lime-600 to-green-600 text-white px-6 py-3 flex items-center justify-between shadow-md z-10 relative">
        <div className="flex items-center gap-3">
          <Leaf size={20} />
          <span className="font-semibold tracking-wide text-sm uppercase">Parks & Recreation Division</span>
        </div>
        <div className="flex items-center gap-2 text-xs bg-black/20 px-3 py-1 rounded-full font-medium">
          <MapIcon size={14} /> Ranger Patrols: Active
        </div>
      </div>
      
      {/* Unified Table Engine */}
      <div className="flex-1">
        <AdminDashboard role="department_admin" department="Parks & Rec" squadId={null} />
      </div>
    </div>
  );
}
