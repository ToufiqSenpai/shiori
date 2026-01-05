import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getVersion } from '@tauri-apps/api/app'
import { openUrl } from "@tauri-apps/plugin-opener"
import { AlertCircle, Brain, CheckCircle2, ChevronLeft, Loader2, MessageSquare, Sparkles } from 'lucide-react'
import prettyBytes from 'pretty-bytes'
import { useEffect } from 'react'

import { SetupStep } from '@/enums/setup-step'
import { SpeechToTextModel } from '@/enums/speech-to-text-model'
import { TextGenerationProvider } from '@/enums/text-generation-provider'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Progress } from '../components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { DownloadStatus } from '../enums/download-status'
import { useSettings } from '../hooks/use-settings'
import { cn } from '../lib/utils'
import { FileDownload } from '../stores/download-store'
import { useDownloadStore } from '../stores/download-store'
import { useSetupStore } from '../stores/setup-store'
import { command } from '../utils/tauri'

// --- Constants & Types ---

const SPEECH_TO_TEXT_LABELS: Record<SpeechToTextModel, string> = {
  [SpeechToTextModel.TINY]: 'Tiny',
  [SpeechToTextModel.BASE]: 'Base',
  [SpeechToTextModel.SMALL]: 'Small',
  [SpeechToTextModel.MEDIUM]: 'Medium',
  [SpeechToTextModel.LARGE_TURBO]: 'Large Turbo',
  [SpeechToTextModel.LARGE]: 'Large',
}

const LLM_PROVIDER_LABELS: Record<TextGenerationProvider, string> = {
  [TextGenerationProvider.OPENAI]: 'OpenAI',
  [TextGenerationProvider.GEMINI]: 'Google Gemini',
}

type SpeechToTextModels = {
  model: SpeechToTextModel
  size: number
}[]

// --- Route Definition ---

export const Route = createFileRoute('/setup')({
  component: RouteComponent,
  loader: async () => {
    const [models, version] = await Promise.all([
      command<SpeechToTextModels>('get_speech_to_text_models'),
      getVersion(),
    ])
    return { models, version }
  },
})

// --- Main Component ---

function RouteComponent() {
  const { currentStep, llmProvider, llmApiKey, setState, nextStep, previousStep } = useSetupStore()
  const [speechToText] = useSettings<SpeechToTextModel>('model.speechToText', SpeechToTextModel.BASE)

  const handleNext = async () => {
    if (currentStep === SetupStep.MODEL) {
      const isApiKeyValid = await command<boolean>('set_text_generation_api_key', {
        provider: llmProvider,
        apiKey: llmApiKey,
      })

      if (isApiKeyValid) {
        setState({ llmApiKeyError: false })
        await command('download_speech_to_text_model', { model: speechToText })
        nextStep()
      } else {
        setState({ llmApiKeyError: true })
      }
    } else {
      nextStep()
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case SetupStep.WELCOME:
        return <WelcomeStep />
      case SetupStep.MODEL:
        return <ModelStep />
      case SetupStep.DOWNLOAD:
        return <DownloadStep />
      default:
        return <WelcomeStep />
    }
  }

  const showNavigation = currentStep !== SetupStep.WELCOME && currentStep !== SetupStep.DOWNLOAD
  const showBackButton = currentStep > SetupStep.WELCOME && currentStep < SetupStep.DOWNLOAD
  const showNextButton = currentStep > SetupStep.WELCOME && currentStep < SetupStep.DOWNLOAD

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <StepIndicator currentStep={currentStep} totalSteps={Object.keys(SetupStep).length / 2} />

      <div className="w-full max-w-lg">{renderStep()}</div>

      {showNavigation && (
        <div className="mt-6 flex w-full max-w-lg gap-4">
          {showBackButton && (
            <Button variant="outline" onClick={previousStep} className="flex-1">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          {showNextButton && (
            <Button onClick={handleNext} className="flex-1">
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// --- Sub-Components ---

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="mb-8 flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'h-2 w-2 rounded-full transition-colors',
            index === currentStep ? 'bg-primary' : index < currentStep ? 'bg-primary/50' : 'bg-muted',
          )}
        />
      ))}
    </div>
  )
}

