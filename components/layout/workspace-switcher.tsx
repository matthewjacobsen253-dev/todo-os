'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/lib/store/workspace'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WorkspaceCreateDialog } from './workspace-create-dialog'

interface Workspace {
  id: string
  name: string
  slug: string
}

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore()

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const loadWorkspaces = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, slug')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading workspaces:', error)
        return
      }

      setWorkspaces(data || [])

      // Set first workspace as current if none selected
      if (!currentWorkspace && data && data.length > 0) {
        setCurrentWorkspace(data[0])
      }
    } catch (err) {
      console.error('Error loading workspaces:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwitchWorkspace = (workspace: Workspace) => {
    setCurrentWorkspace(workspace)
    // Trigger data refresh
    window.dispatchEvent(new CustomEvent('workspace-changed', { detail: workspace }))
  }

  const handleWorkspaceCreated = (workspace: Workspace) => {
    setWorkspaces([...workspaces, workspace])
    setCurrentWorkspace(workspace)
    setIsCreateOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700 transition text-left group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {isLoading ? 'Loading...' : currentWorkspace?.name || 'Select workspace'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {currentWorkspace?.slug || ''}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition flex-shrink-0" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Your Workspaces
          </DropdownMenuLabel>

          {workspaces.length === 0 ? (
            <div className="px-2 py-4 text-center">
              <p className="text-sm text-slate-400">No workspaces yet</p>
            </div>
          ) : (
            <>
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => handleSwitchWorkspace(workspace)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{workspace.name}</p>
                  </div>
                  {currentWorkspace?.id === workspace.id && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 cursor-pointer text-blue-400 hover:text-blue-300"
          >
            <Plus className="w-4 h-4" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WorkspaceCreateDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={handleWorkspaceCreated} />
    </>
  )
}
