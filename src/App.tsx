import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { DataProvider, useData } from "@/context/DataContext"
import { ThemeProvider } from "@/context/ThemeContext"
import { Shell } from "@/components/layout/Shell"
import ImportPage from "@/pages/ImportPage"
import OverviewPage from "@/pages/OverviewPage"
import TimelinePage from "@/pages/TimelinePage"
import ChannelsPage from "@/pages/ChannelsPage"
import VideosPage from "@/pages/VideosPage"
import SearchPage from "@/pages/SearchPage"

function AppRoutes() {
  const { isDataLoaded, isInitialized } = useData()

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/import" element={<ImportPage />} />
      {isDataLoaded ? (
        <Route element={<Shell />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/channels" element={<ChannelsPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Route>
      ) : null}
      <Route path="*" element={<Navigate to={isDataLoaded ? "/" : "/import"} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </DataProvider>
    </ThemeProvider>
  )
}
