import {
  createAdminClient,
  errorResponse,
  jsonResponse,
} from "../_shared/admin.ts"

type OutboxEmail = {
  id: string
  recipient_email: string
  subject: string
  body: string
}

const BATCH_LIMIT = 10
const RESEND_URL = "https://api.resend.com/emails"
const FROM_EMAIL =
  Deno.env.get("RESEND_FROM_EMAIL") ??
  "Atrium Portal <notifications@yourdomain.com>"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-email-outbox-secret",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    })
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405)
  }

  const expectedSecret = Deno.env.get("EMAIL_OUTBOX_SECRET")
  if (!expectedSecret) {
    return errorResponse("EMAIL_OUTBOX_SECRET is not configured", 500)
  }

  const providedSecret = req.headers.get("x-email-outbox-secret")
  if (!providedSecret || providedSecret !== expectedSecret) {
    return errorResponse("Unauthorized", 401)
  }

  const supabase = createAdminClient()

  const { data: emails, error: claimError } = await supabase
    .schema("supasheet")
    .rpc("claim_email_outbox_batch", { p_limit: BATCH_LIMIT })

  if (claimError) {
    console.error("process-email-outbox: claim failed", claimError)
    return errorResponse("Failed to claim outbox batch", 500)
  }

  const batch = (emails ?? []) as OutboxEmail[]
  let success = 0
  let failed = 0
  const apiKey = Deno.env.get("RESEND_API_KEY")

  for (const email of batch) {
    try {
      if (!apiKey) {
        console.log("Mock sending email:", email.recipient_email)
      } else {
        const response = await fetch(RESEND_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: email.recipient_email,
            subject: email.subject,
            text: email.body,
          }),
        })

        if (!response.ok) {
          const detail = (await response.text()).slice(0, 500)
          throw new Error(`Resend ${response.status}: ${detail}`)
        }
      }

      const { error: updateError } = await supabase
        .schema("supasheet")
        .from("email_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error_message: null,
          claimed_at: null,
        })
        .eq("id", email.id)

      if (updateError) throw updateError
      success++
    } catch (error) {
      failed++

      const message =
        error instanceof Error ? error.message : "Unknown sending error"
      console.error("process-email-outbox: send failed", email.id, message)

      const { error: updateError } = await supabase
        .schema("supasheet")
        .from("email_outbox")
        .update({
          status: "failed",
          error_message: message.slice(0, 500),
          claimed_at: null,
        })
        .eq("id", email.id)

      if (updateError) {
        console.error(
          "process-email-outbox: failed status update",
          email.id,
          updateError
        )
      }
    }
  }

  return jsonResponse({
    processed: batch.length,
    success,
    failed,
  })
})
