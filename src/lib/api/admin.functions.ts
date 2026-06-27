import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";

export const createStaffSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "department_admin", "field_worker"]),
  department: z.string().nullable(),
  adminToken: z.string().min(1),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

const getCreateStaffHandler = createServerOnlyFn(async () => {
  const { handleCreateStaff } = await import("./admin.server");
  return handleCreateStaff;
});

export const createStaff = createServerFn({ method: "POST" })
  .validator(createStaffSchema)
  .handler(async ({ data }) => {
    const handleCreateStaff = await getCreateStaffHandler();
    return handleCreateStaff(data);
  });

export const getStaff = createServerFn({ method: "POST" })
  .validator(z.object({ adminToken: z.string() }))
  .handler(async ({ data }) => {
    const { handleGetStaff } = await import("./admin.server");
    return handleGetStaff(data.adminToken);
  });

export const getInvites = createServerFn({ method: "POST" })
  .validator(z.object({ adminToken: z.string() }))
  .handler(async ({ data }) => {
    const { handleGetInvites } = await import("./admin.server");
    return handleGetInvites(data.adminToken);
  });

export const updateComplaint = createServerFn({ method: "POST" })
  .validator(
    z.object({
      adminToken: z.string(),
      complaintId: z.string(),
      updates: z.record(z.any()),
    }),
  )
  .handler(async ({ data }) => {
    const { handleUpdateComplaint } = await import("./admin.server");
    return handleUpdateComplaint(data);
  });

export const deleteComplaints = createServerFn({ method: "POST" })
  .validator(
    z.object({
      adminToken: z.string(),
      complaintIds: z.array(z.string()),
    }),
  )
  .handler(async ({ data }) => {
    const { handleDeleteComplaints } = await import("./admin.server");
    return handleDeleteComplaints(data);
  });

export const toggleStaffStatus = createServerFn({ method: "POST" })
  .validator((d: { adminToken: string; staffId: string; status: "active" | "suspended" }) => ({
    adminToken: z.string().parse(d.adminToken),
    staffId: z.string().parse(d.staffId),
    status: z.enum(["active", "suspended"]).parse(d.status),
  }))
  .handler(async ({ data }) => {
    const { handleToggleStaffStatus } = await import("./admin.server");
    return handleToggleStaffStatus(data);
  });

export const getInvitation = createServerFn({ method: "GET" })
  .validator((token: string) => z.string().parse(token))
  .handler(async ({ data: token }) => {
    const { handleGetInvitation } = await import("./admin.server");
    return handleGetInvitation(token);
  });

export const respondToInvitation = createServerFn({ method: "POST" })
  .validator((d: { token: string; action: "accept" | "reject"; password?: string }) => ({
    token: z.string().parse(d.token),
    action: z.enum(["accept", "reject"]).parse(d.action),
    password: d.password ? z.string().parse(d.password) : undefined,
  }))
  .handler(async ({ data }) => {
    const { handleRespondToInvitation } = await import("./admin.server");
    return handleRespondToInvitation(data.token, data.action, data.password);
  });

export const getAdminRole = createServerFn({ method: "POST" })
  .validator(z.object({ adminToken: z.string() }))
  .handler(async ({ data }) => {
    const { handleGetAdminRole } = await import("./admin.server");
    return handleGetAdminRole(data.adminToken);
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .validator(
    z.object({
      adminToken: z.string(),
      inviteId: z.string(),
      reason: z.enum(["mistake", "revoked"]),
    }),
  )
  .handler(async ({ data }) => {
    const { handleRevokeInvite } = await import("./admin.server");
    return handleRevokeInvite(data.adminToken, data.inviteId, data.reason);
  });

export const resendInvite = createServerFn({ method: "POST" })
  .validator(z.object({ adminToken: z.string(), inviteId: z.string() }))
  .handler(async ({ data }) => {
    const { handleResendInvite } = await import("./admin.server");
    return handleResendInvite(data.adminToken, data.inviteId);
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .validator(z.object({ adminToken: z.string(), staffId: z.string(), email: z.string() }))
  .handler(async ({ data }) => {
    const { handleDeleteStaff } = await import("./admin.server");
    return handleDeleteStaff(data.adminToken, data.staffId, data.email);
  });

export const getAuditLogs = createServerFn({ method: "POST" })
  .validator(
    z.object({
      adminToken: z.string(),
      limit: z.number().optional(),
      actionFilter: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { handleGetAuditLogs } = await import("./admin.server");
    return handleGetAuditLogs(data.adminToken, data.limit, data.actionFilter);
  });

export const getStaffMetrics = createServerFn({ method: "POST" })
  .validator(z.object({ adminToken: z.string(), staffEmail: z.string() }))
  .handler(async ({ data }) => {
    const { handleGetStaffMetrics } = await import("./admin.server");
    return handleGetStaffMetrics(data.adminToken, data.staffEmail);
  });

export const getSystemHealth = createServerFn({ method: "POST" })
  .validator(z.object({ adminToken: z.string() }))
  .handler(async ({ data }) => {
    const { handleGetSystemHealth } = await import("./admin.server");
    return handleGetSystemHealth(data.adminToken);
  });
