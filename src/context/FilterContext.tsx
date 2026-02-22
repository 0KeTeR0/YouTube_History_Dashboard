import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from "react"
import type { WatchEntry, VideoDetail, ChannelDetail } from "@/lib/types"
import { useData } from "./DataContext"

interface FilterState {
  includeShorts: boolean
  minDurationSec: number
  dateRange: { start: Date | null; end: Date | null }
}

interface FilterContextType extends FilterState {
  filteredEntries: WatchEntry[]
  videoDetails: Map<string, VideoDetail>
  channelDetails: Map<string, ChannelDetail>
  setIncludeShorts: (v: boolean) => void
  setMinDurationSec: (v: number) => void
  setDateRange: (r: { start: Date | null; end: Date | null }) => void
}

const FilterContext = createContext<FilterContextType | null>(null)

export function useFilter() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error("useFilter must be used within FilterProvider")
  return ctx
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const { watchEntries, videoDetails, channelDetails } = useData()

  const [includeShorts, setIncludeShortsRaw] = useState<boolean>(() => {
    const saved = localStorage.getItem("yohida-include-shorts")
    return saved === "true"
  })

  const [minDurationSec, setMinDurationSecRaw] = useState<number>(() => {
    const saved = localStorage.getItem("yohida-min-duration")
    return saved ? parseInt(saved, 10) : 0
  })

  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null, end: null,
  })

  const setIncludeShorts = useCallback((v: boolean) => {
    setIncludeShortsRaw(v)
    localStorage.setItem("yohida-include-shorts", String(v))
  }, [])

  const setMinDurationSec = useCallback((v: number) => {
    setMinDurationSecRaw(v)
    localStorage.setItem("yohida-min-duration", String(v))
  }, [])

  const filteredEntries = useMemo(() => {
    let entries = watchEntries

    if (!includeShorts) {
      entries = entries.filter((e) => e.entryType !== "short")
    }

    if (minDurationSec > 0) {
      entries = entries.filter((e) => {
        if (!e.videoId) return true
        const detail = videoDetails.get(e.videoId)
        if (!detail) return true
        return detail.duration >= minDurationSec
      })
    }

    if (dateRange.start) {
      const s = dateRange.start.getTime()
      entries = entries.filter((e) => e.timestamp.getTime() >= s)
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end)
      end.setMonth(end.getMonth() + 1)
      const e = end.getTime()
      entries = entries.filter((entry) => entry.timestamp.getTime() < e)
    }

    return entries
  }, [watchEntries, videoDetails, includeShorts, minDurationSec, dateRange])

  return (
    <FilterContext.Provider value={{
      filteredEntries, videoDetails, channelDetails,
      includeShorts, minDurationSec, dateRange,
      setIncludeShorts, setMinDurationSec, setDateRange,
    }}>
      {children}
    </FilterContext.Provider>
  )
}
