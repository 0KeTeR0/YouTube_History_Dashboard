import { format, startOfWeek, startOfMonth, differenceInCalendarDays, eachYearOfInterval } from "date-fns"
import { fr } from "date-fns/locale"
import type { WatchEntry, VideoDetail, ChannelDetail, SearchEntry } from "./types"

export interface OverviewStats {
  totalVideos: number
  uniqueVideos: number
  removedVideos: number
  uniqueChannels: number
  totalWatchTimeSec: number
  dateRange: { start: Date; end: Date }
  mostActiveDay: { date: string; count: number; watchTimeSec: number }
  avgPerDay: { videos: number; watchTimeSec: number }
  avgPerMonth: { videos: number; watchTimeSec: number }
  avgPerYear: { videos: number; watchTimeSec: number }
}

export function computeOverview(
  entries: WatchEntry[],
  videoDetails: Map<string, VideoDetail>,
): OverviewStats {
  if (entries.length === 0) {
    return {
      totalVideos: 0, uniqueVideos: 0, removedVideos: 0, uniqueChannels: 0,
      totalWatchTimeSec: 0, dateRange: { start: new Date(), end: new Date() },
      mostActiveDay: { date: "", count: 0, watchTimeSec: 0 },
      avgPerDay: { videos: 0, watchTimeSec: 0 },
      avgPerMonth: { videos: 0, watchTimeSec: 0 },
      avgPerYear: { videos: 0, watchTimeSec: 0 },
    }
  }

  const uniqueVideoIds = new Set(entries.filter((e) => e.videoId).map((e) => e.videoId!))
  const uniqueChannelIds = new Set(entries.filter((e) => e.channelId).map((e) => e.channelId!))
  const removedCount = entries.filter((e) => e.isRemoved).length

  let totalWatchTimeSec = 0
  for (const entry of entries) {
    if (entry.videoId && videoDetails.has(entry.videoId)) {
      totalWatchTimeSec += videoDetails.get(entry.videoId)!.duration
    }
  }

  const sorted = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  const start = sorted[0].timestamp
  const end = sorted[sorted.length - 1].timestamp
  const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1)
  const totalMonths = Math.max(1, totalDays / 30.44)
  const totalYears = Math.max(1, totalDays / 365.25)

  const dayMap = new Map<string, { count: number; watchTimeSec: number }>()
  for (const entry of entries) {
    const key = format(entry.timestamp, "yyyy-MM-dd")
    const existing = dayMap.get(key) || { count: 0, watchTimeSec: 0 }
    existing.count++
    if (entry.videoId && videoDetails.has(entry.videoId)) {
      existing.watchTimeSec += videoDetails.get(entry.videoId)!.duration
    }
    dayMap.set(key, existing)
  }

  let mostActive = { date: "", count: 0, watchTimeSec: 0 }
  for (const [date, stats] of dayMap) {
    if (stats.count > mostActive.count) {
      mostActive = { date, ...stats }
    }
  }

  return {
    totalVideos: entries.length,
    uniqueVideos: uniqueVideoIds.size,
    removedVideos: removedCount,
    uniqueChannels: uniqueChannelIds.size,
    totalWatchTimeSec,
    dateRange: { start, end },
    mostActiveDay: mostActive,
    avgPerDay: {
      videos: Math.round((entries.length / totalDays) * 10) / 10,
      watchTimeSec: Math.round(totalWatchTimeSec / totalDays),
    },
    avgPerMonth: {
      videos: Math.round((entries.length / totalMonths) * 10) / 10,
      watchTimeSec: Math.round(totalWatchTimeSec / totalMonths),
    },
    avgPerYear: {
      videos: Math.round((entries.length / totalYears) * 10) / 10,
      watchTimeSec: Math.round(totalWatchTimeSec / totalYears),
    },
  }
}

export interface TimelineBucket {
  label: string
  date: string
  count: number
  watchTimeSec: number
}

