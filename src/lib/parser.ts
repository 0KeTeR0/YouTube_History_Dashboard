import type { RawWatchEntry, RawSearchEntry, WatchEntry, SearchEntry, EntryType } from "./types"
import { extractVideoId, extractChannelId } from "./utils"

const WATCH_PREFIX = "Vous avez regardé "
const POST_PREFIX = "Vous avez consulté "
const SEARCH_PREFIX = "Vous avez recherché "

function detectEntryType(entry: RawWatchEntry): EntryType {
  if (entry.title.startsWith(POST_PREFIX)) return "post"
  if (entry.titleUrl?.includes("/post/")) return "post"
  if (entry.title.toLowerCase().includes("#shorts")) return "short"
  return "video"
}

export function parseWatchHistory(raw: RawWatchEntry[]): WatchEntry[] {
  const results: WatchEntry[] = []

  for (const entry of raw) {
    const entryType = detectEntryType(entry)
    if (entryType === "post") continue

    let title = entry.title
    if (title.startsWith(WATCH_PREFIX)) title = title.slice(WATCH_PREFIX.length)
    else if (title.startsWith(POST_PREFIX)) title = title.slice(POST_PREFIX.length)

    const videoId = entry.titleUrl ? extractVideoId(entry.titleUrl) : null
    const subtitle = entry.subtitles?.[0]
    const channelName = subtitle?.name ?? null
    const channelId = subtitle?.url ? extractChannelId(subtitle.url) : null
    const isRemoved = !entry.titleUrl || !videoId

    results.push({
      videoId,
      title,
      channelName,
      channelId,
      timestamp: new Date(entry.time),
      isRemoved,
      entryType,
    })
  }

  return results
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
