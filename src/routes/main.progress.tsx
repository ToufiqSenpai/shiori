import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'

import { Progress } from '../components/ui/progress'
import { Summary, useSummaryStore } from '../stores/summary-store'

interface SummarizationProgress {
  currentStep: number
  totalSteps: number
  message: string
  summary?: Summary
}

export const Route = createFileRoute('/main/progress')({
  component: RouteComponent,
})

function RouteComponent() {
  const addSummaries = useSummaryStore(state => state.addSummaries)
  const [progress, setProgress] = useState<SummarizationProgress>({
    currentStep: 0,
    totalSteps: 1,
    message: 'Starting...',
  })
  const navigate = useNavigate()

  useEffect(() => {
    const event = listen<SummarizationProgress>("summarization_progress", event => {
      const progress = event.payload
      setProgress(progress)

      setTimeout(() => {
        if (progress.summary) {
          addSummaries(progress.summary)
          navigate({ to: `/main/${progress.summary.id}` })
        }
      }, 100)
    })

    return () => {
      event.then(unlisten => unlisten())
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4.5rem)]">
      <div className="w-full max-w-md space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium">{progress.message}</span>
          <span className="text-muted-foreground">
            {Math.round((progress.currentStep / progress.totalSteps) * 100)}%
          </span>
        </div>
        <Progress value={(progress.currentStep / progress.totalSteps) * 100} className="w-full h-2" />
      </div>
    </div>
  )
}
