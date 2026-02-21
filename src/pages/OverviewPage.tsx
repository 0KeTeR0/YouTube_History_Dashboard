import { useMemo } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Film, Clock, Users, Trash2, Calendar, TrendingUp, Trophy, BarChart3 } from "lucide-react"
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChannelAvatar } from "@/components/ui/channel-avatar"
import { useData } from "@/context/DataContext"
import { computeOverview, computeTimeline, computeChannelStats } from "@/lib/analytics"
import { formatDuration, formatNumber } from "@/lib/utils"

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function OverviewPage() {
  const { watchEntries, videoDetails, channelDetails } = useData()

  const overview = useMemo(
    () => computeOverview(watchEntries, videoDetails),
    [watchEntries, videoDetails],
  )

  const monthlyTimeline = useMemo(
    () => computeTimeline(watchEntries, videoDetails, "month"),
    [watchEntries, videoDetails],
  )

  const topChannels = useMemo(() => {
    const stats = computeChannelStats(watchEntries, videoDetails, channelDetails)
    return stats.sort((a, b) => b.videoCount - a.videoCount).slice(0, 8)
  }, [watchEntries, videoDetails, channelDetails])

  const hasWatchTime = overview.totalWatchTimeSec > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vue d'ensemble</h1>
        <p className="text-muted-foreground">
          {overview.dateRange.start && overview.dateRange.end
            ? `Du ${format(overview.dateRange.start, "d MMMM yyyy", { locale: fr })} au ${format(overview.dateRange.end, "d MMMM yyyy", { locale: fr })}`
            : "Aucune donnée"}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Film}
          label="Vidéos visionnées"
          value={formatNumber(overview.totalVideos)}
          sub={`${formatNumber(overview.uniqueVideos)} uniques`}
        />
        {hasWatchTime && (
          <StatCard
            icon={Clock}
            label="Temps de visionnage"
            value={formatDuration(overview.totalWatchTimeSec)}
            sub={`~${formatDuration(overview.avgPerDay.watchTimeSec)}/jour`}
          />
        )}
        <StatCard
          icon={Users}
          label="Chaînes distinctes"
          value={formatNumber(overview.uniqueChannels)}
        />
        <StatCard
          icon={Trash2}
          label="Vidéos disparues"
          value={formatNumber(overview.removedVideos)}
          sub={`${((overview.removedVideos / Math.max(1, overview.totalVideos)) * 100).toFixed(1)}%`}
        />
      </div>

      {/* Averages */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Moyenne / jour</span>
            </div>
            <p className="text-xl font-bold">{overview.avgPerDay.videos} vidéos</p>
            {hasWatchTime && <p className="text-sm text-muted-foreground">{formatDuration(overview.avgPerDay.watchTimeSec)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Moyenne / mois</span>
            </div>
            <p className="text-xl font-bold">{Math.round(overview.avgPerMonth.videos)} vidéos</p>
            {hasWatchTime && <p className="text-sm text-muted-foreground">{formatDuration(overview.avgPerMonth.watchTimeSec)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Jour le plus actif</span>
            </div>
            <p className="text-xl font-bold">{overview.mostActiveDay.count} vidéos</p>
            <p className="text-sm text-muted-foreground">
              {overview.mostActiveDay.date && format(new Date(overview.mostActiveDay.date), "d MMMM yyyy", { locale: fr })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart + Top Channels */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Vidéos par mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTimeline} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-fg)" }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.max(0, Math.floor(monthlyTimeline.length / 12) - 1)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} width={40} />
                  <RTooltip
                    contentStyle={{
                      background: "var(--card)", border: "1px solid var(--border)",
                      borderRadius: "8px", fontSize: "13px",
                    }}
                    labelStyle={{ color: "var(--fg)" }}
                    cursor={{ fill: "var(--accent)", opacity: 0.3 }}
                  />
                  <Bar dataKey="count" name="Vidéos" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Top chaînes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topChannels.map((ch, i) => (
                <div key={ch.channelId} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs font-medium text-muted-foreground">{i + 1}</span>
                  <ChannelAvatar src={ch.thumbnail} name={ch.channelName} className="h-7 w-7 text-xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ch.channelName}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatNumber(ch.videoCount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
