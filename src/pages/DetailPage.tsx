import { useMemo, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { ArrowLeft, ExternalLink, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChannelAvatar } from "@/components/ui/channel-avatar"
import { useFilter } from "@/context/FilterContext"
import { formatDuration, formatNumber, videoThumbnail } from "@/lib/utils"
import type { WatchEntry, VideoDetail, ChannelDetail } from "@/lib/types"

const PER_PAGE = 30

interface VideoRow {
  videoId: string
  title: string
  channelName: string
  channelId: string | null
  thumbnail: string
  timestamp: Date
  duration: number
}

interface ChannelRow {
  channelId: string
  channelName: string
  thumbnail: string
  videoCount: number
  watchTimeSec: number
}

function buildVideoRows(entries: WatchEntry[], videoDetails: Map<string, VideoDetail>): VideoRow[] {
  return entries
    .filter((e) => e.videoId)
    .map((e) => {
      const detail = videoDetails.get(e.videoId!)
      return {
        videoId: e.videoId!,
        title: detail?.title || e.title,
        channelName: e.channelName || "",
        channelId: e.channelId,
        thumbnail: videoThumbnail(e.videoId!),
        timestamp: e.timestamp,
        duration: detail?.duration || 0,
      }
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

function buildChannelRows(entries: WatchEntry[], videoDetails: Map<string, VideoDetail>, channelDetails: Map<string, ChannelDetail>): ChannelRow[] {
  const map = new Map<string, { name: string; count: number; watchTimeSec: number }>()
  for (const e of entries) {
    if (!e.channelId) continue
    const existing = map.get(e.channelId)
    const dur = e.videoId ? (videoDetails.get(e.videoId)?.duration ?? 0) : 0
    if (existing) { existing.count++; existing.watchTimeSec += dur }
    else map.set(e.channelId, { name: e.channelName || "", count: 1, watchTimeSec: dur })
  }
  return [...map.entries()]
    .map(([channelId, data]) => {
      const detail = channelDetails.get(channelId)
      return {
        channelId,
        channelName: detail?.name || data.name,
        thumbnail: detail?.thumbnail || "",
        videoCount: data.count,
        watchTimeSec: data.watchTimeSec,
      }
    })
    .sort((a, b) => b.videoCount - a.videoCount)
}

type ChannelSortKey = "videoCount" | "watchTimeSec" | "channelName"

export default function DetailPage() {
  const [params] = useSearchParams()
  const { filteredEntries, videoDetails, channelDetails } = useFilter()
  const [tab, setTab] = useState("videos")
  const [search, setSearch] = useState("")
  const [videoPage, setVideoPage] = useState(0)
  const [channelPage, setChannelPage] = useState(0)
  const [chSortKey, setChSortKey] = useState<ChannelSortKey>("videoCount")
  const [chSortAsc, setChSortAsc] = useState(false)

  const from = params.get("from")
  const to = params.get("to")

  const periodEntries = useMemo(() => {
    if (!from || !to) return filteredEntries
    const start = new Date(from).getTime()
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    const endMs = end.getTime()
    return filteredEntries.filter((e) => {
      const t = e.timestamp.getTime()
      return t >= start && t <= endMs
    })
  }, [filteredEntries, from, to])

  const videoRows = useMemo(() => buildVideoRows(periodEntries, videoDetails), [periodEntries, videoDetails])
  const channelRows = useMemo(() => buildChannelRows(periodEntries, videoDetails, channelDetails), [periodEntries, videoDetails, channelDetails])

  const filteredVideos = useMemo(() => {
    if (!search) return videoRows
    const q = search.toLowerCase()
    return videoRows.filter((v) => v.title.toLowerCase().includes(q) || v.channelName.toLowerCase().includes(q))
  }, [videoRows, search])

  const filteredChannels = useMemo(() => {
    let list = channelRows
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.channelName.toLowerCase().includes(q))
    }
    list = [...list].sort((a, b) => {
      if (chSortKey === "channelName") {
        return chSortAsc ? a.channelName.localeCompare(b.channelName) : b.channelName.localeCompare(a.channelName)
      }
      const av = a[chSortKey], bv = b[chSortKey]
      return chSortAsc ? av - bv : bv - av
    })
    return list
  }, [channelRows, search, chSortKey, chSortAsc])

  const vTotalPages = Math.ceil(filteredVideos.length / PER_PAGE)
  const vPaginated = filteredVideos.slice(videoPage * PER_PAGE, (videoPage + 1) * PER_PAGE)

  const cTotalPages = Math.ceil(filteredChannels.length / PER_PAGE)
  const cPaginated = filteredChannels.slice(channelPage * PER_PAGE, (channelPage + 1) * PER_PAGE)

  const dateLabel = from && to
    ? from === to
      ? format(new Date(from), "d MMMM yyyy", { locale: fr })
      : `${format(new Date(from), "d MMM yyyy", { locale: fr })} — ${format(new Date(to), "d MMM yyyy", { locale: fr })}`
    : "Toute la période"

  const handleChSort = (key: ChannelSortKey) => {
    if (chSortKey === key) setChSortAsc(!chSortAsc)
    else { setChSortKey(key); setChSortAsc(false) }
    setChannelPage(0)
  }

  const ChSortBtn = ({ k, children }: { k: ChannelSortKey; children: React.ReactNode }) => (
    <button
      onClick={() => handleChSort(k)}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer justify-end w-full"
    >
      {children}
      {chSortKey === k && <ArrowUpDown className="h-3 w-3 shrink-0" />}
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/timeline">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Détail</h1>
          <p className="text-muted-foreground">{dateLabel} — {periodEntries.length} vidéos, {channelRows.length} chaînes</p>
        </div>
      </div>

      <Input
        placeholder="Rechercher vidéos ou chaînes..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setVideoPage(0); setChannelPage(0) }}
        className="max-w-md h-9"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="videos">Vidéos ({filteredVideos.length})</TabsTrigger>
          <TabsTrigger value="channels">Chaînes ({filteredChannels.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="videos">
          <Card>
            <CardContent className="p-4 space-y-1">
              {vPaginated.map((v, idx) => (
                <a
                  key={`${v.videoId}-${idx}`}
                  href={`https://www.youtube.com/watch?v=${v.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  <div className="relative shrink-0 w-32 aspect-video rounded-md overflow-hidden bg-muted">
                    <img src={v.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
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
                    <p className="text-xs text-muted-foreground">{format(v.timestamp, "d MMM yyyy HH:mm", { locale: fr })}</p>
                  </div>
                </a>
              ))}
              {filteredVideos.length === 0 && (
                <p className="text-muted-foreground text-sm py-4 text-center">Aucune vidéo trouvée</p>
              )}
            </CardContent>
            {vTotalPages > 1 && (
              <div className="flex items-center justify-between px-6 pb-4">
                <span className="text-sm text-muted-foreground">
                  {videoPage * PER_PAGE + 1}–{Math.min((videoPage + 1) * PER_PAGE, filteredVideos.length)} sur {filteredVideos.length}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setVideoPage(videoPage - 1)} disabled={videoPage === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setVideoPage(videoPage + 1)} disabled={videoPage >= vTotalPages - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="channels">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-3 pl-4 pt-4 w-10">#</th>
                      <th className="text-left pb-3 pt-4"><ChSortBtn k="channelName">Chaîne</ChSortBtn></th>
                      <th className="pb-3 pt-4 px-2 w-24"><ChSortBtn k="videoCount">Vidéos</ChSortBtn></th>
                      <th className="pb-3 pt-4 px-2 w-28"><ChSortBtn k="watchTimeSec">Watch time</ChSortBtn></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cPaginated.map((ch, i) => (
                      <tr key={ch.channelId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 pl-4 text-muted-foreground text-xs">{channelPage * PER_PAGE + i + 1}</td>
                        <td className="py-2.5">
                          <a
                            href={`https://www.youtube.com/channel/${ch.channelId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 group"
                          >
                            <ChannelAvatar src={ch.thumbnail} name={ch.channelName} className="h-7 w-7 text-[10px]" />
                            <span className="font-medium group-hover:text-primary transition-colors">{ch.channelName}</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-medium">{formatNumber(ch.videoCount)}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">{formatDuration(ch.watchTimeSec)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredChannels.length === 0 && (
                <p className="text-muted-foreground text-sm py-4 text-center">Aucune chaîne trouvée</p>
              )}
            </CardContent>
            {cTotalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  {channelPage * PER_PAGE + 1}–{Math.min((channelPage + 1) * PER_PAGE, filteredChannels.length)} sur {filteredChannels.length}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setChannelPage(channelPage - 1)} disabled={channelPage === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setChannelPage(channelPage + 1)} disabled={channelPage >= cTotalPages - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
