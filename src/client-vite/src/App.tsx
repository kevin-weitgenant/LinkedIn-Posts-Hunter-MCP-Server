import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Database } from 'lucide-react'
import { Post } from './types'
import { TableView } from './components/TableView'
import { FilterView } from './components/FilterView'
import { LinkedInPostCard } from './components/LinkedInPostCard'

type TabType = 'posts' | 'db'
export type AppliedFilterType = 'all' | 'applied' | 'not-applied'
export type SavedFilterType = 'all' | 'saved' | 'not-saved'

interface FilterState {
  keywordFilter: string
  appliedFilter: AppliedFilterType
  savedFilter: SavedFilterType
  startDate: string | null
  endDate: string | null
  idFilter: string
}

function App() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('posts')
  const [keywordFilter, setKeywordFilter] = useState('')
  const [appliedFilter, setAppliedFilter] =
    useState<AppliedFilterType>('all')
  const [savedFilter, setSavedFilter] =
    useState<SavedFilterType>('all')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [idFilter, setIdFilter] = useState('')
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({})
  const [cardErrorMessage, setCardErrorMessage] = useState<string | null>(null)
  
  // Track if we're currently syncing to avoid infinite loops
  const isSyncingRef = useRef(false)
  const pendingUpdateRef = useRef<NodeJS.Timeout | null>(null)

  const setLoadingPost = (postId: number, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [postId]: loading }))
  }

  const handleToggleApplied = async (post: Post) => {
    setLoadingPost(post.id, true)
    setCardErrorMessage(null)

    try {
      const newAppliedStatus = !post.applied
      const response = await fetch(`/api/posts/${post.id}/applied`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applied: newAppliedStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update applied status')
      }

      // Update local state instead of full refresh
      onPostUpdate({ id: post.id, applied: newAppliedStatus ? 1 : 0 })
    } catch (error) {
      setCardErrorMessage(
        error instanceof Error ? error.message : 'Unknown error occurred'
      )
    } finally {
      setLoadingPost(post.id, false)
    }
  }

  const handleToggleSaved = async (post: Post) => {
    setLoadingPost(post.id, true)
    setCardErrorMessage(null)

    try {
      const newSavedStatus = !post.saved
      const response = await fetch(`/api/posts/${post.id}/saved`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saved: newSavedStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update saved status')
      }

      // Update local state instead of full refresh
      onPostUpdate({ id: post.id, saved: newSavedStatus ? 1 : 0 })
    } catch (error) {
      setCardErrorMessage(
        error instanceof Error ? error.message : 'Unknown error occurred'
      )
    } finally {
      setLoadingPost(post.id, false)
    }
  }

  const handleDelete = async (post: Post) => {
    if (
      !confirm(
        `Are you sure you want to delete this post?\n\nKeywords: ${post.search_keywords}`
      )
    ) {
      return
    }

    setLoadingPost(post.id, true)
    setCardErrorMessage(null)

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete post')
      }

      // Update local state instead of full refresh
      onPostDelete(post.id)
    } catch (error) {
      setCardErrorMessage(
        error instanceof Error ? error.message : 'Unknown error occurred'
      )
    } finally {
      setLoadingPost(post.id, false)
    }
  }

  const onPostUpdate = (updatedPost: Partial<Post>) => {
    setPosts(prevPosts =>
      prevPosts.map(p => (p.id === updatedPost.id ? { ...p, ...updatedPost } : p))
    )
  }

  const onPostDelete = (postId: number) => {
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId))
  }

  // Memoize unique keywords
  const uniqueKeywords = useMemo(() => {
    const keywords = new Set<string>()
    posts.forEach(post => {
      // search_keywords may be a comma-separated string
      post.search_keywords.split(',').forEach(kw => {
        const trimmedKw = kw.trim()
        if (trimmedKw) {
          keywords.add(trimmedKw)
        }
      })
    })
    return Array.from(keywords).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    )
  }, [posts])

  // Fetch posts from API
  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts')
      if (!response.ok) {
        throw new Error(`Failed to load posts: ${response.statusText}`)
      }
      const data = await response.json()
      setPosts(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Initial load + polling every 3 seconds
  useEffect(() => {
    fetchPosts()
    const interval = setInterval(fetchPosts, 3000)
    return () => clearInterval(interval)
  }, [])

  // Fetch filter state from API
  const fetchFilterState = async () => {
    try {
      const response = await fetch('/api/filter-state')
      if (!response.ok) {
        return // Silently fail - filter state is optional
      }
      const state: FilterState = await response.json()
      
      // Only update if not currently syncing (avoid loops)
      if (!isSyncingRef.current) {
        isSyncingRef.current = true
        
        // Update React state with fetched values
        setKeywordFilter(state.keywordFilter)
        setAppliedFilter(state.appliedFilter)
        setSavedFilter(state.savedFilter)
        setStartDate(state.startDate ? new Date(state.startDate) : null)
        setEndDate(state.endDate ? new Date(state.endDate) : null)
        setIdFilter(state.idFilter)
        
        // Reset sync flag after a short delay
        setTimeout(() => {
          isSyncingRef.current = false
        }, 100)
      }
    } catch (err) {
      // Silently fail - filter state is optional
    }
  }

  // Poll filter state every 1.5 seconds
  useEffect(() => {
    fetchFilterState()
    const interval = setInterval(fetchFilterState, 1500)
    return () => clearInterval(interval)
  }, [])

  // Debounced function to sync filter state to API
  const syncFilterStateToAPI = useCallback((updates: Partial<FilterState>) => {
    // Clear any pending update
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current)
    }
    
    // Schedule new update after 500ms
    pendingUpdateRef.current = setTimeout(async () => {
      try {
        isSyncingRef.current = true
        await fetch('/api/filter-state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        
        // Reset sync flag after a delay
        setTimeout(() => {
          isSyncingRef.current = false
        }, 100)
      } catch (error) {
        // Silently fail
        isSyncingRef.current = false
      }
    }, 500)
  }, [])

  // Wrapped setters that sync to API
  const setKeywordFilterAndSync = useCallback((value: string) => {
    setKeywordFilter(value)
    syncFilterStateToAPI({ keywordFilter: value })
  }, [syncFilterStateToAPI])

  const setAppliedFilterAndSync = useCallback((value: AppliedFilterType) => {
    setAppliedFilter(value)
    syncFilterStateToAPI({ appliedFilter: value })
  }, [syncFilterStateToAPI])

  const setSavedFilterAndSync = useCallback((value: SavedFilterType) => {
    setSavedFilter(value)
    syncFilterStateToAPI({ savedFilter: value })
  }, [syncFilterStateToAPI])

  const setStartDateAndSync = useCallback((value: Date | null) => {
    setStartDate(value)
    syncFilterStateToAPI({ startDate: value ? value.toISOString().split('T')[0] : null })
  }, [syncFilterStateToAPI])

  const setEndDateAndSync = useCallback((value: Date | null) => {
    setEndDate(value)
    syncFilterStateToAPI({ endDate: value ? value.toISOString().split('T')[0] : null })
  }, [syncFilterStateToAPI])

  const setIdFilterAndSync = useCallback((value: string) => {
    setIdFilter(value)
    syncFilterStateToAPI({ idFilter: value })
  }, [syncFilterStateToAPI])

  // Apply filters
  const filteredPosts = posts.filter(post => {
    // Keyword filter
    const keywordMatch =
      keywordFilter.trim() === '' ||
      post.search_keywords
        .split(',')
        .map(kw => kw.trim())
        .includes(keywordFilter)

    // Applied status filter
    const appliedMatch =
      appliedFilter === 'all' ||
      (appliedFilter === 'applied' && post.applied === 1) ||
      (appliedFilter === 'not-applied' && post.applied === 0)

    // Saved status filter
    const savedMatch =
      savedFilter === 'all' ||
      (savedFilter === 'saved' && post.saved === 1) ||
      (savedFilter === 'not-saved' && post.saved === 0)

    // Date range filter
    const postDate = new Date(post.search_date)
    const start = startDate // No need to create new Date object
    const end = endDate // No need to create new Date object

    // Adjust start and end dates to cover the whole day
    if (start) start.setHours(0, 0, 0, 0)
    if (end) end.setHours(23, 59, 59, 999)

    const dateMatch =
      (!start || postDate >= start) && (!end || postDate <= end)

    // ID filter
    const idMatch = (() => {
      if (!idFilter.trim()) {
        return true
      }
      const ids = idFilter
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id))
      if (ids.length === 0) {
        return true // Or false, depending on desired behavior for empty/invalid input
      }
      return ids.includes(post.id)
    })()

    return keywordMatch && appliedMatch && savedMatch && dateMatch && idMatch
  })

  return (
    <div className="bg-slate-100 min-h-screen font-sans">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img 
              src="/saitama-job-hunting.png" 
              alt="LinkedIn Logo" 
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-4xl font-bold text-slate-800">
              LinkedIn Posts Manager
            </h1>
          </div>
          <p className="text-slate-500 mt-2">
            Browse and manage your saved LinkedIn posts
          </p>
        </header>

        <main>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* Header with tabs and info */}
            <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'posts'
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setActiveTab('posts')}
                >
                  📝 Posts
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                    activeTab === 'db'
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setActiveTab('db')}
                >
                  <Database size={16} />
                  Database
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-500">
                  {filteredPosts.length} post
                  {filteredPosts.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Filters */}
            <FilterView
              keywordFilter={keywordFilter}
              setKeywordFilter={setKeywordFilterAndSync}
              appliedFilter={appliedFilter}
              setAppliedFilter={setAppliedFilterAndSync}
              savedFilter={savedFilter}
              setSavedFilter={setSavedFilterAndSync}
              uniqueKeywords={uniqueKeywords}
              startDate={startDate}
              setStartDate={setStartDateAndSync}
              endDate={endDate}
              setEndDate={setEndDateAndSync}
              idFilter={idFilter}
              setIdFilter={setIdFilterAndSync}
            />

            {/* Global error message */}
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4 rounded-md flex justify-between items-center">
                <div>
                  <strong className="font-bold">Error:</strong> {error}
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 font-bold"
                >
                  &times;
                </button>
              </div>
            )}

            {cardErrorMessage && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4 rounded-md flex justify-between items-center">
                <div>
                  <strong className="font-bold">Error:</strong> {cardErrorMessage}
                </div>
                <button
                  onClick={() => setCardErrorMessage(null)}
                  className="text-red-500 hover:text-red-700 font-bold"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Loading state (only on initial load) */}
            {loading && posts.length === 0 ? (
              <div className="text-center p-12">
                <p className="text-slate-500">Loading posts...</p>
              </div>
            ) : (
              <>
                {/* Tab content */}
                {activeTab === 'posts' && (
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
                      {filteredPosts.map(post => (
                        <LinkedInPostCard
                          key={post.id}
                          post={post}
                          onToggleApplied={handleToggleApplied}
                          onToggleSaved={handleToggleSaved}
                          onDelete={handleDelete}
                          onGoToPost={p =>
                            window.open(
                              p.post_link,
                              '_blank',
                              'noopener,noreferrer'
                            )
                          }
                          isLoading={loadingStates[post.id]}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {activeTab === 'db' && (
                  <TableView
                    posts={filteredPosts}
                    onPostUpdate={onPostUpdate}
                    onPostDelete={onPostDelete}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App

