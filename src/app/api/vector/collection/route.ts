import { NextResponse } from 'next/server';
import { startCollection as startRaw, stopCollection as stopRaw } from '../raw-logs/route';
import { startCollection as startProcessed, stopCollection as stopProcessed } from '../processed-logs/route';

export async function POST(request: Request) {
    try {
        const { action, type } = await request.json();
        
        if (action === 'start') {
            if (type === 'raw') startRaw();
            else if (type === 'processed') startProcessed();
            return NextResponse.json({ status: 'started' });
        } else if (action === 'stop') {
            if (type === 'raw') stopRaw();
            else if (type === 'processed') stopProcessed();
            return NextResponse.json({ status: 'stopped' });
        }
        
        return NextResponse.json({ error: 'Invalid action or type' }, { status: 400 });
    } catch (error) {
        console.error('Error in collection route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 