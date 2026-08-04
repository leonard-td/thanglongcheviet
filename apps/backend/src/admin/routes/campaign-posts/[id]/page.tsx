import {
  Button,
  toast,
  usePrompt,
} from "@medusajs/ui"
import type { JSONContent } from "@tiptap/core"
import { EMPTY_TIPTAP_DOC } from "../../../components/tiptap-editor/extensions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  LoaderFunctionArgs,
  UIMatch,
  useLoaderData,
  useNavigate,
  useParams,
  useRevalidator,
} from "react-router-dom"
import { useTranslation } from "react-i18next"
import CampaignPostForm from "../../../components/campaign-post-form"
import PageHeader from "../../../components/page-header"
import PageLayout from "../../../components/page-layout"
import { toDatetimeLocal, toIsoDateTime } from "../../../lib/campaign-post"
import { sdk } from "../../../lib/sdk"
import type {
  CampaignPost,
  CampaignPostResponse,
} from "../../../types/campaign-post"

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params

  const data = await sdk.client.fetch<CampaignPostResponse>(
    `/admin/campaign-posts/${id}`
  )

  return {
    campaign_post: data.campaign_post,
  }
}

export const handle = {
  breadcrumb: (match: UIMatch<{ campaign_post: CampaignPost }>) => {
    return match.data?.campaign_post?.title ?? "Edit post"
  },
}

const EditCampaignPostPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const revalidator = useRevalidator()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { campaign_post } = useLoaderData() as Awaited<ReturnType<typeof loader>>

  const [title, setTitle] = useState(campaign_post.title)
  const [slug, setSlug] = useState(campaign_post.slug)
  const [description, setDescription] = useState(campaign_post.description ?? "")
  const [thumbnail, setThumbnail] = useState(campaign_post.thumbnail ?? "")
  const [topicId, setTopicId] = useState(campaign_post.topic_id ?? "")
  const [isActive, setIsActive] = useState(campaign_post.is_active)
  const [publishAt, setPublishAt] = useState(
    toDatetimeLocal(campaign_post.publish_at)
  )
  const [unpublishAt, setUnpublishAt] = useState(
    toDatetimeLocal(campaign_post.unpublish_at)
  )
  const [source, setSource] = useState(campaign_post.source ?? "")
  const [seoTitle, setSeoTitle] = useState(campaign_post.seo_title ?? "")
  const [seoDescription, setSeoDescription] = useState(
    campaign_post.seo_description ?? ""
  )
  const [seoKeywords, setSeoKeywords] = useState(campaign_post.seo_keywords ?? "")
  const [content, setContent] = useState<JSONContent | null>(
    campaign_post.content
  )

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/campaign-posts/${id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-posts"] })
      revalidator.revalidate()
    },
  })

  const { mutate: duplicatePost, isPending: isDuplicating } = useMutation({
    mutationFn: () =>
      sdk.client.fetch<CampaignPostResponse>(
        `/admin/campaign-posts/${id}/duplicate`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-posts"] })
      toast.success(t("campaign-posts.messages.duplicated"))
      navigate("..")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("campaign-posts.messages.duplicateFailed")
      )
    },
  })

  const { mutateAsync: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/campaign-posts/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-posts"] })
      toast.success(t("campaign-posts.messages.deleted"))
      navigate("..")
    },
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      await mutateAsync({
        title,
        slug,
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
      })

      toast.success(t("campaign-posts.messages.updated"))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("campaign-posts.messages.updateFailed")
      )
    }
  }

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("campaign-posts.messages.deleteConfirmTitle"),
      description: t("campaign-posts.messages.deleteConfirmDesc", { title }),
      confirmText: t("campaign-posts.messages.confirmDelete"),
      cancelText: t("campaign-posts.messages.cancelDelete"),
    })

    if (!confirmed) {
      return
    }

    try {
      await deletePost()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("campaign-posts.messages.deleteFailed")
      )
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={t("campaign-posts.edit")}
        subtitle={title}
        actions={
          <>
            <Button
              variant="secondary"
              isLoading={isDuplicating}
              onClick={() => duplicatePost()}
            >
              {t("campaign-posts.actions.duplicate")}
            </Button>
            <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
              {t("campaign-posts.actions.delete")}
            </Button>
            <Button variant="secondary" onClick={() => navigate("..")}>
              {t("campaign-posts.actions.backToList")}
            </Button>
            <Button
              form="campaign-post-form"
              type="submit"
              variant="primary"
              isLoading={isPending}
            >
              {t("campaign-posts.actions.save")}
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
        submitLabel={t("campaign-posts.actions.save")}
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
        editorKey={id}
      />
    </PageLayout>
  )
}

export default EditCampaignPostPage
