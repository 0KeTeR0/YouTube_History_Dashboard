export interface RawWatchEntry {
  header: string
  title: string
  titleUrl?: string
  subtitles?: { name: string; url: string }[]
  time: string
  products: string[]
  activityControls: string[]
}

export interface RawSearchEntry {
  header: string
  title: string
  titleUrl?: string
  time: string
  products: string[]
  activityControls: string[]
}

export type EntryType = "video" | "short" | "post"

export interface WatchEntry {
  videoId: string | null
  title: string
  channelName: string | null
  channelId: string | null
  timestamp: Date
  isRemoved: boolean
  entryType: EntryType
}

export interface SearchEntry {
  query: string
  searchUrl: string | null
  timestamp: Date
}

export interface VideoDetail {
  videoId: string
  title: string
  publishedAt: string
  duration: number
  viewCount: number
  likeCount: number
  channelId: string
}

export interface ChannelDetail {
  channelId: string
  name: string
  thumbnail: string
  videoCount: number
}

export interface EnrichmentProgress {
  phase: "videos" | "channels" | "done" | "idle"
  current: number
  total: number
}

export interface AppData {
  watchEntries: WatchEntry[]
  searchEntries: SearchEntry[]
  videoDetails: Map<string, VideoDetail>
  channelDetails: Map<string, ChannelDetail>
  apiKey: string | null
  isDataLoaded: boolean
  enrichmentProgress: EnrichmentProgress
}
