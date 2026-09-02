/**
 * Global app state — demo mode removed entirely.
 * All data comes from the live backend API at VITE_API_BASE_URL.
 */
import { create } from 'zustand'

export type BackendConnectionStatus = 'ONLINE' | 'OFFLINE' | 'CHECKING'

interface AppState {
  backendStatus: BackendConnectionStatus
  lastUpdated: string | null
  isCommandBarOpen: boolean
  selectedVesselMmsi: string | null
  selectedIncidentId: string | null
  activeRoute: string
  setBackendStatus: (status: BackendConnectionStatus) => void
  setCommandBarOpen: (open: boolean) => void
  setSelectedVesselMmsi: (mmsi: string | null) => void
  setSelectedIncidentId: (id: string | null) => void
  setActiveRoute: (route: string) => void
  touchLastUpdated: () => void
}

export const useAppStore = create<AppState>((set) => ({
  backendStatus: 'CHECKING',
  lastUpdated: null,
  isCommandBarOpen: false,
  selectedVesselMmsi: null,
  selectedIncidentId: null,
  activeRoute: 'overview',
  setBackendStatus: (status) => set({ backendStatus: status }),
  setCommandBarOpen: (open) => set({ isCommandBarOpen: open }),
  setSelectedVesselMmsi: (mmsi) => set({ selectedVesselMmsi: mmsi }),
  setSelectedIncidentId: (id) => set({ selectedIncidentId: id }),
  setActiveRoute: (route) => set({ activeRoute: route }),
  touchLastUpdated: () => set({ lastUpdated: new Date().toLocaleTimeString() }),
}))
