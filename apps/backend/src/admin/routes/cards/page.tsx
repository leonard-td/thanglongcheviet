import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowDownTray, ArrowUpTray, DotsSix, GridLayout } from "@medusajs/icons"
import { Badge, Button, Checkbox, DropdownMenu, Heading, Switch, Text, Tooltip, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import PageLayout from "../../components/page-layout"
import { cardTitle } from "../../lib/card"
import { cardsToDelimited, cardsToJson, downloadFile, parseImportFile, type ImportRow } from "../../lib/card-io"
import { sdk } from "../../lib/sdk"
import type { Card, CardsResponse } from "../../types/card"

type ImportResult = {
  created: number
  updated: number
  skipped: number
  errors: string[]
  cards: Card[]
}

type RowProps = {
  card: Card
  onNavigate: (id: string) => void
  onToggleActive: (card: Card) => void
  togglingId: string | null
  selected: boolean
  onToggleSelect: (id: string) => void
}

const CardRow = ({ card, onNavigate, onToggleActive, togglingId, selected, onToggleSelect }: RowProps) => {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-x-4 px-6 py-3 hover:bg-ui-bg-subtle-hover bg-ui-bg-base"
    >
      {card.locked ? (
        <Tooltip content={t("cards.bulk.lockedNotSelectable")}>
          <Checkbox checked={false} disabled />
        </Tooltip>
      ) : (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(card.id)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      )}

      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-ui-fg-muted touch-none"
        aria-label={t("cards.actions.drag")}
        {...attributes}
        {...listeners}
      >
        <DotsSix />
      </button>

      <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-ui-bg-subtle flex items-center justify-center">
        {card.image ? (
          // key={card.image} forces a fresh <img> mount whenever the URL
          // changes, so a stale load-error's inline `display: none` never
          // carries over onto a newly-picked (valid) image.
          <img
            key={card.image}
            src={card.image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none"
            }}
          />
        ) : (
          <Text size="xsmall" className="text-ui-fg-muted text-center px-1">
            {t(`cards.type.${card.type}`)}
          </Text>
        )}
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onNavigate(card.id)}>
        <Text size="small" weight="plus" className="truncate">
          {cardTitle(card, t)}
        </Text>
        {card.path && (
          <Text size="xsmall" className="text-ui-fg-subtle truncate">
            {card.path}
          </Text>
        )}
      </div>

      <Badge size="2xsmall" color="blue">
        {t(`cards.type.${card.type}`)}
      </Badge>

      {card.locked && (
        <Tooltip content={t("cards.lockedNotice")}>
          <Badge size="2xsmall" color="orange">
            🔒
          </Badge>
        </Tooltip>
      )}

      <div className="flex items-center gap-x-2 pl-2 border-l border-ui-border-base">
        <Switch
          checked={card.is_active}
          disabled={togglingId === card.id}
          onCheckedChange={() => onToggleActive(card)}
          onClick={(e) => e.stopPropagation()}
        />
        <Text size="xsmall" className="text-ui-fg-subtle whitespace-nowrap">
          {card.is_active ? t("cards.status.active") : t("cards.status.inactive")}
        </Text>
      </div>
    </div>
  )
}

