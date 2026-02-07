import { inngest } from "./client";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { decrypt, encrypt } from "@/lib/encryption";
import { extractTasksFromEmail } from "@/lib/claude/extractor";
import { generateBriefing } from "@/lib/claude/briefing-generator";
import { sanitizeEmailSubject } from "@/lib/email/sanitize";
import {
  fetchGmailRecentEmails,
  getGmailEmailDetail,
  refreshGmailAccessToken,
} from "@/lib/gmail/client";
import {
  fetchOutlookRecentEmails,
  refreshOutlookAccessToken,
} from "@/lib/outlook/client";
import type {
  NormalizedEmail,
  EmailProvider,
  Task,
  BriefingPreference,
} from "@/types";

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function fetchEmails(
  provider: EmailProvider,
  accessToken: string,
  hoursBack: number,
): Promise<NormalizedEmail[]> {
  if (provider === "outlook") {
    return fetchOutlookRecentEmails(accessToken, hoursBack);
  }

  // Gmail returns message stubs; need to fetch details individually
  const stubs = await fetchGmailRecentEmails(accessToken, hoursBack);
  const emails: NormalizedEmail[] = [];
  for (const stub of stubs) {
    const detail = await getGmailEmailDetail(accessToken, stub.id);
    emails.push(detail);
  }
  return emails;
}

async function refreshToken(
  provider: EmailProvider,
  refreshTokenEncrypted: string,
): Promise<{ access_token: string; encrypted_access_token: string }> {
  const refreshTokenDecrypted = decrypt(refreshTokenEncrypted);

  if (provider === "outlook") {
    const result = await refreshOutlookAccessToken(refreshTokenDecrypted);
    return {
      access_token: result.access_token,
      encrypted_access_token: encrypt(result.access_token),
    };
  }

  const result = await refreshGmailAccessToken(refreshTokenDecrypted);
  return {
    access_token: result.access_token,
    encrypted_access_token: encrypt(result.access_token),
  };
}

