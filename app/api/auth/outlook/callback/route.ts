import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeOutlookCodeForTokens } from "@/lib/outlook/client";
import { encrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/settings?outlook=error&message=${encodeURIComponent(error)}`,
          request.url,
        ),
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        new URL(
          "/settings?outlook=error&message=Missing+code+or+state",
          request.url,
        ),
      );
    }

    // Decode state
    let state: { user_id: string; workspace_id: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/settings?outlook=error&message=Invalid+state", request.url),
      );
    }

    // Verify state user matches authenticated user
    if (state.user_id !== user.id) {
      return NextResponse.redirect(
        new URL("/settings?outlook=error&message=State+mismatch", request.url),
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeOutlookCodeForTokens(code);

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    const admin = createAdminClient();

    // Upsert email_scan_configs
    const { error: upsertError } = await admin
      .from("email_scan_configs")
      .upsert(
        {
          workspace_id: state.workspace_id,
          user_id: user.id,
          provider: "outlook",
          enabled: true,
          scan_interval_hours: 3,
          confidence_threshold: 0.7,
          weekend_scan: false,
          encrypted_access_token: encryptedAccessToken,
          encrypted_refresh_token: encryptedRefreshToken,
          email_address: tokens.email,
        },
        { onConflict: "workspace_id,user_id" },
      );

    if (upsertError) {
      return NextResponse.redirect(
        new URL(
          `/settings?outlook=error&message=${encodeURIComponent(upsertError.message)}`,
          request.url,
        ),
      );
    }

    return NextResponse.redirect(
      new URL("/settings?outlook=connected", request.url),
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.redirect(
      new URL(
        `/settings?outlook=error&message=${encodeURIComponent(message)}`,
        request.url,
      ),
    );
  }
}
