"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MapPin,
  Edit,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { formatDateForDB } from "@/lib/utils"
import type { Database } from "@/lib/supabase"

type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  profiles: {
    full_name: string | null
    email: string
    phone: string | null
  } | null
  courts: { name: string; hourly_rate: number } | null
}

type Court = Database["public"]["Tables"]["courts"]["Row"]

interface CalendarDay {
  date: Date
  bookings: Booking[]
  isCurrentMonth: boolean
  isToday: boolean
}

type CalendarView = "day" | "week" | "month"

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourt, setSelectedCourt] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [editingStatus, setEditingStatus] = useState<string>("")
  const [editingNotes, setEditingNotes] = useState<string>("")
  const [view, setView] = useState<CalendarView>("month")

  const timeSlots = [
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
    "22:00",
  ]

  useEffect(() => {
    fetchData()
  }, [currentDate, selectedCourt, view])

  const fetchData = async () => {
    try {
      let startDate, endDate

      // Calculate date range based on current view
      if (view === "day") {
        startDate = new Date(currentDate)
        endDate = new Date(currentDate)
      } else if (view === "week") {
        // Get start of week (Sunday)
        startDate = new Date(currentDate)
        startDate.setDate(currentDate.getDate() - currentDate.getDay())

        // Get end of week (Saturday)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
      } else {
        // Month view - get start and end of current month
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      }

      // Fetch bookings for the date range
      let query = supabase
        .from("bookings")
        .select(
          `
          *,
          profiles:user_id (full_name, email, phone),
          courts:court_id (name, hourly_rate)
        `
        )
        .gte("booking_date", formatDateForDB(startDate))
        .lte("booking_date", formatDateForDB(endDate))
        .order("booking_date")
        .order("start_time")

      if (selectedCourt !== "all") {
        query = query.eq("court_id", selectedCourt)
      }

      const { data: bookingsData, error: bookingsError } = await query

      if (bookingsError) throw bookingsError

      // Fetch courts
      const { data: courtsData, error: courtsError } = await supabase
        .from("courts")
        .select("*")
        .eq("is_active", true)
        .order("name")

      if (courtsError) throw courtsError

      setBookings(bookingsData || [])
      setCourts(courtsData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to fetch calendar data")
    } finally {
      setLoading(false)
    }
  }

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDayOfMonth.getDay()

    const days: CalendarDay[] = []
    const today = new Date()

    // Add days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({
        date,
        bookings: [],
        isCurrentMonth: false,
        isToday: false,
      })
    }

    // Add days of current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day)
      const dayBookings = bookings.filter(
        (booking) => new Date(booking.booking_date).toDateString() === date.toDateString()
      )

      days.push({
        date,
        bookings: dayBookings,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
      })
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({
        date,
        bookings: [],
        isCurrentMonth: false,
        isToday: false,
      })
    }

    return days
  }

  const navigateCalendar = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (view === "day") {
        // Navigate by day
        newDate.setDate(prev.getDate() + (direction === "prev" ? -1 : 1))
      } else if (view === "week") {
        // Navigate by week
        newDate.setDate(prev.getDate() + (direction === "prev" ? -7 : 7))
      } else {
        // Navigate by month
        newDate.setMonth(prev.getMonth() + (direction === "prev" ? -1 : 1))
      }
      return newDate
    })
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      completed: "bg-blue-100 text-blue-800",
    }

    return (
      <Badge className={variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking)
    setEditingStatus(booking.status)
    setEditingNotes(booking.notes || "")
    setShowBookingDialog(true)
  }

  const handleUpdateBooking = async () => {
    if (!selectedBooking) return

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: editingStatus,
          notes: editingNotes || null,
        })
        .eq("id", selectedBooking.id)

      if (error) throw error

      toast.success("Booking updated successfully")
      setShowBookingDialog(false)
      fetchData()
    } catch (error: any) {
      console.error("Error updating booking:", error)
      toast.error(error.message || "Failed to update booking")
    }
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const calendarDays = generateCalendarDays()

  // Get week dates for week view
  const getWeekDates = () => {
    const dates = []
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }

    return dates
  }

  // Filter bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    return bookings.filter((booking) => new Date(booking.booking_date).toDateString() === date.toDateString())
  }

  // Get current view title
  const getCurrentViewTitle = () => {
    if (view === "day") {
      return formatDate(currentDate)
    } else if (view === "week") {
      const weekDates = getWeekDates()
      return `${weekDates[0].toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${weekDates[6].toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    } else {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    }
  }

  // Render Day View
  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate)

    return (
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-medium">{formatDate(currentDate)}</h3>
        </div>
        <div className="divide-y">
          {timeSlots.map((time) => {
            const slotBookings = dayBookings.filter((booking) => formatTime(booking.start_time) === time)

            return (
              <div key={time} className="flex min-h-[60px]">
                <div className="w-16 p-2 text-xs text-gray-500 border-r flex items-start">{time}</div>
                <div className="flex-1 p-1">
                  {slotBookings.map((booking) => (
                    <div
                      key={booking.id}
                      onClick={() => handleBookingClick(booking)}
                      className={`
                        cursor-pointer p-2 mb-1 rounded text-sm
                        ${
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : booking.status === "pending"
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            : booking.status === "cancelled"
                            ? "bg-red-100 text-red-800 hover:bg-red-200"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                        }
                      `}
                    >
                      <div className="font-medium">{booking.courts?.name}</div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </span>
                      </div>
                      <div className="truncate">{booking.profiles?.full_name || booking.profiles?.email}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Render Week View
  const renderWeekView = () => {
    const weekDates = getWeekDates()

    return (
      <div className="bg-white rounded-lg border">
        <div className="grid grid-cols-8 border-b">
          <div className="p-2 border-r"></div>
          {weekDates.map((date, index) => (
            <div
              key={index}
              className={`p-2 text-center ${date.toDateString() === new Date().toDateString() ? "bg-blue-50" : ""}`}
            >
              <div className="text-xs text-gray-500">{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div
                className={`font-medium ${date.toDateString() === new Date().toDateString() ? "text-blue-600" : ""}`}
              >
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-8">
          <div className="border-r">
            {timeSlots.map((time) => (
              <div key={time} className="h-20 p-2 text-xs text-gray-500 border-b">
                {time}
              </div>
            ))}
          </div>

          {weekDates.map((date, dateIndex) => (
            <div key={dateIndex} className="border-r last:border-r-0">
              {timeSlots.map((time, timeIndex) => {
                const slotBookings = getBookingsForDate(date).filter(
                  (booking) => formatTime(booking.start_time) === time
                )

                return (
                  <div key={`${dateIndex}-${timeIndex}`} className="h-20 border-b p-1 overflow-hidden">
                    {slotBookings.map((booking) => (
                      <div
                        key={booking.id}
                        onClick={() => handleBookingClick(booking)}
                        className={`
                          cursor-pointer p-1 mb-1 rounded text-xs
                          ${
                            booking.status === "confirmed"
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : booking.status === "pending"
                              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                              : booking.status === "cancelled"
                              ? "bg-red-100 text-red-800 hover:bg-red-200"
                              : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                          }
                        `}
                      >
                        <div className="font-medium truncate">{booking.courts?.name}</div>
                        <div className="truncate">{booking.profiles?.full_name || booking.profiles?.email}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render Month View
  const renderMonthView = () => {
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-2 text-center font-semibold text-sm text-gray-600 border-b">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`
              min-h-[120px] p-1 border border-gray-200 
              ${!day.isCurrentMonth ? "bg-gray-50" : "bg-white"}
              ${day.isToday ? "bg-blue-50 border-blue-300" : ""}
            `}
          >
            <div
              className={`
              text-sm font-medium mb-1
              ${!day.isCurrentMonth ? "text-gray-400" : "text-gray-900"}
              ${day.isToday ? "text-blue-600" : ""}
            `}
            >
              {day.date.getDate()}
            </div>

            {/* Bookings for this day */}
            <div className="space-y-1">
              {day.bookings.slice(0, 3).map((booking) => (
                <div
                  key={booking.id}
                  className="group relative cursor-pointer"
                  onClick={() => handleBookingClick(booking)}
                >
                  <div
                    className={`
                    text-xs p-1 rounded truncate transition-all duration-200
                    ${
                      booking.status === "confirmed"
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : booking.status === "pending"
                        ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        : booking.status === "cancelled"
                        ? "bg-red-100 text-red-800 hover:bg-red-200"
                        : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                    }
                  `}
                  >
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(booking.start_time)}</span>
                    </div>
                    <div className="truncate font-medium">{booking.courts?.name}</div>
                    <div className="truncate">{booking.profiles?.full_name || booking.profiles?.email}</div>
                  </div>

                  {/* Hover tooltip */}
                  <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded p-2 -top-2 left-full ml-2 whitespace-nowrap">
                    <div className="font-medium">{booking.courts?.name}</div>
                    <div>
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </div>
                    <div>{booking.profiles?.full_name || "Unknown User"}</div>
                    <div>{booking.profiles?.email}</div>
                    <div className="mt-1">
                      <Badge className="text-xs">
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}

              {day.bookings.length > 3 && (
                <div className="text-xs text-gray-500 p-1">+{day.bookings.length - 3} more</div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booking Calendar</h1>
          <p className="text-muted-foreground">View and manage all court bookings in calendar format</p>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={selectedCourt} onValueChange={setSelectedCourt}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by court" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courts</SelectItem>
              {courts.map((court) => (
                <SelectItem key={court.id} value={court.id}>
                  {court.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>{getCurrentViewTitle()}</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex bg-muted rounded-md p-1">
                <Button
                  variant={view === "day" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("day")}
                  className="rounded-sm"
                >
                  Day
                </Button>
                <Button
                  variant={view === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("week")}
                  className="rounded-sm"
                >
                  Week
                </Button>
                <Button
                  variant={view === "month" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("month")}
                  className="rounded-sm"
                >
                  Month
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateCalendar("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateCalendar("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {view === "day" && renderDayView()}
          {view === "week" && renderWeekView()}
          {view === "month" && renderMonthView()}
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Booking Details</span>
            </DialogTitle>
            <DialogDescription>View and manage booking information</DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              {/* Booking Info */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{selectedBooking.courts?.name}</span>
                  <Badge variant="secondary">${selectedBooking.courts?.hourly_rate}/hr</Badge>
                </div>

                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <span>{formatDate(new Date(selectedBooking.booking_date))}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>
                    {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">{selectedBooking.profiles?.full_name || "Unknown User"}</div>
                    <div className="text-sm text-gray-600">{selectedBooking.profiles?.email}</div>
                    {selectedBooking.profiles?.phone && (
                      <div className="text-sm text-gray-600">{selectedBooking.profiles.phone}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    ${selectedBooking.total_amount.toFixed(2)}
                  </Badge>
                </div>
              </div>

              {/* Edit Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Booking Status</Label>
                <Select value={editingStatus} onValueChange={setEditingStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Edit Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Add notes about this booking..."
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setShowBookingDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateBooking}
                  className="flex-1 "
                  disabled={editingStatus === selectedBooking.status && editingNotes === (selectedBooking.notes || "")}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Update Booking
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-2 pt-2 border-t">
                {selectedBooking.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingStatus("confirmed")
                        handleUpdateBooking()
                      }}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingStatus("cancelled")
                        handleUpdateBooking()
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </>
                )}

                {selectedBooking.status === "confirmed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingStatus("completed")
                      handleUpdateBooking()
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
