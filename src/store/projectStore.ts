import { create as zustandCreate } from 'zustand'
import { initDatabase } from '@/db'
import { findAll, findById, create as createProject, update, remove } from '@/db/projectDao'
import type { Project } from '@/types'

interface ProjectStore {
  // State
  projects: Project[]
  isLoading: boolean
  error: string | null

  // Actions
  loadProjects: () => Promise<void>
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  getProjectById: (id: string) => Project | undefined
}

export const useProjectStore = zustandCreate<ProjectStore>((set, get) => ({
  // Initial state
  projects: [],
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      console.log('[Store] loadProjects: calling initDatabase...')
      await initDatabase()
      console.log('[Store] loadProjects: initDatabase done, calling findAll...')
      const projects = findAll()
      console.log('[Store] loadProjects: found', projects.length, 'projects')
      set({ projects, isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load projects', isLoading: false })
    }
  },

  addProject: async (projectData) => {
    set({ isLoading: true, error: null })
    try {
      await initDatabase()
      const newProject = createProject(projectData)
      set((state) => ({
        projects: [newProject, ...state.projects],
        isLoading: false,
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add project', isLoading: false })
    }
  },

  updateProject: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      await initDatabase()
      update(id, updates)
      const updatedProject = findById(id)
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updatedProject! : p)),
        isLoading: false,
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update project', isLoading: false })
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await initDatabase()
      remove(id)
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        isLoading: false,
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete project', isLoading: false })
    }
  },

  getProjectById: (id) => {
    return get().projects.find((p) => p.id === id)
  },
}))
