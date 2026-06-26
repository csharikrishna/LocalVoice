import React, { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { createStaff, getStaff, toggleStaffStatus, getInvites, revokeInvite } from "../../lib/api/admin.functions";
import {
  Loader2,
  UserPlus,
  UserX,
  UserCheck,
  Shield,
  Users,
  Mail,
  RefreshCw,
  X,
  Lock,
} from "lucide-react";
import { StaffMember } from "../../types";
import { toast } from "sonner";
import { StaffHierarchyView } from "./StaffHierarchyView";

export function StaffManagementTab() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("department_admin");
  const [newDepartment, setNewDepartment] = useState("Electrical");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMode, setInviteMode] = useState<"manual" | "email">("manual");

  const fetchStaff = async () => {
    try {
      setRefreshing(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const [staffData, invitesData] = await Promise.all([
        getStaff({ data: { adminToken: token } }),
        getInvites({ data: { adminToken: token } })
      ]);
      const activeStaff = staffData as StaffMember[];
      const pendingInvites = (invitesData as any[]).filter(i => i.status !== "accepted").map(i => ({
        id: i.id,
        email: i.email,
        role: i.role,
        department: i.department,
        status: i.status,
        isInvite: true
      }));
      setStaff([...activeStaff, ...pendingInvites]);
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      toast.error("Failed to load staff list");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleToggleStatus = async (staffEmail: string, currentStatus: "active" | "suspended" | "pending" | "rejected") => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const staffMember = staff.find((s) => s.email === staffEmail);
      if (!staffMember) return;

      const newStatus = currentStatus === "active" ? "suspended" : "active";

      await toggleStaffStatus({
        data: {
          adminToken: token,
          staffId: staffMember.id,
          status: newStatus,
        },
      });
      toast.success(`Staff status updated to ${newStatus}`);
      fetchStaff();
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update staff status");
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!window.confirm("Are you sure you want to revoke this invitation? This will permanently delete it and send an email notification to the user.")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      await revokeInvite({
        data: {
          adminToken: token,
          inviteId,
        },
      });
      toast.success("Invitation successfully revoked");
      fetchStaff();
    } catch (err) {
      console.error("Failed to revoke invite:", err);
      toast.error("Failed to revoke invitation");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.includes("@")) {
      toast.error("Invalid email format");
      return;
    }

    try {
      setIsInviting(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const result = await createStaff({
        data: {
          email: newEmail,
          role: newRole as "admin" | "department_admin" | "field_worker",
          department: newRole === "department_admin" || newRole === "field_worker" ? newDepartment : null,
          adminToken: token,
        },
      });

      if (!result.ok) {
        throw new Error(result.message);
      }

      toast.success("Invitation sent successfully! They will receive an email to join.");

      setIsModalOpen(false);
      setNewEmail("");
      setNewPassword("");
      fetchStaff();
    } catch (err) {
      console.error("Failed to invite staff", err);
      const error =
        err && typeof err === "object" ? (err as { code?: string; message?: string }) : {};
      if (error.code === "auth/email-already-in-use") {
        toast.error("That email is already registered.");
      } else {
        toast.error(error.message || "Failed to create staff account.");
      }
    } finally {
      setIsInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between bg-gray-50/50">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users size={20} className="text-blue-600" /> Staff Directory
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage platform access, roles, and department assignments.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "tree" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Org Chart
            </button>
          </div>

          <button
            onClick={fetchStaff}
            className="p-2.5 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            <UserPlus size={18} /> Invite Staff
          </button>
        </div>
      </div>

      {viewMode === "tree" ? (
        <StaffHierarchyView staff={staff} onToggleStatus={handleToggleStatus} onRevokeInvite={handleRevokeInvite} />
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-semibold">Staff Member</th>
              <th className="px-6 py-4 font-semibold">Role</th>
              <th className="px-6 py-4 font-semibold">Department</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {s.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{s.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <Shield size={12} /> {s.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {s.department ? (
                    <span className="text-gray-700">{s.department}</span>
                  ) : (
                    <span className="text-gray-400 italic">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {s.status === "active" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
                    </span>
                  ) : s.status === "suspended" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Suspended
                    </span>
                  ) : s.status === "pending" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Invite Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Invite Rejected
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {!(s as any).isInvite && (
                    <button
                      onClick={() => handleToggleStatus(s.email, s.status as any)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        s.status === "active"
                          ? "text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
                          : "text-green-600 hover:bg-green-50 border border-transparent hover:border-green-200"
                      }`}
                    >
                      {s.status === "active" ? (
                        <>
                          <UserX size={14} /> Suspend
                        </>
                      ) : (
                        <>
                          <UserCheck size={14} /> Reactivate
                        </>
                      )}
                    </button>
                  )}
                  {(s as any).isInvite && (s.status === "pending" || s.status === "rejected") && (
                    <button
                      onClick={() => handleRevokeInvite(s.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
                    >
                      <X size={14} /> Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No staff members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 text-lg">Invite New Staff</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800 mb-4">
                <p className="font-medium flex items-center gap-1.5 mb-1">
                  <Mail size={16} /> Automated Email Invitation
                </p>
                <p className="text-blue-600">
                  We will automatically send a secure invitation link to this email address. The user will be able to review the role and set their own password upon accepting.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="worker@localvoice.admin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="department_admin">Department Admin</option>
                  <option value="field_worker">Field Worker</option>
                  <option value="admin">Central Dispatcher (Admin)</option>
                </select>
              </div>

              {(newRole === "department_admin" || newRole === "field_worker") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Department
                  </label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Electrical">Electrical</option>
                    <option value="Sanitation">Sanitation</option>
                    <option value="Water Board">Water Board</option>
                    <option value="Public Works">Public Works</option>
                    <option value="Parks & Rec">Parks & Rec</option>
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isInviting && <Loader2 size={14} className="animate-spin" />}
                  {isInviting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
