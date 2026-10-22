import { OAuth2Client, TokenPayload } from "google-auth-library";

const client = new OAuth2Client();

export function googleLoginEmail(payload: TokenPayload | undefined): string {
  // Only Google-hosted addresses can safely match an existing account by email.
  if (!payload?.sub || !payload.email || payload.email_verified !== true ||
      (!payload.email.toLowerCase().endsWith("@gmail.com") && !payload.hd)) {
    throw new Error("Invalid Google identity");
  }
  return payload.email.trim().toLowerCase();
}

export async function verifyGoogleCredential(credential: string, clientId: string): Promise<string> {
  if (!clientId) throw new Error("Google login is not configured");
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  return googleLoginEmail(ticket.getPayload());
}
