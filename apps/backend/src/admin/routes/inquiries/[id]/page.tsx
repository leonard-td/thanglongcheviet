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
import { useEffect, useState } from "react"
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
import { INQUIRIES_STATS_QUERY_KEY } from "../../../hooks/use-inquiries-nav-badge"
import { sdk } from "../../../lib/sdk"
import type {
  Inquiry,
  InquiryResponse,
  InquiryStatus,
} from "../../../types/inquiry"
import { STATUS_BADGE_COLORS, TYPE_BADGE_COLORS } from "../page"

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params

  const data = await sdk.client.fetch<InquiryResponse>(
    `/admin/inquiries/${id}`
  )

  return { inquiry: data.inquiry }
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
  const { inquiry: loadedInquiry } = useLoaderData() as Awaited<
    ReturnType<typeof loader>
  >

  const [inquiry, setInquiry] = useState(loadedInquiry)
  const [status, setStatus] = useState<InquiryStatus>(loadedInquiry.status)

  useEffect(() => {
    setInquiry(loadedInquiry)
    setStatus(loadedInquiry.status)
  }, [loadedInquiry])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: { status: InquiryStatus }) =>
      sdk.client.fetch<InquiryResponse>(`/admin/inquiries/${id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: (data) => {
      setInquiry(data.inquiry)
      setStatus(data.inquiry.status)
      queryClient.invalidateQueries({ queryKey: [["inquiries"]] })
      queryClient.invalidateQueries({ queryKey: INQUIRIES_STATS_QUERY_KEY })
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

  return (
    <PageLayout>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="flex items-center gap-x-2">
            <Heading level="h1">{t("inquiries.detail")}</Heading>
            {inquiry.status === "new" && (
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-red-500"
                title={t("inquiries.status.new")}
                aria-hidden
              />
            )}
          </div>
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
          <div className="flex items-center justify-between px-6 py-4">
            <Heading level="h2">{t("inquiries.sections.customer")}</Heading>
            <div className="flex items-center gap-x-2">
              <Badge color={TYPE_BADGE_COLORS[inquiry.type]}>
                {t(`inquiries.type.${inquiry.type}`)}
              </Badge>
              <Badge color={STATUS_BADGE_COLORS[inquiry.status]}>
                {t(`inquiries.status.${inquiry.status}`)}
              </Badge>
            </div>
          </div>
          <InfoRow label={t("inquiries.fields.name")} value={inquiry.name} />
          <InfoRow label={t("inquiries.fields.phone")} value={inquiry.phone} />
          <InfoRow label={t("inquiries.fields.email")} value={inquiry.email} />
          <InfoRow
            label={t("inquiries.fields.service")}
            value={inquiry.service}
          />
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
          {inquiry.type === "booking" && (
            <>
              <InfoRow
                label={t("inquiries.fields.preferredDate")}
                value={inquiry.preferred_date}
              />
              <InfoRow
                label={t("inquiries.fields.preferredTime")}
                value={inquiry.preferred_time}
              />
            </>
          )}
          <InfoRow label={t("inquiries.fields.source")} value={inquiry.source} />
          <InfoRow
            label={t("inquiries.fields.createdAt")}
            value={
              inquiry.created_at
                ? new Date(inquiry.created_at).toLocaleString()
                : "—"
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
