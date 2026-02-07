import type { NormalizedEmail } from "@/types";

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";
const OAUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0";
const SCOPES = "openid email Mail.Read offline_access";

function getCredentials() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Microsoft OAuth credentials not configured");
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Generates the Outlook/Microsoft 365 OAuth authorization URL.
 */
export function getOutlookAuthUrl(state: string): string {
  const { clientId, redirectUri } = getCredentials();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    response_mode: "query",
    state,
  });

  return `${OAUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access and refresh tokens.
 */
export async function exchangeOutlookCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  email: string;
}> {
  const { clientId, clientSecret, redirectUri } = getCredentials();

  const response = await fetch(`${OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: SCOPES,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const tokens = await response.json();

  // Get user email from Microsoft Graph
  const profileResponse = await fetch(`${GRAPH_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error("Failed to fetch Microsoft profile");
  }

  const profile = await profileResponse.json();

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    email: profile.mail || profile.userPrincipalName,
  };
}

/**
 * Refreshes an expired access token.
 */
export async function refreshOutlookAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const { clientId, clientSecret } = getCredentials();

  const response = await fetch(`${OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      scope: SCOPES,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

/**
 * Fetches recent emails from Outlook (last N hours).
 */
export async function fetchOutlookRecentEmails(
  accessToken: string,
  hoursBack: number = 3,
  maxResults: number = 20,
): Promise<NormalizedEmail[]> {
  const afterDate = new Date(
    Date.now() - hoursBack * 60 * 60 * 1000,
  ).toISOString();

  const params = new URLSearchParams({
    $filter: `receivedDateTime ge ${afterDate}`,
    $top: String(maxResults),
    $orderby: "receivedDateTime desc",
    $select: "id,subject,from,receivedDateTime,body,bodyPreview",
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/me/messages?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch emails: ${error}`);
  }

  const data = await response.json();
  return (data.value || []).map(normalizeOutlookMessage);
}

/**
 * Gets full email detail from Outlook and normalizes it.
 */
export async function getOutlookEmailDetail(
  accessToken: string,
  messageId: string,
): Promise<NormalizedEmail> {
  const response = await fetch(
    `${GRAPH_API_BASE}/me/messages/${messageId}?$select=id,subject,from,receivedDateTime,body,bodyPreview`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch email detail: ${error}`);
  }

  const message = await response.json();
  return normalizeOutlookMessage(message);
}

function normalizeOutlookMessage(
  message: Record<string, unknown>,
): NormalizedEmail {
  const from = message.from as Record<string, unknown> | undefined;
  const emailAddress = from?.emailAddress as
    | Record<string, unknown>
    | undefined;
  const sender = emailAddress
    ? `${emailAddress.name || ""} <${emailAddress.address || ""}>`
    : "";

  const body = message.body as Record<string, unknown> | undefined;
  const bodyContent = body?.content ? String(body.content) : "";

  return {
    id: String(message.id),
    subject: String(message.subject || "(No subject)"),
    sender,
    date: String(message.receivedDateTime || ""),
    body: bodyContent,
    snippet: String(message.bodyPreview || ""),
  };
}
