pub mod download;

use download::DownloadManager;

pub struct AppState {
    pub download_manager: DownloadManager,
}
