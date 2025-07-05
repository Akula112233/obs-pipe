import { NextResponse } from 'next/server';
import { getVectorInstance } from '@/lib/vector';
import { getOrganizationData } from '@/utils/organization';

const HEALTH_QUERY = `
  query {
    health
  }
`;

const VECTOR_PORT = 8686; // Fixed Vector API port

async function checkHealth(orgId: string): Promise<boolean> {
    try {
        const host = `vector-${orgId}`;

        if (!host) {
            console.error('Vector health check endpoint not configured');
            return false;
        }

        const endpoint = `http://${host}:${VECTOR_PORT}/graphql`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: HEALTH_QUERY }),
        });

        if (!response.ok) return false;
        const data = await response.json();
        return data.data.health;
    } catch (error) {
        console.error('Failed to check Vector status:', error);
        return false;
    }
}

export async function POST() {
    try {
        const { orgId } = await getOrganizationData();

        const instance = await getVectorInstance(orgId);
        if (!instance) {
            return NextResponse.json({ isRunning: false });
        }

        const isHealthy = await checkHealth(orgId);
        return NextResponse.json({ isRunning: isHealthy });
    } catch (error: any) {
        console.error('Error checking Vector status:', error);
        
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message === 'Organization access denied') {
            return NextResponse.json({ error: 'Organization access denied' }, { status: 403 });
        }
        
        return NextResponse.json({ isRunning: false });
    }
}