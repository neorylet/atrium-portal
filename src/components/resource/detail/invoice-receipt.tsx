import { PrinterIcon } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import { Card, CardContent } from "#/components/ui/card"
import { Skeleton } from "#/components/ui/skeleton"
import { formatDate } from "#/lib/format"
import { supabase } from "#/lib/supabase/client"
import { useRealtimeSubscription } from "#/hooks/use-realtime-subscription" 

interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
}

interface InvoiceReceiptProps {
  invoiceId: string
  record: Record<string, unknown>
}

export function InvoiceReceipt({
  invoiceId,
  record: initialRecord,
}: InvoiceReceiptProps) {
  const { data: fetchedData, isLoading } = useQuery({
    queryKey: ["invoice-receipt", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      // Fetch the items
      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)

      if (itemsError) throw itemsError

      // Fetch the latest invoice data (to get the updated total amount)
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("amount")
        .eq("id", invoiceId)
        .single()

      if (invoiceError) throw invoiceError

      let orgName = null
      const orgId = initialRecord?.org_id as string
      if (orgId && !initialRecord?.organisations) {
        const { data: org } = await supabase
          .from("organisations")
          .select("name")
          .eq("id", orgId)
          .single()
        orgName = org?.name
      }

      return { items, orgName, updatedAmount: invoice.amount }
    },
    staleTime: 1000 * 60 * 5,
  })

  // Real-time subscription for invoice items
  useRealtimeSubscription({
    table: "invoice_items",
    schema: "public",
    event: "*",
    filter: `invoice_id=eq.${invoiceId}`,
    queryKey: ["invoice-receipt", invoiceId],
    enabled: !!invoiceId,
  })

  if (!invoiceId) return null;

  const lineItems = fetchedData?.items || []
  
  const invoiceNumber = initialRecord?.invoice_number as string
  const status = initialRecord?.status as string
  // Use the live updated amount from the query, fallback to the initial record
  const amount = (fetchedData?.updatedAmount ?? initialRecord?.amount) as number 
  const currency = (initialRecord?.currency as string) || "USD"
  const issuedOn = initialRecord?.issued_on as string
  const dueOn = initialRecord?.due_on as string | null
  const notes = initialRecord?.notes as string | null
  
  const orgData = initialRecord?.organisations as any
  let orgName = fetchedData?.orgName || (Array.isArray(orgData) ? orgData[0]?.name : orgData?.name) || "Unknown Organization"
  
  const projectData = initialRecord?.projects as any
  const projectName = Array.isArray(projectData) ? projectData[0]?.name : projectData?.name

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(value)

  return (
    <Card id="printable-receipt" className="bg-white text-black border shadow-sm">
      <CardContent className="p-8">
        <div className="flex justify-end mb-6 print:hidden">
          <Button onClick={() => window.print()} variant="outline" size="sm">
            <PrinterIcon className="mr-2 h-4 w-4" />
            Print / Download PDF
          </Button>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">INVOICE</h1>
            <p className="text-sm text-gray-600 font-mono">#{invoiceNumber}</p>
          </div>
          <div className="text-right">
            <Badge variant={status === "paid" ? "default" : status === "overdue" ? "destructive" : "secondary"} className="text-sm font-semibold uppercase">
              {status?.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bill To</p>
          <p className="font-semibold text-lg">{orgName}</p>
          {projectName && <p className="text-gray-600">Project: {projectName}</p>}
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Issued On</p>
            <p className="font-mono text-sm">{issuedOn ? formatDate(issuedOn) : "N/A"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Due On</p>
            <p className="font-mono text-sm">{dueOn ? formatDate(dueOn) : "N/A"}</p>
          </div>
        </div>

        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase w-24">Qty</th>
                <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase w-32">Unit Price</th>
                <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && lineItems.length === 0 ? (
                 <tr>
                   <td colSpan={4} className="text-center py-8 text-gray-400 text-sm">Loading items...</td>
                 </tr>
              ) : lineItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400 text-sm">No line items found in database</td>
                </tr>
              ) : (
                lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 text-sm">{item.description}</td>
                    <td className="py-3 text-right text-sm font-mono">{item.quantity}</td>
                    <td className="py-3 text-right text-sm font-mono">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 text-right text-sm font-mono font-semibold">{formatCurrency(item.quantity * item.unit_price)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-dashed border-gray-300 pt-6">
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Amount</p>
              <p className="text-3xl font-bold font-mono">{formatCurrency(amount)}</p>
            </div>
          </div>
        </div>

        {notes && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}