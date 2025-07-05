import { NextResponse } from 'next/server';
import { getVectorInstance } from '@/lib/vector';
import { getOrganizationData } from '@/utils/organization';
import { MetricsResponse } from '@/types/vector-metrics';

interface MetricsRequest {
    query: string;
}

export async function POST(request: Request) {
    try {
        const { orgId } = await getOrganizationData();
        const instance = await getVectorInstance(orgId);
        if (!instance) {
            return NextResponse.json({ error: 'Vector instance not found' }, { status: 404 });
        }

        const host = `vector-${orgId}`;
        const port = 8686;
        const endpoint = `http://${host}:${port}/graphql`;
        
        const body = await request.json() as MetricsRequest;

        console.log('Fetching metrics from Vector endpoint:', {
            endpoint,
            host,
            orgId
        });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Vector metrics response not OK:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            return NextResponse.json(
                { error: `Failed to fetch metrics: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json() as MetricsResponse;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error processing metrics:', error);
        const status = error.name === 'AbortError' ? 504 : 500;
        const message = error.name === 'AbortError' ? 'Request timeout' : error.message;
        
        return NextResponse.json(
            { error: message || 'Failed to process metrics' },
            { status }
        );
    }
} 