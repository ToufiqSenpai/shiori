import { useState, useEffect, useCallback } from 'react'
import { useDebounceValue } from 'usehooks-ts'
import axios from 'axios'
import { Search, Loader2, ExternalLink, Package } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import prettyBytes from 'pretty-bytes'
import { useSetupStore } from '@/stores/setup-store'

export interface HuggingFaceModel {
  id: string
  author: string
  modelId: string
  downloads: number
  likes: number
  tags: string[]
}

interface LocalModelSearchProps {
  value: string
  onChange: (modelId: string) => void
}

export function LocalModelSearch({ value, onChange }: LocalModelSearchProps) {
  const { setState } = useSetupStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery] = useDebounceValue(searchQuery, 500)
  const [models, setModels] = useState<HuggingFaceModel[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)

  // Search HuggingFace API for GGUF models
  const searchModels = useCallback(async (query: string) => {
    if (!query.trim()) {
      setModels([])
      return
    }

    if (modelStepError) {
      setState({ modelStepError: '' })
    }

    setIsLoading(true)
    setError(null)

    try {
      // Search for GGUF models on HuggingFace
      // const response = await axios.get('https://huggingface.co/api/models', {
      //   params: {
      //     search: query,
      //     filter: 'gguf',
      //     sort: 'downloads',
      //     direction: -1,
      //     limit: 10,
      //   },
      // });
      // const formattedModels: HuggingFaceModel[] = response.data.map((model: ) => ({
      //   id: model.id || model.modelId,
      //   author: model.author || model.id?.split('/')[0] || 'Unknown',
      //   modelId: model.modelId || model.id,
      //   downloads: model.downloads || 0,
      //   likes: model.likes || 0,
      //   tags: model.tags || [],
      // }));
      // setModels(formattedModels);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message || 'Search failed')
      } else {
        setError(err instanceof Error ? err.message : 'Search failed')
      }
      setModels([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      searchModels(debouncedQuery)
    } else {
      setModels([])
    }
  }, [debouncedQuery, searchModels])

  // Handle model selection
  const handleSelectModel = (model: HuggingFaceModel) => {
    onChange(model.id)
    setSearchQuery('')
    setShowResults(false)
  }

  // Handle clearing selection
  const handleClear = () => {
    onChange('')
    setSearchQuery('')
  }

  return (
    <div className="space-y-2">
      {/* Selected model display */}
      {value && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">{value}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://huggingface.co/${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              Change
            </Button>
          </div>
        </div>
      )}

      {/* Search input */}
      {!value && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search GGUF models on Hugging Face..."
              className="pl-10"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search results dropdown */}
          {showResults && (searchQuery || models.length > 0) && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
              {error && <div className="p-3 text-sm text-destructive">{error}</div>}

              {!error && models.length === 0 && searchQuery && !isLoading && (
                <div className="p-3 text-sm text-muted-foreground">No GGUF models found for "{searchQuery}"</div>
              )}

              {!error && models.length > 0 && (
                <ul className="max-h-64 overflow-auto py-1">
                  {models.map(model => (
                    <li key={model.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
                        onClick={() => handleSelectModel(model)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{model.id}</span>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            ⬇ {prettyBytes(model.downloads)}
                          </span>
                        </div>
                        {model.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {model.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!error && searchQuery && (
                <div className="border-t px-3 py-2">
                  <a
                    href={`https://huggingface.co/models?search=${encodeURIComponent(searchQuery)}&other=gguf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Browse all results on Hugging Face
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showResults && <div className="fixed inset-0 z-0" onClick={() => setShowResults(false)} />}
    </div>
  )
}
