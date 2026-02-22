import { useMemo, useState } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { ArrowUpDown, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChannelAvatar } from "@/components/ui/channel-avatar"
import { useFilter } from "@/context/FilterContext"
import { computeChannelStats, computeChannelDiscoveries } from "@/lib/analytics"
import { formatDuration, formatNumber } from "@/lib/utils"

type SortKey = "videoCount" | "uniqueVideoCount" | "totalWatchTimeSec" | "firstSeen" | "percentWatched"
type CompareMode = "gte" | "lte" | "eq"

const PER_PAGE = 25

export default function ChannelsPage() {
  const { filteredEntries, videoDetails, channelDetails } = useFilter()
  const [sortKey, setSortKey] = useState<SortKey>("videoCount")
  const [sortAsc, setSortAsc] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [compareMode, setCompareMode] = useState<CompareMode>("gte")
  const [compareValue, setCompareValue] = useState("")

  const allStats = useMemo(
    () => computeChannelStats(filteredEntries, videoDetails, channelDetails),
    [filteredEntries, videoDetails, channelDetails],
  )

  const filtered = useMemo(() => {
    let list = allStats
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.channelName.toLowerCase().includes(q))
    }
    const numVal = parseInt(compareValue, 10)
    if (compareValue && !isNaN(numVal)) {
      list = list.filter((c) => {
        if (compareMode === "gte") return c.videoCount >= numVal
        if (compareMode === "lte") return c.videoCount <= numVal
        return c.videoCount === numVal
      })
    }
    list.sort((a, b) => {
      const av = a[sortKey] instanceof Date ? (a[sortKey] as Date).getTime() : (a[sortKey] as number)
      const bv = b[sortKey] instanceof Date ? (b[sortKey] as Date).getTime() : (b[sortKey] as number)
      return sortAsc ? av - bv : bv - av
    })
    return list
  }, [allStats, search, sortKey, sortAsc, compareMode, compareValue])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  const discoveries = useMemo(
    () => computeChannelDiscoveries(filteredEntries),
    [filteredEntries],
  )

  const avgDiscovery = discoveries.length > 0
    ? Math.round(discoveries.reduce((s, d) => s + d.newChannels, 0) / discoveries.length)
    : 0

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
    setPage(0)
  }

  const hasWatchTime = videoDetails.size > 0

  const SortButton = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(k)}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer justify-end w-full"
    >
      {children}
      {sortKey === k && <ArrowUpDown className="h-3 w-3 shrink-0" />}
    </button>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chaînes</h1>
        <p className="text-muted-foreground">{formatNumber(allStats.length)} chaînes uniques</p>
      </div>

      {/* Channel discoveries chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Chaînes découvertes par année
            <Badge variant="secondary" className="ml-2">~{avgDiscovery}/an en moyenne</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={discoveries} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} width={40} />
                <RTooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }}
                  labelStyle={{ color: "var(--fg)" }}
                />
                <Bar dataKey="newChannels" name="Nouvelles chaînes" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Channel table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">Toutes les chaînes</CardTitle>
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                className="max-w-xs h-9"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground shrink-0">Vidéos :</span>
              <select
                value={compareMode}
                onChange={(e) => { setCompareMode(e.target.value as CompareMode); setPage(0) }}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm cursor-pointer"
              >
                <option value="gte">Au moins</option>
                <option value="lte">Au plus</option>
                <option value="eq">Exactement</option>
              </select>
              <Input
                type="number"
                min={0}
                placeholder="—"
                value={compareValue}
                onChange={(e) => { setCompareValue(e.target.value); setPage(0) }}
                className="w-20 h-8"
              />
              {compareValue && (
                <button
                  onClick={() => { setCompareValue(""); setPage(0) }}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              )}
              <span className="text-xs text-muted-foreground ml-1">
                {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-3 pl-2 w-10">#</th>
                  <th className="text-left pb-3">Chaîne</th>
                  <th className="pb-3 px-2 w-24"><SortButton k="videoCount">Vidéos</SortButton></th>
                  <th className="pb-3 px-2 w-24"><SortButton k="uniqueVideoCount">Uniques</SortButton></th>
                  {hasWatchTime && <th className="pb-3 px-2 w-28"><SortButton k="totalWatchTimeSec">Watch time</SortButton></th>}
                  {hasWatchTime && <th className="pb-3 px-2 w-20"><SortButton k="percentWatched">% vu</SortButton></th>}
                  <th className="pb-3 px-2 w-28"><SortButton k="firstSeen">Découverte</SortButton></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((ch, i) => (
                  <tr key={ch.channelId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pl-2 text-muted-foreground text-xs">{page * PER_PAGE + i + 1}</td>
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
                    <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">{formatNumber(ch.uniqueVideoCount)}</td>
                    {hasWatchTime && <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">{formatDuration(ch.totalWatchTimeSec)}</td>}
                    {hasWatchTime && (
                      <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">
                        {ch.percentWatched > 0 ? `${ch.percentWatched}%` : "—"}
                      </td>
                    )}
                    <td className="py-2.5 px-2 text-right text-muted-foreground text-xs">
                      {format(ch.firstSeen, "MMM yyyy", { locale: fr })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} sur {filtered.length}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setPage(page - 1)} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
