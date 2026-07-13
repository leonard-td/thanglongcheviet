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
import CardForm from "../../../components/card-form"
import PageHeader from "../../../components/page-header"
import PageLayout from "../../../components/page-layout"
import { cardTitle } from "../../../lib/card"
import { sdk } from "../../../lib/sdk"
import type { Card, CardResponse } from "../../../types/card"

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params
  const data = await sdk.client.fetch<CardResponse>(`/admin/cards/${id}`)
  return { card: data.card }
}

export const handle = {
  breadcrumb: (match: UIMatch<{ card: Card }>) => match.data?.card?.id ?? "Edit card",
}

const EditCardPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { card } = useLoaderData() as Awaited<ReturnType<typeof loader>>

  const [titleVi, setTitleVi] = useState(card.title?.vi ?? "")
  const [titleEn, setTitleEn] = useState(card.title?.en ?? "")
  const [image, setImage] = useState(card.image ?? "")
  const [path, setPath] = useState(card.path ?? "")
  const [isActive, setIsActive] = useState(card.is_active)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/cards/${id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] })
    },
  })

  const { mutateAsync: deleteCard, isPending: isDeleting } = useMutation({
    mutationFn: () => sdk.client.fetch(`/admin/cards/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] })
      toast.success(t("cards.messages.deleted"))
      navigate("..")
    },
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      await mutateAsync({
        title: { vi: titleVi, en: titleEn || titleVi },
        image: image || null,
        path: path || null,
        is_active: isActive,
      })
      toast.success(t("cards.messages.updated"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("cards.messages.updateFailed"))
    }
  }

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("cards.messages.deleteConfirmTitle"),
      description: t("cards.messages.deleteConfirmDesc", { title: cardTitle(card, t) }),
      confirmText: t("cards.messages.confirmDelete"),
      cancelText: t("cards.messages.cancelDelete"),
    })
    if (!confirmed) return

    try {
      await deleteCard()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("cards.messages.deleteFailed"))
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={t("cards.edit")}
        subtitle={cardTitle(card, t)}
        actions={
          <>
            {!card.locked && (
              <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
                {t("cards.actions.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate("..")}>
              {t("cards.actions.backToList")}
            </Button>
            <Button
              form="card-form"
              type="submit"
              variant="primary"
              isLoading={isPending}
            >
              {t("cards.actions.save")}
            </Button>
          </>
        }
      />

      <CardForm
        formId="card-form"
        hideSubmit
        locked={card.locked}
        titleVi={titleVi}
        titleEn={titleEn}
        image={image}
        path={path}
        isActive={isActive}
        isSubmitting={isPending}
        submitLabel={t("cards.actions.save")}
        onTitleViChange={setTitleVi}
        onTitleEnChange={setTitleEn}
        onImageChange={setImage}
        onPathChange={setPath}
        onIsActiveChange={setIsActive}
        onSubmit={handleSubmit}
      />
    </PageLayout>
  )
}

export default EditCardPage
