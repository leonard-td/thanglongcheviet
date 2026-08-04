import {
  Badge,
  Button,
  Container,
  Heading,
  Label,
  Select,
  Text,
  toast,
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
  Inquiry,
  InquiryResponse,
  InquiryStatus,
} from "../../../types/inquiry"
import {
  STATUS_BADGE_COLORS,
  TYPE_BADGE_COLORS,
} from "../page"

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params

  const data = await sdk.client.fetch<InquiryResponse>(`/admin/inquiries/${id}`)

  return {
    inquiry: data.inquiry,
  }
}

export const handle = {
  breadcrumb: (match: UIMatch<{ inquiry: Inquiry }>) => {
    return match.data?.inquiry?.name ?? "Inquiry"
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

const InquiryDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { inquiry } = useLoaderData() as Awaited<ReturnType<typeof loader>>

  const [status, setStatus] = useState<InquiryStatus>(inquiry.status)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/inquiries/${id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] })
      revalidator.revalidate()
    },
  })

  const handleSave = async () => {
    try {
      await mutateAsync({ status })
      toast.success(t("inquiries.messages.updated"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("inquiries.messages.updateFailed")
      )
    }
  }

  const schedule =
    inquiry.type === "booking"
      ? [inquiry.preferred_date, inquiry.preferred_time].filter(Boolean).join(" ")
      : null

  return (
    <PageLayout>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">{t("inquiries.detail")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {inquiry.name}
          </Text>
        </div>
        <Button variant="secondary" onClick={() => navigate("..")}>
          {t("inquiries.actions.backToList")}
        </Button>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-6">
        <Container className="divide-y p-0">
          <div className="px-6 py-4">
            <Heading level="h2">{t("inquiries.sections.customer")}</Heading>
          </div>
          <InfoRow
            label={t("inquiries.fields.type")}
            value={
              <Badge color={TYPE_BADGE_COLORS[inquiry.type]}>
                {t(`inquiries.type.${inquiry.type}`)}
              </Badge>
            }
          />
          <InfoRow label={t("inquiries.fields.name")} value={inquiry.name} />
          <InfoRow label={t("inquiries.fields.phone")} value={inquiry.phone} />
          <InfoRow label={t("inquiries.fields.email")} value={inquiry.email} />
          {inquiry.type === "booking" ? (
            <>
              <InfoRow
                label={t("inquiries.fields.service")}
                value={inquiry.service}
              />
              <InfoRow
                label={t("inquiries.fields.schedule")}
                value={schedule}
              />
            </>
          ) : null}
          <InfoRow
            label={t("inquiries.fields.message")}
            value={
              inquiry.message ? (
                <span className="whitespace-pre-wrap">{inquiry.message}</span>
              ) : (
                "—"
              )
            }
          />
          <InfoRow
            label={t("inquiries.fields.source")}
            value={
              inquiry.source
                ? t(`inquiries.sources.${inquiry.source}`, {
                    defaultValue: inquiry.source,
                  })
                : "—"
            }
          />
          <InfoRow
            label={t("inquiries.fields.createdAt")}
            value={
              inquiry.created_at
                ? new Date(inquiry.created_at).toLocaleString()
                : "—"
            }
          />
          <InfoRow
            label={t("inquiries.fields.currentStatus")}
            value={
              <Badge color={STATUS_BADGE_COLORS[inquiry.status]}>
                {t(`inquiries.status.${inquiry.status}`)}
              </Badge>
            }
          />
        </Container>

        <Container className="flex flex-col gap-y-4 p-6">
          <div>
            <Heading level="h2">{t("inquiries.sections.handling")}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("inquiries.sections.handlingHint")}
            </Text>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label>{t("inquiries.fields.status")}</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as InquiryStatus)}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {(["new", "confirmed", "completed", "cancelled"] as const).map(
                  (value) => (
                    <Select.Item key={value} value={value}>
                      {t(`inquiries.status.${value}`)}
                    </Select.Item>
                  )
                )}
              </Select.Content>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button isLoading={isPending} variant="primary" onClick={handleSave}>
              {t("inquiries.actions.save")}
            </Button>
          </div>
        </Container>
      </div>
    </PageLayout>
  )
}

export default InquiryDetailPage
