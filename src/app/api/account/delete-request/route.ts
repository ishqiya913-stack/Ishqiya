import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !email.includes("@") || email.length > 320) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("account_deletion_requests")
      .insert({
        email,
        status: "pending",
      });

    if (error) {
      console.error("Account deletion request failed:", error);

      return NextResponse.json(
        { error: "Deletion request could not be submitted." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message:
        "Your deletion request has been received. If an Ishqiya account is associated with this request, it will be processed according to our account-deletion policy.",
    });
  } catch {
    return NextResponse.json(
      { error: "Deletion request could not be submitted." },
      { status: 500 }
    );
  }
}
