import { useState, useEffect, useMemo } from 'react'
import { Post } from './types'
import { TableView } from './components/TableView'
import { FilterView } from './components/FilterView'
import { LinkedInPostCard } from './components/LinkedInPostCard'

type TabType = 'screenshots' | 'table'
export type AppliedFilterType = 'all' | 'applied' | 'not-applied'

function App() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('screenshots')
  const [keywordFilter, setKeywordFilter] = useState('')
  const [appliedFilter, setAppliedFilter] =
    useState<AppliedFilterType>('all')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [idFilter, setIdFilter] = useState('')
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({})
  const [cardErrorMessage, setCardErrorMessage] = useState<string | null>(null)

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
    return Array.from(keywords).sort()
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

    return keywordMatch && appliedMatch && dateMatch && idMatch
  })

  return (
    <div className="bg-slate-100 min-h-screen font-sans">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800">
            LinkedIn Posts Viewer
          </h1>
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
                    activeTab === 'screenshots'
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setActiveTab('screenshots')}
                >
                  📷 Screenshots
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'table'
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setActiveTab('table')}
                >
                  📋 Table View
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
              setKeywordFilter={setKeywordFilter}
              appliedFilter={appliedFilter}
              setAppliedFilter={setAppliedFilter}
              uniqueKeywords={uniqueKeywords}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              idFilter={idFilter}
              setIdFilter={setIdFilter}
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
                {activeTab === 'screenshots' && (
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
                      {filteredPosts.map(post => (
                        <LinkedInPostCard
                          key={post.id}
                          post={post}
                          onToggleApplied={handleToggleApplied}
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
                {activeTab === 'table' && (
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

