import { getOrganizationData } from '@/utils/organization';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { orgId } = await getOrganizationData();
        return NextResponse.json({ 
            isAuthenticated: true,
            orgId 
        });
    } catch (error: any) {
        // Instead of returning a 500 error, return a 200 with isAuthenticated: false
        return NextResponse.json({ 
            isAuthenticated: false,
            orgId: null 
        });
    }
} 