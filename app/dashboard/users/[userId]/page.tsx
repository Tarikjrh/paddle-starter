import React from "react"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase-server"
import type { Database } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type Booking = Database["public"]["Tables"]["bookings"]["Row"]

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" })
}

export default async function UserDetailsPage({ params }: { params: { userId: string } }) {
  const supabase = createServerClient()

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.userId)
    .maybeSingle()

  if (profileError) {
    console.error(profileError)
  }

  if (!profile) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">User not found</h2>
        <p className="text-sm text-muted-foreground">The requested user does not exist.</p>
        <div className="mt-4">
          <Link href="/dashboard/users">
            <Button variant="ghost">Back to users</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Fetch bookings for user
  const { data: bookingsData } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", params.userId)
    .order("booking_date", { ascending: false })

  const bookings: Booking[] = bookingsData || []

  // Fetch court names for bookings (if any)
  const courtIds = Array.from(new Set(bookings.map((b) => b.court_id))).filter(Boolean)
  let courtsMap: Record<string, { id: string; name: string }> = {}

  if (courtIds.length > 0) {
    const { data: courts } = await supabase.from("courts").select("id,name").in("id", courtIds)
    if (courts) {
      courtsMap = courts.reduce((acc: any, c: any) => ({ ...acc, [c.id]: c }), {})
    }
  }

  // Compute stats (count only confirmed/completed bookings for spend)
  const billableBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "completed")
  const totalSpent = billableBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
  const bookingCount = billableBookings.length
  const avgSpend = bookingCount > 0 ? totalSpent / bookingCount : 0
  const lastBooking = billableBookings.length > 0 ? billableBookings[0] : null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Details</h1>
          <p className="text-sm text-muted-foreground">Details, booking history and spend for the user</p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/users">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-lg font-medium">{profile.full_name || "No name"}</div>
              <div className="text-sm text-muted-foreground">{profile.email}</div>
              <div className="text-sm">{profile.phone || "No phone"}</div>
              <div className="text-sm text-muted-foreground">Role: {profile.role}</div>
              <div className="text-sm text-muted-foreground">
                Joined: {new Date(profile.created_at).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Total Bookings</div>
                <div className="font-medium">{bookingCount}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Total Spent</div>
                <div className="font-medium">{formatCurrency(totalSpent)}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Average Booking</div>
                <div className="font-medium">{formatCurrency(avgSpend)}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Last Booking</div>
                <div className="font-medium">
                  {lastBooking ? new Date(lastBooking.booking_date).toLocaleDateString() : "Never"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              <Button asChild>
                <Link href={`/dashboard/users/${profile.id}/edit`}>Edit User</Link>
              </Button>
              <Button variant="ghost">Send Message</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking History ({bookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-sm text-muted-foreground">No bookings found for this user.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Court</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{new Date(b.booking_date).toLocaleDateString()}</TableCell>
                      <TableCell>{courtsMap[b.court_id]?.name || b.court_id}</TableCell>
                      <TableCell>{b.start_time}</TableCell>
                      <TableCell>{b.end_time}</TableCell>
                      <TableCell>{formatCurrency(b.total_amount || 0)}</TableCell>
                      <TableCell className="capitalize">{b.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
