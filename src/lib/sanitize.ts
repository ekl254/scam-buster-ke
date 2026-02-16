/**
 * Input sanitization for user-submitted content.
 * Strips HTML tags and dangerous characters to prevent XSS.
 */

// Strip all HTML tags from a string
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

// Sanitize user text input: strip HTML, normalize whitespace, trim
export function sanitizeText(input: string, maxLength: number = 5000): string {
  let clean = stripHtml(input);
  // Remove null bytes
  clean = clean.replace(/\0/g, "");
  // Normalize whitespace (collapse multiple spaces/newlines)
  clean = clean.replace(/\s+/g, " ");
  // Trim and enforce max length
  return clean.trim().slice(0, maxLength);
}

// Sanitize an identifier (phone, paybill, email, etc.) — stricter rules
export function sanitizeIdentifier(input: string, maxLength: number = 500): string {
  let clean = stripHtml(input);
  clean = clean.replace(/\0/g, "");
  // Only allow printable ASCII and common unicode, strip control chars
  clean = clean.replace(/[\x00-\x1F\x7F]/g, "");
  return clean.trim().slice(0, maxLength);
}

// Escape PostgREST special characters for safe use in .ilike() / .like() filters
export function escapePostgrestFilter(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/\./g, "\\.")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/%/g, "\\%")
    .replace(/\*/g, "\\*");
}

// Sanitize a URL (evidence links)
export function sanitizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    // Only allow http/https protocols
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
