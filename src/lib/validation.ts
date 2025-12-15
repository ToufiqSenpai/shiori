import { LlmProvider } from '../enums'

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate Hugging Face token.
 * TODO: Replace with actual Tauri command call to validate token via API.
 */
export async function validateHfToken(token: string): Promise<ValidationResult> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500))

  if (!token.trim()) {
    return { valid: false, error: 'Hugging Face token is required' }
  }

  // Basic format check - HF tokens typically start with "hf_"
  if (!token.startsWith('hf_')) {
    return {
      valid: false,
      error: 'Invalid token format. Hugging Face tokens typically start with "hf_"',
    }
  }

  // TODO: Actual API validation via Tauri backend
  // For now, mock success if format is correct
  return { valid: true }
}

/**
 * Validate LLM API key based on provider.
 * TODO: Replace with actual Tauri command call to validate key via respective API.
 */
export async function validateLlmApiKey(provider: LlmProvider, apiKey: string): Promise<ValidationResult> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500))

  if (provider === LlmProvider.LocalGGUF) {
    // Local models don't require API key
    return { valid: true }
  }

  if (!apiKey.trim()) {
    return { valid: false, error: 'API key is required for cloud providers' }
  }

  if (provider === LlmProvider.Gemini) {
    // Gemini API keys are typically 39 characters
    if (apiKey.length < 30) {
      return {
        valid: false,
        error: 'Invalid Gemini API key format',
      }
    }
    // TODO: Actual API validation via Tauri backend
    return { valid: true }
  }

  return { valid: true }
}

/**
 * Validate directory path exists and is writable.
 * TODO: Replace with actual Tauri command call.
 */
export async function validateDirectory(path: string): Promise<ValidationResult> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300))

  if (!path.trim()) {
    return { valid: false, error: 'Please select a directory' }
  }

  // TODO: Actual validation via Tauri backend to check if path exists and is writable
  return { valid: true }
}
