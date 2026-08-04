import { defineRouteConfig } from "@medusajs/admin-sdk"
import { TagSolid } from "@medusajs/icons"
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
import type {
  CampaignTopic,
  CampaignTopicsResponse,
} from "../../types/campaign-topic"

const CampaignTopicsPage = () => {
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

  const { data, isLoading } = useQuery<CampaignTopicsResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/campaign-topics`, {
        query: {
          limit,
          offset,
        },
      }),
    queryKey: ["campaign-topics", limit, offset],
  })

  const columnHelper = createDataTableColumnHelper<CampaignTopic>()

  const columns = [
    columnHelper.accessor("image", {
      header: t("campaign-topics.columns.image"),
      cell: ({ getValue }) => {
        const url = getValue()
        return url ? (
          <img
            src={url}
            alt=""
            className="h-8 w-12 rounded object-cover"
          />
        ) : (
          <span className="text-ui-fg-muted">—</span>
        )
      },
    }),
    columnHelper.accessor("name", {
      header: t("campaign-topics.columns.name"),
      cell: ({ getValue }) => (
        <span className="text-ui-fg-interactive">{getValue()}</span>
      ),
    }),
    columnHelper.accessor("slug", {
      header: t("campaign-topics.columns.slug"),
    }),
    columnHelper.accessor("rank", {
      header: t("campaign-topics.columns.rank"),
    }),
    columnHelper.accessor("is_active", {
      header: t("campaign-topics.columns.status"),
      cell: ({ getValue }) => (
        <Badge color={getValue() ? "green" : "grey"}>
          {getValue()
            ? t("campaign-topics.status.active")
            : t("campaign-topics.status.inactive")}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: t("campaign-topics.columns.actions"),
      cell: ({ row }) => (
        <div
          className="flex justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <Copy content={`/tin-tuc/chu-de/${row.original.slug}`} />
        </div>
      ),
    }),
  ]

  const table = useDataTable({
    columns,
    data: data?.campaign_topics || [],
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
          <Heading>{t("campaign-topics.title")}</Heading>
          <Button size="small" variant="secondary" onClick={() => navigate("create")}>
            {t("campaign-topics.create")}
          </Button>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.campaignTopics",
  translationNs: "translation",
  icon: TagSolid,
})

export default CampaignTopicsPage
