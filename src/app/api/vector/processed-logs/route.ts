import { NextResponse } from 'next/server';

let isCollecting = false;
let logs: any[] = [];

export async function POST(request: Request) {
    try {
        if (!isCollecting) {
            return NextResponse.json({ status: 'ok' });
        }

        const body = await request.json();
        console.log('Received processed log data:', body);

        // Handle both single log and array of logs
        if (Array.isArray(body)) {
            logs.push(...body);
        } else {
            logs.push(body);
        }
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs = logs.slice(-100);
        }

        console.log(`Current processed logs count: ${logs.length}`);
        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Error processing processed logs:', error);
        return NextResponse.json({ error: 'Failed to process logs' }, { status: 500 });
    }
}

export async function GET() {
    console.log(`Returning ${logs.length} processed logs, collecting: ${isCollecting}`);
    if (!isCollecting) {
        return NextResponse.json({ logs: [] });
    }
    return NextResponse.json({ logs });
}

export function startCollection() {
    console.log('Starting processed logs collection');
    logs = [];
    isCollecting = true;
}

export function stopCollection() {
    console.log('Stopping processed logs collection');
    isCollecting = false;
    logs = [];
} 