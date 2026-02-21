import type { RawWatchEntry, RawSearchEntry, WatchEntry, SearchEntry } from "./types"
import { extractVideoId, extractChannelId } from "./utils"

const WATCH_PREFIX = "Vous avez regardé "
const SEARCH_PREFIX = "Vous avez recherché "

export function parseWatchHistory(raw: RawWatchEntry[]): WatchEntry[] {
  return raw.map((entry) => {
    const title = entry.title.startsWith(WATCH_PREFIX)
      ? entry.title.slice(WATCH_PREFIX.length)
      : entry.title

    const videoId = entry.titleUrl ? extractVideoId(entry.titleUrl) : null
    const subtitle = entry.subtitles?.[0]
    const channelName = subtitle?.name ?? null
    const channelId = subtitle?.url ? extractChannelId(subtitle.url) : null
    const isRemoved = !entry.titleUrl || !videoId

    return {
      videoId,
      title,
      channelName,
      channelId,
      timestamp: new Date(entry.time),
      isRemoved,
    }
  })
}

export function parseSearchHistory(raw: RawSearchEntry[]): SearchEntry[] {
  return raw.map((entry) => {
    const query = entry.title.startsWith(SEARCH_PREFIX)
      ? entry.title.slice(SEARCH_PREFIX.length)
      : entry.title

    return {
      query,
      searchUrl: entry.titleUrl ?? null,
      timestamp: new Date(entry.time),
    }
  })
}
