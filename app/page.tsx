"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { MapPin, AlertTriangle, Phone, Users, Shield, Bell, UserPlus, UserX, Settings, LogOut } from "lucide-react"
import { Map } from "@/components/Map"
import { EmergencyButton } from "@/components/EmergencyButton"
import { ReportIncident } from "@/components/ReportIncident"
import { AlertFeed } from "@/components/AlertFeed"
import { SafetyScore } from "@/components/SafetyScore"
import { EmergencyContacts } from "@/components/EmergencyContacts"
import { SOSLocationShare } from "@/components/SOSLocationShare"
import { PersonsOfConcern } from "@/components/PersonsOfConcern"
import { SafetySettings } from "@/components/SafetySettings"
import { ProximityAlerts } from "@/components/ProximityAlerts"
import { LocationPermissionBanner } from "@/components/LocationPermissionBanner"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useToast } from "@/hooks/use-toast"
import { useLocationTracking } from "@/hooks/use-location-tracking"
import { useProximityDetection } from "@/hooks/use-proximity-detection"
import { useMobileOptimization } from "@/hooks/use-mobile-optimization"
import { useThreatDetection } from "@/hooks/use-threat-detection"
import type { 
  Alert, 
  UserLocation, 
  EmergencyContact, 
  SOSLocationDrop, 
  PersonOfConcern, 
  SafetySettings as SafetySettingsType, 
  ProximityAlert,
  ViewType
} from "@/types"

