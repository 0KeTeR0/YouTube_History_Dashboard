import { openDB, type IDBPDatabase } from "idb"
import type { WatchEntry, SearchEntry, VideoDetail, ChannelDetail } from "./types"

const DB_NAME = "yohida"
const DB_VERSION = 1

interface YoHiDaDB {
  watchEntries: { key: number; value: WatchEntry & { id: number } }
  searchEntries: { key: number; value: SearchEntry & { id: number } }
  videoDetails: { key: string; value: VideoDetail }
  channelDetails: { key: string; value: ChannelDetail }
  meta: { key: string; value: { key: string; value: string } }
}

let dbPromise: Promise<IDBPDatabase<YoHiDaDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<YoHiDaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("watchEntries")) {
          db.createObjectStore("watchEntries", { keyPath: "id", autoIncrement: true })
        }
        if (!db.objectStoreNames.contains("searchEntries")) {
          db.createObjectStore("searchEntries", { keyPath: "id", autoIncrement: true })
        }
        if (!db.objectStoreNames.contains("videoDetails")) {
          db.createObjectStore("videoDetails", { keyPath: "videoId" })
        }
        if (!db.objectStoreNames.contains("channelDetails")) {
          db.createObjectStore("channelDetails", { keyPath: "channelId" })
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" })
        }
      },
    })
  }
  return dbPromise
}

export async function saveWatchEntries(entries: WatchEntry[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("watchEntries", "readwrite")
  await tx.store.clear()
  for (const entry of entries) {
    await tx.store.add(entry as WatchEntry & { id: number })
  }
  await tx.done
}

export async function loadWatchEntries(): Promise<WatchEntry[]> {
  const db = await getDB()
  const all = await db.getAll("watchEntries")
  return all.map(({ id: _id, ...rest }) => ({
    ...rest,
    timestamp: new Date(rest.timestamp),
  }))
}

export async function saveSearchEntries(entries: SearchEntry[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("searchEntries", "readwrite")
  await tx.store.clear()
  for (const entry of entries) {
    await tx.store.add(entry as SearchEntry & { id: number })
  }
  await tx.done
}

export async function loadSearchEntries(): Promise<SearchEntry[]> {
  const db = await getDB()
  const all = await db.getAll("searchEntries")
  return all.map(({ id: _id, ...rest }) => ({
    ...rest,
    timestamp: new Date(rest.timestamp),
  }))
}

export async function saveVideoDetails(details: VideoDetail[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("videoDetails", "readwrite")
  for (const d of details) {
    await tx.store.put(d)
  }
  await tx.done
}

export async function loadVideoDetails(): Promise<Map<string, VideoDetail>> {
  const db = await getDB()
  const all = await db.getAll("videoDetails")
  return new Map(all.map((d) => [d.videoId, d]))
}

export async function saveChannelDetails(details: ChannelDetail[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("channelDetails", "readwrite")
  for (const d of details) {
    await tx.store.put(d)
  }
  await tx.done
}

export async function loadChannelDetails(): Promise<Map<string, ChannelDetail>> {
  const db = await getDB()
  const all = await db.getAll("channelDetails")
  return new Map(all.map((d) => [d.channelId, d]))
}

export async function saveMeta(key: string, value: string): Promise<void> {
  const db = await getDB()
  await db.put("meta", { key, value })
}

export async function loadMeta(key: string): Promise<string | undefined> {
  const db = await getDB()
  const record = await db.get("meta", key)
  return record?.value
}

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  const stores = ["watchEntries", "searchEntries", "videoDetails", "channelDetails", "meta"] as const
  for (const store of stores) {
    const tx = db.transaction(store, "readwrite")
    await tx.store.clear()
    await tx.done
  }
}
