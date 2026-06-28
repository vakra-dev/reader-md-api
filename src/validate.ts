const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254",
]);

const BLOCKED_PROTOCOLS = new Set(["file:", "ftp:", "data:", "javascript:"]);

export function validateUrl(raw: string): { url: string; error?: string } {
  if (!raw || raw.trim().length === 0) {
    return { url: "", error: "No URL provided" };
  }

  let urlStr = raw.trim();

  // Auto-prepend https:// if no protocol
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = `https://${urlStr}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { url: "", error: "Invalid URL" };
  }

  if (BLOCKED_PROTOCOLS.has(parsed.protocol)) {
    return { url: "", error: `Protocol not allowed: ${parsed.protocol}` };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { url: "", error: `Only HTTP/HTTPS URLs are supported` };
  }

  if (BLOCKED_HOSTS.has(parsed.hostname)) {
    return { url: "", error: "This host is not allowed" };
  }

  // Block private IP ranges
  const host = parsed.hostname;
  if (
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return { url: "", error: "Private IP addresses are not allowed" };
  }

  return { url: parsed.toString() };
}
