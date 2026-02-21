import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { WatchEntry, SearchEntry, VideoDetail, ChannelDetail, EnrichmentProgress } from "@/lib/types"
import { parseWatchHistory, parseSearchHistory } from "@/lib/parser"
import {
  saveWatchEntries, loadWatchEntries,
  saveSearchEntries, loadSearchEntries,
  loadVideoDetails, loadChannelDetails,
  saveMeta, loadMeta, clearAllData,
} from "@/lib/cache"
import { enrichVideos, enrichChannels } from "@/lib/youtube-api"

interface DataContextType {
  watchEntries: WatchEntry[]
  searchEntries: SearchEntry[]
  videoDetails: Map<string, VideoDetail>
  channelDetails: Map<string, ChannelDetail>
  apiKey: string | null
  isDataLoaded: boolean
  isInitialized: boolean
  enrichmentProgress: EnrichmentProgress
  importFiles: (watchFile: File | null, searchFile: File | null) => Promise<void>
  setApiKey: (key: string) => void
  startEnrichment: (key?: string) => Promise<void>
  resetAll: () => Promise<void>
}

const DataContext = createContext<DataContextType | null>(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData must be used within DataProvider")
  return ctx
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [watchEntries, setWatchEntries] = useState<WatchEntry[]>([])
  const [searchEntries, setSearchEntries] = useState<SearchEntry[]>([])
  const [videoDetails, setVideoDetails] = useState<Map<string, VideoDetail>>(new Map())
  const [channelDetails, setChannelDetails] = useState<Map<string, ChannelDetail>>(new Map())
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [enrichmentProgress, setEnrichmentProgress] = useState<EnrichmentProgress>({
    phase: "idle", current: 0, total: 0,
  })

  useEffect(() => {
    async function init() {
      try {
        const savedWatch = await loadWatchEntries()
        const savedSearch = await loadSearchEntries()
        const savedVideos = await loadVideoDetails()
        const savedChannels = await loadChannelDetails()
        const savedKey = await loadMeta("apiKey")

        if (savedWatch.length > 0) {
          setWatchEntries(savedWatch)
          setSearchEntries(savedSearch)
          setVideoDetails(savedVideos)
          setChannelDetails(savedChannels)
          setIsDataLoaded(true)
        }
        if (savedKey) setApiKeyState(savedKey)
      } catch {
        // First load or corrupted DB
      }
      setIsInitialized(true)
    }
    init()
  }, [])

  const importFiles = useCallback(async (watchFile: File | null, searchFile: File | null) => {
    let watch: WatchEntry[] = []
    let search: SearchEntry[] = []

    if (watchFile) {
      const text = await watchFile.text()
      const raw = JSON.parse(text)
      watch = parseWatchHistory(raw)
      await saveWatchEntries(watch)
    }

    if (searchFile) {
      const text = await searchFile.text()
      const raw = JSON.parse(text)
      search = parseSearchHistory(raw)
      await saveSearchEntries(search)
    }

    setWatchEntries(watch)
    setSearchEntries(search)
    setIsDataLoaded(true)
  }, [])

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key)
    saveMeta("apiKey", key)
  }, [])

  const startEnrichment = useCallback(async (key?: string) => {
    const effectiveKey = key || apiKey
    if (!effectiveKey || watchEntries.length === 0) return

    const existingVideoIds = new Set(videoDetails.keys())
    const uniqueVideoIds = [...new Set(
      watchEntries.filter((e) => e.videoId && !existingVideoIds.has(e.videoId!)).map((e) => e.videoId!)
    )]

    const existingChannelIds = new Set(channelDetails.keys())
    const uniqueChannelIds = [...new Set(
      watchEntries.filter((e) => e.channelId && !existingChannelIds.has(e.channelId!)).map((e) => e.channelId!)
    )]

    if (uniqueVideoIds.length > 0) {
      const newVideos = await enrichVideos(uniqueVideoIds, effectiveKey, setEnrichmentProgress)
      setVideoDetails((prev) => new Map([...prev, ...newVideos]))
    }

    if (uniqueChannelIds.length > 0) {
      const newChannels = await enrichChannels(uniqueChannelIds, effectiveKey, setEnrichmentProgress)
      setChannelDetails((prev) => new Map([...prev, ...newChannels]))
    }

    setEnrichmentProgress({ phase: "done", current: 0, total: 0 })
  }, [apiKey, watchEntries, videoDetails, channelDetails])

  const resetAll = useCallback(async () => {
    await clearAllData()
    setWatchEntries([])
    setSearchEntries([])
    setVideoDetails(new Map())
    setChannelDetails(new Map())
    setApiKeyState(null)
    setIsDataLoaded(false)
    setEnrichmentProgress({ phase: "idle", current: 0, total: 0 })
  }, [])

  return (
    <DataContext.Provider value={{
      watchEntries, searchEntries, videoDetails, channelDetails,
      apiKey, isDataLoaded, isInitialized, enrichmentProgress,
      importFiles, setApiKey, startEnrichment, resetAll,
    }}>
      {children}
    </DataContext.Provider>
  )
}
