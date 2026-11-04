import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, org_id } = await req.json()

    if (!email) throw new Error("Email is required")

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Send the invite
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name: email.split('@')[0] } // Put name in user_metadata
    })

    if (inviteError) throw inviteError
    const userId = inviteData.user.id

    // 2. CRITICAL: Set the app_metadata so the RLS policies and JWT hook work
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { 
        role: 'client', 
        org_id: org_id 
      }
    })

    if (updateError) throw updateError

    // 3. Insert into supasheet.users so the UI recognizes them immediately
    if (org_id) {
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .schema('supasheet')
        .upsert({ 
          id: userId, 
          email: email, 
          name: email.split('@')[0], 
          org_id: org_id 
        })
        
      if (dbError) console.error("Failed to insert into supasheet.users", dbError)
    }

    return new Response(
      JSON.stringify({ message: "Invite sent successfully", user: inviteData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})