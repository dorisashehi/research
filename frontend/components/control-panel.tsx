"use client";

import { useState, useRef, useEffect } from "react";

interface CountryInfo {
  name: string;
  code: string;
  region: string;
  population: number;
  gdp: number;
}

interface ControlPanelProps {
  autoRotate: boolean;
  onAutoRotateChange: (value: boolean) => void;
  rotationSpeed: number;
  onRotationSpeedChange: (value: number) => void;
  onResetView: () => void;
  onToggleAtmosphere: () => void;
  showAtmosphere: boolean;
  countryDataMap: Map<string, CountryInfo>;
  onCountrySelect: (country: string) => void;
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
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearch = (value: string) => {
    setSearchInput(value);

    if (value.length > 0) {
      const results = Array.from(countryDataMap.entries())
        .filter(([_, data]) =>
          data.name.toLowerCase().includes(value.toLowerCase())
        )
        .map(([_, data]) => data.name)
        .slice(0, 10);

      setSearchResults(results);
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  const handleSelectCountry = (countryName: string) => {
    setSearchInput(countryName);
    setShowResults(false);

    const countryId = Array.from(countryDataMap.entries()).find(
      ([_, data]) => data.name === countryName
    )?.[0];
    if (countryId) {
      onCountrySelect(countryId);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="absolute top-5 left-5 z-50 max-w-80">
      <div className="bg-slate-900/90 backdrop-blur-md p-6 rounded-xl border border-slate-700/50 shadow-2xl">
        {/* Header with Globe Icon */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🌍</span>
          <h2 className="text-xl font-semibold" style={{ color: "#4fc3ae" }}>
            Globe-al Research
          </h2>
        </div>

        {/* Search */}
        <div className="mb-6 relative" ref={searchRef}>
          <label className="block text-xs uppercase text-gray-400 tracking-wider mb-2 font-medium">
            SEARCH COUNTRY
          </label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Canada"
            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-600/50 rounded-lg text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
          />

          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur border border-slate-600/50 rounded-lg shadow-xl max-h-60 overflow-y-auto z-10">
              {searchResults.map((result) => (
                <div
                  key={result}
                  onClick={() => handleSelectCountry(result)}
                  className="px-4 py-2 cursor-pointer hover:bg-cyan-400/20 border-b border-slate-700/50 last:border-b-0 text-white text-sm transition-colors"
                >
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rotation Speed */}
        <div className="mb-6">
          <label className="block text-xs uppercase text-gray-400 tracking-wider mb-3 font-medium">
            ROTATION SPEED:{" "}
            <span className="text-cyan-400">{rotationSpeed.toFixed(1)}X</span>
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={rotationSpeed}
            onChange={(e) =>
              onRotationSpeedChange(Number.parseFloat(e.target.value))
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            style={{
              background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${
                (rotationSpeed / 5) * 100
              }%, #475569 ${(rotationSpeed / 5) * 100}%, #475569 100%)`,
            }}
          />
        </div>

        {/* Buttons Row */}
        <div className="flex gap-3 mb-3">
          <button
            onClick={() => onAutoRotateChange(!autoRotate)}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              autoRotate
                ? "text-slate-900 shadow-lg"
                : "bg-opacity-20 border hover:bg-opacity-30"
            }`}
            style={{
              backgroundColor: autoRotate
                ? "#4fc3ae"
                : "rgba(79, 195, 174, 0.2)",
              color: autoRotate ? "#0f172a" : "#4fc3ae",
              borderColor: autoRotate
                ? "transparent"
                : "rgba(79, 195, 174, 0.5)",
              boxShadow: autoRotate
                ? "0 10px 15px -3px rgba(79, 195, 174, 0.3)"
                : "none",
            }}
          >
            Auto-Rotate
          </button>
          <button
            onClick={onResetView}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold transition-all bg-opacity-20 border hover:bg-opacity-30"
            style={{
              backgroundColor: "rgba(79, 195, 174, 0.2)",
              color: "#4fc3ae",
              borderColor: "rgba(79, 195, 174, 0.5)",
            }}
          >
            Reset View
          </button>
        </div>

        {/* Atmosphere Button */}
        <button
          onClick={onToggleAtmosphere}
          className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
            showAtmosphere
              ? "text-slate-900 shadow-lg"
              : "bg-opacity-20 border hover:bg-opacity-30"
          }`}
          style={{
            backgroundColor: showAtmosphere
              ? "#4fc3ae"
              : "rgba(79, 195, 174, 0.2)",
            color: showAtmosphere ? "#0f172a" : "#4fc3ae",
            borderColor: showAtmosphere
              ? "transparent"
              : "rgba(79, 195, 174, 0.5)",
            boxShadow: showAtmosphere
              ? "0 10px 15px -3px rgba(79, 195, 174, 0.3)"
              : "none",
          }}
        >
          Atmosphere
        </button>
      </div>
    </div>
  );
}
