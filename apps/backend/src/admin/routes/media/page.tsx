import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ArrowLeft,
  ArrowDownTray,
  ArrowUpTray,
  EllipsisHorizontal,
  ExclamationCircle,
  Folder,
  Pencil,
  Photo,
  Trash,
} from "@medusajs/icons"
import {
  Badge,
  Button,
  DropdownMenu,
  Heading,
  IconButton,
  Input,
  Prompt,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import PageLayout from "../../components/page-layout"
import { sdk } from "../../lib/sdk"
import type { MediaFolderItem, MediaItem, UsageEntry } from "../../types/media"

type ScanImportResult = {
  static_dir: string
  scanned_files: number
  scanned_images: number
  existing_db: number
  missing_db: number
  imported: number
  skipped_non_images: number
  errors: string[]
}

const MediaPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const confirmPrompt = usePrompt()

  // "all" = library root (folders + unfiled images shown together); otherwise a folder id.
  const [folder, setFolder] = useState<string>("all")

  const { data: foldersData } = useQuery<{ folders: MediaFolderItem[] }>({
    queryFn: () => sdk.client.fetch("/admin/media/folders"),
    queryKey: ["media-folders"],
  })
  const folders = foldersData?.folders ?? []
  const currentFolder = folder === "all" ? null : folders.find((f) => f.id === folder) ?? null

  const { data: mediaData, isLoading } = useQuery<{ media: MediaItem[], count: number }>({
    queryFn: () =>
      sdk.client.fetch(`/admin/media${folder === "all" ? "" : `?folder_id=${encodeURIComponent(folder)}`}`),
    queryKey: ["media-lib", folder],
  })
  const media = mediaData?.media ?? []

  // At the library root, only unfiled images sit alongside the folder tiles —
  // a folder's own contents only show once you open that folder (flat, non-nested).
  const visibleMedia = folder === "all" ? media.filter((m) => m.folder_id === null) : media

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>()
    if (folder === "all") {
      for (const m of media) {
        if (m.folder_id) counts.set(m.folder_id, (counts.get(m.folder_id) ?? 0) + 1)
      }
    }
    return counts
  }, [media, folder])

  const refreshLibrary = () => {
    queryClient.invalidateQueries({ queryKey: ["media-lib"] })
    // The card thumbnail picker shares the same underlying table.
    queryClient.invalidateQueries({ queryKey: [["card-media"]] })
  }

  // --- upload ---------------------------------------------------------------
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (!files.length) return

    setUploading(true)
    let done = 0
    try {
      for (const file of files) {
        const res = await sdk.admin.upload.create({ files: [file] })
        const uploaded = res.files[0]
        await sdk.client.fetch("/admin/media", {
          method: "POST",
          body: {
            url: uploaded.url,
            filename: file.name,
            // Uploads land in the folder currently being viewed.
            folder_id: folder !== "all" ? folder : null,
          },
        })
        done++
      }
      toast.success(t("mediaLib.messages.uploadDone", { count: done }))
      refreshLibrary()
    } catch {
      toast.error(t("mediaLib.messages.uploadFailed", { done, total: files.length }))
      if (done > 0) refreshLibrary()
    } finally {
      setUploading(false)
    }
  }

  // --- scan & import existing files -----------------------------------------
  const { mutate: scanImport, isPending: scanning } = useMutation({
    mutationFn: () =>
      sdk.client.fetch<ScanImportResult>("/admin/media/scan", {
        method: "POST",
      }),
    onSuccess: (r) => {
      toast.success(
        t("mediaLib.messages.scanImportDone", {
          imported: r.imported,
          missing: r.missing_db,
          images: r.scanned_images,
        })
      )
      refreshLibrary()
    },
    onError: () => toast.error(t("mediaLib.messages.scanImportFailed")),
  })

  // --- folders ----------------------------------------------------------------
  const [newFolderName, setNewFolderName] = useState("")
  const { mutate: createFolder, isPending: creatingFolder } = useMutation({
    mutationFn: (name: string) =>
      sdk.client.fetch<{ folder: MediaFolderItem }>("/admin/media/folders", {
        method: "POST",
        body: { name },
      }),
    onSuccess: (res) => {
      setNewFolderName("")
      queryClient.invalidateQueries({ queryKey: ["media-folders"] })
      setFolder(res.folder.id)
    },
    onError: () => toast.error(t("mediaLib.messages.folderCreateFailed")),
  })

  const { mutate: deleteFolder } = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/media/folders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setFolder("all")
      queryClient.invalidateQueries({ queryKey: ["media-folders"] })
      refreshLibrary()
      toast.success(t("mediaLib.messages.folderDeleted"))
    },
    onError: () => toast.error(t("mediaLib.messages.folderDeleteFailed")),
  })

  const handleDeleteFolder = async (f: MediaFolderItem) => {
    const confirmed = await confirmPrompt({
      title: t("mediaLib.folderDeleteConfirmTitle"),
      description: t("mediaLib.folderDeleteConfirmDesc", { name: f.name }),
      confirmText: t("mediaLib.delete.confirm"),
      cancelText: t("mediaLib.delete.cancel"),
    })
    if (confirmed) deleteFolder(f.id)
  }

  // --- rename folder (inline edit on the tile) --------------------------------
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const { mutate: renameFolder } = useMutation({
    mutationFn: ({ id, name }: { id: string, name: string }) =>
      sdk.client.fetch(`/admin/media/folders/${id}`, {
        method: "PATCH",
        body: { name },
      }),
    onSuccess: () => {
      setEditingFolderId(null)
      queryClient.invalidateQueries({ queryKey: ["media-folders"] })
      toast.success(t("mediaLib.messages.folderRenamed"))
    },
    onError: () => toast.error(t("mediaLib.messages.folderRenameFailed")),
  })

  const startRenameFolder = (f: MediaFolderItem) => {
    setEditingFolderId(f.id)
    setEditingName(f.name)
  }

  const commitRenameFolder = (f: MediaFolderItem) => {
    const trimmed = editingName.trim()
    setEditingFolderId(null)
    if (!trimmed || trimmed === f.name) return
    renameFolder({ id: f.id, name: trimmed })
  }

  // --- move -------------------------------------------------------------------
  const { mutate: moveMedia } = useMutation({
    mutationFn: ({ item, folderId }: { item: MediaItem, folderId: string | null }) =>
      sdk.client.fetch(`/admin/media/${item.id}`, {
        method: "PATCH",
        body: { folder_id: folderId },
      }),
    onSuccess: () => {
      refreshLibrary()
      toast.success(t("mediaLib.messages.moved"))
    },
    onError: () => toast.error(t("mediaLib.messages.moveFailed")),
  })

  // --- delete (always via usage-warning modal) --------------------------------
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null)

  const { data: usageData, isLoading: usageLoading } = useQuery<{ usage: UsageEntry[], count: number }>({
    queryFn: () => sdk.client.fetch(`/admin/media/${deleteTarget!.id}/usage`),
    queryKey: ["media-usage", deleteTarget?.id],
    enabled: !!deleteTarget,
  })
  const usage = usageData?.usage ?? []

  const { mutate: deleteMedia, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/media/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleteTarget(null)
      refreshLibrary()
      toast.success(t("mediaLib.delete.done"))
    },
    onError: () => toast.error(t("mediaLib.delete.failed")),
  })

  const folderName = (id: string | null) =>
    id ? folders.find((f) => f.id === id)?.name ?? "?" : t("mediaLib.rootFolder")

  return (
    <PageLayout>
      <div className="flex flex-col gap-y-1 px-6 py-4">
        <div className="flex items-center justify-between">
          <Heading>{t("mediaLib.title")}</Heading>
          <div className="flex items-center gap-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              size="small"
              variant="secondary"
              isLoading={scanning}
              onClick={() => scanImport()}
            >
              <ArrowDownTray />
              {t("mediaLib.scanImport")}
            </Button>
            <Button
              size="small"
              variant="primary"
              isLoading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <ArrowUpTray />
              {t("mediaLib.upload")}
            </Button>
          </div>
        </div>
        <Text className="text-ui-fg-subtle" size="small">
          {t("mediaLib.hint")}
        </Text>
      </div>

      {/* breadcrumb + create folder */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-ui-bg-subtle">
        <div className="flex items-center gap-x-2 min-w-0">
          {currentFolder ? (
            <>
              <Button size="small" variant="transparent" onClick={() => setFolder("all")}>
                <ArrowLeft />
                {t("mediaLib.allImages")}
              </Button>
              <Text className="text-ui-fg-muted">/</Text>
              <Text weight="plus" className="truncate">{currentFolder.name}</Text>
              <IconButton
                size="small"
                variant="transparent"
                aria-label={t("mediaLib.renameFolder")}
                onClick={() => startRenameFolder(currentFolder)}
              >
                <Pencil />
              </IconButton>
              <IconButton
                size="small"
                variant="transparent"
                className="text-ui-fg-muted"
                aria-label={t("mediaLib.deleteFolder")}
                onClick={() => handleDeleteFolder(currentFolder)}
              >
                <Trash />
              </IconButton>
            </>
          ) : (
            <Text weight="plus">{t("mediaLib.allImages")}</Text>
          )}
        </div>

        <div className="flex items-center gap-x-2">
          <Input
            size="small"
            className="w-44"
            placeholder={t("mediaLib.newFolderPlaceholder")}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newFolderName.trim()) {
                e.preventDefault()
                createFolder(newFolderName.trim())
              }
            }}
          />
          <Button
            size="small"
            variant="secondary"
            disabled={!newFolderName.trim()}
            isLoading={creatingFolder}
            onClick={() => createFolder(newFolderName.trim())}
          >
            {t("mediaLib.createFolder")}
          </Button>
        </div>
      </div>

      {/* folders + image grid */}
      <div className="px-6 py-4">
        {isLoading && <Text size="small">…</Text>}
        {!isLoading && !folders.length && !visibleMedia.length && (
          <Text size="small" className="text-ui-fg-subtle">
            {t("mediaLib.empty")}
          </Text>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {!currentFolder && folders.map((f) => {
            const isEditing = editingFolderId === f.id
            return (
              <div
                key={f.id}
                className="group relative flex aspect-square flex-col overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-base"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !isEditing && setFolder(f.id)}
                  onKeyDown={(e) => {
                    if (!isEditing && (e.key === "Enter" || e.key === " ")) setFolder(f.id)
                  }}
                  className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 px-3 text-center"
                >
                  <Folder className="text-ui-fg-muted h-8 w-8" />
                  {isEditing ? (
                    <Input
                      size="small"
                      autoFocus
                      value={editingName}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => commitRenameFolder(f)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          commitRenameFolder(f)
                        } else if (e.key === "Escape") {
                          setEditingFolderId(null)
                        }
                      }}
                    />
                  ) : (
                    <Text size="small" weight="plus" className="w-full truncate">
                      {f.name}
                    </Text>
                  )}
                  <Text size="xsmall" className="text-ui-fg-muted">
                    {t("mediaLib.folderItemCount", { count: folderCounts.get(f.id) ?? 0 })}
                  </Text>
                </div>

                <div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" variant="transparent" aria-label={t("mediaLib.folderActions")}>
                        <EllipsisHorizontal />
                      </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Item onClick={() => startRenameFolder(f)}>
                        <Pencil className="mr-1" />
                        {/* {t("mediaLib.renameFolder")} */}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="text-ui-fg-error"
                        onClick={() => handleDeleteFolder(f)}
                      >
                        <Trash className="mr-1" />
                        {/* {t("mediaLib.deleteFolder")} */}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}

          {visibleMedia.map((m) => (
            <div
              key={m.id}
              className="group flex flex-col overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-base"
            >
              <div className="aspect-square overflow-hidden bg-ui-bg-subtle flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={m.url}
                  src={m.url}
                  alt={m.filename ?? ""}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              </div>
              <div className="flex items-center gap-x-1 px-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <Text size="xsmall" className="truncate" title={m.filename ?? m.url}>
                    {m.filename ?? m.url.split("/").pop()}
                  </Text>
                  <Text size="xsmall" className="text-ui-fg-muted truncate">
                    {folderName(m.folder_id)}
                  </Text>
                </div>

                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <IconButton size="small" variant="transparent" aria-label={t("mediaLib.moveTo")}>
                      <Folder />
                    </IconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Label>{t("mediaLib.moveTo")}</DropdownMenu.Label>
                    <DropdownMenu.Item
                      disabled={m.folder_id === null}
                      onClick={() => moveMedia({ item: m, folderId: null })}
                    >
                      {t("mediaLib.rootFolder")}
                    </DropdownMenu.Item>
                    {folders.map((f) => (
                      <DropdownMenu.Item
                        key={f.id}
                        disabled={m.folder_id === f.id}
                        onClick={() => moveMedia({ item: m, folderId: f.id })}
                      >
                        {f.name}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu>

                <IconButton
                  size="small"
                  variant="transparent"
                  className="text-ui-fg-error"
                  aria-label={t("mediaLib.delete.title")}
                  onClick={() => setDeleteTarget(m)}
                >
                  <Trash />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* delete modal — ALWAYS shown, with live usage info */}
      <Prompt
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        variant="danger"
      >
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>{t("mediaLib.delete.title")}</Prompt.Title>
            <Prompt.Description>
              {deleteTarget?.filename ?? deleteTarget?.url}
            </Prompt.Description>
          </Prompt.Header>

          <div className="px-6 pb-2">
            {usageLoading && (
              <Text size="small" className="text-ui-fg-subtle">
                {t("mediaLib.delete.checking")}
              </Text>
            )}
            {!usageLoading && usage.length > 0 && (
              <div className="flex flex-col gap-y-2 rounded-md bg-ui-bg-subtle p-3">
                <div className="flex items-center gap-x-2 text-ui-fg-error">
                  <ExclamationCircle />
                  <Text size="small" weight="plus">
                    {t("mediaLib.delete.usedBy", { count: usage.length })}
                  </Text>
                </div>
                <ul className="flex flex-col gap-y-1 pl-1">
                  {usage.map((u) => (
                    <li key={`${u.kind}-${u.id}`} className="flex items-center gap-x-2">
                      <Badge size="2xsmall" color={u.kind === "card" ? "blue" : "purple"}>
                        {t(`mediaLib.delete.kind.${u.kind}`)}
                      </Badge>
                      <Text size="small" className="truncate">{u.label}</Text>
                    </li>
                  ))}
                </ul>
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t("mediaLib.delete.usedWarning")}
                </Text>
              </div>
            )}
            {!usageLoading && usage.length === 0 && (
              <Text size="small" className="text-ui-fg-subtle">
                {t("mediaLib.delete.notUsed")}
              </Text>
            )}
          </div>

          <Prompt.Footer>
            <Prompt.Cancel>{t("mediaLib.delete.cancel")}</Prompt.Cancel>
            <Prompt.Action
              disabled={usageLoading || isDeleting}
              onClick={() => deleteTarget && deleteMedia(deleteTarget.id)}
            >
              {t("mediaLib.delete.confirm")}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.media",
  translationNs: "translation",
  icon: Photo,
})

export default MediaPage
