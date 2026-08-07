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
} from "react-router-dom"
import { useTranslation } from "react-i18next"
import EventForm from "../../../components/event-form"
import PageHeader from "../../../components/page-header"
import PageLayout from "../../../components/page-layout"
import { toDatetimeLocal, toIsoDateTime } from "../../../lib/campaign-post"
import { sdk } from "../../../lib/sdk"
import type { AppEvent, EventResponse } from "../../../types/event"

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params

  const data = await sdk.client.fetch<EventResponse>(`/admin/events/${id}`)

  return {
    event: data.event,
  }
}

export const handle = {
  breadcrumb: (match: UIMatch<{ event: AppEvent }>) => {
    return match.data?.event?.title ?? "Edit event"
  },
}

const EditEventPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { event: eventData } = useLoaderData() as Awaited<ReturnType<typeof loader>>

  const [title, setTitle] = useState(eventData.title)
  const [slug, setSlug] = useState(eventData.slug)
  const [thumbnail, setThumbnail] = useState(eventData.thumbnail ?? "")
  const [location, setLocation] = useState(eventData.location ?? "")
  const [startAt, setStartAt] = useState(toDatetimeLocal(eventData.start_at))
  const [endAt, setEndAt] = useState(toDatetimeLocal(eventData.end_at))
  const [capacity, setCapacity] = useState(
    eventData.capacity ? String(eventData.capacity) : ""
  )
  const [registrationOpen, setRegistrationOpen] = useState(
    eventData.registration_open
  )
  const [topicId, setTopicId] = useState(eventData.topic_id ?? "")
  const [isActive, setIsActive] = useState(eventData.is_active)
  const [seoTitle, setSeoTitle] = useState(eventData.seo_title ?? "")
  const [seoDescription, setSeoDescription] = useState(
    eventData.seo_description ?? ""
  )
  const [seoKeywords, setSeoKeywords] = useState(eventData.seo_keywords ?? "")
  const [content, setContent] = useState<JSONContent | null>(eventData.content)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/events/${id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  const { mutateAsync: deleteEvent, isPending: isDeleting } = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/events/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
      toast.success(t("events.messages.deleted"))
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
        thumbnail: thumbnail || null,
        location: location || null,
        start_at: toIsoDateTime(startAt),
        end_at: toIsoDateTime(endAt),
        capacity: capacity ? Number(capacity) : null,
        registration_open: registrationOpen,
        topic_id: topicId || null,
        is_active: isActive,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        seo_keywords: seoKeywords || null,
      })

      toast.success(t("events.messages.updated"))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("events.messages.updateFailed")
      )
    }
  }

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("events.messages.deleteConfirmTitle"),
      description: t("events.messages.deleteConfirmDesc", { title }),
      confirmText: t("events.messages.confirmDelete"),
      cancelText: t("events.messages.cancelDelete"),
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteEvent()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("events.messages.deleteFailed")
      )
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={t("events.edit")}
        subtitle={t("events.registeredSeats", {
          count: eventData.registered_seats ?? 0,
        })}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate(`/event-registrations?event_id=${id}`)}
            >
              {t("events.actions.viewRegistrations")}
            </Button>
            <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
              {t("events.actions.delete")}
            </Button>
            <Button variant="secondary" onClick={() => navigate("..")}>
              {t("events.actions.backToList")}
            </Button>
            <Button
              form="event-form"
              type="submit"
              variant="primary"
              isLoading={isPending}
            >
              {t("events.actions.save")}
            </Button>
          </>
        }
      />

      <EventForm
        formId="event-form"
        hideSubmit
        title={title}
        slug={slug}
        thumbnail={thumbnail}
        location={location}
        startAt={startAt}
        endAt={endAt}
        capacity={capacity}
        registrationOpen={registrationOpen}
        topicId={topicId}
        isActive={isActive}
        seoTitle={seoTitle}
        seoDescription={seoDescription}
        seoKeywords={seoKeywords}
        content={content}
        isSubmitting={isPending}
        submitLabel={t("events.actions.save")}
        onTitleChange={setTitle}
        onSlugChange={setSlug}
        onThumbnailChange={setThumbnail}
        onLocationChange={setLocation}
        onStartAtChange={setStartAt}
        onEndAtChange={setEndAt}
        onCapacityChange={setCapacity}
        onRegistrationOpenChange={setRegistrationOpen}
        onTopicIdChange={setTopicId}
        onIsActiveChange={setIsActive}
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

export default EditEventPage
