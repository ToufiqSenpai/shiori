import { invoke } from '@tauri-apps/api/core'

import { AppError, ErrorCode, useAppStore } from '../stores/app-store'

const SKIP_SET_ERROR_CODE = ['NOT_FOUND', 'INVALID_INPUT']

interface ErrorPayload {
  code: ErrorCode
  details?: any
}
  
export async function command<T>(cmd: string, args: Record<string, any> = {}): Promise<T> {
  try {
    return await invoke(cmd, args)
  } catch (error) {
    const err = error as ErrorPayload
    const appError = new AppError(err.code, err.details)

    if (!SKIP_SET_ERROR_CODE.includes(err.code)) {
      useAppStore.getState().setError(appError)
    }

    throw appError
  }
}
