"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Settings, Clock, Shield, Database, Bell } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import type { Database as SupabaseDatabase } from "@/lib/supabase"

type Setting = SupabaseDatabase["public"]["Tables"]["settings"]["Row"]

interface SettingsData {
  maxSlotsPerBooking: number
  bookingAdvanceDays: number
  cancellationHours: number
  operatingHours: { start: string; end: string }
  slotDuration: number
  emailNotifications: boolean
  autoConfirmBookings: boolean
  allowMultipleSlots: boolean
  requirePhoneNumber: boolean
  maintenanceMode: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    maxSlotsPerBooking: 2,
    bookingAdvanceDays: 30,
    cancellationHours: 24,
    operatingHours: { start: "06:00", end: "23:00" },
    slotDuration: 60,
    emailNotifications: true,
    autoConfirmBookings: false,
    allowMultipleSlots: true,
    requirePhoneNumber: false,
    maintenanceMode: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from("settings").select("*")

      if (error) throw error

      const settingsMap = new Map(data?.map((setting) => [setting.key, setting.value]) || [])

      setSettings({
        maxSlotsPerBooking: Number(settingsMap.get("max_slots_per_booking")) || 2,
        bookingAdvanceDays: Number(settingsMap.get("booking_advance_days")) || 30,
        cancellationHours: Number(settingsMap.get("cancellation_hours")) || 24,
        operatingHours: settingsMap.get("operating_hours") || { start: "06:00", end: "23:00" },
        slotDuration: Number(settingsMap.get("slot_duration")) || 60,
        emailNotifications: Boolean(settingsMap.get("email_notifications")) !== false,
        autoConfirmBookings: Boolean(settingsMap.get("auto_confirm_bookings")) || false,
        allowMultipleSlots: Boolean(settingsMap.get("allow_multiple_slots")) !== false,
        requirePhoneNumber: Boolean(settingsMap.get("require_phone_number")) || false,
        maintenanceMode: Boolean(settingsMap.get("maintenance_mode")) || false,
      })
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast.error("Failed to fetch settings")
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: string, value: any, description?: string) => {
    try {
      const { error } = await supabase.from("settings").upsert({ key, value, description }, { onConflict: "key" })

      if (error) throw error
    } catch (error) {
      console.error(`Error updating ${key}:`, error)
      throw error
    }
  }

  const handleSaveBookingSettings = async () => {
    setSaving(true)
    try {
      await Promise.all([
        updateSetting(
          "max_slots_per_booking",
          settings.maxSlotsPerBooking,
          "Maximum number of time slots a user can book at once",
        ),
        updateSetting("booking_advance_days", settings.bookingAdvanceDays, "How many days in advance users can book"),
        updateSetting(
          "cancellation_hours",
          settings.cancellationHours,
          "Minimum hours before booking to allow cancellation",
        ),
        updateSetting("operating_hours", settings.operatingHours, "Daily operating hours"),
        updateSetting("slot_duration", settings.slotDuration, "Duration of each time slot in minutes"),
        updateSetting(
          "allow_multiple_slots",
          settings.allowMultipleSlots,
          "Allow users to book multiple consecutive slots",
        ),
      ])

      toast.success("Booking settings saved successfully")
    } catch (error) {
      toast.error("Failed to save booking settings")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSystemSettings = async () => {
    setSaving(true)
    try {
      await Promise.all([
        updateSetting("email_notifications", settings.emailNotifications, "Send email notifications for bookings"),
        updateSetting(
          "auto_confirm_bookings",
          settings.autoConfirmBookings,
          "Automatically confirm bookings without manual approval",
        ),
        updateSetting(
          "require_phone_number",
          settings.requirePhoneNumber,
          "Require phone number during user registration",
        ),
        updateSetting("maintenance_mode", settings.maintenanceMode, "Enable maintenance mode to disable bookings"),
      ])

      toast.success("System settings saved successfully")
    } catch (error) {
      toast.error("Failed to save system settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Configure your paddle court booking system</p>
      </div>

      <Tabs defaultValue="booking" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Booking Settings */}
        <TabsContent value="booking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Booking Configuration</span>
              </CardTitle>
              <CardDescription>Configure how users can book courts and time slots</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxSlots">Maximum Slots Per Booking</Label>
                  <Input
                    id="maxSlots"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxSlotsPerBooking}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, maxSlotsPerBooking: Number.parseInt(e.target.value) }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of consecutive time slots a user can book at once
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advanceDays">Booking Advance Days</Label>
                  <Input
                    id="advanceDays"
                    type="number"
                    min="1"
                    max="365"
                    value={settings.bookingAdvanceDays}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, bookingAdvanceDays: Number.parseInt(e.target.value) }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">How many days in advance users can make bookings</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancellationHours">Cancellation Hours</Label>
                  <Input
                    id="cancellationHours"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.cancellationHours}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, cancellationHours: Number.parseInt(e.target.value) }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum hours before booking start time to allow cancellation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slotDuration">Slot Duration (minutes)</Label>
                  <Select
                    value={settings.slotDuration.toString()}
                    onValueChange={(value) =>
                      setSettings((prev) => ({ ...prev, slotDuration: Number.parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                      <SelectItem value="120">120 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Duration of each bookable time slot</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Operating Hours</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Opening Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={settings.operatingHours.start}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            operatingHours: { ...prev.operatingHours, start: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Closing Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={settings.operatingHours.end}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            operatingHours: { ...prev.operatingHours, end: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="allowMultipleSlots"
                    checked={settings.allowMultipleSlots}
                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, allowMultipleSlots: checked }))}
                  />
                  <Label htmlFor="allowMultipleSlots">Allow Multiple Consecutive Slots</Label>
                </div>
              </div>

              <Button
                onClick={handleSaveBookingSettings}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {saving ? "Saving..." : "Save Booking Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>System Configuration</span>
              </CardTitle>
              <CardDescription>General system settings and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Auto-Confirm Bookings</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically confirm bookings without manual approval
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoConfirmBookings}
                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoConfirmBookings: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Require Phone Number</Label>
                    <p className="text-sm text-muted-foreground">
                      Require users to provide phone number during registration
                    </p>
                  </div>
                  <Switch
                    checked={settings.requirePhoneNumber}
                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, requirePhoneNumber: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Enable maintenance mode to disable new bookings</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {settings.maintenanceMode && <Badge variant="destructive">Active</Badge>}
                    <Switch
                      checked={settings.maintenanceMode}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, maintenanceMode: checked }))}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveSystemSettings}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {saving ? "Saving..." : "Save System Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Settings</span>
              </CardTitle>
              <CardDescription>Configure email and notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications for booking confirmations and updates
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailTemplate">Email Template</Label>
                  <Textarea
                    id="emailTemplate"
                    placeholder="Customize your email notification template..."
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use variables like {"{user_name}"}, {"{court_name}"}, {"{booking_date}"} in your template
                  </p>
                </div>
              </div>

              <Button disabled className="bg-orange-500 hover:bg-orange-600">
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security & Access</span>
              </CardTitle>
              <CardDescription>Manage security settings and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <Label className="text-base font-medium">Database Backup</Label>
                  <p className="text-sm text-muted-foreground mb-3">Last backup: Never</p>
                  <Button variant="outline" disabled>
                    <Database className="h-4 w-4 mr-2" />
                    Create Backup
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <Label className="text-base font-medium">User Roles</Label>
                  <p className="text-sm text-muted-foreground mb-3">Manage user permissions and access levels</p>
                  <div className="flex space-x-2">
                    <Badge variant="outline">Admin: Full Access</Badge>
                    <Badge variant="outline">Moderator: Limited Access</Badge>
                    <Badge variant="outline">User: Booking Only</Badge>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <Label className="text-base font-medium">API Access</Label>
                  <p className="text-sm text-muted-foreground mb-3">Configure API keys and external integrations</p>
                  <Button variant="outline" disabled>
                    Manage API Keys
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
