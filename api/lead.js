const ALLOWED_FIELDS = new Set([
  "formType", "name", "phone", "email", "childAge", "campus", "province",
  "model", "budget", "notes", "createdAt"
]);

// Sliding window in-memory rate limiter per IP: max 15 requests per minute
const ipHits = new Map();

function checkRateLimit(ip) {
  if (!ip) return true;
  const now = Date.now();
  const windowMs = 60000;
  const maxHits = 15;

  const record = ipHits.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    ipHits.set(ip, record);
    return true;
  }
  record.count++;
  ipHits.set(ip, record);
  return record.count <= maxHits;
}

function isAllowedOrigin(originHeader, requestHost) {
  if (!originHeader) return true;
  try {
    const parsed = new URL(originHeader);
    const hostname = parsed.hostname.toLowerCase();

    // Same-origin requests, including Vercel preview deployments.
    if (requestHost) {
      const requestHostname = String(requestHost).split(":")[0].toLowerCase();
      if (hostname === requestHostname) return true;
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (hostname === "princetonacademy.vn" || hostname.endsWith(".princetonacademy.vn")) return true;
    if (hostname === "princetonpartner.vercel.app") return true;
    // Allow official and branch preview deployments for Princeton Academy
    if (hostname.startsWith("princeton") && hostname.endsWith(".vercel.app")) return true;
    return false;
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ result: "error" });
  }

  // Cross-Site Request Origin validation
  const origin = req.headers.origin || req.headers.referer;
  const requestHost = req.headers["x-forwarded-host"] || req.headers.host || "";
  if (!isAllowedOrigin(origin, requestHost)) {
    return res.status(403).json({ result: "error", message: "unauthorized origin" });
  }

  // Rate Limiting by client IP
  const rawIp = req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "";
  const clientIp = String(rawIp).split(",")[0].trim();
  if (clientIp && !checkRateLimit(clientIp)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ result: "error", message: "too many requests" });
  }

  try {
    const incoming = new URLSearchParams();
    if (typeof req.body === "string") {
      new URLSearchParams(req.body).forEach((value, key) => incoming.append(key, value));
    } else if (req.body && typeof req.body === "object") {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === "string" || typeof value === "number") incoming.append(key, String(value));
      }
    }

    // Invisible Honeypot detection:
    // If bot filled out the hidden field, silently return success without forwarding upstream.
    // Parents form uses _hp_field; partner forms use _hp_company.
    const honeypot = incoming.get("_hp_field") || incoming.get("_hp_company");
    if (honeypot && honeypot.trim() !== "") {
      return res.status(200).json({ result: "success" });
    }

    const target = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!target || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(target)) {
      return res.status(503).json({ result: "error" });
    }

    const outgoing = new URLSearchParams();
    for (const [key, value] of incoming.entries()) {
      if (ALLOWED_FIELDS.has(key)) outgoing.append(key, value.slice(0, 1000));
    }

    const name = outgoing.get("name");
    const phone = outgoing.get("phone");
    if (!name || !phone) {
      return res.status(400).json({ result: "error", message: "missing required fields" });
    }

    // Server-side strict phone validation
    if (!/^\+?[0-9 ().-]{8,24}$/.test(phone)) {
      return res.status(400).json({ result: "error", message: "invalid phone" });
    }

    // Optional secret token shared with Google Apps Script
    if (process.env.LEAD_SECRET_TOKEN) {
      outgoing.append("secretToken", process.env.LEAD_SECRET_TOKEN);
    }

    const upstream = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: outgoing.toString(),
      redirect: "follow",
      signal: AbortSignal.timeout(10000)
    });
    const text = await upstream.text();
    let result;
    try { result = JSON.parse(text); } catch { result = null; }
    if (!upstream.ok || !result || result.result !== "success") {
      return res.status(502).json({ result: "error" });
    }
    return res.status(200).json({ result: "success" });
  } catch {
    return res.status(502).json({ result: "error" });
  }
};
