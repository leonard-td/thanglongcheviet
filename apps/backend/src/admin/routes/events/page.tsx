import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Calendar } from "@medusajs/icons"
import {
  Badge,
  Button,
  Copy,
  DataTable,
  Heading,
  createDataTableColumnHelper,
  useDataTable,
  type DataTablePaginationState,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import PageLayout from "../../components/page-layout"
import { sdk } from "../../lib/sdk"
import type { AppEvent, EventsResponse } from "../../types/event"
import type { CampaignTopicsResponse } from "../../types/campaign-topic"

const EventsPage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const limit = 15
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })

  const offset = useMemo(() => {
    return pagination.pageIndex * limit
  }, [pagination])

  const { data, isLoading } = useQuery<EventsResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/events`, {
        query: {
          limit,
          offset,
        },
      }),
    queryKey: [["events", limit, offset]],
  })

  const { data: topicsData } = useQuery<CampaignTopicsResponse>({
    queryFn: () =>
      sdk.client.fetch("/admin/campaign-topics", {
        query: { limit: 100, content_type: "event" },
      }),
    queryKey: [["campaign-topics", "event-list"]],
  })

  const topicNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const topic of topicsData?.campaign_topics ?? []) {
      map.set(topic.id, topic.name)
    }
    return map
  }, [topicsData])

  const columnHelper = createDataTableColumnHelper<AppEvent>()

  const columns = [
    columnHelper.accessor("title", {
      header: t("events.columns.title"),
      cell: ({ getValue }) => (
        <span className="text-ui-fg-interactive">{getValue()}</span>
      ),
    }),
    columnHelper.accessor("topic_id", {
      header: t("events.columns.topic"),
      cell: ({ getValue }) => {
        const topicId = getValue()
        return topicId ? (
          topicNameById.get(topicId) ?? "—"
        ) : (
          <span className="text-ui-fg-muted">—</span>
        )
      },
    }),
    columnHelper.accessor("start_at", {
      header: t("events.columns.startAt"),
      cell: ({ getValue }) =>
        getValue() ? new Date(getValue() as string).toLocaleString() : "—",
    }),
    columnHelper.accessor("location", {
      header: t("events.columns.location"),
      cell: ({ getValue }) =>
        getValue() || <span className="text-ui-fg-muted">—</span>,
    }),
    columnHelper.accessor("registered_seats", {
      header: t("events.columns.registrations"),
      cell: ({ getValue, row }) => {
        const registered = getValue() ?? 0
        const capacity = row.original.capacity
        return capacity ? `${registered} / ${capacity}` : `${registered}`
      },
    }),
    columnHelper.accessor("registration_open", {
      header: t("events.columns.registrationOpen"),
      cell: ({ getValue }) => (
        <Badge color={getValue() ? "green" : "grey"}>
          {getValue()
            ? t("events.registration.open")
            : t("events.registration.closed")}
        </Badge>
      ),
    }),
    columnHelper.accessor("is_active", {
      header: t("events.columns.status"),
      cell: ({ getValue }) => (
        <Badge color={getValue() ? "green" : "grey"}>
          {getValue() ? t("events.status.active") : t("events.status.inactive")}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: t("events.columns.actions"),
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Copy content={`/trai-nghiem/${row.original.slug}`} />
        </div>
      ),
    }),
  ]

  const table = useDataTable({
    columns,
    data: data?.events || [],
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
          <Heading>{t("events.title")}</Heading>
          <Button size="small" variant="secondary" onClick={() => navigate("create")}>
            {t("events.create")}
          </Button>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.events",
  translationNs: "translation",
  icon: Calendar,
})

export default EventsPage
