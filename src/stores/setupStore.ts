import { create } from 'zustand';
import {
  SetupStep,
  SETUP_STEP_COUNT,
  Accelerator,
  WhisperModel,
  LlmProvider,
  DownloadStatus,
} from '../enums';

export interface DownloadProgress {
  id: string;
  label: string;
  progress: number;
  status: 'pending' | 'downloading' | 'complete' | 'error';
}

export interface SetupState {
  // Wizard navigation
  currentStep: SetupStep;

  // Step 2: Directory
  dataDirectory: string;

  // Step 3: Hugging Face
  hfToken: string;

  // Step 4: Hardware & Models
  accelerator: Accelerator;
  whisperModel: WhisperModel;
  llmProvider: LlmProvider;
  llmApiKey: string;

  // Step 6: Download
  downloadItems: DownloadProgress[];
  downloadStatus: DownloadStatus;
  downloadMessage: string;

  // Validation
  isValidating: boolean;
  validationErrors: Record<string, string>;

  // Actions
  setStep: (step: SetupStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateConfig: (config: Partial<SetupState>) => void;
  setValidationError: (field: string, error: string) => void;
  clearValidationError: (field: string) => void;
  clearAllErrors: () => void;
  setIsValidating: (isValidating: boolean) => void;
  setDownloadProgress: (id: string, progress: number) => void;
  setDownloadItemStatus: (
    id: string,
    status: DownloadProgress['status']
  ) => void;
  setDownloadStatus: (status: DownloadStatus) => void;
  setDownloadMessage: (message: string) => void;
  initializeDownloadItems: () => void;
  reset: () => void;
}

const initialState = {
  currentStep: SetupStep.Welcome,
  dataDirectory: '',
  hfToken: '',
  accelerator: Accelerator.CPU,
  whisperModel: WhisperModel.Base,
  llmProvider: LlmProvider.Gemini,
  llmApiKey: '',
  downloadItems: [],
  downloadStatus: DownloadStatus.Idle,
  downloadMessage: '',
  isValidating: false,
  validationErrors: {},
};

export const useSetupStore = create<SetupState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < SETUP_STEP_COUNT - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  updateConfig: (config) => set(config),

  setValidationError: (field, error) =>
    set((state) => ({
      validationErrors: { ...state.validationErrors, [field]: error },
    })),

  clearValidationError: (field) =>
    set((state) => {
      const { [field]: _, ...rest } = state.validationErrors;
      return { validationErrors: rest };
    }),

  clearAllErrors: () => set({ validationErrors: {} }),

  setIsValidating: (isValidating) => set({ isValidating }),

  setDownloadProgress: (id, progress) =>
    set((state) => ({
      downloadItems: state.downloadItems.map((item) =>
        item.id === id ? { ...item, progress } : item
      ),
    })),

  setDownloadItemStatus: (id, status) =>
    set((state) => ({
      downloadItems: state.downloadItems.map((item) =>
        item.id === id ? { ...item, status } : item
      ),
    })),

  setDownloadStatus: (status) => set({ downloadStatus: status }),

  setDownloadMessage: (message) => set({ downloadMessage: message }),

  initializeDownloadItems: () => {
    const { whisperModel, llmProvider } = get();
    const items: DownloadProgress[] = [
      {
        id: 'whisper',
        label: `Whisper Model (${whisperModel})`,
        progress: 0,
        status: 'pending',
      },
    ];

    if (llmProvider === LlmProvider.LocalGGUF) {
      items.push({
        id: 'llm',
        label: 'LLM Model (GGUF)',
        progress: 0,
        status: 'pending',
      });
    }

    items.push({
      id: 'dependencies',
      label: 'Dependencies',
      progress: 0,
      status: 'pending',
    });

    set({ downloadItems: items });
  },

  reset: () => set(initialState),
}));
