import { z } from "zod";
import type { PlanChoice } from "./wizard-schema";

export const moderationWizardSchema = z.object({
  botToken: z.string().trim().min(1, "Bot token is required").max(500),
  roomId: z.string().trim().min(1, "Room ID is required").max(200),
  ownerUsername: z.string().trim().min(1, "Owner username is required").max(200),
  welcomeMessages: z.array(z.string().trim().max(500)).default([]),
  byeMessages: z.array(z.string().trim().max(500)).default([]),
  agreedToTerms: z.literal(true, { errorMap: () => ({ message: "You must agree to the terms" }) }),
});

export type ModerationWizardData = z.infer<typeof moderationWizardSchema>;

export const partialModerationWizardData = {
  botToken: "",
  roomId: "",
  ownerUsername: "",
  welcomeMessages: [] as string[],
  byeMessages: [] as string[],
  agreedToTerms: false,
  plan: "" as PlanChoice | "",
};
