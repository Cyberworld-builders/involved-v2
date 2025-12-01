import { NextResponse } from 'next/server';
import { testServerConnection, testEnvironmentVariables } from '@/lib/supabase/test-connection';

/**
 * API Route: Test Supabase Connection
 * 
 * GET /api/test-supabase
 * 
 * Returns the status of the Supabase connection including:
 * - Environment variable configuration
 * - Database connectivity
 * - Authentication status
 */
export async function GET() {
  try {
    const envCheck = testEnvironmentVariables();
    
    if (!envCheck.allConfigured) {
      return NextResponse.json(
        {
          success: false,
          message: 'Supabase environment variables not configured',
          environment: envCheck,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    const connectionTest = await testServerConnection();

    return NextResponse.json({
      ...connectionTest,
      environment: envCheck,
      timestamp: connectionTest.timestamp.toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to test Supabase connection',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

