import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase-server";
import { hashPhone } from "@/lib/verification";
import { sanitizeText, sanitizeIdentifier, sanitizeUrl } from "@/lib/sanitize";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";

// POST - Create a new dispute
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      report_id,
      identifier,
      reason,
      evidence_url,
      business_reg_number,
      contact_phone,
    } = body;

    // Rate limit
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`dispute:${clientIP}`, RATE_LIMITS.disputeCreate);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many disputes submitted. Please try again later." },
        { status: 429 }
      );
    }

    // Validate required fields
    if (!identifier || !reason || !contact_phone) {
      return NextResponse.json(
        { error: "Identifier, reason, and contact phone are required" },
        { status: 400 }
      );
    }

    if (reason.length < 20) {
      return NextResponse.json(
        { error: "Please provide a detailed reason (at least 20 characters)" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const cleanIdentifier = sanitizeIdentifier(identifier);
    const cleanReason = sanitizeText(reason);
    const cleanEvidenceUrl = evidence_url ? sanitizeUrl(evidence_url) : null;
    const cleanRegNumber = business_reg_number ? sanitizeText(business_reg_number, 100) : null;

    const contactPhoneHash = hashPhone(contact_phone);
    const supabase = createServerClient();

    // Check if this phone already has a pending dispute for this identifier
    const { data: existingDispute } = await supabase
      .from("disputes")
      .select("id")
      .eq("identifier", cleanIdentifier)
      .eq("disputed_by_phone_hash", contactPhoneHash)
      .eq("status", "pending")
      .single();

    if (existingDispute) {
      return NextResponse.json(
        { error: "You already have a pending dispute for this identifier" },
        { status: 400 }
      );
    }

    // Check if contact phone is verified
    const { data: verifiedReporter } = await supabase
      .from("verified_reporters")
      .select("phone_hash")
      .eq("phone_hash", contactPhoneHash)
      .single();

    // Create the dispute
    const { data: dispute, error: insertError } = await supabase
      .from("disputes")
      .insert({
        report_id: report_id || null,
        identifier: cleanIdentifier,
        disputed_by_phone_hash: contactPhoneHash,
        disputed_by_verified: !!verifiedReporter,
        reason: cleanReason,
        evidence_url: cleanEvidenceUrl,
        business_reg_number: cleanRegNumber,
        contact_phone_hash: contactPhoneHash,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating dispute:", insertError);
      return NextResponse.json(
        { error: "Failed to create dispute" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: dispute.id,
        status: dispute.status,
        created_at: dispute.created_at,
      },
      message: "Dispute submitted successfully. We will review it within 48-72 hours.",
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating dispute:", error);
    return NextResponse.json(
      { error: "Failed to create dispute" },
      { status: 500 }
    );
  }
}

// GET - Get disputes for an identifier or by dispute ID
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const identifier = searchParams.get("identifier");
    const disputeId = searchParams.get("id");
    const phone = searchParams.get("phone"); // To check user's own disputes

    const supabase = createServerClient();

    if (disputeId) {
      // Get single dispute by ID
      const { data: dispute, error } = await supabase
        .from("disputes")
        .select("id, identifier, reason, status, created_at, reviewed_at")
        .eq("id", disputeId)
        .single();

      if (error || !dispute) {
        return NextResponse.json(
          { error: "Dispute not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: dispute });
    }

    if (phone) {
      // Get disputes submitted by this phone
      const phoneHash = hashPhone(phone);
      const { data: disputes, error } = await supabase
        .from("disputes")
        .select("id, identifier, reason, status, created_at, reviewed_at")
        .eq("disputed_by_phone_hash", phoneHash)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch disputes" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: disputes || [] });
    }

    if (identifier) {
      // Get disputes for an identifier (public, limited info)
      const { data: disputes, error } = await supabase
        .from("disputes")
        .select("id, status, created_at")
        .eq("identifier", identifier)
        .in("status", ["pending", "under_review"])
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch disputes" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data: disputes || [],
        has_active_disputes: (disputes?.length || 0) > 0,
      });
    }

    return NextResponse.json(
      { error: "Please provide identifier, id, or phone parameter" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error fetching disputes:", error);
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
      { status: 500 }
    );
  }
}

// PATCH - Update dispute status (admin only - would need auth in production)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { dispute_id, status, admin_notes, reviewed_by } = body;

    // In production, verify admin authentication here
    const adminKey = request.headers.get("x-admin-key");
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!dispute_id || !status) {
      return NextResponse.json(
        { error: "dispute_id and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "under_review", "upheld", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      status,
      admin_notes: admin_notes || null,
    };

    if (status === "upheld" || status === "rejected") {
      updateData.reviewed_at = new Date().toISOString();
      updateData.reviewed_by = reviewed_by || "admin";
    }

    const { data: dispute, error: updateError } = await supabase
      .from("disputes")
      .update(updateData)
      .eq("id", dispute_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating dispute:", updateError);
      return NextResponse.json(
        { error: "Failed to update dispute" },
        { status: 500 }
      );
    }

    // If dispute is upheld (meaning the original report was false), mark the report as disputed
    if (status === "upheld" && dispute.report_id) {
      await supabase
        .from("reports")
        .update({
          status: "disputed",
          verification_tier: 1,
        })
        .eq("id", dispute.report_id);
    }

    return NextResponse.json({
      success: true,
      data: dispute,
    });

  } catch (error) {
    console.error("Error updating dispute:", error);
    return NextResponse.json(
      { error: "Failed to update dispute" },
      { status: 500 }
    );
  }
}
