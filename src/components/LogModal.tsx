'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { ScrollArea } from './scroll-area';
import { Search, Filter } from 'lucide-react';

interface LogModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    componentId?: string;
    componentType?: 'source' | 'sink';
    metrics?: any;
    config?: {
        sources: Record<string, any>;
        sinks: Record<string, any>;
    };
    isVectorRunning: boolean;
}

interface Log {
    timestamp?: string;
    message?: string;
    siftdev_preview_component?: string;
    siftdev_preview_type?: string;
    [key: string]: any;
}

interface SearchField {
    field: string;
    value: string;
}

export default function LogModal({ isOpen, onClose, title, componentId, componentType, metrics, config, isVectorRunning }: LogModalProps) {
    const [logs, setLogs] = useState<Log[]>([]);
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchFields, setSearchFields] = useState<SearchField[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [filterComponent, setFilterComponent] = useState(componentId || '');
    const [filterType, setFilterType] = useState<'source' | 'sink' | ''>(componentType || '');
    const [isPaused, setIsPaused] = useState(false);
    const [logsPerSecond, setLogsPerSecond] = useState(0);
    const [lastLogCount, setLastLogCount] = useState(0);
    const [autoScroll, setAutoScroll] = useState(true);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const lastScrollPosition = useRef<number>(0);
    const lastSeenLogs = useRef<Set<string>>(new Set());

    // Track actual new logs per second
    useEffect(() => {
        const interval = setInterval(() => {
            const currentLogKeys = new Set(
                logs.map(log => `${log.timestamp}-${log.message}`)
            );
            
            // Count new logs by comparing with previously seen logs
            const newLogsCount = Array.from(currentLogKeys).filter(
                key => !lastSeenLogs.current.has(key)
            ).length;

            // Update logs per second count
            setLogsPerSecond(newLogsCount);
            
            // Update last seen logs
            lastSeenLogs.current = currentLogKeys;
        }, 1000);

        return () => clearInterval(interval);
    }, [logs]);

    // Reset lastSeenLogs when modal is closed or opened
    useEffect(() => {
        if (!isOpen) {
            lastSeenLogs.current = new Set();
        }
    }, [isOpen]);

    // Handle auto-scrolling
    useEffect(() => {
        if (!isPaused && autoScroll && scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [logs, isPaused, autoScroll]);

    // Handle scroll events
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        const isScrolledToBottom = Math.abs((target.scrollHeight - target.scrollTop) - target.clientHeight) < 50;
        setAutoScroll(isScrolledToBottom);
        lastScrollPosition.current = target.scrollTop;
    }, []);

    // Clear logs when modal is closed
    useEffect(() => {
        if (!isOpen) {
            setLogs([]);
        }
    }, [isOpen]);

    const fetchLogs = useCallback(async () => {
        if (!isOpen || !isVectorRunning || isPaused) {
            return;
        }
        
        try {
            const params = new URLSearchParams();
            if (filterComponent) params.append('component', filterComponent);
            if (filterType) params.append('type', filterType);
            
            const response = await fetch(`/api/vector/preview-logs?${params}`);
            const data = await response.json();
            
            if (Array.isArray(data)) {
                let filteredData = data;

                // Apply field-based filters (AND between different fields)
                if (searchFields.length > 0) {
                    filteredData = filteredData.filter(log => 
                        // Every field filter must match (AND)
                        searchFields.every(({ field, value }) => {
                            const fieldValue = log[field];
                            if (!fieldValue) return false;
                            
                            // Split value by commas for OR condition within the same field
                            const values = value.split(',').map(v => v.trim());
                            return values.some(v => 
                                String(fieldValue).toLowerCase().includes(v.toLowerCase())
                            );
                        })
                    );
                }

                // Apply general search term
                if (searchTerm) {
                    filteredData = filteredData.filter(log => 
                        JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }
                
                // Reverse the order of logs
                setLogs(filteredData.reverse());
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
    }, [isOpen, isVectorRunning, filterComponent, filterType, searchTerm, searchFields, isPaused]);

    // Effect to handle log fetching
    useEffect(() => {
        console.log('LogModal: Effect triggered with', { 
            isOpen, 
            isVectorRunning, 
            componentId, 
            componentType 
        });

        let fetchInterval: NodeJS.Timeout | null = null;

        if (isOpen && isVectorRunning) {
            // Only clear logs when opening the modal, not when unpausing
            if (!isPaused) {
                setLogs([]);
            }
            
            // Start fetching logs
            console.log('LogModal: Starting fetch interval');
            fetchInterval = setInterval(fetchLogs, 1000);
            setIntervalId(fetchInterval);
        }

        return () => {
            if (fetchInterval) {
                console.log('LogModal: Cleaning up fetch interval');
                clearInterval(fetchInterval);
                setIntervalId(null);
            }
            // Only clear logs when closing the modal
            if (!isOpen) {
                setLogs([]);
            }
        };
    }, [isOpen, isVectorRunning, fetchLogs, isPaused]);

    // Log state changes for filter selections
    useEffect(() => {
        console.log('Filter state changed:', {
            filterComponent,
            filterType,
            componentId,
            componentType
        });
    }, [filterComponent, filterType, componentId, componentType]);

    // Group components by type for the dropdown
    const componentOptions = [
        { label: 'All Components', value: '' },
        ...Object.keys(config?.sources || {}).map(id => ({
            label: `${id} (source)`,
            value: `source:${id}`,
        })),
        ...Object.keys(config?.sinks || {})
            .filter(id => !['raw_logs', 'processed_logs'].includes(id))
            .map(id => ({
                label: `${id} (sink)`,
                value: `sink:${id}`,
            }))
    ];

    if (!isOpen) return null;

    const formatTimestamp = (timestamp: string) => {
        try {
            return new Date(timestamp).toLocaleTimeString();
        } catch {
            return timestamp;
        }
    };

    const formatLogData = (log: Log) => {
        // Create a copy of the log object
        const formattedLog = { ...log };
        
        // Remove internal fields
        delete formattedLog.siftdev_preview_component;
        delete formattedLog.siftdev_preview_type;
        delete formattedLog.timestamp;
        
        return formattedLog;
    };

    // Add click handler for JSON fields
    const handleJsonFieldClick = (key: string, value: any) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const existingFieldIndex = searchFields.findIndex(f => f.field === key);
        
        if (existingFieldIndex >= 0) {
            const existingField = searchFields[existingFieldIndex];
            const values = existingField.value.split(',').map(v => v.trim());
            if (!values.includes(stringValue)) {
                const newFields = [...searchFields];
                newFields[existingFieldIndex] = {
                    ...existingField,
                    value: [...values, stringValue].join(', ')
                };
                setSearchFields(newFields);
            }
        } else {
            setSearchFields([...searchFields, { field: key, value: stringValue }]);
        }
    };

    const renderJsonValue = (value: any, indent: number = 0, parentKey?: string): JSX.Element => {
        if (value === null) return <span className="text-gray-500">null</span>;
        if (typeof value === 'boolean') return <span className="text-purple-600">{String(value)}</span>;
        if (typeof value === 'number') return <span className="text-blue-600">{value}</span>;
        if (typeof value === 'string') return <span className="text-green-600">"{value}"</span>;
        
        if (Array.isArray(value)) {
            if (value.length === 0) return <span>[]</span>;
            return (
                <span>
                    [
                    <div style={{ marginLeft: `${indent + 2}em` }}>
                        {value.map((item, i) => (
                            <div key={i}>
                                {renderJsonValue(item, indent + 2)}
                                {i < value.length - 1 && ","}
                            </div>
                        ))}
                    </div>
                    <div style={{ marginLeft: `${indent}em` }}>]</div>
                </span>
            );
        }
        
        if (typeof value === 'object') {
            const entries = Object.entries(value);
            if (entries.length === 0) return <span>{"{}"}</span>;
            return (
                <span>
                    {"{"}
                    <div style={{ marginLeft: `${indent + 2}em` }}>
                        {entries.map(([key, val], i) => (
                            <div 
                                key={key}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleJsonFieldClick(parentKey ? `${parentKey}.${key}` : key, val);
                                }}
                                className="cursor-pointer hover:bg-gray-100 rounded px-1"
                            >
                                <span className="text-blue-800">"{key}"</span>: {renderJsonValue(val, indent + 2, key)}
                                {i < entries.length - 1 && ","}
                            </div>
                        ))}
                    </div>
                    <div style={{ marginLeft: `${indent}em` }}>{"}"}</div>
                </span>
            );
        }
        
        return <span>{String(value)}</span>;
    };

    const addSearchField = () => {
        setSearchFields([...searchFields, { field: '', value: '' }]);
    };

    const updateSearchField = (index: number, field: string, value: string) => {
        const newFields = [...searchFields];
        newFields[index] = { field, value };
        setSearchFields(newFields);
    };

    const removeSearchField = (index: number) => {
        setSearchFields(searchFields.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-[90vw] max-w-6xl h-[80vh] flex flex-col bg-white shadow-xl">
                <CardHeader className="border-b flex flex-col gap-4 p-4 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <CardTitle>{title}</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{logsPerSecond} logs/s</span>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-4">
                            <div className="relative w-2/3">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search all fields..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-md"
                                />
                            </div>
                            <div className="relative w-1/3 flex gap-2">
                                <select
                                    value={filterComponent ? `${filterType}:${filterComponent}` : ''}
                                    onChange={(e) => {
                                        const [type, id] = e.target.value.split(':');
                                        setFilterType(type as 'source' | 'sink' | '');
                                        setFilterComponent(id || '');
                                    }}
                                    className="w-full px-4 pr-8 py-2 border rounded-md appearance-none cursor-pointer bg-white text-ellipsis"
                                >
                                    {componentOptions.map(option => (
                                        <option key={option.value} value={option.value} className="truncate">
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-12 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                    <Filter className="h-4 w-4 text-gray-500" />
                                </div>
                                <button
                                    onClick={() => setIsPaused(!isPaused)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-md border ${
                                        isPaused 
                                            ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' 
                                            : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                                    }`}
                                    title={isPaused ? 'Resume' : 'Pause'}
                                >
                                    {isPaused ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="6" y="4" width="4" height="16"></rect>
                                            <rect x="14" y="4" width="4" height="16"></rect>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {searchFields.map((field, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Field"
                                        value={field.field}
                                        onChange={(e) => updateSearchField(index, e.target.value, field.value)}
                                        className="w-1/3 px-4 py-2 border rounded-md"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Value"
                                        value={field.value}
                                        onChange={(e) => updateSearchField(index, field.field, e.target.value)}
                                        className="flex-1 px-4 py-2 border rounded-md"
                                    />
                                    <button
                                        onClick={() => removeSearchField(index)}
                                        className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-md"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={addSearchField}
                                className="self-start px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                            >
                                + Add Field Filter
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <div className="flex-1 min-h-0 flex flex-col relative">
                    {!isVectorRunning ? (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            Vector pipeline is not running. Start the pipeline to view logs.
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                            Waiting for logs...
                        </div>
                    ) : (
                        <ScrollArea 
                            className="flex-1 p-4" 
                            ref={scrollAreaRef}
                            onScroll={handleScroll}
                        >
                            <div className="space-y-2">
                                {logs.map((log, index) => (
                                    <div 
                                        key={`${index}-${log.timestamp || Date.now()}`} 
                                        className="rounded-lg border bg-gray-50 p-3 font-mono text-sm"
                                    >
                                        {log.timestamp && (
                                            <div className="text-xs text-gray-500 mb-1">
                                                {formatTimestamp(log.timestamp)}
                                            </div>
                                        )}
                                        <div className="whitespace-pre-wrap break-words text-gray-800">
                                            {renderJsonValue(formatLogData(log))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </Card>
        </div>
    );
} 