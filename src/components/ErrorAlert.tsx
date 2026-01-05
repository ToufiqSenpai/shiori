import { AlertCircleIcon } from 'lucide-react'

import { useAppStore } from '../stores/app-store'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

export function ErrorAlert() {
  const error = useAppStore(state => state.error)

  if (!error) {
    return null
  }

  return (
    <div className="fixed top-4 left-1/2 w-full max-w-md -translate-x-1/2 px-4 z-50">
      <Alert variant="destructive" className="shadow-lg bg-background">
        <AlertCircleIcon />
        <AlertTitle>{error.getCode()}</AlertTitle>
        <AlertDescription>
          <p>{error.getDetails()?.toString()}</p>
        </AlertDescription>
      </Alert>
    </div>
  )
}
