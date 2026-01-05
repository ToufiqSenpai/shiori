import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { open } from '@tauri-apps/plugin-dialog'
import { FileAudio, FileVideo, Sparkles, Upload } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { TextGenerationProvider } from '../enums/text-generation-provider'
import { store, useSettings } from '../hooks/use-settings'
import { command } from '../utils/tauri'

// --- Constants & Types ---

const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg', 'flac']
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mkv', 'avi', 'mov']
const ALL_EXTENSIONS = [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS]

interface SelectedFile {
  name: string
  path: string
  isVideo: boolean
}

interface TextGenerationModel {
  id: string
  name: string
  provider: TextGenerationProvider
}

interface LanguageInfo {
  code: string
  displayName: string
}

// --- Route Definition ---

export const Route = createFileRoute('/main/')({
  component: RouteComponent,
  loader: async () => {
    const [languages, setupComplete] = await Promise.all([command<LanguageInfo[]>("get_languages"), store.get<boolean>('setupComplete')])

    let models: TextGenerationModel[] = []
    if (setupComplete) {
      models = await command<TextGenerationModel[]>("get_text_generation_models")
    }

    return { languages, models }
  },
})

// --- Main Component ---

function RouteComponent() {
  const { languages, models } = Route.useLoaderData()
  const navigate = useNavigate()

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [language, setLanguage] = useState<string>('')
  const [_, setTextGenerationProvider] = useSettings('model.textGeneration.provider', 'gemini')
  const [model, setModel] = useSettings('model.textGeneration.model', models[0]?.id || '')

  const handleFileSelect = (file: SelectedFile | null) => {
    setSelectedFile(file)
  }

  const onTextGenerationModelChange = (modelId: string) => {
    setModel(modelId)
    const selectedModel = models.find(m => m.id === modelId)
    if (selectedModel) {
      setTextGenerationProvider(selectedModel.provider)
    }
  }

  const onStartButtonClick = () => {
    if (!selectedFile) return

    navigate({ to: '/main/progress' })

    setTimeout(async () => {
      await command("summarize", { filePath: selectedFile.path, language: language })
    }, 0)
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex-1 space-y-6 overflow-y-auto">
        <HeaderSection />

        <div className="space-y-2">
          <Label>Audio/Video File</Label>
          <FileDropZone selectedFile={selectedFile} onFileSelect={handleFileSelect} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Text Generation Model</Label>
          <Select value={model} onValueChange={onTextGenerationModelChange}>
            <SelectTrigger id="model">
              <SelectValue placeholder="Select AI model" />
            </SelectTrigger>
            <SelectContent>
              {models.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="sticky bottom-0 border-t bg-background pt-4">
        <Button
          className="w-full"
          size="lg"
          disabled={!selectedFile || !language || !model}
          onClick={onStartButtonClick}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Start Summarize
        </Button>
      </div>
    </div>
  )
}

// --- Sub-Components ---

function HeaderSection() {
  return (
    <div>
      <h2 className="text-lg font-semibold">Summarize Audio/Video</h2>
      <p className="text-sm text-muted-foreground">
        Upload an audio or video file to transcribe and generate a summary using AI.
      </p>
    </div>
  )
}

interface FileDropZoneProps {
  selectedFile: SelectedFile | null
  onFileSelect: (file: SelectedFile | null) => void
}

function FileDropZone({ selectedFile, onFileSelect }: FileDropZoneProps) {
  const handleOpenFile = async () => {
    const file = await open({
      multiple: false,
      filters: [{ name: 'Audio/Video', extensions: ALL_EXTENSIONS }],
    })

    if (file) {
      const fileName = file.split(/[/\\]/).pop() || file
      const ext = fileName.split('.').pop()?.toLowerCase() || ''
      const isVideo = VIDEO_EXTENSIONS.includes(ext)

      onFileSelect({
        name: fileName,
        path: file,
        isVideo,
      })
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    handleOpenFile()
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  if (selectedFile) {
    return (
      <div className="relative flex min-h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-input p-4 text-center">
        <div className="flex flex-col items-center gap-2">
          {selectedFile.isVideo ? (
            <FileVideo className="h-10 w-10 text-primary" />
          ) : (
            <FileAudio className="h-10 w-10 text-primary" />
          )}
          <div>
            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{selectedFile.path}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onFileSelect(null)
            }}
          >
            Remove
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={handleOpenFile}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input transition-colors hover:border-muted-foreground/50 hover:bg-muted/50"
    >
      <div className="flex flex-col items-center gap-2 p-4 text-center">
        <Upload className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Click to select audio or video file</p>
          <p className="text-sm text-muted-foreground">or drag and drop</p>
        </div>
        <p className="text-xs text-muted-foreground">Supports MP3, WAV, MP4, MKV, and more</p>
      </div>
    </div>
  )
}
