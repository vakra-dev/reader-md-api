const ENGINE_URL = process.env.READER_ENGINE_URL || "http://localhost:6003";
const ENGINE_TIMEOUT = parseInt(process.env.ENGINE_TIMEOUT || "30000", 10);

interface EngineResult {
  success: boolean;
  data?: {
    data: Array<{
      markdown: string;
      metadata: {
        statusCode?: number;
        duration?: number;
        finalUrl?: string;
      };
    }>;
  };
  error?: string;
  code?: string;
}

export async function scrapeToMarkdown(url: string): Promise<{
  markdown: string;
  statusCode?: number;
  duration?: number;
  finalUrl?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ENGINE_TIMEOUT);

  try {
    const response = await fetch(ENGINE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "scrape",
        options: {
          urls: [url],
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
      signal: controller.signal,
    });

    const result: EngineResult = await response.json();

    if (!result.success || !result.data?.data?.[0]) {
      const code = result.code || "scrape_failed";
      const message = result.error || "Failed to scrape URL";
      throw new ScrapeError(code, message);
    }

    const page = result.data.data[0];
    if (!page.markdown || page.markdown.trim().length === 0) {
      throw new ScrapeError("empty_content", "No content extracted from URL");
    }

    return {
      markdown: page.markdown,
      statusCode: page.metadata?.statusCode,
      duration: page.metadata?.duration,
      finalUrl: page.metadata?.finalUrl,
    };
  } catch (error: unknown) {
    if (error instanceof ScrapeError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ScrapeError("timeout", `Scrape timed out after ${ENGINE_TIMEOUT}ms`);
    }
    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      throw new ScrapeError("engine_unavailable", "Reader engine is not available");
    }
    throw new ScrapeError("internal_error", "An unexpected error occurred");
  } finally {
    clearTimeout(timeout);
  }
}

export class ScrapeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ScrapeError";
    this.code = code;
  }
}
