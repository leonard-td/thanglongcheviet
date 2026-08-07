import { Button, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import CampaignTopicForm from "../../../components/campaign-topic-form"
import PageHeader from "../../../components/page-header"
import PageLayout from "../../../components/page-layout"
import { slugify } from "../../../lib/campaign-post"
import { sdk } from "../../../lib/sdk"
import type { CampaignTopicContentType, CampaignTopicResponse } from "../../../types/campaign-topic"

const CreateCampaignTopicPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState("")
  const [contentType, setContentType] = useState<CampaignTopicContentType>("post")
  const [isActive, setIsActive] = useState(true)
  const [rank, setRank] = useState(0)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch("/admin/campaign-topics", {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-topics"] })
    },
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      const response = (await mutateAsync({
        name,
        slug: slug || slugify(name),
        description: description || null,
        image: image || null,
        content_type: contentType,
        is_active: isActive,
        rank,
      })) as CampaignTopicResponse

      toast.success(t("campaign-topics.messages.created"))
      navigate(`../${response.campaign_topic.id}`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("campaign-topics.messages.createFailed")
      )
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={t("campaign-topics.create")}
        subtitle={t("campaign-topics.hint")}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("..")}>
              {t("campaign-topics.actions.backToList")}
            </Button>
            <Button
              form="campaign-topic-form"
              type="submit"
              variant="primary"
              isLoading={isPending}
            >
              {t("campaign-topics.actions.create")}
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
        submitLabel={t("campaign-topics.actions.create")}
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

export default CreateCampaignTopicPage
