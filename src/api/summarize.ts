import { invoke } from "@tauri-apps/api/core";

export function getLanguages() {
  return invoke<LanguageInfo[]>("get_languages");
}

interface LanguageInfo {
  code: string;
  displayName: string;
}
