import express from "express";
import rateLimit from "express-rate-limit";
import pino from "pino";
import pinoHttp from "pino-http";
import { validateUrl } from "./validate.js";
import { scrapeToMarkdown, ScrapeError } from "./engine.js";
import * as cache from "./cache.js";

const PORT = parseInt(process.env.PORT || "6008", 10);
const RATE_LIMIT_RPM = parseInt(process.env.RATE_LIMIT_RPM || "30", 10);

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

const app = express();

// Trust proxy (behind Caddy)
app.set("trust proxy", 1);

// Request logging
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

// Rate limiting (per IP)
app.use(
  rateLimit({
    windowMs: 60_000,
    max: RATE_LIMIT_RPM,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: `Rate limit exceeded. Max ${RATE_LIMIT_RPM} requests per minute.` },
    keyGenerator: (req) => req.ip || "unknown",
  })
);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const USAGE = "Reader Markdown API\n\n" +
  "Convert any URL to clean markdown.\n\n" +
  "Usage: https://md.reader.dev/<url>\n" +
  "Example: https://md.reader.dev/https://example.com\n\n" +
  "Docs: https://reader.dev/markdown\n";

// Catch-all: root and all paths
app.get("*", async (req, res) => {
  const rawUrl = req.path.slice(1); // strip leading /

  if (!rawUrl || rawUrl === "favicon.ico" || rawUrl === "robots.txt") {
    res.type("text/plain").send(USAGE);
    return;
  }

  const { url, error } = validateUrl(rawUrl);
  if (error) {
    res.status(400).type("text/plain").send(`Error: ${error}\n`);
    return;
  }

  // Check cache
  const cached = cache.get(url);
  if (cached) {
    res.set("X-Cache", "HIT")
      .set("Cache-Control", "public, max-age=3600")
      .type("text/markdown; charset=utf-8")
      .send(cached);
    return;
  }

  try {
    const result = await scrapeToMarkdown(url);
    cache.set(url, result.markdown);
    res.set("X-Cache", "MISS")
      .set("Cache-Control", "public, max-age=3600")
      .type("text/markdown; charset=utf-8")
      .send(result.markdown);
  } catch (err: unknown) {
    if (err instanceof ScrapeError) {
      const status =
        err.code === "timeout" ? 504 :
        err.code === "engine_unavailable" ? 502 :
        err.code === "empty_content" ? 422 :
        500;
      res.status(status).type("text/plain").send(`Error: ${err.message}\n`);
      return;
    }
    res.status(500).type("text/plain").send("Error: An unexpected error occurred\n");
  }
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, "reader-md-api started");
});
