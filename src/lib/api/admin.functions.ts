import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";

export const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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

export const updateComplaint = createServerFn({ method: "POST" })
  .validator(z.object({
    adminToken: z.string(),
    complaintId: z.string(),
    updates: z.record(z.any()),
  }))
  .handler(async ({ data }) => {
    const { handleUpdateComplaint } = await import("./admin.server");
    return handleUpdateComplaint(data);
  });

export const deleteComplaints = createServerFn({ method: "POST" })
  .validator(z.object({
    adminToken: z.string(),
    complaintIds: z.array(z.string()),
  }))
  .handler(async ({ data }) => {
    const { handleDeleteComplaints } = await import("./admin.server");
    return handleDeleteComplaints(data);
  });

export const toggleStaffStatus = createServerFn({ method: "POST" })
  .validator(z.object({
    adminToken: z.string(),
    staffId: z.string(),
    status: z.enum(["active", "suspended"]),
  }))
  .handler(async ({ data }) => {
    const { handleToggleStaffStatus } = await import("./admin.server");
    return handleToggleStaffStatus(data);
  });

export const getAdminRole = createServerFn({ method: "POST" })
  .validator(z.object({ adminToken: z.string() }))
  .handler(async ({ data }) => {
    const { handleGetAdminRole } = await import("./admin.server");
    return handleGetAdminRole(data.adminToken);
  });
