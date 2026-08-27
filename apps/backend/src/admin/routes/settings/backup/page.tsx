import { defineRouteConfig } from "@medusajs/admin-sdk"
import { EllipsisHorizontal } from "@medusajs/icons"
import {
  Alert,
  Button,
  Checkbox,
  DropdownMenu,
  Heading,
  IconButton,
  Label,
  RadioGroup,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import PageLayout from "../../../components/page-layout"
import { sdk } from "../../../lib/sdk"

type BackupFile = {
  file_name: string
  size: number
  created_at: string
}

type BackupJob = {
  id: string
  type:
    | "backup"
    | "restore"
    | "export-json"
    | "import-json"
    | "export-initial-data"
    | "import-initial-data"
  status: "running" | "completed" | "failed"
  step: string | null
  error: string | null
  result: {
    file_name?: string
    pre_restore_file?: string
    imported_tables?: string[]
    mode?: string
    skipped_blocked?: string[]
    expanded_for_replace?: string[]
    warns_no_media_files?: boolean
  } | null
}

type BackupListResponse = {
  backups: BackupFile[]
  job: BackupJob | null
}

type ExportTable = {
  name: string
  group: string
  group_label: string
  label: string
  row_count: number
  default_selected: boolean
  default_merge: boolean
}

const QUERY_KEY = ["backup"]
const TABLES_KEY = ["backup", "tables"]

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  const units = ["KB", "MB", "GB"]
  let value = size
  let unit = "B"
  for (const u of units) {
    if (value < 1024) break
    value = value / 1024
    unit = u
  }
  return `${value.toFixed(1)} ${unit}`
}

