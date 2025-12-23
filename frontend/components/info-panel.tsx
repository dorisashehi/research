"use client";

import { useState, useEffect } from "react";

interface SubfieldData {
  id?: string;
  name: string;
  works_count: number;
  topics: Array<{ id?: string; name: string; works_count: number }>;
}

interface CountryInfo {
  name: string;
  code: string;
  region: string;
  population: number;
  gdp: number;
}

interface CountryResearchData {
  subfields: SubfieldData[];
}

interface InfoPanelProps {
  countryInfo: CountryInfo | null;
  countryData: CountryResearchData | null;
  loading?: boolean;
  onFetchTopics?: (
    countryCode: string,
    subfieldId: string
  ) => Promise<Array<{ id?: string; name: string; works_count: number }>>;
}

export default function InfoPanel({
  countryInfo,
  countryData,
  loading = false,
  onFetchTopics,
}: InfoPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loadingTopics, setLoadingTopics] = useState<Set<number>>(new Set());
  const [loadedTopics, setLoadedTopics] = useState<
    Map<number, Array<{ id?: string; name: string; works_count: number }>>
  >(new Map());
  const [isOpen, setIsOpen] = useState(true);

  // Reopen panel when country changes
  useEffect(() => {
    if (countryInfo) {
      setIsOpen(true);
      setExpandedIndex(null); // Reset expanded state when country changes
    }
  }, [countryInfo?.name]);

  const handleSubfieldExpand = async (idx: number, subfield: SubfieldData) => {
    if (expandedIndex === idx) {
      setExpandedIndex(null);
      return;
    }

    setExpandedIndex(idx);

    // If topics are already loaded or we have initial topics, don't fetch again
    if (
      loadedTopics.has(idx) ||
      (subfield.topics && subfield.topics.length > 0)
    ) {
      return;
    }

    // Fetch topics if we have the callback and subfield ID
    if (onFetchTopics && subfield.id && countryInfo) {
      setLoadingTopics((prev) => new Set(prev).add(idx));
      try {
        const topics = await onFetchTopics(countryInfo.code, subfield.id);
        setLoadedTopics((prev) => new Map(prev).set(idx, topics));
      } catch (error) {
        console.error("Error loading topics:", error);
      } finally {
        setLoadingTopics((prev) => {
          const next = new Set(prev);
          next.delete(idx);
          return next;
        });
      }
    }
  };

  const getTopicsForSubfield = (idx: number, subfield: SubfieldData) => {
    // Return loaded topics if available, otherwise return initial topics
    if (loadedTopics.has(idx)) {
      return loadedTopics.get(idx) || [];
    }
    return subfield.topics || [];
  };

  if (!countryInfo || !isOpen) return null;

  return (
    <div className="absolute top-5 right-5 max-w-96 max-h-[85vh] bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden z-50 flex flex-col">
      {/* Header with Close Button */}
      <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-slate-800/50">
        <h3 className="text-2xl font-semibold" style={{ color: "#4fc3ae" }}>
          {countryInfo.name}
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white transition-colors text-xl font-light leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto flex-1 p-5">
        {loading ? (
          <div className="text-center text-gray-400 text-sm py-6">
            <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2"></div>
            Loading country data...
          </div>
        ) : countryData &&
          countryData.subfields &&
          countryData.subfields.length > 0 ? (
          <div>
            <div
              className="text-lg font-semibold mb-5 flex items-center gap-2"
              style={{ color: "#4fc3ae" }}
            >
              <span className="text-xl">📊</span>
              <span>Top {countryData.subfields.length} Research Subfields</span>
            </div>

            <div className="space-y-3">
              {countryData.subfields.map((subfield, idx) => {
                const hasTopics =
                  (subfield.topics && subfield.topics.length > 0) ||
                  loadedTopics.has(idx);
                const topics = getTopicsForSubfield(idx, subfield);
                const isLoading = loadingTopics.has(idx);

                return (
                  <div
                    key={idx}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden hover:border-cyan-400/50 transition-all"
                  >
                    <div
                      onClick={() => handleSubfieldExpand(idx, subfield)}
                      className="p-4 cursor-pointer flex justify-between items-start hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="flex gap-3 flex-1">
                        <span
                          className="font-bold text-sm px-3 py-1.5 rounded min-w-fit"
                          style={{
                            backgroundColor: "#4fc3ae",
                            color: "#0f172a",
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div
                            className="font-semibold text-sm leading-tight mb-1"
                            style={{ color: "lab(65.9269% -.832707 -8.17473)" }}
                          >
                            {subfield.name}
                          </div>
                          <div
                            className="text-xs font-medium"
                            style={{ color: "#4fc3ae" }}
                          >
                            {subfield.works_count.toLocaleString()} works
                          </div>
                        </div>
                      </div>
                      {(hasTopics || (onFetchTopics && subfield.id)) && (
                        <span
                          className={`text-lg transition-transform duration-300 ease-in-out ml-2 flex-shrink-0 ${
                            expandedIndex === idx ? "rotate-90" : ""
                          }`}
                          style={{ color: "#4fc3ae" }}
                        >
                          ▶
                        </span>
                      )}
                    </div>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedIndex === idx
                          ? "max-h-[500px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="bg-slate-900/50 px-4 py-3 border-t border-slate-700/50">
                        {isLoading ? (
                          <div className="text-center text-gray-400 text-xs py-4">
                            <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2"></div>
                            Loading topics...
                          </div>
                        ) : topics.length > 0 ? (
                          <ul className="space-y-2.5">
                            {topics.map((topic, topicIdx) => (
                              <li
                                key={topic.id || topicIdx}
                                className="text-xs flex justify-between items-center py-2 border-b border-slate-700/30 last:border-b-0"
                              >
                                <span className="text-gray-300 flex-1">
                                  {topic.name}
                                </span>
                                <span
                                  className="font-semibold ml-3 whitespace-nowrap"
                                  style={{ color: "#4fc3ae" }}
                                >
                                  {topic.works_count.toLocaleString()} works
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-center text-gray-400 text-xs py-4">
                            No topics available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 text-sm py-6">
            No research data available for this country.
          </div>
        )}
      </div>
    </div>
  );
}
