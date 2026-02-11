"use client";

import { useState } from "react";
import { Flag, Loader2, X } from "lucide-react";

interface FlagButtonProps {
    reportId: string;
}

export function FlagButton({ reportId }: FlagButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) return;

        setIsSubmitting(true);
        setError("");

        try {
            const res = await fetch("/api/flags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reportId, reason }),
            });

            if (!res.ok) throw new Error("Failed to submit flag");

            setSuccess(true);
            setTimeout(() => {
                setIsOpen(false);
                setSuccess(false);
                setReason("");
            }, 2000);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Flag as inappropriate"
                aria-label="Flag report"
            >
                <Flag className="h-4 w-4" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Flag Report</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Help keep our community safe. Why is this report inappropriate?
                        </p>

                        {success ? (
                            <div className="py-8 text-center text-green-600">
                                <p className="font-medium">Thank you for reporting.</p>
                                <p className="text-sm">We will review this content shortly.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <textarea
                                    placeholder="e.g. Contains personal information, abusive language, or spam..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none text-sm"
                                    required
                                    maxLength={500}
                                />

                                {error && <p className="text-sm text-red-500">{error}</p>}

                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !reason.trim()}
                                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Submit Flag
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
