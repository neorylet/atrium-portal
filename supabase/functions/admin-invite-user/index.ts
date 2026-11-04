import {
  corsHeaders,
  createAdminClient,
  errorResponse,
  jsonResponse,
  requireRole,
} from "../_shared/admin.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Verify the user is an admin
    const denied = await requireRole(req.headers.get("Authorization"), "x-admin")
    if (denied) return denied

    // 2. Parse the request body
    const {
      email,
      data: userData = {},
      redirectTo,
      org_id,
    } = await req.json().catch(() => ({}))

    if (!email) return errorResponse("Missing email", 400)

    const adminClient = createAdminClient()

    // 3. Send the invite
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { ...userData, name: email.split('@')[0] },
        redirectTo: redirectTo || 'http://localhost:3000/auth/update-password',
      }
    )

    if (inviteError) {
      console.error("admin-invite-user: inviteError", inviteError)
      return errorResponse(inviteError.message, 400)
    }

    const userId = inviteData.user.id

    // 4. Set app_metadata so RLS and JWT hook work
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: { 
        role: 'client', 
        org_id: org_id || null 
      }
    })

    if (updateError) {
      console.error("admin-invite-user: updateError", updateError)
      return errorResponse(updateError.message, 500)
    }

    // 5. Insert into supasheet.users so the UI recognizes them immediately
    if (org_id) {
      // CORRECTED: .schema() must be called before .from()
      const { error: dbError } = await adminClient
        .schema('supasheet')
        .from('users')
        .upsert({ 
          id: userId, 
          email: email, 
          name: email.split('@')[0], 
          org_id: org_id 
        })
        
      if (dbError) {
        console.error("admin-invite-user: dbError", dbError)
        // We don't return an error here because the invite itself was successful
      }
    }

    return jsonResponse({ message: "Invite sent successfully", user: inviteData.user }, 201)

  } catch (error: any) {
    console.error("admin-invite-user: caught error", error)
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})