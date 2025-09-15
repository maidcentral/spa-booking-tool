import { NextResponse } from 'next/server';
import { getEnvConfig, getLayoutMode } from '@/app/lib/config/env';

export async function GET() {
  const config = getEnvConfig();
  const layoutMode = getLayoutMode();
  
  return NextResponse.json({
    success: true,
    config: {
      multiStepLayout: config.multiStepLayout,
      layoutMode: layoutMode,
      rawEnvValue: process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT,
    },
    message: `Layout mode is set to: ${layoutMode}`,
  });
}