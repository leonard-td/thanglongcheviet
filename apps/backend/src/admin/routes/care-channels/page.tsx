import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight, EllipsisHorizontal } from "@medusajs/icons"
import {
  Badge,
  Button,
  DataTable,
  DropdownMenu,
  Heading,
  IconButton,
  createDataTableColumnHelper,
  toast,
  useDataTable,
  usePrompt,
  type DataTablePaginationState,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import PageLayout from "../../components/page-layout"
import { sdk } from "../../lib/sdk"
import type {
  CareChannel,
  CareChannelsResponse,
} from "../../types/care-channel"

const CareChannelsPage = () => {
  const navigate = useNavigate()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const limit = 20
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })

  const offset = useMemo(() => {
    return pagination.pageIndex * limit
  }, [pagination])

  const { data, isLoading } = useQuery<CareChannelsResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/care-channels`, {
        query: { limit, offset },
      }),
    queryKey: ["care-channels", limit, offset],
  })

  const { mutateAsync: sendTest } = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch<{ success: boolean; error: string | null }>(
        `/admin/care-channels/${id}/test`,
        { method: "POST", body: {} }
      ),
  })

  const { mutateAsync: deleteChannel } = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/care-channels/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-channels"] })
    },
  })

  const handleTest = async (id: string) => {
    try {
      const result = await sendTest(id)
      if (result.success) {
        toast.success(t("care-channels.messages.testSent"))
      } else {
        toast.error(
          result.error || t("care-channels.messages.testFailed")
        )
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("care-channels.messages.testFailed")
      )
    }
  }

  const handleDelete = async (channel: CareChannel) => {
    const confirmed = await prompt({
      title: t("care-channels.messages.deleteConfirmTitle"),
      description: t("care-channels.messages.deleteConfirmDesc", {
        name: channel.name,
      }),
      confirmText: t("care-channels.messages.confirmDelete"),
      cancelText: t("care-channels.messages.cancelDelete"),
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteChannel(channel.id)
      toast.success(t("care-channels.messages.deleted"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("care-channels.messages.deleteFailed")
      )
    }
  }

  const columnHelper = createDataTableColumnHelper<CareChannel>()

  const columns = [
    columnHelper.accessor("name", {
      header: t("care-channels.columns.name"),
      cell: ({ getValue }) => (
        <span className="text-ui-fg-interactive">{getValue()}</span>
      ),
    }),
    columnHelper.accessor("provider", {
      header: t("care-channels.columns.provider"),
      cell: ({ getValue }) => (
        <Badge color={getValue() === "telegram" ? "blue" : "purple"}>
          {t(`care-channels.provider.${getValue()}`)}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: "scopes",
      header: t("care-channels.columns.scopes"),
      cell: ({ row }) => (
        <div className="flex items-center gap-x-1">
          {row.original.notify_orders && (
            <Badge size="2xsmall" color="orange">
              {t("care-channels.scopes.orders")}
            </Badge>
          )}
          {row.original.receive_messages && (
            <Badge size="2xsmall" color="green">
              {t("care-channels.scopes.messages")}
            </Badge>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("is_active", {
      header: t("care-channels.columns.status"),
      cell: ({ getValue }) => (
        <Badge color={getValue() ? "green" : "grey"}>
          {getValue()
            ? t("care-channels.status.active")
            : t("care-channels.status.inactive")}
        </Badge>
      ),
    }),
    columnHelper.accessor("created_at", {
      header: t("care-channels.columns.createdAt"),
      cell: ({ getValue }) =>
        getValue() ? new Date(getValue() as string).toLocaleString() : "—",
    }),
    columnHelper.display({
      id: "actions",
      header: t("care-channels.columns.actions"),
      cell: ({ row }) => (
        <div
          className="flex justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton size="small" variant="transparent">
                <EllipsisHorizontal />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => navigate(row.original.id)}>
                {t("care-channels.actions.edit")}
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => handleTest(row.original.id)}>
                {t("care-channels.actions.sendTest")}
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                className="text-ui-fg-error"
                onClick={() => handleDelete(row.original)}
              >
                {t("care-channels.actions.delete")}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      ),
    }),
  ]

  const table = useDataTable({
    columns,
    data: data?.care_channels || [],
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
          <Heading>{t("care-channels.title")}</Heading>
          <Button
            size="small"
            variant="secondary"
            onClick={() => navigate("create")}
          >
            {t("care-channels.create")}
          </Button>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.careChannels",
  translationNs: "translation",
  icon: ChatBubbleLeftRight,
})

export default CareChannelsPage
