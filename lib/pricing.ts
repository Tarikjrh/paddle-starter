import { supabase } from "./supabase"
import type { Database } from "./supabase"

type PricingSchedule = Database["public"]["Tables"]["pricing_schedules"]["Row"]

/**
 * Calculate the price for a court booking based on date and time
 */
export async function calculateCourtPrice(courtId: string, bookingDate: Date, startTime: string): Promise<number> {
  try {
    // Get day of week (convert JS 0=Sunday to our format 7=Sunday, 1=Monday)
    const dayOfWeek = bookingDate.getDay() === 0 ? 7 : bookingDate.getDay()

    // First, try to find a matching pricing schedule
    const { data: pricingSchedules, error: pricingError } = await supabase
      .from("pricing_schedules")
      .select("*")
      .eq("court_id", courtId)
      .eq("is_active", true)
      .contains("days_of_week", [dayOfWeek])
      .lte("start_time", startTime)
      .gt("end_time", startTime)
      .order("rate", { ascending: false }) // Use highest rate if multiple schedules match
      .limit(1)

    if (pricingError) {
      console.error("Error fetching pricing schedules:", pricingError)
      // Fall back to default court rate
      return getDefaultCourtRate(courtId)
    }

    // If we found a matching pricing schedule, use its rate
    if (pricingSchedules && pricingSchedules.length > 0) {
      return pricingSchedules[0].rate
    }

    // No pricing schedule found, use court's default rate
    return getDefaultCourtRate(courtId)
  } catch (error) {
    console.error("Error calculating court price:", error)
    return getDefaultCourtRate(courtId)
  }
}

/**
 * Get the default hourly rate for a court
 */
async function getDefaultCourtRate(courtId: string): Promise<number> {
  try {
    const { data: court, error } = await supabase.from("courts").select("hourly_rate").eq("id", courtId).single()

    if (error) throw error
    return court?.hourly_rate || 0
  } catch (error) {
    console.error("Error fetching default court rate:", error)
    return 0
  }
}

/**
 * Get all pricing schedules for a court
 */
export async function getCourtPricingSchedules(courtId: string): Promise<PricingSchedule[]> {
  try {
    const { data, error } = await supabase
      .from("pricing_schedules")
      .select("*")
      .eq("court_id", courtId)
      .eq("is_active", true)
      .order("start_time")

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching pricing schedules:", error)
    return []
  }
}

/**
 * Calculate total amount for multiple time slots
 */
export async function calculateTotalBookingAmount(
  courtId: string,
  bookingDate: Date,
  timeSlots: string[]
): Promise<number> {
  let total = 0

  for (const timeSlot of timeSlots) {
    const price = await calculateCourtPrice(courtId, bookingDate, timeSlot + ":00")
    total += price
  }

  return total
}

/**
 * Get pricing breakdown for display purposes
 */
export async function getPricingBreakdown(
  courtId: string,
  bookingDate: Date,
  timeSlots: string[]
): Promise<Array<{ timeSlot: string; price: number }>> {
  const breakdown: Array<{ timeSlot: string; price: number }> = []

  for (const timeSlot of timeSlots) {
    const price = await calculateCourtPrice(courtId, bookingDate, timeSlot + ":00")
    breakdown.push({ timeSlot, price })
  }

  return breakdown
}

/**
 * Format day of week array for display
 */
export function formatDaysOfWeek(daysArray: number[]): string {
  const dayNames = {
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
    7: "Sun",
  }

  return daysArray.map((day) => dayNames[day as keyof typeof dayNames]).join(", ")
}

/**
 * Get all days of week as options for forms
 */
export function getDaysOfWeekOptions() {
  return [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 7, label: "Sunday" },
  ]
}