function WelcomeStep() {
  const nextStep = useSetupStore(state => state.nextStep)
  const { version } = Route.useLoaderData()

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Shiori</CardTitle>
        <CardDescription>Version {version}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-muted-foreground">
          Welcome! This application helps you automatically transcribe and summarize your meetings using AI. It uses
          local speech-to-text models for transcription and can connect to cloud LLMs for intelligent summarization.
        </p>
        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          <p>✓ Transcribe meetings with Whisper AI</p>
          <p>✓ Generate smart summaries with LLM</p>
          <p>✓ Works offline with local models</p>
          <p>✓ Privacy-focused - your data stays local</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={nextStep}>
          Get Started
        </Button>
      </CardFooter>
    </Card>
  )
}

function ModelStep() {
  const { llmApiKeyError, llmProvider, llmApiKey, setState } = useSetupStore()
  const [speechToText, setSpeechToText] = useSettings<SpeechToTextModel>('model.speechToText', SpeechToTextModel.BASE)
  const { models } = Route.useLoaderData()

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>AI Model Configuration</CardTitle>
        <CardDescription>Configure AI model options.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Speech-to-Text Model
          </Label>
          <Select value={speechToText} onValueChange={value => setSpeechToText(value as SpeechToTextModel)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Whisper model size" />
            </SelectTrigger>
            <SelectContent>
              {models.map(model => (
                <SelectItem key={model.model} value={model.model}>
                  {SPEECH_TO_TEXT_LABELS[model.model as SpeechToTextModel]} ({prettyBytes(model.size)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Larger models are more accurate but require more disk space and memory.
          </p>
        </div>

        {/* LLM Provider */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            LLM
          </Label>
          <Select
            value={llmProvider}
            onValueChange={value => setState({ llmProvider: value as TextGenerationProvider })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select LLM provider" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TextGenerationProvider)
                .filter(provider => provider !== TextGenerationProvider.OPENAI)
                .map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {LLM_PROVIDER_LABELS[provider]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* LLM API Key */}
        <div className="space-y-2">
          <Label htmlFor="llmApiKey">{LLM_PROVIDER_LABELS[llmProvider]} API Key</Label>
          <Input
            id="llmApiKey"
            type="password"
            value={llmApiKey}
            onChange={e => setState({ llmApiKey: e.target.value, llmApiKeyError: false })}
            placeholder="Enter your API key"
          />
          <p className="text-xs text-muted-foreground">
            {llmProvider === TextGenerationProvider.OPENAI && (
              <>
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/account/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  OpenAI Dashboard
                </a>
              </>
            )}
            {llmProvider === TextGenerationProvider.GEMINI && (
              <>
                Get your API key from{' '}
                <span
                  className="text-primary hover:underline cursor-pointer font-medium"
                  onClick={() => openUrl("https://aistudio.google.com/app/apikey")}
                >
                  Google AI Studio
                </span>
              </>
            )}
          </p>
        </div>
        {llmApiKeyError && <p className="text-xs text-red-500">Invalid API key</p>}
      </CardContent>
    </Card>
  )
}

function DownloadStep() {
  const { downloads } = useDownloadStore()
  const [isSetupComplete, setIsSetupComplete] = useSettings<boolean>('setupComplete', false)
  const navigate = useNavigate()

  useEffect(() => {
    const allComplete = downloads.length > 0 && downloads.every(download => download.status === DownloadStatus.COMPLETE)

    if (allComplete) setIsSetupComplete(true)
  }, [downloads, setIsSetupComplete])

  const handleGoToMain = () => {
    navigate({ to: '/main' })
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Setting Up</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {downloads.map(download => (
            <DownloadItem key={download.id} download={download} />
          ))}
        </div>

        {isSetupComplete && (
          <Button className="w-full" onClick={handleGoToMain}>
            Go to Main Page
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function DownloadItem({ download }: { download: FileDownload }) {
  const progress = download.size > 0 ? (download.progressBytes / download.size) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon status={download.status} />
          <span className={cn('text-sm', download.status === DownloadStatus.COMPLETE && 'text-muted-foreground')}>
            {download.name}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">{progress.toFixed(2)}%</span>
      </div>

      {download.size > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {prettyBytes(download.progressBytes)} / {prettyBytes(download.size)}
          </span>
          {download.status === DownloadStatus.DOWNLOADING && download.speedBytes > 0 && (
            <span>{formatSpeed(download.speedBytes)}</span>
          )}
        </div>
      )}

      <Progress value={progress} className="h-2" />
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case DownloadStatus.COMPLETE:
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case DownloadStatus.DOWNLOADING:
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />
    case DownloadStatus.ERROR:
      return <AlertCircle className="h-4 w-4 text-destructive" />
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-muted" />
  }
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s'
  return `${prettyBytes(bytesPerSecond)}/s`
}
