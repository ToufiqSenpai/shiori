import { create } from "zustand";
import { DownloadEvent, FileDownload, onDownloadEvent } from "../api/download";

export interface DownloadState {
  downloads: FileDownload[];
}

export const useDownloadStore = create<DownloadState>((set, get) => {
  onDownloadEvent(data => {
    switch (data.type) {
      case DownloadEvent.ADDED:
        // Avoid duplicates
        if (!get().downloads.some(d => d.id === data.payload.id)) {
          set({ downloads: [...get().downloads, data.payload] });
        }
        break;
      case DownloadEvent.PROGRESS:
        set({
          downloads: get().downloads.map(download =>
            download.id === data.payload.id
              ? {
                ...download,
                progressBytes: data.payload.progressBytes,
                speedBytes: data.payload.speedBytes
              }
              : download
          )
        });
        break;
      case DownloadEvent.STATUS_CHANGED:
        set({
          downloads: get().downloads.map(download =>
            download.id === data.payload.id
              ? { ...download, status: data.payload.status }
              : download
          )
        });
        break;
      case DownloadEvent.ERROR:
        console.error("Download error:", data.payload);
        break;
    }
  });

  return {
    downloads: [],
  }
});