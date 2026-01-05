import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { useSettings } from '../hooks/use-settings'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [isSetupComplete] = useSettings('setupComplete', false)
  const navigate = useNavigate()

  if (isSetupComplete) {
    navigate({ to: '/main' })
  } else {
    navigate({ to: '/setup' })
  }

  return null
}
