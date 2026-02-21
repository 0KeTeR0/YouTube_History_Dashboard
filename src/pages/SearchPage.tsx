import { useMemo, useState } from "react"
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/context/DataContext"
import { computeSearchStats, computeSearchTimeline } from "@/lib/analytics"
import { formatNumber } from "@/lib/utils"

function WordCloud({ terms }: { terms: { query: string; count: number }[] }) {
  const maxCount = Math.max(1, ...terms.map((t) => t.count))
  const minCount = Math.min(...terms.map((t) => t.count))

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 py-4">
      {terms.map((term) => {
        const ratio = maxCount > minCount ? (term.count - minCount) / (maxCount - minCount) : 0.5
        const fontSize = 12 + ratio * 28
        const opacity = 0.45 + ratio * 0.55

        return (
          <a
            key={term.query}
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(term.query)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block transition-transform hover:scale-110 cursor-pointer"
            style={{ fontSize: `${fontSize}px`, opacity }}
            title={`${term.query}: ${term.count} recherche${term.count > 1 ? "s" : ""}`}
          >
            <span className="font-medium text-primary hover:underline">{term.query}</span>
          </a>
        )
      })}
    </div>
  )
}

export default function SearchPage() {
  const { searchEntries } = useData()
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("month")

  const searchStats = useMemo(() => computeSearchStats(searchEntries), [searchEntries])

  const timeline = useMemo(
    () => computeSearchTimeline(searchEntries, granularity),
    [searchEntries, granularity],
  )

  const topTerms = searchStats.slice(0, 80)
  const topList = searchStats.slice(0, 30)

  if (searchEntries.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recherches</h1>
          <p className="text-muted-foreground">Aucun historique de recherche importé</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recherches</h1>
        <p className="text-muted-foreground">{formatNumber(searchEntries.length)} recherches — {formatNumber(searchStats.length)} termes uniques</p>
      </div>

      {/* Word Cloud */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nuage de mots</CardTitle>
        </CardHeader>
        <CardContent>
          <WordCloud terms={topTerms} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Timeline chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Fréquence des recherches</CardTitle>
              <Tabs value={granularity} onValueChange={(v) => setGranularity(v as typeof granularity)}>
                <TabsList className="h-8">
                  <TabsTrigger value="day" className="text-xs px-2 h-6">Jour</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs px-2 h-6">Semaine</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-2 h-6">Mois</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-fg)" }}
                    tickLine={false} axisLine={false}
                    interval={Math.max(0, Math.floor(timeline.length / 15) - 1)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-fg)" }} tickLine={false} axisLine={false} width={35} />
                  <RTooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }}
                    labelStyle={{ color: "var(--fg)" }}
                  />
                  <Bar dataKey="count" name="Recherches" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top terms list */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top recherches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
              {topList.map((t, i) => (
                <div key={t.query} className="flex items-center gap-2.5 text-sm">
                  <span className="w-5 text-right text-xs font-medium text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="flex-1 truncate">{t.query}</span>
                  <Badge variant="secondary" className="text-[11px] shrink-0">{t.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
