import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { HttpTypes } from "@medusajs/types"
import { Button, Container, FocusModal, Heading, IconButton, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { sdk } from "../lib/sdk"
import type { MediaItem } from "../types/media"

type ProductMediaLibraryWidgetProps = {
  data: HttpTypes.AdminProduct
}

type ProductImage = {
  id?: string
  url: string
}

const productImages = (product: HttpTypes.AdminProduct): ProductImage[] =>
  (product.images ?? []).map((image) => ({
    id: image.id,
    url: image.url,
  }))

/**
 * Adds images already registered in Settings > Media Library to a product.
 * The core Medusa product media component remains available for local uploads
 * and image ordering/removal.
 */
const ProductMediaLibraryWidget = ({ data }: ProductMediaLibraryWidgetProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<ProductImage[]>(() => productImages(data))
  const [thumbnail, setThumbnail] = useState(data.thumbnail ?? null)

  useEffect(() => {
    setImages(productImages(data))
    setThumbnail(data.thumbnail ?? null)
  }, [data])

  // Medusa 2.17 only supports widgets before/after the whole product main
  // column, not directly after its media section. This widget replaces that
  // section, so hide the core duplicate while retaining a single image UI.
  useEffect(() => {
    const coreMediaHeading = Array.from(document.querySelectorAll("h2")).find(
      (heading) => heading.textContent === t("products.media.label")
    )
    const coreMediaSection = coreMediaHeading?.closest(".divide-y")

    coreMediaSection?.classList.add("hidden")

    return () => coreMediaSection?.classList.remove("hidden")
  }, [t])

  const { data: mediaData, isLoading } = useQuery<{ media: MediaItem[] }>({
    queryFn: () => sdk.client.fetch("/admin/media"),
    queryKey: ["media-library", "product-picker"],
    enabled: open,
  })

  const { mutate: saveImages, isPending } = useMutation({
    mutationFn: async ({
      images: nextImages,
      thumbnail: nextThumbnail,
    }: {
      images: ProductImage[]
      thumbnail: string | null
    }) => {
      await sdk.admin.product.update(data.id, {
        images: nextImages,
        thumbnail: nextThumbnail,
      })

      return { images: nextImages, thumbnail: nextThumbnail }
    },
    onSuccess: (next) => {
      setImages(next.images)
      setThumbnail(next.thumbnail)
      setOpen(false)
      queryClient.invalidateQueries()
      toast.success(t("productMediaLibrary.messages.saved"))
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("productMediaLibrary.messages.addFailed")
      )
    },
  })

  const handleSelect = (url: string) => {
    if (images.some((image) => image.url === url)) {
      toast.info(t("productMediaLibrary.messages.alreadyAdded"))
      return
    }

    saveImages({
      images: [...images, { url }],
      thumbnail: thumbnail ?? url,
    })
  }

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return

    const nextImages = [...images]
    const [image] = nextImages.splice(from, 1)
    nextImages.splice(to, 0, image)
    saveImages({ images: nextImages, thumbnail })
  }

  const removeImage = (url: string) => {
    const nextImages = images.filter((image) => image.url !== url)
    saveImages({
      images: nextImages,
      thumbnail: thumbnail === url ? nextImages[0]?.url ?? null : thumbnail,
    })
  }

  const setProductThumbnail = (url: string) => {
    if (thumbnail === url) return
    saveImages({ images, thumbnail: url })
  }

  const media = mediaData?.media ?? []

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-4 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading level="h2">{t("productMediaLibrary.title")}</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle mt-1">
            {t("productMediaLibrary.hint")}
          </Text>
        </div>
        <Button type="button" variant="secondary" size="small" onClick={() => setOpen(true)}>
          {t("productMediaLibrary.action")}
        </Button>
      </div>
      {images.length ? (
        <div className="grid grid-cols-2 gap-3 px-6 py-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => {
            const isThumbnail = image.url === thumbnail

            return (
              <div
                key={image.id ?? image.url}
                className="relative aspect-square overflow-hidden rounded border border-ui-border-base bg-ui-bg-subtle"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-x-1 bg-black/70 p-1 text-white backdrop-blur-sm">
                  <Button
                    type="button"
                    size="small"
                    variant="transparent"
                    className="text-white hover:bg-white/20 hover:text-white disabled:text-white/50"
                    disabled={isThumbnail || isPending}
                    onClick={() => setProductThumbnail(image.url)}
                  >
                    {isThumbnail
                      ? t("productMediaLibrary.thumbnail")
                      : t("productMediaLibrary.setThumbnail")}
                  </Button>
                  <div className="flex items-center">
                    <IconButton
                      type="button"
                      size="small"
                      variant="transparent"
                      className="text-white hover:bg-white/20 hover:text-white disabled:text-white/50"
                      disabled={index === 0 || isPending}
                      aria-label={t("productMediaLibrary.moveEarlier")}
                      onClick={() => moveImage(index, index - 1)}
                    >
                      ←
                    </IconButton>
                    <IconButton
                      type="button"
                      size="small"
                      variant="transparent"
                      className="text-white hover:bg-white/20 hover:text-white disabled:text-white/50"
                      disabled={index === images.length - 1 || isPending}
                      aria-label={t("productMediaLibrary.moveLater")}
                      onClick={() => moveImage(index, index + 1)}
                    >
                      →
                    </IconButton>
                    <IconButton
                      type="button"
                      size="small"
                      variant="transparent"
                      className="text-white hover:bg-white/20 hover:text-white disabled:text-white/50"
                      disabled={isPending}
                      aria-label={t("productMediaLibrary.remove")}
                      onClick={() => removeImage(image.url)}
                    >
                      ×
                    </IconButton>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("productMediaLibrary.noProductImages")}
          </Text>
        </div>
      )}

      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <FocusModal.Title className="text-ui-fg-base font-medium">
              {t("productMediaLibrary.modalTitle")}
            </FocusModal.Title>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto p-6">
            {isLoading && <Text size="small">…</Text>}
            {!isLoading && !media.length && (
              <Text size="small" className="text-ui-fg-subtle">
                {t("productMediaLibrary.empty")}
              </Text>
            )}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {media.map((item) => {
                const selected = images.some((image) => image.url === item.url)

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={selected || isPending}
                    className="aspect-square overflow-hidden rounded border-2 border-transparent transition-colors hover:border-ui-fg-interactive disabled:cursor-not-allowed disabled:opacity-50"
                    title={selected ? t("productMediaLibrary.selected") : t("productMediaLibrary.select")}
                    onClick={() => handleSelect(item.url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.filename ?? ""} className="h-full w-full object-cover" />
                  </button>
                )
              })}
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductMediaLibraryWidget
