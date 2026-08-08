import { defineRouteConfig } from "@medusajs/admin-sdk"
import { EllipsisHorizontal, Users } from "@medusajs/icons"
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
import type { Employee, EmployeesResponse } from "../../types/employee"

const EmployeesPage = () => {
  const navigate = useNavigate()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const limit = 20
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })

  const offset = useMemo(() => pagination.pageIndex * limit, [pagination])

  const { data, isLoading } = useQuery<EmployeesResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/employees`, {
        query: { limit, offset },
      }),
    queryKey: ["employees", limit, offset],
  })

  const { mutateAsync: deleteEmployee } = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/employees/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
    },
  })

  const handleDelete = async (employee: Employee) => {
    const name =
      [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
      employee.email

    const confirmed = await prompt({
      title: t("employees.messages.deleteConfirmTitle"),
      description: t("employees.messages.deleteConfirmDesc", { name }),
      confirmText: t("employees.messages.confirmDelete"),
      cancelText: t("employees.messages.cancelDelete"),
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteEmployee(employee.id)
      toast.success(t("employees.messages.deleted"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("employees.messages.deleteFailed")
      )
    }
  }

  const columnHelper = createDataTableColumnHelper<Employee>()

  const columns = [
    columnHelper.accessor("email", {
      header: t("employees.columns.email"),
      cell: ({ getValue }) => (
        <span className="text-ui-fg-interactive">{getValue()}</span>
      ),
    }),
    columnHelper.display({
      id: "name",
      header: t("employees.columns.name"),
      cell: ({ row }) => {
        const name = [row.original.first_name, row.original.last_name]
          .filter(Boolean)
          .join(" ")
        return name || "—"
      },
    }),
    columnHelper.display({
      id: "roles",
      header: t("employees.columns.roles"),
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1">
          {row.original.roles.length === 0 ? (
            <span className="text-ui-fg-muted">—</span>
          ) : (
            row.original.roles.map((role) => (
              <Badge key={role.id} size="2xsmall" color="blue">
                {role.name}
              </Badge>
            ))
          )}
        </div>
      ),
    }),
    columnHelper.accessor("blocked", {
      header: t("employees.columns.status"),
      cell: ({ getValue }) => (
        <Badge color={getValue() ? "red" : "green"}>
          {getValue()
            ? t("employees.status.blocked")
            : t("employees.status.active")}
        </Badge>
      ),
    }),
    columnHelper.accessor("created_at", {
      header: t("employees.columns.createdAt"),
      cell: ({ getValue }) =>
        getValue() ? new Date(getValue() as string).toLocaleString() : "—",
    }),
    columnHelper.display({
      id: "actions",
      header: t("employees.columns.actions"),
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
                {t("employees.actions.edit")}
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                className="text-ui-fg-error"
                onClick={() => handleDelete(row.original)}
              >
                {t("employees.actions.delete")}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      ),
    }),
  ]

  const table = useDataTable({
    columns,
    data: data?.employees || [],
    getRowId: (row) => row.id,
    rowCount: data?.count || 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    onRowClick: (_event, row) => {
      navigate(row.id)
    },
  })

  return (
    <PageLayout>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("employees.title")}</Heading>
          <p className="text-ui-fg-subtle text-sm">{t("employees.hint")}</p>
        </div>
        <Button size="small" onClick={() => navigate("create")}>
          {t("employees.actions.create")}
        </Button>
      </div>
      <DataTable instance={table}>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.employees",
  translationNs: "translation",
  icon: Users,
})

export default EmployeesPage
