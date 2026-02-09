import { NextRequest, NextResponse } from "next/server";
import { fetchArticleText, extractReportsFromArticle } from "@/lib/extract";
import { sanitizeUrl } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const adminKey = request.headers.get("x-admin-key");
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const cleanUrl = sanitizeUrl(url);
    if (!cleanUrl) {
      return NextResponse.json(
        { error: "Invalid URL. Must be an http/https URL." },
        { status: 400 }
      );
    }

    // Fetch and extract
    const articleText = await fetchArticleText(cleanUrl);

    if (articleText.length < 50) {
      return NextResponse.json(
        { error: "Could not extract meaningful content from the URL" },
        { status: 422 }
      );
    }

    const reports = await extractReportsFromArticle(articleText, cleanUrl);

    return NextResponse.json({
      success: true,
      data: reports,
      article_length: articleText.length,
      message: reports.length === 0
        ? "No scam entities could be extracted from this article."
        : `Extracted ${reports.length} report(s) for review.`,
    });
  } catch (error) {
    console.error("Extraction error:", error);
    const message = error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
