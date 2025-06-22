"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Star, Users, Wifi, Car, Zap } from "lucide-react"
import { BookingModal } from "@/components/booking-modal"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/supabase"
import Link from "next/link"
import { toast } from "react-hot-toast"

type Court = Database["public"]["Tables"]["courts"]["Row"]

export default function HomePage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const { user, profile, loading } = useAuth()
  // Add state for maintenance mode at the top of the component
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  useEffect(() => {
    fetchCourts()
    checkMaintenanceMode()
  }, [])

  // Add this function to check maintenance mode
  const checkMaintenanceMode = async () => {
    const { data } = await supabase.from("settings").select("value").eq("key", "maintenance_mode").single()

    if (data) {
      setMaintenanceMode(Boolean(data.value) || false)
    }
  }

  const fetchCourts = async () => {
    const { data, error } = await supabase.from("courts").select("*").eq("is_active", true).order("name")

    if (error) {
      console.error("Error fetching courts:", error)
    } else {
      setCourts(data || [])
    }
  }

  // Update the handleBookCourt function to check maintenance mode
  const handleBookCourt = (court: Court) => {
    if (maintenanceMode) {
      toast.error("Booking is currently disabled for maintenance. Please try again later.")
      return
    }

    if (!user) {
      setShowAuth(true)
      return
    }
    setSelectedCourt(court)
    setShowBooking(true)
  }

  const getAmenityIcon = (amenity: string) => {
    if (amenity.toLowerCase().includes("wifi") || amenity.toLowerCase().includes("internet")) {
      return <Wifi className="h-4 w-4" />
    }
    if (amenity.toLowerCase().includes("parking") || amenity.toLowerCase().includes("car")) {
      return <Car className="h-4 w-4" />
    }
    if (amenity.toLowerCase().includes("lighting") || amenity.toLowerCase().includes("light")) {
      return <Zap className="h-4 w-4" />
    }
    return <Star className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-orange-500 text-white p-2 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PaddleCourt Pro</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {profile?.full_name || user.email}</span>
                {profile?.role && (profile.role === "admin" || profile.role === "moderator") && (
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                )}
                <Link href="/profile">
                  <Button variant="outline" size="sm">
                    My Profile
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowAuth(true)}>Sign In</Button>
            )}
          </div>
        </div>
      </header>

      {/* Add maintenance banner after the header (before hero section) */}
      {maintenanceMode && (
        <div className="bg-red-500 text-white py-3 px-4">
          <div className="container mx-auto text-center">
            <p className="font-medium">🚧 System is currently under maintenance. Booking is temporarily disabled.</p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Book Your Perfect
            <span className="text-orange-500"> Paddle Court</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Experience the thrill of paddle tennis at our premium courts. Book online, play with friends, and enjoy
            world-class facilities.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span>Easy Online Booking</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span>Flexible Time Slots</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-orange-500" />
              <span>Premium Locations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Courts Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Choose Your Court</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courts.map((court) => (
              <Card key={court.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="aspect-video bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                  <img
                    src={court.image_url || "/placeholder.svg?height=200&width=300"}
                    alt={court.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{court.name}</CardTitle>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      ${court.hourly_rate}/hour
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-600">{court.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {court.amenities && court.amenities.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Amenities</h4>
                      <div className="flex flex-wrap gap-2">
                        {court.amenities.map((amenity, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-1 text-xs bg-gray-100 px-2 py-1 rounded-full"
                          >
                            {getAmenityIcon(amenity)}
                            <span>{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button onClick={() => handleBookCourt(court)} className="w-full bg-orange-500 hover:bg-orange-600">
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose PaddleCourt Pro?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-orange-500" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Easy Booking</h4>
              <p className="text-gray-600">
                Book your court in just a few clicks. Choose your preferred time and date.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-orange-500" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Premium Quality</h4>
              <p className="text-gray-600">Professional-grade courts with top-notch facilities and equipment.</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Flexible Hours</h4>
              <p className="text-gray-600">Open from early morning to late evening to fit your schedule.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="bg-orange-500 text-white p-2 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">PaddleCourt Pro</h1>
          </div>
          <p className="text-gray-400 mb-4">Your premier destination for paddle court bookings</p>
          <p className="text-sm text-gray-500">© 2024 PaddleCourt Pro. All rights reserved.</p>
        </div>
      </footer>

      {/* Modals */}
      {showBooking && selectedCourt && (
        <BookingModal
          court={selectedCourt}
          isOpen={showBooking}
          onClose={() => {
            setShowBooking(false)
            setSelectedCourt(null)
          }}
        />
      )}

      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
    </div>
  )
}
