import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Define interfaces for request and response
interface LogRequest {
  query?: string;
  page?: number;
  limit?: number;
  timeWindow?: number;
  startDate?: string;
  endDate?: string;
}

// Simple in-memory cache
interface CacheEntry {
  timestamp: number;
  data: any;
}

const CACHE_TTL = 60 * 1000; // 1 minute cache lifetime
const responseCache = new Map<string, CacheEntry>();

export async function POST(req: NextRequest) {
  try {
    const { 
      query, 
      page = 1, 
      limit = 50, 
      timeWindow = 0,
      startDate,
      endDate
    } = await req.json() as LogRequest;
    
    // Create a cache key based on request parameters
    const cacheKey = JSON.stringify({ query, page, limit, timeWindow, startDate, endDate });
    
    // Check if we have a valid cached response
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse && (Date.now() - cachedResponse.timestamp) < CACHE_TTL) {
      console.log('Serving logs from cache');
      return NextResponse.json(cachedResponse.data);
    }
    
    // Get the paths to the log files
    const randomLogsPath = path.join(process.cwd(), 'src', 'example-logs', 'random_logs.jsonl');
    const scenarioLogsPath = path.join(process.cwd(), 'src', 'example-logs', 'scenario_logs.jsonl');
    
    // Check if the files exist
    if (!fs.existsSync(randomLogsPath) || !fs.existsSync(scenarioLogsPath)) {
      return NextResponse.json({ error: 'Log files not found' }, { status: 404 });
    }
    
    // Calculate time window cutoff if applicable
    let cutoffDate: Date | null = null;
    let startDateObj: Date | null = null;
    let endDateObj: Date | null = null;
    
    if (timeWindow > 0) {
      cutoffDate = new Date(Date.now() - timeWindow);
    } else if (timeWindow === -1 && startDate && endDate) {
      startDateObj = new Date(startDate);
      endDateObj = new Date(endDate);
    }
    
    // Process and paginate logs
    const result = await processLogs(
      [randomLogsPath, scenarioLogsPath], 
      {
        query,
        page,
        limit,
        cutoffDate,
        startDate: startDateObj,
        endDate: endDateObj
      }
    );
    
    // Store the result in cache
    const responseData = {
      logs: result.logs,
      totalCount: result.totalCount,
      hasMore: result.hasMore
    };
    
    responseCache.set(cacheKey, {
      timestamp: Date.now(),
      data: responseData
    });
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error processing logs:', error);
    return NextResponse.json({ error: 'Failed to process logs' }, { status: 500 });
  }
}

// Function to read and filter logs with pagination support
interface ProcessOptions {
  query?: string;
  page: number;
  limit: number;
  cutoffDate?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

interface ProcessResult {
  logs: any[];
  totalCount: number;
  hasMore: boolean;
}

// Helper to safely parse a date from a timestamp string
function parseTimestamp(timestamp: string | undefined): number {
  if (!timestamp) return 0;
  try {
    return new Date(timestamp).getTime();
  } catch (e) {
    return 0;
  }
}

async function processLogs(filePaths: string[], options: ProcessOptions): Promise<ProcessResult> {
  const { query, page, limit, cutoffDate, startDate, endDate } = options;
  
  let allLogs: any[] = [];
  let matchingCount = 0;
  const skip = (page - 1) * limit;
  
  // If no query provided, return a paginated set of logs
  const useFilter = query && query.trim() !== '';
  let filter: Function | null = null;
  
  if (useFilter) {
    try {
      // Create a safe filtering function from the query string
      filter = new Function('log', `
        try {
          return ${query};
        } catch (error) {
          return false;
        }
      `);
    } catch (error) {
      console.error('Error creating filter function:', error);
      throw new Error('Invalid query syntax');
    }
  }
  
  // First, read all logs that match our criteria into memory
  // This is necessary to properly sort and paginate them
  let matchingLogs: any[] = [];
  
  // Collect all matching logs to handle pagination correctly
  for (const filePath of filePaths) {
    // Skip if file doesn't exist
    if (!fs.existsSync(filePath)) continue;
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      try {
        if (line.trim() === '') continue;
        
        const logEntry = JSON.parse(line);
        
        // Apply time window filter if applicable
        if (cutoffDate && logEntry.timestamp) {
          try {
            const logDate = new Date(logEntry.timestamp);
            if (logDate < cutoffDate) continue;
          } catch (e) {
            // If date parsing fails, include the log
          }
        }
        
        // Apply custom date range if applicable
        if (startDate && endDate && logEntry.timestamp) {
          try {
            const logDate = new Date(logEntry.timestamp);
            if (logDate < startDate || logDate > endDate) continue;
          } catch (e) {
            // If date parsing fails, include the log
          }
        }
        
        // Apply the query filter if one exists
        if (useFilter && filter && !filter(logEntry)) {
          continue;
        }
        
        // Add this log to our collection
        matchingLogs.push(logEntry);
      } catch (error) {
        console.error('Error parsing log line:', error);
        // Continue processing even if one line fails
      }
    }
    
    // Close the file stream
    fileStream.close();
  }
  
  // Sort logs by timestamp in descending order (newest first)
  matchingLogs.sort((a, b) => {
    const timeA = parseTimestamp(a.timestamp);
    const timeB = parseTimestamp(b.timestamp);
    return timeB - timeA;
  });
  
  // Count total matches
  matchingCount = matchingLogs.length;
  
  // Apply pagination
  allLogs = matchingLogs.slice(skip, skip + limit);
  
  return {
    logs: allLogs,
    totalCount: matchingCount,
    hasMore: matchingCount > (skip + limit)
  };
}
