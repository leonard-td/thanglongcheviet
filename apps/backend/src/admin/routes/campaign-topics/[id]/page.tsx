import { Button, toast, usePrompt } from "@medusajs/ui"
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
import CampaignTopicForm from "../../../components/campaign-topic-form"
import PageHeader from "../../../components/page-header"
import PageLayout from "../../../components/page-layout"
import { sdk } from "../../../lib/sdk"
import type {
  CampaignTopic,
  CampaignTopicResponse,
} from "../../../types/campaign-topic"

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params

  const data = await sdk.client.fetch<CampaignTopicResponse>(
    `/admin/campaign-topics/${id}`
  )

  return {
    campaign_topic: data.campaign_topic,
  }
}

export const handle = {
  breadcrumb: (match: UIMatch<{ campaign_topic: CampaignTopic }>) => {
    return match.data?.campaign_topic?.name ?? "Edit topic"
  },
}

const EditCampaignTopicPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { campaign_topic } = useLoaderData() as Awaited<
    ReturnType<typeof loader>
  >

  const [name, setName] = useState(campaign_topic.name)
  const [slug, setSlug] = useState(campaign_topic.slug)
  const [description, setDescription] = useState(
    campaign_topic.description ?? ""
  )
  const [image, setImage] = useState(campaign_topic.image ?? "")
  const [contentType, setContentType] = useState(campaign_topic.content_type)
  const [isActive, setIsActive] = useState(campaign_topic.is_active)
  const [rank, setRank] = useState(campaign_topic.rank ?? 0)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/campaign-topics/${id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-topics"] })
    },
  })

  const { mutateAsync: deleteTopic, isPending: isDeleting } = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/campaign-topics/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-topics"] })
      toast.success(t("campaign-topics.messages.deleted"))
      navigate("..")
    },
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      await mutateAsync({
        name,
        slug,
        description: description || null,
        image: image || null,
        content_type: contentType,
        is_active: isActive,
        rank,
      })

      toast.success(t("campaign-topics.messages.updated"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("campaign-topics.messages.updateFailed")
      )
    }
  }

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("campaign-topics.messages.deleteConfirmTitle"),
      description: t("campaign-topics.messages.deleteConfirmDesc", { name }),
      confirmText: t("campaign-topics.messages.confirmDelete"),
      cancelText: t("campaign-topics.messages.cancelDelete"),
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteTopic()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("campaign-topics.messages.deleteFailed")
      )
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={t("campaign-topics.edit")}
        subtitle={name}
        actions={
          <>
            <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
              {t("campaign-topics.actions.delete")}
            </Button>
            <Button variant="secondary" onClick={() => navigate("..")}>
              {t("campaign-topics.actions.backToList")}
            </Button>
            <Button
              form="campaign-topic-form"
              type="submit"
              variant="primary"
              isLoading={isPending}
            >
              {t("campaign-topics.actions.save")}
            </Button>
          </>
        }
      />

      <CampaignTopicForm
        formId="campaign-topic-form"
        hideSubmit
        name={name}
        slug={slug}
        description={description}
        image={image}
        contentType={contentType}
        isActive={isActive}
        rank={rank}
        isSubmitting={isPending}
        submitLabel={t("campaign-topics.actions.save")}
        onNameChange={setName}
        onSlugChange={setSlug}
        onDescriptionChange={setDescription}
        onImageChange={setImage}
        onContentTypeChange={setContentType}
        onIsActiveChange={setIsActive}
        onRankChange={setRank}
        onSubmit={handleSubmit}
      />
    </PageLayout>
  )
}

export default EditCampaignTopicPage
