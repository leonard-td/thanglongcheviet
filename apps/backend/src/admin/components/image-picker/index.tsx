import { Button, FocusModal, Input, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { sdk } from "../../lib/sdk"

type CardMediaItem = { id: string, url: string, filename: string | null }

type ImagePickerProps = {
  value: string
  onChange: (url: string) => void
}

/**
 * Thumbnail picker for Card forms: shows the current image, and opens a
 * modal to either pick from previously-uploaded images (backed by
 * /admin/cards/media) or upload a new file via Medusa's own upload endpoint.
 */
const ImagePicker = ({ value, onChange }: ImagePickerProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // ImagePicker stays mounted across value changes, so this must reset on
  // value itself or a stale load-error from the previous URL would keep the
  // fallback showing after picking a valid image.
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => setImageFailed(false), [value])

  const { data, isLoading } = useQuery<{ media: CardMediaItem[] }>({
    queryFn: () => sdk.client.fetch("/admin/cards/media"),
    queryKey: [["card-media"]],
    enabled: open,
  })

  const { mutateAsync: recordMedia } = useMutation({
    mutationFn: (body: { url: string, filename?: string | null }) =>
      sdk.client.fetch("/admin/cards/media", { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [["card-media"]] }),
  })

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const res = await sdk.admin.upload.create({ files: [file] })
      const uploaded = res.files[0]
      await recordMedia({ url: uploaded.url, filename: file.name })
      onChange(uploaded.url)
      setOpen(false)
    } catch {
      toast.error(t("cards.media.uploadFailed"))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleUseUrl = async () => {
    const url = urlInput.trim()
    if (!url) return
    await recordMedia({ url })
    onChange(url)
    setUrlInput("")
    setOpen(false)
  }

  const media = data?.media ?? []

  return (
    <div className="flex items-center gap-x-4">
      <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded border border-ui-border-base bg-ui-bg-subtle flex items-center justify-center">
        {value && !imageFailed ? (
          // key={value} forces a fresh <img> mount on every URL change, so a
          // previous load failure never carries over onto the next (valid)
          // image — without it the broken-image state stuck around until a
          // full page reload.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={value}
            src={value}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Text size="xsmall" className="text-ui-fg-muted text-center px-1">
            {value ? t("cards.media.loadFailed") : "—"}
          </Text>
        )}
      </div>

      <FocusModal open={open} onOpenChange={setOpen}>
        <div className="flex gap-x-2">
          <Button type="button" variant="secondary" size="small" onClick={() => setOpen(true)}>
            {value ? t("cards.actions.changeImage") : t("cards.actions.chooseImage")}
          </Button>
          {value && (
            <Button type="button" variant="transparent" size="small" onClick={() => onChange("")}>
              {t("cards.actions.removeImage")}
            </Button>
          )}
        </div>

        <FocusModal.Content>
          <FocusModal.Header>
            <FocusModal.Title className="text-ui-fg-base font-medium">
              {t("cards.media.title")}
            </FocusModal.Title>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col gap-y-8 overflow-y-auto p-6">
            <div>
              <Text size="small" weight="plus" className="mb-3">
                {t("cards.media.upload")}
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
                {uploading ? t("cards.media.uploading") : t("cards.media.dropHint")}
              </Button>

              <Text size="xsmall" className="text-ui-fg-subtle mt-4 mb-1.5">
                {t("cards.media.orPasteUrl")}
              </Text>
              <div className="flex items-center gap-x-2 max-w-md">
                <Input
                  placeholder={t("cards.media.urlPlaceholder")}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <Button type="button" variant="secondary" disabled={!urlInput.trim()} onClick={handleUseUrl}>
                  {t("cards.media.useUrl")}
                </Button>
              </div>
            </div>

            <div>
              <Text size="small" weight="plus" className="mb-3">
                {t("cards.media.library")}
              </Text>
              {isLoading && <Text size="small">…</Text>}
              {!isLoading && !media.length && (
                <Text size="small" className="text-ui-fg-subtle">
                  {t("cards.media.empty")}
                </Text>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {media.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="aspect-square overflow-hidden rounded border-2 transition-colors"
                    style={{
                      borderColor: value === m.url ? "var(--fg-interactive, #6366f1)" : "transparent",
                    }}
                    title={t("cards.media.select")}
                    onClick={() => {
                      onChange(m.url)
                      setOpen(false)
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={m.filename ?? ""} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </div>
  )
}

export default ImagePicker
