import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSettingsStore } from '../stores/settings-store'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { isSetupComplete } = useSettingsStore()
  const navigate = useNavigate()

  if (isSetupComplete) {
    navigate({ to: '/main' })
  } else {
    navigate({ to: '/setup' })
  }

  return null
}
