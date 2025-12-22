"use client"

import { useState, useRef, useEffect } from "react"

interface CountryInfo {
  name: string
  code: string
  region: string
  population: number
  gdp: number
}

interface ControlPanelProps {
  autoRotate: boolean
  onAutoRotateChange: (value: boolean) => void
  rotationSpeed: number
  onRotationSpeedChange: (value: number) => void
  onResetView: () => void
  onToggleAtmosphere: () => void
  showAtmosphere: boolean
  countryDataMap: Map<string, CountryInfo>
  onCountrySelect: (country: string) => void
}

export default function ControlPanel({
  autoRotate,
  onAutoRotateChange,
  rotationSpeed,
  onRotationSpeedChange,
  onResetView,
  onToggleAtmosphere,
  showAtmosphere,
  countryDataMap,
  onCountrySelect,
}: ControlPanelProps) {
  const [searchInput, setSearchInput] = useState("")
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const handleSearch = (value: string) => {
    setSearchInput(value)

    if (value.length > 0) {
      const results = Array.from(countryDataMap.entries())
        .filter(([_, data]) => data.name.toLowerCase().includes(value.toLowerCase()))
        .map(([_, data]) => data.name)
        .slice(0, 10)

      setSearchResults(results)
      setShowResults(true)
    } else {
      setShowResults(false)
    }
  }

  const handleSelectCountry = (countryName: string) => {
    setSearchInput(countryName)
    setShowResults(false)

    const countryId = Array.from(countryDataMap.entries()).find(([_, data]) => data.name === countryName)?.[0]
    if (countryId) {
      onCountrySelect(countryId)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="absolute top-5 left-16 z-50 max-w-80">
      <div className="bg-blue-900/50 backdrop-blur-md p-5 rounded-lg border border-white/10 shadow-lg">
        <h2 className="text-lg font-semibold text-cyan-400 mb-4">🌍 Globe Controls</h2>

        {/* Search */}
        <div className="mb-4 relative" ref={searchRef}>
          <label className="block text-xs uppercase text-gray-400 tracking-wider mb-2">Search Country</label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Type country name..."
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
          />

          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-blue-900/95 backdrop-blur border border-white/10 rounded-md shadow-lg max-h-60 overflow-y-auto z-10">
              {searchResults.map((result) => (
                <div
                  key={result}
                  onClick={() => handleSelectCountry(result)}
                  className="px-3 py-2 cursor-pointer hover:bg-cyan-400/20 border-b border-white/5 last:border-b-0 text-white text-sm"
                >
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rotation Speed */}
        <div className="mb-4">
          <label className="block text-xs uppercase text-gray-400 tracking-wider mb-2">
            Rotation Speed: <span className="text-cyan-400">{rotationSpeed.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={rotationSpeed}
            onChange={(e) => onRotationSpeedChange(Number.parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onAutoRotateChange(!autoRotate)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              autoRotate
                ? "bg-cyan-400 text-blue-900"
                : "bg-cyan-400/20 text-cyan-400 border border-cyan-400 hover:bg-cyan-400/30"
            }`}
          >
            Auto-Rotate
          </button>
          <button
            onClick={onResetView}
            className="flex-1 px-3 py-2 rounded-md text-sm font-medium bg-cyan-400/20 text-cyan-400 border border-cyan-400 hover:bg-cyan-400/30 transition-all"
          >
            Reset View
          </button>
        </div>

        {/* Atmosphere */}
        <button
          onClick={onToggleAtmosphere}
          className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-all ${
            showAtmosphere
              ? "bg-cyan-400 text-blue-900"
              : "bg-cyan-400/20 text-cyan-400 border border-cyan-400 hover:bg-cyan-400/30"
          }`}
        >
          Atmosphere
        </button>
      </div>
    </div>
  )
}
