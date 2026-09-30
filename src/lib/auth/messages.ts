// User-facing copy shared across auth surfaces. Lives outside the "use server"
// module — server-action files may only export async functions.

export const PROVISIONING_FAILED_MESSAGE =
  "We created your sign-in but couldn't set up your account yet. Please try signing in again in a moment.";
