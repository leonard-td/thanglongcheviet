import { randomUUID } from "node:crypto"

// Registry job trong bộ nhớ: backup/restore là tác vụ dài, API trả 202 rồi
// admin poll trạng thái. Chỉ một job chạy tại một thời điểm — restore đụng
// vào toàn bộ database nên tuyệt đối không cho chạy song song. Job mất khi
// backend restart, chấp nhận được vì job chỉ sống vài phút và restart giữa
// chừng đằng nào cũng phải làm lại.
export type BackupJobResult = {
  file_name?: string
  pre_restore_file?: string
}

export type BackupJob = {
  id: string
  type: "backup" | "restore"
  status: "running" | "completed" | "failed"
  // mã bước hiện tại — admin UI dịch qua i18n (backup.steps.<step>)
  step: string | null
  error: string | null
  started_at: string
  finished_at: string | null
  result: BackupJobResult | null
}

let lastJob: BackupJob | null = null

export function getLastJob(): BackupJob | null {
  return lastJob
}

export class JobRunningError extends Error {
  constructor() {
    super("Another backup/restore job is already running")
  }
}

export function startJob(
  type: BackupJob["type"],
  runner: (setStep: (step: string) => void) => Promise<BackupJobResult>
): BackupJob {
  if (lastJob?.status === "running") {
    throw new JobRunningError()
  }
  const job: BackupJob = {
    id: randomUUID(),
    type,
    status: "running",
    step: "starting",
    error: null,
    started_at: new Date().toISOString(),
    finished_at: null,
    result: null,
  }
  lastJob = job
  void (async () => {
    try {
      job.result = await runner((step) => {
        job.step = step
      })
      job.status = "completed"
    } catch (e: unknown) {
      job.status = "failed"
      job.error = e instanceof Error ? e.message : String(e)
    } finally {
      job.finished_at = new Date().toISOString()
    }
  })()
  return job
}