export function computeTimeline(
  entries: WatchEntry[],
  videoDetails: Map<string, VideoDetail>,
  granularity: "day" | "week" | "month",
): TimelineBucket[] {
  const bucketMap = new Map<string, TimelineBucket>()

  for (const entry of entries) {
    let key: string
    let label: string
    if (granularity === "day") {
      key = format(entry.timestamp, "yyyy-MM-dd")
      label = format(entry.timestamp, "dd MMM yy", { locale: fr })
    } else if (granularity === "week") {
      const ws = startOfWeek(entry.timestamp, { weekStartsOn: 1 })
      key = format(ws, "yyyy-MM-dd")
      label = `Sem. ${format(ws, "dd MMM yy", { locale: fr })}`
    } else {
      const ms = startOfMonth(entry.timestamp)
      key = format(ms, "yyyy-MM")
      label = format(ms, "MMM yyyy", { locale: fr })
    }

    const existing = bucketMap.get(key) || { label, date: key, count: 0, watchTimeSec: 0 }
    existing.count++
    if (entry.videoId && videoDetails.has(entry.videoId)) {
      existing.watchTimeSec += videoDetails.get(entry.videoId)!.duration
    }
    bucketMap.set(key, existing)
  }

  return [...bucketMap.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export interface HeatmapDay {
  date: string
  count: number
  year: number
  dayOfYear: number
}

export function computeHeatmap(entries: WatchEntry[]): HeatmapDay[] {
  const dayMap = new Map<string, number>()
  for (const entry of entries) {
    const key = format(entry.timestamp, "yyyy-MM-dd")
    dayMap.set(key, (dayMap.get(key) || 0) + 1)
  }
  return [...dayMap.entries()].map(([date, count]) => {
    const d = new Date(date)
    const startOfYear = new Date(d.getFullYear(), 0, 1)
    const dayOfYear = differenceInCalendarDays(d, startOfYear)
    return { date, count, year: d.getFullYear(), dayOfYear }
  })
}

export interface ChannelStats {
  channelId: string
  channelName: string
  videoCount: number
  uniqueVideoCount: number
  totalWatchTimeSec: number
  firstSeen: Date
  lastSeen: Date
  totalChannelVideos: number
  percentWatched: number
  thumbnail: string
}

export function computeChannelStats(
  entries: WatchEntry[],
  videoDetails: Map<string, VideoDetail>,
  channelDetails: Map<string, ChannelDetail>,
): ChannelStats[] {
  const channelMap = new Map<string, {
    channelName: string
    views: number
    uniqueIds: Set<string>
    watchTimeSec: number
    firstSeen: Date
    lastSeen: Date
  }>()

  for (const entry of entries) {
    if (!entry.channelId || !entry.channelName) continue
    const existing = channelMap.get(entry.channelId)
    if (!existing) {
      channelMap.set(entry.channelId, {
        channelName: entry.channelName,
        views: 1,
        uniqueIds: new Set(entry.videoId ? [entry.videoId] : []),
        watchTimeSec: entry.videoId && videoDetails.has(entry.videoId) ? videoDetails.get(entry.videoId)!.duration : 0,
        firstSeen: entry.timestamp,
        lastSeen: entry.timestamp,
      })
    } else {
      existing.views++
      if (entry.videoId) existing.uniqueIds.add(entry.videoId)
      if (entry.videoId && videoDetails.has(entry.videoId)) {
        existing.watchTimeSec += videoDetails.get(entry.videoId)!.duration
      }
      if (entry.timestamp < existing.firstSeen) existing.firstSeen = entry.timestamp
      if (entry.timestamp > existing.lastSeen) existing.lastSeen = entry.timestamp
    }
  }

  return [...channelMap.entries()].map(([channelId, stats]) => {
    const detail = channelDetails.get(channelId)
    const totalChannelVideos = detail?.videoCount || 0
    return {
      channelId,
      channelName: detail?.name || stats.channelName,
      videoCount: stats.views,
      uniqueVideoCount: stats.uniqueIds.size,
      totalWatchTimeSec: stats.watchTimeSec,
      firstSeen: stats.firstSeen,
      lastSeen: stats.lastSeen,
      totalChannelVideos,
      percentWatched: totalChannelVideos > 0 ? Math.round((stats.uniqueIds.size / totalChannelVideos) * 1000) / 10 : 0,
      thumbnail: detail?.thumbnail || "",
    }
  })
}

export interface TopChannelByYear {
  year: number
  channelName: string
  channelId: string
  count: number
  thumbnail: string
}

export function computeTopChannelPerYear(
  entries: WatchEntry[],
  channelDetails: Map<string, ChannelDetail>,
): TopChannelByYear[] {
  const yearMap = new Map<number, Map<string, { name: string; count: number }>>()

  for (const entry of entries) {
    if (!entry.channelId) continue
    const year = entry.timestamp.getFullYear()
    if (!yearMap.has(year)) yearMap.set(year, new Map())
    const channels = yearMap.get(year)!
    const c = channels.get(entry.channelId) || { name: entry.channelName || "", count: 0 }
    c.count++
    channels.set(entry.channelId, c)
  }

  const result: TopChannelByYear[] = []
  for (const [year, channels] of yearMap) {
    let best = { id: "", name: "", count: 0 }
    for (const [id, stats] of channels) {
      if (stats.count > best.count) best = { id, name: stats.name, count: stats.count }
    }
    const detail = channelDetails.get(best.id)
    result.push({
      year, channelName: detail?.name || best.name, channelId: best.id,
      count: best.count, thumbnail: detail?.thumbnail || "",
    })
  }

  return result.sort((a, b) => a.year - b.year)
}

export interface ChannelDiscovery {
  year: number
  newChannels: number
}

export function computeChannelDiscoveries(entries: WatchEntry[]): ChannelDiscovery[] {
  const seen = new Set<string>()
  const yearMap = new Map<number, number>()

  const sorted = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  for (const entry of sorted) {
    if (!entry.channelId) continue
    if (!seen.has(entry.channelId)) {
      seen.add(entry.channelId)
      const year = entry.timestamp.getFullYear()
      yearMap.set(year, (yearMap.get(year) || 0) + 1)
    }
  }

  if (sorted.length === 0) return []
  const start = sorted[0].timestamp.getFullYear()
  const end = sorted[sorted.length - 1].timestamp.getFullYear()
  const years = eachYearOfInterval({ start: new Date(start, 0), end: new Date(end, 0) })

  return years.map((d) => ({
    year: d.getFullYear(),
    newChannels: yearMap.get(d.getFullYear()) || 0,
  }))
}

export interface VideoStats {
  videoId: string
  title: string
  channelName: string
  timesWatched: number
  firstWatched: Date
  lastWatched: Date
  duration: number
  viewCount: number
  likeCount: number
  publishedAt: string
}

export function computeVideoStats(
  entries: WatchEntry[],
  videoDetails: Map<string, VideoDetail>,
): VideoStats[] {
  const videoMap = new Map<string, {
    title: string; channelName: string; count: number; first: Date; last: Date
  }>()

  for (const entry of entries) {
    if (!entry.videoId) continue
    const existing = videoMap.get(entry.videoId)
    if (!existing) {
      videoMap.set(entry.videoId, {
        title: entry.title, channelName: entry.channelName || "",
        count: 1, first: entry.timestamp, last: entry.timestamp,
      })
    } else {
      existing.count++
      if (entry.timestamp < existing.first) existing.first = entry.timestamp
      if (entry.timestamp > existing.last) existing.last = entry.timestamp
    }
  }

  return [...videoMap.entries()].map(([videoId, stats]) => {
    const detail = videoDetails.get(videoId)
    return {
      videoId, title: detail?.title || stats.title, channelName: stats.channelName,
      timesWatched: stats.count, firstWatched: stats.first, lastWatched: stats.last,
      duration: detail?.duration || 0, viewCount: detail?.viewCount || 0,
      likeCount: detail?.likeCount || 0, publishedAt: detail?.publishedAt || "",
    }
  })
}

export interface DurationBucket {
  label: string
  count: number
}

export function computeDurationDiversity(
  entries: WatchEntry[],
  videoDetails: Map<string, VideoDetail>,
): DurationBucket[] {
  const buckets = [
    { label: "< 1 min", max: 60, count: 0 },
    { label: "1-5 min", max: 300, count: 0 },
    { label: "5-15 min", max: 900, count: 0 },
    { label: "15-30 min", max: 1800, count: 0 },
    { label: "30-60 min", max: 3600, count: 0 },
    { label: "1-2h", max: 7200, count: 0 },
    { label: "> 2h", max: Infinity, count: 0 },
  ]

  const counted = new Set<string>()
  for (const entry of entries) {
    if (!entry.videoId || counted.has(entry.videoId)) continue
    counted.add(entry.videoId)
    const detail = videoDetails.get(entry.videoId)
    if (!detail) continue
    for (const bucket of buckets) {
      if (detail.duration < bucket.max) { bucket.count++; break }
    }
  }

  return buckets.map(({ label, count }) => ({ label, count }))
}

export interface SearchTermStats {
  query: string
  count: number
}

export function computeSearchStats(searchEntries: SearchEntry[]): SearchTermStats[] {
  const termMap = new Map<string, number>()
  for (const entry of searchEntries) {
    const normalized = entry.query.toLowerCase().trim()
    termMap.set(normalized, (termMap.get(normalized) || 0) + 1)
  }
  return [...termMap.entries()]
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
}

export function computeSearchTimeline(
  searchEntries: SearchEntry[],
  granularity: "day" | "week" | "month",
): TimelineBucket[] {
  const bucketMap = new Map<string, TimelineBucket>()

  for (const entry of searchEntries) {
    let key: string
    let label: string
    if (granularity === "day") {
      key = format(entry.timestamp, "yyyy-MM-dd")
      label = format(entry.timestamp, "dd MMM yy", { locale: fr })
    } else if (granularity === "week") {
      const ws = startOfWeek(entry.timestamp, { weekStartsOn: 1 })
      key = format(ws, "yyyy-MM-dd")
      label = `Sem. ${format(ws, "dd MMM yy", { locale: fr })}`
    } else {
      const ms = startOfMonth(entry.timestamp)
      key = format(ms, "yyyy-MM")
      label = format(ms, "MMM yyyy", { locale: fr })
    }

    const existing = bucketMap.get(key) || { label, date: key, count: 0, watchTimeSec: 0 }
    existing.count++
    bucketMap.set(key, existing)
  }

  return [...bucketMap.values()].sort((a, b) => a.date.localeCompare(b.date))
}
