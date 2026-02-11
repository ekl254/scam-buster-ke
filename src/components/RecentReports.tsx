"use client";

import { useState, useEffect } from "react";
import { ScamCard } from "@/components/ScamCard";
import { Loader2 } from "lucide-react";

interface ScamReport {
    id: string;
    identifier: string;
    identifier_type: string;
    scam_type: string;
    description: string;
    amount_lost: number | null;
    is_anonymous: boolean;
    created_at: string;
    verification_tier: number;
    evidence_score: number;
    reporter_verified: boolean;
}

export function RecentReports() {
    const [recentScams, setRecentScams] = useState<ScamReport[]>([]);
    const [scamsLoading, setScamsLoading] = useState(true);

    useEffect(() => {
        async function fetchRecentScams() {
            try {
                const response = await fetch("/api/reports?page=1&pageSize=3&sort=recent");
                if (response.ok) {
                    const data = await response.json();
                    setRecentScams(data.data);
                }
            } catch (error) {
                console.error("Error fetching recent scams:", error);
            } finally {
                setScamsLoading(false);
            }
        }

        fetchRecentScams();
    }, []);

    if (scamsLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentScams.length > 0 ? (
                recentScams.map((scam) => (
                    <ScamCard
                        key={scam.id}
                        id={scam.id}
                        identifier={scam.identifier}
                        identifierType={scam.identifier_type}
                        scamType={scam.scam_type as "mpesa" | "land" | "jobs" | "investment" | "tender" | "online" | "romance" | "other"}
                        description={scam.description}
                        amountLost={scam.amount_lost || undefined}
                        createdAt={scam.created_at}
                        isAnonymous={scam.is_anonymous}
                        verificationTier={scam.verification_tier as 1 | 2 | 3}
                        evidenceScore={scam.evidence_score}
                        reporterVerified={scam.reporter_verified}
                    />
                ))
            ) : (
                <p className="text-gray-500 col-span-3 text-center py-8">
                    No scam reports yet. Be the first to report!
                </p>
            )}
        </div>
    );
}
