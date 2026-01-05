import { createFileRoute, Outlet, useNavigate, useParams } from '@tanstack/react-router'
import { FileAudio, MoreHorizontal, MoreVertical, Pencil, Plus, Printer, Settings, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { Button } from '../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '../components/ui/sidebar'
import { cn } from '../lib/utils'
import { useSummaryStore } from '../stores/summary-store'

export const Route = createFileRoute('/main')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { summaries, deleteSummary } = useSummaryStore()
  const { summaryId } = useParams({ strict: false })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [summaryToDelete, setSummaryToDelete] = useState<{ id: string; title: string } | null>(null)

  const formatDate = (date: Date) => {
    const now = new Date()
    const summaryDate = new Date(date)
    const diffTime = Math.abs(now.getTime() - summaryDate.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`

    return summaryDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: summaryDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const handleDeleteClick = (id: string, title: string) => {
    setSummaryToDelete({ id, title })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (summaryToDelete) {
      await deleteSummary(summaryToDelete.id)

      // If we deleted the currently viewed summary, navigate to main
      if (summaryId === summaryToDelete.id) {
        navigate({ to: '/main' })
      }

      setDeleteDialogOpen(false)
      setSummaryToDelete(null)
    }
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent className="gap-0">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              Shiori
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Audio Summarizer</p>
          </div>

          <SidebarGroup className="px-2 py-4">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="font-medium">
                    <a
                      href="#"
                      onClick={(e: React.MouseEvent<HTMLElement>) => {
                        e.preventDefault()
                        navigate({ to: '/main' })
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      <span>New Project</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="flex-1 px-2">
            <SidebarGroupLabel>Recent Summaries</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {summaries.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No summaries yet. Create your first project to get started.
                  </div>
                ) : (
                  summaries.map(summary => {
                    const isActive = summaryId === summary.id
                    return (
                      <SidebarMenuItem key={summary.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={cn('flex-col items-start h-auto py-2', isActive && 'bg-accent')}
                          onClick={(e: React.MouseEvent<HTMLElement>) => {
                            e.preventDefault()
                            navigate({ to: `/main/${summary.id}` })
                          }}
                        >
                          <a href="#" className="w-full">
                            <span className="font-medium line-clamp-1">{summary.title}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(summary.createdAt)}</span>
                          </a>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction showOnHover>
                              <MoreHorizontal className="h-4 w-4" />
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuItem className="cursor-pointer gap-2">
                              <Pencil className="h-4 w-4" />
                              <span>Edit Project</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
                              onClick={e => {
                                e.stopPropagation()
                                handleDeleteClick(summary.id, summary.title)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                              <span>Delete Project</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    )
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-auto border-t px-2 py-4">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="#" onClick={(e: React.MouseEvent<HTMLElement>) => e.preventDefault()}>
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{summaryToDelete?.title}"? This action cannot be undone and will
              permanently delete the project and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}

const Header = () => {
  const { summaryId } = useParams({ strict: false })

  const handlePrint = async () => {
    window.print()
  }

  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b px-4 sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger />
      <h1 className="text-sm font-medium">Shiori</h1>
      {summaryId && (
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 focus-visible:ring-0">
                <MoreVertical size={18} className="text-gray-500" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handlePrint()} className="cursor-pointer gap-2">
                <Printer size={16} />
                <span>Print</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  )
}
