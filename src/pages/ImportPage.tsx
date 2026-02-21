import { useState, useCallback, type DragEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Upload, Key, Loader2, CheckCircle2, FileJson, Youtube, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useData } from "@/context/DataContext"

export default function ImportPage() {
  const { importFiles, setApiKey, apiKey, startEnrichment, enrichmentProgress, isDataLoaded } = useData()
  const navigate = useNavigate()

  const [watchFile, setWatchFile] = useState<File | null>(null)
  const [searchFile, setSearchFile] = useState<File | null>(null)
  const [keyInput, setKeyInput] = useState(apiKey || "")
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    for (const f of files) {
      const lower = f.name.toLowerCase()
      if (lower.includes("watch") || lower.includes("regardé") || lower.includes("regarde")) {
        setWatchFile(f)
      } else if (lower.includes("search") || lower.includes("recherche")) {
        setSearchFile(f)
      } else if (lower.endsWith(".json")) {
        if (!watchFile) setWatchFile(f)
        else if (!searchFile) setSearchFile(f)
      }
    }
  }, [watchFile, searchFile])

  const handleImport = async () => {
    if (!watchFile) return
    setImporting(true)
    try {
      await importFiles(watchFile, searchFile)
      setImported(true)
    } catch (err) {
      console.error(err)
    }
    setImporting(false)
  }

  const handleEnrich = async () => {
    if (!keyInput.trim()) return
    const key = keyInput.trim()
    setApiKey(key)
    setEnriching(true)
    setEnrichError(null)
    try {
      await startEnrichment(key)
    } catch (err: unknown) {
      setEnrichError(err instanceof Error ? err.message : "Erreur inconnue")
    }
    setEnriching(false)
  }

  const enrichPercent =
    enrichmentProgress.total > 0
      ? Math.round((enrichmentProgress.current / enrichmentProgress.total) * 100)
      : 0

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Youtube className="h-10 w-10 text-yt-red" />
            <h1 className="text-4xl font-bold tracking-tight">YoHiDa</h1>
          </div>
          <p className="text-muted-foreground text-lg">YouTube History Dashboard</p>
        </div>

        {/* Step 1: Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
              Importer vos données
            </CardTitle>
            <CardDescription>
              Glissez-déposez vos fichiers JSON exportés depuis Google Takeout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
              }`}
              onClick={() => {
                const input = document.createElement("input")
                input.type = "file"
                input.accept = ".json"
                input.multiple = true
                input.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || [])
                  for (const f of files) {
                    const lower = f.name.toLowerCase()
                    if (lower.includes("watch") || lower.includes("history")) setWatchFile(f)
                    else if (lower.includes("search") || lower.includes("recherche")) setSearchFile(f)
                    else if (!watchFile) setWatchFile(f)
                  }
                }
                input.click()
              }}
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Glissez vos fichiers JSON ici ou cliquez pour parcourir</p>
            </div>

            {(watchFile || searchFile) && (
              <div className="space-y-2">
                {watchFile && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <FileJson className="h-4 w-4 text-primary" />
                    <span className="font-medium">Historique vidéos :</span>
                    <span className="text-muted-foreground">{watchFile.name}</span>
                    <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />
                  </div>
                )}
                {searchFile && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <FileJson className="h-4 w-4 text-primary" />
                    <span className="font-medium">Historique recherches :</span>
                    <span className="text-muted-foreground">{searchFile.name}</span>
                    <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!watchFile || importing || imported}
              className="w-full"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {imported ? "Données importées" : importing ? "Import en cours..." : "Importer"}
              {imported ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : null}
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: API Key */}
        <Card className={!imported && !isDataLoaded ? "opacity-50 pointer-events-none" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
              Clé API YouTube (optionnel)
            </CardTitle>
            <CardDescription>
              Permet d'obtenir les durées, vues, et logos de chaînes. Vos données restent sur votre machine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="AIza..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                />
              </div>
              <Button
                onClick={handleEnrich}
                disabled={!keyInput.trim() || enriching || enrichmentProgress.phase === "done"}
                variant={enrichmentProgress.phase === "done" ? "secondary" : "default"}
              >
                {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {enrichmentProgress.phase === "done" ? "Enrichi" : "Enrichir"}
              </Button>
            </div>

            {enriching && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {enrichmentProgress.phase === "videos" ? "Vidéos" : "Chaînes"} — {enrichmentProgress.current}/{enrichmentProgress.total} lots
                  </span>
                  <span>{enrichPercent}%</span>
                </div>
                <Progress value={enrichPercent} />
              </div>
            )}

            {enrichError && (
              <p className="text-sm text-red-500">{enrichError}</p>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Go */}
        <Button
          size="lg"
          className="w-full text-base"
          disabled={!imported && !isDataLoaded}
          onClick={() => navigate("/")}
        >
          Accéder au dashboard
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
