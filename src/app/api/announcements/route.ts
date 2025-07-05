import { NextResponse } from 'next/server';
import { announcementsAndKillSwitchConfig } from '@/lib/announcements-and-kill-switch-config';

export async function GET() {
  return NextResponse.json(announcementsAndKillSwitchConfig.announcements);
} 