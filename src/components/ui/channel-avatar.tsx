import { useState } from "react"
import { cn } from "@/lib/utils"

const COLORS = [
  "bg-red-600", "bg-blue-600", "bg-green-600", "bg-purple-600",
  "bg-orange-500", "bg-pink-600", "bg-teal-600", "bg-indigo-600",
]

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface ChannelAvatarProps {
  src?: string
  name: string
  className?: string
}

export function ChannelAvatar({ src, name, className }: ChannelAvatarProps) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("rounded-full object-cover", className)}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full text-white font-bold",
        hashColor(name),
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
