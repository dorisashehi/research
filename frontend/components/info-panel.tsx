"use client"

import { useState } from "react"

interface SubfieldData {
  id?: string
  name: string
  works_count: number
  topics: Array<{ id?: string; name: string; works_count: number }>
}

interface CountryInfo {
  name: string
  code: string
  region: string
  population: number
  gdp: number
}

interface CountryResearchData {
  subfields: SubfieldData[]
}

interface InfoPanelProps {
  countryInfo: CountryInfo | null
  countryData: CountryResearchData | null
  loading?: boolean
  onFetchTopics?: (countryCode: string, subfieldId: string) => Promise<Array<{ id?: string; name: string; works_count: number }>>
}

export default function InfoPanel({ countryInfo, countryData, loading = false, onFetchTopics }: InfoPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [loadingTopics, setLoadingTopics] = useState<Set<number>>(new Set())
  const [loadedTopics, setLoadedTopics] = useState<Map<number, Array<{ id?: string; name: string; works_count: number }>>>(new Map())

  const handleSubfieldExpand = async (idx: number, subfield: SubfieldData) => {
    if (expandedIndex === idx) {
      setExpandedIndex(null)
      return
    }

    setExpandedIndex(idx)

    // If topics are already loaded or we have initial topics, don't fetch again
    if (loadedTopics.has(idx) || (subfield.topics && subfield.topics.length > 0)) {
      return
    }

    // Fetch topics if we have the callback and subfield ID
    if (onFetchTopics && subfield.id && countryInfo) {
      setLoadingTopics(prev => new Set(prev).add(idx))
      try {
        const topics = await onFetchTopics(countryInfo.code, subfield.id)
        setLoadedTopics(prev => new Map(prev).set(idx, topics))
      } catch (error) {
        console.error("Error loading topics:", error)
      } finally {
        setLoadingTopics(prev => {
          const next = new Set(prev)
          next.delete(idx)
          return next
        })
      }
    }
  }

  const getTopicsForSubfield = (idx: number, subfield: SubfieldData) => {
    // Return loaded topics if available, otherwise return initial topics
    if (loadedTopics.has(idx)) {
      return loadedTopics.get(idx) || []
    }
    return subfield.topics || []
  }

  if (!countryInfo) return null

  return (
    <div className="absolute top-5 right-5 max-w-96 max-h-[85vh] bg-blue-900/95 backdrop-blur-md p-5 rounded-lg border border-white/10 shadow-lg overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-cyan-400/30">
        <h3 className="text-2xl font-semibold text-cyan-400">{countryInfo.name}</h3>
      </div>

      <div className="text-sm text-gray-300 mb-6">
        <p>
          <span className="text-cyan-400">Code:</span> {countryInfo.code}
        </p>
        <p>
          <span className="text-cyan-400">Region:</span> {countryInfo.region}
        </p>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 text-sm py-6">
          <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2"></div>
          Loading country data...
        </div>
      ) : countryData && countryData.subfields && countryData.subfields.length > 0 ? (
        <div>
          <div className="text-cyan-400 text-base font-semibold mb-4 flex items-center gap-2">
            📊 Top {countryData.subfields.length} Research Subfields
          </div>

          <div className="space-y-3">
            {countryData.subfields.map((subfield, idx) => {
              const hasTopics = (subfield.topics && subfield.topics.length > 0) || loadedTopics.has(idx)
              const topics = getTopicsForSubfield(idx, subfield)
              const isLoading = loadingTopics.has(idx)

              return (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:border-cyan-400/30 transition-all"
                >
                  <div
                    onClick={() => handleSubfieldExpand(idx, subfield)}
                    className="p-3 cursor-pointer flex justify-between items-start"
                  >
                    <div className="flex gap-3 flex-1">
                      <span className="bg-gradient-to-b from-cyan-400 to-blue-500 text-blue-900 font-bold text-xs px-2 py-1 rounded min-w-fit">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">{subfield.name}</div>
                        <div className="text-cyan-400 text-xs mt-1 font-medium">
                          {subfield.works_count.toLocaleString()} works
                        </div>
                      </div>
                    </div>
                    {(hasTopics || (onFetchTopics && subfield.id)) && (
                      <span
                        className={`text-cyan-400 text-lg transition-transform ml-2 ${
                          expandedIndex === idx ? "rotate-90" : ""
                        }`}
                      >
                        ▶
                      </span>
                    )}
                  </div>

                  {expandedIndex === idx && (
                    <div className="bg-black/20 px-3 py-2">
                      {isLoading ? (
                        <div className="text-center text-gray-400 text-xs py-4">
                          <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2"></div>
                          Loading topics...
                        </div>
                      ) : topics.length > 0 ? (
                        <ul className="space-y-2">
                          {topics.map((topic, topicIdx) => (
                            <li
                              key={topic.id || topicIdx}
                              className="text-xs flex justify-between items-center py-1 border-b border-white/5 last:border-b-0"
                            >
                              <span className="text-gray-300">{topic.name}</span>
                              <span className="text-cyan-400 font-semibold ml-2">
                                {topic.works_count.toLocaleString()} works
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center text-gray-400 text-xs py-4">No topics available</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 text-sm py-6">No research data available for this country.</div>
      )}
    </div>
  )
}
