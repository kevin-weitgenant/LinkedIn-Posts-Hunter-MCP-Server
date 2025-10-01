import { useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table'
import { Post } from '../types'

interface TableViewProps {
  posts: Post[]
  onPostUpdate: (post: Partial<Post>) => void
  onPostDelete: (postId: number) => void
}

const columnHelper = createColumnHelper<Post>()

export function TableView({ posts, onPostUpdate, onPostDelete }: TableViewProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<Post>>({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  const startEdit = (post: Post) => {
    setEditingId(post.id)
    setEditForm({
      search_keywords: post.search_keywords,
      description: post.description,
      applied: post.applied
    })
    setErrorMessage(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
    setErrorMessage(null)
  }

  const handleSaveEdit = async (postId: number) => {
    setLoading(true)
    setErrorMessage(null)
    
    try {
      // Get the original post to merge changes
      const originalPost = posts.find(p => p.id === postId)
      if (!originalPost) {
        throw new Error('Post not found')
      }

      const updatedPost: Post = {
        ...originalPost,
        search_keywords: editForm.search_keywords ?? originalPost.search_keywords,
        description: editForm.description ?? originalPost.description,
        applied: editForm.applied ?? originalPost.applied
      }

      const response = await fetch('/api/posts/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([updatedPost])
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update post')
      }
      
      cancelEdit()
      onPostUpdate(updatedPost)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (post: Post) => {
    if (!confirm(`Are you sure you want to delete this post?\n\nKeywords: ${post.search_keywords}`)) {
      return
    }

    setLoading(true)
    setErrorMessage(null)
    
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete post')
      }
      
      onPostDelete(post.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleApplied = async (post: Post) => {
    setLoading(true)
    setErrorMessage(null)
    
    try {
      const newAppliedStatus = !post.applied
      const response = await fetch(`/api/posts/${post.id}/applied`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applied: newAppliedStatus })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update applied status')
      }
      
      onPostUpdate({ id: post.id, applied: newAppliedStatus ? 1 : 0 })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    columnHelper.accessor('id', {
      header: 'ID',
      cell: info => <span className="font-medium text-slate-900">{info.getValue()}</span>,
      size: 60
    }),
    columnHelper.accessor('profile_image', {
      header: 'Avatar',
      cell: info => (
        <div className="flex justify-center">
          {info.getValue() ? (
            <img 
              src={info.getValue()} 
              alt="Profile" 
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </div>
      ),
      size: 80
    }),
    columnHelper.accessor('author_name', {
      header: 'Author',
      cell: info => (
        <span className="font-medium text-slate-700">
          {info.getValue() || '-'}
        </span>
      ),
      size: 150
    }),
    columnHelper.accessor('search_keywords', {
      header: 'Keywords',
      cell: info =>
        editingId === info.row.original.id ? (
          <input
            type="text"
            value={editForm.search_keywords ?? ''}
            onChange={e => setEditForm({ ...editForm, search_keywords: e.target.value })}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
        ) : (
          <span className="font-semibold text-slate-800">{info.getValue()}</span>
        ),
      size: 200
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: info =>
        editingId === info.row.original.id ? (
          <textarea
            value={editForm.description ?? ''}
            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            rows={3}
          />
        ) : (
          <div className="max-h-24 overflow-y-auto pr-2">
            <p className="whitespace-normal break-words">
              {info.getValue()}
            </p>
          </div>
        ),
      size: 400
    }),
    columnHelper.accessor('post_date', {
      header: 'Post Date',
      cell: info => (
        <span className="text-slate-600 text-sm">
          {info.getValue() || '-'}
        </span>
      ),
      size: 120
    }),
    columnHelper.accessor('search_date', {
      header: 'Scraped',
      cell: info => (
        <span className="text-slate-500 text-xs">
          {new Date(info.getValue()).toLocaleDateString()}
        </span>
      ),
      size: 100
    }),
    columnHelper.accessor('like_count', {
      header: 'Likes',
      cell: info => (
        <div className="text-center">
          <span className="text-slate-700">
            {info.getValue() ? `👍 ${info.getValue()}` : '-'}
          </span>
        </div>
      ),
      size: 90
    }),
    columnHelper.accessor('comment_count', {
      header: 'Comments',
      cell: info => (
        <div className="text-center">
          <span className="text-slate-700">
            {info.getValue() ? `💬 ${info.getValue()}` : '-'}
          </span>
        </div>
      ),
      size: 110
    }),
    columnHelper.accessor('applied', {
      header: 'Applied',
      cell: info => (
        <div className="text-center">
          {editingId === info.row.original.id ? (
            <input
              type="checkbox"
              checked={editForm.applied === 1}
              onChange={e => setEditForm({ ...editForm, applied: e.target.checked ? 1 : 0 })}
              className="w-5 h-5 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500"
            />
          ) : (
            <button
              onClick={() => handleToggleApplied(info.row.original)}
              className="text-2xl disabled:opacity-50"
              disabled={loading}
              title="Click to toggle"
            >
              {info.getValue() === 1 ? '✅' : '⭕'}
            </button>
          )}
        </div>
      ),
      size: 80
    }),
    columnHelper.accessor('screenshot_path', {
      header: 'Screenshot',
      cell: info => <div className="text-center text-xl">{info.getValue() ? '📷' : '-'}</div>,
      size: 100
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center justify-center space-x-2">
          {editingId === row.original.id ? (
            <>
              <button
                onClick={() => handleSaveEdit(row.original.id)}
                className="font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-md text-xs disabled:opacity-50"
                disabled={loading}
              >
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-md text-xs disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => window.open(row.original.post_link, '_blank')}
                className="font-medium text-blue-600 hover:underline p-1"
                title="Open post"
              >
                🔗
              </button>
              <button
                onClick={() => startEdit(row.original)}
                className="font-medium text-blue-600 hover:underline p-1 disabled:opacity-50"
                disabled={loading}
                title="Edit post"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDelete(row.original)}
                className="font-medium text-red-600 hover:underline p-1 disabled:opacity-50"
                disabled={loading}
                title="Delete post"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      ),
      size: 120
    })
  ]

  const table = useReactTable({
    data: posts,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-xl text-slate-500">📋 No posts found.</p>
        <p className="text-sm text-slate-400 mt-2">
          Use the search tool to find LinkedIn posts.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4">
      {errorMessage && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md flex justify-between items-center">
          <div>
            <strong className="font-bold">Error:</strong> {errorMessage}
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm text-left text-slate-500 table-fixed">
          <thead className="bg-slate-50 text-xs text-slate-700 uppercase">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-6 py-3"
                    style={{ 
                      width: header.getSize(),
                      maxWidth: header.getSize() 
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className="ml-2">
                        {{
                          asc: '🔼',
                          desc: '🔽'
                        }[header.column.getIsSorted() as string] ?? null}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className={`bg-white border-b hover:bg-slate-50 ${
                  editingId === row.original.id ? 'bg-blue-50' : ''
                }`}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


