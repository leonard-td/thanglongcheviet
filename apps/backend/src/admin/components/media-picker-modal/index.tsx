import { Button, FocusModal, Input, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { sdk } from "../../lib/sdk"

type MediaItem = { id: string, url: string, filename: string | null }

type MediaPickerModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (url: string) => void
}

/**
 * Shared "insert image" modal: upload a new file, paste a URL, or pick an
 * already-uploaded file from the media library (GET/POST /admin/media — the
 * same library shown at Settings > Media). Used by TiptapEditor's image
 * toolbar button so post content images go through the same upload path
 * (sdk.admin.upload.create) and library bookkeeping as the Media page and
 * ImagePicker, instead of a raw fetch call that silently mis-encoded the
 * multipart body.
 */
const MediaPickerModal = ({ open, onOpenChange, onSelect }: MediaPickerModalProps) => {
  const { t } = useTranslation()
  const [urlInput, setUrlInput] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ media: MediaItem[] }>({
    queryFn: () => sdk.client.fetch("/admin/media"),
    queryKey: ["media-lib", "picker"],
    enabled: open,
  })

  const { mutateAsync: recordMedia } = useMutation({
    mutationFn: (body: { url: string, filename?: string | null }) =>
      sdk.client.fetch("/admin/media", { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-lib"] }),
  })

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const res = await sdk.admin.upload.create({ files: [file] })
      const uploaded = res.files[0]
      await recordMedia({ url: uploaded.url, filename: file.name })
      onSelect(uploaded.url)
      onOpenChange(false)
    } catch {
      toast.error(t("mediaLib.picker.uploadFailed"))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleUseUrl = async () => {
    const url = urlInput.trim()
    if (!url) return
    await recordMedia({ url })
    onSelect(url)
    setUrlInput("")
    onOpenChange(false)
  }

  const media = data?.media ?? []

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title className="text-ui-fg-base font-medium">
            {t("mediaLib.picker.title")}
          </FocusModal.Title>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-y-8 overflow-y-auto p-6">
          <div>
            <Text size="small" weight="plus" className="mb-3">
              {t("mediaLib.picker.upload")}
            </Text>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="secondary"
              isLoading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? t("mediaLib.picker.uploading") : t("mediaLib.picker.dropHint")}
            </Button>

            <Text size="xsmall" className="text-ui-fg-subtle mt-4 mb-1.5">
              {t("mediaLib.picker.orPasteUrl")}
            </Text>
            <div className="flex items-center gap-x-2 max-w-md">
              <Input
                placeholder={t("mediaLib.picker.urlPlaceholder")}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <Button type="button" variant="secondary" disabled={!urlInput.trim()} onClick={handleUseUrl}>
                {t("mediaLib.picker.useUrl")}
              </Button>
            </div>
          </div>

          <div>
            <Text size="small" weight="plus" className="mb-3">
              {t("mediaLib.picker.library")}
            </Text>
            {isLoading && <Text size="small">…</Text>}
            {!isLoading && !media.length && (
              <Text size="small" className="text-ui-fg-subtle">
                {t("mediaLib.picker.empty")}
              </Text>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {media.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="aspect-square overflow-hidden rounded border-2 border-transparent hover:border-ui-fg-interactive transition-colors"
                  title={t("mediaLib.picker.select")}
                  onClick={() => {
                    onSelect(m.url)
                    onOpenChange(false)
                  }}
                >
                  <img src={m.url} alt={m.filename ?? ""} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

export default MediaPickerModal
