import { useState, useEffect } from 'react'

interface Post {
  id: number
  url: string
  company: string | null
  title: string | null
  location: string | null
  salary: string | null
  posted_date: string | null
  applied: number
  notes: string | null
}

function App() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

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
      setLastUpdate(new Date())
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

  // Manual refresh
  const handleRefresh = () => {
    setLoading(true)
    fetchPosts()
  }

  return (
    <div className="app">
      <header className="header">
        <h1>LinkedIn Posts Viewer</h1>
        <p className="subtitle">Static Build + Live Server + Auto-Polling</p>
      </header>

      <main className="main">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Posts ({posts.length})</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#666' }}>
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
              <button onClick={handleRefresh} disabled={loading}>
                🔄 Refresh
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '4px', marginBottom: '1rem' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {loading && posts.length === 0 ? (
            <p>Loading posts...</p>
          ) : posts.length === 0 ? (
            <p>No posts found. Use Claude to search for LinkedIn posts!</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Company</th>
                    <th style={{ padding: '0.75rem' }}>Title</th>
                    <th style={{ padding: '0.75rem' }}>Location</th>
                    <th style={{ padding: '0.75rem' }}>Salary</th>
                    <th style={{ padding: '0.75rem' }}>Posted</th>
                    <th style={{ padding: '0.75rem' }}>Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem' }}>{post.company || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>
                          {post.title || 'Untitled'}
                        </a>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{post.location || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>{post.salary || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>{post.posted_date || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>{post.applied ? '✅' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Auto-updates every 3 seconds | No page reloads needed</p>
      </footer>
    </div>
  )
}

export default App

