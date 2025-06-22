"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarIcon, Clock, DollarSign } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import type { Database } from "@/lib/supabase"

type Court = Database["public"]["Tables"]["courts"]["Row"]
type Booking = Database["public"]["Tables"]["bookings"]["Row"]

interface BookingModalProps {
  court: Court
  isOpen: boolean
  onClose: () => void
}

export function BookingModal({ court, isOpen, onClose }: BookingModalProps) {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [existingBookings, setExistingBookings] = useState<Booking[]>([])
  const [maxSlots, setMaxSlots] = useState(2)

  // Add state for system settings at the top of the component
  const [systemSettings, setSystemSettings] = useState({
    autoConfirmBookings: false,
    maintenanceMode: false,
  })

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
    fetchSettings()
  }, [])

  // Add this useEffect to fetch system settings
  useEffect(() => {
    fetchSystemSettings()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      fetchBookingsForDate(selectedDate)
    }
  }, [selectedDate, court.id])

  const fetchSettings = async () => {
    const { data } = await supabase.from("settings").select("value").eq("key", "max_slots_per_booking").single()

    if (data) {
      setMaxSlots(Number.parseInt(data.value))
    }
  }

  // Add this function to fetch system settings
  const fetchSystemSettings = async () => {
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["auto_confirm_bookings", "maintenance_mode"])

    if (data) {
      const settingsMap = new Map(data.map((s) => [s.key, s.value]))
      setSystemSettings({
        autoConfirmBookings: Boolean(settingsMap.get("auto_confirm_bookings")) || false,
        maintenanceMode: Boolean(settingsMap.get("maintenance_mode")) || false,
      })
    }
  }

  const fetchBookingsForDate = async (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("court_id", court.id)
      .eq("booking_date", dateStr)
      .in("status", ["pending", "confirmed","completed"])

    if (error) {
      console.error("Error fetching bookings:", error)
    } else {
      setExistingBookings(data || [])
    }
  }

  const isSlotAvailable = (timeSlot: string) => {
    return !existingBookings.some((booking) => booking.start_time === timeSlot + ":00")
  }

  const handleSlotToggle = (timeSlot: string) => {
    if (!isSlotAvailable(timeSlot)) return

    setSelectedSlots((prev) => {
      if (prev.includes(timeSlot)) {
        return prev.filter((slot) => slot !== timeSlot)
      } else if (prev.length < maxSlots) {
        return [...prev, timeSlot].sort()
      } else {
        toast.error(`You can only book up to ${maxSlots} time slots at once`)
        return prev
      }
    })
  }

  const calculateTotal = () => {
    return selectedSlots.length * court.hourly_rate
  }

  // Update the handleBooking function to use auto-confirm setting
  const handleBooking = async () => {
    if (!user || !selectedDate || selectedSlots.length === 0) {
      toast.error("Please select a date and time slots")
      return
    }

    if (systemSettings.maintenanceMode) {
      toast.error("Booking is currently disabled for maintenance. Please try again later.")
      return
    }

    setLoading(true)

    try {
      const defaultStatus = systemSettings.autoConfirmBookings ? "confirmed" : "pending"

      const bookings = selectedSlots.map((slot) => ({
        user_id: user.id,
        court_id: court.id,
        booking_date: selectedDate.toISOString().split("T")[0],
        start_time: slot + ":00",
        end_time: (Number.parseInt(slot.split(":")[0]) + 1).toString().padStart(2, "0") + ":00",
        total_amount: court.hourly_rate,
        status: defaultStatus,
        notes: notes || null,
      }))

      const { error } = await supabase.from("bookings").insert(bookings)

      if (error) throw error

      const statusMessage = systemSettings.autoConfirmBookings
        ? "Booking confirmed successfully!"
        : "Booking created successfully! Awaiting confirmation."

      toast.success(statusMessage)
      onClose()
    } catch (error: any) {
      toast.error(error.message || "Failed to create booking")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Book {court.name}</span>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              ${court.hourly_rate}/hour
            </Badge>
          </DialogTitle>
          <DialogDescription>Select your preferred date and time slots for your booking.</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Date Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4" />
                <span>Select Date</span>
              </Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(Date.now()-1* 24 * 60 * 60 * 1000) || date > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                className="rounded-md border mt-2"
              />
            </div>
          </div>

          {/* Time Slots */}
          <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Available Time Slots</span>
            </Label>

            {selectedDate ? (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {timeSlots.map((slot) => {
                  const available = isSlotAvailable(slot)
                  const selected = selectedSlots.includes(slot)

                  return (
                    <Button
                      key={slot}
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      className={`
                        ${selected ? "bg-orange-500 hover:bg-orange-600" : ""}
                        ${!available ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                      disabled={!available}
                      onClick={() => handleSlotToggle(slot)}
                    >
                      {slot}
                    </Button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Please select a date first</p>
            )}

            <div className="text-xs text-gray-500">
              <p>• Green: Available</p>
              <p>• Orange: Selected</p>
              <p>• Gray: Unavailable</p>
              <p>• Maximum {maxSlots} slots per booking</p>
            </div>
          </div>
        </div>

        {/* Booking Summary */}
        {selectedSlots.length > 0 && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold flex items-center space-x-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Booking Summary</span>
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <p>Court: {court.name}</p>
                <p>Date: {selectedDate?.toLocaleDateString()}</p>
                <p>Time Slots: {selectedSlots.join(", ")}</p>
                <p className="font-semibold">
                  Total: ${calculateTotal().toFixed(2)} ({selectedSlots.length} × ${court.hourly_rate})
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any special requests or notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleBooking}
            disabled={loading || selectedSlots.length === 0 || !selectedDate}
            className="flex-1 bg-orange-500 hover:bg-orange-600"
          >
            {loading ? "Booking..." : `Book ${selectedSlots.length} Slot${selectedSlots.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
