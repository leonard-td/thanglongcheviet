import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Heading,
  Input,
  Label,
  Select,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { JSONContent } from "@tiptap/core"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import ImagePicker from "../../../components/image-picker"
import PageHeader from "../../../components/page-header"
import PageLayout from "../../../components/page-layout"
import TiptapEditor from "../../../components/tiptap-editor"
import { sdk } from "../../../lib/sdk"

type SiteSettingTranslation = {
  tagline?: string | null
  description?: string | null
}

type SiteSettings = {
  id: string
  store_name: string | null
  email: string | null
  phone: string | null
  hotline: string | null
  address: string | null
  website_url: string | null
  translations: {
    vi?: SiteSettingTranslation
    en?: SiteSettingTranslation
  } | null
  google_map_url: string | null
  open_hours: string | null
  facebook_url: string | null
  zalo_url: string | null
  instagram_url: string | null
  hero_images: string[]
  about_title: string | null
  about_thumbnail: string | null
  about_content: JSONContent | null
  about_collection_id: string | null
  home_video_url: string | null
}

type SiteSettingsResponse = { site_settings: SiteSettings }

type CollectionOption = { id: string; title: string }

const NO_COLLECTION = "__none__"
const FORM_ID = "store-info-form"

const StoreInfoPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data } = useQuery<SiteSettingsResponse>({
    queryFn: () => sdk.client.fetch("/admin/site-settings"),
    queryKey: [["site-settings"]],
  })

  const { data: collectionsData } = useQuery<{
    collections: CollectionOption[]
  }>({
    queryFn: () =>
      sdk.client.fetch("/admin/collections", {
        query: { limit: 100, fields: "id,title" },
      }),
    queryKey: [["collections", "store-info-options"]],
  })

  const [storeName, setStoreName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [hotline, setHotline] = useState("")
  const [address, setAddress] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [taglineVi, setTaglineVi] = useState("")
  const [taglineEn, setTaglineEn] = useState("")
  const [descriptionVi, setDescriptionVi] = useState("")
  const [descriptionEn, setDescriptionEn] = useState("")
  const [googleMapUrl, setGoogleMapUrl] = useState("")
  const [openHours, setOpenHours] = useState("")
  const [facebookUrl, setFacebookUrl] = useState("")
  const [zaloUrl, setZaloUrl] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
  const [heroImage1, setHeroImage1] = useState("")
  const [heroImage2, setHeroImage2] = useState("")
  const [aboutTitle, setAboutTitle] = useState("")
  const [aboutThumbnail, setAboutThumbnail] = useState("")
  const [aboutContent, setAboutContent] = useState<JSONContent | null>(null)
  const [aboutCollectionId, setAboutCollectionId] = useState("")
  const [homeVideoUrl, setHomeVideoUrl] = useState("")
  const [loadedId, setLoadedId] = useState<string | null>(null)

  useEffect(() => {
    const settings = data?.site_settings
    if (!settings || settings.id === loadedId) {
      return
    }
    setStoreName(settings.store_name ?? "")
    setEmail(settings.email ?? "")
    setPhone(settings.phone ?? "")
    setHotline(settings.hotline ?? "")
    setAddress(settings.address ?? "")
    setWebsiteUrl(settings.website_url ?? "")
    setTaglineVi(settings.translations?.vi?.tagline ?? "")
    setTaglineEn(settings.translations?.en?.tagline ?? "")
    setDescriptionVi(settings.translations?.vi?.description ?? "")
    setDescriptionEn(settings.translations?.en?.description ?? "")
    setGoogleMapUrl(settings.google_map_url ?? "")
    setOpenHours(settings.open_hours ?? "")
    setFacebookUrl(settings.facebook_url ?? "")
    setZaloUrl(settings.zalo_url ?? "")
    setInstagramUrl(settings.instagram_url ?? "")
    setHeroImage1(settings.hero_images?.[0] ?? "")
    setHeroImage2(settings.hero_images?.[1] ?? "")
    setAboutTitle(settings.about_title ?? "")
    setAboutThumbnail(settings.about_thumbnail ?? "")
    setAboutContent(settings.about_content ?? null)
    setAboutCollectionId(settings.about_collection_id ?? "")
    setHomeVideoUrl(settings.home_video_url ?? "")
    setLoadedId(settings.id)
  }, [data, loadedId])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch("/admin/site-settings", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["site-settings"]] })
    },
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      await mutateAsync({
        store_name: storeName || null,
        email: email || null,
        phone: phone || null,
        hotline: hotline || null,
        address: address || null,
        website_url: websiteUrl || null,
        translations: {
          vi: { tagline: taglineVi || null, description: descriptionVi || null },
          en: { tagline: taglineEn || null, description: descriptionEn || null },
        },
        google_map_url: googleMapUrl || null,
        open_hours: openHours || null,
        facebook_url: facebookUrl || null,
        zalo_url: zaloUrl || null,
        instagram_url: instagramUrl || null,
        hero_images: [heroImage1, heroImage2].filter(Boolean),
        about_title: aboutTitle || null,
        about_thumbnail: aboutThumbnail || null,
        about_content: aboutContent,
        about_collection_id: aboutCollectionId || null,
        home_video_url: homeVideoUrl || null,
      })
      toast.success(t("storeInfo.messages.saved"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("storeInfo.messages.saveFailed")
      )
    }
  }

  const collections = collectionsData?.collections ?? []

  return (
    <PageLayout>
      <PageHeader
        title={t("storeInfo.title")}
        subtitle={t("storeInfo.subtitle")}
        actions={
          <Button
            form={FORM_ID}
            type="submit"
            variant="primary"
            isLoading={isPending}
          >
            {t("storeInfo.actions.save")}
          </Button>
        }
      />

      <form
        id={FORM_ID}
        className="flex flex-col gap-6 px-6 py-6"
        onSubmit={handleSubmit}
      >
        <Heading level="h2">{t("storeInfo.sections.contact")}</Heading>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="store-name">{t("storeInfo.fields.storeName")}</Label>
            <Input
              id="store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="store-email">{t("storeInfo.fields.email")}</Label>
            <Input
              id="store-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="store-phone">{t("storeInfo.fields.phone")}</Label>
            <Input
              id="store-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="store-hotline">
              {t("storeInfo.fields.hotline")}
            </Label>
            <Input
              id="store-hotline"
              value={hotline}
              onChange={(e) => setHotline(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="store-open-hours">
              {t("storeInfo.fields.openHours")}
            </Label>
            <Input
              id="store-open-hours"
              placeholder={t("storeInfo.fields.openHoursPlaceholder")}
              value={openHours}
              onChange={(e) => setOpenHours(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="store-website">
              {t("storeInfo.fields.websiteUrl")}
            </Label>
            <Input
              id="store-website"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <Text className="text-ui-fg-subtle" size="xsmall">
              {t("storeInfo.fields.websiteUrlHint")}
            </Text>
          </div>
        </div>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="store-address">{t("storeInfo.fields.address")}</Label>
          <Textarea
            id="store-address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="store-map">{t("storeInfo.fields.googleMapUrl")}</Label>
          <Input
            id="store-map"
            value={googleMapUrl}
            onChange={(e) => setGoogleMapUrl(e.target.value)}
          />
          <Text className="text-ui-fg-subtle" size="xsmall">
            {t("storeInfo.fields.googleMapUrlHint")}
          </Text>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="store-facebook">
              {t("storeInfo.fields.facebookUrl")}
            </Label>
            <Input
              id="store-facebook"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="store-zalo">{t("storeInfo.fields.zaloUrl")}</Label>
            <Input
              id="store-zalo"
              value={zaloUrl}
              onChange={(e) => setZaloUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="store-instagram">
              {t("storeInfo.fields.instagramUrl")}
            </Label>
            <Input
              id="store-instagram"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-ui-border-base" />
        <Heading level="h2">{t("storeInfo.sections.brand")}</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          {t("storeInfo.sections.brandHint")}
        </Text>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="tagline-vi">
              {t("storeInfo.fields.taglineVi")}
            </Label>
            <Input
              id="tagline-vi"
              value={taglineVi}
              onChange={(e) => setTaglineVi(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="tagline-en">
              {t("storeInfo.fields.taglineEn")}
            </Label>
            <Input
              id="tagline-en"
              value={taglineEn}
              onChange={(e) => setTaglineEn(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="description-vi">
              {t("storeInfo.fields.descriptionVi")}
            </Label>
            <Textarea
              id="description-vi"
              rows={3}
              value={descriptionVi}
              onChange={(e) => setDescriptionVi(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="description-en">
              {t("storeInfo.fields.descriptionEn")}
            </Label>
            <Textarea
              id="description-en"
              rows={3}
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-ui-border-base" />
        <Heading level="h2">{t("storeInfo.sections.heroImages")}</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          {t("storeInfo.sections.heroImagesHint")}
        </Text>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-y-2">
            <Label>{t("storeInfo.fields.heroImage1")}</Label>
            <ImagePicker value={heroImage1} onChange={setHeroImage1} />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label>{t("storeInfo.fields.heroImage2")}</Label>
            <ImagePicker value={heroImage2} onChange={setHeroImage2} />
          </div>
        </div>

        <div className="border-t border-ui-border-base" />
        <Heading level="h2">{t("storeInfo.sections.homeVideo")}</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          {t("storeInfo.sections.homeVideoHint")}
        </Text>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="home-video-url">
            {t("storeInfo.fields.homeVideoUrl")}
          </Label>
          <Input
            id="home-video-url"
            placeholder={t("storeInfo.fields.homeVideoUrlPlaceholder")}
            value={homeVideoUrl}
            onChange={(e) => setHomeVideoUrl(e.target.value)}
          />
          <Text className="text-ui-fg-subtle" size="xsmall">
            {t("storeInfo.fields.homeVideoUrlHint")}
          </Text>
        </div>

        <div className="border-t border-ui-border-base" />
        <Heading level="h2">{t("storeInfo.sections.about")}</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          {t("storeInfo.sections.aboutHint")}
        </Text>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="about-title">{t("storeInfo.fields.aboutTitle")}</Label>
          <Input
            id="about-title"
            value={aboutTitle}
            onChange={(e) => setAboutTitle(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <Label>{t("storeInfo.fields.aboutThumbnail")}</Label>
          <ImagePicker value={aboutThumbnail} onChange={setAboutThumbnail} />
        </div>

        <div className="flex flex-col gap-y-2">
          <Label>{t("storeInfo.fields.aboutContent")}</Label>
          <TiptapEditor
            editorKey={loadedId ?? "loading"}
            value={aboutContent}
            onChange={(content) => {
              if (typeof content !== "string") setAboutContent(content)
            }}
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <Label>{t("storeInfo.fields.aboutCollection")}</Label>
          <Select
            value={aboutCollectionId || NO_COLLECTION}
            onValueChange={(value) =>
              setAboutCollectionId(value === NO_COLLECTION ? "" : value)
            }
          >
            <Select.Trigger>
              <Select.Value
                placeholder={t("storeInfo.fields.aboutCollectionPlaceholder")}
              />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={NO_COLLECTION}>
                {t("storeInfo.fields.noCollection")}
              </Select.Item>
              {collections.map((collection) => (
                <Select.Item key={collection.id} value={collection.id}>
                  {collection.title}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Text className="text-ui-fg-subtle" size="xsmall">
            {t("storeInfo.fields.aboutCollectionHint")}
          </Text>
        </div>
      </form>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.storeInfo",
  translationNs: "translation",
})

export default StoreInfoPage
