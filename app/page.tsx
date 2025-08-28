"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Clock,
  MapPin,
  Star,
  Users,
  Wifi,
  Car,
  Zap,
  LogOut,
  User,
  ChevronDown,
  Sparkles,
  Shield,
  Trophy,
  Heart,
  CheckCircle,
  Award,
  TrendingUp,
  Globe,
  Phone,
  Mail,
  Instagram,
  Twitter,
  Facebook,
  Sun,
  Moon,
} from "lucide-react"
import { BookingModal } from "@/components/booking-modal"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/hooks/use-auth"
import { useTheme } from "@/contexts/theme-context"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/supabase"
import Link from "next/link"
import { toast } from "react-hot-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"

type Court = Database["public"]["Tables"]["courts"]["Row"]

export default function HomePage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const { user, profile, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 300], [0, -50])

  // Theme-aware styles
  const getThemeStyles = () => {
    if (theme === "light") {
      return {
        background: "bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50",
        text: "text-slate-900",
        cardBg: "from-white/80 to-indigo-50/50",
        borderColor: "border-indigo-200/50",
        textSecondary: "text-indigo-700",
        textTertiary: "text-slate-600",
        particleColor: "bg-indigo-600",
        headerBg: "bg-white/20",
        headerBorder: "border-slate-200/20",
        buttonGradient: "from-indigo-600 via-purple-600 to-pink-600",
        buttonHover: "hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700",
        trustBg: "from-slate-50/50 to-indigo-100/50",
        featuresBg: "bg-gradient-to-b from-slate-50 to-indigo-50",
        membershipBg: "bg-gradient-to-b from-indigo-100 to-purple-100",
        testimonialsBg: "bg-gradient-to-b from-slate-100 to-indigo-100",
        footerBg: "bg-slate-100",
        footerBorder: "border-indigo-200/30",
      }
    }
    return {
      background: "bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900",
      text: "text-white",
      cardBg: "from-slate-800/50 to-indigo-900/30",
      borderColor: "border-indigo-500/20",
      textSecondary: "text-indigo-200",
      textTertiary: "text-indigo-300",
      particleColor: "bg-indigo-400",
      headerBg: "bg-black/20",
      headerBorder: "border-white/10",
      buttonGradient: "from-indigo-500 via-purple-500 to-pink-500",
      buttonHover: "hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600",
      trustBg: "from-slate-900/50 to-indigo-900/50",
      featuresBg: "",
      membershipBg: "bg-gradient-to-b from-indigo-950 to-purple-950",
      testimonialsBg: "bg-gradient-to-b from-slate-900 to-indigo-950",
      footerBg: "bg-slate-950",
      footerBorder: "border-indigo-900/30",
    }
  }

  const styles = getThemeStyles()

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
      <div className={`min-h-screen flex items-center justify-center ${styles.background}`}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="absolute inset-0 h-32 w-32 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20 blur-xl animate-pulse"></div>
          <div className="relative animate-spin rounded-full h-32 w-32 border-4 border-transparent bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-border">
            <div
              className={`absolute inset-2 ${theme === "light" ? "bg-slate-50" : "bg-slate-900"} rounded-full`}
            ></div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${styles.background} ${styles.text} overflow-hidden transition-colors duration-500`}>
      {/* Floating Particles Background */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 ${styles.particleColor} rounded-full opacity-30`}
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              x: [null, Math.random() * window.innerWidth],
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`${styles.headerBg} backdrop-blur-xl border-b ${styles.headerBorder} sticky top-0 z-50 transition-colors duration-500`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div whileHover={{ scale: 1.05 }} className="flex items-center space-x-3 cursor-pointer">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-2 rounded-xl shadow-lg">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              PaddleCourt Elite
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center space-x-4"
          >
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${
                theme === "light" ? "bg-slate-200 text-slate-700" : "bg-slate-800 text-indigo-400"
              } transition-all duration-300`}
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </motion.button>

            {user ? (
              <div className="flex items-center space-x-4">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-sm ${styles.textSecondary}`}
                >
                  Welcome, {profile?.full_name || user.email}
                </motion.span>
                {profile?.role && (profile.role === "admin" || profile.role === "moderator") && (
                  <Link href="/dashboard">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`border-indigo-400 ${styles.textSecondary} hover:bg-indigo-500/20 transition-all duration-300`}
                    >
                      Dashboard
                    </Button>
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`flex items-center gap-2 border-indigo-400 ${styles.textSecondary} hover:bg-indigo-500/20 transition-all duration-300`}
                    >
                      Account <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={`${theme === "light" ? "bg-white/95" : "bg-slate-900/95"} backdrop-blur-md border ${
                      styles.borderColor
                    } transition-colors duration-300`}
                  >
                    <Link href="/profile">
                      <DropdownMenuItem className="cursor-pointer hover:bg-indigo-500/20 transition-colors">
                        <User className="h-4 w-4 mr-2" />
                        My Profile
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem
                      className="cursor-pointer text-red-400 hover:bg-red-900/20 transition-colors"
                      onClick={() => supabase.auth.signOut()}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => setShowAuth(true)}
                  className={`bg-gradient-to-r ${styles.buttonGradient} ${styles.buttonHover} border-0 transition-all duration-300 shadow-lg text-white`}
                >
                  Sign In
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.header>

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
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        <motion.div style={{ y }} className="absolute inset-0 opacity-30">
          <div
            className={`absolute top-20 left-10 w-96 h-96 bg-gradient-to-r ${
              theme === "light" ? "from-indigo-300 to-purple-300" : "from-indigo-600 to-purple-600"
            } rounded-full filter blur-3xl opacity-50 animate-pulse`}
          ></div>
          <div
            className={`absolute top-40 right-10 w-96 h-96 bg-gradient-to-r ${
              theme === "light" ? "from-purple-300 to-pink-300" : "from-purple-600 to-pink-600"
            } rounded-full filter blur-3xl opacity-50 animate-pulse animation-delay-2000`}
          ></div>
          <div
            className={`absolute bottom-20 left-1/2 w-96 h-96 bg-gradient-to-r ${
              theme === "light" ? "from-blue-300 to-indigo-300" : "from-blue-600 to-indigo-600"
            } rounded-full filter blur-3xl opacity-50 animate-pulse animation-delay-4000`}
          ></div>
        </motion.div>

        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.h2
              className="text-7xl md:text-8xl font-black mb-8 leading-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              Elevate Your
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-pulse">
                Game Experience
              </span>
            </motion.h2>

            <motion.p
              className={`text-xl md:text-2xl ${styles.textSecondary} mb-12 max-w-3xl mx-auto leading-relaxed`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              Where championship dreams meet world-class facilities. Experience paddle tennis like never before with our
              premium courts and exclusive amenities.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex flex-col md:flex-row justify-center items-center gap-6 mb-16"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                className={`bg-gradient-to-r ${styles.buttonGradient} ${styles.buttonHover} text-white px-8 py-4 text-lg rounded-xl shadow-2xl border-0`}
                onClick={() => document.getElementById("courts")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explore Courts
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="lg"
                className={`border-2 border-indigo-400 ${styles.textSecondary} hover:bg-indigo-500/20 px-8 py-4 text-lg rounded-xl backdrop-blur-sm`}
                onClick={() => document.getElementById("membership")?.scrollIntoView({ behavior: "smooth" })}
              >
                View Membership
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
          >
            {[
              { icon: <Calendar className="h-6 w-6" />, title: "24/7 Booking", desc: "Anytime Access" },
              { icon: <Trophy className="h-6 w-6" />, title: "Pro Standards", desc: "Tournament Grade" },
              { icon: <Shield className="h-6 w-6" />, title: "Premium Safety", desc: "Secure Environment" },
              { icon: <Sparkles className="h-6 w-6" />, title: "Luxury Service", desc: "White Glove Treatment" },
            ].map((feature, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05, y: -5 }}
                className={`${theme === "light" ? "bg-white/40" : "bg-white/5"} backdrop-blur-md border ${
                  theme === "light" ? "border-slate-200/50" : "border-white/10"
                } rounded-2xl p-6 text-center hover:${
                  theme === "light" ? "bg-white/60" : "bg-white/10"
                } transition-all duration-300`}
              >
                <div className="text-indigo-400 mb-3 flex justify-center">{feature.icon}</div>
                <h3 className={`font-semibold ${styles.text} mb-1`}>{feature.title}</h3>
                <p className={`text-sm ${styles.textSecondary}`}>{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Floating Cards */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-20 h-20 bg-gradient-to-r ${
                theme === "light" ? "from-indigo-200/20 to-purple-200/20" : "from-indigo-500/10 to-purple-500/10"
              } backdrop-blur-sm rounded-2xl border ${theme === "light" ? "border-slate-200/20" : "border-white/5"}`}
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                rotate: Math.random() * 360,
              }}
              animate={{
                y: [null, Math.random() * window.innerHeight],
                x: [null, Math.random() * window.innerWidth],
                rotate: [null, Math.random() * 360],
              }}
              transition={{
                duration: Math.random() * 30 + 20,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>
      </section>

      {/* Courts Section */}
      <section id="courts" className="py-32 px-4 relative">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h3 className="text-5xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                Championship Courts
              </span>
            </h3>
            <p className={`text-xl ${styles.textSecondary} max-w-3xl mx-auto`}>
              Each court is a masterpiece of engineering and design, built to international standards for the ultimate
              playing experience.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2  gap-8">
            {courts.map((court, index) => (
              <motion.div
                key={court.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <Card
                  style={{ height: "100%" }}
                  className={`overflow-hidden bg-gradient-to-br ${styles.cardBg} border  ${styles.borderColor} backdrop-blur-sm hover:shadow-2xl hover:shadow-indigo-500/10  transition-all duration-500`}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <div
                      className={`absolute inset-0 bg-gradient-to-t ${
                        theme === "light" ? "from-slate-100" : "from-slate-900"
                      } via-transparent to-transparent opacity-60 z-10`}
                    ></div>
                    <motion.img
                      src={court.image_url || "/placeholder.svg?height=200&width=300"}
                      alt={court.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      whileHover={{ scale: 1.1 }}
                    />
                    <div className="absolute top-4 right-4 z-20">
                      <Badge
                        variant="secondary"
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-lg"
                      >
                        ${court.hourly_rate}/hour
                      </Badge>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle
                      className={`text-2xl ${styles.text} group-hover:text-indigo-400 transition-colors duration-300`}
                    >
                      {court.name}
                    </CardTitle>
                    <CardDescription className={`${styles.textSecondary} leading-relaxed`}>
                      {court.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    {court.amenities && court.amenities.length > 0 && (
                      <div className="mb-6">
                        <h4 className={`font-semibold text-sm ${styles.textTertiary} mb-3`}>Premium Amenities</h4>
                        <div className="flex flex-wrap gap-2">
                          {court.amenities.map((amenity, index) => (
                            <motion.div
                              key={index}
                              whileHover={{ scale: 1.05 }}
                              className={`flex items-center space-x-1 text-xs bg-gradient-to-r ${
                                theme === "light"
                                  ? "from-indigo-100/60 to-purple-100/60 border-indigo-300/40"
                                  : "from-indigo-900/40 to-purple-900/40 border-indigo-500/20"
                              } border px-3 py-1.5 rounded-full backdrop-blur-sm`}
                            >
                              {getAmenityIcon(amenity)}
                              <span className={styles.textSecondary}>{amenity}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => handleBookCourt(court)}
                        className={`w-full bg-gradient-to-r ${styles.buttonGradient} ${styles.buttonHover} border-0 transition-all duration-300 font-semibold py-3 rounded-xl text-white`}
                      >
                        Reserve Now
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Statistics */}
      <section
        className={`py-24 px-4 bg-gradient-to-r ${styles.trustBg} backdrop-blur-sm border-y ${styles.borderColor}`}
      >
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { number: "5000+", label: "Happy Players", icon: <Users className="h-8 w-8" /> },
              { number: "50+", label: "Premium Courts", icon: <MapPin className="h-8 w-8" /> },
              { number: "99.9%", label: "Uptime", icon: <TrendingUp className="h-8 w-8" /> },
              { number: "24/7", label: "Support", icon: <Shield className="h-8 w-8" /> },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center group"
              >
                <div className="text-indigo-400 mb-4 flex justify-center group-hover:scale-110 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div
                  className={`text-4xl font-bold ${styles.text} mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400`}
                >
                  {stat.number}
                </div>
                <div className={`${styles.textSecondary} font-medium`}>{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Premium Features */}
      <section className={`py-32 px-4 relative ${styles.featuresBg}`}>
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h3 className="text-5xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                Premium Experience
              </span>
            </h3>
            <p className={`text-xl ${styles.textSecondary} max-w-3xl mx-auto`}>
              Every detail crafted for excellence. From court surfaces to customer service, we set the gold standard.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Trophy className="h-12 w-12 text-indigo-400" />,
                title: "Championship Standards",
                description:
                  "ITF-approved courts with professional-grade surfaces and precise dimensions for authentic tournament play.",
                features: ["ITF Certified", "Pro Surface", "Perfect Dimensions"],
              },
              {
                icon: <Sparkles className="h-12 w-12 text-indigo-400" />,
                title: "Luxury Amenities",
                description:
                  "Premium facilities including climate control, high-end equipment, and personalized service.",
                features: ["Climate Control", "Premium Equipment", "Concierge Service"],
              },
              {
                icon: <Shield className="h-12 w-12 text-indigo-400" />,
                title: "Advanced Security",
                description: "State-of-the-art security systems and safety protocols ensure a secure environment.",
                features: ["24/7 Security", "Access Control", "Emergency Response"],
              },
              {
                icon: <Clock className="h-12 w-12 text-indigo-400" />,
                title: "Flexible Scheduling",
                description:
                  "Book courts at your convenience with our intelligent scheduling system and extended hours.",
                features: ["24/7 Booking", "Smart Scheduling", "Extended Hours"],
              },
              {
                icon: <Heart className="h-12 w-12 text-indigo-400" />,
                title: "Health & Wellness",
                description:
                  "Complete wellness facilities including fitness areas, recovery zones, and nutrition guidance.",
                features: ["Fitness Center", "Recovery Zone", "Nutrition Advice"],
              },
              {
                icon: <Globe className="h-12 w-12 text-indigo-400" />,
                title: "Global Network",
                description: "Access to our worldwide network of premium paddle courts and exclusive partnerships.",
                features: ["Global Access", "Partner Courts", "Travel Benefits"],
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <Card
                  className={`h-full bg-gradient-to-br ${styles.cardBg} border ${styles.borderColor} backdrop-blur-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${
                      theme === "light" ? "from-indigo-100/50 to-purple-100/50" : "from-indigo-500/5 to-purple-500/5"
                    } opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  ></div>
                  <CardHeader className="relative z-10">
                    <div className="mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                    <CardTitle
                      className={`text-2xl ${styles.text} group-hover:text-indigo-400 transition-colors duration-300`}
                    >
                      {feature.title}
                    </CardTitle>
                    <CardDescription className={`${styles.textSecondary} leading-relaxed`}>
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="space-y-2">
                      {feature.features.map((item, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-indigo-400" />
                          <span className={`text-sm ${styles.textSecondary}`}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Section */}
      <section id="membership" className={`py-32 px-4 ${styles.membershipBg} relative`}>
        <div
          className={`absolute inset-0 ${
            theme === "light" ? "bg-grid-slate-200/[0.5]" : "bg-grid-white/[0.02]"
          } bg-[size:50px_50px]`}
        ></div>
        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h3 className="text-5xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                Exclusive Membership
              </span>
            </h3>
            <p className={`text-xl ${styles.textSecondary} max-w-3xl mx-auto`}>
              Join our elite community and unlock unlimited access to premium facilities and exclusive benefits.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Essential",
                price: "$99",
                period: "/month",
                description: "Perfect for casual players",
                features: ["10 hours/month", "Basic amenities", "Online booking", "Community events"],
                color: theme === "light" ? "from-slate-300 to-slate-400" : "from-slate-600 to-slate-700",
                borderColor: theme === "light" ? "border-slate-300/50" : "border-slate-500/30",
              },
              {
                name: "Elite",
                price: "$199",
                period: "/month",
                description: "Our most popular choice",
                features: [
                  "Unlimited access",
                  "Premium amenities",
                  "Priority booking",
                  "Personal coaching",
                  "Guest privileges",
                ],
                color: "from-indigo-600 to-purple-600",
                borderColor: "border-indigo-500/50",
                popular: true,
              },
              {
                name: "Platinum",
                price: "$399",
                period: "/month",
                description: "Ultimate luxury experience",
                features: [
                  "All Elite benefits",
                  "Private courts",
                  "Concierge service",
                  "Equipment included",
                  "Global access",
                ],
                color: "from-purple-600 to-pink-600",
                borderColor: "border-purple-500/30",
              },
            ].map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="relative group"
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-1 text-sm font-semibold">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <Card
                  className={`h-full bg-gradient-to-br ${plan.color}/10 border ${
                    plan.borderColor
                  } backdrop-blur-sm hover:shadow-2xl transition-all duration-500 overflow-hidden ${
                    plan.popular ? "ring-2 ring-indigo-500/30" : ""
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${plan.color}/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  ></div>
                  <CardHeader className="relative z-10 text-center">
                    <CardTitle className="text-2xl text-white mb-2">{plan.name}</CardTitle>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-indigo-200">{plan.period}</span>
                    </div>
                    <CardDescription className="text-indigo-200">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-4">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                        <span className="text-indigo-200">{feature}</span>
                      </div>
                    ))}
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="pt-6">
                      <Button
                        className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 border-0 text-white font-semibold py-3 rounded-xl transition-all duration-300`}
                        onClick={() => setShowAuth(true)}
                      >
                        Choose Plan
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={`py-32 px-4 ${styles.testimonialsBg} relative overflow-hidden`}>
        <div
          className={`absolute -top-40 -right-40 w-80 h-80 ${
            theme === "light" ? "bg-indigo-300/30" : "bg-indigo-600/20"
          } rounded-full filter blur-3xl`}
        ></div>
        <div
          className={`absolute -bottom-40 -left-40 w-80 h-80 ${
            theme === "light" ? "bg-purple-300/30" : "bg-purple-600/20"
          } rounded-full filter blur-3xl`}
        ></div>

        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h3 className="text-5xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                Trusted by Champions
              </span>
            </h3>
            <p className={`text-xl ${styles.textSecondary} max-w-3xl mx-auto`}>
              See what professional players and enthusiasts say about their PaddleCourt Elite experience.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote:
                  "The quality of these courts is simply unmatched. Every detail has been perfected for optimal performance.",
                name: "Sarah Chen",
                title: "Professional Player",
                rating: 5,
              },
              {
                quote:
                  "PaddleCourt Elite transformed my training regimen. The facilities and service exceed all expectations.",
                name: "Marcus Rodriguez",
                title: "Tennis Coach",
                rating: 5,
              },
              {
                quote:
                  "From booking to playing, everything is seamless. This is what premium sports facilities should be.",
                name: "Emily Johnson",
                title: "Club Member",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <Card
                  className={`h-full bg-gradient-to-br ${styles.cardBg} border ${styles.borderColor} backdrop-blur-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300`}
                >
                  <CardContent className="p-8">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p
                      className={`${
                        theme === "light" ? "text-slate-700" : "text-indigo-100"
                      } italic mb-6 leading-relaxed`}
                    >
                      "{testimonial.quote}"
                    </p>
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center mr-4">
                        <span className="text-white font-semibold text-lg">
                          {testimonial.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className={`font-semibold ${styles.text}`}>{testimonial.name}</p>
                        <p className={`${styles.textTertiary} text-sm`}>{testimonial.title}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer
        className={`${styles.footerBg} ${styles.text} py-20 px-4 border-t ${styles.footerBorder} relative overflow-hidden transition-colors duration-500`}
      >
        <div
          className={`absolute inset-0 ${
            theme === "light" ? "bg-grid-slate-200/[0.5]" : "bg-grid-white/[0.02]"
          } bg-[size:30px_30px]`}
        ></div>
        <div className="container mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-2 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  PaddleCourt Elite
                </h1>
              </div>
              <p className={`${styles.textTertiary} leading-relaxed mb-6`}>
                The world's premier destination for elite paddle tennis experiences. Where champions are made.
              </p>
              <div className="flex space-x-4">
                {[Facebook, Twitter, Instagram].map((Icon, index) => (
                  <motion.a
                    key={index}
                    href="#"
                    whileHover={{ scale: 1.1, y: -2 }}
                    className={`w-10 h-10 ${
                      theme === "light"
                        ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                        : "bg-indigo-900/50 text-indigo-400 hover:text-white hover:bg-indigo-600"
                    } rounded-lg flex items-center justify-center transition-all duration-300`}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.a>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="font-semibold text-white mb-6">Services</h3>
              <ul className="space-y-3">
                {["Court Booking", "Private Coaching", "Equipment Rental", "Event Hosting", "Membership Plans"].map(
                  (item, index) => (
                    <li key={index}>
                      <a href="#" className="text-indigo-300 hover:text-white transition-colors duration-300">
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="font-semibold text-white mb-6">Company</h3>
              <ul className="space-y-3">
                {["About Us", "Careers", "Press", "Partnerships", "Contact"].map((item, index) => (
                  <li key={index}>
                    <a href="#" className="text-indigo-300 hover:text-white transition-colors duration-300">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h3 className="font-semibold text-white mb-6">Contact</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-indigo-400" />
                  <span className="text-indigo-300">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-indigo-400" />
                  <span className="text-indigo-300">elite@paddlecourt.com</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-indigo-400" />
                  <span className="text-indigo-300">Premium Locations Worldwide</span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className={`border-t ${styles.footerBorder} pt-8 text-center`}>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className={`${styles.textSecondary} mb-4`}
            >
              Elevating paddle tennis to new heights of excellence
            </motion.p>
            <p className={`text-sm ${styles.textTertiary}`}>
              © 2024 PaddleCourt Elite. All rights reserved. | Privacy Policy | Terms of Service
            </p>
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
