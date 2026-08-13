import {
  Button,
  Checkbox,
  Container,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import TiptapEditor from "../../../components/tiptap-editor"
import { sdk } from "../../../lib/sdk"
import type { MediaItem } from "../../../types/media"

type ProductImage = {
  url: string
  isThumbnail: boolean
}

type ProductCategory = {
  id: string
  name: string
}

type ProductCollection = {
  id: string
  title: string
}

type Store = {
  default_sales_channel_id: string | null
}

const DEFAULT_OPTION = "Default option"
const DEFAULT_OPTION_VALUE = "Default option value"

/**
 * Standalone product creation route. Medusa 2.17 has no product-create widget
 * zone, so this page deliberately uses only public Admin API calls.
 */
const ProductCreatePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [handle, setHandle] = useState("")
  const [status, setStatus] = useState<"draft" | "published">("draft")
  const [collectionId, setCollectionId] = useState("")
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [sku, setSku] = useState("")
  const [price, setPrice] = useState("")
  const [images, setImages] = useState<ProductImage[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const { data: mediaData, isLoading: isMediaLoading } = useQuery<{ media: MediaItem[] }>({
    queryKey: ["media-library", "product-create-picker"],
    queryFn: () => sdk.client.fetch("/admin/media"),
    enabled: isPickerOpen,
  })
  const { data: collectionsData } = useQuery<{ collections: ProductCollection[] }>({
    queryKey: ["product-create-collections"],
    queryFn: () => sdk.client.fetch("/admin/collections", { query: { limit: 100 } }),
  })
  const { data: categoriesData } = useQuery<{ product_categories: ProductCategory[] }>({
    queryKey: ["product-create-categories"],
    queryFn: () => sdk.client.fetch("/admin/product-categories", { query: { limit: 100 } }),
  })
  const { data: storesData } = useQuery<{ stores: Store[] }>({
    queryKey: ["product-create-store"],
    queryFn: () =>
      sdk.client.fetch("/admin/stores", {
        query: { fields: "+default_sales_channel" },
      }),
  })

  const defaultSalesChannelId = storesData?.stores?.[0]?.default_sales_channel_id
  const library = mediaData?.media ?? []
  const collections = collectionsData?.collections ?? []
  const categories = categoriesData?.product_categories ?? []

  const thumbnail = useMemo(
    () => images.find((image) => image.isThumbnail)?.url,
    [images]
  )

  const { mutate: createProduct, isPending } = useMutation({
    mutationFn: async () => {
      const parsedPrice = price.trim() ? Number(price.replace(/[^\d.]/g, "")) : undefined
      if (parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
        throw new Error(t("productCreate.errors.invalidPrice"))
      }

      return sdk.admin.product.create({
        title: title.trim(),
        description: description.trim() || undefined,
        handle: handle.trim() || undefined,
        status,
        discountable: true,
        thumbnail,
        images: images
          .filter((image) => !image.isThumbnail)
          .map((image) => ({ url: image.url })),
        collection_id: collectionId || undefined,
        categories: categoryIds.map((id) => ({ id })),
        sales_channels: defaultSalesChannelId
          ? [{ id: defaultSalesChannelId }]
          : undefined,
        options: [{ title: DEFAULT_OPTION, values: [DEFAULT_OPTION_VALUE] }],
        variants: [
          {
            title: title.trim() || DEFAULT_OPTION_VALUE,
            sku: sku.trim() || undefined,
            manage_inventory: false,
            allow_backorder: false,
            options: { [DEFAULT_OPTION]: DEFAULT_OPTION_VALUE },
            prices:
              parsedPrice === undefined
                ? []
                : [{ currency_code: "vnd", amount: parsedPrice }],
          },
        ],
      })
    },
    onSuccess: ({ product }) => {
      toast.success(t("productCreate.messages.created", { title: product.title }))
      navigate(`/products/${product.id}`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("productCreate.messages.createFailed"))
    },
  })

  const toggleCategory = (id: string, checked: boolean) => {
    setCategoryIds((current) =>
      checked ? [...current, id] : current.filter((categoryId) => categoryId !== id)
    )
  }

  const addImage = (url: string) => {
    if (images.some((image) => image.url === url)) return
    setImages((current) => [
      ...current,
      { url, isThumbnail: current.length === 0 },
    ])
    setIsPickerOpen(false)
  }

  const setThumbnail = (url: string) =>
    setImages((current) =>
      current.map((image) => ({ ...image, isThumbnail: image.url === url }))
    )

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return
    setImages((current) => {
      const next = [...current]
      const [image] = next.splice(from, 1)
      next.splice(to, 0, image)
      return next
    })
  }

  const removeImage = (url: string) =>
    setImages((current) => {
      const next = current.filter((image) => image.url !== url)
      if (current.find((image) => image.url === url)?.isThumbnail && next[0]) {
        next[0] = { ...next[0], isThumbnail: true }
      }
      return next
    })

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) {
      toast.error(t("productCreate.errors.titleRequired"))
      return
    }
    createProduct()
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-5xl flex-col gap-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-y-2">
        <Heading level="h1">{t("productCreate.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("productCreate.hint")}
        </Text>
      </div>

      <Container className="p-6">
        <div className="flex flex-col gap-y-5">
          <Heading level="h2">{t("productCreate.sections.general")}</Heading>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-y-2 md:col-span-2">
              <Label htmlFor="product-title">{t("productCreate.fields.title")}</Label>
              <Input
                id="product-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="product-handle">{t("productCreate.fields.handle")}</Label>
              <Input
                id="product-handle"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder={t("productCreate.fields.handlePlaceholder")}
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="product-status">{t("productCreate.fields.status")}</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as "draft" | "published")}>
                <Select.Trigger id="product-status">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="draft">{t("productCreate.status.draft")}</Select.Item>
                  <Select.Item value="published">{t("productCreate.status.published")}</Select.Item>
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-y-2 md:col-span-2">
              <Label>{t("productCreate.fields.description")}</Label>
              <TiptapEditor
                editorKey="product-create-description"
                value={description}
                output="html"
                onChange={(content) => setDescription(typeof content === "string" ? content : "")}
              />
            </div>
          </div>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="flex flex-col gap-y-4 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Heading level="h2">{t("productMediaLibrary.title")}</Heading>
            <Text size="small" className="text-ui-fg-subtle mt-1">
              {t("productMediaLibrary.createHint")}
            </Text>
          </div>
          <Button type="button" variant="secondary" onClick={() => setIsPickerOpen(true)}>
            {t("productMediaLibrary.action")}
          </Button>
        </div>
        {images.length ? (
          <div className="grid grid-cols-2 gap-3 px-6 py-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => (
              <div
                key={image.url}
                className="relative aspect-square overflow-hidden rounded border border-ui-border-base"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-x-1 bg-black/70 p-1 text-white backdrop-blur-sm">
                  <Button
                    type="button"
                    size="small"
                    variant="transparent"
                    className="text-white hover:bg-white/20 hover:text-white disabled:text-white/50"
                    disabled={image.isThumbnail}
                    onClick={() => setThumbnail(image.url)}
                  >
                    {image.isThumbnail
                      ? t("productMediaLibrary.thumbnail")
                      : t("productMediaLibrary.setThumbnail")}
                  </Button>
                  <div className="flex items-center">
                    <IconButton
                      type="button"
                      size="small"
                      variant="transparent"
                      className="text-white hover:bg-white/20 hover:text-white disabled:text-white/50"
                      disabled={index === 0}
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
                      disabled={index === images.length - 1}
                      aria-label={t("productMediaLibrary.moveLater")}
                      onClick={() => moveImage(index, index + 1)}
                    >
                      →
                    </IconButton>
                    <IconButton
                      type="button"
                      size="small"
                      variant="transparent"
                      className="text-white hover:bg-white/20 hover:text-white"
                      aria-label={t("productMediaLibrary.remove")}
                      onClick={() => removeImage(image.url)}
                    >
                      ×
                    </IconButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-4">
            <Text size="small" className="text-ui-fg-subtle">
              {t("productMediaLibrary.noProductImages")}
            </Text>
          </div>
        )}
      </Container>

      <Container className="p-6">
        <div className="flex flex-col gap-y-5">
          <Heading level="h2">{t("productCreate.sections.catalog")}</Heading>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-y-2">
              <Label>{t("productCreate.fields.collection")}</Label>
              <Select value={collectionId || "__none__"} onValueChange={(value) => setCollectionId(value === "__none__" ? "" : value)}>
                <Select.Trigger>
                  <Select.Value placeholder={t("productCreate.fields.collectionPlaceholder")} />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="__none__">{t("productCreate.fields.none")}</Select.Item>
                  {collections.map((collection) => (
                    <Select.Item key={collection.id} value={collection.id}>
                      {collection.title}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="product-sku">{t("productCreate.fields.sku")}</Label>
              <Input id="product-sku" value={sku} onChange={(event) => setSku(event.target.value)} />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="product-price">{t("productCreate.fields.price")}</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder={t("productCreate.fields.pricePlaceholder")}
              />
            </div>
          </div>
          <div className="flex flex-col gap-y-2">
            <Label>{t("productCreate.fields.categories")}</Label>
            {!categories.length ? (
              <Text size="small" className="text-ui-fg-subtle">
                {t("productCreate.fields.noCategories")}
              </Text>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {categories.map((category) => (
                  <label key={category.id} className="flex min-h-11 items-center gap-x-2">
                    <Checkbox
                      checked={categoryIds.includes(category.id)}
                      onCheckedChange={(checked) => toggleCategory(category.id, checked === true)}
                    />
                    <Text size="small">{category.name}</Text>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>

      <div className="flex flex-col-reverse gap-3 pb-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={() => navigate("/products")}>
          {t("productCreate.actions.cancel")}
        </Button>
        <Button type="submit" isLoading={isPending}>
          {status === "published"
            ? t("productCreate.actions.publish")
            : t("productCreate.actions.saveDraft")}
        </Button>
      </div>

      <FocusModal open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <FocusModal.Title>{t("productMediaLibrary.modalTitle")}</FocusModal.Title>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto p-6">
            {isMediaLoading && <Text size="small">…</Text>}
            {!isMediaLoading && !library.length && (
              <Text size="small" className="text-ui-fg-subtle">
                {t("productMediaLibrary.empty")}
              </Text>
            )}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {library.map((item) => {
                const selected = images.some((image) => image.url === item.url)

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={selected}
                    className="aspect-square overflow-hidden rounded border-2 border-transparent transition-colors hover:border-ui-fg-interactive disabled:cursor-not-allowed disabled:opacity-50"
                    title={selected ? t("productMediaLibrary.selected") : t("productMediaLibrary.select")}
                    onClick={() => addImage(item.url)}
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
    </form>
  )
}

export default ProductCreatePage