const BackupSettingsPage = () => {
  const { t, i18n } = useTranslation()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const jsonImportRef = useRef<HTMLInputElement>(null)
  const initialDataImportRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<"full" | "content" | "seed">("full")
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge")
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set())
  const [tablesInitialized, setTablesInitialized] = useState(false)

  const { data } = useQuery<BackupListResponse>({
    queryKey: QUERY_KEY,
    queryFn: () => sdk.client.fetch("/admin/backup"),
    refetchInterval: (query) =>
      query.state.data?.job?.status === "running" ? 1500 : false,
  })

  const {
    data: tablesData,
    isLoading: tablesLoading,
    isError: tablesError,
    refetch: refetchTables,
  } = useQuery<{ tables: ExportTable[] }>({
    queryKey: TABLES_KEY,
    queryFn: () => sdk.client.fetch("/admin/backup/tables"),
    enabled: tab === "content",
  })

  useEffect(() => {
    if (!tablesData?.tables.length || tablesInitialized) return
    setSelectedTables(
      new Set(
        tablesData.tables.filter((tbl) => tbl.default_selected).map((tbl) => tbl.name)
      )
    )
    setTablesInitialized(true)
  }, [tablesData, tablesInitialized])

  const job = data?.job ?? null
  const busy = job?.status === "running"
  const locale = i18n.language === "vi" ? "vi-VN" : "en-US"

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: TABLES_KEY })
  }

  const onApiError = (e: unknown) => {
    const status = (e as { status?: number })?.status
    toast.error(
      status === 409
        ? t("backup.toasts.jobRunning")
        : t("backup.toasts.requestFailed")
    )
  }

  const createMutation = useMutation({
    mutationFn: () => sdk.client.fetch("/admin/backup", { method: "POST" }),
    onSuccess: () => {
      toast.success(t("backup.toasts.backupStarted"))
      refresh()
    },
    onError: onApiError,
  })

  const exportJsonMutation = useMutation({
    mutationFn: (tables: string[]) =>
      sdk.client.fetch("/admin/backup/export-json", {
        method: "POST",
        body: { tables },
      }),
    onSuccess: () => {
      toast.success(t("backup.content.exportStarted"))
      refresh()
    },
    onError: onApiError,
  })

  const restoreServerFileMutation = useMutation({
    mutationFn: (fileName: string) =>
      sdk.client.fetch("/admin/backup/restore", {
        method: "POST",
        body: { file_name: fileName },
      }),
    onSuccess: () => {
      toast.success(t("backup.toasts.restoreStarted"))
      refresh()
    },
    onError: onApiError,
  })

  const restoreUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/admin/backup/restore", {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      if (!res.ok) {
        throw Object.assign(new Error("upload failed"), { status: res.status })
      }
    },
    onSuccess: () => {
      toast.success(t("backup.toasts.restoreStarted"))
      refresh()
    },
    onError: onApiError,
  })

  const importJsonMutation = useMutation({
    mutationFn: async ({
      file,
      tables,
      mode,
    }: {
      file: File
      tables: string[]
      mode: "merge" | "replace"
    }) => {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("tables", JSON.stringify(tables))
      fd.append("mode", mode)
      const res = await fetch("/admin/backup/import-json", {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      if (!res.ok) {
        throw Object.assign(new Error("upload failed"), { status: res.status })
      }
    },
    onSuccess: () => {
      toast.success(t("backup.content.importStarted"))
      refresh()
    },
    onError: onApiError,
  })

  const exportInitialDataMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/backup/export-initial-data", { method: "POST" }),
    onSuccess: () => {
      toast.success(t("backup.seed.job.runningExport"))
      refresh()
    },
    onError: onApiError,
  })

  const importInitialDataMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/admin/backup/import-initial-data", {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      if (!res.ok) {
        throw Object.assign(new Error("upload failed"), { status: res.status })
      }
    },
    onSuccess: () => {
      toast.success(t("backup.seed.job.runningImport"))
      refresh()
    },
    onError: onApiError,
  })

  const deleteMutation = useMutation({
    mutationFn: (fileName: string) =>
      sdk.client.fetch(`/admin/backup/files/${encodeURIComponent(fileName)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success(t("backup.toasts.deleted"))
      refresh()
    },
    onError: onApiError,
  })

  const groupedTables = useMemo(() => {
    const groups = new Map<string, ExportTable[]>()
    for (const tbl of tablesData?.tables ?? []) {
      const list = groups.get(tbl.group_label) ?? []
      list.push(tbl)
      groups.set(tbl.group_label, list)
    }
    return groups
  }, [tablesData])

  const showsMediaExportWarning = useMemo(
    () =>
      [...selectedTables].some(
        (name) => name === "card_media" || name === "image"
      ),
    [selectedTables]
  )

  const toggleTable = (name: string, checked: boolean) => {
    setSelectedTables((prev) => {
      const next = new Set(prev)
      if (checked) next.add(name)
      else next.delete(name)
      return next
    })
  }

  const selectPreset = (preset: "website" | "all" | "none") => {
    const tables = tablesData?.tables ?? []
    if (preset === "none") {
      setSelectedTables(new Set())
      return
    }
    if (preset === "all") {
      setSelectedTables(new Set(tables.map((tbl) => tbl.name)))
      return
    }
    setSelectedTables(
      new Set(tables.filter((tbl) => tbl.default_selected).map((tbl) => tbl.name))
    )
  }

  const confirmRestore = async (fileLabel: string): Promise<boolean> =>
    prompt({
      title: t("backup.restorePrompt.title"),
      description: t("backup.restorePrompt.description", { file: fileLabel }),
      verificationText: t("backup.restorePrompt.confirmText"),
      confirmText: t("backup.restorePrompt.confirm"),
      cancelText: t("backup.restorePrompt.cancel"),
    })

  const confirmImport = async (fileLabel: string): Promise<boolean> =>
    prompt({
      title: t("backup.content.importPrompt.title"),
      description: t("backup.content.importPrompt.description", {
        file: fileLabel,
        mode: t(`backup.content.modes.${importMode}`),
        count: selectedTables.size,
      }),
      verificationText: t("backup.content.importPrompt.confirmText"),
      confirmText: t("backup.content.importPrompt.confirm"),
      cancelText: t("backup.content.importPrompt.cancel"),
    })

  const confirmImportInitialData = async (fileLabel: string): Promise<boolean> =>
    prompt({
      title: t("backup.seed.importPrompt.title"),
      description: t("backup.seed.importPrompt.description", { file: fileLabel }),
      verificationText: t("backup.seed.importPrompt.confirmText"),
      confirmText: t("backup.seed.importPrompt.confirm"),
      cancelText: t("backup.seed.importPrompt.cancel"),
    })

  const handleUploadChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (await confirmRestore(file.name)) {
      restoreUploadMutation.mutate(file)
    }
  }

  const handleJsonImportChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !selectedTables.size) return
    if (await confirmImport(file.name)) {
      importJsonMutation.mutate({
        file,
        tables: [...selectedTables],
        mode: importMode,
      })
    }
  }

  const handleInitialDataImportChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (await confirmImportInitialData(file.name)) {
      importInitialDataMutation.mutate(file)
    }
  }

  const handleRestoreExisting = async (fileName: string) => {
    if (await confirmRestore(fileName)) {
      restoreServerFileMutation.mutate(fileName)
    }
  }

  const handleDelete = async (fileName: string) => {
    const ok = await prompt({
      title: t("backup.deletePrompt.title"),
      description: t("backup.deletePrompt.description", { file: fileName }),
      confirmText: t("backup.deletePrompt.confirm"),
      cancelText: t("backup.deletePrompt.cancel"),
    })
    if (ok) deleteMutation.mutate(fileName)
  }

  const jobRunningKey = (() => {
    if (!job || job.status !== "running") return null
    switch (job.type) {
      case "backup":
        return "backup.job.runningBackup"
      case "restore":
        return "backup.job.runningRestore"
      case "export-json":
        return "backup.content.job.runningExport"
      case "import-json":
        return "backup.content.job.runningImport"
      case "export-initial-data":
        return "backup.seed.job.runningExport"
      case "import-initial-data":
        return "backup.seed.job.runningImport"
      default:
        return "backup.job.runningBackup"
    }
  })()

  const jobCompletedMessage = (() => {
    if (!job || job.status !== "completed") return null
    switch (job.type) {
      case "backup":
        return t("backup.job.completedBackup", {
          file: job.result?.file_name ?? "",
        })
      case "restore":
        return t("backup.job.completedRestore", {
          file: job.result?.pre_restore_file ?? "",
        })
      case "export-json":
        return t("backup.content.job.completedExport", {
          file: job.result?.file_name ?? "",
        })
      case "import-json": {
        const skipped = job.result?.skipped_blocked?.length
          ? t("backup.content.job.skippedBlocked", {
              tables: job.result.skipped_blocked.join(", "),
            })
          : ""
        const expanded = job.result?.expanded_for_replace?.length
          ? t("backup.content.job.expandedForReplace", {
              tables: job.result.expanded_for_replace.join(", "),
            })
          : ""
        const base = t("backup.content.job.completedImport", {
          file: job.result?.pre_restore_file ?? "",
        })
        return [base, skipped, expanded].filter(Boolean).join(" ")
      }
      case "export-initial-data":
        return t("backup.seed.job.completedExport", {
          file: job.result?.file_name ?? "",
        })
      case "import-initial-data":
        return t("backup.seed.job.completedImport", {
          file: job.result?.pre_restore_file ?? "",
        })
      default:
        return null
    }
  })()

  const jobAlert = (() => {
    if (!job) return null
    if (job.status === "running") {
      return (
        <Alert variant="info">
          {jobRunningKey ? t(jobRunningKey) : null}{" "}
          {job.step ? t(`backup.steps.${job.step}`, { defaultValue: job.step }) : null}
        </Alert>
      )
    }
    if (job.status === "failed") {
      return (
        <Alert variant="error">
          {t("backup.job.failed", { error: job.error ?? "" })}
        </Alert>
      )
    }
    const exportMediaWarn =
      job.type === "export-json" &&
      job.status === "completed" &&
      job.result?.warns_no_media_files
        ? t("backup.content.mediaExportWarning")
        : null
    return (
      <>
        <Alert variant="success">{jobCompletedMessage}</Alert>
        {exportMediaWarn ? (
          <Alert variant="warning" className="mt-2">
            {exportMediaWarn}
          </Alert>
        ) : null}
      </>
    )
  })()

  const zipBackups = (data?.backups ?? []).filter((b) =>
    b.file_name.endsWith(".zip")
  )
  const jsonExports = (data?.backups ?? []).filter((b) =>
    b.file_name.startsWith("content-export-")
  )
  const initialDataExports = (data?.backups ?? []).filter((b) =>
    b.file_name.startsWith("initial-data-")
  )

  return (
    <PageLayout>
      <div className="px-6 py-4">
        <Heading>{t("backup.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1 max-w-3xl">
          {t("backup.hint")}
        </Text>
        <div className="mt-4 flex gap-x-2">
          <Button
            size="small"
            variant={tab === "full" ? "primary" : "secondary"}
            onClick={() => setTab("full")}
          >
            {t("backup.tabs.full")}
          </Button>
          <Button
            size="small"
            variant={tab === "content" ? "primary" : "secondary"}
            onClick={() => setTab("content")}
          >
            {t("backup.tabs.content")}
          </Button>
          <Button
            size="small"
            variant={tab === "seed" ? "primary" : "secondary"}
            onClick={() => setTab("seed")}
          >
            {t("backup.tabs.seed")}
          </Button>
        </div>
      </div>

      {jobAlert && <div className="px-6 pb-4">{jobAlert}</div>}

      {tab === "full" ? (
        <>
          <div className="flex flex-col gap-y-2 px-6 pb-4 md:flex-row md:items-center md:justify-between">
            <Text size="small" className="text-ui-fg-subtle max-w-2xl">
              {t("backup.fullHint")}
            </Text>
            <div className="flex flex-none items-center gap-x-2">
              <Button
                size="small"
                variant="secondary"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                {t("backup.restoreUploadButton")}
              </Button>
              <Button
                size="small"
                disabled={busy}
                isLoading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {t("backup.createButton")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={handleUploadChange}
              />
            </div>
          </div>

          <div className="px-6 py-4">
            <Heading level="h2" className="mb-3">
              {t("backup.listTitle")}
            </Heading>
            {zipBackups.length === 0 ? (
              <Text size="small" className="text-ui-fg-muted">
                {t("backup.empty")}
              </Text>
            ) : (
              <BackupFileTable
                backups={zipBackups}
                busy={busy}
                locale={locale}
                t={t}
                onDownload={(name) =>
                  window.open(
                    `/admin/backup/files/${encodeURIComponent(name)}`,
                    "_blank"
                  )
                }
                onRestore={handleRestoreExisting}
                onDelete={handleDelete}
                showRestore
              />
            )}
          </div>
        </>
      ) : tab === "content" ? (
        <>
          <div className="px-6 pb-4">
            <Text size="small" className="text-ui-fg-subtle max-w-3xl">
              {t("backup.content.hint")}
            </Text>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="small" variant="secondary" onClick={() => selectPreset("website")}>
                {t("backup.content.presets.website")}
              </Button>
              <Button size="small" variant="secondary" onClick={() => selectPreset("all")}>
                {t("backup.content.presets.all")}
              </Button>
              <Button size="small" variant="secondary" onClick={() => selectPreset("none")}>
                {t("backup.content.presets.none")}
              </Button>
            </div>
          </div>

          <div className="px-6 pb-4 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-lg border border-ui-border-base p-4">
              <Heading level="h2" className="mb-3">
                {t("backup.content.tablesTitle")}
              </Heading>
              {tablesLoading ? (
                <Text size="small" className="text-ui-fg-muted">
                  {t("backup.content.loadingTables")}
                </Text>
              ) : tablesError ? (
                <div className="flex flex-col gap-y-2">
                  <Text size="small" className="text-ui-fg-error">
                    {t("backup.content.loadTablesError")}
                  </Text>
                  <Button size="small" variant="secondary" onClick={() => refetchTables()}>
                    {t("backup.content.retryTables")}
                  </Button>
                </div>
              ) : !tablesData?.tables.length ? (
                <Text size="small" className="text-ui-fg-muted">
                  {t("backup.content.emptyTables")}
                </Text>
              ) : (
                <div className="flex flex-col gap-y-4 max-h-[480px] overflow-y-auto">
                  {[...groupedTables.entries()].map(([group, tables]) => (
                    <div key={group}>
                      <Text size="small" weight="plus" className="mb-2">
                        {t(`backup.content.groups.${tables[0]?.group}`, {
                          defaultValue: group,
                        })}
                      </Text>
                      <div className="flex flex-col gap-y-2">
                        {tables.map((tbl) => (
                          <label
                            key={tbl.name}
                            className="flex items-start gap-x-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedTables.has(tbl.name)}
                              onCheckedChange={(checked) =>
                                toggleTable(tbl.name, checked === true)
                              }
                            />
                            <span className="flex flex-col">
                              <Text size="small">{tbl.label}</Text>
                              <Text size="xsmall" className="text-ui-fg-muted font-mono">
                                {tbl.name} · {tbl.row_count} rows
                              </Text>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-ui-border-base p-4 flex flex-col gap-y-4">
              <div>
                <Heading level="h2" className="mb-2">
                  {t("backup.content.importModeTitle")}
                </Heading>
                <RadioGroup
                  value={importMode}
                  onValueChange={(v) =>
                    setImportMode(v as "merge" | "replace")
                  }
                >
                  <div className="flex items-center gap-x-2">
                    <RadioGroup.Item value="merge" id="mode-merge" />
                    <Label htmlFor="mode-merge" weight="plus">
                      {t("backup.content.modes.merge")}
                    </Label>
                  </div>
                  <Text size="xsmall" className="text-ui-fg-muted ml-6 mb-2">
                    {t("backup.content.modes.mergeHint")}
                  </Text>
                  <div className="flex items-center gap-x-2">
                    <RadioGroup.Item value="replace" id="mode-replace" />
                    <Label htmlFor="mode-replace" weight="plus">
                      {t("backup.content.modes.replace")}
                    </Label>
                  </div>
                  <Text size="xsmall" className="text-ui-fg-muted ml-6">
                    {t("backup.content.modes.replaceHint")}
                  </Text>
                </RadioGroup>
              </div>

              <div className="flex flex-col gap-y-2">
                <Button
                  size="small"
                  disabled={busy || !selectedTables.size}
                  isLoading={exportJsonMutation.isPending}
                  onClick={() =>
                    exportJsonMutation.mutate([...selectedTables])
                  }
                >
                  {t("backup.content.exportButton")}
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={busy || !selectedTables.size}
                  onClick={() => jsonImportRef.current?.click()}
                >
                  {t("backup.content.importButton")}
                </Button>
                <input
                  ref={jsonImportRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleJsonImportChange}
                />
              </div>

              <Text size="xsmall" className="text-ui-fg-muted">
                {t("backup.content.customerSafeNote")}
              </Text>
              {showsMediaExportWarning ? (
                <Alert variant="warning">
                  {t("backup.content.mediaExportWarning")}
                </Alert>
              ) : null}
              {importMode === "replace" ? (
                <Alert variant="warning">
                  {t("backup.content.replaceGroupWarning")}
                </Alert>
              ) : null}
            </div>
          </div>

          <div className="px-6 py-4">
            <Heading level="h2" className="mb-3">
              {t("backup.content.exportsTitle")}
            </Heading>
            {jsonExports.length === 0 ? (
              <Text size="small" className="text-ui-fg-muted">
                {t("backup.content.emptyExports")}
              </Text>
            ) : (
              <BackupFileTable
                backups={jsonExports}
                busy={busy}
                locale={locale}
                t={t}
                onDownload={(name) =>
                  window.open(
                    `/admin/backup/files/${encodeURIComponent(name)}`,
                    "_blank"
                  )
                }
                onRestore={() => {}}
                onDelete={handleDelete}
                showRestore={false}
              />
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-y-2 px-6 pb-4 md:flex-row md:items-center md:justify-between">
            <Text size="small" className="text-ui-fg-subtle max-w-2xl">
              {t("backup.seed.hint")}
            </Text>
            <div className="flex flex-none items-center gap-x-2">
              <Button
                size="small"
                variant="secondary"
                disabled={busy}
                onClick={() => initialDataImportRef.current?.click()}
              >
                {t("backup.seed.importButton")}
              </Button>
              <Button
                size="small"
                disabled={busy}
                isLoading={exportInitialDataMutation.isPending}
                onClick={() => exportInitialDataMutation.mutate()}
              >
                {t("backup.seed.exportButton")}
              </Button>
              <input
                ref={initialDataImportRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleInitialDataImportChange}
              />
            </div>
          </div>

          <div className="px-6 py-4">
            <Heading level="h2" className="mb-3">
              {t("backup.seed.exportsTitle")}
            </Heading>
            {initialDataExports.length === 0 ? (
              <Text size="small" className="text-ui-fg-muted">
                {t("backup.seed.emptyExports")}
              </Text>
            ) : (
              <BackupFileTable
                backups={initialDataExports}
                busy={busy}
                locale={locale}
                t={t}
                onDownload={(name) =>
                  window.open(
                    `/admin/backup/files/${encodeURIComponent(name)}`,
                    "_blank"
                  )
                }
                onRestore={() => {}}
                onDelete={handleDelete}
                showRestore={false}
              />
            )}
          </div>
        </>
      )}
    </PageLayout>
  )
}

function BackupFileTable({
  backups,
  busy,
  locale,
  t,
  onDownload,
  onRestore,
  onDelete,
  showRestore,
}: {
  backups: BackupFile[]
  busy: boolean
  locale: string
  t: (key: string, opts?: Record<string, unknown>) => string
  onDownload: (name: string) => void
  onRestore: (name: string) => void
  onDelete: (name: string) => void
  showRestore: boolean
}) {
  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>{t("backup.columns.name")}</Table.HeaderCell>
          <Table.HeaderCell>{t("backup.columns.size")}</Table.HeaderCell>
          <Table.HeaderCell>{t("backup.columns.createdAt")}</Table.HeaderCell>
          <Table.HeaderCell className="text-right">
            {t("backup.columns.actions")}
          </Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {backups.map((backup) => (
          <Table.Row key={backup.file_name}>
            <Table.Cell className="font-mono text-xs">
              {backup.file_name}
            </Table.Cell>
            <Table.Cell>{formatBytes(backup.size)}</Table.Cell>
            <Table.Cell>
              {new Date(backup.created_at).toLocaleString(locale)}
            </Table.Cell>
            <Table.Cell>
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
                    <DropdownMenu.Item onClick={() => onDownload(backup.file_name)}>
                      {t("backup.actions.download")}
                    </DropdownMenu.Item>
                    {showRestore && (
                      <DropdownMenu.Item
                        disabled={busy}
                        onClick={() => onRestore(backup.file_name)}
                      >
                        {t("backup.actions.restore")}
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      className="text-ui-fg-error"
                      disabled={busy}
                      onClick={() => onDelete(backup.file_name)}
                    >
                      {t("backup.actions.delete")}
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}

export const config = defineRouteConfig({
  label: "menu.backup",
  translationNs: "translation",
})

export default BackupSettingsPage
