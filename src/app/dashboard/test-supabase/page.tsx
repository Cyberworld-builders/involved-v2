'use client';

import { useState } from 'react';
import { testBrowserConnection, ConnectionTestResult } from '@/lib/supabase/test-connection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function TestSupabasePage() {
  const [browserTest, setBrowserTest] = useState<ConnectionTestResult | null>(null);
  const [serverTest, setServerTest] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const runBrowserTest = async () => {
    setLoading(true);
    try {
      const result = await testBrowserConnection();
      setBrowserTest(result);
    } catch (error) {
      setBrowserTest({
        success: false,
        message: 'Failed to run browser test',
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date()
      });
    } finally {
      setLoading(false);
    }
  };

  const runServerTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-supabase');
      const result = await response.json();
      setServerTest(result);
    } catch (error) {
      setServerTest({
        success: false,
        message: 'Failed to run server test',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    await runBrowserTest();
    await runServerTest();
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Supabase Connection Test</h1>
        <p className="mt-2 text-gray-600">
          Test your Supabase connection from both browser and server contexts.
        </p>
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={runBrowserTest} 
          disabled={loading}
          variant="default"
        >
          Test Browser Connection
        </Button>
        <Button 
          onClick={runServerTest} 
          disabled={loading}
          variant="default"
        >
          Test Server Connection
        </Button>
        <Button 
          onClick={runAllTests} 
          disabled={loading}
          variant="default"
        >
          Run All Tests
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Browser Test Results */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Browser Test Results</h2>
          {browserTest ? (
            <div className="space-y-3">
              <div
                className={`rounded-lg p-3 ${
                  browserTest.success
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {browserTest.success ? '✅' : '❌'}
                  </span>
                  <span className="font-medium">{browserTest.message}</span>
                </div>
              </div>

              {browserTest.details && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <h3 className="mb-2 font-medium text-gray-700">Details:</h3>
                  <pre className="overflow-x-auto text-xs text-gray-600">
                    {JSON.stringify(browserTest.details, null, 2)}
                  </pre>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Tested at: {browserTest.timestamp.toLocaleString()}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Click "Test Browser Connection" to run the test.</p>
          )}
        </Card>

        {/* Server Test Results */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Server Test Results</h2>
          {serverTest ? (
            <div className="space-y-3">
              <div
                className={`rounded-lg p-3 ${
                  serverTest.success
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {serverTest.success ? '✅' : '❌'}
                  </span>
                  <span className="font-medium">{serverTest.message}</span>
                </div>
              </div>

              {serverTest.environment && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <h3 className="mb-2 font-medium text-gray-700">Environment:</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span>SUPABASE_URL:</span>
                      <span className={serverTest.environment.hasUrl ? 'text-green-600' : 'text-red-600'}>
                        {serverTest.environment.hasUrl ? '✓ Set' : '✗ Missing'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>SUPABASE_ANON_KEY:</span>
                      <span className={serverTest.environment.hasAnonKey ? 'text-green-600' : 'text-red-600'}>
                        {serverTest.environment.hasAnonKey ? '✓ Set' : '✗ Missing'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {serverTest.details && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <h3 className="mb-2 font-medium text-gray-700">Details:</h3>
                  <pre className="overflow-x-auto text-xs text-gray-600">
                    {JSON.stringify(serverTest.details, null, 2)}
                  </pre>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Tested at: {serverTest.timestamp}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Click "Test Server Connection" to run the test.</p>
          )}
        </Card>
      </div>

      {/* Instructions */}
      <Card className="p-6">
        <h2 className="mb-3 text-xl font-semibold">What This Tests</h2>
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>Browser Test:</strong> Verifies Supabase connection from the client-side, checks authentication session, and attempts a database query.</p>
          <p><strong>Server Test:</strong> Verifies Supabase connection from the server-side, checks environment variables, authentication, and database access.</p>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 font-medium text-blue-900">Troubleshooting</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
            <li>If environment variables are missing, check your <code>.env.local</code> file</li>
            <li>If database queries fail, verify your Supabase RLS policies</li>
            <li>If authentication fails, try signing out and back in</li>
            <li>Make sure your Supabase project is not paused</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

