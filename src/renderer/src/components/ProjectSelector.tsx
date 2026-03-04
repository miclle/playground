import { useState, useEffect } from 'react'
import { X, Plus, Folder, Trash2, Clock } from 'lucide-react'
import { cn } from '../lib/utils'

interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

interface ProjectSelectorProps {
  onClose: () => void
  onSelectProject: (project: Project) => void
}

export function ProjectSelector({ onClose, onSelectProject }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const result = await window.api?.project.list()
      if (result) {
        setProjects(result as Project[])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    try {
      const project = await window.api?.project.create({
        name: newProjectName.trim(),
        description: ''
      })

      if (project) {
        setProjects([project as Project, ...projects])
        setShowNewProject(false)
        setNewProjectName('')
        onSelectProject(project as Project)
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('Failed to create project: ' + (error as Error).message)
    }
  }

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await window.api?.project.delete(projectId)
        setProjects(projects.filter((p) => p.id !== projectId))
      } catch (error) {
        console.error('Failed to delete project:', error)
      }
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[500px] max-h-[600px] bg-background border border-border rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">Projects</h2>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* New Project Form */}
        {showNewProject ? (
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                placeholder="Project name"
                className="flex-1 px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewProject(false)
                  setNewProjectName('')
                }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 border-b border-border">
            <button
              onClick={() => setShowNewProject(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm border border-dashed border-border rounded hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>
        )}

        {/* Project List */}
        <div className="flex-1 overflow-auto p-2">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <Folder className="h-12 w-12 mb-3 opacity-50" />
              <p>No projects yet</p>
              <p className="text-sm mt-1">Create a new project to get started</p>
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg text-left cursor-pointer',
                    'hover:bg-accent transition-colors group'
                  )}
                  onClick={() => onSelectProject(project)}
                >
                  <div className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{project.name}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(project.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteProject(e, project.id)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
