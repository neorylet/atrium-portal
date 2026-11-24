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

type OutboxUpdate = {
  status: string
  sent_at?: string
  error_message: string | null
  claimed_at: null
}

type AdminClient = ReturnType<typeof createAdminClient>

const BATCH_LIMIT = 10
const RESEND_URL = "https://api.resend.com/emails"
const FROM_EMAIL =
  Deno.env.get("RESEND_FROM_EMAIL")?.trim() ||
  "Atrium Portal <notifications@yourdomain.com>"

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function getResendApiKey(): string {
  return (Deno.env.get("RESEND_API_KEY") ?? "").trim().replace(/^Bearer\s+/i, "")
}

async function claimOutboxBatch(
  client: AdminClient
): Promise<OutboxEmail[] | null> {
  try {
    const { data, error } = await client
      .schema("supasheet")
      .rpc("claim_email_outbox_batch", { p_limit: BATCH_LIMIT })

    if (error) {
      console.error("process-email-outbox: claim rpc error", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return null
    }

    console.log("process-email-outbox: claimed rows", data?.length ?? 0)
    return (data ?? []) as OutboxEmail[]
  } catch (error) {
    console.error(
      "process-email-outbox: claim rpc threw",
      describeError(error)
    )
    return null
  }
}

async function updateOutboxRow(
  client: AdminClient,
  id: string,
  values: OutboxUpdate
): Promise<void> {
  const { error } = await client
    .schema("supasheet")
    .from("email_outbox")
    .update(values)
    .eq("id", id)

  if (error) throw error
}

async function sendEmail(email: OutboxEmail, apiKey: string): Promise<void> {
  if (!apiKey) {
    console.log("Mock sending email:", email.recipient_email)
    return
  }

  let response: Response

  try {
    response = await fetch(RESEND_URL, {
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
  } catch (error) {
    console.error(
      "process-email-outbox: Resend fetch threw",
      email.id,
      describeError(error)
    )
    throw new Error("Resend request failed")
  }

  if (!response.ok) {
    let detail = ""
    try {
      detail = (await response.text()).slice(0, 500)
    } catch (error) {
      detail = `unable to read response: ${describeError(error)}`
    }

    console.error(
      "process-email-outbox: Resend rejected email",
      email.id,
      response.status,
      detail
    )
    throw new Error(`Resend ${response.status}: ${detail}`)
  }

  console.log(
    "process-email-outbox: Resend accepted email",
    email.id,
    response.status
  )
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-email-outbox-secret",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      })
    }

    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405)
    }

    const expectedSecret = Deno.env.get("EMAIL_OUTBOX_SECRET")
    const providedSecret =
      req.headers.get("x-webhook-secret") ??
      req.headers.get("x-email-outbox-secret")

    if (!expectedSecret) {
      console.warn(
        "process-email-outbox: EMAIL_OUTBOX_SECRET is not set; allowing unauthenticated local invocation"
      )
    } else if (!providedSecret || providedSecret !== expectedSecret) {
      return errorResponse("Unauthorized", 401)
    }

    const apiKey = getResendApiKey()
    console.log("process-email-outbox: env", {
      supabaseUrl: Deno.env.get("SUPABASE_URL") ? "set" : "missing",
      serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
        ? "set"
        : "missing",
      resendApiKey: apiKey ? "set" : "missing",
      emailOutboxSecret: expectedSecret ? "set" : "missing",
      fromEmail: FROM_EMAIL,
    })

    const supabase = createAdminClient()
    const batch = await claimOutboxBatch(supabase)

    if (batch === null) {
      return errorResponse("Failed to claim outbox batch", 500)
    }

    let success = 0
    let failed = 0

    for (const email of batch) {
      try {
        await sendEmail(email, apiKey)

        try {
          await updateOutboxRow(supabase, email.id, {
            status: "sent",
            sent_at: new Date().toISOString(),
            error_message: null,
            claimed_at: null,
          })
          success++
        } catch (error) {
          failed++
          console.error(
            "process-email-outbox: sent but status update failed",
            email.id,
            describeError(error)
          )
        }
      } catch (error) {
        failed++

        const message = describeError(error)
        console.error("process-email-outbox: email failed", email.id, message)

        try {
          await updateOutboxRow(supabase, email.id, {
            status: "failed",
            error_message: message.slice(0, 500),
            claimed_at: null,
          })
        } catch (updateError) {
          console.error(
            "process-email-outbox: failed status update after send failure",
            email.id,
            describeError(updateError)
          )
        }
      }
    }

    return jsonResponse({
      processed: batch.length,
      success,
      failed,
    })
  } catch (error) {
    console.error("process-email-outbox: unhandled error", describeError(error))
    return errorResponse("Internal server error", 500)
  }
})
