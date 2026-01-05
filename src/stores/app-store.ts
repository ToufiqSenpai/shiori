import { create } from 'zustand'

export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_FOUND = 'NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  IO_ERROR = 'IO_ERROR',
}

export class AppError extends Error {
  private readonly code: ErrorCode
  private readonly details: any

  public constructor(code: ErrorCode, details: any = null) {
    super(code)

    this.code = code
    this.details = details
  }

  public getCode(): ErrorCode {
    return this.code
  }

  public getDetails(): any {
    return this.details
  }
}

interface AppState {
  error: AppError | null
}

interface AppActions {
  setError: (error: AppError | null) => void
}

export const useAppStore = create<AppState & AppActions>((set, get) => {
  return {
    error: null,
    setError(error) {
      set({ error })

      setTimeout(() => {
        if (get().error) {
          set({ error: null })
        }
      }, 5000)
    },
  }
})
