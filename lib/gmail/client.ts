import type { NormalizedEmail } from "@/types";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";
const OAUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = "https://www.googleapis.com/auth/gmail.readonly";

function getCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth credentials not configured");
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Generates the Gmail OAuth authorization URL.
 */
export function getGmailAuthUrl(state: string): string {
  const { clientId, redirectUri } = getCredentials();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${OAUTH_BASE}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access and refresh tokens.
 */
export async function exchangeGmailCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  email: string;
}> {
  const { clientId, clientSecret, redirectUri } = getCredentials();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const tokens = await response.json();

  // Get user email from Gmail profile
  const profileResponse = await fetch(`${GMAIL_API_BASE}/users/me/profile`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error("Failed to fetch Gmail profile");
  }

  const profile = await profileResponse.json();

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    email: profile.emailAddress,
  };
}

/**
 * Refreshes an expired access token.
 */
export async function refreshGmailAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const { clientId, clientSecret } = getCredentials();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

/**
 * Fetches recent emails from Gmail (last N hours).
 */
export async function fetchGmailRecentEmails(
  accessToken: string,
  hoursBack: number = 3,
  maxResults: number = 20,
): Promise<Array<{ id: string; threadId: string }>> {
  const afterTimestamp = Math.floor(
    (Date.now() - hoursBack * 60 * 60 * 1000) / 1000,
  );

  const params = new URLSearchParams({
    q: `after:${afterTimestamp} in:inbox`,
    maxResults: String(maxResults),
  });

  const response = await fetch(
    `${GMAIL_API_BASE}/users/me/messages?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch emails: ${error}`);
  }

  const data = await response.json();
  return data.messages || [];
}

/**
 * Gets full email detail from Gmail and normalizes it.
 */
export async function getGmailEmailDetail(
  accessToken: string,
  messageId: string,
): Promise<NormalizedEmail> {
  const response = await fetch(
    `${GMAIL_API_BASE}/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch email detail: ${error}`);
  }

  const message = await response.json();
  return normalizeGmailMessage(message);
}

function normalizeGmailMessage(
  message: Record<string, unknown>,
): NormalizedEmail {
  const headers = ((message.payload as Record<string, unknown>)?.headers ||
    []) as Array<{
    name: string;
    value: string;
  }>;

  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ||
    "";

  const body = extractGmailBody(message.payload as Record<string, unknown>);

  return {
    id: String(message.id),
    subject: getHeader("Subject") || "(No subject)",
    sender: getHeader("From"),
    date: getHeader("Date"),
    body,
    snippet: String(message.snippet || ""),
  };
}

function extractGmailBody(payload: Record<string, unknown>): string {
  // Try to get plain text body first
  const body = payload.body as Record<string, unknown> | undefined;
  if (body?.data) {
    return Buffer.from(String(body.data), "base64url").toString("utf8");
  }

  // Check parts for multipart messages
  const parts = (payload.parts || []) as Array<Record<string, unknown>>;
  for (const part of parts) {
    const mimeType = String(part.mimeType || "");
    if (mimeType === "text/plain") {
      const partBody = part.body as Record<string, unknown> | undefined;
      if (partBody?.data) {
        return Buffer.from(String(partBody.data), "base64url").toString("utf8");
      }
    }
  }

  // Fall back to HTML
  for (const part of parts) {
    const mimeType = String(part.mimeType || "");
    if (mimeType === "text/html") {
      const partBody = part.body as Record<string, unknown> | undefined;
      if (partBody?.data) {
        return Buffer.from(String(partBody.data), "base64url").toString("utf8");
      }
    }
  }

  return "";
}
