import { DownloadStatus } from "@/enums/download-status"
import { invoke } from "@tauri-apps/api/core"
import { listen, UnlistenFn } from "@tauri-apps/api/event"

export function getDownloads(): Promise<FileDownload[]> {
  return invoke("get_downloads")
}

export function onDownloadEvent(
  callback: (data: DownloadEventData) => void
): Promise<UnlistenFn> {
  return listen<DownloadEventData>("download", (event) => {
    callback(event.payload)
  })
}

export interface FileDownload {
  id: string
  size: number
  progressBytes: number
  speedBytes: number
  url: string
  savePath: string
  name?: string
  checksum?: { type: string; value: string }
  status: DownloadStatus
}

export enum DownloadEvent {
  ADDED = "added",
  PROGRESS = "progress",
  STATUS_CHANGED = "status-changed",
  ERROR = "error",
}

export type DownloadEventData =
  | { type: DownloadEvent.ADDED; payload: FileDownload }
  | { type: DownloadEvent.PROGRESS; payload: { id: string; progressBytes: number; speedBytes: number } }
  | { type: DownloadEvent.STATUS_CHANGED; payload: { id: string; status: DownloadStatus } }
  | { type: DownloadEvent.ERROR; payload: { id: string; error: string } }