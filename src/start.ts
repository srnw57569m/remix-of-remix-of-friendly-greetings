import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware({ type: "request" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    // Re-throw so the worker entry (src/server.ts) renders the branded
    // fallback. Returning a raw Response from a request middleware corrupts
    // the next() result shape and triggers
    // "Cannot read properties of undefined (reading 'method')" in the dev plugin.
    throw error;
  }
});
// Keep the import alive — used by src/server.ts for the actual fallback page.
void renderErrorPage;

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
