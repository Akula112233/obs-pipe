import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import OpenAI from 'openai';

// Define interfaces
interface ChatRequest {
  message: string;
  logIds?: string[];
  conversation?: Array<{role: string, content: string}>;
}

interface LogReference {
  text: string;
  logId: string;
  index: number;
}

// System prompt for the log intelligence assistant
const LOG_SYSTEM_PROMPT = `
You are a Log Intelligence Assistant, designed to help users understand and analyze their system logs.
Your job is to provide insights, identify patterns, troubleshoot issues, and suggest improvements based on the logs provided.

GUIDELINES:
1. When answering questions, prioritize providing direct, concise answers.
2. Identify concerning log entries, potential errors, or anomalies.
3. When referencing specific log entries, use the format [ref:log-id] where log-id is the ID of the log. For example: [ref:7b980314-ce87-43f3-be9d-6f95b47cdf8d]
4. If you notice patterns or trends across multiple logs, explain them clearly.
5. If troubleshooting an error, suggest potential root causes and solutions based on the log content.
6. Only base your answers on information contained in the logs - don't make assumptions about the system architecture unless evident from the logs.
7. If logs indicate a sequence of events, explain the timeline clearly.
8. If relevant, suggest logging improvements or additional context that would be helpful.

FORMAT YOUR RESPONSE:
- Provide a clear, direct answer to the user's question
- Use [ref:log-id] format when referring to specific logs
- Do NOT include a "RELEVANT LOGS:" section as the interface will handle this automatically

Your goal is to help the user quickly understand their log data and extract maximum value from it.
`;

export async function POST(req: NextRequest) {
  try {
    const { message, conversation = [], logIds: providedLogIds = [] } = await req.json() as ChatRequest;
    
    // Use the server's API key
    // const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiApiKey = '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'
    
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured on server' },
        { status: 500 }
      );
    }
    
    // Initialize OpenAI with the server's API key
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });
        
    // Load log data - both specific logs from provided IDs and all logs for relevance filtering
    let specificLogs: any[] = [];
    let allLogs: any[] = [];
    
    // Get all logs for broader context and relevance filtering
    allLogs = await getRecentLogs(1000);
    
    // If specific log IDs were provided, fetch those logs first for priority context
    if (providedLogIds.length > 0) {
      try {
        // Read logs from the jsonl files based on IDs
        const logFiles = [
          path.join(process.cwd(), 'src/example-logs/scenario_logs.jsonl'),
          path.join(process.cwd(), 'src/example-logs/random_logs.jsonl')
        ];
        
        const foundLogs = new Map<string, any>();
        
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
                if (log.id && providedLogIds.includes(log.id) && !foundLogs.has(log.id)) {
                  foundLogs.set(log.id, log);
                  
                  // If we've found all logs, we can stop searching
                  if (foundLogs.size === providedLogIds.length) {
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
            if (foundLogs.size === providedLogIds.length) {
              break;
            }
          }
        }
        
        // Store the found specific logs
        specificLogs = Array.from(foundLogs.values());
      } catch (err) {
        console.error('Error fetching specific logs by ID:', err);
        // Continue with standard log processing if there was an error
      }
    } 
    
    // Filter all logs for relevance to the message
    const filteredRelevantLogs = filterLogsByRelevance(allLogs, message);
    
    // Combine specific logs and filtered relevant logs, prioritizing specific logs
    // Use Map to ensure we don't have duplicates, with the specific logs taking precedence
    const combinedLogsMap = new Map<string, any>();
    
    // Add filtered relevant logs first
    for (const log of filteredRelevantLogs) {
      if (log.id) {
        combinedLogsMap.set(log.id, log);
      }
    }
    
    // Then add specific logs to override any duplicates (they have priority)
    for (const log of specificLogs) {
      if (log.id) {
        combinedLogsMap.set(log.id, log);
      }
    }
    
    // Convert combined logs map back to array
    const combinedLogs = Array.from(combinedLogsMap.values());
    
    // Sort by timestamp if available
    combinedLogs.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return 0;
    });
    
    // Limit to a reasonable number for context - increasing from 300 to 600
    const finalLogs = combinedLogs.slice(0, Math.max(600, specificLogs.length));
    
    // Format logs for context
    const logsContext = formatLogsForContext(finalLogs);
    
    // Create messages for the API call
    const messages = [
      { role: 'system', content: LOG_SYSTEM_PROMPT },
      { role: 'system', content: `Here are the most recent and relevant logs from the system:\n\n${logsContext}` },
      ...conversation,
      { role: 'user', content: message }
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any[],
      temperature: 0.3,
    });

    // Extract any log IDs mentioned in the response
    const response = completion.choices[0].message.content || '';
    const { transformedResponse, logIds } = processResponseWithLogRefs(response, finalLogs);
        
    // Find all logs that match the extracted IDs (case-insensitive matching)
    const matchingLogs = finalLogs.filter(log => {
      if (!log.id) return false;
      return logIds.some(id => 
        log.id.toLowerCase() === id.toLowerCase() || 
        log.id === id
      );
    });
    
    return NextResponse.json({
      response: transformedResponse,
      logIds,
      relevantLogs: matchingLogs
    });
  } catch (error) {
    console.error('Error processing chat request:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing the chat request.' },
      { status: 500 }
    );
  }
}

