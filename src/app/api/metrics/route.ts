import { NextResponse } from 'next/server';
import docker from '@/lib/docker';

export async function GET() {
    try {
        const container = docker.getContainer('vector');
        const logs = await container.logs({
            stdout: true,
            stderr: true,
            timestamps: true
        });

        // Convert Buffer to string and split into lines
        const logsStr = logs.toString('utf-8');
        const logLines = logsStr.split('\n');
        
        return NextResponse.json({ logs: logLines }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}