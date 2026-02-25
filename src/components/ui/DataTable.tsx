import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  Download,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportTableToCSV, exportTableToPDF } from '@/lib/exportUtils'

export interface Column<T> {
  key: keyof T
  title: string
  render?: (value: unknown, row: T) => React.ReactNode
  sortable?: boolean
  width?: string
  className?: string
  exportFormatter?: (value: unknown, row: T) => string | number
}

interface DataTableProps<T = Record<string, unknown>> {
  data: T[]
  columns: Column<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  pagination?: boolean
  pageSize?: number
  className?: string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  loading?: boolean
  enableExport?: boolean
  exportFileName?: string
}

export function DataTable<T = Record<string, unknown>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'Search...',
  pagination = true,
  pageSize = 10,
  className,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
  enableExport = false,
  exportFileName = 'export'
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Ensure data is always an array
  const dataArray = Array.isArray(data) ? data : []

  // Filter data based on search term
  const filteredData = dataArray.filter((row) => {
    if (!searchTerm) return true
    return columns.some((column) => {
      const value = row[column.key]
      return value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    })
  })

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0

    const aValue = a[sortKey]
    const bValue = b[sortKey]

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedData = pagination
    ? sortedData.slice(startIndex, startIndex + pageSize)
    : sortedData

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleExportPDF = () => {
    // Export currently filtered data (not just current page)
    exportTableToPDF('Data Export', columns, filteredData, `${exportFileName}.pdf`)
  }

  const handleExportCSV = () => {
    // Export currently filtered data (not just current page)
    exportTableToCSV(columns, filteredData, exportFileName)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Export */}
      {(searchable || enableExport) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {searchable && (
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          )}

          {enableExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto sm:ml-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-full sm:w-48">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="mr-2 h-4 w-4 text-red-600" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="mr-2 h-4 w-4 text-green-600" />
                  Export as CSV/Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Table - with horizontal scroll */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-orange-500/20 scrollbar-track-transparent">
          <Table className="min-w-[600px] lg:min-w-full">
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={String(column.key)}
                    className={cn(
                      column.sortable && 'cursor-pointer hover:bg-muted whitespace-nowrap',
                      column.width && `w-[${column.width}]`,
                      column.className
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className={cn("flex items-center gap-2", column.className?.includes('text-right') ? "justify-end" : column.className?.includes('text-center') && "justify-center")}>
                      {column.title}
                      {column.sortable && sortKey === column.key && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8">
                    <div className="text-muted-foreground">{emptyMessage}</div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                  <TableRow
                    key={index}
                    className={cn(
                      onRowClick && 'cursor-pointer hover:bg-muted'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => (
                      <TableCell key={String(column.key)} className={cn(column.className, "whitespace-nowrap")}>
                        {column.render
                          ? column.render(row[column.key], row)
                          : String(row[column.key] ?? '')
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedData.length)} of {sortedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 md:h-9"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only ml-1">Prev</span>
            </Button>

            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 md:h-9"
            >
              <span className="sr-only sm:not-sr-only mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

