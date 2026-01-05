import { listen } from '@tauri-apps/api/event'
import { create } from 'zustand'

import { DownloadStatus } from '../enums/download-status'

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
  ADDED = 'added',
  PROGRESS = 'progress',
  STATUS_CHANGED = 'status-changed',
  ERROR = 'error',
}

export type DownloadEventData =
  | { type: DownloadEvent.ADDED; payload: FileDownload }
  | { type: DownloadEvent.PROGRESS; payload: { id: string; progressBytes: number; speedBytes: number } }
  | { type: DownloadEvent.STATUS_CHANGED; payload: { id: string; status: DownloadStatus } }
  | { type: DownloadEvent.ERROR; payload: { id: string; error: string } }

export interface DownloadState {
  downloads: FileDownload[]
}

export const useDownloadStore = create<DownloadState>((set, get) => {
  listen<DownloadEventData>("download", event => {
    const data = event.payload
    
    switch (data.type) {
      case DownloadEvent.ADDED:
        // Avoid duplicates
        if (!get().downloads.some(d => d.id === data.payload.id)) {
          set({ downloads: [...get().downloads, data.payload] })
        }
        break
      case DownloadEvent.PROGRESS:
        set({
          downloads: get().downloads.map(download =>
            download.id === data.payload.id
              ? {
                  ...download,
                  progressBytes: data.payload.progressBytes,
                  speedBytes: data.payload.speedBytes,
                }
              : download,
          ),
        })
        break
      case DownloadEvent.STATUS_CHANGED:
        set({
          downloads: get().downloads.map(download =>
            download.id === data.payload.id ? { ...download, status: data.payload.status } : download,
          ),
        })
        break
      case DownloadEvent.ERROR:
        console.error('Download error:', data.payload)
        break
    }
  })

  return {
    downloads: [],
  }
})
