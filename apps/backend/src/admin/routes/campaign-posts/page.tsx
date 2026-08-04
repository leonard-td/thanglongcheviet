import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText, SquareTwoStack } from "@medusajs/icons"
import {
  Badge,
  Button,
  DataTable,
  Heading,
  IconButton,
  createDataTableColumnHelper,
  toast,
  useDataTable,
  type DataTablePaginationState,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import PageLayout from "../../components/page-layout"
import { sdk } from "../../lib/sdk"
import type {
  CampaignPost,
  CampaignPostResponse,
  CampaignPostsResponse,
} from "../../types/campaign-post"
import type { CampaignTopicsResponse } from "../../types/campaign-topic"

const CampaignPostsPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const limit = 15
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })

  const offset = useMemo(() => {
    return pagination.pageIndex * limit
  }, [pagination])

  const { data, isLoading } = useQuery<CampaignPostsResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/campaign-posts`, {
        query: {
          limit,
          offset,
        },
      }),
    queryKey: ["campaign-posts", limit, offset],
  })

  const { data: topicsData } = useQuery<CampaignTopicsResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/campaign-topics`, {
        query: { limit: 100 },
      }),
    queryKey: ["campaign-topics", "post-list"],
  })

  const topicNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const topic of topicsData?.campaign_topics ?? []) {
      map.set(topic.id, topic.name)
    }
    return map
  }, [topicsData])

  const { mutate: duplicatePost, isPending: isDuplicating } = useMutation({
    mutationFn: (postId: string) =>
      sdk.client.fetch<CampaignPostResponse>(
        `/admin/campaign-posts/${postId}/duplicate`,
        { method: "POST" }
      ),
    onSuccess: ({ campaign_post }) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-posts"] })
      toast.success(t("campaign-posts.messages.duplicated"))
      navigate(campaign_post.id)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("campaign-posts.messages.duplicateFailed")
      )
    },
  })

  const columnHelper = createDataTableColumnHelper<CampaignPost>()

  const columns = [
    columnHelper.accessor("title", {
      header: t("campaign-posts.columns.title"),
      cell: ({ getValue }) => (
        <span className="text-ui-fg-interactive">{getValue()}</span>
      ),
    }),
    columnHelper.accessor("slug", {
      header: t("campaign-posts.columns.slug"),
    }),
    columnHelper.accessor("topic_id", {
      header: t("campaign-posts.columns.topic"),
      cell: ({ getValue }) => {
        const topicId = getValue()
        return topicId ? (
          topicNameById.get(topicId) ?? "—"
        ) : (
          <span className="text-ui-fg-muted">—</span>
        )
      },
    }),
    columnHelper.accessor("is_active", {
      header: t("campaign-posts.columns.status"),
      cell: ({ getValue }) => (
        <Badge color={getValue() ? "green" : "grey"}>
          {getValue()
            ? t("campaign-posts.status.active")
            : t("campaign-posts.status.inactive")}
        </Badge>
      ),
    }),
    columnHelper.accessor("publish_at", {
      header: t("campaign-posts.columns.publishAt"),
      cell: ({ getValue }) =>
        getValue() ? new Date(getValue() as string).toLocaleString() : "—",
    }),
    columnHelper.accessor("unpublish_at", {
      header: t("campaign-posts.columns.unpublishAt"),
      cell: ({ getValue }) =>
        getValue() ? new Date(getValue() as string).toLocaleString() : "—",
    }),
    columnHelper.display({
      id: "actions",
      header: t("campaign-posts.columns.actions"),
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <IconButton
            size="small"
            variant="transparent"
            aria-label={t("campaign-posts.actions.duplicate")}
            disabled={isDuplicating}
            onClick={() => duplicatePost(row.original.id)}
          >
            <SquareTwoStack />
          </IconButton>
        </div>
      ),
    }),
  ]

  const table = useDataTable({
    columns,
    data: data?.campaign_posts || [],
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
          <Heading>{t("campaign-posts.title")}</Heading>
          <Button size="small" variant="secondary" onClick={() => navigate("create")}>
            {t("campaign-posts.create")}
          </Button>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.campaignPosts",
  translationNs: "translation",
  icon: DocumentText,
})

export default CampaignPostsPage