const CardsPage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const prompt = usePrompt()

  const { data, isLoading } = useQuery<CardsResponse>({
    queryFn: () => sdk.client.fetch(`/admin/cards`),
    queryKey: [["cards"]],
  })

  // Local, immediately-rendered order — synced from the query, then updated
  // in place on drag/toggle so the UI never waits on a refetch round-trip.
  const [items, setItems] = useState<Card[]>([])
  useEffect(() => {
    if (data?.cards) setItems(data.cards)
  }, [data])

  const { mutate: reorder } = useMutation({
    mutationFn: (payload: { id: string, rank: number }[]) =>
      sdk.client.fetch("/admin/cards/reorder", { method: "POST", body: { items: payload } }),
    onSuccess: (response: CardsResponse) => {
      queryClient.setQueryData([["cards"]], { cards: response.cards, count: response.cards.length })
    },
    onError: () => {
      toast.error(t("cards.messages.reorderFailed"))
      queryClient.invalidateQueries({ queryKey: [["cards"]] })
    },
  })

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const { mutate: toggleActive } = useMutation({
    mutationFn: (card: Card) =>
      sdk.client.fetch(`/admin/cards/${card.id}`, {
        method: "PATCH",
        body: { is_active: !card.is_active },
      }),
    onSettled: () => setTogglingId(null),
    onError: (_err, card) => {
      toast.error(t("cards.messages.updateFailed"))
      setItems((prev) => prev.map((c) => (c.id === card.id ? { ...c, is_active: card.is_active } : c)))
    },
  })

  const handleToggleActive = (card: Card) => {
    setTogglingId(card.id)
    setItems((prev) => prev.map((c) => (c.id === card.id ? { ...c, is_active: !c.is_active } : c)))
    toggleActive(card)
  }

  const handleExport = (format: "json" | "csv" | "txt") => {
    if (format === "json") {
      downloadFile("cards.json", cardsToJson(items), "application/json")
    } else if (format === "csv") {
      downloadFile("cards.csv", cardsToDelimited(items, ","), "text/csv")
    } else {
      downloadFile("cards.txt", cardsToDelimited(items, "\t"), "text/plain")
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate: importCards, isPending: isImporting } = useMutation({
    mutationFn: (rows: ImportRow[]) =>
      sdk.client.fetch<ImportResult>("/admin/cards/import", { method: "POST", body: { items: rows } }),
    onSuccess: (result) => {
      setItems(result.cards)
      queryClient.setQueryData([["cards"]], { cards: result.cards, count: result.cards.length })
      toast.success(
        t("cards.messages.importDone", {
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
        }),
      )
      result.errors.forEach((err) => toast.warning(err))
    },
    onError: () => toast.error(t("cards.messages.importFailed")),
  })

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    try {
      const rows = await parseImportFile(file)
      if (!rows.length) {
        toast.error(t("cards.messages.importEmpty"))
        return
      }
      importCards(rows)
    } catch {
      toast.error(t("cards.messages.importParseFailed"))
    }
  }

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const selectableIds = items.filter((c) => !c.locked).map((c) => c.id)
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds))
  }

  const { mutate: bulkDelete, isPending: isBulkDeleting } = useMutation({
    mutationFn: (ids: string[]) =>
      sdk.client.fetch<{ deleted: number, skipped: number, cards: Card[] }>("/admin/cards/bulk-delete", {
        method: "POST",
        body: { ids },
      }),
    onSuccess: (result) => {
      setItems(result.cards)
      queryClient.setQueryData([["cards"]], { cards: result.cards, count: result.cards.length })
      setSelectedIds(new Set())
      toast.success(t("cards.bulk.deleteDone", { count: result.deleted }))
      if (result.skipped > 0) toast.warning(t("cards.bulk.deleteSkipped", { count: result.skipped }))
    },
    onError: () => toast.error(t("cards.bulk.deleteFailed")),
  })

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return

    const confirmed = await prompt({
      title: t("cards.bulk.confirmTitle"),
      description: t("cards.bulk.confirmDesc", { count: ids.length }),
      confirmText: t("cards.messages.confirmDelete"),
      cancelText: t("cards.messages.cancelDelete"),
    })
    if (!confirmed) return

    bulkDelete(ids)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((c) => c.id === active.id)
    const newIndex = items.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next) // instant visual reorder
    reorder(next.map((c, i) => ({ id: c.id, rank: i })))
  }

  return (
    <PageLayout>
      <div className="flex flex-col gap-y-1 px-6 py-4">
        <div className="flex items-center justify-between">
          <Heading>{t("cards.title")}</Heading>
          <div className="flex items-center gap-x-2">
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button size="small" variant="secondary">
                  <ArrowDownTray />
                  {t("cards.io.export")}
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onClick={() => handleExport("json")}>
                  {t("cards.io.exportJson")}
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => handleExport("csv")}>
                  {t("cards.io.exportCsv")}
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => handleExport("txt")}>
                  {t("cards.io.exportTxt")}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.txt"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button
              size="small"
              variant="secondary"
              isLoading={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              <ArrowUpTray />
              {t("cards.io.import")}
            </Button>

            <Button size="small" variant="secondary" onClick={() => navigate("create")}>
              {t("cards.create")}
            </Button>
          </div>
        </div>
        <Text className="text-ui-fg-subtle" size="small">
          {t("cards.hint")}
        </Text>
      </div>

      <div className="flex items-center gap-x-4 px-6 py-2 bg-ui-bg-subtle">
        <Checkbox
          checked={allSelected}
          disabled={selectableIds.length === 0}
          onCheckedChange={handleToggleSelectAll}
        />
        {selectedIds.size > 0 ? (
          <div className="flex flex-1 items-center justify-between">
            <Text size="small">{t("cards.bulk.selectedCount", { count: selectedIds.size })}</Text>
            <Button
              size="small"
              variant="danger"
              isLoading={isBulkDeleting}
              onClick={handleBulkDelete}
            >
              {t("cards.bulk.deleteSelected")}
            </Button>
          </div>
        ) : (
          <Text size="small" className="text-ui-fg-subtle">
            {t("cards.bulk.selectAll")}
          </Text>
        )}
      </div>

      <div className="flex flex-col divide-y divide-ui-border-base">
        {isLoading && (
          <div className="px-6 py-4">
            <Text size="small">…</Text>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {items.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                onNavigate={navigate}
                onToggleActive={handleToggleActive}
                togglingId={togglingId}
                selected={selectedIds.has(card.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.cards",
  translationNs: "translation",
  icon: GridLayout,
})

export default CardsPage
