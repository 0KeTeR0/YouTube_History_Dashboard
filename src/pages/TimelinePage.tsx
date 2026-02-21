import { useMemo, useState } from "react"
import {
  BarChart, Bar, LineChart, Line, ResponsiveContainer,
  XAxis, YAxis, Tooltip as RTooltip, CartesianGrid,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useData } from "@/context/DataContext"
import { computeTimeline, computeHeatmap } from "@/lib/analytics"
import { formatDuration } from "@/lib/utils"

const GRANULARITIES = [
  { value: "day" as const, label: "Jour" },
  { value: "week" as const, label: "Semaine" },
  { value: "month" as const, label: "Mois" },
]

function HeatmapChart({ entries }: { entries: ReturnType<typeof computeHeatmap> }) {
  const years = useMemo(() => {
    const set = new Set(entries.map((e) => e.year))
    return [...set].sort((a, b) => b - a)
  }, [entries])

  const [selectedYear, setSelectedYear] = useState(years[0] ?? new Date().getFullYear())

  const yearData = useMemo(() => {
    return entries.filter((e) => e.year === selectedYear)
  }, [entries, selectedYear])

  const maxCount = useMemo(() => Math.max(1, ...yearData.map((d) => d.count)), [yearData])

  const getColor = (count: number) => {
    if (count === 0) return "var(--muted)"
    const intensity = Math.min(count / maxCount, 1)
    const alpha = 0.2 + intensity * 0.8
    return `oklch(0.577 0.194 27.325 / ${alpha})`
  }

  const grid = useMemo(() => {
    const cells: { dayOfYear: number; weekIndex: number; dayOfWeek: number; count: number; date: string }[] = []
    const dayMap = new Map(yearData.map((d) => [d.dayOfYear, d]))
    const startDate = new Date(selectedYear, 0, 1)
    const startDow = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1

    const totalDays = selectedYear % 4 === 0 ? 366 : 365
    for (let i = 0; i < totalDays; i++) {
      const dow = (startDow + i) % 7
      const weekIndex = Math.floor((startDow + i) / 7)
      const entry = dayMap.get(i)
      const d = new Date(selectedYear, 0, 1 + i)
      cells.push({
        dayOfYear: i, weekIndex, dayOfWeek: dow,
        count: entry?.count ?? 0,
        date: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      })
    }
    return cells
  }, [yearData, selectedYear])

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              y === selectedYear ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {y}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${Math.ceil(grid.length / 7) * 14 + 10} 110`} className="w-full min-w-[700px]" style={{ maxHeight: 140 }}>
          {["L", "", "M", "", "V", "", "D"].map((label, i) => (
            <text key={i} x={0} y={i * 14 + 12} fontSize={9} fill="var(--muted-fg)">{label}</text>
          ))}
          {grid.map((cell, i) => (
            <rect
              key={i}
              x={cell.weekIndex * 14 + 18}
              y={cell.dayOfWeek * 14 + 2}
              width={11}
              height={11}
              rx={2}
              fill={getColor(cell.count)}
            >
              <title>{`${cell.date}: ${cell.count} vidéo${cell.count > 1 ? "s" : ""}`}</title>
            </rect>
          ))}
        </svg>
      </div>
    </div>
  )
}

export default function TimelinePage() {
  const { watchEntries, videoDetails } = useData()
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("month")

  const timeline = useMemo(
    () => computeTimeline(watchEntries, videoDetails, granularity),
    [watchEntries, videoDetails, granularity],
  )

  const heatmapData = useMemo(() => computeHeatmap(watchEntries), [watchEntries])

  const hasWatchTime = videoDetails.size > 0

  const chartInterval = granularity === "day"
    ? Math.max(0, Math.floor(timeline.length / 30) - 1)
    : granularity === "week"
      ? Math.max(0, Math.floor(timeline.length / 20) - 1)
      : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
        <p className="text-muted-foreground">Évolution de votre activité dans le temps</p>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activité quotidienne</CardTitle>
        </CardHeader>
        <CardContent>
          <HeatmapChart entries={heatmapData} />
        </CardContent>
      </Card>

      {/* Timeline Charts */}
      <Tabs value={granularity} onValueChange={(v) => setGranularity(v as typeof granularity)}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Graphiques</h2>
          <TabsList>
            {GRANULARITIES.map((g) => (
              <TabsTrigger key={g.value} value={g.value}>{g.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        {GRANULARITIES.map((g) => (
          <TabsContent key={g.value} value={g.value} className="space-y-6">
            {/* Video count chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Nombre de vidéos par {g.label.toLowerCase()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeline} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-fg)" }}
                        tickLine={false} axisLine={false} interval={chartInterval}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} width={40} />
                      <RTooltip
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }}
                        labelStyle={{ color: "var(--fg)" }}
                        cursor={{ fill: "var(--accent)", opacity: 0.3 }}
                      />
                      <Bar dataKey="count" name="Vidéos" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Watch time chart */}
            {hasWatchTime && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Temps de visionnage par {g.label.toLowerCase()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeline} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-fg)" }}
                          tickLine={false} axisLine={false} interval={chartInterval}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} width={50}
                          tickFormatter={(v: number) => formatDuration(v)}
                        />
                        <RTooltip
                          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }}
                          labelStyle={{ color: "var(--fg)" }}
                          formatter={(v: number | undefined) => [formatDuration(v ?? 0), "Watch time"]}
                        />
                        <Line
                          type="monotone" dataKey="watchTimeSec" name="Watch time"
                          stroke="var(--primary)" strokeWidth={2} dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
