'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, AlertCircle, Info, AlertTriangle, X, RefreshCw, ChevronRight, ChevronDown, Filter, Clock, Calendar, ChevronDown as ChevronDownIcon, Tag, MonitorSmartphone, Server, Columns } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { ScrollArea } from './scroll-area';
import { Button } from './button';
import { Dialog, DialogContent, DialogTitle } from './dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from './dropdown-menu';
import { format } from 'date-fns';

interface Log {
  timestamp?: string;
  message?: string;
  level?: string;
  id?: string;
  hostname?: string;
  service?: string;
  [key: string]: any;
}

// Response structure from the API
interface LogsResponse {
  logs: Log[];
  totalCount?: number;
  hasMore?: boolean;
}

// Time window options
const timeWindows = [
  { label: "Last 15 min", value: 15 * 60 * 1000 },
  { label: "Last 30 min", value: 30 * 60 * 1000 },
  { label: "Last 1 hour", value: 60 * 60 * 1000 },
  { label: "Last 4 hours", value: 4 * 60 * 60 * 1000 },
  { label: "Last 12 hours", value: 12 * 60 * 60 * 1000 },
  { label: "Last 24 hours", value: 24 * 60 * 60 * 1000 },
  { label: "Last 7 days", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "Last 30 days", value: 30 * 24 * 60 * 60 * 1000 },
  { label: "Custom range", value: -1 },
];

// Standard log fields that we'll display in the table view (if they exist)
const standardLogFields = ['timestamp', 'level', 'message', 'hostname', 'service'];

