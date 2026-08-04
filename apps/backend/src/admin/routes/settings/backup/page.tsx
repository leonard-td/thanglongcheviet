import { defineRouteConfig } from "@medusajs/admin-sdk"
import { EllipsisHorizontal } from "@medusajs/icons"
import {
  Alert,
  Button,
  DropdownMenu,
  Heading,
  IconButton,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"
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
  type: "backup" | "restore"
  status: "running" | "completed" | "failed"
  step: string | null
  error: string | null
  result: { file_name?: string; pre_restore_file?: string } | null
}

type BackupListResponse = {
  backups: BackupFile[]
  job: BackupJob | null
}

const QUERY_KEY = ["backup"]

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

  const { data } = useQuery<BackupListResponse>({
    queryKey: QUERY_KEY,
    queryFn: () => sdk.client.fetch("/admin/backup"),
    refetchInterval: (query) =>
      query.state.data?.job?.status === "running" ? 1500 : false,
  })

  const job = data?.job ?? null
  const busy = job?.status === "running"
  const locale = i18n.language === "vi" ? "vi-VN" : "en-US"

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })

  const downloadBackup = async (fileName: string) => {
    try {
      const response = await fetch(
        `/admin/backup/files/${encodeURIComponent(fileName)}`,
        { credentials: "include" }
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t("backup.toasts.requestFailed"))
    }
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
      await sdk.client.fetch("/admin/backup/restore", {
        method: "POST",
        body: fd,
      })
    },
    onSuccess: () => {
      toast.success(t("backup.toasts.restoreStarted"))
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

  const confirmRestore = async (fileLabel: string): Promise<boolean> =>
    prompt({
      title: t("backup.restorePrompt.title"),
      description: t("backup.restorePrompt.description", { file: fileLabel }),
      verificationText: t("backup.restorePrompt.confirmText"),
      confirmText: t("backup.restorePrompt.confirm"),
      cancelText: t("backup.restorePrompt.cancel"),
    })

  const handleUploadChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    // reset để lần sau chọn lại đúng file này vẫn bắn onChange
    event.target.value = ""
    if (!file) return
    if (await confirmRestore(file.name)) {
      restoreUploadMutation.mutate(file)
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

  const jobAlert = (() => {
    if (!job) return null
    if (job.status === "running") {
      return (
        <Alert variant="info">
          {t(
            job.type === "backup"
              ? "backup.job.runningBackup"
              : "backup.job.runningRestore"
          )}{" "}
          {job.step ? t(`backup.steps.${job.step}`) : null}
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
    return (
      <Alert variant="success">
        {job.type === "backup"
          ? t("backup.job.completedBackup", {
              file: job.result?.file_name ?? "",
            })
          : t("backup.job.completedRestore", {
              file: job.result?.pre_restore_file ?? "",
            })}
      </Alert>
    )
  })()

  return (
    <PageLayout>
      <div className="flex flex-col gap-y-2 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Heading>{t("backup.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1 max-w-2xl">
            {t("backup.hint")}
          </Text>
        </div>
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

      {jobAlert && <div className="px-6 py-4">{jobAlert}</div>}

      <div className="px-6 py-4">
        <Heading level="h2" className="mb-3">
          {t("backup.listTitle")}
        </Heading>
        {data && data.backups.length === 0 ? (
          <Text size="small" className="text-ui-fg-muted">
            {t("backup.empty")}
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("backup.columns.name")}</Table.HeaderCell>
                <Table.HeaderCell>{t("backup.columns.size")}</Table.HeaderCell>
                <Table.HeaderCell>
                  {t("backup.columns.createdAt")}
                </Table.HeaderCell>
                <Table.HeaderCell className="text-right">
                  {t("backup.columns.actions")}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(data?.backups ?? []).map((backup) => (
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
                          <DropdownMenu.Item
                            onClick={() => downloadBackup(backup.file_name)}
                          >
                            {t("backup.actions.download")}
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            disabled={busy}
                            onClick={() =>
                              handleRestoreExisting(backup.file_name)
                            }
                          >
                            {t("backup.actions.restore")}
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator />
                          <DropdownMenu.Item
                            className="text-ui-fg-error"
                            disabled={busy}
                            onClick={() => handleDelete(backup.file_name)}
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
        )}
      </div>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.backup",
  translationNs: "translation",
})

export default BackupSettingsPage
