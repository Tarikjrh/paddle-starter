"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp, TrendingDown, Calendar, Clock, Activity } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface AnalyticsData {
  bookingsByDay: Array<{ date: string; bookings: number; revenue: number }>
  bookingsByHour: Array<{ hour: string; bookings: number }>
  bookingsByStatus: Array<{ status: string; count: number; color: string }>
  courtUtilization: Array<{ court: string; utilization: number; bookings: number }>
  monthlyTrends: Array<{ month: string; bookings: number; revenue: number; users: number }>
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    bookingsByDay: [],
    bookingsByHour: [],
    bookingsByStatus: [],
    courtUtilization: [],
    monthlyTrends: [],
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7d")

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    try {
      const endDate = new Date()
      const startDate = new Date()

      switch (timeRange) {
        case "7d":
          startDate.setDate(endDate.getDate() - 7)
          break
        case "30d":
          startDate.setDate(endDate.getDate() - 30)
          break
        case "90d":
          startDate.setDate(endDate.getDate() - 90)
          break
        case "1y":
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      // Fetch bookings data
      const { data: bookings } = await supabase
        .from("bookings")
        .select(
          `
          *,
          courts:court_id (name)
        `
        )
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())

      // Fetch courts data
      const { data: courts } = await supabase.from("courts").select("*")

      if (bookings && courts) {
        // Process bookings by day
        const bookingsByDay = processBookingsByDay(bookings)

        // Process bookings by hour
        const bookingsByHour = processBookingsByHour(bookings)

        // Process bookings by status
        const bookingsByStatus = processBookingsByStatus(bookings)

        // Process court utilization
        const courtUtilization = processCourtUtilization(bookings, courts)

        // Process monthly trends
        const monthlyTrends = processMonthlyTrends(bookings)

        setData({
          bookingsByDay,
          bookingsByHour,
          bookingsByStatus,
          courtUtilization,
          monthlyTrends,
        })
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setLoading(false)
    }
  }

  const processBookingsByDay = (bookings: any[]) => {
    const dayMap = new Map()

    bookings.forEach((booking) => {
      const date = new Date(booking.booking_date).toLocaleDateString()
      const existing = dayMap.get(date) || { date, bookings: 0, revenue: 0 }
      existing.bookings += 1
      if (booking.status === "confirmed" || booking.status === "completed") {
        existing.revenue += booking.total_amount
      }
      dayMap.set(date, existing)
    })

    return Array.from(dayMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const processBookingsByHour = (bookings: any[]) => {
    const hourMap = new Map()

    bookings.forEach((booking) => {
      const hour = booking.start_time.slice(0, 2) + ":00"
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
    })

    const hours = Array.from({ length: 18 }, (_, i) => {
      const hour = (i + 6).toString().padStart(2, "0") + ":00"
      return {
        hour,
        bookings: hourMap.get(hour) || 0,
      }
    })

    return hours
  }

  const processBookingsByStatus = (bookings: any[]) => {
    const statusMap = new Map()
    const colors = {
      pending: "#f59e0b",
      confirmed: "#10b981",
      cancelled: "#ef4444",
      completed: "#3b82f6",
    }

    bookings.forEach((booking) => {
      statusMap.set(booking.status, (statusMap.get(booking.status) || 0) + 1)
    })

    return Array.from(statusMap.entries()).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      color: colors[status as keyof typeof colors] || "#6b7280",
    }))
  }

  const processCourtUtilization = (bookings: any[], courts: any[]) => {
    const courtMap = new Map()

    bookings.forEach((booking) => {
      const courtName = booking.courts?.name || "Unknown Court"
      courtMap.set(courtName, (courtMap.get(courtName) || 0) + 1)
    })

    return courts.map((court) => {
      const bookingCount = courtMap.get(court.name) || 0
      // Calculate utilization as percentage (assuming 17 hours * days in range)
      const maxSlots = 17 * 7 // Simplified calculation
      const utilization = Math.min((bookingCount / maxSlots) * 100, 100)

      return {
        court: court.name,
        utilization: Math.round(utilization),
        bookings: bookingCount,
      }
    })
  }

  const processMonthlyTrends = (bookings: any[]) => {
    const monthMap = new Map()

    bookings.forEach((booking) => {
      const month = new Date(booking.booking_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      const existing = monthMap.get(month) || { month, bookings: 0, revenue: 0, users: new Set() }
      existing.bookings += 1
      if (booking.status === "confirmed" || booking.status === "completed") {
        existing.revenue += booking.total_amount
      }
      existing.users.add(booking.user_id)
      monthMap.set(month, existing)
    })

    return Array.from(monthMap.values()).map((item) => ({
      ...item,
      users: item.users.size,
    }))
  }

  const calculateTrend = (data: number[]) => {
    if (data.length < 2) return 0
    const recent = data.slice(-3).reduce((a, b) => a + b, 0) / 3
    const previous = data.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
    return previous === 0 ? 0 : ((recent - previous) / previous) * 100
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const bookingTrend = calculateTrend(data.bookingsByDay.map((d) => d.bookings))
  const revenueTrend = calculateTrend(data.bookingsByDay.map((d) => d.revenue))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Detailed insights into your paddle court business</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.bookingsByDay.reduce((sum, day) => sum + day.bookings, 0)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {bookingTrend > 0 ? <TrendingUp className="h-3 w-3 text-green-500 mr-1" /> : <TrendingDown className="h-3 w-3 text-red-500 mr-1" />}
              <span className={bookingTrend > 0 ? "text-green-500" : "text-red-500"}>{Math.abs(bookingTrend).toFixed(1)}%</span>
              <span className="ml-1">from previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.bookingsByDay.reduce((sum, day) => sum + day.revenue, 0).toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {revenueTrend > 0 ? <TrendingUp className="h-3 w-3 text-green-500 mr-1" /> : <TrendingDown className="h-3 w-3 text-red-500 mr-1" />}
              <span className={revenueTrend > 0 ? "text-green-500" : "text-red-500"}>{Math.abs(revenueTrend).toFixed(1)}%</span>
              <span className="ml-1">from previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Utilization</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(data.courtUtilization.reduce((sum, court) => sum + court.utilization, 0) / data.courtUtilization.length || 0)}%
            </div>
            <p className="text-xs text-muted-foreground">Across all courts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                data.bookingsByHour.reduce((max, hour) => (hour.bookings > max.bookings ? hour : max), {
                  hour: "N/A",
                  bookings: 0,
                }).hour
              }
            </div>
            <p className="text-xs text-muted-foreground">Most popular time slot</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bookings Over Time */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Bookings Over Time</CardTitle>
            <CardDescription>Daily booking trends and revenue</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            <ChartContainer
              config={{
                bookings: {
                  label: "Bookings",
                  color: "hsl(var(--chart-1))",
                },
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <LineChart data={data.bookingsByDay} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="bookings" stroke="var(--color-bookings)" name="Bookings" />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" name="Revenue ($)" />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Hourly Booking Distribution</CardTitle>
            <CardDescription>Popular time slots throughout the day</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            <ChartContainer
              config={{
                bookings: {
                  label: "Bookings",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <BarChart data={data.bookingsByHour} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" fill="var(--color-bookings)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Booking Status Distribution */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Booking Status Distribution</CardTitle>
            <CardDescription>Breakdown of booking statuses</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            <ChartContainer
              config={{
                count: {
                  label: "Count",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <PieChart margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                  <Pie
                    data={data.bookingsByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {data.bookingsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Court Utilization */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Court Utilization</CardTitle>
            <CardDescription>Usage percentage by court</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.courtUtilization.map((court) => (
                <div key={court.court} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{court.court}</span>
                    <div className="flex items-center space-x-2">
                      <span>{court.utilization}%</span>
                      <Badge variant="outline" className="text-xs">
                        {court.bookings} bookings
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${court.utilization}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
