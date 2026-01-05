import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { ErrorAlert } from '../components/ErrorAlert'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <ErrorAlert />
      <Outlet />
      <TanStackRouterDevtools />
    </>
  )
}
