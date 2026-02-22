import { useMemo, useState, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  BarChart, Bar, LineChart, Line, ResponsiveContainer,
  XAxis, YAxis, Tooltip as RTooltip, CartesianGrid,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ChannelAvatar } from "@/components/ui/channel-avatar"
import { useFilter } from "@/context/FilterContext"
import {
  computeTimeline, computeHeatmap, computeTopChannelPerYear,
  computeHourlyDistribution, computeWeeklyDistribution,
  type HeatmapDay,
} from "@/lib/analytics"
import { formatDuration } from "@/lib/utils"

const GRANULARITIES = [
  { value: "day" as const, label: "Jour" },
  { value: "week" as const, label: "Semaine" },
  { value: "month" as const, label: "Mois" },
]

interface HoveredCell {
  x: number
  y: number
  date: string
  count: number
  watchTimeSec: number
}

function HeatmapChart({
  entries,
  selectedYear,
  onYearChange,
  years,
}: {
  entries: HeatmapDay[]
  selectedYear: number
  onYearChange: (y: number) => void
  years: number[]
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<HoveredCell | null>(null)

  const yearData = useMemo(() => entries.filter((e) => e.year === selectedYear), [entries, selectedYear])
  const maxCount = useMemo(() => Math.max(1, ...yearData.map((d) => d.count)), [yearData])

  const getColor = (count: number) => {
    if (count === 0) return "var(--muted)"
    const intensity = Math.min(count / maxCount, 1)
    const alpha = 0.2 + intensity * 0.8
    return `oklch(0.577 0.194 27.325 / ${alpha})`
  }

  const grid = useMemo(() => {
    const cells: { dayOfYear: number; weekIndex: number; dayOfWeek: number; count: number; watchTimeSec: number; date: string; dateKey: string }[] = []
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
        watchTimeSec: entry?.watchTimeSec ?? 0,
        date: d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }),
        dateKey: `${selectedYear}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      })
    }
    return cells
  }, [yearData, selectedYear])

  const handleMouseEnter = useCallback((cell: typeof grid[number], e: React.MouseEvent<SVGRectElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const clientRect = e.currentTarget.getBoundingClientRect()
    setHovered({
      x: clientRect.left - rect.left + clientRect.width / 2,
      y: clientRect.top - rect.top - 8,
      date: cell.date,
      count: cell.count,
      watchTimeSec: cell.watchTimeSec,
    })
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => onYearChange(y)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              y === selectedYear ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {y}
          </button>
        ))}
      </div>
      <div className="relative overflow-x-auto" ref={containerRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${Math.ceil(grid.length / 7) * 14 + 10} 110`}
          className="w-full min-w-[700px]"
          style={{ maxHeight: 140 }}
          onMouseLeave={() => setHovered(null)}
        >
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
              onMouseEnter={(e) => handleMouseEnter(cell, e)}
              className="cursor-pointer"
            />
          ))}
        </svg>

        {hovered && (
          <div
            className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{ left: hovered.x, top: hovered.y }}
          >
            <div className="rounded-lg bg-popover border border-border shadow-lg px-3 py-2 text-sm whitespace-nowrap">
              <p className="font-medium">{hovered.date}</p>
              <p className="text-muted-foreground text-xs">
                {hovered.count} vidéo{hovered.count > 1 ? "s" : ""}
                {hovered.watchTimeSec > 0 && ` · ${formatDuration(hovered.watchTimeSec)}`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TimelinePage() {
  const { filteredEntries, videoDetails, channelDetails } = useFilter()
  const navigate = useNavigate()
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("month")

  const heatmapData = useMemo(() => computeHeatmap(filteredEntries, videoDetails), [filteredEntries, videoDetails])

  const years = useMemo(() => {
    const set = new Set(heatmapData.map((e) => e.year))
    return [...set].sort((a, b) => b - a)
  }, [heatmapData])

  const [selectedYear, setSelectedYear] = useState(() => years[0] ?? new Date().getFullYear())

  const topPerYear = useMemo(
    () => computeTopChannelPerYear(filteredEntries, channelDetails),
    [filteredEntries, channelDetails],
  )

  const currentYearTop = useMemo(
    () => topPerYear.find((t) => t.year === selectedYear),
    [topPerYear, selectedYear],
  )

  const timeline = useMemo(
    () => computeTimeline(filteredEntries, videoDetails, granularity),
    [filteredEntries, videoDetails, granularity],
  )

  const hourly = useMemo(() => computeHourlyDistribution(filteredEntries), [filteredEntries])
  const weekly = useMemo(() => computeWeeklyDistribution(filteredEntries), [filteredEntries])

  const hasWatchTime = videoDetails.size > 0

  const maxLabels = 14
  const chartInterval = Math.max(0, Math.ceil(timeline.length / maxLabels) - 1)

  const handleBarClick = useCallback((data: { dateFrom?: string; dateTo?: string }) => {
    if (data.dateFrom && data.dateTo) {
      navigate(`/detail?from=${data.dateFrom}&to=${data.dateTo}`)
    }
  }, [navigate])

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
        <CardContent className="space-y-4">
          <HeatmapChart
            entries={heatmapData}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            years={years}
          />

          {currentYearTop && (
            <div key={currentYearTop.year} className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 animate-fade-in">
              <ChannelAvatar src={currentYearTop.thumbnail} name={currentYearTop.channelName} className="h-9 w-9 text-sm" />
              <div>
                <p className="text-sm font-medium">{currentYearTop.channelName}</p>
                <p className="text-xs text-muted-foreground">
                  Chaîne #1 en {currentYearTop.year} — {currentYearTop.count} vidéos
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distributions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribution horaire (moyenne)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-fg)" }}
                    tickLine={false} axisLine={false} interval={1}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} width={35} />
                  <RTooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }}
                    labelStyle={{ color: "var(--fg)" }}
                    formatter={(v: number | undefined) => [(v ?? 0).toFixed(2), "Vidéos/jour"]}
                  />
                  <Bar dataKey="avgCount" name="Moyenne" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribution hebdomadaire (moyenne)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-fg)" }}
                    tickLine={false} axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} width={35} />
                  <RTooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }}
                    labelStyle={{ color: "var(--fg)" }}
                    formatter={(v: number | undefined) => [(v ?? 0).toFixed(2), "Vidéos/semaine"]}
                  />
                  <Bar dataKey="avgCount" name="Moyenne" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

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
                      <Bar
                        dataKey="count" name="Vidéos" fill="var(--primary)" radius={[3, 3, 0, 0]}
                        className="cursor-pointer"
                        onClick={(_: unknown, idx: number) => handleBarClick(timeline[idx])}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Cliquez sur une barre pour voir le détail</p>
              </CardContent>
            </Card>

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
