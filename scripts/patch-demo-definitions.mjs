import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read service role key from .env.local
const envContent = readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\n]+)/);
const key = keyMatch[1];

const url = 'https://cbpomvoxtxvsatkozhng.supabase.co';
const adminClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const assignmentId = '1460b51e-e512-46d9-bf94-629c3df59c31';

// Get current report data
const { data: report } = await adminClient
  .from('report_data')
  .select('dimension_scores')
  .eq('assignment_id', assignmentId)
  .single();

const scores = report.dimension_scores;

// Get assessment_id
const { data: assignment } = await adminClient
  .from('assignments')
  .select('assessment_id')
  .eq('id', assignmentId)
  .single();

// Get all dimensions for this assessment
const { data: dimensions } = await adminClient
  .from('dimensions')
  .select('id, name')
  .eq('assessment_id', assignment.assessment_id);

// Get definitions
const { data: descriptionFields } = await adminClient
  .from('fields')
  .select('dimension_id, content')
  .eq('assessment_id', assignment.assessment_id)
  .eq('type', 'rich_text')
  .in('dimension_id', dimensions.map(d => d.id));

const defMap = new Map();
const descFieldsArray = Array.isArray(descriptionFields) ? descriptionFields : [];
descFieldsArray.forEach(f => {
  if (f.dimension_id && f.content && !defMap.has(f.dimension_id)) {
    defMap.set(f.dimension_id, f.content);
  }
});

// Patch definitions into dimension_scores
let patched = 0;
for (const dim of (scores.dimensions || [])) {
  const matchedDim = dimensions.find(d => d.name === dim.dimension_name);
  if (matchedDim && defMap.has(matchedDim.id)) {
    dim.definition = defMap.get(matchedDim.id);
    patched++;
  }
  for (const sub of (dim.subdimensions || [])) {
    const matchedSub = dimensions.find(d => d.name === sub.dimension_name);
    if (matchedSub && defMap.has(matchedSub.id)) {
      sub.definition = defMap.get(matchedSub.id);
      patched++;
    }
  }
}

console.log('Patched', patched, 'definitions');

// Write back
const { error } = await adminClient
  .from('report_data')
  .update({ dimension_scores: scores })
  .eq('assignment_id', assignmentId);

if (error) {
  console.log('Update error:', error.message);
} else {
  console.log('SUCCESS - report_data updated with definitions');
}

// Verify
const { data: verify } = await adminClient
  .from('report_data')
  .select('dimension_scores')
  .eq('assignment_id', assignmentId)
  .single();

for (const dim of (verify.dimension_scores.dimensions || [])) {
  console.log('DIM:', dim.dimension_name, '| def:', dim.definition ? 'YES (' + dim.definition.substring(0, 60) + '...)' : 'no');
}
