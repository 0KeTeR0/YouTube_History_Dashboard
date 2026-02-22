import { useMemo, useState } from "react"
import { ChannelAvatar } from "@/components/ui/channel-avatar"
import type { ChannelStats } from "@/lib/analytics"

interface BubbleItem {
  channelId: string
  channelName: string
  thumbnail: string
  metric: number
  radius: number
  x: number
  y: number
}

function packCircles(items: { radius: number }[]): { x: number; y: number }[] {
  if (items.length === 0) return []

  const positions = items.map((item, i) => {
    const angle = i * 2.399963
    const r = 5 * Math.sqrt(i)
    return { x: r * Math.cos(angle), y: r * Math.sin(angle), radius: item.radius }
  })

  for (let iter = 0; iter < 120; iter++) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x
        const dy = positions[j].y - positions[i].y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1
        const minDist = positions[i].radius + positions[j].radius + 3
        if (dist < minDist) {
          const overlap = (minDist - dist) / 2
          const nx = dx / dist
          const ny = dy / dist
          positions[i].x -= nx * overlap
          positions[i].y -= ny * overlap
          positions[j].x += nx * overlap
          positions[j].y += ny * overlap
        }
      }
    }
    for (const p of positions) {
      p.x *= 0.985
      p.y *= 0.985
    }
  }

  return positions.map((p) => ({ x: p.x, y: p.y }))
}

interface Props {
  channelStats: ChannelStats[]
  metric: "watchTime" | "videoCount"
  onMetricChange: (m: "watchTime" | "videoCount") => void
}

export function ChannelBubbleCloud({ channelStats, metric, onMetricChange }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)

  const bubbles = useMemo<BubbleItem[]>(() => {
    const sorted = [...channelStats]
      .sort((a, b) => (metric === "watchTime" ? b.totalWatchTimeSec - a.totalWatchTimeSec : b.videoCount - a.videoCount))
      .slice(0, 50)

    if (sorted.length === 0) return []

    const metricValues = sorted.map((c) => metric === "watchTime" ? c.totalWatchTimeSec : c.videoCount)
    const maxVal = Math.max(1, metricValues[0])
    const minRadius = 22
    const maxRadius = 56

    const items = sorted.map((c, i) => {
      const ratio = Math.sqrt(metricValues[i] / maxVal)
      const radius = minRadius + ratio * (maxRadius - minRadius)
      return { channelId: c.channelId, channelName: c.channelName, thumbnail: c.thumbnail, metric: metricValues[i], radius }
    })

    const positions = packCircles(items.map((it) => ({ radius: it.radius })))

    return items.map((item, i) => ({
      ...item,
      x: positions[i].x,
      y: positions[i].y,
    }))
  }, [channelStats, metric])

  const bounds = useMemo(() => {
    if (bubbles.length === 0) return { minX: -200, maxX: 200, minY: -150, maxY: 150 }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const b of bubbles) {
      minX = Math.min(minX, b.x - b.radius)
      maxX = Math.max(maxX, b.x + b.radius)
      minY = Math.min(minY, b.y - b.radius)
      maxY = Math.max(maxY, b.y + b.radius)
    }
    const pad = 10
    return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad }
  }, [bubbles])

  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Taille par</span>
        <div className="flex rounded-lg bg-muted p-0.5 gap-0.5">
          <button
            onClick={() => onMetricChange("videoCount")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              metric === "videoCount" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Vidéos
          </button>
          <button
            onClick={() => onMetricChange("watchTime")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              metric === "watchTime" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Watch time
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-muted/30 border border-border/50" style={{ paddingBottom: `${(height / width) * 100}%` }}>
        <svg
          viewBox={`${bounds.minX} ${bounds.minY} ${width} ${height}`}
          className="absolute inset-0 w-full h-full"
        >
          {bubbles.map((b) => (
            <g key={b.channelId}>
              <clipPath id={`clip-${b.channelId}`}>
                <circle cx={b.x} cy={b.y} r={b.radius - 1} />
              </clipPath>
              <circle
                cx={b.x} cy={b.y} r={b.radius}
                fill="var(--muted)"
                stroke={hovered === b.channelId ? "var(--primary)" : "var(--border)"}
                strokeWidth={hovered === b.channelId ? 2.5 : 1}
                className="transition-all duration-150"
                onMouseEnter={() => setHovered(b.channelId)}
                onMouseLeave={() => setHovered(null)}
              />
              {b.thumbnail ? (
                <image
                  href={b.thumbnail}
                  x={b.x - b.radius + 1}
                  y={b.y - b.radius + 1}
                  width={(b.radius - 1) * 2}
                  height={(b.radius - 1) * 2}
                  clipPath={`url(#clip-${b.channelId})`}
                  className="pointer-events-none"
                />
              ) : (
                <text
                  x={b.x} y={b.y}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={b.radius * 0.7} fontWeight="bold"
                  fill="var(--muted-fg)"
                  className="pointer-events-none"
                >
                  {b.channelName.charAt(0).toUpperCase()}
                </text>
              )}
            </g>
          ))}
        </svg>

        {hovered && (() => {
          const b = bubbles.find((bb) => bb.channelId === hovered)
          if (!b) return null
          const xPct = ((b.x - bounds.minX) / width) * 100
          const yPct = ((b.y - bounds.minY) / height) * 100
          return (
            <div
              className="absolute pointer-events-none z-10 -translate-x-1/2 translate-y-2"
              style={{ left: `${xPct}%`, top: `${yPct + (b.radius / height) * 100}%` }}
            >
              <div className="rounded-lg bg-popover border border-border shadow-lg px-3 py-2 text-sm whitespace-nowrap">
                <p className="font-medium">{b.channelName}</p>
                <p className="text-muted-foreground text-xs">
                  {metric === "watchTime"
                    ? `${Math.round(b.metric / 3600)}h de watch time`
                    : `${b.metric} vidéos`}
                </p>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
