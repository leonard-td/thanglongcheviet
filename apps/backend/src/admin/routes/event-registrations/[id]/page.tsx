import {
  Badge,
  Button,
  Container,
  Heading,
  Label,
  Select,
  Text,
  Textarea,
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
  useRevalidator,
} from "react-router-dom"
import { useTranslation } from "react-i18next"
import PageLayout from "../../../components/page-layout"
import { sdk } from "../../../lib/sdk"
import type {
  EventRegistration,
  EventRegistrationResponse,
  EventRegistrationStatus,
} from "../../../types/event-registration"
import { STATUS_BADGE_COLORS } from "../page"

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params

  const data = await sdk.client.fetch<EventRegistrationResponse>(
    `/admin/event-registrations/${id}`
  )

  return {
    event_registration: data.event_registration,
  }
}

export const handle = {
  breadcrumb: (match: UIMatch<{ event_registration: EventRegistration }>) => {
    return match.data?.event_registration?.name ?? "Registration"
  },
}

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-3 gap-4 px-6 py-3">
    <Text size="small" className="text-ui-fg-subtle">
      {label}
    </Text>
    <div className="col-span-2 text-sm">{value ?? "—"}</div>
  </div>
)

const EventRegistrationDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const revalidator = useRevalidator()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { event_registration: registration } = useLoaderData() as Awaited<
    ReturnType<typeof loader>
  >

  const [status, setStatus] = useState<EventRegistrationStatus>(
    registration.status
  )
  const [staffNote, setStaffNote] = useState(registration.staff_note ?? "")

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/event-registrations/${id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-registrations"] })
      revalidator.revalidate()
    },
  })

  const { mutateAsync: deleteRegistration, isPending: isDeleting } = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/event-registrations/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-registrations"] })
      toast.success(t("event-registrations.messages.deleted"))
      navigate("..")
    },
  })

  const handleSave = async () => {
    try {
      await mutateAsync({
        status,
        staff_note: staffNote || null,
      })
      toast.success(t("event-registrations.messages.updated"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("event-registrations.messages.updateFailed")
      )
    }
  }

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("event-registrations.messages.deleteConfirmTitle"),
      description: t("event-registrations.messages.deleteConfirmDesc", {
        name: registration.name,
      }),
      confirmText: t("event-registrations.messages.confirmDelete"),
      cancelText: t("event-registrations.messages.cancelDelete"),
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteRegistration()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("event-registrations.messages.deleteFailed")
      )
    }
  }

  return (
    <PageLayout>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">{t("event-registrations.detail")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {registration.name}
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
            {t("event-registrations.actions.delete")}
          </Button>
          <Button variant="secondary" onClick={() => navigate("..")}>
            {t("event-registrations.actions.backToList")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-6">
        <Container className="divide-y p-0">
          <div className="px-6 py-4">
            <Heading level="h2">
              {t("event-registrations.sections.registrant")}
            </Heading>
          </div>
          <InfoRow
            label={t("event-registrations.fields.name")}
            value={registration.name}
          />
          <InfoRow
            label={t("event-registrations.fields.phone")}
            value={registration.phone}
          />
          <InfoRow
            label={t("event-registrations.fields.email")}
            value={registration.email}
          />
          <InfoRow
            label={t("event-registrations.fields.quantity")}
            value={registration.quantity}
          />
          <InfoRow
            label={t("event-registrations.fields.message")}
            value={
              registration.message ? (
                <span className="whitespace-pre-wrap">{registration.message}</span>
              ) : (
                "—"
              )
            }
          />
          <InfoRow
            label={t("event-registrations.fields.event")}
            value={
              registration.event ? (
                <button
                  type="button"
                  className="text-ui-fg-interactive hover:underline"
                  onClick={() => navigate(`/events/${registration.event!.id}`)}
                >
                  {registration.event.title}
                </button>
              ) : (
                "—"
              )
            }
          />
          <InfoRow
            label={t("event-registrations.fields.source")}
            value={registration.source}
          />
          <InfoRow
            label={t("event-registrations.fields.createdAt")}
            value={
              registration.created_at
                ? new Date(registration.created_at).toLocaleString()
                : "—"
            }
          />
          <InfoRow
            label={t("event-registrations.fields.currentStatus")}
            value={
              <Badge color={STATUS_BADGE_COLORS[registration.status]}>
                {t(`event-registrations.status.${registration.status}`)}
              </Badge>
            }
          />
        </Container>

        <Container className="flex flex-col gap-y-4 p-6">
          <div>
            <Heading level="h2">
              {t("event-registrations.sections.handling")}
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("event-registrations.sections.handlingHint")}
            </Text>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label>{t("event-registrations.fields.status")}</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as EventRegistrationStatus)
              }
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {(["new", "contacted", "confirmed", "cancelled"] as const).map(
                  (value) => (
                    <Select.Item key={value} value={value}>
                      {t(`event-registrations.status.${value}`)}
                    </Select.Item>
                  )
                )}
              </Select.Content>
            </Select>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="staff_note">
              {t("event-registrations.fields.staffNote")}
            </Label>
            <Textarea
              id="staff_note"
              rows={5}
              placeholder={t("event-registrations.fields.staffNotePlaceholder")}
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button isLoading={isPending} variant="primary" onClick={handleSave}>
              {t("event-registrations.actions.save")}
            </Button>
          </div>
        </Container>
      </div>
    </PageLayout>
  )
}

export default EventRegistrationDetailPage
