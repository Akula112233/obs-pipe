import { NextResponse } from 'next/server';
import docker from '@/lib/docker';
import { getOrganizationData } from '@/utils/organization';

const MAX_LINES = 1000; // Limit to last 1000 lines

export async function GET() {
  try {
    // Get the organization data
    const { orgId } = await getOrganizationData();

    const containerName = `vector-${orgId}`;
    const container = docker.getContainer(containerName);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: MAX_LINES,
      timestamps: true
    });

    // Convert Buffer to string and split into lines
    const logsStr = logs.toString('utf-8');
    const reversedLogs = logsStr.split('\n').reverse().join('\n');
    
    return NextResponse.json({ logs: reversedLogs });
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'Organization access denied') {
      return NextResponse.json({ error: 'Organization access denied' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch logs' },
      { status: 500 }
    );
  }
} 