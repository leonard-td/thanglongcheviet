import { Button, toast } from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import CardForm from "../../../components/card-form"
import PageHeader from "../../../components/page-header"
import PageLayout from "../../../components/page-layout"
import { sdk } from "../../../lib/sdk"
import type { CardResponse } from "../../../types/card"

const CreateCardPage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [titleVi, setTitleVi] = useState("")
  const [titleEn, setTitleEn] = useState("")
  const [image, setImage] = useState("")
  const [path, setPath] = useState("")
  const [topicId, setTopicId] = useState("")
  const [isActive, setIsActive] = useState(true)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch("/admin/cards", {
        method: "POST",
        body,
      }),
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      const response = (await mutateAsync({
        title: { vi: titleVi, en: titleEn || titleVi },
        image: image || null,
        path: path || null,
        topic_id: topicId || null,
        is_active: isActive,
      })) as CardResponse

      toast.success(t("cards.messages.created"))
      navigate(`../${response.card.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("cards.messages.createFailed"))
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={t("cards.create")}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("..")}>
              {t("cards.actions.backToList")}
            </Button>
            <Button
              form="card-form"
              type="submit"
              variant="primary"
              isLoading={isPending}
            >
              {t("cards.actions.create")}
            </Button>
          </>
        }
      />

      <CardForm
        formId="card-form"
        hideSubmit
        titleVi={titleVi}
        titleEn={titleEn}
        image={image}
        path={path}
        topicId={topicId}
        isActive={isActive}
        isSubmitting={isPending}
        submitLabel={t("cards.actions.create")}
        onTitleViChange={setTitleVi}
        onTitleEnChange={setTitleEn}
        onImageChange={setImage}
        onPathChange={setPath}
        onTopicIdChange={setTopicId}
        onIsActiveChange={setIsActive}
        onSubmit={handleSubmit}
      />
    </PageLayout>
  )
}

export default CreateCardPage
