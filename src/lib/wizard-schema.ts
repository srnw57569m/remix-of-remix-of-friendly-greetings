import { z } from "zod";

export const wizardSchema = z.object({
  botToken: z.string().trim().min(1, "Bot token is required").max(500),
  roomId: z.string().trim().min(1, "Room ID is required").max(200),
  ownerUsername: z.string().trim().min(1, "Owner username is required").max(200),
  icecastServer: z.string().trim().min(1, "Icecast server is required").max(255),
  icecastPort: z.coerce.number().int().min(1).max(65535),
  mountPoint: z.string().trim().min(1, "Mount point is required").max(255),
  icecastUsername: z.string().trim().min(1, "Username is required").max(200),
  icecastPassword: z.string().min(1, "Password is required").max(500),
  agreedToTerms: z.literal(true, { errorMap: () => ({ message: "You must agree to the terms" }) }),
});

export type WizardData = z.infer<typeof wizardSchema>;

export const defaultWizardData: WizardData = {
  botToken: "",
  roomId: "",
  ownerUsername: "",
  icecastServer: "link.zeno.fm",
  icecastPort: 80,
  mountPoint: "/xxxxxxxx",
  icecastUsername: "source",
  icecastPassword: "",
  agreedToTerms: true as const,
};

// Permissive partial used while wizard is in progress
export const partialWizardData = {
  botToken: "",
  roomId: "",
  ownerUsername: "",
  icecastServer: "link.zeno.fm",
  icecastPort: 80,
  mountPoint: "/xxxxxxxx",
  icecastUsername: "source",
  icecastPassword: "",
  agreedToTerms: false,
};
