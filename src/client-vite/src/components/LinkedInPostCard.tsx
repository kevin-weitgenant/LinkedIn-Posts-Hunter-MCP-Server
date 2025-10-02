import { Post } from '../types'

interface LinkedInPostCardProps {
  post: Post
  onToggleApplied: (post: Post) => void
  onToggleSaved: (post: Post) => void
  onDelete: (post: Post) => void
  onGoToPost: (post: Post) => void
  isLoading?: boolean
}

export function LinkedInPostCard({
  post,
  onToggleApplied,
  onToggleSaved,
  onDelete,
  onGoToPost,
  isLoading = false
}: LinkedInPostCardProps) {
  // Get initials for fallback avatar
  const getInitials = (name: string) => {
    if (!name || name.trim() === '') return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  /**
   * Parse LinkedIn relative time string (e.g., "1w", "2d", "3mo") to milliseconds
   */
  const parseLinkedInRelativeTime = (relativeTime: string): number | null => {
    if (!relativeTime || relativeTime.trim() === '') return null
    
    // Remove spaces and convert to lowercase
    const cleaned = relativeTime.trim().toLowerCase().replace(/\s+/g, '')
    
    // Match pattern: number followed by unit (m, h, d, w, mo, yr)
    const match = cleaned.match(/^(\d+)(m|h|d|w|mo|yr)$/)
    if (!match) return null
    
    const value = parseInt(match[1])
    const unit = match[2]
    
    const MS_PER_MINUTE = 60 * 1000
    const MS_PER_HOUR = 60 * MS_PER_MINUTE
    const MS_PER_DAY = 24 * MS_PER_HOUR
    const MS_PER_WEEK = 7 * MS_PER_DAY
    const MS_PER_MONTH = 30 * MS_PER_DAY // Approximate
    const MS_PER_YEAR = 365 * MS_PER_DAY // Approximate
    
    switch (unit) {
      case 'm': return value * MS_PER_MINUTE
      case 'h': return value * MS_PER_HOUR
      case 'd': return value * MS_PER_DAY
      case 'w': return value * MS_PER_WEEK
      case 'mo': return value * MS_PER_MONTH
      case 'yr': return value * MS_PER_YEAR
      default: return null
    }
  }

  /**
   * Calculate the actual post date from search_date and LinkedIn relative time
   */
  const calculateActualPostDate = (searchDate: string, linkedInRelativeTime: string): Date | null => {
    try {
      const searchDateTime = new Date(searchDate)
      if (isNaN(searchDateTime.getTime())) return null
      
      const relativeMs = parseLinkedInRelativeTime(linkedInRelativeTime)
      if (relativeMs === null) return null
      
      // Subtract the relative time from search date to get actual post date
      return new Date(searchDateTime.getTime() - relativeMs)
    } catch {
      return null
    }
  }

  /**
   * Format timestamp for display - handles both absolute timestamps and calculated dates
   */
  const formatTimestamp = (postDate: string, searchDate: string): string => {
    let actualPostDate: Date | null = null
    
    // Try to calculate actual post date from LinkedIn relative time
    actualPostDate = calculateActualPostDate(searchDate, postDate)
    
    // Fallback: try parsing postDate as absolute date
    if (!actualPostDate) {
      const parsedDate = new Date(postDate)
      if (!isNaN(parsedDate.getTime())) {
        actualPostDate = parsedDate
      }
    }
    
    // Final fallback: use search date
    if (!actualPostDate) {
      const parsedSearchDate = new Date(searchDate)
      if (!isNaN(parsedSearchDate.getTime())) {
        actualPostDate = parsedSearchDate
      } else {
        return 'Unknown time'
      }
    }
    
    // Calculate time difference from NOW
    const now = new Date()
    const diffMs = now.getTime() - actualPostDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    if (diffWeeks < 4) return `${diffWeeks}w`
    return actualPostDate.toLocaleDateString()
  }

  const formatNumber = (num: string | number) => {
    const numValue = typeof num === 'string' ? parseInt(num) || 0 : num
    if (numValue >= 1000) return `${(numValue / 1000).toFixed(1)}K`
    return numValue.toString()
  }

  const renderDescription = (text: string) => {
    if (!text) return null

    const lines = text.split('\n')

    const elements: React.ReactNode[] = []
    let currentHashtags: string[] = []

    const flushHashtags = (key: string | number) => {
      if (currentHashtags.length > 0) {
        elements.push(
          <div key={`hashtags-${key}`} className="flex flex-wrap gap-x-2 gap-y-1">
            {currentHashtags.map((tag, tagIndex) => (
              <span key={tagIndex} className="font-medium text-blue-600">
                {tag}
              </span>
            ))}
          </div>,
        )
        currentHashtags = []
      }
    }

    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('#')) {
        currentHashtags.push(trimmed)
      } else if (trimmed.toLowerCase() !== 'hashtag') {
        flushHashtags(index)
        elements.push(
          <p key={`text-${index}`} className="whitespace-pre-wrap">
            {line}
          </p>,
        )
      }
    })

    flushHashtags('end')

    return elements
  }

  // Map database fields to display values
  const authorName = post.author_name || 'Unknown Author'
  const authorHeadline = post.author_occupation || 'LinkedIn User'
  const authorPhotoUrl = post.profile_image || undefined
  const likes = post.like_count ? parseInt(post.like_count) : undefined
  const comments = post.comment_count ? parseInt(post.comment_count) : undefined

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md ${
        post.applied ? 'border-green-400 border-2' : 'border-slate-200'
      }`}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            {/* Author Avatar */}
            {authorPhotoUrl ? (
              <img
                src={authorPhotoUrl}
                alt={authorName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {getInitials(authorName)}
              </div>
            )}

            {/* Author Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 hover:text-blue-600 hover:underline cursor-pointer">
                {authorName}
              </div>
              <div className="text-sm text-slate-600 line-clamp-1">
                {authorHeadline}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <span>{formatTimestamp(post.post_date || post.search_date, post.search_date)}</span>
                <span>•</span>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleApplied(post)}
              className={`p-1.5 rounded-full transition-colors disabled:opacity-50 ${
                post.applied
                  ? 'text-green-600 hover:bg-green-50'
                  : 'text-slate-400 hover:bg-slate-100'
              }`}
              disabled={isLoading}
              title={post.applied ? 'Mark as Not Applied' : 'Mark as Applied'}
            >
              {post.applied ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                </svg>
              )}
            </button>
            <button
              onClick={() => onToggleSaved(post)}
              className={`p-1.5 rounded-full transition-colors disabled:opacity-50 ${
                post.saved
                  ? 'text-yellow-600 hover:bg-yellow-50'
                  : 'text-slate-400 hover:bg-slate-100'
              }`}
              disabled={isLoading}
              title={post.saved ? 'Remove from Saved' : 'Save Post'}
            >
              {post.saved ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                </svg>
              )}
            </button>
            <button
              onClick={() => onDelete(post)}
              className="p-1.5 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
              disabled={isLoading}
              title="Delete Post"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <div className="text-slate-800 whitespace-pre-wrap break-words text-sm leading-relaxed">
          {renderDescription(post.description)}
        </div>
      </div>

      {/* Post Image (if exists) - We don't have this field in DB yet */}
      {/* {post.postImageUrl && (
        <div className="w-full">
          <img
            src={post.postImageUrl}
            alt="Post content"
            className="w-full object-cover"
            loading="lazy"
          />
        </div>
      )} */}

      {/* Engagement Bar */}
      {(likes !== undefined || comments !== undefined) && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-slate-400">
              {likes !== undefined && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M6.956 1.745C7.021.81 7.908.087 8.864.325l.261.066c.463.116.874.456 1.012.965.22.816.533 2.511.062 4.51a9.84 9.84 0 0 1 .443-.051c.713-.065 1.669-.072 2.516.21.518.173.994.681 1.2 1.273.184.532.16 1.162-.234 1.733.058.119.103.242.138.363.077.27.113.567.113.856 0 .289-.036.586-.113.856-.039.135-.09.273-.16.404.169.387.107.819-.003 1.148a3.163 3.163 0 0 1-.488.901c.054.152.076.312.076.465 0 .305-.089.625-.253.912C13.1 15.522 12.437 16 11.5 16H8c-.605 0-1.07-.081-1.466-.218a4.82 4.82 0 0 1-.97-.484l-.048-.03c-.504-.307-.999-.609-2.068-.722C2.682 14.464 2 13.846 2 13V9c0-.85.685-1.432 1.357-1.615.849-.232 1.574-.787 2.132-1.41.56-.627.914-1.28 1.039-1.639.199-.575.356-1.539.428-2.59z"/>
                  </svg>
                  <span>{formatNumber(likes)}</span>
                </div>
              )}
              {comments !== undefined && (
                <div className="flex items-center gap-1">
                  <span>{formatNumber(comments)} comments</span>
                </div>
              )}
            </div>
            <div className="text-[10px] text-slate-400 italic">
              at time of capture
            </div>
          </div>
        </div>
      )}

      {/* Footer Action Buttons */}
      <div className="px-4 py-2 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => onGoToPost(post)}
            className="flex-1 py-2 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/>
              <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/>
            </svg>
            Open on LinkedIn
          </button>
          <div className="text-xs text-slate-400 px-2">
            {post.search_keywords}
          </div>
        </div>
      </div>
    </div>
  )
}


