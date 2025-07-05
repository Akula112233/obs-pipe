import { getOrganizationData } from '@/utils/organization';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { orgId } = await getOrganizationData();
        return NextResponse.json({ orgId });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to get organization ID' },
            { status: 500 }
        );
    }
} 