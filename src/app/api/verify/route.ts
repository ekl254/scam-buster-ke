import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { createServerClient } from "@/lib/supabase-server";
import { normalizePhone, hashPhone } from "@/lib/verification";

// Generate a 6-digit OTP
function generateOTP(): string {
  return randomInt(100000, 999999).toString();
}

// Hash OTP for storage
function hashOTP(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

// POST - Send OTP to phone number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, action } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    const phoneHash = hashPhone(normalizedPhone);
    const supabase = createServerClient();

    if (action === "send") {
      // Generate OTP
      const otp = generateOTP();
      const otpHash = hashOTP(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Check rate limiting (max 3 OTPs per phone per hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { count } = await supabase
        .from("phone_verifications")
        .select("*", { count: "exact", head: true })
        .eq("phone_hash", phoneHash)
        .gte("created_at", oneHourAgo.toISOString());

      if (count && count >= 3) {
        return NextResponse.json(
          { error: "Too many verification attempts. Please try again later." },
          { status: 429 }
        );
      }

      // Store verification record
      const { error: insertError } = await supabase
        .from("phone_verifications")
        .insert({
          phone_hash: phoneHash,
          otp_hash: otpHash,
          verified: false,
          attempts: 0,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Error storing verification:", insertError);
        return NextResponse.json(
          { error: "Failed to initiate verification" },
          { status: 500 }
        );
      }

      // In production, send SMS via Africa's Talking or similar
      // For now, we'll use environment-based behavior
      if (process.env.NODE_ENV === "development" || process.env.SMS_PROVIDER === "mock") {
        console.log(`[DEV] OTP for ${normalizedPhone}: ${otp}`);
        return NextResponse.json({
          success: true,
          message: "OTP sent successfully",
          // Only include OTP in development for testing
          ...(process.env.NODE_ENV === "development" && { dev_otp: otp }),
          expires_in: 600, // 10 minutes in seconds
        });
      }

      // Production: Send via Africa's Talking
      if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
        try {
          const response = await fetch("https://api.africastalking.com/version1/messaging", {
            method: "POST",
            headers: {
              "apiKey": process.env.AT_API_KEY,
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json",
            },
            body: new URLSearchParams({
              username: process.env.AT_USERNAME,
              to: normalizedPhone,
              message: `Your ScamBusterKE verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
            }),
          });

          if (!response.ok) {
            throw new Error("SMS sending failed");
          }
        } catch (smsError) {
          console.error("SMS sending error:", smsError);
          return NextResponse.json(
            { error: "Failed to send verification SMS" },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: "OTP sent successfully",
        expires_in: 600,
      });

    } else if (action === "verify") {
      const { otp } = body;

      if (!otp) {
        return NextResponse.json(
          { error: "OTP is required" },
          { status: 400 }
        );
      }

      // Find the most recent unexpired verification for this phone
      const { data: verification, error: fetchError } = await supabase
        .from("phone_verifications")
        .select("*")
        .eq("phone_hash", phoneHash)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !verification) {
        return NextResponse.json(
          { error: "No pending verification found. Please request a new OTP." },
          { status: 400 }
        );
      }

      // Check attempts (max 5)
      if (verification.attempts >= 5) {
        return NextResponse.json(
          { error: "Too many failed attempts. Please request a new OTP." },
          { status: 400 }
        );
      }

      // Verify OTP
      const providedOTPHash = hashOTP(otp);
      if (providedOTPHash !== verification.otp_hash) {
        // Increment attempts
        await supabase
          .from("phone_verifications")
          .update({ attempts: verification.attempts + 1 })
          .eq("id", verification.id);

        return NextResponse.json(
          { error: "Invalid OTP" },
          { status: 400 }
        );
      }

      // Mark as verified
      await supabase
        .from("phone_verifications")
        .update({ verified: true })
        .eq("id", verification.id);

      // Add to verified reporters table
      await supabase
        .from("verified_reporters")
        .upsert({
          phone_hash: phoneHash,
          verified_at: new Date().toISOString(),
          verification_method: "otp",
        }, {
          onConflict: "phone_hash",
        });

      return NextResponse.json({
        success: true,
        verified: true,
        phone_hash: phoneHash,
        message: "Phone verified successfully",
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'send' or 'verify'." },
      { status: 400 }
    );

  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}

// GET - Check if a phone is verified
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const phoneHash = hashPhone(phone);
    const supabase = createServerClient();

    const { data: reporter } = await supabase
      .from("verified_reporters")
      .select("verified_at, trust_level, report_count")
      .eq("phone_hash", phoneHash)
      .single();

    if (!reporter) {
      return NextResponse.json({
        verified: false,
        phone_hash: phoneHash,
      });
    }

    return NextResponse.json({
      verified: true,
      phone_hash: phoneHash,
      verified_at: reporter.verified_at,
      trust_level: reporter.trust_level,
      report_count: reporter.report_count,
    });

  } catch (error) {
    console.error("Verification check error:", error);
    return NextResponse.json(
      { error: "Failed to check verification status" },
      { status: 500 }
    );
  }
}
