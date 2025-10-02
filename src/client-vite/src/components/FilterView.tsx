import React from 'react'
import DatePicker from 'react-datepicker'
import { AppliedFilterType, SavedFilterType } from '../App'

interface FilterViewProps {
  keywordFilter: string
  setKeywordFilter: (value: string) => void
  appliedFilter: AppliedFilterType
  setAppliedFilter: (value: AppliedFilterType) => void
  savedFilter: SavedFilterType
  setSavedFilter: (value: SavedFilterType) => void
  uniqueKeywords: string[]
  startDate: Date | null
  setStartDate: (value: Date | null) => void
  endDate: Date | null
  setEndDate: (value: Date | null) => void
  idFilter: string
  setIdFilter: (value: string) => void
}

export const FilterView: React.FC<FilterViewProps> = ({
  keywordFilter,
  setKeywordFilter,
  appliedFilter,
  setAppliedFilter,
  savedFilter,
  setSavedFilter,
  uniqueKeywords,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  idFilter,
  setIdFilter,
}) => {
  const handleKeywordChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setKeywordFilter(e.target.value)
  }
  return (
    <div className="bg-slate-50 p-4 border-b border-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Keyword Filter */}
            <div className="filter-item">
              <label
                htmlFor="keyword-filter"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Keyword:
              </label>
              <select
                id="keyword-filter"
                value={keywordFilter}
                onChange={handleKeywordChange}
                className="w-full bg-white border border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Keywords</option>
                {uniqueKeywords.map(kw => (
                  <option key={kw} value={kw}>
                    {kw}
                  </option>
                ))}
              </select>
            </div>

            {/* Applied Status Filter */}
            <div className="filter-item">
              <label
                htmlFor="applied-filter"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Applied:
              </label>
              <select
                id="applied-filter"
                value={appliedFilter}
                onChange={e =>
                  setAppliedFilter(e.target.value as AppliedFilterType)
                }
                className="w-full bg-white border border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="applied">Applied</option>
                <option value="not-applied">Not Applied</option>
              </select>
            </div>

            {/* Saved Status Filter */}
            <div className="filter-item">
              <label
                htmlFor="saved-filter"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Saved:
              </label>
              <select
                id="saved-filter"
                value={savedFilter}
                onChange={e =>
                  setSavedFilter(e.target.value as SavedFilterType)
                }
                className="w-full bg-white border border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="saved">Saved</option>
                <option value="not-saved">Not Saved</option>
              </select>
            </div>

            {/* ID Filter */}
            <div className="filter-item">
              <label
                htmlFor="id-filter"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Filter by ID:
              </label>
              <input
                type="text"
                id="id-filter"
                value={idFilter}
                onChange={e => setIdFilter(e.target.value)}
                placeholder="e.g., 1, 5, 10"
                className="w-full bg-white border border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date Range Filter */}
            <div className="filter-item">
              <label
                htmlFor="start-date"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                From:
              </label>
              <DatePicker
                id="start-date"
                selected={startDate}
                onChange={(date: Date | null) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                isClearable
                placeholderText="Select start date"
                className="w-full bg-white border border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="filter-item">
              <label
                htmlFor="end-date"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                To:
              </label>
              <DatePicker
                id="end-date"
                selected={endDate}
                onChange={(date: Date | null) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate ?? undefined}
                isClearable
                placeholderText="Select end date"
                className="w-full bg-white border border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
