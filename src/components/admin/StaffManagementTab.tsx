import React, { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import {
  createStaff,
  getStaff,
  toggleStaffStatus,
  getInvites,
  revokeInvite,
  resendInvite,
  deleteStaff,
} from "../../lib/api/admin.functions";
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
  RotateCw,
  Trash2,
} from "lucide-react";
import { StaffMember } from "../../types";
import { toast } from "sonner";
import { StaffHierarchyView } from "./StaffHierarchyView";
import { StaffDetailPanel } from "./StaffDetailPanel";

export function StaffManagementTab() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("department_admin");
  const [newDepartment, setNewDepartment] = useState("Electrical");
  const [isInviting, setIsInviting] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Revoke Modal State
  const [revokeModalInviteId, setRevokeModalInviteId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState<"mistake" | "revoked">("mistake");

  // Loading and Delete State
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteModalStaff, setDeleteModalStaff] = useState<StaffMember | null>(null);

  const fetchStaff = async () => {
    try {
      setRefreshing(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const [staffData, invitesData] = await Promise.all([
        getStaff({ data: { adminToken: token } }),
        getInvites({ data: { adminToken: token } }),
      ]);
      const activeStaff = staffData as StaffMember[];
      const pendingInvites = (invitesData as any[])
        .filter((i) => i.status !== "accepted")
        .map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          department: i.department,
          status: i.status,
          squad_id: null,
          isInvite: true,
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

  const handleToggleStatus = async (staffEmail: string, currentStatus: string) => {
    const staffMember = staff.find((s) => s.email === staffEmail);
    if (!staffMember) return;

    try {
      setActionLoading(staffMember.id);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

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
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeInvite = (inviteId: string) => {
    setRevokeModalInviteId(inviteId);
    setRevokeReason("mistake");
  };

  const submitRevoke = async () => {
    if (!revokeModalInviteId) return;
    try {
      setActionLoading(revokeModalInviteId);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      await revokeInvite({
        data: {
          adminToken: token,
          inviteId: revokeModalInviteId,
          reason: revokeReason,
        },
      });
      toast.success("Invitation successfully revoked");
      setRevokeModalInviteId(null);
      fetchStaff();
    } catch (err) {
      console.error("Failed to revoke invite:", err);
      toast.error("Failed to revoke invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      setActionLoading(inviteId);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      await resendInvite({
        data: {
          adminToken: token,
          inviteId,
        },
      });
      toast.success("Invitation email resent successfully");
    } catch (err) {
      console.error("Failed to resend invite:", err);
      toast.error("Failed to resend invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const submitDeleteStaff = async () => {
    if (!deleteModalStaff) return;
    try {
      setActionLoading(deleteModalStaff.id);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      await deleteStaff({
        data: {
          adminToken: token,
          staffId: deleteModalStaff.id,
          email: deleteModalStaff.email,
        },
      });
      toast.success("Staff member successfully deleted");
      setDeleteModalStaff(null);
      fetchStaff();
    } catch (err) {
      console.error("Failed to delete staff:", err);
      toast.error("Failed to delete staff member");
    } finally {
      setActionLoading(null);
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
          department:
            newRole === "department_admin" || newRole === "field_worker" ? newDepartment : null,
          adminToken: token,
        },
      });

      if (!result.ok) {
        throw new Error(result.message);
      }

      toast.success("Invitation sent successfully! They will receive an email to join.");

      setIsModalOpen(false);
      setNewEmail("");
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
        <StaffHierarchyView
          staff={staff}
          onToggleStatus={handleToggleStatus}
          onRevokeInvite={handleRevokeInvite}
          onResendInvite={handleResendInvite}
          onSelectStaff={setSelectedStaff}
        />
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
                      <span
                        className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
                        onClick={() => setSelectedStaff(s)}
                      >
                        {s.email}
                      </span>
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
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    {!(s as any).isInvite && (
                      <>
                        <button
                          onClick={() => handleToggleStatus(s.email, s.status as any)}
                          disabled={actionLoading === s.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            s.status === "active"
                              ? "text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200"
                              : "text-green-600 hover:bg-green-50 border border-transparent hover:border-green-200"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {actionLoading === s.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : s.status === "active" ? (
                            <UserX size={14} />
                          ) : (
                            <UserCheck size={14} />
                          )}
                          {s.status === "active" ? "Suspend" : "Reactivate"}
                        </button>
                        <button
                          onClick={() => setDeleteModalStaff(s)}
                          disabled={actionLoading === s.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    )}
                    {(s as any).isInvite && (s.status === "pending" || s.status === "rejected") && (
                      <button
                        onClick={() => handleRevokeInvite(s.id)}
                        disabled={actionLoading === s.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === s.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <X size={14} />
                        )}{" "}
                        Revoke
                      </button>
                    )}
                    {(s as any).isInvite && s.status === "pending" && (
                      <button
                        onClick={() => handleResendInvite(s.id)}
                        disabled={actionLoading === s.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === s.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RotateCw size={14} />
                        )}{" "}
                        Resend
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
                  We will automatically send a secure invitation link to this email address. The
                  user will be able to review the role and set their own password upon accepting.
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
                  {isInviting ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Detail Panel */}
      {selectedStaff && (
        <StaffDetailPanel member={selectedStaff} onClose={() => setSelectedStaff(null)} />
      )}

      {/* Revoke Invitation Modal */}
      {revokeModalInviteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Cancel Invitation</h3>
              <button
                onClick={() => setRevokeModalInviteId(null)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Please select the reason for canceling this invitation. The recipient will receive
                an email based on this reason.
              </p>

              <div className="space-y-3">
                <label
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${revokeReason === "mistake" ? "bg-amber-50 border-amber-200" : "hover:bg-gray-50 border-gray-200"}`}
                >
                  <div className="pt-0.5">
                    <input
                      type="radio"
                      name="revokeReason"
                      value="mistake"
                      checked={revokeReason === "mistake"}
                      onChange={() => setRevokeReason("mistake")}
                      className="w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Invitation Sent by Mistake</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Sends a polite email apologizing for the error.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${revokeReason === "revoked" ? "bg-red-50 border-red-200" : "hover:bg-gray-50 border-gray-200"}`}
                >
                  <div className="pt-0.5">
                    <input
                      type="radio"
                      name="revokeReason"
                      value="revoked"
                      checked={revokeReason === "revoked"}
                      onChange={() => setRevokeReason("revoked")}
                      className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Invitation Revoked</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Informs the user that their access has been intentionally withdrawn.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRevokeModalInviteId(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitRevoke}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Staff Modal */}
      {deleteModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Delete Staff Member</h3>
              <button
                onClick={() => setDeleteModalStaff(null)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{deleteModalStaff.email}</h4>
                  <p className="text-sm text-gray-500 capitalize">
                    {deleteModalStaff.role.replace("_", " ")}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6 border-l-4 border-red-500 pl-3 py-1 bg-red-50">
                Are you absolutely sure you want to delete this staff member? This action cannot be
                undone, and they will immediately lose access to the system.
              </p>
              <div className="flex justify-end gap-3 mt-4 border-t border-gray-100 pt-6">
                <button
                  type="button"
                  onClick={() => setDeleteModalStaff(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitDeleteStaff}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm"
                >
                  Confirm Deletion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
