import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard, Clock, Users, Film, Search,
  Sun, Moon, RotateCcw, Youtube,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useData } from "@/context/DataContext"
import { useTheme } from "@/context/ThemeContext"

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Vue d'ensemble" },
  { to: "/timeline", icon: Clock, label: "Timeline" },
  { to: "/channels", icon: Users, label: "Chaînes" },
  { to: "/videos", icon: Film, label: "Vidéos" },
  { to: "/search", icon: Search, label: "Recherches" },
]

export function Sidebar() {
  const { resetAll } = useData()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleReset = async () => {
    await resetAll()
    navigate("/import")
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Youtube className="h-7 w-7 text-yt-red" />
        <span className="text-xl font-bold tracking-tight">YoHiDa</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
              )
            }
          >
            <Icon className="h-4.5 w-4.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-border px-3 py-3">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-foreground cursor-pointer"
        >
          {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          {theme === "dark" ? "Thème clair" : "Thème sombre"}
        </button>
        <button
          onClick={handleReset}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-foreground cursor-pointer"
        >
          <RotateCcw className="h-4.5 w-4.5" />
          Réinitialiser
        </button>
      </div>
    </aside>
  )
}
