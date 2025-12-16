import { createFileRoute } from '@tanstack/react-router'
import { open } from '@tauri-apps/plugin-dialog'
import { useState } from 'react'
import { FileAudio, FileVideo, Upload, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getTextGenerationModels, TextGenerationModel } from '../api/model'
import { useSettingsStore } from '../stores/settings-store'
import { getLanguages } from '../api/summarize'

export const Route = createFileRoute('/main/')({
  component: RouteComponent,
})

const LANGUAGES = await getLanguages()

// Fetch text generation models only if setup is complete
let textGenerationModels: TextGenerationModel[] = []
if (useSettingsStore.getState().isSetupComplete) {
  textGenerationModels = await getTextGenerationModels()
}

interface SelectedFile {
  name: string
  path: string
  isVideo: boolean
}

function RouteComponent() {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [language, setLanguage] = useState('')
  const [model, setModel] = useState('')

  const handleOpenFile = async () => {
    const file = await open({
      multiple: false,
      filters: [
        {
          name: 'Audio/Video',
          extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'mp4', 'webm', 'mkv', 'avi', 'mov'],
        },
      ],
    })

    if (file) {
      const fileName = file.split(/[/\\]/).pop() || file
      const videoExtensions = ['mp4', 'webm', 'mkv', 'avi', 'mov']
      const ext = fileName.split('.').pop()?.toLowerCase() || ''
      const isVideo = videoExtensions.includes(ext)

      setSelectedFile({
        name: fileName,
        path: file,
        isVideo,
      })
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    // Note: Drag and drop from file system in Tauri requires different handling
    // For now, we'll just open the dialog on drop as a fallback
    handleOpenFile()
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto">
        <div>
          <h2 className="text-lg font-semibold">Summarize Audio/Video</h2>
          <p className="text-muted-foreground text-sm">
            Upload an audio or video file to transcribe and generate a summary using AI.
          </p>
        </div>

        {/* Audio/Video File Input */}
        <div className="space-y-2">
          <Label>Audio/Video File</Label>
          <div
            onClick={handleOpenFile}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-input hover:border-muted-foreground/50 hover:bg-muted/50 relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors"
          >
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                {selectedFile.isVideo ? (
                  <FileVideo className="text-primary h-10 w-10" />
                ) : (
                  <FileAudio className="text-primary h-10 w-10" />
                )}
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-muted-foreground text-xs">{selectedFile.path}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(null)
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <Upload className="text-muted-foreground h-10 w-10" />
                <div>
                  <p className="font-medium">Click to select audio or video file</p>
                  <p className="text-muted-foreground text-sm">or drag and drop</p>
                </div>
                <p className="text-muted-foreground text-xs">
                  Supports MP3, WAV, M4A, MP4, WebM, and other formats
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Language Select */}
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Text Generation Model Select */}
        <div className="space-y-2">
          <Label htmlFor="model">Text Generation Model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger id="model">
              <SelectValue placeholder="Select AI model" />
            </SelectTrigger>
            <SelectContent>
              {textGenerationModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summarize Button - Sticky Bottom */}
      <div className="bg-background sticky bottom-0 border-t pt-4">
        <Button className="w-full" size="lg" disabled={!selectedFile || !language || !model}>
          <Sparkles className="mr-2 h-4 w-4" />
          Start Summarize
        </Button>
      </div>
    </div>
  )
}
