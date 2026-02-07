const MAX_LENGTH = 50000;

/**
 * Strips HTML tags from a string.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escapes special characters for safe display.
 */
function escapeSpecialChars(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Sanitizes email content for safe display and processing.
 * Strips HTML, escapes special chars, and truncates to max length.
 */
export function sanitizeEmailContent(
  content: string | null | undefined,
): string {
  if (!content) return "";

  let sanitized = stripHtml(content);
  sanitized = escapeSpecialChars(sanitized);

  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.slice(0, MAX_LENGTH) + "...";
  }

  return sanitized;
}

/**
 * Sanitizes an email subject line.
 */
export function sanitizeEmailSubject(
  subject: string | null | undefined,
): string {
  if (!subject) return "(No subject)";

  let sanitized = stripHtml(subject);
  sanitized = escapeSpecialChars(sanitized);

  if (sanitized.length > 500) {
    sanitized = sanitized.slice(0, 500) + "...";
  }

  return sanitized;
}
