import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Calendar } from "@medusajs/icons"
import {
  Badge,
  Button,
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
    queryKey: ["events", limit, offset],
  })

  const columnHelper = createDataTableColumnHelper<AppEvent>()

  const columns = [
    columnHelper.accessor("title", {
      header: t("events.columns.title"),
      cell: ({ getValue }) => (
        <span className="text-ui-fg-interactive">{getValue()}</span>
      ),
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
