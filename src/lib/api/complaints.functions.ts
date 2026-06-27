import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";

import { CATEGORIES, DESCRIPTION_MAX, type CategoryId } from "../civic-logic";

const CATEGORY_IDS = CATEGORIES.map((category) => category.id) as [CategoryId, ...CategoryId[]];

export const submitComplaintSchema = z.object({
  category: z.enum(CATEGORY_IDS),
  location: z.string().trim().min(1).max(500),
  coordinates: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .nullable(),
  description: z.string().trim().min(10).max(DESCRIPTION_MAX),
  photoBase64: z
    .string()
    .min(1)
    .regex(/^data:image\/(jpeg|png|webp);base64,/, "Photo must be a valid base64 image")
    .nullable(),
  isAnonymous: z.boolean(),
  captchaToken: z.string().min(1),
  clientId: z.string().min(8).max(128).optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export type SubmitComplaintInput = z.infer<typeof submitComplaintSchema>;

const getSubmitComplaintHandler = createServerOnlyFn(async () => {
  const { handleSubmitComplaint } = await import("./complaints.server");
  return handleSubmitComplaint;
});

export const submitComplaint = createServerFn({ method: "POST" })
  .validator(submitComplaintSchema)
  .handler(async ({ data }) => {
    const handleSubmitComplaint = await getSubmitComplaintHandler();
    return handleSubmitComplaint(data);
  });

export const upvoteComplaint = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), email: z.string().email().optional().or(z.literal("")) }))
  .handler(async ({ data }) => {
    const { handleUpvoteComplaint } = await import("./complaints.server");
    return handleUpvoteComplaint(data.id, data.email);
  });

export const sendReceiptEmail = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      email: z.string().email(),
      base64Image: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/),
    }),
  )
  .handler(async ({ data }) => {
    const { handleSendReceiptEmail } = await import("./complaints.server");
    return handleSendReceiptEmail(data);
  });
