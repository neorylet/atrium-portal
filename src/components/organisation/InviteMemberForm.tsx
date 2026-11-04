import { useState } from "react"
import { supabase } from "#/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"

export function InviteMemberForm({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return toast.error("Email is required")
    setLoading(true)
    
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
        // DO NOT use JSON.stringify here. Supabase handles it automatically.
        body: { email, org_id: orgId, redirectTo: 'http://localhost:3000/auth/update-password' },
      })
      
      if (error) throw error
      if (data?.error) throw new Error(data.error) // Catch backend errors
      
      toast.success(`Invitation sent to ${email}`)
      setEmail("")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send invitation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-email">Client email address</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="you@client.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full sm:w-auto self-start">
        {loading ? "Sending..." : "Send invite"}
      </Button>
    </form>
  )
}