"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, Clock, DollarSign } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { formatDaysOfWeek, getDaysOfWeekOptions } from "@/lib/pricing"
import type { Database } from "@/lib/supabase"

type Court = Database["public"]["Tables"]["courts"]["Row"]
type PricingSchedule = Database["public"]["Tables"]["pricing_schedules"]["Row"] & {
  courts?: { name: string } | null
}

export default function PricingPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [pricingSchedules, setPricingSchedules] = useState<PricingSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<PricingSchedule | null>(null)
  const [formData, setFormData] = useState({
    court_id: "",
    name: "",
    start_time: "",
    end_time: "",
    rate: "",
    days_of_week: [] as number[],
    is_active: true,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch courts
      const { data: courtsData, error: courtsError } = await supabase
        .from("courts")
        .select("*")
        .eq("is_active", true)
        .order("name")

      if (courtsError) throw courtsError

      // Fetch pricing schedules with court names
      const { data: pricingData, error: pricingError } = await supabase
        .from("pricing_schedules")
        .select(
          `
          *,
          courts:court_id (name)
        `
        )
        .order("start_time")

      if (pricingError) throw pricingError

      setCourts(courtsData || [])
      setPricingSchedules(pricingData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.court_id || !formData.name || !formData.start_time || !formData.end_time || !formData.rate) {
      toast.error("Please fill in all required fields")
      return
    }

    if (formData.start_time >= formData.end_time) {
      toast.error("End time must be after start time")
      return
    }

    if (formData.days_of_week.length === 0) {
      toast.error("Please select at least one day of the week")
      return
    }

    try {
      const scheduleData = {
        court_id: formData.court_id,
        name: formData.name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        rate: Number.parseFloat(formData.rate),
        days_of_week: formData.days_of_week,
        is_active: formData.is_active,
      }

      if (editingSchedule) {
        const { error } = await supabase.from("pricing_schedules").update(scheduleData).eq("id", editingSchedule.id)

        if (error) throw error
        toast.success("Pricing schedule updated successfully")
      } else {
        const { error } = await supabase.from("pricing_schedules").insert([scheduleData])

        if (error) throw error
        toast.success("Pricing schedule created successfully")
      }

      setShowDialog(false)
      setEditingSchedule(null)
      resetForm()
      fetchData()
    } catch (error: any) {
      console.error("Error saving pricing schedule:", error)
      toast.error(error.message || "Failed to save pricing schedule")
    }
  }

  const handleEdit = (schedule: PricingSchedule) => {
    setEditingSchedule(schedule)
    setFormData({
      court_id: schedule.court_id,
      name: schedule.name,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      rate: schedule.rate.toString(),
      days_of_week: schedule.days_of_week,
      is_active: schedule.is_active,
    })
    setShowDialog(true)
  }

  const handleDelete = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this pricing schedule?")) return

    try {
      const { error } = await supabase.from("pricing_schedules").delete().eq("id", scheduleId)

      if (error) throw error
      toast.success("Pricing schedule deleted successfully")
      fetchData()
    } catch (error: any) {
      console.error("Error deleting pricing schedule:", error)
      toast.error(error.message || "Failed to delete pricing schedule")
    }
  }

  const resetForm = () => {
    setFormData({
      court_id: "",
      name: "",
      start_time: "",
      end_time: "",
      rate: "",
      days_of_week: [],
      is_active: true,
    })
  }

  const handleDayToggle = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day].sort(),
    }))
  }

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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time-Based Pricing</h1>
          <p className="text-muted-foreground">Configure different rates based on time of day and day of week</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pricing Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSchedule ? "Edit Pricing Schedule" : "Add New Pricing Schedule"}</DialogTitle>
              <DialogDescription>
                {editingSchedule ? "Update pricing schedule details" : "Create a new time-based pricing rule"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="court_id">Court</Label>
                <Select
                  value={formData.court_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, court_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a court" />
                  </SelectTrigger>
                  <SelectContent>
                    {courts.map((court) => (
                      <SelectItem key={court.id} value={court.id}>
                        {court.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Schedule Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Peak Hours, Weekend Premium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Select
                    value={formData.start_time}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, start_time: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Select
                    value={formData.end_time}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, end_time: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate">Hourly Rate ($)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.rate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rate: e.target.value }))}
                  placeholder="60.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="grid grid-cols-2 gap-2">
                  {getDaysOfWeekOptions().map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={formData.days_of_week.includes(day.value)}
                        onCheckedChange={() => handleDayToggle(day.value)}
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm font-normal">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Schedule is active</Label>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingSchedule ? "Update Schedule" : "Create Schedule"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pricing Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Pricing Schedules</span>
          </CardTitle>
          <CardDescription>Configure different hourly rates based on time of day and day of week</CardDescription>
        </CardHeader>
        <CardContent>
          {pricingSchedules.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pricing schedules configured</h3>
              <p className="text-gray-500 mb-4">
                Create time-based pricing rules to charge different rates during peak hours
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Schedule
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Court</TableHead>
                  <TableHead>Schedule Name</TableHead>
                  <TableHead>Time Range</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingSchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="font-medium">{schedule.courts?.name || "Unknown Court"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{schedule.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>
                          {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">${schedule.rate.toFixed(2)}/hr</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDaysOfWeek(schedule.days_of_week)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={schedule.is_active ? "default" : "secondary"}>
                        {schedule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(schedule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(schedule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Pricing Overview by Court */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Overview by Court</CardTitle>
          <CardDescription>Current pricing schedules for each court</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courts.map((court) => {
              const courtSchedules = pricingSchedules.filter(
                (schedule) => schedule.court_id === court.id && schedule.is_active
              )

              return (
                <Card key={court.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{court.name}</CardTitle>
                      <Badge variant="secondary">Default: ${court.hourly_rate}/hr</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {courtSchedules.length === 0 ? (
                      <p className="text-sm text-gray-500">No special pricing schedules. Uses default rate.</p>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        {courtSchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                          >
                            <div>
                              <p className="font-medium text-sm">{schedule.name}</p>
                              <p className="text-xs text-gray-600">
                                {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                              </p>
                              <p className="text-xs text-gray-600">{formatDaysOfWeek(schedule.days_of_week)}</p>
                            </div>
                            <Badge className="bg-green-100 text-green-800">${schedule.rate.toFixed(2)}/hr</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
