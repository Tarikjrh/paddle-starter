"use client"

import { Calendar, Home, Settings, Users, BarChart3, Clock, DollarSign } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/use-auth"

export function AppSidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()

  const navigationItems = [
    {
      title: "Overview",
      url: "/dashboard",
      icon: Home,
      roles: ["admin", "moderator"],
    },
    {
      title: "Bookings",
      url: "/dashboard/bookings",
      icon: Calendar,
      roles: ["admin", "moderator"],
    },
    {
      title: "Courts",
      url: "/dashboard/courts",
      icon: Clock,
      roles: ["admin", "moderator"],
    },
    {
      title: "Users",
      url: "/dashboard/users",
      icon: Users,
      roles: ["admin"],
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: BarChart3,
      roles: ["admin"],
    },
    {
      title: "Revenue",
      url: "/dashboard/revenue",
      icon: DollarSign,
      roles: ["admin"],
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
      roles: ["admin"],
    },
  ]

  const filteredItems = navigationItems.filter((item) => item.roles.includes(profile?.role || "user"))

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center space-x-2 px-4 py-2">
          <div className="bg-orange-500 text-white p-2 rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">PaddleCourt Pro</h1>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
                <span>Back to Site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
