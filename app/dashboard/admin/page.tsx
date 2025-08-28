"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Plus,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Settings,
  Activity,
  MapPin,
  DollarSign,
  Filter,
  Search,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  CalendarPlus,
  Footprints,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import type { Database } from "@/lib/supabase"

type Court = Database["public"]["Tables"]["courts"]["Row"]
type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  profiles: { full_name: string | null; email: string; phone: string | null } | null
  courts: { name: string } | null
}
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

interface PendingItems {
  bookings: Booking[]
  userVerifications: Profile[]
  courtRequests: any[]
}

interface WalkingSlot {
  courtId: string
  date: string
  startTime: string
  endTime: string
  price: number
  capacity: number
}

export default function AdminPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data states
  const [courts, setCourts] = useState<Court[]>([])
  const [pendingItems, setPendingItems] = useState<PendingItems>({
    bookings: [],
    userVerifications: [],
    courtRequests: [],
  })

  // Walking slot states
  const [showWalkingDialog, setShowWalkingDialog] = useState(false)
  const [walkingSlot, setWalkingSlot] = useState<WalkingSlot>({
    courtId: "",
    date: "",
    startTime: "",
    endTime: "",
    price: 0,
    capacity: 10,
  })

  // Filter states
  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [courtFilter, setCourtFilter] = useState("all")

  useEffect(() => {
    if (profile?.role === "admin") {
      fetchData()
    }
  }, [profile])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchCourts(), fetchPendingBookings(), fetchPendingUsers()])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load admin data")
    } finally {
      setLoading(false)
    }
  }

  const fetchCourts = async () => {
    const { data, error } = await supabase.from("courts").select("*").order("name")

    if (error) throw error
    setCourts(data || [])
  }

  const fetchPendingBookings = async () => {
    let query = supabase
      .from("bookings")
      .select(
        `
        *,
        profiles!bookings_user_id_fkey(full_name, email, phone),
        courts!bookings_court_id_fkey(name)
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    const { data, error } = await query
    if (error) throw error

    setPendingItems((prev) => ({
      ...prev,
      bookings: data || [],
    }))
  }

  const fetchPendingUsers = async () => {
    // For now, let's get recently registered users as "pending verifications"
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw error

    setPendingItems((prev) => ({
      ...prev,
      userVerifications: data || [],
    }))
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
    toast.success("Data refreshed")
  }

  const handleBookingAction = async (bookingId: string, action: "confirm" | "cancel") => {
    try {
      const status = action === "confirm" ? "confirmed" : "cancelled"

      const { error } = await supabase
        .from("bookings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", bookingId)

      if (error) throw error

      toast.success(`Booking ${action}ed successfully`)
      fetchPendingBookings()
    } catch (error) {
      console.error("Error updating booking:", error)
      toast.error(`Failed to ${action} booking`)
    }
  }

  const handleAddWalkingSlot = async () => {
    if (!walkingSlot.courtId || !walkingSlot.date || !walkingSlot.startTime || !walkingSlot.endTime) {
      toast.error("Please fill all required fields")
      return
    }

    // Validate that end time is after start time
    const startHour = parseInt(walkingSlot.startTime.split(":")[0])
    const endHour = parseInt(walkingSlot.endTime.split(":")[0])

    if (endHour <= startHour) {
      toast.error("End time must be after start time")
      return
    }

    try {
      // Check if there are any existing bookings that conflict
      const { data: existingBookings, error: checkError } = await supabase
        .from("bookings")
        .select("*")
        .eq("court_id", walkingSlot.courtId)
        .eq("booking_date", walkingSlot.date)
        .in("status", ["pending", "confirmed", "completed"])

      if (checkError) throw checkError

      // Check for time conflicts
      const hasConflict = existingBookings?.some((booking) => {
        const bookingStart = booking.start_time.substring(0, 5)
        const bookingEnd = booking.end_time.substring(0, 5)
        return walkingSlot.startTime < bookingEnd && walkingSlot.endTime > bookingStart
      })

      if (hasConflict) {
        toast.error("Time slot conflicts with existing booking")
        return
      }

      // Create the walking slot booking
      const { error } = await supabase.from("bookings").insert({
        court_id: walkingSlot.courtId,
        booking_date: walkingSlot.date,
        start_time: walkingSlot.startTime + ":00",
        end_time: walkingSlot.endTime + ":00",
        total_amount: walkingSlot.price,
        status: "confirmed",
        notes: `🚶‍♀️ Walking Time - Capacity: ${walkingSlot.capacity} people - Open access for walking/warmup`,
        user_id: profile?.id,
      })

      if (error) throw error

      toast.success("Walking slot added successfully")
      setShowWalkingDialog(false)
      setWalkingSlot({
        courtId: "",
        date: "",
        startTime: "",
        endTime: "",
        price: 0,
        capacity: 10,
      })
      fetchPendingBookings()
    } catch (error) {
      console.error("Error adding walking slot:", error)
      toast.error("Failed to add walking slot")
    }
  }

  const getTodaysDate = () => {
    return new Date().toISOString().split("T")[0]
  }

  if (!profile || profile.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>You don't have permission to access this admin panel.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Control Panel</h1>
          <p className="text-muted-foreground">Manage multiple operations from one place</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={showWalkingDialog} onOpenChange={setShowWalkingDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Footprints className="h-4 w-4" />
                Add Walking Slot
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Footprints className="h-5 w-5" />
                  Add Walking Slot
                </DialogTitle>
                <DialogDescription>
                  Create a walking/warmup time slot for a court. This allows people to access the court for walking and
                  warming up before their games.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="court">Court *</Label>
                  <Select
                    value={walkingSlot.courtId}
                    onValueChange={(value) => setWalkingSlot((prev) => ({ ...prev, courtId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a court" />
                    </SelectTrigger>
                    <SelectContent>
                      {courts
                        .filter((court) => court.is_active)
                        .map((court) => (
                          <SelectItem key={court.id} value={court.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{court.name}</span>
                              <span className="text-sm text-muted-foreground ml-2">${court.hourly_rate}/hr</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    min={getTodaysDate()}
                    value={walkingSlot.date}
                    onChange={(e) => setWalkingSlot((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Select
                      value={walkingSlot.startTime}
                      onValueChange={(value) => setWalkingSlot((prev) => ({ ...prev, startTime: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Start" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "06:00",
                          "07:00",
                          "08:00",
                          "09:00",
                          "10:00",
                          "11:00",
                          "12:00",
                          "13:00",
                          "14:00",
                          "15:00",
                          "16:00",
                          "17:00",
                          "18:00",
                          "19:00",
                          "20:00",
                          "21:00",
                        ].map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Select
                      value={walkingSlot.endTime}
                      onValueChange={(value) => setWalkingSlot((prev) => ({ ...prev, endTime: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="End" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "07:00",
                          "08:00",
                          "09:00",
                          "10:00",
                          "11:00",
                          "12:00",
                          "13:00",
                          "14:00",
                          "15:00",
                          "16:00",
                          "17:00",
                          "18:00",
                          "19:00",
                          "20:00",
                          "21:00",
                          "22:00",
                        ].map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={walkingSlot.price}
                      onChange={(e) => setWalkingSlot((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Usually free or low cost</p>
                  </div>
                  <div>
                    <Label htmlFor="capacity">Max People</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      max="50"
                      value={walkingSlot.capacity}
                      onChange={(e) =>
                        setWalkingSlot((prev) => ({ ...prev, capacity: parseInt(e.target.value) || 10 }))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">People allowed at once</p>
                  </div>
                </div>

                {/* Information Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-blue-800 mb-1">Walking Slot Info</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Perfect for warming up before games</li>
                    <li>• Allows casual walking and light exercise</li>
                    <li>• Usually scheduled before peak hours</li>
                    <li>• Can be free or low-cost for community access</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowWalkingDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddWalkingSlot}
                  disabled={!walkingSlot.courtId || !walkingSlot.date || !walkingSlot.startTime || !walkingSlot.endTime}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Walking Slot
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendingItems.bookings.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courts</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{courts.filter((court) => court.is_active).length}</div>
            <p className="text-xs text-muted-foreground">Total: {courts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{pendingItems.userVerifications.length}</div>
            <p className="text-xs text-muted-foreground">Last 10 registrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{pendingItems.bookings.length + courts.length}</div>
            <p className="text-xs text-muted-foreground">Items to process</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Pending Items
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            All Bookings
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="quick-actions" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Quick Actions
          </TabsTrigger>
        </TabsList>

        {/* Pending Items Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Pending Bookings ({pendingItems.bookings.length})
              </CardTitle>
              <CardDescription>Bookings awaiting approval or action</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingItems.bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No pending bookings</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Court</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingItems.bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{booking.profiles?.full_name || "Unknown"}</div>
                            <div className="text-sm text-muted-foreground">{booking.profiles?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{booking.courts?.name}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{booking.booking_date}</div>
                            <div className="text-sm text-muted-foreground">
                              {booking.start_time} - {booking.end_time}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">${booking.total_amount}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => handleBookingAction(booking.id, "confirm")}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleBookingAction(booking.id, "cancel")}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Bookings</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="Search bookings..." className="max-w-sm" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4" />
                <p>Use the existing Bookings page for detailed booking management</p>
                <Button variant="outline" className="mt-4">
                  <a href="/dashboard/bookings">Go to Bookings</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent User Registrations</CardTitle>
              <CardDescription>Latest user accounts created</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingItems.userVerifications.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.full_name || "Not provided"}</div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || "Not provided"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="quick-actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Footprints className="h-5 w-5" />
                  Walking Slots
                </CardTitle>
                <CardDescription>Add walking/warmup time slots to courts for open access</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setShowWalkingDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Walking Slot
                </Button>
                <div className="mt-2 text-xs text-muted-foreground">
                  Perfect for warming up before games or casual walking
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>Quick user actions and verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <a href="/dashboard/users" className="flex items-center justify-center">
                    <Eye className="h-4 w-4 mr-2" />
                    View All Users
                  </a>
                </Button>
                <div className="text-xs text-muted-foreground">
                  {pendingItems.userVerifications.length} recent registrations
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Court Management
                </CardTitle>
                <CardDescription>Manage courts and availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <a href="/dashboard/courts" className="flex items-center justify-center">
                    <Eye className="h-4 w-4 mr-2" />
                    Manage Courts
                  </a>
                </Button>
                <div className="text-xs text-muted-foreground">
                  {courts.filter((court) => court.is_active).length} active courts
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Settings
                </CardTitle>
                <CardDescription>Configure system-wide settings</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/dashboard/settings" className="flex items-center justify-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Open Settings
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Revenue & Analytics
                </CardTitle>
                <CardDescription>View financial reports and analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/dashboard/revenue" className="flex items-center justify-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Revenue
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarPlus className="h-5 w-5" />
                  Bulk Operations
                </CardTitle>
                <CardDescription>Perform bulk actions on bookings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (pendingItems.bookings.length === 0) {
                      toast.info("No pending bookings to confirm")
                      return
                    }

                    if (confirm(`Confirm all ${pendingItems.bookings.length} pending bookings?`)) {
                      Promise.all(
                        pendingItems.bookings.map((booking) => handleBookingAction(booking.id, "confirm"))
                      ).then(() => {
                        toast.success("All pending bookings confirmed")
                      })
                    }
                  }}
                  disabled={pendingItems.bookings.length === 0}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm All Pending
                </Button>
                <div className="text-xs text-muted-foreground">{pendingItems.bookings.length} bookings pending</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
