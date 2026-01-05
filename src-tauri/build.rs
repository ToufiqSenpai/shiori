fn main() {
    #[cfg(not(debug_assertions))]
    download_ffmpeg();

    tauri_build::build()
}

#[cfg(not(debug_assertions))]
fn download_ffmpeg() {
    use std::env;
    use std::fs;
    use std::fs::create_dir_all;
    use std::io::copy;
    use std::io::Cursor;
    use std::path::PathBuf;

    let bin_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("bin");
    let ffmpeg_path = bin_dir.join("ffmpeg.exe");

    if ffmpeg_path.exists() {
        println!("cargo:warning=ffmpeg.exe already exists, skipping download");
        return;
    }

    println!("cargo:warning=Downloading ffmpeg.exe...");

    create_dir_all(&bin_dir).expect("Failed to create bin directory");

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .expect("Failed to build HTTP client");
    let response = client
        .get("https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip")
        .send()
        .expect("Failed to download ffmpeg");
    let cursor = Cursor::new(response.bytes().expect("Failed to read response bytes"));
    let mut zip = zip::ZipArchive::new(cursor).expect("Failed to read zip archive");

    for i in 0..zip.len() {
        let mut file = zip.by_index(i).expect("Failed to get zip");

        if file.name().ends_with("ffmpeg.exe") {
            println!("cargo:warning=Extracting ffmpeg.exe...");

            let mut out_file =
                fs::File::create(&ffmpeg_path).expect("Failed to create output file");
            copy(&mut file, &mut out_file).expect("Failed to copy ffmpeg.exe");

            break;
        }
    }
}
