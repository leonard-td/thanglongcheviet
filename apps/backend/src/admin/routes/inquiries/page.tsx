import { defineRouteConfig } from "@medusajs/admin-sdk"
import { EnvelopeSolid } from "@medusajs/icons"
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
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import PageLayout from "../../components/page-layout"
import { sdk } from "../../lib/sdk"
import type {
  Inquiry,
  InquiryStatus,
  InquiryType,
  InquiriesResponse,
} from "../../types/inquiry"

const ALL = "__all__"

export const TYPE_BADGE_COLORS: Record<InquiryType, "blue" | "purple"> = {
  contact: "blue",
  booking: "purple",
}

export const STATUS_BADGE_COLORS: Record<
  InquiryStatus,
  "blue" | "orange" | "green" | "red"
> = {
  new: "blue",
  confirmed: "orange",
  completed: "green",
  cancelled: "red",
}

const InquiriesPage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [type, setType] = useState("")
  const [status, setStatus] = useState("")
  const limit = 20
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })

  const offset = useMemo(() => pagination.pageIndex * limit, [pagination])

  const { data, isLoading } = useQuery<InquiriesResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/inquiries`, {
        query: {
          limit,
          offset,
          ...(type ? { type } : {}),
          ...(status ? { status } : {}),
        },
      }),
    queryKey: ["inquiries", limit, offset, type, status],
  })

  const columnHelper = createDataTableColumnHelper<Inquiry>()

  const columns = [
    columnHelper.accessor("name", {
      header: t("inquiries.columns.name"),
      cell: ({ getValue }) => (
        <span className="text-ui-fg-interactive">{getValue()}</span>
      ),
    }),
    columnHelper.accessor("phone", {
      header: t("inquiries.columns.phone"),
    }),
    columnHelper.accessor("type", {
      header: t("inquiries.columns.type"),
      cell: ({ getValue }) => (
        <Badge color={TYPE_BADGE_COLORS[getValue()]}>
          {t(`inquiries.type.${getValue()}`)}
        </Badge>
      ),
    }),
    columnHelper.accessor("service", {
      header: t("inquiries.columns.service"),
      cell: ({ row, getValue }) => {
        if (row.original.type === "booking" && row.original.preferred_date) {
          const schedule = [
            row.original.preferred_date,
            row.original.preferred_time,
          ]
            .filter(Boolean)
            .join(" ")
          return schedule || getValue() || "—"
        }
        return getValue() || "—"
      },
    }),
    columnHelper.accessor("source", {
      header: t("inquiries.columns.source"),
      cell: ({ getValue }) =>
        getValue()
          ? t(`inquiries.sources.${getValue()}`, { defaultValue: getValue() })
          : "—",
    }),
    columnHelper.accessor("status", {
      header: t("inquiries.columns.status"),
      cell: ({ getValue }) => (
        <Badge color={STATUS_BADGE_COLORS[getValue()]}>
          {t(`inquiries.status.${getValue()}`)}
        </Badge>
      ),
    }),
    columnHelper.accessor("created_at", {
      header: t("inquiries.columns.createdAt"),
      cell: ({ getValue }) =>
        getValue() ? new Date(getValue() as string).toLocaleString() : "—",
    }),
  ]

  const table = useDataTable({
    columns,
    data: data?.inquiries || [],
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
          <Heading>{t("inquiries.title")}</Heading>
          <div className="flex items-center gap-x-2">
            <div className="w-44">
              <Select
                size="small"
                value={type || ALL}
                onValueChange={(value) => {
                  setPagination({ pageSize: limit, pageIndex: 0 })
                  setType(value === ALL ? "" : value)
                }}
              >
                <Select.Trigger>
                  <Select.Value placeholder={t("inquiries.filters.type")} />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={ALL}>
                    {t("inquiries.filters.allTypes")}
                  </Select.Item>
                  {(["contact", "booking"] as const).map((value) => (
                    <Select.Item key={value} value={value}>
                      {t(`inquiries.type.${value}`)}
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
                  <Select.Value placeholder={t("inquiries.filters.status")} />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={ALL}>
                    {t("inquiries.filters.allStatuses")}
                  </Select.Item>
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
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.inquiries",
  translationNs: "translation",
  icon: EnvelopeSolid,
})

export default InquiriesPage
