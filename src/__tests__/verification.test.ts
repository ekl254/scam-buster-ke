import { describe, it, expect } from "vitest";
import {
    normalizePhone,
    looksLikeKenyanPhone,
    calculateEvidenceScore,
    calculateVerificationTier,
    calculateReportWeight,
    shouldExpire,
    calculateExpirationDate,
    calculateCommunityAssessment,
} from "@/lib/verification";

describe("normalizePhone", () => {
    it("normalizes 07xx format to +254", () => {
        expect(normalizePhone("0712345678")).toBe("+254712345678");
    });

    it("normalizes 254xx format to +254", () => {
        expect(normalizePhone("254712345678")).toBe("+254712345678");
    });

    it("normalizes +254xx format (already normalized)", () => {
        expect(normalizePhone("+254712345678")).toBe("+254712345678");
    });

    it("normalizes 01xx format", () => {
        expect(normalizePhone("0112345678")).toBe("+254112345678");
    });

    it("returns original for non-Kenyan numbers", () => {
        expect(normalizePhone("12345")).toBe("12345");
    });

    it("strips non-digit characters before normalizing", () => {
        expect(normalizePhone("071-234-5678")).toBe("+254712345678");
    });
});

describe("looksLikeKenyanPhone", () => {
    it("detects 07xx numbers", () => {
        expect(looksLikeKenyanPhone("0712345678")).toBe(true);
    });

    it("detects +254xx numbers", () => {
        expect(looksLikeKenyanPhone("+254712345678")).toBe(true);
    });

    it("detects 254xx numbers without +", () => {
        expect(looksLikeKenyanPhone("254712345678")).toBe(true);
    });

    it("rejects short numbers (paybills)", () => {
        expect(looksLikeKenyanPhone("123456")).toBe(false);
    });

    it("rejects company names", () => {
        expect(looksLikeKenyanPhone("Acme Corp")).toBe(false);
    });
});

describe("calculateEvidenceScore", () => {
    it("returns 0 for bare minimum report", () => {
        const score = calculateEvidenceScore({
            description: "short desc",
        });
        expect(score).toBe(0);
    });

    it("adds 20 for evidence URL", () => {
        const score = calculateEvidenceScore({
            evidence_url: "https://example.com/evidence.png",
            description: "short desc",
        });
        expect(score).toBe(20);
    });

    it("adds 15 for transaction ID", () => {
        const score = calculateEvidenceScore({
            transaction_id: "QJK2ABC123",
            description: "short desc",
        });
        expect(score).toBe(15);
    });

    it("adds 5 for description > 50 chars", () => {
        const score = calculateEvidenceScore({
            description: "A".repeat(51),
        });
        expect(score).toBe(5);
    });

    it("adds 10 for description > 100 chars", () => {
        const score = calculateEvidenceScore({
            description: "A".repeat(101),
        });
        expect(score).toBe(10);
    });

    it("adds 15 for verified reporter", () => {
        const score = calculateEvidenceScore({
            description: "short",
            reporter_verified: true,
        });
        expect(score).toBe(15);
    });

    it("adds 10 for amount lost", () => {
        const score = calculateEvidenceScore({
            description: "short",
            amount_lost: 5000,
        });
        expect(score).toBe(10);
    });

    it("returns max 70 for a fully detailed report", () => {
        const score = calculateEvidenceScore({
            evidence_url: "https://example.com/evidence.png",
            transaction_id: "QJK2ABC123",
            description: "A".repeat(101),
            reporter_verified: true,
            amount_lost: 50000,
        });
        expect(score).toBe(70);
    });
});

