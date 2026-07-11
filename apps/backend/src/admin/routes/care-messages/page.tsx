import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowUturnLeft, ChatBubble } from "@medusajs/icons"
import {
  Badge,
  Button,
  DataTable,
  Drawer,
  Heading,
  IconButton,
  Select,
  Text,
  Textarea,
  clx,
  createDataTableColumnHelper,
  toast,
  useDataTable,
  type DataTablePaginationState,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import PageLayout from "../../components/page-layout"
import { sdk } from "../../lib/sdk"
import type { CareChannelsResponse } from "../../types/care-channel"
import type {
  CareMessage,
  CareMessageDirection,
  CareMessageKind,
  CareMessageStatus,
  CareMessagesResponse,
} from "../../types/care-message"

const ALL = "__all__"

const DIRECTION_BADGE_COLORS: Record<CareMessageDirection, "blue" | "green"> = {
  inbound: "blue",
  outbound: "green",
}

const STATUS_BADGE_COLORS: Record<
  CareMessageStatus,
  "green" | "red" | "blue"
> = {
  sent: "green",
  failed: "red",
  received: "blue",
}

const KIND_BADGE_COLORS: Record<CareMessageKind, "orange" | "blue" | "grey"> = {
  order: "orange",
  support: "blue",
  test: "grey",
}

const CareMessagesPage = () => {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [channelId, setChannelId] = useState("")
  const [direction, setDirection] = useState("")
  const [replyTarget, setReplyTarget] = useState<CareMessage | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const limit = 20
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })

  const offset = useMemo(() => {
    return pagination.pageIndex * limit
  }, [pagination])

  const { data, isLoading } = useQuery<CareMessagesResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/care-messages`, {
        query: {
          limit,
          offset,
          ...(channelId ? { channel_id: channelId } : {}),
          ...(direction ? { direction } : {}),
        },
      }),
    queryKey: ["care-messages", limit, offset, channelId, direction],
  })

  const { data: channelsData } = useQuery<CareChannelsResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/care-channels`, { query: { limit: 100 } }),
    queryKey: ["care-channels", "message-filter"],
  })

  const channels = channelsData?.care_channels ?? []

  const { data: threadData } = useQuery<CareMessagesResponse>({
    enabled: !!replyTarget?.external_user_id,
    queryFn: () =>
      sdk.client.fetch(`/admin/care-messages`, {
        query: {
          channel_id: replyTarget!.channel_id,
          external_user_id: replyTarget!.external_user_id!,
          limit: 50,
        },
      }),
    queryKey: [
      "care-messages",
      "thread",
      replyTarget?.channel_id,
      replyTarget?.external_user_id,
    ],
  })

  const thread = useMemo(
    () => [...(threadData?.care_messages ?? [])].reverse(),
    [threadData]
  )

  const { mutateAsync: sendReply, isPending: isSending } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/care-messages`, { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-messages"] })
    },
  })

  const handleSendReply = async () => {
    if (!replyTarget?.external_user_id || !replyContent.trim()) {
      return
    }

    try {
      await sendReply({
        channel_id: replyTarget.channel_id,
        external_user_id: replyTarget.external_user_id,
        content: replyContent.trim(),
      })

      setReplyContent("")
      toast.success(t("care-messages.reply.sent"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("care-messages.reply.sendFailed")
      )
    }
  }

  const openReply = (message: CareMessage) => {
    if (!message.external_user_id) {
      return
    }
    setReplyContent("")
    setReplyTarget(message)
  }

  const columnHelper = createDataTableColumnHelper<CareMessage>()

  const columns = [
    columnHelper.accessor("created_at", {
      header: t("care-messages.columns.createdAt"),
      cell: ({ getValue }) =>
        getValue() ? new Date(getValue() as string).toLocaleString() : "—",
    }),
    columnHelper.accessor("channel", {
      header: t("care-messages.columns.channel"),
      cell: ({ getValue }) =>
        getValue()?.name || <span className="text-ui-fg-muted">—</span>,
    }),
    columnHelper.accessor("direction", {
      header: t("care-messages.columns.direction"),
      cell: ({ getValue }) => (
        <Badge color={DIRECTION_BADGE_COLORS[getValue()]}>
          {t(`care-messages.direction.${getValue()}`)}
        </Badge>
      ),
    }),
    columnHelper.accessor("kind", {
      header: t("care-messages.columns.kind"),
      cell: ({ getValue }) => (
        <Badge size="2xsmall" color={KIND_BADGE_COLORS[getValue()]}>
          {t(`care-messages.kind.${getValue()}`)}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: "user",
      header: t("care-messages.columns.user"),
      cell: ({ row }) =>
        row.original.external_user_name ||
        row.original.external_user_id || (
          <span className="text-ui-fg-muted">—</span>
        ),
    }),
    columnHelper.accessor("content", {
      header: t("care-messages.columns.content"),
      cell: ({ getValue }) => (
        <span className="block max-w-72 truncate" title={getValue()}>
          {getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("status", {
      header: t("care-messages.columns.status"),
      cell: ({ row, getValue }) => (
        <Badge
          color={STATUS_BADGE_COLORS[getValue()]}
          title={row.original.error ?? undefined}
        >
          {t(`care-messages.status.${getValue()}`)}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: t("care-messages.columns.actions"),
      cell: ({ row }) => (
        <div
          className="flex justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.external_user_id && (
            <IconButton
              size="small"
              variant="transparent"
              onClick={() => openReply(row.original)}
            >
              <ArrowUturnLeft />
            </IconButton>
          )}
        </div>
      ),
    }),
  ]

  const table = useDataTable({
    columns,
    data: data?.care_messages || [],
    getRowId: (row) => row.id,
    rowCount: data?.count || 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    onRowClick: (_, row) => {
      openReply(row)
    },
  })

  return (
    <PageLayout>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <Heading>{t("care-messages.title")}</Heading>
          <div className="flex items-center gap-x-2">
            <div className="w-56">
              <Select
                size="small"
                value={channelId || ALL}
                onValueChange={(value) => {
                  setPagination({ pageSize: limit, pageIndex: 0 })
                  setChannelId(value === ALL ? "" : value)
                }}
              >
                <Select.Trigger>
                  <Select.Value
                    placeholder={t("care-messages.filters.channel")}
                  />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={ALL}>
                    {t("care-messages.filters.allChannels")}
                  </Select.Item>
                  {channels.map((channel) => (
                    <Select.Item key={channel.id} value={channel.id}>
                      {channel.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="w-44">
              <Select
                size="small"
                value={direction || ALL}
                onValueChange={(value) => {
                  setPagination({ pageSize: limit, pageIndex: 0 })
                  setDirection(value === ALL ? "" : value)
                }}
              >
                <Select.Trigger>
                  <Select.Value
                    placeholder={t("care-messages.filters.direction")}
                  />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={ALL}>
                    {t("care-messages.filters.allDirections")}
                  </Select.Item>
                  {(["inbound", "outbound"] as const).map((value) => (
                    <Select.Item key={value} value={value}>
                      {t(`care-messages.direction.${value}`)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>

      <Drawer
        open={!!replyTarget}
        onOpenChange={(open) => {
          if (!open) {
            setReplyTarget(null)
          }
        }}
      >
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {t("care-messages.reply.title", {
                user:
                  replyTarget?.external_user_name ||
                  replyTarget?.external_user_id ||
                  "",
              })}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-3 overflow-y-auto">
            {thread.length === 0 && (
              <Text size="small" className="text-ui-fg-muted">
                {t("care-messages.reply.empty")}
              </Text>
            )}
            {thread.map((message) => (
              <div
                key={message.id}
                className={clx(
                  "flex flex-col gap-y-1 rounded-lg px-3 py-2",
                  message.direction === "inbound"
                    ? "bg-ui-bg-subtle mr-8 self-start"
                    : "bg-ui-bg-base-pressed ml-8 self-end"
                )}
              >
                <Text size="small" className="whitespace-pre-wrap">
                  {message.content}
                </Text>
                <span className="text-ui-fg-muted text-xs">
                  {message.created_at
                    ? new Date(message.created_at).toLocaleString()
                    : ""}
                  {message.status === "failed" && (
                    <Badge size="2xsmall" color="red" className="ml-2">
                      {t("care-messages.status.failed")}
                    </Badge>
                  )}
                </span>
              </div>
            ))}
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex w-full flex-col gap-y-2">
              <Textarea
                rows={3}
                placeholder={t("care-messages.reply.placeholder")}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  isLoading={isSending}
                  disabled={!replyContent.trim()}
                  onClick={handleSendReply}
                >
                  {t("care-messages.reply.send")}
                </Button>
              </div>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.careMessages",
  translationNs: "translation",
  icon: ChatBubble,
})

export default CareMessagesPage