export default function LogViewer() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [queryString, setQueryString] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(timeWindows[7].value); // Default to 1 hour
  const [timeWindowLabel, setTimeWindowLabel] = useState(timeWindows[7].label);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(Date.now() - 24 * 60 * 60 * 1000)); // Default to 24 hours ago
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date()); // Default to now
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [userSelectedColumns, setUserSelectedColumns] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMoreLogs, setHasMoreLogs] = useState<boolean>(true);
  const tableRef = useRef<HTMLDivElement>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);

  // Handle scroll event for infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (!tableRef.current || isLoading || isLoadingMore || !hasMoreLogs) return;
      
      const { scrollTop, scrollHeight, clientHeight } = tableRef.current;
      // Load more when scrolled to near bottom (50px threshold)
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        loadMoreLogs();
      }
    };

    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (tableElement) {
        tableElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isLoading, isLoadingMore, hasMoreLogs, queryString, selectedTimeWindow]);

  // Load more logs when scrolled to bottom
  const loadMoreLogs = async () => {
    if (isLoadingMore || !hasMoreLogs) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      await fetchLogs(queryString, nextPage, true);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading more logs:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch logs on component mount and when time window changes
  useEffect(() => {
    fetchLogs();
  }, [selectedTimeWindow, customStartDate, customEndDate]);

  // Apply filters whenever logs or activeFilters change
  useEffect(() => {
    let result = [...logs];
    
    // Apply active filters
    Object.entries(activeFilters).forEach(([field, value]) => {
      result = result.filter(log => {
        return String(log[field]) === value;
      });
    });
    
    // Double check sorting on the client side to ensure newest logs are first
    result.sort((a, b) => {
      if (!a.timestamp && !b.timestamp) return 0;
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      
      try {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      } catch (e) {
        return 0;
      }
    });
    
    setFilteredLogs(result);
    
    // Determine available fields based on all logs
    const fieldsSet = new Set<string>();
    result.forEach(log => {
      Object.keys(log).forEach(field => {
        fieldsSet.add(field);
      });
    });
    
    // Sort fields with standard fields first
    const allFields = Array.from(fieldsSet);
    allFields.sort((a, b) => {
      // Always put timestamp first
      if (a === 'timestamp') return -1;
      if (b === 'timestamp') return 1;
      
      const aIsStandard = standardLogFields.includes(a);
      const bIsStandard = standardLogFields.includes(b);
      
      if (aIsStandard && !bIsStandard) return -1;
      if (!aIsStandard && bIsStandard) return 1;
      return a.localeCompare(b);
    });
    
    setAvailableFields(allFields);
    
    // If user hasn't selected any columns yet, pre-select standard fields that exist
    if (userSelectedColumns.length === 0 && allFields.length > 0) {
      const defaultColumns = standardLogFields.filter(field => 
        allFields.includes(field)
      );
      
      // Always include timestamp if it exists
      if (!defaultColumns.includes('timestamp') && allFields.includes('timestamp')) {
        defaultColumns.unshift('timestamp');
      }
      
      setUserSelectedColumns(defaultColumns);
    }
    
    // Determine visible columns based on user selection or available data
    let columns = userSelectedColumns.length > 0 
      ? [...userSelectedColumns] 
      : standardLogFields.filter(field => allFields.includes(field));
    
    // Always include timestamp if it exists and ensure it's first
    if (allFields.includes('timestamp') && !columns.includes('timestamp')) {
      columns.unshift('timestamp');
    } else if (columns.includes('timestamp') && columns.indexOf('timestamp') > 0) {
      // Move timestamp to front if it's not already there
      columns = ['timestamp', ...columns.filter(f => f !== 'timestamp')];
    }
    
    setVisibleColumns(columns);
  }, [logs, activeFilters, userSelectedColumns]);

  // Calculate grid columns based on visible columns
  const getGridTemplateColumns = () => {
    // Simplified grid template - eliminate variable widths that could be causing display issues
    let columnTemplate = '';
    
    if (visibleColumns.includes('timestamp')) {
      columnTemplate += 'minmax(70px, 90px) minmax(80px, 100px) '; // Date + Time
    }
    
    // Add fixed width columns for better stability
    visibleColumns.forEach(field => {
      if (field !== 'timestamp') {  // Skip timestamp as it's already handled
        switch (field) {
          case 'level':
            columnTemplate += 'minmax(70px, 90px) ';
            break;
          case 'message':
            columnTemplate += 'minmax(200px, 1fr) ';
            break;
          case 'id':
            columnTemplate += 'minmax(100px, 150px) ';
            break;
          case 'hostname':
            columnTemplate += 'minmax(120px, 180px) ';
            break;
          case 'service':
            columnTemplate += 'minmax(100px, 150px) ';
            break;
          default:
            columnTemplate += 'minmax(100px, 150px) ';
        }
      }
    });
    
    // Add the action column
    columnTemplate += '40px';
    
    return columnTemplate;
  };

  // Function to format the timestamp to be more compact
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch (error) {
      return timestamp;
    }
  };

  // Format date for display in table
  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
    } catch (error) {
      return '';
    }
  };

  // Format full timestamp for details
  const formatFullTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString([], { 
        year: 'numeric', 
        month: 'numeric', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      return timestamp;
    }
  };

  // Apply custom date range
  const applyCustomDateRange = () => {
    setSelectedTimeWindow(-1); // Custom range
    setTimeWindowLabel(`${format(customStartDate, 'MM/dd/yy HH:mm')} - ${format(customEndDate, 'MM/dd/yy HH:mm')}`);
    setIsDatePickerOpen(false);
  };

  // Function to fetch logs with an optional query
  const fetchLogs = async (query?: string, pageNum: number = 1, appendLogs: boolean = false) => {
    if (!appendLogs) {
      setIsLoading(true);
      // Only reset filters and page when doing a new search
      setActiveFilters({});
      setPage(1);
    }
    
    setError('');
    
    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query, 
          page: pageNum,
          limit: 50, // Fetch 50 logs per page
          timeWindow: selectedTimeWindow,
          startDate: selectedTimeWindow === -1 ? customStartDate.toISOString() : undefined,
          endDate: selectedTimeWindow === -1 ? customEndDate.toISOString() : undefined
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching logs: ${response.statusText}`);
      }
      
      const data: LogsResponse = await response.json();
      
      // Process logs based on time filters if needed
      let processedLogs = data.logs || [];
      
      // If we're appending logs, combine with existing logs
      if (appendLogs) {
        setLogs(prevLogs => [...prevLogs, ...processedLogs]);
        setFilteredLogs(prevLogs => [...prevLogs, ...processedLogs]);
      } else {
        setLogs(processedLogs);
        setFilteredLogs(processedLogs);
      }
      
      // Update whether there are more logs to fetch
      setHasMoreLogs(data.hasMore || false);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch logs');
    } finally {
      if (!appendLogs) {
        setIsLoading(false);
      }
    }
  };

  // Function to handle query submission
  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset page to 1 for new searches
    setPage(1);
    fetchLogs(queryString);
  };

  // Add a filter for a specific field and value
  const addFilter = (field: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [field]: String(value)
    }));
  };

  // Remove a filter
  const removeFilter = (field: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
  };

  // Get unique values for a field
  const getUniqueValues = (field: string): any[] => {
    const values = new Set<any>();
    logs.forEach(log => {
      if (log[field] !== undefined) {
        values.add(log[field]);
      }
    });
    return Array.from(values);
  };

  // Function to get the appropriate icon for log level
  const getLogLevelIcon = (level?: string) => {
    if (!level) return <Info className="h-4 w-4 text-blue-500" />;
    
    switch (level.toLowerCase()) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Function to get the appropriate color for log level
  const getLogLevelColor = (level?: string) => {
    if (!level) return 'text-blue-500';
    
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-blue-500';
    }
  };

  // Toggle expanded state for a log
  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  // Handle opening the modal with the selected log
  const handleLogClick = (log: Log) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  // Get icon for field
  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'id':
        return <Tag className="h-3.5 w-3.5 mr-1.5" />;
      case 'hostname':
        return <MonitorSmartphone className="h-3.5 w-3.5 mr-1.5" />;
      case 'service':
        return <Server className="h-3.5 w-3.5 mr-1.5" />;
      default:
        return null;
    }
  };

  // Handle time window selection
  const handleTimeWindowChange = (value: number, label: string) => {
    setSelectedTimeWindow(value);
    setTimeWindowLabel(label);
  };

  // Get standard and custom fields
  const getStandardFields = (log: Log) => {
    return Object.entries(log).filter(([key]) => standardLogFields.includes(key));
  };

  const getCustomFields = (log: Log) => {
    return Object.entries(log).filter(([key]) => !standardLogFields.includes(key));
  };

  // Get column header for field
  const getColumnHeader = (field: string) => {
    switch (field) {
      case 'timestamp':
        return ['Date', 'Time'];
      case 'level':
        return ['Level'];
      case 'id':
        return ['ID'];
      case 'hostname':
        return ['Host'];
      case 'service':
        return ['Service'];
      case 'message':
        return ['Message'];
      default:
        return [field.charAt(0).toUpperCase() + field.slice(1)];
    }
  };

  // Render column content for field
  const renderColumnContent = (log: Log, field: string, index: number) => {
    if (field === 'timestamp') {
      return (
        <React.Fragment key={`${field}-${index}`}>
          <div className="whitespace-nowrap text-muted-foreground text-xs px-2 py-1 overflow-hidden text-ellipsis">
            {log.timestamp ? formatDate(log.timestamp) : '—'}
          </div>
          <div className="whitespace-nowrap text-muted-foreground text-xs px-2 py-1 overflow-hidden text-ellipsis">
            {log.timestamp ? formatTimestamp(log.timestamp) : '—'}
          </div>
        </React.Fragment>
      );
    }
    
    if (field === 'level') {
      return (
        <div key={`${field}-${index}`} className="px-2 py-1 overflow-hidden text-ellipsis">
          <span className={`text-xs font-medium ${getLogLevelColor(log.level)}`}>
            {log.level || 'info'}
          </span>
        </div>
      );
    }
    
    if (field === 'message') {
      return (
        <div key={`${field}-${index}`} className="px-2 py-1 truncate text-xs overflow-hidden text-ellipsis">
          {log.message || 'No message'}
        </div>
      );
    }
    
    // Generic field rendering
    return (
      <div key={`${field}-${index}`} className="px-2 py-1 text-xs overflow-hidden text-ellipsis flex items-center">
        {getFieldIcon(field)}
        <span className="truncate">{log[field] !== undefined ? String(log[field]) : '—'}</span>
      </div>
    );
  };

  // Syntax highlighting for JSON
  const syntaxHighlight = (json: string) => {
    // Add syntax highlighting classes
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'text-purple-600'; // string
        if (/^"/.test(match) && /:$/.test(match)) {
          cls = 'text-blue-600 font-medium'; // key
        } else if (/true|false/.test(match)) {
          cls = 'text-amber-600'; // boolean
        } else if (/null/.test(match)) {
          cls = 'text-gray-600'; // null
        } else if (/-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/.test(match) && !/":$/.test(match)) {
          cls = 'text-emerald-600'; // number
        }
        return `<span class="${cls}">${match}</span>`;
      });
  };

  // Toggle a column's visibility
  const toggleColumnVisibility = (field: string) => {
    // Prevent timestamp from being toggled off
    if (field === 'timestamp') return;
    
    setUserSelectedColumns(prev => {
      if (prev.includes(field)) {
        return prev.filter(f => f !== field);
      } else {
        return [...prev, field];
      }
    });
  };

  // Select all available columns
  const selectAllColumns = () => {
    // Ensure timestamp is included
    const allFields = [...availableFields];
    if (!allFields.includes('timestamp') && logs.some(log => log.timestamp !== undefined)) {
      allFields.push('timestamp');
    }
    setUserSelectedColumns(allFields);
  };

  // Clear all selected columns
  const clearAllColumns = () => {
    // Keep timestamp field even when clearing
    setUserSelectedColumns(logs.some(log => log.timestamp !== undefined) ? ['timestamp'] : []);
  };

  // Reset to default columns (standard fields that exist)
  const resetToDefaultColumns = () => {
    const defaultColumns = standardLogFields.filter(field => 
      availableFields.includes(field)
    );
    
    // Ensure timestamp is included if it exists in logs
    if (!defaultColumns.includes('timestamp') && logs.some(log => log.timestamp !== undefined)) {
      defaultColumns.unshift('timestamp');
    }
    
    setUserSelectedColumns(defaultColumns);
  };

  return (
    <>
      <Card className="w-full border-0 shadow-none">
        <CardHeader className="px-2 py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium">Log Viewer</CardTitle>
          <div className="flex space-x-3 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-3 flex items-center"
                >
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{timeWindowLabel}</span>
                  <ChevronDownIcon className="h-4 w-4 ml-2 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 p-0" onCloseAutoFocus={(e) => {
                // Prevent closing when clicking inside date picker
                if (isDatePickerOpen) {
                  e.preventDefault();
                }
              }}>
                <div className="p-2">
                  <h3 className="font-medium text-xs mb-2">Time Range</h3>
                  <div className="space-y-0.5">
                    {timeWindows.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        className={`text-xs px-2 py-1 rounded ${
                          option.value === selectedTimeWindow ? 'bg-muted font-medium' : ''
                        }`}
                        onSelect={(e) => {
                          if (option.value === -1) {
                            // Prevent closing when selecting custom range
                            e.preventDefault();
                            setIsDatePickerOpen(true);
                          } else {
                            handleTimeWindowChange(option.value, option.label);
                          }
                        }}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </div>
                  
                  {isDatePickerOpen && (
                    <div className="mt-2 border-t pt-2">
                      <h3 className="font-medium text-xs mb-2">Custom Range</h3>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Start Date & Time</label>
                          <input
                            type="datetime-local"
                            className="w-full text-xs border rounded px-2 py-1 mt-1"
                            value={format(customStartDate, "yyyy-MM-dd'T'HH:mm")}
                            onChange={(e) => {
                              if (e.target.value) {
                                setCustomStartDate(new Date(e.target.value));
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">End Date & Time</label>
                          <input
                            type="datetime-local"
                            className="w-full text-xs border rounded px-2 py-1 mt-1"
                            value={format(customEndDate, "yyyy-MM-dd'T'HH:mm")}
                            onChange={(e) => {
                              if (e.target.value) {
                                setCustomEndDate(new Date(e.target.value));
                              }
                            }}
                          />
                        </div>
                        <div className="flex justify-end space-x-2 mt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={() => setIsDatePickerOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={applyCustomDateRange}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Column Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-3 flex items-center"
                >
                  <Columns className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">Columns</span>
                  <ChevronDownIcon className="h-4 w-4 ml-2 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-0">
                <div className="p-2">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-xs">Visible Columns</h3>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs px-2"
                        onClick={selectAllColumns}
                      >
                        All
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs px-2"
                        onClick={clearAllColumns}
                      >
                        None
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs px-2"
                        onClick={resetToDefaultColumns}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-64 pr-2">
                    <div className="space-y-1">
                      {availableFields.map((field) => (
                        <div key={field} className="flex items-center px-2 py-1 hover:bg-muted rounded">
                          <input
                            type="checkbox"
                            id={`column-${field}`}
                            className="mr-2"
                            checked={userSelectedColumns.includes(field) || field === 'timestamp'}
                            onChange={() => toggleColumnVisibility(field)}
                            disabled={field === 'timestamp'}
                          />
                          <label 
                            htmlFor={`column-${field}`} 
                            className={`text-xs cursor-pointer flex-1 truncate ${field === 'timestamp' ? 'text-muted-foreground' : ''}`}
                          >
                            {field === 'timestamp' ? (
                              <span className="font-medium">timestamp (required)</span>
                            ) : standardLogFields.includes(field) ? (
                              <span className="font-medium">{field}</span>
                            ) : (
                              field
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  {availableFields.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      No fields available. Try loading some logs first.
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Active Filters display */}
            {Object.keys(activeFilters).length > 0 && (
              <div className="bg-muted rounded-md px-2 py-1 flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Filters:</span>
                {Object.entries(activeFilters).map(([field, value]) => (
                  <div key={field} className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs flex items-center">
                    {field}:{value}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeFilter(field)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 ml-1"
                  onClick={() => setActiveFilters({})}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchLogs(queryString)}
              disabled={isLoading}
              className="h-9 px-3"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <form onSubmit={handleQuerySubmit} className="mb-3">
            <div className="relative flex items-center">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={queryString}
                onChange={(e) => setQueryString(e.target.value)}
                placeholder="Enter a JavaScript expression to filter logs (e.g., log.level === 'error')"
                className="w-full pl-10 pr-24 py-2 text-sm rounded-md border border-input bg-background h-10"
              />
              <Button 
                type="submit" 
                disabled={isLoading}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8"
              >
                Run Query
              </Button>
            </div>
          </form>

          {error && (
            <div className="mb-3 p-2 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs">
              {error}
            </div>
          )}

          <div className="border rounded-md overflow-hidden">
            <div className="h-[500px] overflow-auto" ref={tableRef}>
              <table className="w-full min-w-max font-mono border-collapse">
                <thead>
                  <tr className="bg-muted border-b sticky top-0 z-10">
                    {visibleColumns.flatMap((field, index) => {
                      const headers = getColumnHeader(field);
                      return headers.map((header, i) => (
                        <th key={`${field}-${i}`} className="px-3 py-2 text-sm font-medium text-left">
                          <div className="flex items-center">
                            <span className="truncate">{header}</span>
                            {field !== 'timestamp' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1 flex-shrink-0">
                                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-40 p-1">
                                  <div className="text-xs font-medium px-2 py-1">Filter by {header}</div>
                                  <div className="max-h-48 overflow-y-auto">
                                    {getUniqueValues(field).map((value, vIndex) => (
                                      <DropdownMenuItem
                                        key={vIndex}
                                        className="text-xs"
                                        onClick={() => addFilter(field, value)}
                                      >
                                        {String(value)}
                                      </DropdownMenuItem>
                                    ))}
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </th>
                      ));
                    })}
                    {/* Empty header for the expand button */}
                    <th className="px-2 py-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length * 2} className="p-4 text-center text-muted-foreground text-xs">
                        {isLoading ? 'Loading logs...' : 'No logs found. Try a different query or time range.'}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <React.Fragment key={index}>
                        <tr
                          className={`border-b border-muted last:border-b-0 cursor-pointer hover:bg-muted/30 ${
                            expandedLogs.has(index) ? 'bg-muted/20' : ''
                          }`}
                          onClick={() => toggleExpanded(index)}
                        >
                          {/* Date column */}
                          {visibleColumns.includes('timestamp') && (
                            <>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                                {log.timestamp ? formatDate(log.timestamp) : '—'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                                {log.timestamp ? formatTimestamp(log.timestamp) : '—'}
                              </td>
                            </>
                          )}
                          
                          {/* Level column */}
                          {visibleColumns.includes('level') && (
                            <td className="px-3 py-2">
                              <span className={`text-xs font-medium uppercase ${getLogLevelColor(log.level)}`}>
                                {log.level || 'info'}
                              </span>
                            </td>
                          )}
                          
                          {/* Message column */}
                          {visibleColumns.includes('message') && (
                            <td className="px-3 py-2 text-xs truncate max-w-[300px]">
                              {log.message || 'No message'}
                            </td>
                          )}
                          
                          {/* ID column */}
                          {visibleColumns.includes('id') && (
                            <td className="px-3 py-2 text-xs truncate">
                              {log.id !== undefined ? String(log.id) : '—'}
                            </td>
                          )}
                          
                          {/* Hostname column */}
                          {visibleColumns.includes('hostname') && (
                            <td className="px-3 py-2 text-xs truncate">
                              {log.hostname !== undefined ? String(log.hostname) : '—'}
                            </td>
                          )}
                          
                          {/* Service column */}
                          {visibleColumns.includes('service') && (
                            <td className="px-3 py-2 text-xs truncate">
                              {log.service !== undefined ? String(log.service) : '—'}
                            </td>
                          )}
                          
                          {/* Render any other columns */}
                          {visibleColumns
                            .filter(field => !['timestamp', 'level', 'message', 'id', 'hostname', 'service'].includes(field))
                            .map(field => (
                              <td key={field} className="px-3 py-2 text-xs truncate">
                                {log[field] !== undefined ? String(log[field]) : '—'}
                              </td>
                            ))
                          }
                          
                          {/* Expand/Collapse button */}
                          <td className="px-3 py-2 text-right w-8">
                            {expandedLogs.has(index) ? 
                              <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" /> : 
                              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                            }
                          </td>
                        </tr>
                        
                        {/* Expanded log details */}
                        {expandedLogs.has(index) && (
                          <tr>
                            <td colSpan={visibleColumns.length * 2} className="p-0">
                              <div className="px-3 py-2 bg-blue-50/30 border-t border-blue-100 shadow-inner">
                                <div className="flex justify-end mb-2">
                                  {/* <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-xs" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleLogClick(log);
                                    }}
                                  >
                                    View Details
                                  </Button> */}
                                </div>
                                
                                <div className="mb-3 bg-white rounded-md border p-2 shadow-sm">
                                  <h4 className="text-xs font-medium mb-1.5 text-slate-600">Standard Fields</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    {getStandardFields(log).map(([key, value]) => (
                                      <div key={key} className="text-xs">
                                        <span className="font-medium text-muted-foreground">{key}: </span>
                                        <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                {getCustomFields(log).length > 0 && (
                                  <div className="bg-white rounded-md border shadow-sm">
                                    <h4 className="text-xs font-medium p-2 pb-1.5 text-slate-600">Custom Fields</h4>
                                    <div className="border-t border-slate-100 p-2 overflow-x-auto">
                                      <pre className="text-xs" 
                                          dangerouslySetInnerHTML={{ 
                                            __html: syntaxHighlight(JSON.stringify(Object.fromEntries(getCustomFields(log)), null, 2)) 
                                          }} 
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
              
              {/* Loading indicator for infinite scroll */}
              {isLoadingMore && (
                <div className="py-4 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  <p className="mt-2 text-xs text-muted-foreground">Loading more logs...</p>
                </div>
              )}
              
              {/* No more logs indicator */}
              {!isLoadingMore && !hasMoreLogs && logs.length > 0 && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No more logs to load
                </div>
              )}
            </div>
          </div>
          
          {/* Logs count indicator */}
          <div className="py-2 px-3 bg-muted/30 border-t text-xs text-muted-foreground flex justify-between items-center">
            <span>
              {logs.length > 0 ? `Showing ${logs.length} logs` : 'No logs found'}
              {hasMoreLogs && ' (scroll down to load more)'}
            </span>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs px-2" 
                onClick={() => fetchLogs(queryString)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Reload
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[900px] p-0 font-mono">
          <div className="flex h-[600px]">
            <div className="w-full h-full overflow-hidden flex flex-col">
              <div className="px-4 py-3 flex justify-between items-center border-b bg-muted/40">
                <h2 className="text-sm font-semibold truncate">
                  Log Details {selectedLog?.timestamp && `(${formatFullTimestamp(selectedLog.timestamp)})`}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)} className="h-7 w-7 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Tabs defaultValue="formatted" className="flex-1 flex flex-col">
                <div className="px-4 pt-2 border-b">
                  <TabsList className="h-8">
                    <TabsTrigger value="formatted" className="text-xs">Formatted</TabsTrigger>
                    <TabsTrigger value="standard" className="text-xs">Standard Fields</TabsTrigger>
                    <TabsTrigger value="custom" className="text-xs">Custom Fields</TabsTrigger>
                    <TabsTrigger value="raw" className="text-xs">Raw JSON</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="formatted" className="flex-1 p-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 text-sm">
                      {selectedLog && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {Object.entries(selectedLog).map(([key, value]) => (
                              <div key={key} className="overflow-hidden">
                                <div className="font-semibold text-muted-foreground mb-1">{key}:</div>
                                <div className="bg-muted p-2 rounded-md overflow-x-auto">
                                  {typeof value === 'object' 
                                    ? JSON.stringify(value, null, 2) 
                                    : String(value)
                                  }
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="standard" className="flex-1 p-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 text-sm">
                      {selectedLog && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {getStandardFields(selectedLog).map(([key, value]) => (
                              <div key={key} className="overflow-hidden">
                                <div className="font-semibold text-muted-foreground mb-1">{key}:</div>
                                <div className="bg-muted p-2 rounded-md overflow-x-auto">
                                  {typeof value === 'object' 
                                    ? JSON.stringify(value, null, 2) 
                                    : String(value)
                                  }
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="custom" className="flex-1 p-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 text-sm">
                      {selectedLog && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {getCustomFields(selectedLog).map(([key, value]) => (
                              <div key={key} className="overflow-hidden">
                                <div className="font-semibold text-muted-foreground mb-1">{key}:</div>
                                <div className="bg-muted p-2 rounded-md overflow-x-auto">
                                  {typeof value === 'object' 
                                    ? JSON.stringify(value, null, 2) 
                                    : String(value)
                                  }
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="raw" className="flex-1 p-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <pre 
                        className="bg-muted p-3 rounded-md text-xs overflow-x-auto"
                        dangerouslySetInnerHTML={{ 
                          __html: selectedLog ? syntaxHighlight(JSON.stringify(selectedLog, null, 2)) : ''
                        }} 
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 