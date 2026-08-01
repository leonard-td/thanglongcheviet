import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ListBullet, PencilSquare, Trash } from "@medusajs/icons"
import {
  Button,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Switch,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import PageLayout from "../../components/page-layout"
import { sdk } from "../../lib/sdk"

type NavItem = {
  id: string
  label: string
  url: string
  order: number
  parent_id: string | null
  openInNewTab: boolean
  is_active: boolean
}

const EMPTY_FORM = {
  label: "",
  url: "/",
  order: 0,
  parent_id: null as string | null,
  openInNewTab: false,
  is_active: true,
}

const toPayload = (form: typeof EMPTY_FORM) => ({
  label: form.label.trim(),
  url: form.url.trim(),
  order: form.order,
  parent_id: form.parent_id,
  openInNewTab: form.openInNewTab,
  is_active: form.is_active,
})

const NavigationPage = () => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery<{ navigations: NavItem[] }>({
    queryKey: ["navigations"],
    queryFn: () => sdk.client.fetch("/admin/navigations"),
  })

  const items = data?.navigations ?? []

  const parentOptions = useMemo(
    () =>
      items.filter((item) => {
        if (editingId && item.id === editingId) return false
        return true
      }),
    [items, editingId]
  )

  const parentLabel = (parentId: string | null) => {
    if (!parentId) return "—"
    return items.find((item) => item.id === parentId)?.label ?? parentId
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const { mutateAsync: saveItem, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form)
      if (!payload.label || !payload.url) {
        throw new Error(t("navigation.messages.requiredFields"))
      }
      if (editingId) {
        return sdk.client.fetch(`/admin/navigations/${editingId}`, {
          method: "PUT",
          body: payload,
        })
      }
      return sdk.client.fetch("/admin/navigations", {
        method: "POST",
        body: payload,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigations"] })
      toast.success(
        t(editingId ? "navigation.messages.updated" : "navigation.messages.created")
      )
      resetForm()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("navigation.messages.saveFailed")
      )
    },
  })

  const { mutateAsync: deleteItem, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/navigations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigations"] })
      toast.success(t("navigation.messages.deleted"))
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("navigation.messages.deleteFailed")
      )
    },
  })

  const handleEdit = (item: NavItem) => {
    setEditingId(item.id)
    setForm({
      label: item.label,
      url: item.url,
      order: item.order,
      parent_id: item.parent_id,
      openInNewTab: item.openInNewTab,
      is_active: item.is_active,
    })
  }

  const handleDelete = async (item: NavItem) => {
    const confirmed = await prompt({
      title: t("navigation.messages.deleteConfirmTitle"),
      description: t("navigation.messages.deleteConfirmDesc", {
        label: item.label,
      }),
      confirmText: t("navigation.actions.delete"),
      cancelText: t("navigation.actions.cancel"),
    })
    if (!confirmed) return
    await deleteItem(item.id)
    if (editingId === item.id) resetForm()
  }

  return (
    <PageLayout>
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>{t("navigation.title")}</Heading>
      </div>

      <div className="grid grid-cols-1 gap-6 px-6 pb-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-lg border border-ui-border-base p-4">
          <Heading level="h2">
            {editingId ? t("navigation.form.edit") : t("navigation.form.create")}
          </Heading>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="nav-label">{t("navigation.fields.label")}</Label>
            <Input
              id="nav-label"
              placeholder={t("navigation.fields.labelPlaceholder")}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="nav-url">{t("navigation.fields.url")}</Label>
            <Input
              id="nav-url"
              placeholder={t("navigation.fields.urlPlaceholder")}
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="nav-order">{t("navigation.fields.order")}</Label>
            <Input
              id="nav-order"
              type="number"
              value={form.order}
              onChange={(e) =>
                setForm({ ...form, order: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <Label>{t("navigation.fields.parent")}</Label>
            <Select
              value={form.parent_id ?? "__none__"}
              onValueChange={(value) =>
                setForm({
                  ...form,
                  parent_id: value === "__none__" ? null : value,
                })
              }
            >
              <Select.Trigger>
                <Select.Value placeholder={t("navigation.fields.parentNone")} />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="__none__">
                  {t("navigation.fields.parentNone")}
                </Select.Item>
                {parentOptions.map((item) => (
                  <Select.Item key={item.id} value={item.id}>
                    {item.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="nav-active">{t("navigation.fields.isActive")}</Label>
            <Switch
              id="nav-active"
              checked={form.is_active}
              onCheckedChange={(checked) =>
                setForm({ ...form, is_active: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="nav-new-tab">{t("navigation.fields.openInNewTab")}</Label>
            <Switch
              id="nav-new-tab"
              checked={form.openInNewTab}
              onCheckedChange={(checked) =>
                setForm({ ...form, openInNewTab: checked })
              }
            />
          </div>

          <div className="flex gap-2">
            <Button isLoading={isSaving} onClick={() => saveItem()}>
              {editingId ? t("navigation.actions.update") : t("navigation.actions.create")}
            </Button>
            {editingId ? (
              <Button variant="secondary" onClick={resetForm}>
                {t("navigation.actions.cancel")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-2">
          {isLoading ? (
            <Text size="small">{t("navigation.loading")}</Text>
          ) : items.length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle">
              {t("navigation.empty")}
            </Text>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>{t("navigation.columns.label")}</Table.HeaderCell>
                  <Table.HeaderCell>{t("navigation.columns.url")}</Table.HeaderCell>
                  <Table.HeaderCell>{t("navigation.columns.order")}</Table.HeaderCell>
                  <Table.HeaderCell>{t("navigation.columns.parent")}</Table.HeaderCell>
                  <Table.HeaderCell>{t("navigation.columns.active")}</Table.HeaderCell>
                  <Table.HeaderCell>{t("navigation.columns.actions")}</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {items.map((item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell>{item.label}</Table.Cell>
                    <Table.Cell>{item.url}</Table.Cell>
                    <Table.Cell>{item.order}</Table.Cell>
                    <Table.Cell>{parentLabel(item.parent_id)}</Table.Cell>
                    <Table.Cell>
                      {item.is_active
                        ? t("navigation.status.active")
                        : t("navigation.status.inactive")}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-1">
                        <IconButton
                          size="small"
                          variant="transparent"
                          onClick={() => handleEdit(item)}
                        >
                          <PencilSquare />
                        </IconButton>
                        <IconButton
                          size="small"
                          variant="transparent"
                          disabled={isDeleting}
                          onClick={() => handleDelete(item)}
                        >
                          <Trash />
                        </IconButton>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.navigation",
  translationNs: "translation",
  icon: ListBullet,
})

export default NavigationPage
