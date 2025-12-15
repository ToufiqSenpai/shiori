import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlertCircle, Brain, CheckCircle2, ChevronLeft, Loader2, MessageSquare } from 'lucide-react'
import { getVersion } from '@tauri-apps/api/app'
import { Button } from '../components/ui/button'
import { useSetupStore } from '../stores/setup-store'
import { SetupStep } from '@/enums/setup-step'
import { TextGenerationProvider } from '@/enums/text-generation-provider'
import { cn } from '../lib/utils'
import { Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useEffect, useState } from 'react'
import {
  downloadSpeechToTextModel,
  getSpeechToTextModels,
  setTextGenerationApiKey,
  SpeechToTextModelResult,
} from '../api/model'
import { SpeechToTextModel, useSettingsStore } from '../stores/settings-store'
import prettyBytes from 'pretty-bytes'
import { Input } from '../components/ui/input'
import { useDownloadStore } from '../stores/download-store'
import { DownloadStatus } from '../enums/download-status'
import { Progress } from '../components/ui/progress'

export const Route = createFileRoute('/setup')({
  component: RouteComponent,
})

function RouteComponent() {
  const [speechToTextModels, setSpeechToTextModels] = useState<SpeechToTextModelResult[]>([])
  const { currentStep, llmProvider, nextStep, previousStep, llmApiKey, setState } = useSetupStore()

  useEffect(() => {
    ;(async () => {
      if (speechToTextModels.length === 0) {
        setSpeechToTextModels(await getSpeechToTextModels())
      }
    })()
  }, [])

  // Render current step component
  const renderStep = () => {
    switch (currentStep) {
      case SetupStep.WELCOME:
        return <WelcomeStep />
      case SetupStep.MODEL:
        return <ModelStep speechToTextModels={speechToTextModels} />
      case SetupStep.DOWNLOAD:
        return <DownloadStep />
      default:
        return <WelcomeStep />
    }
  }

  // Handle next button click
  const handleNext = async () => {
    if (currentStep == SetupStep.MODEL) {
      const isApiKeyValid = await setTextGenerationApiKey(llmProvider, llmApiKey)

      if (isApiKeyValid) {
        setState({ llmApiKeyError: false })

        downloadSpeechToTextModel(useSettingsStore.getState().model.speechToText)

        nextStep()
      } else {
        setState({ llmApiKeyError: true })
      }
    }
  }

  const handlePrevious = () => {
    previousStep()
  }

  // Check if we should show navigation buttons
  const showNavigation = currentStep !== SetupStep.WELCOME && currentStep !== SetupStep.DOWNLOAD
  const showBackButton = currentStep > SetupStep.WELCOME && currentStep < SetupStep.DOWNLOAD
  const showNextButton = currentStep > SetupStep.WELCOME && currentStep < SetupStep.DOWNLOAD

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Dot stepper */}
      <div className="mb-8 flex items-center gap-2">
        {Array.from({ length: Object.keys(SetupStep).length / 2 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              index === currentStep ? 'bg-primary' : index < currentStep ? 'bg-primary/50' : 'bg-muted',
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="w-full max-w-lg">{renderStep()}</div>

      {/* Navigation buttons */}
      {showNavigation && (
        <div className="mt-6 flex w-full max-w-lg gap-4">
          {showBackButton && (
            <Button variant="outline" onClick={handlePrevious} className="flex-1">
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

const APP_VERSION = await getVersion()

export function WelcomeStep() {
  const nextStep = useSetupStore(state => state.nextStep)

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">AI Note Meet Summarizer</CardTitle>
        <CardDescription>Version {APP_VERSION}</CardDescription>
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

interface ModelStepProps {
  speechToTextModels: SpeechToTextModelResult[]
}

export function ModelStep({ speechToTextModels }: ModelStepProps) {
  const { llmApiKeyError, llmProvider, llmApiKey, setState } = useSetupStore()
  const {
    model: { speechToText: selectedSttModel },
    setSpeechToTextModel,
  } = useSettingsStore()

  const speechToTextLabel = {
    [SpeechToTextModel.TINY]: 'Tiny',
    [SpeechToTextModel.BASE]: 'Base',
    [SpeechToTextModel.SMALL]: 'Small',
    [SpeechToTextModel.MEDIUM]: 'Medium',
    [SpeechToTextModel.LARGE_TURBO]: 'Large Turbo',
    [SpeechToTextModel.LARGE]: 'Large',
  }

  const llmProviderLabel = {
    [TextGenerationProvider.OPENAI]: 'OpenAI',
    [TextGenerationProvider.GEMINI]: 'Google Gemini',
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>AI Model Configuration</CardTitle>
        <CardDescription>Configure AI model options.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Whisper Model */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Speech-to-Text Model
          </Label>
          <Select value={selectedSttModel} onValueChange={value => setSpeechToTextModel(value as SpeechToTextModel)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Whisper model size" />
            </SelectTrigger>
            <SelectContent>
              {speechToTextModels.map(model => (
                <SelectItem key={model.model} value={model.model}>
                  {speechToTextLabel[model.model]} ({prettyBytes(model.size)})
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
            onValueChange={value =>
              setState({
                llmProvider: value as TextGenerationProvider,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select LLM provider" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TextGenerationProvider).map(provider => {
                return (
                  <SelectItem key={provider} value={provider}>
                    {llmProviderLabel[provider]}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* LLM API Key */}
        <div className="space-y-2">
          <Label htmlFor="llmApiKey">{llmProviderLabel[llmProvider]} API Key</Label>
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
        {llmApiKeyError && <p className="text-xs text-red-500">Invalid API key</p>}
      </CardContent>
    </Card>
  )
}

export function DownloadStep() {
  const { downloads } = useDownloadStore()
  const { isSetupComplete, setIsSetupComplete } = useSettingsStore()

  const navigate = useNavigate()

  useEffect(() => {
    const allComplete = downloads.every(download => download.status === DownloadStatus.COMPLETE)

    if (allComplete) setIsSetupComplete(true)
  }, [downloads])

  const handleGoToMain = () => {
    navigate({ to: '/main' })
  }

  const getStatusIcon = (status: string) => {
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

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Setting Up</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Download items progress */}
        <div className="space-y-4">
          {downloads.map(download => {
            const progress = download.size > 0 ? (download.progressBytes / download.size) * 100 : 0

            return (
              <div key={`${download.id}-${download.progressBytes}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(download.status)}
                    <span className={cn('text-sm', download.status === 'complete' && 'text-muted-foreground')}>
                      {download.name}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">{progress.toFixed(2)}%</span>
                </div>

                {/* Size and speed info */}
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
          })}
        </div>

        {/* Completion button */}
        {isSetupComplete && (
          <Button className="w-full" onClick={handleGoToMain}>
            Go to Main Page
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s'
  return `${prettyBytes(bytesPerSecond)}/s`
}
