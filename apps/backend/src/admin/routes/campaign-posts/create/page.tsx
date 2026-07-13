import {
  Button,
  toast,
} from "@medusajs/ui"
import type { JSONContent } from "@tiptap/core"
import { EMPTY_TIPTAP_DOC } from "../../../components/tiptap-editor/extensions"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import CampaignPostForm from "../../../components/campaign-post-form"
import PageHeader from "../../../components/page-header"
import PageLayout from "../../../components/page-layout"
import { slugify, toIsoDateTime } from "../../../lib/campaign-post"
import { sdk } from "../../../lib/sdk"
import type { CampaignPostResponse } from "../../../types/campaign-post"

const CreateCampaignPostPage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [thumbnail, setThumbnail] = useState("")
  const [topicId, setTopicId] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [publishAt, setPublishAt] = useState("")
  const [unpublishAt, setUnpublishAt] = useState("")
  const [source, setSource] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoKeywords, setSeoKeywords] = useState("")
  const [content, setContent] = useState<JSONContent | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch("/admin/campaign-posts", {
        method: "POST",
        body,
      }),
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      const response = await mutateAsync({
        title,
        slug: slug || slugify(title),
        content: content || EMPTY_TIPTAP_DOC,
        description: description || null,
        thumbnail: thumbnail || null,
        topic_id: topicId || null,
        is_active: isActive,
        publish_at: toIsoDateTime(publishAt),
        unpublish_at: toIsoDateTime(unpublishAt),
        source: source || null,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        seo_keywords: seoKeywords || null,
      }) as CampaignPostResponse

      toast.success(t("campaign-posts.messages.created"))
      navigate(`../${response.campaign_post.id}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("campaign-posts.messages.createFailed")
      )
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={t("campaign-posts.create")}
        subtitle={t("campaign-posts.scheduleHint")}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("..")}>
              {t("campaign-posts.actions.backToList")}
            </Button>
            <Button
              form="campaign-post-form"
              type="submit"
              variant="primary"
              isLoading={isPending}
            >
              {t("campaign-posts.actions.create")}
            </Button>
          </>
        }
      />

      <CampaignPostForm
        formId="campaign-post-form"
        hideSubmit
        title={title}
        slug={slug}
        description={description}
        thumbnail={thumbnail}
        topicId={topicId}
        isActive={isActive}
        publishAt={publishAt}
        unpublishAt={unpublishAt}
        source={source}
        seoTitle={seoTitle}
        seoDescription={seoDescription}
        seoKeywords={seoKeywords}
        content={content}
        isSubmitting={isPending}
        submitLabel={t("campaign-posts.actions.create")}
        onTitleChange={setTitle}
        onSlugChange={setSlug}
        onDescriptionChange={setDescription}
        onThumbnailChange={setThumbnail}
        onTopicIdChange={setTopicId}
        onIsActiveChange={setIsActive}
        onPublishAtChange={setPublishAt}
        onUnpublishAtChange={setUnpublishAt}
        onSourceChange={setSource}
        onSeoTitleChange={setSeoTitle}
        onSeoDescriptionChange={setSeoDescription}
        onSeoKeywordsChange={setSeoKeywords}
        onContentChange={setContent}
        onSubmit={handleSubmit}
        editorKey="create"
      />
    </PageLayout>
  )
}

export default CreateCampaignPostPage
