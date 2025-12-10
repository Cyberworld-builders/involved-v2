/**
 * Supabase Connection Test Utilities (Server-side)
 * 
 * This module provides functions to test and verify Supabase connectivity from the server.
 */

import { createClient as createServerClient } from './server';

export type ConnectionTestResult = {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
};

/**
 * Test the Supabase connection from the server
 * @returns Promise with test result
 */
export async function testServerConnection(): Promise<ConnectionTestResult> {
  const timestamp = new Date();
  
  try {
    const supabase = await createServerClient();
    
    // Try to get the current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return {
        success: false,
        message: 'Failed to connect to Supabase (server)',
        details: { error: sessionError.message },
        timestamp
      };
    }

    // Try a simple query to verify database connection
    const { error } = await supabase
      .from('clients')
      .select('id')
      .limit(1);
    
    if (error) {
      return {
        success: false,
        message: 'Connected to Supabase but failed to query database',
        details: { 
          error: error.message,
          hasSession: !!sessionData.session 
        },
        timestamp
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase (server)',
      details: {
        hasSession: !!sessionData.session,
        user: sessionData.session?.user?.email || 'Not authenticated',
        canQueryDatabase: true
      },
      timestamp
    };
  } catch (error) {
    return {
      success: false,
      message: 'Unexpected error testing Supabase connection',
      details: { error: error instanceof Error ? error.message : String(error) },
      timestamp
    };
  }
}

/**
 * Test environment variables are properly configured (server-side)
 * @returns Object indicating which env vars are set
 */
export function testEnvironmentVariables(): {
  hasUrl: boolean;
  hasAnonKey: boolean;
  allConfigured: boolean;
} {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return {
    hasUrl,
    hasAnonKey,
    allConfigured: hasUrl && hasAnonKey
  };
}
