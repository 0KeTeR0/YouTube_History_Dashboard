import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { DataProvider, useData } from "@/context/DataContext"
import { ThemeProvider } from "@/context/ThemeContext"
import { FilterProvider } from "@/context/FilterContext"
import { Shell } from "@/components/layout/Shell"

const ImportPage = lazy(() => import("@/pages/ImportPage"))
const OverviewPage = lazy(() => import("@/pages/OverviewPage"))
const TimelinePage = lazy(() => import("@/pages/TimelinePage"))
const ChannelsPage = lazy(() => import("@/pages/ChannelsPage"))
const VideosPage = lazy(() => import("@/pages/VideosPage"))
const SearchPage = lazy(() => import("@/pages/SearchPage"))
const DetailPage = lazy(() => import("@/pages/DetailPage"))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

function AppRoutes() {
  const { isDataLoaded, isInitialized } = useData()

  if (!isInitialized) return <PageLoader />

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/import" element={<ImportPage />} />
        {isDataLoaded ? (
          <Route element={<Shell />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/channels" element={<ChannelsPage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/detail" element={<DetailPage />} />
          </Route>
        ) : null}
        <Route path="*" element={<Navigate to={isDataLoaded ? "/" : "/import"} replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <FilterProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </FilterProvider>
      </DataProvider>
    </ThemeProvider>
  )
}
