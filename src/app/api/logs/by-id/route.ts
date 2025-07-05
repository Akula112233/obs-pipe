import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Interface for log entry structure
interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  [key: string]: any;
}

export async function GET(req: NextRequest) {
  try {
    // Get log IDs from query parameters
    const searchParams = req.nextUrl.searchParams;
    const logIds = searchParams.get('ids')?.split(',');

    if (!logIds || logIds.length === 0) {
      return NextResponse.json({ error: 'No log IDs provided' }, { status: 400 });
    }

    // Set to track the IDs we've already found
    const foundIds = new Set<string>();
    const logs: LogEntry[] = [];

    // Define log files to search through
    const logFiles = [
      path.join(process.cwd(), 'src/example-logs/scenario_logs.jsonl'),
      path.join(process.cwd(), 'src/example-logs/random_logs.jsonl')
    ];

    // Process each log file
    for (const filePath of logFiles) {
      if (fs.existsSync(filePath)) {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
        });

        for await (const line of rl) {
          try {
            const log = JSON.parse(line);
            
            // Check if this log has an ID we're looking for
            if (log.id && logIds.includes(log.id) && !foundIds.has(log.id)) {
              logs.push(log);
              foundIds.add(log.id);
              
              // If we've found all logs, we can stop searching
              if (foundIds.size === logIds.length) {
                break;
              }
            }
          } catch (parseError) {
            console.error('Error parsing log line:', parseError);
            // Continue to next line if there's a parsing error
          }
        }
        
        // Close the file stream
        fileStream.close();
        
        // If we've found all logs, we can stop searching through files
        if (foundIds.size === logIds.length) {
          break;
        }
      }
    }

    // Sort logs by timestamp
    logs.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return 0;
    });

    // Return logs with status showing how many were found
    return NextResponse.json({
      logs,
      total: logs.length,
      found: foundIds.size,
      requested: logIds.length,
      missing: logIds.filter(id => !foundIds.has(id))
    });
  } catch (error) {
    console.error('Error fetching logs by ID:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
} 