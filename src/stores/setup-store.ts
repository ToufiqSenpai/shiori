import { create } from 'zustand';
import { SetupStep } from '@/enums/setup-step';
import { TextGenerationProvider } from '@/enums/text-generation-provider';

export interface SetupState {
  currentStep: SetupStep;
  llmProvider: TextGenerationProvider;
  llmApiKey: string;
  llmApiKeyError: boolean;

  // Actions
  setStep: (step: SetupStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  setState: (state: Partial<SetupState> | ((state: SetupState) => Partial<SetupState>)) => void;
}

export const useSetupStore = create<SetupState>((set, get) => ({
  currentStep: SetupStep.WELCOME,
  llmProvider: TextGenerationProvider.OPENAI,
  llmApiKey: '',
  llmApiKeyError: false,
  setStep: (step: SetupStep) => set({ currentStep: step }),
  nextStep: () => set({ currentStep: get().currentStep + 1 }),
  previousStep: () => set({ currentStep: get().currentStep - 1 }),
  setState: (state: Partial<SetupState> | ((state: SetupState) => Partial<SetupState>)) => set(state),
}));