// Function to get recent logs from the system
async function getRecentLogs(limit: number = 7500) {
  // Get the paths to the log files
  const randomLogsPath = path.join(process.cwd(), 'src', 'example-logs', 'random_logs.jsonl');
  const scenarioLogsPath = path.join(process.cwd(), 'src', 'example-logs', 'scenario_logs.jsonl');
  
  // Check if the files exist
  if (!fs.existsSync(randomLogsPath) || !fs.existsSync(scenarioLogsPath)) {
    throw new Error('Log files not found');
  }
  
  let logs: any[] = [];
  
  // Read logs from files
  for (const filePath of [randomLogsPath, scenarioLogsPath]) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      if (line.trim()) {
        try {
          const log = JSON.parse(line.trim());
          logs.push(log);
          
          // Break once we've reached the limit
          if (logs.length >= limit) {
            break;
          }
        } catch (e) {
          console.error(`Error parsing log line: ${line}`);
        }
      }
    }
    
    if (logs.length >= limit) {
      break;
    }
  }
  
  // Sort logs by timestamp (newest first)
  logs.sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeB - timeA;
  });
  
  return logs.slice(0, limit);
}

// Format logs for context window - more verbose format
function formatLogsForContext(logs: any[]) {
  return logs.map(log => {
    const { id, timestamp, level, message, service, hostname, ...rest } = log;
    
    // Format the timestamp to be more concise
    let formattedTimestamp = timestamp;
    if (timestamp) {
      try {
        const date = new Date(timestamp);
        formattedTimestamp = date.toISOString().replace('T', ' ').replace('Z', '');
      } catch (e) {
        // Keep original if formatting fails
      }
    }
    
    // Include only important additional fields and limit their length
    const importantFields = ['error', 'status', 'path', 'user_id', 'request_id', 'code', 'duration_ms', 'endpoint'];
    const additionalFields = Object.entries(rest)
      .filter(([key]) => importantFields.includes(key))
      .map(([key, value]) => {
        // Truncate very long string values
        if (typeof value === 'string' && value.length > 100) {
          return `${key}: "${value.substring(0, 100)}..."`;
        }
        return `${key}: ${JSON.stringify(value)}`;
      })
      .join(', ');
      
    // Truncate very long messages
    let truncatedMessage = message;
    if (typeof message === 'string' && message.length > 300) {
      truncatedMessage = message.substring(0, 300) + '...';
    }
    
    return `[${id || 'unknown'}] [${formattedTimestamp || 'unknown'}] [${level || 'unknown'}] [${service || 'unknown'}] ${truncatedMessage || 'No message'} ${additionalFields ? `(${additionalFields})` : ''}`;
  }).join('\n');
}

// Format logs in minimal format to save tokens
function formatMinimalLogsForContext(logs: any[]) {
  // For minimal format, only include the most critical information
  // and truncate messages for extremely long ones
  return logs.map(log => {
    const { id, level, service, message } = log;
    
    // Truncate very long messages to save tokens
    let truncatedMessage = message;
    if (typeof message === 'string' && message.length > 150) {
      truncatedMessage = message.substring(0, 150) + '...';
    }
    
    // Only include the bare minimum data
    return `[${id || '?'}][${level || ''}][${service || ''}] ${truncatedMessage || ''}`;
  }).join('\n');
}

// Process response to extract log references
function processResponseWithLogRefs(response: string, logs: any[]): { transformedResponse: string, logIds: string[] } {
  // Extract references using the updated format that supports uppercase letters
  const refRegex = /\[ref:([a-zA-Z0-9-]+)\]/g;
  const matches = Array.from(response.matchAll(refRegex));
  const logIds = Array.from(new Set(matches.map(m => m[1])));
  
  // If no explicit IDs are found, try to match based on log content to find implicit references
  if (logIds.length === 0) {
    const implicitIds = findImplicitLogReferences(response, logs);
    return { 
      transformedResponse: response, 
      logIds: implicitIds 
    };
  }
  
  // Transform doesn't happen here - we'll let the frontend handle the formatting
  // Since we're using the [ref:id] format, we can pass it through as is
  return { 
    transformedResponse: response, 
    logIds 
  };
}

