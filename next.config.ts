import type { NextConfig } from "next";

// Get Supabase URL from environment variable
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// Extract hostname from Supabase URL
const getSupabaseHostname = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
};

const supabaseHostname = getSupabaseHostname(supabaseUrl);

// Build remote patterns dynamically
const remotePatterns: Array<{
  protocol: 'http' | 'https';
  hostname: string;
  pathname: string;
}> = [];

if (supabaseHostname) {
  // Add the specific Supabase hostname (works for both local and cloud)
  const protocol = supabaseUrl.startsWith('https') ? 'https' : 'http';
  remotePatterns.push({
    protocol,
    hostname: supabaseHostname,
    pathname: '/storage/v1/object/public/**',
  });
} else {
  // Fallback: add common patterns if URL is not available
  remotePatterns.push(
    {
      protocol: 'https',
      // Supabase hosted projects are on <project-ref>.supabase.co
      // Next.js remotePatterns supports wildcard matching with '*'
      hostname: '*.supabase.co',
      pathname: '/storage/v1/object/public/**',
    },
    {
      // Some Supabase projects can use regional domains (e.g. supabase.in)
      protocol: 'https',
      hostname: '*.supabase.in',
      pathname: '/storage/v1/object/public/**',
    },
    {
      protocol: 'http',
      hostname: 'localhost',
      pathname: '/storage/v1/object/public/**',
    }
  );
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
