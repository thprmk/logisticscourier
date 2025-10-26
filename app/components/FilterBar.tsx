// app/components/FilterBar.tsx
"use client";

import { Search, X, ChevronDown } from 'lucide-react'; // Import ChevronDown for the custom dropdown

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  statusFilter: string;
  onStatusChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onClearFilters: () => void;
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onClearFilters,
}: FilterBarProps) {
  const isFiltered = searchQuery || statusFilter;

  return (
    // The main container remains a flexbox to position its children
    <div className="mb-6 flex items-center justify-between gap-4">
      
      {/* Left side: Search Bar */}
      {/* This wrapper gets the background and focus ring for a modern, borderless input look */}
      <div className="relative flex items-center w-full max-w-xs bg-gray-100 rounded-md focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
        <div className="absolute left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={onSearchChange}
          // The input itself is borderless and transparent, inheriting the wrapper's background
          className="w-full h-9 pl-10 pr-4 text-sm bg-transparent border-none focus:outline-none"
        />
      </div>

      {/* Right side: Filter and Clear button */}
      <div className="flex items-center gap-2">
        {/* This wrapper provides the same modern look for the select dropdown */}
        <div className="relative flex items-center bg-gray-100 rounded-md focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
          <select
            value={statusFilter}
            onChange={onStatusChange}
            // `appearance-none` hides the default browser arrow, allowing us to use our own
            className="w-full h-9 pl-3 pr-8 text-sm bg-transparent border-none appearance-none focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Failed">Failed</option>
          </select>
          {/* This is our custom dropdown arrow */}
          <div className="absolute right-0 pr-2 flex items-center pointer-events-none">
            <ChevronDown size={16} className="text-gray-400" />
          </div>
        </div>
        
        {/* The Clear Button is now an animated, minimal icon button */}
        <button
          onClick={onClearFilters}
          className={`flex items-center justify-center h-9 w-9 rounded-full text-gray-500 
                     hover:bg-gray-200 hover:text-gray-800 
                     transition-all duration-200
                     ${isFiltered ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} // Smooth appear/disappear animation
          title="Clear filters"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}