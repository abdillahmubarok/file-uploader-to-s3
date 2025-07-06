import { NextRequest, NextResponse } from 'next/server';
import { validateEnvironment } from '@/app/actions';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    // Basic security check - only allow in development or with specific header
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasDebugHeader = request.headers.get('x-debug-key') === process.env.DEBUG_KEY;
    
    if (!isDevelopment && !hasDebugHeader) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const validation = await validateEnvironment();
        
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            ...validation
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}