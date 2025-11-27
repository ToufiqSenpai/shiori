export enum WhisperModel {
  Tiny = 'tiny',
  Base = 'base',
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
}

export const WHISPER_MODEL_INFO: Record<
  WhisperModel,
  { label: string; size: string; sizeBytes: number }
> = {
  [WhisperModel.Tiny]: {
    label: 'Tiny',
    size: '~75 MB',
    sizeBytes: 75 * 1024 * 1024,
  },
  [WhisperModel.Base]: {
    label: 'Base',
    size: '~140 MB',
    sizeBytes: 140 * 1024 * 1024,
  },
  [WhisperModel.Small]: {
    label: 'Small',
    size: '~460 MB',
    sizeBytes: 460 * 1024 * 1024,
  },
  [WhisperModel.Medium]: {
    label: 'Medium',
    size: '~1.5 GB',
    sizeBytes: 1.5 * 1024 * 1024 * 1024,
  },
  [WhisperModel.Large]: {
    label: 'Large',
    size: '~3 GB',
    sizeBytes: 3 * 1024 * 1024 * 1024,
  },
};
