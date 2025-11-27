import { Cpu, Brain, MessageSquare } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { useSetupStore } from '../../../stores/setupStore';
import {
  Accelerator,
  ACCELERATOR_LABELS,
  WhisperModel,
  WHISPER_MODEL_INFO,
  LlmProvider,
  LLM_PROVIDER_INFO,
} from '../../../enums';

export function HardwareModelStep() {
  const accelerator = useSetupStore((state) => state.accelerator);
  const whisperModel = useSetupStore((state) => state.whisperModel);
  const llmProvider = useSetupStore((state) => state.llmProvider);
  const llmApiKey = useSetupStore((state) => state.llmApiKey);
  const updateConfig = useSetupStore((state) => state.updateConfig);
  const validationErrors = useSetupStore((state) => state.validationErrors);

  const selectedWhisperInfo = WHISPER_MODEL_INFO[whisperModel];
  const selectedLlmInfo = LLM_PROVIDER_INFO[llmProvider];

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Hardware & Models</CardTitle>
        <CardDescription>
          Configure hardware acceleration and select the AI models to use.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hardware Acceleration */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Hardware Acceleration
          </Label>
          <Select
            value={accelerator}
            onValueChange={(value) =>
              updateConfig({ accelerator: value as Accelerator })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select hardware acceleration" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(Accelerator).map((acc) => (
                <SelectItem key={acc} value={acc}>
                  {ACCELERATOR_LABELS[acc]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Available options depend on your system. CUDA requires NVIDIA GPU,
            ROCm requires AMD GPU.
          </p>
        </div>

        {/* Whisper Model */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Speech-to-Text Model (Whisper)
          </Label>
          <Select
            value={whisperModel}
            onValueChange={(value) =>
              updateConfig({ whisperModel: value as WhisperModel })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Whisper model size" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(WhisperModel).map((model) => {
                const info = WHISPER_MODEL_INFO[model];
                return (
                  <SelectItem key={model} value={model}>
                    {info.label} ({info.size})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Larger models are more accurate but require more disk space and
            memory. Selected: {selectedWhisperInfo.size}
          </p>
        </div>

        {/* LLM Provider */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            LLM for Summarization
          </Label>
          <Select
            value={llmProvider}
            onValueChange={(value) =>
              updateConfig({ llmProvider: value as LlmProvider, llmApiKey: '' })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select LLM provider" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(LlmProvider).map((provider) => {
                const info = LLM_PROVIDER_INFO[provider];
                return (
                  <SelectItem key={provider} value={provider}>
                    {info.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {selectedLlmInfo.description}
          </p>
        </div>

        {/* LLM API Key (conditional) */}
        {selectedLlmInfo.requiresApiKey && (
          <div className="space-y-2">
            <Label htmlFor="llmApiKey">
              {selectedLlmInfo.label} API Key
            </Label>
            <Input
              id="llmApiKey"
              type="password"
              value={llmApiKey}
              onChange={(e) => updateConfig({ llmApiKey: e.target.value })}
              placeholder="Enter your API key"
            />
            {validationErrors.llmApiKey && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>{validationErrors.llmApiKey}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              {llmProvider === LlmProvider.Gemini && (
                <>
                  Get your API key from{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google AI Studio
                  </a>
                </>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
