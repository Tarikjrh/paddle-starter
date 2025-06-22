"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { DollarSign, TrendingUp, TrendingDown, Calendar, Target, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface RevenueData {
  totalRevenue: number
  monthlyRevenue: Array<{ month: string; revenue: number; bookings: number }>
  revenueByStatus: Array<{ status: string; revenue: number; color: string }>
  revenueByHour: Array<{ hour: string; revenue: number }>
  revenueByDay: Array<{ day: string; revenue: number }>
  courtRevenue: Array<{ court: string; revenue: number; bookings: number; avgRate: number }>
  topCustomers: Array<{ name: string; email: string; totalSpent: number; bookings: number }>
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData>({
    totalRevenue: 0,
    monthlyRevenue: [],
    revenueByStatus: [],
    revenueByHour: [],
    revenueByDay: [],
    courtRevenue: [],
    topCustomers: [],
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30d")

  useEffect(() => {
    fetchRevenueData()
  }, [timeRange])

  const fetchRevenueData = async () => {
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

      // Fetch bookings with related data
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          *,
          courts:court_id (name, hourly_rate),
          profiles:user_id (full_name, email)
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())

      if (bookings) {
        const processedData = processRevenueData(bookings)
        setData(processedData)
      }
    } catch (error) {
      console.error("Error fetching revenue data:", error)
    } finally {
      setLoading(false)
    }
  }

  const processRevenueData = (bookings: any[]): RevenueData => {
    // Filter confirmed and completed bookings for revenue calculations
    const paidBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "completed")

    // Total revenue
    const totalRevenue = paidBookings.reduce((sum, booking) => sum + booking.total_amount, 0)

    // Monthly revenue
    const monthlyMap = new Map()
    paidBookings.forEach((booking) => {
      const month = new Date(booking.booking_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      const existing = monthlyMap.get(month) || { month, revenue: 0, bookings: 0 }
      existing.revenue += booking.total_amount
      existing.bookings += 1
      monthlyMap.set(month, existing)
    })
    const monthlyRevenue = Array.from(monthlyMap.values()).sort(
      (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime(),
    )

    // Revenue by status
    const statusMap = new Map()
    const statusColors = {
      confirmed: "#10b981",
      completed: "#3b82f6",
      pending: "#f59e0b",
      cancelled: "#ef4444",
    }

    bookings.forEach((booking) => {
      const revenue = booking.status === "confirmed" || booking.status === "completed" ? booking.total_amount : 0
      statusMap.set(booking.status, (statusMap.get(booking.status) || 0) + revenue)
    })

    const revenueByStatus = Array.from(statusMap.entries()).map(([status, revenue]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      revenue,
      color: statusColors[status as keyof typeof statusColors] || "#6b7280",
    }))

    // Revenue by hour
    const hourMap = new Map()
    paidBookings.forEach((booking) => {
      const hour = booking.start_time.slice(0, 2) + ":00"
      hourMap.set(hour, (hourMap.get(hour) || 0) + booking.total_amount)
    })

    const revenueByHour = Array.from({ length: 18 }, (_, i) => {
      const hour = (i + 6).toString().padStart(2, "0") + ":00"
      return {
        hour,
        revenue: hourMap.get(hour) || 0,
      }
    })

    // Revenue by day of week
    const dayMap = new Map()
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    paidBookings.forEach((booking) => {
      const dayIndex = new Date(booking.booking_date).getDay()
      const dayName = dayNames[dayIndex]
      dayMap.set(dayName, (dayMap.get(dayName) || 0) + booking.total_amount)
    })

    const revenueByDay = dayNames.map((day) => ({
      day,
      revenue: dayMap.get(day) || 0,
    }))

    // Court revenue
    const courtMap = new Map()
    paidBookings.forEach((booking) => {
      const courtName = booking.courts?.name || "Unknown Court"
      const existing = courtMap.get(courtName) || { court: courtName, revenue: 0, bookings: 0, totalRate: 0 }
      existing.revenue += booking.total_amount
      existing.bookings += 1
      existing.totalRate += booking.courts?.hourly_rate || 0
      courtMap.set(courtName, existing)
    })

    const courtRevenue = Array.from(courtMap.values())
      .map((court) => ({
        ...court,
        avgRate: court.bookings > 0 ? court.totalRate / court.bookings : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // Top customers
    const customerMap = new Map()
    paidBookings.forEach((booking) => {
      const email = booking.profiles?.email || "Unknown"
      const name = booking.profiles?.full_name || "Unknown User"
      const existing = customerMap.get(email) || { name, email, totalSpent: 0, bookings: 0 }
      existing.totalSpent += booking.total_amount
      existing.bookings += 1
      customerMap.set(email, existing)
    })

    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    return {
      totalRevenue,
      monthlyRevenue,
      revenueByStatus,
      revenueByHour,
      revenueByDay,
      courtRevenue,
      topCustomers,
    }
  }

  const calculateGrowthRate = (data: Array<{ revenue: number }>) => {
    if (data.length < 2) return 0
    const recent = data[data.length - 1]?.revenue || 0
    const previous = data[data.length - 2]?.revenue || 0
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

  const growthRate = calculateGrowthRate(data.monthlyRevenue)
  const avgRevenuePerBooking =
    data.courtRevenue.reduce((sum, court) => sum + court.revenue, 0) /
      data.courtRevenue.reduce((sum, court) => sum + court.bookings, 0) || 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Dashboard</h1>
          <p className="text-muted-foreground">Track your financial performance and revenue streams</p>
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

      {/* Revenue Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalRevenue.toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {growthRate > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={growthRate > 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(growthRate).toFixed(1)}%
              </span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Revenue/Booking</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgRevenuePerBooking.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per confirmed booking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Court Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.courtRevenue[0]?.revenue.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground">{data.courtRevenue[0]?.court || "No data"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Revenue Hour</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                data.revenueByHour.reduce((max, hour) => (hour.revenue > max.revenue ? hour : max), {
                  hour: "N/A",
                  revenue: 0,
                }).hour
              }
            </div>
            <p className="text-xs text-muted-foreground">
              $
              {data.revenueByHour
                .reduce((max, hour) => (hour.revenue > max.revenue ? hour : max), { hour: "N/A", revenue: 0 })
                .revenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
            <CardDescription>Revenue and booking volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--chart-1))",
                },
                bookings: {
                  label: "Bookings",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" name="Revenue ($)" />
                  <Line type="monotone" dataKey="bookings" stroke="var(--color-bookings)" name="Bookings" />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue by Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Day of Week</CardTitle>
            <CardDescription>Which days generate the most revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Booking Status</CardTitle>
            <CardDescription>Revenue breakdown by booking status</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.revenueByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                    label={({ status, revenue }) => `${status}: $${revenue.toFixed(2)}`}
                  >
                    {data.revenueByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Hourly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Hourly Revenue Distribution</CardTitle>
            <CardDescription>Revenue generated by time of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueByHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Tables */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Court Revenue Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Court Revenue Performance</CardTitle>
            <CardDescription>Revenue breakdown by court</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Court</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Avg. Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.courtRevenue.map((court) => (
                  <TableRow key={court.court}>
                    <TableCell className="font-medium">{court.court}</TableCell>
                    <TableCell>${court.revenue.toFixed(2)}</TableCell>
                    <TableCell>{court.bookings}</TableCell>
                    <TableCell>${court.avgRate.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
            <CardDescription>Highest spending customers</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Avg/Booking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topCustomers.map((customer) => (
                  <TableRow key={customer.email}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        ${customer.totalSpent.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.bookings}</TableCell>
                    <TableCell>${(customer.totalSpent / customer.bookings).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
