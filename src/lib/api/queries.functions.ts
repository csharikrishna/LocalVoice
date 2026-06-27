import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPublicComplaints = createServerFn({ method: "GET" }).handler(async () => {
  const { handleGetPublicComplaints } = await import("./queries.server");
  return handleGetPublicComplaints();
});

export const getTrendingComplaints = createServerFn({ method: "GET" }).handler(async () => {
  const { handleGetTrendingComplaints } = await import("./queries.server");
  return handleGetTrendingComplaints();
});

export const getComplaintByToken = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const { handleGetComplaintByToken } = await import("./queries.server");
    return handleGetComplaintByToken(data.token);
  });

export const getMyReports = createServerFn({ method: "POST" })
  .validator(z.object({ ids: z.array(z.string()) }))
  .handler(async ({ data }) => {
    const { handleGetMyReports } = await import("./queries.server");
    return handleGetMyReports(data.ids);
  });

export const getAdminComplaints = createServerFn({ method: "POST" })
  .validator(z.object({ adminToken: z.string(), cursor: z.string().optional() }))
  .handler(async ({ data }) => {
    const { handleGetAdminComplaints } = await import("./queries.server");
    return handleGetAdminComplaints(data.adminToken, data.cursor);
  });
