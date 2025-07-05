import { NextResponse } from "next/server";
import { startVectorInstance } from '@/lib/vector';
import { getOrganizationData } from '@/utils/organization';

export async function POST() {
    try {
        const { orgId } = await getOrganizationData();
        await startVectorInstance(orgId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error starting Vector:', error);
        
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message === 'Organization access denied') {
            return NextResponse.json({ error: 'Organization access denied' }, { status: 403 });
        }
        
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}