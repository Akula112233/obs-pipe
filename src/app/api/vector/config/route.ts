import { NextRequest, NextResponse } from 'next/server';
import { createVectorInstance, getVectorInstance, updateVectorConfig } from '@/lib/vector';
import yaml from 'js-yaml';
import { getOrganizationData } from '@/utils/organization';

export async function GET() {
    try {
        const { orgId } = await getOrganizationData();
        console.log(`[GET /api/vector/config] Starting request for orgId: ${orgId}`);

        try {
            const instance = await getVectorInstance(orgId);
            
            // If no instance exists, return empty config
            if (!instance) {
                console.log(`[GET /api/vector/config] No instance found for orgId: ${orgId}, returning empty config`);
                return NextResponse.json({
                    config: {
                        sources: {},
                        transforms: {},
                        sinks: {}
                    }
                });
            }

            // Parse config if it's a string
            const parsedConfig = typeof instance.config === 'string' 
                ? yaml.load(instance.config) 
                : instance.config;

            console.log(`[GET /api/vector/config] Successfully retrieved config for orgId: ${orgId}`);
            return NextResponse.json({ config: parsedConfig });
        } catch (error: any) {
            console.error('[GET /api/vector/config] Vector instance error:', error);
            
            // Handle specific organization-related errors
            if (error.message?.includes('Organization') || error.code === '23503') {
                return NextResponse.json(
                    { error: 'Organization configuration is not properly set up. Please contact support.' },
                    { status: 400 }
                );
            }

            // Handle other specific errors
            if (error.code === 'PGRST116') {
                return NextResponse.json({
                    config: {
                        sources: {},
                        transforms: {},
                        sinks: {}
                    }
                });
            }

            return NextResponse.json(
                { error: error.message || 'Failed to fetch vector configuration' },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('[GET /api/vector/config] Error:', error);
        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { orgId, userId } = await getOrganizationData();
        console.log(`[POST /api/vector/config] Starting request for orgId: ${orgId}, userId: ${userId}`);
        const config = await request.json();

        try {
            let instance = await getVectorInstance(orgId);
            console.log(`[POST /api/vector/config] Retrieved instance for orgId: ${orgId}:`, { instanceExists: !!instance });

            if (!instance) {
                console.log(`[POST /api/vector/config] Creating new instance for orgId: ${orgId}`);
                instance = await createVectorInstance(orgId, config);
            } else {
                console.log(`[POST /api/vector/config] Updating existing instance for orgId: ${orgId}`);
                await updateVectorConfig(userId, config);
            }

            console.log(`[POST /api/vector/config] Successfully handled config update for orgId: ${orgId}`);
            return NextResponse.json({ success: true });
        } catch (error: any) {
            console.error('[POST /api/vector/config] Vector instance error:', error);
            
            if (error.message?.includes('Organization') || error.code === '23503') {
                return NextResponse.json(
                    { error: 'Organization configuration is not properly set up. Please contact support.' },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: error.message || 'Failed to update vector configuration' },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('[POST /api/vector/config] Error:', error);
        
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message === 'Organization access denied') {
            return NextResponse.json({ error: 'Organization access denied' }, { status: 403 });
        }
        
        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred' },
            { status: 500 }
        );
    }
} 