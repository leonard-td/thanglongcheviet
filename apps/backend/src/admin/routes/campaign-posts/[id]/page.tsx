import {
  Button,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  LoaderFunctionArgs,
  UIMatch,
  useLoaderData,
  useNavigate,
  useParams,
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
  CampaignPostTranslations,
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
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { campaign_post } = useLoaderData() as Awaited<ReturnType<typeof loader>>

  const [slug, setSlug] = useState(campaign_post.slug)
  const [thumbnail, setThumbnail] = useState(campaign_post.thumbnail ?? "")
  const [topicId, setTopicId] = useState(campaign_post.topic_id ?? "")
  const [isActive, setIsActive] = useState(campaign_post.is_active)
  const [publishAt, setPublishAt] = useState(
    toDatetimeLocal(campaign_post.publish_at)
  )
  const [unpublishAt, setUnpublishAt] = useState(
    toDatetimeLocal(campaign_post.unpublish_at)
  )
  const [translations, setTranslations] = useState<CampaignPostTranslations>(
    campaign_post.translations ?? {
      vi: {
        title: campaign_post.title,
        content: campaign_post.content,
        description: campaign_post.description,
        source: campaign_post.source,
        seo_title: campaign_post.seo_title,
        seo_description: campaign_post.seo_description,
        seo_keywords: campaign_post.seo_keywords,
      },
    }
  )
  const title = translations.vi?.title ?? campaign_post.title

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/campaign-posts/${id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-posts"] })
    },
  })

  const { mutate: duplicatePost, isPending: isDuplicating } = useMutation({
    mutationFn: () =>
      sdk.client.fetch<CampaignPostResponse>(
        `/admin/campaign-posts/${id}/duplicate`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["campaign-posts"]] })
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
        slug,
        translations,
        thumbnail: thumbnail || null,
        topic_id: topicId || null,
        is_active: isActive,
        publish_at: toIsoDateTime(publishAt),
        unpublish_at: toIsoDateTime(unpublishAt),
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
        slug={slug}
        thumbnail={thumbnail}
        topicId={topicId}
        isActive={isActive}
        publishAt={publishAt}
        unpublishAt={unpublishAt}
        translations={translations}
        isSubmitting={isPending}
        submitLabel={t("campaign-posts.actions.save")}
        onSlugChange={setSlug}
        onThumbnailChange={setThumbnail}
        onTopicIdChange={setTopicId}
        onIsActiveChange={setIsActive}
        onPublishAtChange={setPublishAt}
        onUnpublishAtChange={setUnpublishAt}
        onTranslationsChange={setTranslations}
        onSubmit={handleSubmit}
        editorKey={id}
      />
    </PageLayout>
  )
}

export default EditCampaignPostPage
