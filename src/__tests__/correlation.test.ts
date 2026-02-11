import { describe, it, expect } from "vitest";
import {
    detectCoordinatedReports,
    analyzeNewReport,
    countIndependentReports,
    getIndependenceSummary,
} from "@/lib/correlation";

const makeReport = (overrides: Record<string, unknown> = {}) => ({
    id: "1",
    identifier: "0712345678",
    reporter_phone_hash: null,
    reporter_ip_hash: null,
    description: "I was scammed by this number. They asked me to send money for a fake promotion.",
    created_at: new Date().toISOString(),
    ...overrides,
});

describe("detectCoordinatedReports", () => {
    it("returns independent for a single report", () => {
        const result = detectCoordinatedReports([makeReport()]);
        expect(result.isIndependent).toBe(true);
        expect(result.confidence).toBe(1.0);
        expect(result.flags).toHaveLength(0);
    });

    it("flags same reporter phone hash", () => {
        const reports = [
            makeReport({ id: "1", reporter_phone_hash: "hash_a" }),
            makeReport({ id: "2", reporter_phone_hash: "hash_a" }),
        ];
        const result = detectCoordinatedReports(reports);
        expect(result.flags).toContain("same_reporter_phone");
        expect(result.confidence).toBeLessThan(1.0);
    });

    it("flags same IP address", () => {
        const reports = [
            makeReport({ id: "1", reporter_ip_hash: "ip_hash_1" }),
            makeReport({ id: "2", reporter_ip_hash: "ip_hash_1" }),
        ];
        const result = detectCoordinatedReports(reports);
        expect(result.flags).toContain("same_ip_address");
    });

    it("flags timing cluster for reports within 30 minutes", () => {
        const now = new Date();
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const reports = [
            makeReport({ id: "1", created_at: now.toISOString() }),
            makeReport({ id: "2", created_at: fiveMinAgo.toISOString() }),
        ];
        const result = detectCoordinatedReports(reports);
        expect(result.flags).toContain("timing_cluster");
    });

    it("flags similar descriptions", () => {
        const reports = [
            makeReport({ id: "1", description: "They asked me to send money to claim my prize from a fake M-Pesa promotion message." }),
            makeReport({ id: "2", description: "They asked me to send money to claim my prize from a fake M-Pesa promotion message too." }),
        ];
        const result = detectCoordinatedReports(reports);
        expect(result.flags).toContain("similar_descriptions");
    });

    it("does not flag genuinely independent reports", () => {
        const dayAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const reports = [
            makeReport({ id: "1", reporter_phone_hash: "hash_a", reporter_ip_hash: "ip_1", description: "They pretended to be Safaricom support and asked for my PIN.", created_at: dayAgo.toISOString() }),
            makeReport({ id: "2", reporter_phone_hash: "hash_b", reporter_ip_hash: "ip_2", description: "I received a message about winning a car and they wanted money to process the claim." }),
        ];
        const result = detectCoordinatedReports(reports);
        expect(result.isIndependent).toBe(true);
    });
});

describe("countIndependentReports", () => {
    it("counts unique phone hashes", () => {
        const reports = [
            makeReport({ id: "1", reporter_phone_hash: "a" }),
            makeReport({ id: "2", reporter_phone_hash: "b" }),
            makeReport({ id: "3", reporter_phone_hash: "a" }),
        ];
        expect(countIndependentReports(reports)).toBe(2);
    });

    it("falls back to IP hash for anonymous reports", () => {
        const reports = [
            makeReport({ id: "1", reporter_ip_hash: "ip_a" }),
            makeReport({ id: "2", reporter_ip_hash: "ip_b" }),
        ];
        expect(countIndependentReports(reports)).toBe(2);
    });

    it("counts fully anonymous reports as separate", () => {
        const reports = [
            makeReport({ id: "1" }),
            makeReport({ id: "2" }),
        ];
        expect(countIndependentReports(reports)).toBe(2);
    });
});

describe("analyzeNewReport", () => {
    it("marks first report as likely genuine", () => {
        const result = analyzeNewReport(makeReport(), []);
        expect(result.isLikelyGenuine).toBe(true);
        expect(result.recommendedTier).toBe(1);
    });

    it("recommends tier 2 when corroborated by existing reports", () => {
        const dayAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const existing = [
            makeReport({ id: "1", reporter_phone_hash: "hash_a", reporter_ip_hash: "ip_1", created_at: dayAgo.toISOString() }),
        ];
        const newReport = makeReport({ id: "new", reporter_phone_hash: "hash_b", reporter_ip_hash: "ip_2", description: "A totally different scam experience with this number." });
        const result = analyzeNewReport(newReport, existing);
        expect(result.isLikelyGenuine).toBe(true);
        expect(result.recommendedTier).toBe(2);
    });
});

describe("getIndependenceSummary", () => {
    it("returns no-reports message for empty list", () => {
        const result = getIndependenceSummary([]);
        expect(result.totalReports).toBe(0);
        expect(result.summary).toContain("No reports");
    });

    it("returns awaiting corroboration for single report", () => {
        const result = getIndependenceSummary([makeReport()]);
        expect(result.summary).toContain("awaiting corroboration");
    });
});
