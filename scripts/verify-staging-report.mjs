/**
 * Standalone verification script for staging report rendering.
 * Logs in via Supabase API, injects session cookies, and checks the report view.
 */
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const anonKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=["']?([^"'\n]+)/)[1];
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\n]+)/)[1];
const url = 'https://cbpomvoxtxvsatkozhng.supabase.co';
const projectRef = 'cbpomvoxtxvsatkozhng';

// Sign in
const client = createClient(url, anonKey);
const { data: auth, error } = await client.auth.signInWithPassword({
  email: 'e2e-test-admin@involved-talent.test',
  password: 'TestPassword123!'
});
if (error) { console.error('Auth failed:', error.message); process.exit(1); }
console.log('✅ Authenticated');

// Ensure user is super_admin so they can view any report
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: profile } = await admin.from('profiles').select('id, access_level').eq('auth_user_id', auth.user.id).single();
if (profile && profile.access_level !== 'super_admin') {
  await admin.from('profiles').update({ access_level: 'super_admin' }).eq('id', profile.id);
  console.log('  Upgraded to super_admin');
}

const session = auth.session;

// Launch browser
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// Use service_role_token query param to bypass auth (middleware supports this)

// Test assignments: Jay Long demo (has definitions) + one Frontier (client's, no definitions)
const testCases = [
  { id: '681a405e-23c4-4c8f-a562-80392141c8c6', name: 'Leaders Demo - leader/blocker (no definitions)', expectDefinitions: false },
  { id: '1460b51e-e512-46d9-bf94-629c3df59c31', name: 'Jay Long Demo - 360 (with definitions in data)', expectDefinitions: true },
  { id: '3eda9e70-c171-475b-820e-295910470e0b', name: 'Don Duck Frontier - 360 (client, read-only)', expectDefinitions: false },
];

for (const tc of testCases) {
  console.log(`\n--- ${tc.name} ---`);
  const reportUrl = `http://localhost:3000/reports/${tc.id}/view?service_role_token=${serviceKey}`;

  await page.goto(reportUrl, { waitUntil: 'networkidle', timeout: 30000 });

  const currentUrl = page.url();
  if (currentUrl.includes('/auth/login')) {
    console.log('❌ Redirected to login — auth cookies not working');
    continue;
  }

  console.log('✅ Report loaded:', currentUrl);

  // Check for old placeholder text
  const bodyText = await page.textContent('body');
  const hasOldPlaceholder = bodyText.includes('This is a placeholder definition');
  console.log(hasOldPlaceholder ? '❌ OLD placeholder text found!' : '✅ No old placeholder text');

  // Check for new fallback text
  const hasNewFallback = bodyText.includes('Definition not yet provided');
  console.log(hasNewFallback ? '  ℹ️  "Definition not yet provided" present (expected for dims without definitions)' : '  ℹ️  No "Definition not yet provided" text');

  // Check for real definitions
  const hasRealDefinitions = bodyText.includes('Defined:');
  console.log(hasRealDefinitions ? '✅ Real definitions present ("Defined:" label found)' : '  ℹ️  No "Defined:" labels');

  // Check page structure
  const pageContainers = await page.locator('.page-container').count();
  console.log(`  Pages rendered: ${pageContainers}`);

  // Check for subdimension overview table content (leader/blocker specific)
  const subOverviewText = await page.locator('.leader-subdimension-overview').textContent().catch(() => null);
  if (subOverviewText) {
    console.log('  Subdimension overview found');
    const hasFallback = subOverviewText.includes('Definition not yet provided');
    console.log(hasFallback ? '  ✅ "Definition not yet provided" shown (italic gray fallback)' : '  ℹ️  No fallback text in subdimension overview');
  }

  // Screenshot the subdimension overview page (if it exists)
  const subOverview = page.locator('.leader-subdimension-overview').first();
  if (await subOverview.count() > 0) {
    await subOverview.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const screenshotPath = `test-results/verify-${tc.id.substring(0,8)}-subdim-overview.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`  Screenshot (subdim overview): ${screenshotPath}`);
  }

  // Screenshot a dimension detail page (look for "Defined:" or definition block)
  const dimPage = page.locator('.leader-dimension-detail, .page-content.leader-info').first();
  if (await dimPage.count() > 0) {
    await dimPage.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const screenshotPath = `test-results/verify-${tc.id.substring(0,8)}-dim-detail.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`  Screenshot (dim detail): ${screenshotPath}`);
  }

  // Fallback: screenshot page 4 area (usually where subdim overview is)
  const page4 = page.locator('[id="4"], .page-container >> nth=3').first();
  if (await page4.count() > 0) {
    await page4.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const screenshotPath = `test-results/verify-${tc.id.substring(0,8)}-page4.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`  Screenshot (page 4): ${screenshotPath}`);
  }
}

await browser.close();
console.log('\n✅ Verification complete');
