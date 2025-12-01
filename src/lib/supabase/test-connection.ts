/**
 * Supabase Connection Test Utilities
 * 
 * This module provides functions to test and verify Supabase connectivity.
 */

import { createClient as createBrowserClient } from './client';
import { createClient as createServerClient } from './server';

export type ConnectionTestResult = {
  success: boolean;
  message: string;
  details?: any;
  timestamp: Date;
};

/**
 * Test the Supabase connection from the browser
 * @returns Promise with test result
 */
export async function testBrowserConnection(): Promise<ConnectionTestResult> {
  const timestamp = new Date();
  
  try {
    const supabase = createBrowserClient();
    
    // Try to get the current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return {
        success: false,
        message: 'Failed to connect to Supabase (browser)',
        details: { error: sessionError.message },
        timestamp
      };
    }

    // Try a simple query to verify database connection
    const { data, error } = await supabase
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
      message: 'Successfully connected to Supabase (browser)',
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
    const { data, error } = await supabase
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
 * Test environment variables are properly configured
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

/**
 * Get a comprehensive status report of Supabase configuration
 */
export async function getSupabaseStatus(): Promise<{
  environment: ReturnType<typeof testEnvironmentVariables>;
  connectionTest?: ConnectionTestResult;
}> {
  const environment = testEnvironmentVariables();
  
  if (!environment.allConfigured) {
    return {
      environment,
      connectionTest: {
        success: false,
        message: 'Environment variables not configured',
        details: environment,
        timestamp: new Date()
      }
    };
  }

  // Only test connection if we're in a browser context
  if (typeof window !== 'undefined') {
    const connectionTest = await testBrowserConnection();
    return {
      environment,
      connectionTest
    };
  }

  return {
    environment
  };
}

