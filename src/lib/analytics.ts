import { format, startOfWeek, startOfMonth, differenceInCalendarDays, eachYearOfInterval, getDay, getHours } from "date-fns"
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

  const uniqueVideoIds = new Set<string>()
  const uniqueChannelIds = new Set<string>()
  let removedCount = 0
  let totalWatchTimeSec = 0
  let minTime = entries[0].timestamp.getTime()
  let maxTime = entries[0].timestamp.getTime()

  const dayMap = new Map<string, { count: number; watchTimeSec: number }>()

  for (const entry of entries) {
    if (entry.videoId) uniqueVideoIds.add(entry.videoId)
    if (entry.channelId) uniqueChannelIds.add(entry.channelId)
    if (entry.isRemoved) removedCount++

    const dur = entry.videoId ? (videoDetails.get(entry.videoId)?.duration ?? 0) : 0
    totalWatchTimeSec += dur

    const t = entry.timestamp.getTime()
    if (t < minTime) minTime = t
    if (t > maxTime) maxTime = t

    const key = format(entry.timestamp, "yyyy-MM-dd")
    const existing = dayMap.get(key)
    if (existing) { existing.count++; existing.watchTimeSec += dur }
    else dayMap.set(key, { count: 1, watchTimeSec: dur })
  }

  const start = new Date(minTime)
  const end = new Date(maxTime)
  const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1)
  const totalMonths = Math.max(1, totalDays / 30.44)
  const totalYears = Math.max(1, totalDays / 365.25)

  let mostActive = { date: "", count: 0, watchTimeSec: 0 }
  for (const [date, stats] of dayMap) {
    if (stats.count > mostActive.count) mostActive = { date, ...stats }
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
  dateFrom?: string
  dateTo?: string
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
    let dateFrom: string
    let dateTo: string
    if (granularity === "day") {
      key = format(entry.timestamp, "yyyy-MM-dd")
      label = format(entry.timestamp, "dd MMM yy", { locale: fr })
      dateFrom = key
      dateTo = key
    } else if (granularity === "week") {
      const ws = startOfWeek(entry.timestamp, { weekStartsOn: 1 })
      key = format(ws, "yyyy-MM-dd")
      label = `Sem. ${format(ws, "dd MMM yy", { locale: fr })}`
      dateFrom = key
      const we = new Date(ws)
      we.setDate(we.getDate() + 6)
      dateTo = format(we, "yyyy-MM-dd")
    } else {
      const ms = startOfMonth(entry.timestamp)
      key = format(ms, "yyyy-MM")
      label = format(ms, "MMM yyyy", { locale: fr })
      dateFrom = format(ms, "yyyy-MM-dd")
      const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 0)
      dateTo = format(me, "yyyy-MM-dd")
    }

    const existing = bucketMap.get(key)
    const dur = entry.videoId ? (videoDetails.get(entry.videoId)?.duration ?? 0) : 0
    if (existing) {
      existing.count++
      existing.watchTimeSec += dur
    } else {
      bucketMap.set(key, { label, date: key, count: 1, watchTimeSec: dur, dateFrom, dateTo })
    }
  }

  return [...bucketMap.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export interface HeatmapDay {
  date: string
  count: number
  watchTimeSec: number
  year: number
  dayOfYear: number
}

export function computeHeatmap(
  entries: WatchEntry[],
  videoDetails: Map<string, VideoDetail>,
): HeatmapDay[] {
  const dayMap = new Map<string, { count: number; watchTimeSec: number }>()
  for (const entry of entries) {
    const key = format(entry.timestamp, "yyyy-MM-dd")
    const existing = dayMap.get(key)
    const dur = entry.videoId ? (videoDetails.get(entry.videoId)?.duration ?? 0) : 0
    if (existing) { existing.count++; existing.watchTimeSec += dur }
    else dayMap.set(key, { count: 1, watchTimeSec: dur })
  }
  return [...dayMap.entries()].map(([date, data]) => {
    const d = new Date(date)
    const startOfYear = new Date(d.getFullYear(), 0, 1)
    const dayOfYear = differenceInCalendarDays(d, startOfYear)
    return { date, count: data.count, watchTimeSec: data.watchTimeSec, year: d.getFullYear(), dayOfYear }
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
    channelName: string; views: number; uniqueIds: Set<string>
    watchTimeSec: number; firstSeen: Date; lastSeen: Date
  }>()

  for (const entry of entries) {
    if (!entry.channelId || !entry.channelName) continue
    const dur = entry.videoId ? (videoDetails.get(entry.videoId)?.duration ?? 0) : 0
    const existing = channelMap.get(entry.channelId)
    if (!existing) {
      channelMap.set(entry.channelId, {
        channelName: entry.channelName, views: 1,
        uniqueIds: new Set(entry.videoId ? [entry.videoId] : []),
        watchTimeSec: dur, firstSeen: entry.timestamp, lastSeen: entry.timestamp,
      })
    } else {
      existing.views++
      if (entry.videoId) existing.uniqueIds.add(entry.videoId)
      existing.watchTimeSec += dur
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
  const startY = sorted[0].timestamp.getFullYear()
  const endY = sorted[sorted.length - 1].timestamp.getFullYear()
  const years = eachYearOfInterval({ start: new Date(startY, 0), end: new Date(endY, 0) })

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

export interface HourlyBucket {
  hour: number
  label: string
  avgCount: number
}

export function computeHourlyDistribution(entries: WatchEntry[]): HourlyBucket[] {
  const hourCounts = new Array(24).fill(0)
  for (const entry of entries) {
    hourCounts[getHours(entry.timestamp)]++
  }

  const daySet = new Set(entries.map((e) => format(e.timestamp, "yyyy-MM-dd")))
  const totalDays = Math.max(1, daySet.size)

  return hourCounts.map((count, hour) => ({
    hour,
    label: `${hour}h`,
    avgCount: Math.round((count / totalDays) * 100) / 100,
  }))
}

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

export interface WeeklyBucket {
  day: number
  label: string
  avgCount: number
}

export function computeWeeklyDistribution(entries: WatchEntry[]): WeeklyBucket[] {
  const dayCounts = new Array(7).fill(0)
  for (const entry of entries) {
    dayCounts[getDay(entry.timestamp)]++
  }

  const weekSet = new Set(entries.map((e) => {
    const ws = startOfWeek(e.timestamp, { weekStartsOn: 1 })
    return format(ws, "yyyy-MM-dd")
  }))
  const totalWeeks = Math.max(1, weekSet.size)

  const ordered = [1, 2, 3, 4, 5, 6, 0]
  return ordered.map((day) => ({
    day,
    label: DAY_NAMES[day],
    avgCount: Math.round((dayCounts[day] / totalWeeks) * 100) / 100,
  }))
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
