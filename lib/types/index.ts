/**
 * Core Types for Safety Aware Application
 */

// Location Types
export type UserLocation = {
  latitude: number
  longitude: number
  timestamp: number
  accuracy: number
  heading?: number
  speed?: number
}

// Alert Types
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AlertStatus = 'active' | 'resolved' | 'archived'
export type AlertType =
  | 'emergency'
  | 'crime'
  | 'accident'
  | 'weather'
  | 'hazard'
  | 'other'

export type Alert = {
  id: string
  type: AlertType
  severity: AlertSeverity
  latitude: number
  longitude: number
  description: string
  timestamp: number
  status: AlertStatus
  reportedBy: string
  image?: string
  witnesses?: number
}

// Emergency Contact Types
export type EmergencyContact = {
  id: string
  name: string
  phone: string
  email?: string
  relationship?: string
  addedAt?: number
}

// Person of Concern Types
export type PersonOfConcern = {
  id: string
  name: string
  phone?: string
  description?: string
  photo?: string
  customRadius?: number
  lastSeenLocation?: {
    latitude: number
    longitude: number
    timestamp: number
  }
  addedAt: number
  relationshipToUser?: string
}

// Proximity Alert Types
export type ProximityAlert = {
  id: string
  personId: string
  personName: string
  personPhone?: string
  distance: number
  detectedAt: number
  userLocation: {
    latitude: number
    longitude: number
  }
  acknowledged: boolean
}

// SOS Location Drop Types
export type SOSLocationDrop = {
  id: string
  latitude: number
  longitude: number
  timestamp: number
  message: string
  sharedWith: string[]
  expiresAt: number
  acknowledgedBy?: string[]
}

// Safety Settings Types
export type SafetySettings = {
  comfortRadius: number
  enableProximityAlerts: boolean
  enablePushNotifications: boolean
  autoShareLocation: boolean
  threatCheckInterval?: number
  enableDataCollection?: boolean
}

// View Types
export type ViewType =
  | 'map'
  | 'alerts'
  | 'report'
  | 'contacts'
  | 'watchlist'
  | 'settings'
  | 'proximity'

// Toast Types
export type ToastVariant = 'default' | 'destructive' | 'success'

export type Toast = {
  title: string
  description?: string
  variant?: ToastVariant
}

// Map Marker Types
export type MapMarker = {
  id: string
  latitude: number
  longitude: number
  type: 'user' | 'alert' | 'contact'
  label?: string
  icon?: string
  color?: string
}

// Distance Calculation Options
export type DistanceUnit = 'km' | 'miles' | 'meters'

// API Response Types (for future backend integration)
export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

export type AlertSubmission = Omit<
  Alert,
  'id' | 'timestamp' | 'reportedBy'
>

export type ContactSubmission = Omit<EmergencyContact, 'id' | 'addedAt'>

export type PersonSubmission = Omit<
  PersonOfConcern,
  'id' | 'addedAt' | 'lastSeenLocation'
>
