export enum LlmProvider {
  LocalGGUF = 'local_gguf',
  Gemini = 'gemini',
}

export const LLM_PROVIDER_INFO: Record<
  LlmProvider,
  { label: string; description: string; requiresApiKey: boolean }
> = {
  [LlmProvider.LocalGGUF]: {
    label: 'Local (GGUF)',
    description: 'Run LLM locally using GGUF format models',
    requiresApiKey: false,
  },
  [LlmProvider.Gemini]: {
    label: 'Google Gemini',
    description: 'Use Google Gemini API for cloud-based inference',
    requiresApiKey: true,
  },
};
