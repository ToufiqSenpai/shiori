use std::env;
use std::path::Path;
use std::process::Command;

fn main() {
    download_ffmpeg();
    tauri_build::build()
}

fn download_ffmpeg() {
    let profile = env::var("PROFILE").unwrap_or_default();

    if profile != "release" {
        return;
    }

    // Windows only
    if env::var("CARGO_CFG_WINDOWS").is_err() {
        return;
    }

    let ffmpeg_bin = Path::new("bin/ffmpeg.exe");

    if ffmpeg_bin.exists() {
        println!("cargo:warning=Using existing ffmpeg.exe");
        return;
    }

    println!("cargo:warning=Downloading ffmpeg for Windows");

    // Download ffmpeg essentials from gyan.dev (much smaller, ~80MB)
    let ffmpeg_url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip";
    let zip_path = "bin/ffmpeg.zip";

    // Create bin directory if it doesn't exist
    std::fs::create_dir_all("bin").expect("Failed to create bin directory");

    // Download using PowerShell
    let download_status = Command::new("powershell")
        .args(&[
            "-Command",
            &format!("Invoke-WebRequest -Uri '{}' -OutFile '{}'", ffmpeg_url, zip_path)
        ])
        .status()
        .expect("Failed to download ffmpeg");

    if !download_status.success() {
        panic!("Failed to download ffmpeg");
    }

    println!("cargo:warning=Extracting ffmpeg");

    // Extract using PowerShell
    let extract_status = Command::new("powershell")
        .args(&[
            "-Command",
            &format!("Expand-Archive -Path '{}' -DestinationPath 'bin/temp' -Force", zip_path)
        ])
        .status()
        .expect("Failed to extract ffmpeg");

    if !extract_status.success() {
        panic!("Failed to extract ffmpeg");
    }

    // Move ffmpeg.exe from extracted folder to bin/
    // Gyan.dev uses pattern: ffmpeg-{version}-essentials_build/bin/ffmpeg.exe
    let copy_status = Command::new("powershell")
        .args(&[
            "-Command",
            "Get-ChildItem -Path 'bin/temp/*/bin/ffmpeg.exe' -Recurse | Copy-Item -Destination 'bin/ffmpeg.exe' -Force"
        ])
        .status()
        .expect("Failed to copy ffmpeg.exe");

    if !copy_status.success() {
        panic!("Failed to copy ffmpeg.exe");
    }

    // Cleanup
    let _ = std::fs::remove_file(zip_path);
    let _ = std::fs::remove_dir_all("bin/temp");

    if !ffmpeg_bin.exists() {
        panic!("ffmpeg.exe not found after download");
    }

    println!("cargo:warning=FFmpeg download completed");
}
