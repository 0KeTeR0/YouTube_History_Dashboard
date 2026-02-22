import { useMemo, useState } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Repeat, Clock, Eye, Calendar, TrendingUp, TrendingDown, ExternalLink } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useFilter } from "@/context/FilterContext"
import { computeVideoStats, computeDurationDiversity } from "@/lib/analytics"
import { formatDuration, formatNumber, videoThumbnail } from "@/lib/utils"

const PIE_COLORS = [
  "oklch(0.65 0.18 27)", "oklch(0.65 0.16 250)", "oklch(0.65 0.16 150)",
  "oklch(0.65 0.16 60)", "oklch(0.65 0.16 310)", "oklch(0.65 0.10 200)", "oklch(0.5 0.08 280)",
]

function VideoCard({ v, stat }: {
  v: ReturnType<typeof computeVideoStats>[number]
  stat?: { label: string; value: string }
}) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${v.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
    >
      <div className="relative shrink-0 w-36 aspect-video rounded-md overflow-hidden bg-muted">
        <img
          src={videoThumbnail(v.videoId)}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {v.duration > 0 && (
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
            {formatDuration(v.duration)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {v.title}
          <ExternalLink className="inline ml-1 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </p>
        <p className="text-xs text-muted-foreground mt-1">{v.channelName}</p>
        {stat && (
          <Badge variant="secondary" className="mt-1.5 text-[11px]">{stat.label}: {stat.value}</Badge>
        )}
      </div>
    </a>
  )
}

export default function VideosPage() {
  const { filteredEntries, videoDetails } = useFilter()
  const [activeTab, setActiveTab] = useState("rewatched")

  const allVideoStats = useMemo(
    () => computeVideoStats(filteredEntries, videoDetails),
    [filteredEntries, videoDetails],
  )

  const durationDiversity = useMemo(
    () => computeDurationDiversity(filteredEntries, videoDetails),
    [filteredEntries, videoDetails],
  )

  const mostRewatched = useMemo(
    () => [...allVideoStats].sort((a, b) => b.timesWatched - a.timesWatched).slice(0, 15),
    [allVideoStats],
  )

  const firstWatched = useMemo(
    () => [...allVideoStats].sort((a, b) => a.firstWatched.getTime() - b.firstWatched.getTime()).slice(0, 10),
    [allVideoStats],
  )

  const hasEnrichedData = videoDetails.size > 0

  const longest = useMemo(
    () => hasEnrichedData ? [...allVideoStats].filter((v) => v.duration > 0).sort((a, b) => b.duration - a.duration).slice(0, 10) : [],
    [allVideoStats, hasEnrichedData],
  )

  const shortest = useMemo(
    () => hasEnrichedData ? [...allVideoStats].filter((v) => v.duration > 0).sort((a, b) => a.duration - b.duration).slice(0, 10) : [],
    [allVideoStats, hasEnrichedData],
  )

  const mostViewed = useMemo(
    () => hasEnrichedData ? [...allVideoStats].filter((v) => v.viewCount > 0).sort((a, b) => b.viewCount - a.viewCount).slice(0, 10) : [],
    [allVideoStats, hasEnrichedData],
  )

  const leastViewed = useMemo(
    () => hasEnrichedData ? [...allVideoStats].filter((v) => v.viewCount > 0).sort((a, b) => a.viewCount - b.viewCount).slice(0, 10) : [],
    [allVideoStats, hasEnrichedData],
  )

  const oldest = useMemo(
    () => hasEnrichedData
      ? [...allVideoStats].filter((v) => v.publishedAt).sort((a, b) => a.publishedAt.localeCompare(b.publishedAt)).slice(0, 10)
      : [],
    [allVideoStats, hasEnrichedData],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vidéos</h1>
        <p className="text-muted-foreground">{formatNumber(allVideoStats.length)} vidéos uniques visionnées</p>
      </div>

      {/* Duration diversity pie */}
      {hasEnrichedData && durationDiversity.some((d) => d.count > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Diversité par durée</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="h-52 w-52 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={durationDiversity.filter((d) => d.count > 0)}
                      dataKey="count" nameKey="label"
                      cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                      strokeWidth={2} stroke="var(--card)"
                    >
                      {durationDiversity.filter((d) => d.count > 0).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {durationDiversity.filter((d) => d.count > 0).map((d, i) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm">{d.label}</span>
                    <span className="text-sm font-semibold tabular-nums">{formatNumber(d.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video lists */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="rewatched" className="gap-1.5"><Repeat className="h-3.5 w-3.5" />Plus revues</TabsTrigger>
          <TabsTrigger value="first" className="gap-1.5"><Calendar className="h-3.5 w-3.5" />Premières</TabsTrigger>
          {hasEnrichedData && <TabsTrigger value="longest" className="gap-1.5"><Clock className="h-3.5 w-3.5" />Plus longues</TabsTrigger>}
          {hasEnrichedData && <TabsTrigger value="shortest" className="gap-1.5"><Clock className="h-3.5 w-3.5" />Plus courtes</TabsTrigger>}
          {hasEnrichedData && <TabsTrigger value="most-viewed" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Plus vues</TabsTrigger>}
          {hasEnrichedData && <TabsTrigger value="least-viewed" className="gap-1.5"><TrendingDown className="h-3.5 w-3.5" />Plus rares</TabsTrigger>}
          {hasEnrichedData && <TabsTrigger value="oldest" className="gap-1.5"><Eye className="h-3.5 w-3.5" />Plus vieilles</TabsTrigger>}
        </TabsList>

        <TabsContent value="rewatched">
          <Card>
            <CardContent className="p-4 space-y-1">
              {mostRewatched.map((v) => (
                <VideoCard key={v.videoId} v={v} stat={{ label: "Vues", value: `${v.timesWatched}x` }} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="first">
          <Card>
            <CardContent className="p-4 space-y-1">
              {firstWatched.map((v) => (
                <VideoCard
                  key={v.videoId} v={v}
                  stat={{ label: "Vu le", value: format(v.firstWatched, "d MMM yyyy", { locale: fr }) }}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="longest">
          <Card>
            <CardContent className="p-4 space-y-1">
              {longest.map((v) => (
                <VideoCard key={v.videoId} v={v} stat={{ label: "Durée", value: formatDuration(v.duration) }} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shortest">
          <Card>
            <CardContent className="p-4 space-y-1">
              {shortest.map((v) => (
                <VideoCard key={v.videoId} v={v} stat={{ label: "Durée", value: formatDuration(v.duration) }} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="most-viewed">
          <Card>
            <CardContent className="p-4 space-y-1">
              {mostViewed.map((v) => (
                <VideoCard key={v.videoId} v={v} stat={{ label: "Vues globales", value: formatNumber(v.viewCount) }} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="least-viewed">
          <Card>
            <CardContent className="p-4 space-y-1">
              {leastViewed.map((v) => (
                <VideoCard key={v.videoId} v={v} stat={{ label: "Vues globales", value: formatNumber(v.viewCount) }} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oldest">
          <Card>
            <CardContent className="p-4 space-y-1">
              {oldest.map((v) => (
                <VideoCard
                  key={v.videoId} v={v}
                  stat={{ label: "Publiée le", value: v.publishedAt ? format(new Date(v.publishedAt), "d MMM yyyy", { locale: fr }) : "?" }}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
