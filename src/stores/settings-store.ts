import { create } from 'zustand'
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { appConfigDir } from '@tauri-apps/api/path'

export interface SettingsState {
  isSetupComplete: boolean
  model: ModelSettings
}

interface SettingsActions {
  setSpeechToTextModel: (model: SpeechToTextModel) => Promise<void>
  setIsSetupComplete: (isComplete: boolean) => Promise<void>
}

interface ModelSettings {
  speechToText: SpeechToTextModel
}

export enum SpeechToTextModel {
  TINY = 'tiny',
  BASE = 'base',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE_TURBO = 'large-turbo',
  LARGE = 'large',
}

let settings: SettingsState = {
  isSetupComplete: false,
  model: {
    speechToText: SpeechToTextModel.BASE,
  },
}

const settingsPath = `${await appConfigDir()}/settings.json`

if (await exists(settingsPath)) {
  settings = JSON.parse(await readTextFile(settingsPath))
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => {
  function setSettings(newSettings: Partial<SettingsState>) {
    set(newSettings)

    writeTextFile(settingsPath, JSON.stringify(get()))
  }

  return {
    ...settings,
    setSpeechToTextModel: async (model: SpeechToTextModel) => {
      setSettings({
        model: {
          ...get().model,
          speechToText: model,
        },
      })
    },
    setIsSetupComplete: async (isComplete: boolean) => {
      setSettings({
        isSetupComplete: isComplete,
      })
    },
  }
})
