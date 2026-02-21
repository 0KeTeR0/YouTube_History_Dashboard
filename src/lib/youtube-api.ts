import type { VideoDetail, ChannelDetail, EnrichmentProgress } from "./types"
import { parseDuration } from "./utils"
import { saveVideoDetails, saveChannelDetails } from "./cache"

const API_BASE = "https://www.googleapis.com/youtube/v3"
const BATCH_SIZE = 50

interface VideoListResponse {
  items?: {
    id: string
    snippet: { title: string; publishedAt: string; channelId: string }
    contentDetails: { duration: string }
    statistics: { viewCount?: string; likeCount?: string }
  }[]
}

interface ChannelListResponse {
  items?: {
    id: string
    snippet: {
      title: string
      thumbnails: {
        default?: { url: string }
        medium?: { url: string }
        high?: { url: string }
      }
    }
    statistics: { videoCount?: string }
  }[]
}

function ensureHttps(url: string): string {
  if (url.startsWith("//")) return `https:${url}`
  if (url.startsWith("http://")) return url.replace("http://", "https://")
  return url
}

export async function enrichVideos(
  videoIds: string[],
  apiKey: string,
  onProgress: (p: EnrichmentProgress) => void,
): Promise<Map<string, VideoDetail>> {
  const result = new Map<string, VideoDetail>()
  const total = Math.ceil(videoIds.length / BATCH_SIZE)

  for (let i = 0; i < videoIds.length; i += BATCH_SIZE) {
    const batch = videoIds.slice(i, i + BATCH_SIZE)
    const ids = batch.join(",")
    const url = `${API_BASE}/videos?part=snippet,contentDetails,statistics&id=${ids}&key=${apiKey}`

    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || `YouTube API error: ${res.status}`)
    }

    const data: VideoListResponse = await res.json()
    if (data.items) {
      const details: VideoDetail[] = data.items.map((item) => ({
        videoId: item.id,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        duration: parseDuration(item.contentDetails.duration),
        viewCount: parseInt(item.statistics.viewCount || "0", 10),
        likeCount: parseInt(item.statistics.likeCount || "0", 10),
        channelId: item.snippet.channelId,
      }))

      for (const d of details) result.set(d.videoId, d)
      await saveVideoDetails(details)
    }

    onProgress({ phase: "videos", current: Math.min(i / BATCH_SIZE + 1, total), total })
  }

  return result
}

export async function enrichChannels(
  channelIds: string[],
  apiKey: string,
  onProgress: (p: EnrichmentProgress) => void,
): Promise<Map<string, ChannelDetail>> {
  const result = new Map<string, ChannelDetail>()
  const total = Math.ceil(channelIds.length / BATCH_SIZE)

  for (let i = 0; i < channelIds.length; i += BATCH_SIZE) {
    const batch = channelIds.slice(i, i + BATCH_SIZE)
    const ids = batch.join(",")
    const url = `${API_BASE}/channels?part=snippet,statistics&id=${ids}&key=${apiKey}`

    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || `YouTube API error: ${res.status}`)
    }

    const data: ChannelListResponse = await res.json()
    if (data.items) {
      const details: ChannelDetail[] = data.items.map((item) => {
        const thumbs = item.snippet.thumbnails
        const rawUrl = thumbs.medium?.url || thumbs.high?.url || thumbs.default?.url || ""
        return {
          channelId: item.id,
          name: item.snippet.title,
          thumbnail: rawUrl ? ensureHttps(rawUrl) : "",
          videoCount: parseInt(item.statistics.videoCount || "0", 10),
        }
      })

      for (const d of details) result.set(d.channelId, d)
      await saveChannelDetails(details)
    }

    onProgress({ phase: "channels", current: Math.min(i / BATCH_SIZE + 1, total), total })
  }

  return result
}
