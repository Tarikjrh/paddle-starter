"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  User,
  Calendar,
  Clock,
  DollarSign,
  Edit,
  X,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { Database } from "@/lib/supabase"
import { BookingModal } from "@/components/booking-modal"

type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  courts: { name: string; hourly_rate: number } | null
}

type Settings = {
  cancellationHours: number
  allowCancellation: boolean
}

interface UserStats {
  totalBookings: number
  totalSpent: number
  upcomingBookings: number
  completedBookings: number
  cancelledBookings: number
  favoriteTime: string
  favoriteCourt: string
}
\
interface Court extends Database["public"]["Tables"]["courts"]["Row"] {}

export default function ProfilePage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<UserStats>({
    totalBookings: 0,
    totalSpent: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    favoriteTime: "N/A",
    favoriteCourt: "N/A",
  })
  const [settings, setSettings] = useState<Settings>({
    cancellationHours: 24,
    allowCancellation: true,
  })
  const [loading, setLoading] = useState(true)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
  })
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
      return
    }

    if (user && profile) {
      setProfileData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
      })
      fetchUserData()
    }
  }, [user, profile, authLoading, router])

  const fetchUserData = async () => {
    if (!user) return

    try {
      // Fetch user bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          *,
          courts:court_id (name, hourly_rate)
        `)
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false })

      if (bookingsError) throw bookingsError

      // Fetch system settings
      const { data: settingsData } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["cancellation_hours", "allow_cancellation"])

      const settingsMap = new Map(settingsData?.map((s) => [s.key, s.value]) || [])

      setBookings(bookingsData || [])
      setSettings({
        cancellationHours: Number(settingsMap.get("cancellation_hours")) || 24,
        allowCancellation: Boolean(settingsMap.get("allow_cancellation")) ?? true,
      })

      // Calculate user statistics
      if (bookingsData) {
        calculateUserStats(bookingsData)
      }

      // Fetch available courts
      fetchCourts()
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast.error("Failed to load your data")
    } finally {
      setLoading(false)
    }
  }

  const calculateUserStats = (bookingsData: Booking[]) => {
    const totalBookings = bookingsData.length
    const totalSpent = bookingsData
      .filter((b) => b.status === "confirmed" || b.status === "completed")
      .reduce((sum, b) => sum + b.total_amount, 0)

    const now = new Date()
    const upcomingBookings = bookingsData.filter(
      (b) => new Date(b.booking_date) >= now && (b.status === "confirmed" || b.status === "pending"),
    ).length

    const completedBookings = bookingsData.filter((b) => b.status === "completed").length
    const cancelledBookings = bookingsData.filter((b) => b.status === "cancelled").length

    // Find favorite time slot
    const timeMap = new Map()
    bookingsData.forEach((booking) => {
      const time = booking.start_time.slice(0, 5)
      timeMap.set(time, (timeMap.get(time) || 0) + 1)
    })
    const favoriteTime = Array.from(timeMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"

    // Find favorite court
    const courtMap = new Map()
    bookingsData.forEach((booking) => {
      const court = booking.courts?.name || "Unknown"
      courtMap.set(court, (courtMap.get(court) || 0) + 1)
    })
    const favoriteCourt = Array.from(courtMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"

    setStats({
      totalBookings,
      totalSpent,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      favoriteTime,
      favoriteCourt,
    })
  }

  const fetchCourts = async () => {
    try {
      const { data, error } = await supabase.from("courts").select("*").eq("is_active", true).order("name")
      if (error) throw error
      setCourts(data || [])
    } catch (error) {
      console.error("Error fetching courts:", error)
    }
  }

  const handleProfileUpdate = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.full_name || null,
          phone: profileData.phone || null,
        })
        .eq("id", user.id)

      if (error) throw error

      toast.success("Profile updated successfully")
      setEditingProfile(false)
      // Refresh the page to get updated profile data
      window.location.reload()
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast.error(error.message || "Failed to update profile")
    }
  }

  const canCancelBooking = (booking: Booking) => {
    if (!settings.allowCancellation) return false
    if (booking.status !== "pending" && booking.status !== "confirmed") return false

    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`)
    const now = new Date()
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    return hoursUntilBooking >= settings.cancellationHours
  }

  const handleCancelBooking = async () => {
    if (!cancellingBooking) return

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          notes: cancelReason || "Cancelled by user",
        })
        .eq("id", cancellingBooking.id)

      if (error) throw error

      toast.success("Booking cancelled successfully")
      setShowCancelDialog(false)
      setCancellingBooking(null)
      setCancelReason("")
      fetchUserData()
    } catch (error: any) {
      console.error("Error cancelling booking:", error)
      toast.error(error.message || "Failed to cancel booking")
    }
  }

  const handleBookCourt = (court?: Court) => {
    if (courts.length === 0) {
      toast.error("No courts available at the moment")
      return
    }

    // If no specific court provided, use the first available court
    const courtToBook = court || courts[0]
    setSelectedCourt(courtToBook)
    setShowBookingModal(true)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { className: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
      confirmed: { className: "bg-green-100 text-green-800", icon: CheckCircle },
      cancelled: { className: "bg-red-100 text-red-800", icon: X },
      completed: { className: "bg-blue-100 text-blue-800", icon: CheckCircle },
    }

    const variant = variants[status as keyof typeof variants] || {
      className: "bg-gray-100 text-gray-800",
      icon: AlertCircle,
    }
    const Icon = variant.icon

    return (
      <Badge className={variant.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const upcomingBookings = bookings.filter(
    (b) => new Date(b.booking_date) >= new Date() && (b.status === "confirmed" || b.status === "pending"),
  )
  const pastBookings = bookings.filter(
    (b) => new Date(b.booking_date) < new Date() || b.status === "completed" || b.status === "cancelled",
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-orange-500 text-white p-2 rounded-lg">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              <p className="text-sm text-gray-600">Manage your bookings and profile</p>
            </div>
          </div>
          <Button onClick={() => router.push("/")} variant="outline">
            Back to Home
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.upcomingBookings}</div>
                  <p className="text-xs text-muted-foreground">Confirmed & pending</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBookings}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Confirmed bookings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Favorite Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.favoriteTime}</div>
                  <p className="text-xs text-muted-foreground">Most booked time</p>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Upcoming Bookings</span>
                </CardTitle>
                <CardDescription>Your confirmed and pending bookings</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingBookings.slice(0, 3).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="bg-orange-100 p-2 rounded-lg">
                            <MapPin className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-medium">{booking.courts?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} -{" "}
                              {formatTime(booking.end_time)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">${booking.total_amount.toFixed(2)}</Badge>
                          {getStatusBadge(booking.status)}
                        </div>
                      </div>
                    ))}
                    {upcomingBookings.length > 3 && (
                      <p className="text-sm text-muted-foreground text-center">
                        And {upcomingBookings.length - 3} more upcoming bookings...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming bookings</h3>
                    <p className="text-gray-500 mb-4">Book a court to see your upcoming reservations here.</p>
                    <Button onClick={() => handleBookCourt()} className="bg-orange-500 hover:bg-orange-600">
                      Book a Court
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>All My Bookings</span>
                </CardTitle>
                <CardDescription>View and manage all your court bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Court</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{booking.courts?.name || "Unknown Court"}</TableCell>
                          <TableCell>{formatDate(booking.booking_date)}</TableCell>
                          <TableCell>
                            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                          </TableCell>
                          <TableCell>${booking.total_amount.toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(booking.status)}</TableCell>
                          <TableCell>
                            {canCancelBooking(booking) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCancellingBooking(booking)
                                  setShowCancelDialog(true)
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {bookings.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                    <p className="text-gray-500 mb-4">Start by booking your first court.</p>
                    <Button onClick={() => handleBookCourt()} className="bg-orange-500 hover:bg-orange-600">
                      Book Your First Court
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Profile Information</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditingProfile(!editingProfile)}>
                    <Edit className="h-4 w-4 mr-1" />
                    {editingProfile ? "Cancel" : "Edit"}
                  </Button>
                </CardTitle>
                <CardDescription>Manage your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {editingProfile ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={user.email || ""} disabled className="bg-gray-50" />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <Button onClick={() => setEditingProfile(false)} variant="outline" className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={handleProfileUpdate} className="flex-1 bg-orange-500 hover:bg-orange-600">
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium">Full Name</Label>
                        <p className="text-sm text-muted-foreground">{profile.full_name || "Not provided"}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium">Email</Label>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium">Phone Number</Label>
                        <p className="text-sm text-muted-foreground">{profile.phone || "Not provided"}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium">Member Since</Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Booking Statistics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Completed Bookings</span>
                    <Badge className="bg-green-100 text-green-800">{stats.completedBookings}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium">Upcoming Bookings</span>
                    <Badge className="bg-yellow-100 text-yellow-800">{stats.upcomingBookings}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium">Cancelled Bookings</span>
                    <Badge className="bg-red-100 text-red-800">{stats.cancelledBookings}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Preferences</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium">Favorite Time Slot</span>
                    <Badge className="bg-orange-100 text-orange-800">{stats.favoriteTime}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Favorite Court</span>
                    <Badge className="bg-blue-100 text-blue-800">{stats.favoriteCourt}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">Average per Booking</span>
                    <Badge className="bg-purple-100 text-purple-800">
                      ${stats.totalBookings > 0 ? (stats.totalSpent / stats.totalBookings).toFixed(2) : "0.00"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedCourt && (
        <BookingModal
          court={selectedCourt}
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false)
            setSelectedCourt(null)
            fetchUserData() // Refresh data after booking
          }}
        />
      )}

      {/* Cancel Booking Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {cancellingBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">{cancellingBooking.courts?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(cancellingBooking.booking_date)} • {formatTime(cancellingBooking.start_time)} -{" "}
                  {formatTime(cancellingBooking.end_time)}
                </div>
                <div className="text-sm font-medium">${cancellingBooking.total_amount.toFixed(2)}</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancelReason">Reason for cancellation (optional)</Label>
                <Textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Let us know why you're cancelling..."
                  rows={3}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelDialog(false)
                    setCancellingBooking(null)
                    setCancelReason("")
                  }}
                  className="flex-1"
                >
                  Keep Booking
                </Button>
                <Button onClick={handleCancelBooking} className="flex-1 bg-red-500 hover:bg-red-600">
                  Cancel Booking
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
