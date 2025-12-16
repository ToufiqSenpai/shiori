import { invoke } from '@tauri-apps/api/core'
import { SpeechToTextModel } from '../stores/settings-store'
import { TextGenerationProvider } from '../enums/text-generation-provider'

export interface SpeechToTextModelResult {
  model: SpeechToTextModel
  size: number
}

export function getSpeechToTextModels(): Promise<SpeechToTextModelResult[]> {
  return invoke<SpeechToTextModelResult[]>('get_speech_to_text_models')
}

export function setTextGenerationApiKey(provider: TextGenerationProvider, apiKey: string): Promise<boolean> {
  return invoke<boolean>('set_text_generation_api_key', { provider, apiKey })
}

export function downloadSpeechToTextModel(model: SpeechToTextModel): Promise<void> {
  return invoke<void>('download_speech_to_text_model', { model })
}

export function getTextGenerationModels(): Promise<TextGenerationModel[]> {
  return invoke<TextGenerationModel[]>('get_text_generation_models')
}

export interface TextGenerationModel {
  id: string
  name: string
  provider: TextGenerationProvider
}
