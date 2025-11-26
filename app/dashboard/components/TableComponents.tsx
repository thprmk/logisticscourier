import React from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, Eye, Edit, Trash2 } from 'lucide-react';

// --- Types ---
export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface ModernTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  onSelectAll?: () => void;
  keyField: keyof T;
}

// --- Status Badge Component ---
export const StatusBadge = ({ status }: { status: string }) => {
  const styles: { [key: string]: string } = {
    'At Origin Branch': 'bg-purple-100 text-purple-800 border-purple-200',
    'In Transit to Destination': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'At Destination Branch': 'bg-blue-100 text-blue-800 border-blue-200',
    'Assigned': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Out for Delivery': 'bg-orange-100 text-orange-800 border-orange-200',
    'Delivered': 'bg-green-100 text-green-800 border-green-200',
    'Failed': 'bg-red-100 text-red-800 border-red-200',
  };

  const defaultStyle = 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${styles[status] || defaultStyle}`}>
      {status}
    </span>
  );
};

// --- Action Buttons Component ---
interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ActionButtons = ({ onView, onEdit, onDelete }: ActionButtonsProps) => {
  return (
    <div className="flex items-center justify-end gap-2">
      {onView && (
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          title="View Details"
        >
          <Eye size={18} />
        </button>
      )}
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-2 text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Edit"
        >
          <Edit size={18} />
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
};

// --- Modern Table Component ---
export function ModernTable<T>({
  data,
  columns,
  isLoading,
  emptyMessage = "No data found",
  onRowClick,
  selectedIds,
  onSelect,
  onSelectAll,
  keyField,
}: ModernTableProps<T>) {

  const isAllSelected = data.length > 0 && selectedIds?.size === data.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {onSelectAll && (
                <th scope="col" className="px-6 py-4 text-left w-12">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={onSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                    />
                  </div>
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={`px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wide ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              // Loading Skeleton
              [...Array(5)].map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {onSelectAll && <td className="px-6 py-5"><div className="h-5 w-5 bg-gray-200 rounded"></div></td>}
                  {columns.map((_, colIdx) => (
                    <td key={colIdx} className="px-6 py-5">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td
                  colSpan={columns.length + (onSelectAll ? 1 : 0)}
                  className="px-6 py-16 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <ChevronsUpDown className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-900">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              data.map((item, rowIdx) => {
                const id = String(item[keyField]);
                const isSelected = selectedIds?.has(id);

                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`group transition-colors hover:bg-blue-50/50 ${onRowClick ? 'cursor-pointer' : ''
                      } ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    {onSelect && (
                      <td className="px-6 py-5 w-12" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelect(id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                          />
                        </div>
                      </td>
                    )}
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={`px-6 py-5 text-sm font-medium text-gray-700 ${col.className || ''}`}>
                        {col.cell ? col.cell(item) : (item[col.accessorKey!] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
