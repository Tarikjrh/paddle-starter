import nodemailer from "nodemailer"
import { supabase } from "@/lib/supabase"

// Simple rate limiting (consider using a proper rate limiter like upstash-ratelimit)
const rateLimitMap = new Map()

function rateLimit(ip) {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const max = 5 // max 5 emails per minute per IP

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  const record = rateLimitMap.get(ip)
  if (now > record.resetTime) {
    record.count = 1
    record.resetTime = now + windowMs
    return true
  }

  if (record.count >= max) {
    return false
  }

  record.count++
  return true
}

export async function POST(req) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    if (!rateLimit(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
    }

    // Verify the request is from your domain (for production)
    const origin = req.headers.get("origin")
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"]

    if (process.env.NODE_ENV === "production" && origin && !allowedOrigins.includes(origin)) {
      return new Response("Forbidden", { status: 403 })
    }

    // Get auth token from header
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 })
    }

    const token = authHeader.split(" ")[1]

    // Verify the token with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    // console.log("🚀 ~ POST ~ profile:", profile)
    // // Only allow admins to send emails (adjust based on your needs)
    // if (profile?.role !== "admin") {
    //   return new Response("Forbidden", { status: 403 })
    // }

    const body = await req.json()
    const { to, subject, message } = body

    // Validate email data
    if (!to || !subject || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      html: `<p>${message}</p>`,
    })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    console.error("Email sending error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 })
  }
}
