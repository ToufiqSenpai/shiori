import { getWhisperModels } from '../api/model'
import prettyBytes from 'pretty-bytes'

export enum WhisperModel {
  TINY = 'tiny',
  BASE = 'base',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  LARGE_TURBO = 'large-turbo',
}

export const WHISPER_MODEL_INFO: Record<WhisperModel, { label: string; size: string; sizeBytes: number }> = (
  await getWhisperModels()
).reduce(
  (acc, model) => {
    acc[model.model as WhisperModel] = {
      label: model.model.charAt(0).toUpperCase() + model.model.slice(1).replace('-', ' '),
      size: prettyBytes(model.size),
      sizeBytes: model.size,
    }
    return acc
  },
  {} as Record<WhisperModel, { label: string; size: string; sizeBytes: number }>,
)
// > = {
//   [WhisperModel.TINY]: {
//     label: 'Tiny',
//     size: '~75 MB',
//     sizeBytes: 75 * 1024 * 1024,
//   },
//   [WhisperModel.BASE]: {
//     label: 'Base',
//     size: '~140 MB',
//     sizeBytes: 140 * 1024 * 1024,
//   },
//   [WhisperModel.SMALL]: {
//     label: 'Small',
//     size: '~460 MB',
//     sizeBytes: 460 * 1024 * 1024,
//   },
//   [WhisperModel.MEDIUM]: {
//     label: 'Medium',
//     size: '~1.5 GB',
//     sizeBytes: 1.5 * 1024 * 1024 * 1024,
//   },
//   [WhisperModel.LARGE]: {
//     label: 'Large',
//     size: '~3 GB',
//     sizeBytes: 3 * 1024 * 1024 * 1024,
//   },
// };
