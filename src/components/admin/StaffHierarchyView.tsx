import React, { useState } from "react";
import { StaffMember } from "../../types";
import { Shield, ChevronDown, ChevronRight, UserCircle, Building2, UserX, UserCheck } from "lucide-react";

interface Props {
  staff: StaffMember[];
  onToggleStatus?: (email: string, currentStatus: string) => void;
}

export function StaffHierarchyView({ staff, onToggleStatus }: Props) {
  const admins = staff.filter((s) => s.role === "admin");
  const departments = Array.from(new Set(staff.map((s) => s.department).filter(Boolean))) as string[];

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Headquarters */}
        <div>
          <div className="flex items-center gap-2 mb-4 text-slate-800">
            <Building2 className="text-blue-600" size={24} />
            <h3 className="text-xl font-bold">Central Headquarters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-8 border-l-2 border-blue-100">
            {admins.map((admin) => (
              <StaffCard key={admin.id} member={admin} onToggleStatus={onToggleStatus} />
            ))}
            {admins.length === 0 && <p className="text-slate-500 italic">No central dispatchers found.</p>}
          </div>
        </div>

        {/* Departments */}
        <div className="space-y-6">
          {departments.map((dept) => (
            <DepartmentNode key={dept} department={dept} staff={staff.filter((s) => s.department === dept)} onToggleStatus={onToggleStatus} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DepartmentNode({ department, staff, onToggleStatus }: { department: string; staff: StaffMember[]; onToggleStatus?: (e: string, s: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  
  const supervisors = staff.filter((s) => s.role === "department_admin");
  const fieldWorkers = staff.filter((s) => s.role === "field_worker");

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200/50 transition-colors border-b border-slate-200"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
          <h4 className="font-bold text-slate-800 text-lg">{department} Department</h4>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span>{supervisors.length} Supervisors</span>
          <span>{fieldWorkers.length} Field Workers</span>
        </div>
      </button>

      {expanded && (
        <div className="p-6 space-y-6">
          {supervisors.length > 0 && (
            <div>
              <h5 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Supervisors</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supervisors.map((s) => (
                  <StaffCard key={s.id} member={s} onToggleStatus={onToggleStatus} />
                ))}
              </div>
            </div>
          )}

          {fieldWorkers.length > 0 && (
            <div className="relative">
              {supervisors.length > 0 && (
                <div className="absolute -top-6 left-6 w-0.5 h-6 bg-slate-200" />
              )}
              <h5 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Field Team</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fieldWorkers.map((w) => (
                  <StaffCard key={w.id} member={w} onToggleStatus={onToggleStatus} />
                ))}
              </div>
            </div>
          )}

          {staff.length === 0 && <p className="text-slate-500 italic text-sm">No staff in this department.</p>}
        </div>
      )}
    </div>
  );
}

function StaffCard({ member, onToggleStatus }: { member: StaffMember; onToggleStatus?: (e: string, s: string) => void }) {
  const isInvite = (member as any).isInvite;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col gap-3 relative overflow-hidden">
      {/* Accent strip based on status */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        member.status === "active" ? "bg-green-500" :
        member.status === "suspended" ? "bg-red-500" :
        member.status === "pending" ? "bg-blue-500" : "bg-slate-400"
      }`} />

      <div className="flex items-start justify-between pl-2">
        <div className="flex items-center gap-3 truncate">
          <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
            {member.email.charAt(0).toUpperCase()}
          </div>
          <div className="truncate">
            <p className="font-medium text-slate-900 truncate" title={member.email}>{member.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                member.role === "admin" ? "bg-indigo-50 text-indigo-700" :
                member.role === "department_admin" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"
              }`}>
                {member.role.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pl-2 mt-2 pt-3 border-t border-slate-100">
        <span className={`text-xs font-medium ${
          member.status === "active" ? "text-green-600" :
          member.status === "suspended" ? "text-red-600" :
          member.status === "pending" ? "text-blue-600" : "text-slate-500"
        }`}>
          {member.status === "pending" ? "Invite Pending" : member.status === "rejected" ? "Invite Rejected" : member.status.charAt(0).toUpperCase() + member.status.slice(1)}
        </span>

        {!isInvite && onToggleStatus && (
          <button
            onClick={() => onToggleStatus(member.email, member.status)}
            className={`p-1.5 rounded-md transition-colors ${
              member.status === "active" ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
            }`}
            title={member.status === "active" ? "Suspend Account" : "Restore Account"}
          >
            {member.status === "active" ? <UserX size={14} /> : <UserCheck size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
