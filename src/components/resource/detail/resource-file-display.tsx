import { useState } from "react"
import { supabase } from "#/lib/supabase/client"
import { Button } from "#/components/ui/button"
import { FileIcon, DownloadIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { FileObject } from "#/types/fields"

export function ResourceFileDisplay({ value }: { value: FileObject[] | string | null | any }) {
  const [downloading, setDownloading] = useState(false)

  if (!value) return <div className="text-muted">N/A</div>

  let filePath = ""
  let fileName = ""

  if (typeof value === "string") {
    filePath = value
    fileName = value.split("/").pop() || "File"
  } else if (Array.isArray(value) && value.length > 0) {
    filePath = value[0].path
    fileName = value[0].name || filePath.split("/").pop() || "File"
  } else {
    return <div className="text-muted">N/A</div>
  }

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const { data, error } = await supabase.storage
        .from("deliverable-files")
        .createSignedUrl(filePath, 60)

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank")
      }
    } catch (err) {
      console.error("Storage Error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to generate download link"
      toast.error(errorMessage)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-2 max-w-full justify-start"
      onClick={handleDownload}
      disabled={downloading}
    >
      {downloading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <FileIcon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{fileName}</span>
      <DownloadIcon className="h-3 w-3 ml-auto shrink-0 opacity-50" />
    </Button>
  )
}