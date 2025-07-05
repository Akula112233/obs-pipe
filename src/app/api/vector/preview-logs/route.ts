import { NextResponse } from 'next/server';
import { getOrganizationData } from '@/utils/organization';

// Store logs per organization
const orgLogs: Record<string, any[]> = {};
const MAX_LOGS = 1000; // Keep last 1000 logs per org

export async function POST(request: Request) {
  try {
    const logs = await request.json();
    
    // Extract org ID from the log data
    let orgId;
    
    // If it's an array of logs, get org ID from the first log
    if (Array.isArray(logs)) {
      orgId = logs[0]?.siftdev_org_id;
    } else {
      // Single log object
      orgId = logs.siftdev_org_id;
    }

    // If no org ID in logs, try to get it from auth context
    if (!orgId) {
      try {
        const { orgId: id } = await getOrganizationData();
        orgId = id;
      } catch (error) {
        console.warn('Failed to get organization data:', error);
      }
    }

    if (!orgId) {
      console.error('No organization ID available in logs or auth context');
      return NextResponse.json({ error: 'No organization ID available' }, { status: 400 });
    }
    
    // Initialize org logs array if it doesn't exist
    if (!orgLogs[orgId]) {
      orgLogs[orgId] = [];
    }
    
    // Add logs to the org's array
    const logsArray = Array.isArray(logs) ? logs : [logs];
    console.log(`Received ${logsArray.length} logs for org ${orgId}`);
    
    orgLogs[orgId].push(...logsArray);
    
    // Keep only the last MAX_LOGS logs for this org
    if (orgLogs[orgId].length > MAX_LOGS) {
      orgLogs[orgId].splice(0, orgLogs[orgId].length - MAX_LOGS);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process logs:', error);
    return NextResponse.json({ error: 'Failed to process logs' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Try to get organization data from auth context
    let orgId;
    try {
      const { orgId: id } = await getOrganizationData();
      orgId = id;
    } catch (error) {
      console.warn('Failed to get organization data:', error);
      // For GET requests, we require authentication
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!orgId) {
      console.warn('No organization ID available');
      return NextResponse.json({ error: 'No organization ID available' }, { status: 400 });
    }
    
    const url = new URL(request.url);
    const componentId = url.searchParams.get('component');
    const componentType = url.searchParams.get('type');
    
    // Get logs for this organization
    let filteredLogs = orgLogs[orgId] || [];
    console.log(`Retrieved ${filteredLogs.length} logs for org ${orgId}`);

    // Apply filters if provided
    if (componentId) {
      filteredLogs = filteredLogs.filter(log => 
        log.siftdev_preview_component === componentId
      );
    }

    if (componentType) {
      filteredLogs = filteredLogs.filter(log => 
        log.siftdev_preview_type === componentType
      );
    }

    // Remove 'service' field from all logs
    const cleanedLogs = filteredLogs.map(log => {
      const logCopy = { ...log };
      if ('service' in logCopy) {
        delete logCopy.service;
      }
      return logCopy;
    });

    return NextResponse.json(cleanedLogs);
  } catch (error: any) {
    console.error('Error retrieving logs:', error);
    return NextResponse.json({ error: 'Failed to retrieve logs' }, { status: 500 });
  }
} 