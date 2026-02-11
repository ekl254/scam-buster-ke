import { describe, it, expect } from "vitest";
import { stripHtml, sanitizeText, sanitizeIdentifier, sanitizeUrl } from "@/lib/sanitize";

describe("stripHtml", () => {
    it("removes HTML tags", () => {
        expect(stripHtml("<b>bold</b> text")).toBe("bold text");
    });

    it("removes script tags", () => {
        expect(stripHtml('<script>alert("xss")</script>safe')).toBe('alert("xss")safe');
    });

    it("handles self-closing tags", () => {
        expect(stripHtml("before<br/>after")).toBe("beforeafter");
    });

    it("returns plain text unchanged", () => {
        expect(stripHtml("no tags here")).toBe("no tags here");
    });
});

describe("sanitizeText", () => {
    it("strips HTML and trims", () => {
        expect(sanitizeText("  <b>hello</b>  ")).toBe("hello");
    });

    it("collapses multiple spaces", () => {
        expect(sanitizeText("hello    world")).toBe("hello world");
    });

    it("removes null bytes", () => {
        expect(sanitizeText("hello\0world")).toBe("helloworld");
    });

    it("enforces max length", () => {
        const result = sanitizeText("A".repeat(6000), 5000);
        expect(result).toHaveLength(5000);
    });

    it("enforces custom max length", () => {
        const result = sanitizeText("A".repeat(200), 100);
        expect(result).toHaveLength(100);
    });
});

describe("sanitizeIdentifier", () => {
    it("strips HTML and control characters", () => {
        expect(sanitizeIdentifier("<script>0712345678</script>")).toBe("0712345678");
    });

    it("preserves valid phone numbers", () => {
        expect(sanitizeIdentifier("+254712345678")).toBe("+254712345678");
    });

    it("preserves email addresses", () => {
        expect(sanitizeIdentifier("test@example.com")).toBe("test@example.com");
    });

    it("strips control characters", () => {
        expect(sanitizeIdentifier("hello\x01world")).toBe("helloworld");
    });
});

describe("sanitizeUrl", () => {
    it("accepts valid http URLs", () => {
        expect(sanitizeUrl("https://example.com/path")).toBe("https://example.com/path");
    });

    it("accepts http URLs", () => {
        expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
    });

    it("rejects javascript: URLs", () => {
        expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    });

    it("rejects data: URLs", () => {
        expect(sanitizeUrl("data:text/html,<h1>hi</h1>")).toBeNull();
    });

    it("rejects invalid URLs", () => {
        expect(sanitizeUrl("not a url")).toBeNull();
    });

    it("returns null for empty string", () => {
        expect(sanitizeUrl("")).toBeNull();
    });

    it("trims whitespace", () => {
        expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com/");
    });
});