function isQuietHours(
  quietStart: string | null,
  quietEnd: string | null,
): boolean {
  if (!quietStart || !quietEnd) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = quietStart.split(":").map(Number);
  const [endH, endM] = quietEnd.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Overnight quiet hours (e.g., 22:00 - 06:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

async function processScanConfig(
  configId: string,
  supabase: ReturnType<typeof getAdminClient>,
) {
  const { data: config, error: configError } = await supabase
    .from("email_scan_configs")
    .select("*")
    .eq("id", configId)
    .single();

  if (configError || !config) {
    throw new Error(`Config not found: ${configId}`);
  }

  if (!config.enabled) return;

  // Check quiet hours
  if (isQuietHours(config.quiet_hours_start, config.quiet_hours_end)) return;

  // Check weekend
  if (!config.weekend_scan && isWeekend()) return;

  // Create scan log
  const { data: scanLog, error: logError } = await supabase
    .from("email_scan_logs")
    .insert({
      config_id: config.id,
      workspace_id: config.workspace_id,
      emails_scanned: 0,
      tasks_extracted: 0,
      tasks_for_review: 0,
      errors: [],
      started_at: new Date().toISOString(),
      status: "running",
    })
    .select()
    .single();

  if (logError || !scanLog) {
    throw new Error("Failed to create scan log");
  }

  const errors: string[] = [];
  let emailsScanned = 0;
  let tasksExtracted = 0;
  let tasksForReview = 0;

  try {
    // Refresh access token
    const { access_token, encrypted_access_token } = await refreshToken(
      config.provider,
      config.encrypted_refresh_token,
    );

    // Update encrypted access token
    await supabase
      .from("email_scan_configs")
      .update({ encrypted_access_token })
      .eq("id", config.id);

    // Fetch recent emails
    const emails = await fetchEmails(
      config.provider,
      access_token,
      config.scan_interval_hours,
    );

    emailsScanned = emails.length;

    for (const email of emails) {
      try {
        // Dedup: check if we've already processed this email
        const { data: existingSource } = await supabase
          .from("sources")
          .select("id")
          .eq("workspace_id", config.workspace_id)
          .eq("type", "email")
          .eq("external_id", email.id)
          .maybeSingle();

        if (existingSource) continue;

        // Extract tasks
        const extracted = await extractTasksFromEmail({
          subject: email.subject,
          sender: email.sender,
          body: email.body,
          date: email.date,
        });

        if (extracted.length === 0) continue;

        // Create source record
        const { data: source, error: sourceError } = await supabase
          .from("sources")
          .insert({
            workspace_id: config.workspace_id,
            type: "email",
            external_id: email.id,
            title: sanitizeEmailSubject(email.subject),
            content_preview: email.snippet?.slice(0, 200) || null,
            metadata: {
              sender: email.sender,
              subject: email.subject,
              date: email.date,
              provider: config.provider,
            },
            processed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (sourceError || !source) {
          errors.push(`Failed to create source for email ${email.id}`);
          continue;
        }

        // Create tasks
        for (const task of extracted) {
          const needsReview =
            task.confidence_score < config.confidence_threshold;

          const { error: taskError } = await supabase.from("tasks").insert({
            workspace_id: config.workspace_id,
            title: task.title,
            description: task.description,
            status: "inbox",
            priority: task.priority,
            due_date: task.due_date,
            creator_id: config.user_id,
            source_type: "email",
            source_id: source.id,
            confidence_score: task.confidence_score,
            needs_review: needsReview,
            tags: [],
            position: 0,
          });

          if (taskError) {
            errors.push(`Failed to create task: ${taskError.message}`);
          } else {
            tasksExtracted++;
            if (needsReview) tasksForReview++;
          }
        }
      } catch (emailError) {
        errors.push(
          `Error processing email ${email.id}: ${emailError instanceof Error ? emailError.message : "Unknown error"}`,
        );
      }
    }

    // Update scan log
    await supabase
      .from("email_scan_logs")
      .update({
        emails_scanned: emailsScanned,
        tasks_extracted: tasksExtracted,
        tasks_for_review: tasksForReview,
        errors,
        completed_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", scanLog.id);

    // Update last_scan_at
    await supabase
      .from("email_scan_configs")
      .update({ last_scan_at: new Date().toISOString() })
      .eq("id", config.id);

    // Create notifications
    if (tasksExtracted > 0) {
      await supabase.from("notifications").insert({
        workspace_id: config.workspace_id,
        user_id: config.user_id,
        type: "scan_complete",
        title: "Email scan complete",
        message: `${tasksExtracted} task${tasksExtracted !== 1 ? "s" : ""} extracted, ${tasksForReview} for review`,
        read: false,
        action_url: tasksForReview > 0 ? "/review" : "/inbox",
      });
    }

    if (tasksForReview > 0) {
      await supabase.from("notifications").insert({
        workspace_id: config.workspace_id,
        user_id: config.user_id,
        type: "review_needed",
        title: "Tasks need review",
        message: `${tasksForReview} new task${tasksForReview !== 1 ? "s" : ""} need your review`,
        read: false,
        action_url: "/review",
      });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unknown scan error");

    await supabase
      .from("email_scan_logs")
      .update({
        emails_scanned: emailsScanned,
        tasks_extracted: tasksExtracted,
        tasks_for_review: tasksForReview,
        errors,
        completed_at: new Date().toISOString(),
        status: "failed",
      })
      .eq("id", scanLog.id);
  }
}

/**
 * Scheduled scan: runs every 3 hours, processes all enabled configs.
 */
export const scanEmails = inngest.createFunction(
  { id: "email-scan-scheduled", name: "Scheduled Email Scan" },
  { cron: "0 */3 * * *" },
  async ({ step }) => {
    const supabase = getAdminClient();

    const configs = await step.run("fetch-enabled-configs", async () => {
      const { data, error } = await supabase
        .from("email_scan_configs")
        .select("id")
        .eq("enabled", true);

      if (error) throw error;
      return data || [];
    });

    for (const config of configs) {
      await step.run(`scan-config-${config.id}`, async () => {
        await processScanConfig(config.id, supabase);
      });
    }

    return { processed: configs.length };
  },
);

/**
 * Manual scan: triggered by user from Settings UI.
 */
export const scanEmailsManual = inngest.createFunction(
  { id: "email-scan-manual", name: "Manual Email Scan" },
  { event: "email/scan.requested" },
  async ({ event, step }) => {
    const { config_id } = event.data;
    const supabase = getAdminClient();

    await step.run("scan-config", async () => {
      await processScanConfig(config_id, supabase);
    });

    return { config_id };
  },
);

// ============================================================================
// DAILY BRIEFING GENERATION
// ============================================================================

function getUserLocalHour(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  } catch {
    return -1;
  }
}

/**
 * Hourly cron: checks all enabled briefing_preferences and generates briefings
 * for users whose delivery_time falls within the current hour.
 */
export const generateDailyBriefings = inngest.createFunction(
  { id: "daily-briefing-generation", name: "Daily Briefing Generation" },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const supabase = getAdminClient();

    const preferences = await step.run(
      "fetch-enabled-preferences",
      async () => {
        const { data, error } = await supabase
          .from("briefing_preferences")
          .select("*")
          .eq("enabled", true);

        if (error) throw error;
        return (data || []) as BriefingPreference[];
      },
    );

    let generated = 0;

    for (const pref of preferences) {
      await step.run(`generate-briefing-${pref.id}`, async () => {
        // Check if current hour in user's timezone matches delivery_time hour
        const deliveryHour = parseInt(pref.delivery_time.split(":")[0], 10);
        const currentHour = getUserLocalHour(pref.timezone);

        if (currentHour !== deliveryHour) return;

        // Get today's date in user's timezone
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: pref.timezone,
        }).format(new Date()); // en-CA gives YYYY-MM-DD format

        // Skip if briefing already exists for today
        const { data: existing } = await supabase
          .from("briefings")
          .select("id")
          .eq("workspace_id", pref.workspace_id)
          .eq("user_id", pref.user_id)
          .eq("date", today)
          .maybeSingle();

        if (existing) return;

        // Fetch tasks
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("workspace_id", pref.workspace_id);

        // Generate briefing
        const content = await generateBriefing((tasks || []) as Task[], pref);

        // Insert briefing
        await supabase.from("briefings").insert({
          workspace_id: pref.workspace_id,
          user_id: pref.user_id,
          date: today,
          content,
        });

        // Create notification
        await supabase.from("notifications").insert({
          workspace_id: pref.workspace_id,
          user_id: pref.user_id,
          type: "briefing_ready",
          title: "Daily briefing ready",
          message: "Your personalized daily briefing is ready to view",
          read: false,
          action_url: "/briefing",
        });

        generated++;
      });
    }

    return { checked: preferences.length, generated };
  },
);