describe("calculateVerificationTier", () => {
    it("returns tier 1 for single low-evidence report", () => {
        expect(calculateVerificationTier(10, 1)).toBe(1);
    });

    it("returns tier 2 for 2+ independent reports", () => {
        expect(calculateVerificationTier(10, 2)).toBe(2);
    });

    it("returns tier 2 for high evidence score", () => {
        expect(calculateVerificationTier(30, 1)).toBe(2);
    });

    it("returns tier 3 for 5+ reports with high evidence", () => {
        expect(calculateVerificationTier(30, 5)).toBe(3);
    });

    it("returns tier 3 for official source", () => {
        expect(calculateVerificationTier(0, 0, true)).toBe(3);
    });
});

describe("calculateReportWeight", () => {
    it("gives full weight to recent tier 3 reports", () => {
        const weight = calculateReportWeight(new Date(), 3, 70);
        expect(weight).toBeGreaterThan(1.0);
    });

    it("applies time decay after 90 days", () => {
        const old = new Date();
        old.setDate(old.getDate() - 100);
        const weight = calculateReportWeight(old, 3, 70);
        const recent = calculateReportWeight(new Date(), 3, 70);
        expect(weight).toBeLessThan(recent);
    });

    it("gives lower base weight for tier 1", () => {
        const tier1 = calculateReportWeight(new Date(), 1, 0);
        const tier3 = calculateReportWeight(new Date(), 3, 0);
        expect(tier1).toBeLessThan(tier3);
    });
});

describe("shouldExpire", () => {
    it("does not expire tier 2+ reports", () => {
        expect(shouldExpire({
            verification_tier: 2,
            evidence_score: 10,
            reporter_verified: false,
            created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        })).toBe(false);
    });

    it("expires old tier 1 reports without evidence", () => {
        const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
        expect(shouldExpire({
            verification_tier: 1,
            evidence_score: 10,
            reporter_verified: false,
            created_at: old.toISOString(),
        })).toBe(true);
    });

    it("does not expire verified reporter's reports", () => {
        const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
        expect(shouldExpire({
            verification_tier: 1,
            evidence_score: 10,
            reporter_verified: true,
            created_at: old.toISOString(),
        })).toBe(false);
    });
});

describe("calculateExpirationDate", () => {
    it("returns null for verified reporters", () => {
        expect(calculateExpirationDate(10, true)).toBeNull();
    });

    it("returns null for high evidence score", () => {
        expect(calculateExpirationDate(30, false)).toBeNull();
    });

    it("returns a date ~90 days out for low evidence", () => {
        const result = calculateExpirationDate(10, false);
        expect(result).not.toBeNull();
        const diffDays = Math.round(((result as Date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        expect(diffDays).toBeGreaterThanOrEqual(89);
        expect(diffDays).toBeLessThanOrEqual(91);
    });
});

describe("calculateCommunityAssessment", () => {
    it("returns no_reports for empty list", () => {
        const result = calculateCommunityAssessment([]);
        expect(result.concern_level).toBe("no_reports");
        expect(result.concern_score).toBe(0);
    });

    it("returns low concern for single weak report", () => {
        const result = calculateCommunityAssessment([{
            id: "1",
            identifier: "0712345678",
            identifier_type: "phone",
            scam_type: "mpesa",
            description: "test",
            is_anonymous: true,
            created_at: new Date().toISOString(),
            status: "approved",
            verification_tier: 1,
            evidence_score: 0,
            reporter_verified: false,
            is_expired: false,
        }]);
        expect(result.concern_level).toBe("moderate");
    });

    it("reduces score when disputes exist", () => {
        const reportBase = {
            id: "1",
            identifier: "0712345678",
            identifier_type: "phone" as const,
            scam_type: "mpesa" as const,
            description: "test",
            is_anonymous: true,
            created_at: new Date().toISOString(),
            status: "approved" as const,
            verification_tier: 1 as const,
            evidence_score: 0,
            reporter_verified: false,
            is_expired: false,
        };
        const withoutDispute = calculateCommunityAssessment([reportBase]);
        const withDispute = calculateCommunityAssessment([reportBase], true);
        expect(withDispute.concern_score).toBeLessThan(withoutDispute.concern_score);
    });
});
