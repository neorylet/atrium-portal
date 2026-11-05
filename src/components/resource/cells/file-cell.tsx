import { useState } from "react"
import { supabase } from "#/lib/supabase/client"
import { Button } from "#/components/ui/button"
import { FileIcon, DownloadIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { FileObject } from "#/types/fields"

export function FileCell({ value }: { value: FileObject[] | string | null | unknown }) {
  const [downloading, setDownloading] = useState(false)

  if (!value) return <div className="text-muted-foreground">N/A</div>

  // Extract path and name whether it's a string or an array of objects
  let filePath = ""
  let fileName = ""

  if (typeof value === "string") {
    filePath = value
    fileName = value.split("/").pop() || "File"
  } else if (Array.isArray(value) && value.length > 0) {
    filePath = value[0].path
    fileName = value[0].name || filePath.split("/").pop() || "File"
  } else {
    return <div className="text-muted-foreground">N/A</div>
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
      toast.error("Failed to download file")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 max-w-full justify-start gap-2"
      onClick={handleDownload}
      disabled={downloading}
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        <FileIcon className="h-4 w-4 shrink-0" />
      )}
      <span className="truncate">{fileName}</span>
      <DownloadIcon className="ml-auto h-3 w-3 shrink-0 opacity-50" />
    </Button>
  )
}