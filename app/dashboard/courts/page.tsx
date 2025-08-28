"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import type { Database } from "@/lib/supabase"

type Court = Database["public"]["Tables"]["courts"]["Row"]

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingCourt, setEditingCourt] = useState<Court | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    hourly_rate: "",
    image_url: "",
    is_active: true,
    amenities: [] as string[],
  })

  useEffect(() => {
    fetchCourts()
  }, [])

  const fetchCourts = async () => {
    try {
      const { data, error } = await supabase.from("courts").select("*").order("name")

      if (error) throw error
      setCourts(data || [])
    } catch (error) {
      console.error("Error fetching courts:", error)
      toast.error("Failed to fetch courts")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const courtData = {
        name: formData.name,
        description: formData.description || null,
        hourly_rate: Number.parseFloat(formData.hourly_rate),
        image_url: formData.image_url || null,
        is_active: formData.is_active,
        amenities: formData.amenities.length > 0 ? formData.amenities : null,
      }

      if (editingCourt) {
        const { error } = await supabase.from("courts").update(courtData).eq("id", editingCourt.id)

        if (error) throw error
        toast.success("Court updated successfully")
      } else {
        const { error } = await supabase.from("courts").insert([courtData])

        if (error) throw error
        toast.success("Court created successfully")
      }

      setShowDialog(false)
      setEditingCourt(null)
      resetForm()
      fetchCourts()
    } catch (error: any) {
      console.error("Error saving court:", error)
      toast.error(error.message || "Failed to save court")
    }
  }

  const handleEdit = (court: Court) => {
    setEditingCourt(court)
    setFormData({
      name: court.name,
      description: court.description || "",
      hourly_rate: court.hourly_rate.toString(),
      image_url: court.image_url || "",
      is_active: court.is_active,
      amenities: court.amenities || [],
    })
    setShowDialog(true)
  }

  const handleDelete = async (courtId: string) => {
    if (!confirm("Are you sure you want to delete this court?")) return

    try {
      const { error } = await supabase.from("courts").delete().eq("id", courtId)

      if (error) throw error
      toast.success("Court deleted successfully")
      fetchCourts()
    } catch (error: any) {
      console.error("Error deleting court:", error)
      toast.error(error.message || "Failed to delete court")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      hourly_rate: "",
      image_url: "",
      is_active: true,
      amenities: [],
    })
  }

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      amenities: checked ? [...prev.amenities, amenity] : prev.amenities.filter((a) => a !== amenity),
    }))
  }

  const commonAmenities = [
    "Air Conditioning",
    "Professional Lighting",
    "Sound System",
    "Natural Setting",
    "Parking Available",
    "Changing Rooms",
    "Tournament Ready",
    "Spectator Seating",
    "Professional Equipment",
    "Wifi",
    "Refreshments",
  ]

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courts Management</h1>
          <p className="text-muted-foreground">Manage your paddle courts and their settings</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Court
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCourt ? "Edit Court" : "Add New Court"}</DialogTitle>
              <DialogDescription>
                {editingCourt ? "Update court information" : "Create a new paddle court"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Court Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Court 1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the court..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, hourly_rate: e.target.value }))}
                  placeholder="45.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL (Optional)</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/court-image.jpg"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Court is active</Label>
              </div>

              <div className="space-y-2">
                <Label>Amenities</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {commonAmenities.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={amenity}
                        checked={formData.amenities.includes(amenity)}
                        onChange={(e) => handleAmenityChange(amenity, e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor={amenity} className="text-xs">
                        {amenity}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false)
                    setEditingCourt(null)
                    resetForm()
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 ">
                  {editingCourt ? "Update" : "Create"} Court
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courts.map((court) => (
          <Card key={court.id} className="overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
              {court.image_url ? (
                <img
                  src={court.image_url || "/placeholder.svg"}
                  alt={court.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Clock className="h-12 w-12 text-orange-400" />
              )}
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{court.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    ${court.hourly_rate}/hr
                  </Badge>
                  <Badge
                    variant={court.is_active ? "default" : "secondary"}
                    className={court.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                  >
                    {court.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              {court.description && <CardDescription className="text-gray-600">{court.description}</CardDescription>}
            </CardHeader>
            <CardContent>
              {court.amenities && court.amenities.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Amenities</h4>
                  <div className="flex flex-wrap gap-1">
                    {court.amenities.slice(0, 3).map((amenity, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {court.amenities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{court.amenities.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(court)} className="flex-1">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(court.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {courts.length === 0 && (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No courts found</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first paddle court.</p>
          <Button onClick={() => setShowDialog(true)} className="">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Court
          </Button>
        </div>
      )}
    </div>
  )
}
