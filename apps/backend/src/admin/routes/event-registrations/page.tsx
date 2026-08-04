import { defineRouteConfig } from "@medusajs/admin-sdk"
import { UserGroup } from "@medusajs/icons"
import {
  Badge,
  DataTable,
  Heading,
  Select,
  createDataTableColumnHelper,
  useDataTable,
  type DataTablePaginationState,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import PageLayout from "../../components/page-layout"
import { sdk } from "../../lib/sdk"
import type {
  EventRegistration,
  EventRegistrationStatus,
  EventRegistrationsResponse,
} from "../../types/event-registration"
import type { EventsResponse } from "../../types/event"

const ALL = "__all__"

export const STATUS_BADGE_COLORS: Record<
  EventRegistrationStatus,
  "blue" | "orange" | "green" | "red"
> = {
  new: "blue",
  contacted: "orange",
  confirmed: "green",
  cancelled: "red",
}

const EventRegistrationsPage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const eventId = searchParams.get("event_id") ?? ""
  const [status, setStatus] = useState("")
  const limit = 20
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })

  const offset = useMemo(() => {
    return pagination.pageIndex * limit
  }, [pagination])

  const { data, isLoading } = useQuery<EventRegistrationsResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/event-registrations`, {
        query: {
          limit,
          offset,
          ...(status ? { status } : {}),
          ...(eventId ? { event_id: eventId } : {}),
        },
      }),
    queryKey: ["event-registrations", limit, offset, status, eventId],
  })

  const { data: eventsData } = useQuery<EventsResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/events`, {
        query: { limit: 100 },
      }),
    queryKey: ["events", "registration-filter"],
  })

  const events = eventsData?.events ?? []

  const columnHelper = createDataTableColumnHelper<EventRegistration>()

  const columns = [
    columnHelper.accessor("name", {
      header: t("event-registrations.columns.name"),
      cell: ({ getValue }) => (
        <span className="text-ui-fg-interactive">{getValue()}</span>
      ),
    }),
    columnHelper.accessor("phone", {
      header: t("event-registrations.columns.phone"),
    }),
    columnHelper.accessor("event", {
      header: t("event-registrations.columns.event"),
      cell: ({ getValue }) =>
        getValue()?.title || <span className="text-ui-fg-muted">—</span>,
    }),
    columnHelper.accessor("quantity", {
      header: t("event-registrations.columns.quantity"),
    }),
    columnHelper.accessor("status", {
      header: t("event-registrations.columns.status"),
      cell: ({ getValue }) => (
        <Badge color={STATUS_BADGE_COLORS[getValue()]}>
          {t(`event-registrations.status.${getValue()}`)}
        </Badge>
      ),
    }),
    columnHelper.accessor("created_at", {
      header: t("event-registrations.columns.createdAt"),
      cell: ({ getValue }) =>
        getValue() ? new Date(getValue() as string).toLocaleString() : "—",
    }),
  ]

  const table = useDataTable({
    columns,
    data: data?.event_registrations || [],
    getRowId: (row) => row.id,
    rowCount: data?.count || 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    onRowClick: (_, row) => {
      navigate(row.id)
    },
  })

  return (
    <PageLayout>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <Heading>{t("event-registrations.title")}</Heading>
          <div className="flex items-center gap-x-2">
            <div className="w-56">
              <Select
                size="small"
                value={eventId || ALL}
                onValueChange={(value) => {
                  setPagination({ pageSize: limit, pageIndex: 0 })
                  setSearchParams(value === ALL ? {} : { event_id: value })
                }}
              >
                <Select.Trigger>
                  <Select.Value
                    placeholder={t("event-registrations.filters.event")}
                  />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={ALL}>
                    {t("event-registrations.filters.allEvents")}
                  </Select.Item>
                  {events.map((event) => (
                    <Select.Item key={event.id} value={event.id}>
                      {event.title}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="w-44">
              <Select
                size="small"
                value={status || ALL}
                onValueChange={(value) => {
                  setPagination({ pageSize: limit, pageIndex: 0 })
                  setStatus(value === ALL ? "" : value)
                }}
              >
                <Select.Trigger>
                  <Select.Value
                    placeholder={t("event-registrations.filters.status")}
                  />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={ALL}>
                    {t("event-registrations.filters.allStatuses")}
                  </Select.Item>
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
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.eventRegistrations",
  translationNs: "translation",
  icon: UserGroup,
})

export default EventRegistrationsPage
