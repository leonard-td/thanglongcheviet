import { EllipsisHorizontal } from "@medusajs/icons"
import {
  DataTable,
  DropdownMenu,
  Heading,
  IconButton,
  Text,
  createDataTableColumnHelper,
  toast,
  useDataTable,
  type DataTablePaginationState,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"

export type StorefrontLinkRow = {
  id: string
  name: string
  handle: string | null
  thumbnail: string | null
}

type StorefrontLinksTableProps = {
  title: string
  hint: string
  basePath: string
  queryKey: string
  fetchPage: (
    pagination: DataTablePaginationState
  ) => Promise<{ rows: StorefrontLinkRow[], count: number }>
}

const columnHelper = createDataTableColumnHelper<StorefrontLinkRow>()

/**
 * Read-only listing of storefront links for a core entity (category or
 * collection), rendered below the core Medusa list table via a
 * `*.list.after` widget zone. Each row's only action — copy the
 * domain-relative storefront path — lives in a trailing dropdown menu
 * rather than an inline button, per this feature's request.
 */
const StorefrontLinksTable = ({
  title,
  hint,
  basePath,
  queryKey,
  fetchPage,
}: StorefrontLinksTableProps) => {
  const { t } = useTranslation()
  const limit = 10
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })

  const { data, isLoading } = useQuery({
    queryFn: () => fetchPage(pagination),
    queryKey: [queryKey, pagination.pageIndex],
  })

  const copyLink = async (handle: string | null) => {
    if (!handle) return
    try {
      await navigator.clipboard.writeText(`${basePath}/${handle}`)
      toast.success(t("storefrontLink.list.copied"))
    } catch {
      toast.error(t("storefrontLink.list.copyFailed"))
    }
  }

  const columns = [
    columnHelper.display({
      id: "thumbnail",
      header: t("storefrontLink.list.thumbnail"),
      cell: ({ row }) =>
        row.original.thumbnail
          ? (
              <img
                src={row.original.thumbnail}
                alt=""
                className="h-8 w-12 rounded object-cover"
              />
            )
          : (
              <span className="text-ui-fg-muted">—</span>
            ),
    }),
    columnHelper.accessor("name", {
      header: t("storefrontLink.list.name"),
    }),
    columnHelper.display({
      id: "path",
      header: t("storefrontLink.list.path"),
      cell: ({ row }) => (
        <span className="text-ui-fg-subtle font-mono text-xs">
          {row.original.handle ? `${basePath}/${row.original.handle}` : "—"}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: t("storefrontLink.list.actions"),
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton size="small" variant="transparent">
                <EllipsisHorizontal />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item
                disabled={!row.original.handle}
                onClick={() => copyLink(row.original.handle)}
              >
                {t("storefrontLink.list.copyLink")}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      ),
    }),
  ]

  const table = useDataTable({
    columns,
    data: data?.rows ?? [],
    getRowId: (row) => row.id,
    rowCount: data?.count ?? 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  return (
    <DataTable instance={table}>
      <DataTable.Toolbar className="flex flex-col items-start gap-1 px-6 py-4">
        <Heading level="h2">{title}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {hint}
        </Text>
      </DataTable.Toolbar>
      <DataTable.Table />
      <DataTable.Pagination />
    </DataTable>
  )
}

export default StorefrontLinksTable
