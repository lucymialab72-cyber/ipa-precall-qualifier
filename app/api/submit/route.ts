import { NextRequest, NextResponse } from "next/server";

const CRM_API_URL = process.env.CRM_API_URL || "https://ipa-crm.vercel.app";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      writingPnC,
      bestDescribes,
      annualPremium,
      biggestChallenge,
      name,
      email,
      phone,
      state,
      track,
    } = body;

    // Build tags
    const tags: string[] = ["cold_email", "precall_qualifier"];
    if (track) tags.push(`track:${track}`);
    if (writingPnC) tags.push(`writing_pnc:${writingPnC}`);
    if (annualPremium) tags.push(`premium:${annualPremium}`);

    // Build notes
    const notes = [
      `Pre-Call Qualifier Submission`,
      `---`,
      `Writing P&C: ${writingPnC}`,
      `Best describes: ${bestDescribes}`,
      `Annual premium: ${annualPremium}`,
      biggestChallenge ? `Biggest challenge: ${biggestChallenge}` : null,
      `Routed to: ${track?.toUpperCase()}`,
      `---`,
      `Source: Cold Email Pre-Call Qualifier`,
      `Submitted: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Determine program interest
    const programInterest = track === "mia" ? "MIA" : "IPA";

    // Send to IPA CRM
    const crmResponse = await fetch(`${CRM_API_URL}/api/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "createContact",
        params: {
          encrypted_name: name,
          encrypted_email: email,
          encrypted_phone: phone || "",
          stage: "lead",
          source: "cold_email_precall",
          tags,
          notes,
          program_interest: programInterest,
          import_source: "precall_qualifier",
        },
      }),
    });

    if (!crmResponse.ok) {
      console.error("CRM API error:", await crmResponse.text());
      // Still return success to user — don't break the UX
    }

    return NextResponse.json({ success: true, track });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json({ success: true }); // Don't expose errors to user
  }
}