// Find implicit log references by matching quoted content
function findImplicitLogReferences(response: string, logs: any[]): string[] {
  // Look for direct quotes that might match log messages
  const quotedContentRegex = /"([^"]+)"/g;
  const quotedMatches = Array.from(response.matchAll(quotedContentRegex), m => m[1]);
  
  // Find logs that contain the quoted content
  const matchedLogs = logs.filter(log => {
    if (!log.message) return false;
    
    return quotedMatches.some(quote => {
      return log.message.includes(quote) || 
        (log.error && log.error.includes(quote)) ||
        (log.details && log.details.includes(quote));
    });
  });
  
  return matchedLogs.map(log => log.id).filter(Boolean);
}

// Function to filter logs by relevance to the user's query
function filterLogsByRelevance(logs: any[], query: string): any[] {
  // If the query is empty or very short, return a smaller set of the most recent logs
  if (!query || query.trim().length < 5) {
    return logs.slice(0, 200);
  }
  
  // Extract keywords from the query
  const keywords = extractKeywords(query);
  
  if (keywords.length === 0) {
    return logs.slice(0, 200);
  }
  
  // Score each log based on relevance to keywords
  const scoredLogs = logs.map(log => {
    let score = 0;
    const logString = JSON.stringify(log).toLowerCase();
    
    // Check each keyword against the log
    keywords.forEach(keyword => {
      // Different fields get different weights
      if (log.message?.toLowerCase().includes(keyword)) {
        score += 5; // High weight for message field
      }
      if (log.level?.toLowerCase().includes(keyword)) {
        score += 4; // Good weight for level
      }
      if (log.service?.toLowerCase().includes(keyword)) {
        score += 3; // Medium weight for service
      }
      // Check the entire log
      if (logString.includes(keyword)) {
        score += 1; // Low weight for other matches
      }
    });
    
    return { log, score };
  });
  
  // Filter logs with any relevance score
  const relevantLogs = scoredLogs.filter(item => item.score > 0);
  
  // If we have enough relevant logs, sort by score and return top results
  if (relevantLogs.length > 50) {
    return relevantLogs
      .sort((a, b) => b.score - a.score)
      .map(item => item.log)
      .slice(0, 400); // Return top 400 most relevant logs
  }
  
  // If not enough relevant logs, combine with most recent logs
  const sortedRelevantLogs = relevantLogs
    .sort((a, b) => b.score - a.score)
    .map(item => item.log);
  
  // Get the IDs of relevant logs to avoid duplicates
  const relevantLogIds = new Set(sortedRelevantLogs.map(log => log.id));
  
  // Add recent logs that weren't already matched
  const recentLogs = logs
    .filter(log => !relevantLogIds.has(log.id))
    .slice(0, 300 - sortedRelevantLogs.length);
  
  return [...sortedRelevantLogs, ...recentLogs];
}

// Helper function to extract keywords from the query
function extractKeywords(query: string): string[] {
  // Normalize and tokenize the query
  const normalizedQuery = query.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ") // Remove punctuation
    .replace(/\s+/g, " ")                        // Replace multiple spaces with single space
    .trim();
  
  const words = normalizedQuery.split(' ');
  
  // Filter out common stop words and very short words
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'in', 'on', 'at', 'by', 'for', 'with', 'about', 'to', 'from',
    'of', 'as', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her',
    'its', 'our', 'their', 'what', 'which', 'who', 'whom', 'whose',
    'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
    'few', 'more', 'most', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can',
    'will', 'just', 'should', 'now', 'me', 'into', 'over', 'under',
    'again', 'do', 'does', 'did', 'has', 'have', 'had', 'being', 'been'
  ]);
  
  // Special terms to always keep regardless of length
  const keepTerms = new Set(['api', 'db', 'sql', 'id', 'ip', 'ui', 'io', 'ok', 'ui']);
  
  const keywords = words.filter(word => 
    (word.length > 2 && !stopWords.has(word)) || keepTerms.has(word)
  );
  
  // Keep special log levels in the keywords
  const logLevels = ['error', 'warning', 'info', 'debug', 'critical', 'warn', 'err', 'fatal'];
  const containsLogLevel = normalizedQuery.split(' ').some(word => logLevels.includes(word));
  
  if (containsLogLevel) {
    for (const level of logLevels) {
      if (normalizedQuery.includes(level) && !keywords.includes(level)) {
        keywords.push(level);
      }
    }
  }
  
  return keywords;
} 