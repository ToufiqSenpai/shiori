import { CheckCircle2, Folder, Key, Cpu, Brain, MessageSquare } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { useSetupStore } from '../../../stores/setupStore';
import {
  ACCELERATOR_LABELS,
  WHISPER_MODEL_INFO,
  LLM_PROVIDER_INFO,
} from '../../../enums';

export function ConfirmStep() {
  const dataDirectory = useSetupStore((state) => state.dataDirectory);
  const hfToken = useSetupStore((state) => state.hfToken);
  const accelerator = useSetupStore((state) => state.accelerator);
  const whisperModel = useSetupStore((state) => state.whisperModel);
  const llmProvider = useSetupStore((state) => state.llmProvider);
  const llmApiKey = useSetupStore((state) => state.llmApiKey);

  const whisperInfo = WHISPER_MODEL_INFO[whisperModel];
  const llmInfo = LLM_PROVIDER_INFO[llmProvider];

  const configItems = [
    {
      icon: Folder,
      label: 'Data Directory',
      value: dataDirectory || 'Not selected',
    },
    {
      icon: Key,
      label: 'Hugging Face Token',
      value: hfToken ? '••••••••' + hfToken.slice(-4) : 'Not provided',
    },
    {
      icon: Cpu,
      label: 'Hardware Acceleration',
      value: ACCELERATOR_LABELS[accelerator],
    },
    {
      icon: Brain,
      label: 'Whisper Model',
      value: `${whisperInfo.label} (${whisperInfo.size})`,
    },
    {
      icon: MessageSquare,
      label: 'LLM Provider',
      value: llmInfo.label,
    },
  ];

  if (llmInfo.requiresApiKey) {
    configItems.push({
      icon: Key,
      label: `${llmInfo.label} API Key`,
      value: llmApiKey ? '••••••••' + llmApiKey.slice(-4) : 'Not provided',
    });
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Confirm Configuration
        </CardTitle>
        <CardDescription>
          Review your settings before proceeding. The app will download the
          required models and set up dependencies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {configItems.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <item.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Next steps:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Download Whisper model ({whisperInfo.size})</li>
            <li>Set up Python environment</li>
            <li>Install dependencies</li>
            <li>Configure application</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