export default function SafetyAwarePage() {
  // Core state management
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [alerts, setAlerts] = useLocalStorage<Alert[]>("safety-alerts", [])
  const [activeView, setActiveView] = useState<ViewType>("map")
  const [emergencyContacts, setEmergencyContacts] = useLocalStorage<EmergencyContact[]>("emergency-contacts", [])
  const [personsOfConcern, setPersonsOfConcern] = useLocalStorage<PersonOfConcern[]>("persons-of-concern", [])
  const [proximityAlerts, setProximityAlerts] = useLocalStorage<ProximityAlert[]>("proximity-alerts", [])
  const [safetySettings, setSafetySettings] = useLocalStorage<SafetySettingsType>("safety-settings", {
    comfortRadius: 5,
    enableProximityAlerts: true,
    enablePushNotifications: true,
    autoShareLocation: false,
    threatCheckInterval: 5000,
    enableDataCollection: true
  })
  
  // Modal and UI state
  const [activeSOSLocation, setActiveSOSLocation] = useState<SOSLocationDrop | null>(null)
  const [showSOSShare, setShowSOSShare] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  
  // Hooks
  const { toast } = useToast()
  const { vibrate } = useMobileOptimization()
  
  // Location tracking
  const { location, error: locationTrackingError, isWatching } = useLocationTracking({
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 10000,
    onLocationUpdate: setUserLocation,
    onError: (err) => {
      setLocationError(err)
      toast({
        title: "Location Access Required",
        description: err,
        variant: "destructive"
      })
    }
  })

  // Proximity detection
  useProximityDetection({
    userLocation: location || userLocation,
    personsOfConcern,
    proximityAlerts,
    safetySettings,
    emergencyContacts,
    onProximityDetected: (newAlert) => {
      setProximityAlerts(prev => [newAlert, ...prev])
      vibrate([300, 100, 300, 100, 300])
      toast({
        title: "🚨 PROXIMITY ALERT",
        description: `${newAlert.personName} detected ${newAlert.distance.toFixed(1)} miles away!`,
        variant: "destructive"
      })
    },
    onLocationShared: (sosLocation) => {
      setActiveSOSLocation(sosLocation)
      toast({
        title: "📍 Location Auto-Shared",
        description: `Emergency contacts notified of proximity alert`,
      })
    }
  })

  // Threat detection
  useThreatDetection({
    userLocation: location || userLocation,
    alerts,
    safetySettings,
    onThreatDetected: (threatAlerts) => {
      if (threatAlerts.length > 0 && threatAlerts.some(a => a.severity === "high")) {
        vibrate([200, 100, 200])
        toast({
          title: "⚠️ Safety Alert",
          description: `${threatAlerts.length} incident(s) reported nearby. Stay vigilant.`,
          variant: "destructive"
        })
      }
    }
  })

  // Initialize app
  useEffect(() => {
    setIsInitializing(false)
  }, [])

  // Computed values
  const unacknowledgedProximityAlerts = useMemo(
    () => proximityAlerts.filter(a => !a.acknowledged),
    [proximityAlerts]
  )

  const activeAlertCount = useMemo(
    () => alerts.filter(a => a.status === "active").length,
    [alerts]
  )

  const hasEmergencyContacts = useMemo(
    () => emergencyContacts.length > 0,
    [emergencyContacts]
  )

  // Handler: Emergency
  const handleEmergency = useCallback(() => {
    if (!location && !userLocation) {
      toast({
        title: "Location Required",
        description: "Cannot send emergency alert without location",
        variant: "destructive"
      })
      return
    }

    const currentLocation = location || userLocation
    if (!currentLocation) return

    vibrate([500, 200, 500, 200, 500])

    const newAlert: Alert = {
      id: `emergency-${Date.now()}`,
      type: "emergency",
      severity: "high",
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      description: "Emergency SOS activated",
      timestamp: Date.now(),
      status: "active",
      reportedBy: "user"
    }

    setAlerts(prev => [newAlert, ...prev])

    const sosLocationDrop: SOSLocationDrop = {
      id: `sos-${Date.now()}`,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      timestamp: Date.now(),
      message: "🚨 EMERGENCY: I need immediate assistance! Please check my location.",
      sharedWith: emergencyContacts.map(c => c.id),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000)
    }

    setActiveSOSLocation(sosLocationDrop)
    setShowSOSShare(true)

    if (hasEmergencyContacts) {
      toast({
        title: "🚨 Emergency Alert Sent",
        description: `Location shared with ${emergencyContacts.length} emergency contact${emergencyContacts.length !== 1 ? 's' : ''}`,
        variant: "destructive"
      })
    } else {
      toast({
        title: "🚨 Emergency Alert Active",
        description: "Add emergency contacts to share your location",
        variant: "destructive"
      })
    }
  }, [location, userLocation, emergencyContacts, vibrate, toast, setAlerts, hasEmergencyContacts])

  // Handler: Report incident
  const handleReportIncident = useCallback((alert: Omit<Alert, "id" | "timestamp" | "reportedBy">) => {
    const newAlert: Alert = {
      ...alert,
      id: `report-${Date.now()}`,
      timestamp: Date.now(),
      reportedBy: "user"
    }

    setAlerts(prev => [newAlert, ...prev])
    vibrate(200)

    toast({
      title: "✅ Incident Reported",
      description: "Your report has been shared with the community",
    })

    setActiveView("alerts")
  }, [vibrate, toast, setAlerts])

  // Handler: Emergency contacts
  const handleAddContact = useCallback((contact: Omit<EmergencyContact, "id">) => {
    const newContact: EmergencyContact = {
      ...contact,
      id: `contact-${Date.now()}`
    }
    setEmergencyContacts(prev => [...prev, newContact])
    vibrate(100)
    toast({
      title: "✅ Contact Added",
      description: `${contact.name} added to emergency contacts`,
    })
  }, [vibrate, toast, setEmergencyContacts])

  const handleDeleteContact = useCallback((id: string) => {
    const contact = emergencyContacts.find(c => c.id === id)
    setEmergencyContacts(prev => prev.filter(c => c.id !== id))
    toast({
      title: "Contact Removed",
      description: `${contact?.name} removed from emergency contacts`,
    })
  }, [emergencyContacts, toast, setEmergencyContacts])

  // Handler: Persons of concern
  const handleAddPerson = useCallback((person: Omit<PersonOfConcern, "id" | "addedAt">) => {
    const newPerson: PersonOfConcern = {
      ...person,
      id: `person-${Date.now()}`,
      addedAt: Date.now()
    }
    setPersonsOfConcern(prev => [...prev, newPerson])
    vibrate(100)
    toast({
      title: "✅ Added to Watchlist",
      description: `${person.name} is now being monitored`,
    })
  }, [vibrate, toast, setPersonsOfConcern])

  const handleDeletePerson = useCallback((id: string) => {
    const person = personsOfConcern.find(p => p.id === id)
    setPersonsOfConcern(prev => prev.filter(p => p.id !== id))
    setProximityAlerts(prev => prev.filter(a => a.personId !== id))
    toast({
      title: "Removed from Watchlist",
      description: `${person?.name} is no longer being monitored`,
    })
  }, [personsOfConcern, toast, setPersonsOfConcern, setProximityAlerts])

  const handleUpdatePerson = useCallback((id: string, updates: Partial<PersonOfConcern>) => {
    setPersonsOfConcern(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }, [setPersonsOfConcern])

  // Handler: Proximity alerts
  const handleAcknowledgeProximityAlert = useCallback((id: string) => {
    setProximityAlerts(prev => prev.map(a => 
      a.id === id ? { ...a, acknowledged: true } : a
    ))
    vibrate(50)
    toast({
      title: "Alert Acknowledged",
      description: "Proximity alert has been marked as read",
    })
  }, [vibrate, toast, setProximityAlerts])

  // Handler: Alerts
  const handleAlertClick = useCallback((alert: Alert) => {
    vibrate(50)
    toast({
      title: alert.type.toUpperCase(),
      description: alert.description,
    })
  }, [vibrate, toast])

  const handleResolveAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "resolved" as const } : a))
    vibrate(100)
  }, [vibrate, setAlerts])

  // Handler: Settings
  const handleUpdateSettings = useCallback((settings: SafetySettingsType) => {
    setSafetySettings(settings)
    vibrate(100)
    toast({
      title: "✅ Settings Saved",
      description: "Your safety preferences have been updated",
    })
  }, [vibrate, toast, setSafetySettings])

  const handleLogout = useCallback(() => {
    // Clear all data
    setAlerts([])
    setEmergencyContacts([])
    setPersonsOfConcern([])
    setProximityAlerts([])
    setSafetySettings({
      comfortRadius: 5,
      enableProximityAlerts: true,
      enablePushNotifications: true,
      autoShareLocation: false,
      threatCheckInterval: 5000,
      enableDataCollection: true
    })
    toast({
      title: "Logged Out",
      description: "All data has been cleared",
    })
  }, [setAlerts, setEmergencyContacts, setPersonsOfConcern, setProximityAlerts, setSafetySettings, toast])

  // UI Helpers
  const navigationItems: Array<{
    id: ViewType
    label: string
    icon: React.ReactNode
    badge?: number
  }> = [
    { id: "map", label: "Map", icon: <MapPin className="w-5 h-5" /> },
    { id: "alerts", label: "Alerts", icon: <AlertTriangle className="w-5 h-5" />, badge: activeAlertCount },
    { id: "watchlist", label: "Watch", icon: <UserX className="w-5 h-5" />, badge: personsOfConcern.length },
    { id: "report", label: "Report", icon: <Phone className="w-5 h-5" /> },
    { id: "contacts", label: "Contacts", icon: <UserPlus className="w-5 h-5" /> }
  ]

  if (isInitializing) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#0a0e1a]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
          <p className="text-white font-semibold">Initializing SafetyAware...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0a0e1a] touch-manipulation overflow-hidden">
      {/* Location Permission Banner */}
      {locationTrackingError && (
        <LocationPermissionBanner error={locationTrackingError} />
      )}

      {/* Header */}
      <header className="gradient-danger text-white p-4 shadow-lg safe-area-top flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">SafetyAware</h1>
              <p className="text-xs text-white/70">{isWatching ? "Tracking Active" : "Offline Mode"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                vibrate(50)
                setActiveView("settings")
              }}
              className="relative hover:opacity-80 transition-opacity active:scale-95 touch-target p-2"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                vibrate(50)
                setActiveView("proximity")
              }}
              className="relative hover:opacity-80 transition-opacity active:scale-95 touch-target p-2"
              aria-label="Proximity alerts"
              title="Proximity Alerts"
            >
              <Bell className="w-5 h-5" />
              {unacknowledgedProximityAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center animate-pulse-glow font-bold">
                  {unacknowledgedProximityAlerts.length}
                </span>
              )}
            </button>
            {(location || userLocation) && (
              <div className="text-xs bg-white/20 px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {(location || userLocation)?.accuracy && (location || userLocation)?.accuracy! < 50 ? 'High' : 'Low'} Accuracy
              </div>
            )}
            <button
              onClick={handleLogout}
              className="hover:opacity-80 transition-opacity active:scale-95 touch-target p-2 text-white/70 hover:text-white"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {activeView === "map" && (
          <Map
            userLocation={location || userLocation}
            alerts={alerts}
            onAlertClick={handleAlertClick}
          />
        )}

        {activeView === "alerts" && (
          <AlertFeed
            alerts={alerts}
            userLocation={location || userLocation}
            onResolve={handleResolveAlert}
          />
        )}

        {activeView === "report" && (
          <ReportIncident
            userLocation={location || userLocation}
            onSubmit={handleReportIncident}
            onCancel={() => setActiveView("map")}
          />
        )}

        {activeView === "contacts" && (
          <EmergencyContacts
            contacts={emergencyContacts}
            onAddContact={handleAddContact}
            onDeleteContact={handleDeleteContact}
            onClose={() => setActiveView("map")}
          />
        )}

        {activeView === "watchlist" && (
          <PersonsOfConcern
            persons={personsOfConcern}
            onAddPerson={handleAddPerson}
            onDeletePerson={handleDeletePerson}
            onUpdatePerson={handleUpdatePerson}
            onClose={() => setActiveView("map")}
            comfortRadius={safetySettings.comfortRadius}
            onOpenSettings={() => setActiveView("settings")}
          />
        )}

        {activeView === "settings" && (
          <SafetySettings
            settings={safetySettings}
            onUpdateSettings={handleUpdateSettings}
            onClose={() => setActiveView("map")}
          />
        )}

        {activeView === "proximity" && (
          <ProximityAlerts
            alerts={proximityAlerts}
            persons={personsOfConcern}
            onAcknowledge={handleAcknowledgeProximityAlert}
            onClose={() => setActiveView("map")}
          />
        )}

        {/* Safety Score Overlay (only on map view) */}
        {activeView === "map" && (location || userLocation) && (
          <SafetyScore
            alerts={alerts}
            userLocation={location || userLocation}
          />
        )}

        {/* Emergency Button (always visible) */}
        <EmergencyButton onEmergency={handleEmergency} />
      </main>

      {/* SOS Location Share Modal */}
      {showSOSShare && activeSOSLocation && (location || userLocation) && (
        <SOSLocationShare
          location={location || userLocation}
          contacts={emergencyContacts}
          locationDrop={activeSOSLocation}
          onClose={() => setShowSOSShare(false)}
        />
      )}

      {/* Bottom Navigation */}
      <nav className="bg-[#151b2e] border-t border-slate-800/50 px-2 py-3 safe-area-bottom backdrop-blur-xl flex-shrink-0">
        <div className="flex justify-around items-center">
          {navigationItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                vibrate(50)
                setActiveView(item.id)
              }}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all relative active:scale-95 touch-target ${
                activeView === item.id
                  ? "bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
              aria-label={item.label}
              title={item.label}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
