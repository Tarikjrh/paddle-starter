"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Star, Users, Wifi, Car, Zap, LogOut, User, ChevronDown, Sparkles } from "lucide-react"
import { BookingModal } from "@/components/booking-modal"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/supabase"
import Link from "next/link"
import { toast } from "react-hot-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion"

type Court = Database["public"]["Tables"]["courts"]["Row"]

export default function HomePage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const { user, profile, loading } = useAuth()
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  useEffect(() => {
    fetchCourts()
    checkMaintenanceMode()
  }, [])

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-900">
        <div className="relative">
          <div className="absolute inset-0 h-32 w-32 rounded-full bg-indigo-500/20 blur-xl animate-pulse"></div>
          <div className="relative animate-spin rounded-full h-32 w-32 border-b-2 border-t-2 border-indigo-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 text-white overflow-hidden">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-3"
          >
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-2 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">PaddleCourt Elite</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center space-x-4"
          >
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-indigo-200">Welcome, {profile?.full_name || user.email}</span>
                {profile?.role && (profile.role === "admin" || profile.role === "moderator") && (
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm" className="border-indigo-400 text-indigo-200 hover:bg-indigo-500/20">
                      Dashboard
                    </Button>
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2 border-indigo-400 text-indigo-200 hover:bg-indigo-500/20">
                      Account <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-900 border border-indigo-500/30">
                    <Link href="/profile">
                      <DropdownMenuItem className="cursor-pointer hover:bg-indigo-500/20">
                        <User className="h-4 w-4 mr-2" />
                        My Profile
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem className="cursor-pointer text-red-400 hover:bg-red-900/20" onClick={() => supabase.auth.signOut()}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button
                onClick={() => setShowAuth(true)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0 transition-all duration-300"
              >
                Sign In
              </Button>
            )}
          </motion.div>
        </div>
      </header>

      {/* Maintenance Banner */}
      <AnimatePresence>
        {maintenanceMode && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-gradient-to-r from-red-500 to-rose-600 text-white py-3 px-4"
          >
            <div className="container mx-auto text-center">
              <p className="font-medium">🚧 System is currently under maintenance. Booking is temporarily disabled.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-600 rounded-full filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-600 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-blue-600 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="container mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <h2 className="text-6xl font-bold mb-6 leading-tight">
              Experience
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Elite Paddle Courts</span>
            </h2>
            <p className="text-xl text-indigo-200 mb-10 max-w-2xl mx-auto leading-relaxed">
              Indulge in the ultimate paddle experience with premium courts designed for professionals and enthusiasts alike.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-6 text-sm"
          >
            <div className="flex items-center space-x-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full">
              <Calendar className="h-5 w-5 text-indigo-400" />
              <span>Seamless Booking</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full">
              <Clock className="h-5 w-5 text-indigo-400" />
              <span>Premium Time Slots</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full">
              <MapPin className="h-5 w-5 text-indigo-400" />
              <span>Exclusive Locations</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <span>Luxury Experience</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Courts Section */}
      <section className="py-20 px-4 relative">
        <div className="container mx-auto">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-4"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Select Your Elite Court</span>
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-center text-indigo-200 mb-16 max-w-2xl mx-auto"
          >
            Each court is meticulously maintained to provide the perfect playing environment for paddle enthusiasts.
          </motion.p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courts.map((court, index) => (
              <motion.div
                key={court.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="overflow-hidden bg-slate-800/50 border border-indigo-500/20 backdrop-blur-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group">
                  <div className="aspect-video relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60 z-10"></div>
                    <img
                      src={court.image_url || "/placeholder.svg?height=200&width=300"}
                      alt={court.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl text-white">{court.name}</CardTitle>
                      <Badge variant="secondary" className="bg-indigo-900/70 text-indigo-200 border border-indigo-500/30">
                        ${court.hourly_rate}/hour
                      </Badge>
                    </div>
                    <CardDescription className="text-indigo-200">{court.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {court.amenities && court.amenities.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-sm text-indigo-300 mb-3">Premium Amenities</h4>
                        <div className="flex flex-wrap gap-2">
                          {court.amenities.map((amenity, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-1 text-xs bg-indigo-900/30 border border-indigo-500/20 px-3 py-1.5 rounded-full"
                            >
                              {getAmenityIcon(amenity)}
                              <span className="text-indigo-200">{amenity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button
                      onClick={() => handleBookCourt(court)}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0 transition-all duration-300"
                    >
                      Reserve Now
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-slate-900 to-indigo-950 relative">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:30px_30px]"></div>
        <div className="container mx-auto relative z-10">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-4"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">The Elite Experience</span>
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-center text-indigo-200 mb-16 max-w-2xl mx-auto"
          >
            Discover why discerning players choose PaddleCourt Elite for their premium paddle tennis experience.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                icon: <Calendar className="h-8 w-8 text-indigo-400" />,
                title: "Effortless Reservations",
                description: "Our intelligent booking system ensures a seamless experience from selection to confirmation.",
              },
              {
                icon: <Star className="h-8 w-8 text-indigo-400" />,
                title: "Unparalleled Quality",
                description: "Championship-grade courts with meticulous attention to detail and premium playing surfaces.",
              },
              {
                icon: <Clock className="h-8 w-8 text-indigo-400" />,
                title: "Exclusive Availability",
                description: "Extended hours with priority booking windows for our most dedicated members.",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-600/30 rounded-full blur-xl group-hover:bg-indigo-500/40 transition-colors duration-300"></div>
                  <div className="relative bg-slate-800/80 w-20 h-20 rounded-full border border-indigo-500/30 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm group-hover:border-indigo-400 transition-colors duration-300">
                    {feature.icon}
                  </div>
                </div>
                <h4 className="text-xl font-semibold mb-3 text-white">{feature.title}</h4>
                <p className="text-indigo-200 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-24 px-4 bg-indigo-950 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-slate-900 to-transparent"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-600/20 rounded-full filter blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/20 rounded-full filter blur-3xl"></div>

        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h3 className="text-3xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">What Our Players Say</span>
            </h3>
            <div className="relative">
              <div className="absolute -left-10 -top-6 text-6xl text-indigo-500/30">"</div>
              <p className="text-xl text-indigo-100 italic mb-6 leading-relaxed">
                PaddleCourt Elite offers the finest playing experience I've encountered. The courts are impeccably maintained, and the booking process
                is seamless. It's become my go-to destination for both casual games and serious training.
              </p>
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-indigo-900 flex items-center justify-center mr-4">
                  <span className="text-indigo-400 font-semibold">JD</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">Jonathan Davis</p>
                  <p className="text-indigo-300 text-sm">Professional Player</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-16 px-4 border-t border-indigo-900/30">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="flex items-center space-x-3 mb-6 md:mb-0"
            >
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-2 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">PaddleCourt Elite</h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex space-x-6"
            >
              {["About", "Membership", "Locations", "Contact", "FAQ"].map((item, index) => (
                <a key={index} href="#" className="text-indigo-300 hover:text-white transition-colors duration-300">
                  {item}
                </a>
              ))}
            </motion.div>
          </div>

          <div className="border-t border-indigo-900/30 pt-8 text-center">
            <p className="text-indigo-400 mb-4">Your premier destination for elite paddle court experiences</p>
            <p className="text-sm text-indigo-600">© 2024 PaddleCourt Elite. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
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
      </AnimatePresence>
    </div>
  )
}
