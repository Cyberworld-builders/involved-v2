-- ==========================================================================
-- Frontier 360 Assessment Seeder
-- Exported from staging on 2026-03-31
-- Contains: 1 assessment, 9 dimensions, 38 fields (9 rich_text definitions,
--           9 multiple_choice, 9 text_input, 10 page_break, 1 instructions)
-- ==========================================================================

BEGIN;

-- Create a local admin user for the assessment's created_by FK
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
  phone_change_token, phone_change, reauthentication_token)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@demo.com',
  crypt('Test123$', gen_salt('bf')),
  now(), now(), now(), 'authenticated', 'authenticated',
  '', '', '', '', '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

UPDATE profiles SET
  name = 'Demo Admin',
  username = 'admin',
  role = 'admin',
  access_level = 'super_admin'
WHERE auth_user_id = '00000000-0000-0000-0000-000000000001';

-- Test client
INSERT INTO clients (id, name, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000010', 'Frontier Test Client', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Assign admin to client
UPDATE profiles SET client_id = '00000000-0000-0000-0000-000000000010'
WHERE auth_user_id = '00000000-0000-0000-0000-000000000001';

-- Test auth users (all use password 'DevLogin123!')
-- The trigger auto-creates profiles, which we then update with client/role info
DO $$
DECLARE
  users text[][] := ARRAY[
    ARRAY['00000000-0000-0000-0000-000000000101', 'alice@test.com', 'alice', 'Alice Johnson'],
    ARRAY['00000000-0000-0000-0000-000000000102', 'bob@test.com', 'bob', 'Bob Smith'],
    ARRAY['00000000-0000-0000-0000-000000000103', 'carol@test.com', 'carol', 'Carol Williams'],
    ARRAY['00000000-0000-0000-0000-000000000104', 'dave@test.com', 'dave', 'Dave Brown'],
    ARRAY['00000000-0000-0000-0000-000000000105', 'eve@test.com', 'eve', 'Eve Davis'],
    ARRAY['00000000-0000-0000-0000-000000000106', 'frank@test.com', 'frank', 'Frank Miller'],
    ARRAY['00000000-0000-0000-0000-000000000107', 'grace@test.com', 'grace', 'Grace Wilson'],
    ARRAY['00000000-0000-0000-0000-000000000108', 'hank@test.com', 'hank', 'Hank Taylor']
  ];
  u text[];
BEGIN
  FOREACH u SLICE 1 IN ARRAY users LOOP
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, aud, role, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change_token, phone_change, reauthentication_token)
    VALUES (
      u[1]::uuid, '00000000-0000-0000-0000-000000000000'::uuid, u[2],
      crypt('DevLogin123!', gen_salt('bf')), now(), now(), now(),
      'authenticated', 'authenticated',
      json_build_object('username', u[3], 'full_name', u[4])::jsonb,
      '', '', '', '', '', '', '', ''
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- Update trigger-created profiles with client assignment and role
UPDATE profiles SET
  client_id = '00000000-0000-0000-0000-000000000010',
  role = 'user'
WHERE auth_user_id IN (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000104',
  '00000000-0000-0000-0000-000000000105',
  '00000000-0000-0000-0000-000000000106',
  '00000000-0000-0000-0000-000000000107',
  '00000000-0000-0000-0000-000000000108'
);

-- Test group (target = Alice — she's who everyone rates in this 360)
INSERT INTO groups (id, name, client_id, target_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000020', 'Frontier Test Group', '00000000-0000-0000-0000-000000000010',
  (SELECT id FROM profiles WHERE auth_user_id = '00000000-0000-0000-0000-000000000101'),
  now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- Add all test users to the group (look up trigger-created profile IDs)
INSERT INTO group_members (group_id, profile_id, created_at)
SELECT '00000000-0000-0000-0000-000000000020', p.id, now()
FROM profiles p
WHERE p.auth_user_id IN (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000104',
  '00000000-0000-0000-0000-000000000105',
  '00000000-0000-0000-0000-000000000106',
  '00000000-0000-0000-0000-000000000107',
  '00000000-0000-0000-0000-000000000108'
)
ON CONFLICT DO NOTHING;

-- Assessment (created_by references the auth user ID directly)
INSERT INTO assessments (id, title, description, logo, background, primary_color, accent_color, split_questions, questions_per_page, timed, time_limit, target, is_360, type, status, created_by, created_at, updated_at, custom_fields, use_custom_fields, number_of_questions, show_question_numbers, dimension_question_counts)
VALUES ('b72cd008-8249-49be-9ef4-00383c586f79', 'Involved-360 - Frontier', '<p>A competency-based 360-evaluation that provides an analytically robust picture of strengths and improvement opportunities.</p>', NULL, NULL, '#262962', '#F26950', false, 10, false, NULL, '2', true, '360', 'active',
  '00000000-0000-0000-0000-000000000001',
  '2026-01-06T22:01:48.736016+00:00', '2026-03-22T13:04:12.12968+00:00', '{"tag": ["name", "email", "grouprole"], "default": ["", "", ""]}'::jsonb, true, NULL, false, NULL)
ON CONFLICT (id) DO NOTHING;

-- Dimensions (9)
INSERT INTO dimensions (id, assessment_id, name, code, parent_id, created_at, updated_at, sort_order)
VALUES ('fe9ef691-ed12-4b99-a60c-03b173db3196', 'b72cd008-8249-49be-9ef4-00383c586f79', 'Creative Problem Solving', 'CPS', NULL, '2026-03-20T21:36:19.444981+00:00', '2026-03-22T13:04:09.985286+00:00', 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO dimensions (id, assessment_id, name, code, parent_id, created_at, updated_at, sort_order)
VALUES ('d89c92eb-ffe6-4bce-bdad-557b9e7cb418', 'b72cd008-8249-49be-9ef4-00383c586f79', 'Leadership Adaptability', 'LA', NULL, '2026-03-20T21:36:19.697069+00:00', '2026-03-22T13:04:10.049593+00:00', 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO dimensions (id, assessment_id, name, code, parent_id, created_at, updated_at, sort_order)
VALUES ('f63d9448-53b6-400c-af16-06c5591b4618', 'b72cd008-8249-49be-9ef4-00383c586f79', 'Collaboration', 'CO', NULL, '2026-03-20T21:36:19.83751+00:00', '2026-03-22T13:04:10.102233+00:00', 3)
ON CONFLICT (id) DO NOTHING;
INSERT INTO dimensions (id, assessment_id, name, code, parent_id, created_at, updated_at, sort_order)
VALUES ('538385e0-b455-4667-ac08-58a8c610e4ad', 'b72cd008-8249-49be-9ef4-00383c586f79', 'Self-Development', 'SD', NULL, '2026-03-20T21:36:19.982827+00:00', '2026-03-22T13:04:10.1563+00:00', 4)
ON CONFLICT (id) DO NOTHING;
INSERT INTO dimensions (id, assessment_id, name, code, parent_id, created_at, updated_at, sort_order)
VALUES ('b7b50624-5ebf-45e0-918c-4707d4216ceb', 'b72cd008-8249-49be-9ef4-00383c586f79', 'Performance Management', 'PM', NULL, '2026-03-20T21:36:20.205636+00:00', '2026-03-22T13:04:10.210809+00:00', 5)
ON CONFLICT (id) DO NOTHING;
INSERT INTO dimensions (id, assessment_id, name, code, parent_id, created_at, updated_at, sort_order)
VALUES ('ac1edb09-46c8-403e-b2a9-4948a4652967', 'b72cd008-8249-49be-9ef4-00383c586f79', 'Business Mindset', 'BM', NULL, '2026-03-20T21:36:20.338307+00:00', '2026-03-22T13:04:10.263784+00:00', 6)
ON CONFLICT (id) DO NOTHING;
INSERT INTO dimensions (id, assessment_id, name, code, parent_id, created_at, updated_at, sort_order)
VALUES ('3f146659-1598-4ecd-aab5-dd196ca94dde', 'b72cd008-8249-49be-9ef4-00383c586f79', 'Customer Focus', 'CF', NULL, '2026-03-20T21:36:20.453972+00:00', '2026-03-22T13:04:10.321962+00:00', 7)
ON CONFLICT (id) DO NOTHING;
INSERT INTO dimensions (id, assessment_id, name, code, parent_id, created_at, updated_at, sort_order)
VALUES ('823f32bf-3339-482f-b3a9-2b6a1e028ced', 'b72cd008-8249-49be-9ef4-00383c586f79', 'Communication', 'COM', NULL, '2026-03-20T21:36:20.56538+00:00', '2026-03-22T13:04:10.381133+00:00', 8)
ON CONFLICT (id) DO NOTHING;
INSERT INTO dimensions (id, assessment_id, name, code, parent_id, created_at, updated_at, sort_order)
VALUES ('8d4ec265-a010-4ab2-bba9-53d3555bdaea', 'b72cd008-8249-49be-9ef4-00383c586f79', 'Ethics & Integrity', 'EI', NULL, '2026-03-20T21:36:20.73438+00:00', '2026-03-22T13:04:10.445535+00:00', 9)
ON CONFLICT (id) DO NOTHING;

-- Fields (38)
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('c3dee28a-6b23-44b0-8979-81f3a06139cd', 'b72cd008-8249-49be-9ef4-00383c586f79', 'd89c92eb-ffe6-4bce-bdad-557b9e7cb418', 'rich_text', '<p><strong>Definition</strong>: Leadership Adaptability is having the ability to see the need for change early on. Having the willingness to smoothly and comfortably adjust his/her work style to the change, as well as assist his/her team in positively adapting to the change. This competency also captures a manager''s psychological ownership over the change.</p>', 0, '[]'::jsonb, '2026-03-22T13:03:00.804683+00:00', '2026-03-22T13:03:44.687219+00:00', false, 0, NULL, false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('0c371acc-4749-47ec-a47e-d9ceaf778bad', 'b72cd008-8249-49be-9ef4-00383c586f79', '538385e0-b455-4667-ac08-58a8c610e4ad', 'rich_text', '<p><strong>Definition</strong>: Self-Development encompasses the identification of weaknesses and positive action to overcome identified weaknesses, continuing to build one''s strengths, being self-aware of actions and how they impact others, transferring formal and informal training/development back to one''s daily job, and mastering all aspects of management, not just functional expertise.</p>', 0, '[]'::jsonb, '2026-03-22T13:03:00.927353+00:00', '2026-03-22T13:03:44.866934+00:00', false, 0, NULL, false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('4135d994-cd5e-4727-b45d-492a594597c2', 'b72cd008-8249-49be-9ef4-00383c586f79', 'ac1edb09-46c8-403e-b2a9-4948a4652967', 'rich_text', '<p><strong>Definition</strong>: Business Mindset encompasses having a clear and complete focus on the entire operation as a sustainable/growing business, seeing and implementing the entire vision of the company, inclusive of internal and external stakeholders, and linking departmental operations to all business indicators (i.e., labor costs, patient satisfaction, quality), and how departmental metrics truly impact the entire business.</p>', 0, '[]'::jsonb, '2026-03-22T13:03:01.041993+00:00', '2026-03-22T13:03:45.04117+00:00', false, 0, NULL, false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('c1d5d099-2398-42ee-9388-4fa41ef456a4', 'b72cd008-8249-49be-9ef4-00383c586f79', '823f32bf-3339-482f-b3a9-2b6a1e028ced', 'rich_text', '<p><strong>Definition</strong>: Communication is defined as clearly, concisely, and accurately conveying necessary information when it is needed while avoiding sharing unfounded information/rumors. Communication also encompasses providing rationale behind messages/decisions; seeking to understand others'' views and priorities, adjusting communication styles to audience, and encouraging open and candid dialogue from others.</p>', 0, '[]'::jsonb, '2026-03-22T13:03:01.149788+00:00', '2026-03-22T13:03:45.257905+00:00', false, 0, NULL, false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('f9a09223-1c05-479a-8577-fe3c74c4cd25', 'b72cd008-8249-49be-9ef4-00383c586f79', 'f63d9448-53b6-400c-af16-06c5591b4618', 'rich_text', '<p><strong>Definition</strong>: Collaboration is being able to effectively work with internal stakeholders up and down the chain (vertical) and horizontally with peers, as well as external individuals/organizations/partners (e.g., vendors, community leaders).</p>', 0, '[]'::jsonb, '2026-03-22T13:03:00.860256+00:00', '2026-03-22T13:03:44.778499+00:00', false, 0, NULL, false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('4dc242f4-27d4-44aa-bb21-7d1b275a09ba', 'b72cd008-8249-49be-9ef4-00383c586f79', 'b7b50624-5ebf-45e0-918c-4707d4216ceb', 'rich_text', '<p><strong>Definition</strong>: Performance Management is defined as the ability to consistently lead and develop individuals and teams, set goals, create and implement a valued rewards structure, consistently hold individuals and teams accountable in an effective and positive manner, and provide the necessary information in a clear and actionable manner.</p>', 0, '[]'::jsonb, '2026-03-22T13:03:00.983087+00:00', '2026-03-22T13:03:44.952354+00:00', false, 0, NULL, false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('8be97a83-9f9d-4a20-8d6e-3bf3c733358e', 'b72cd008-8249-49be-9ef4-00383c586f79', '3f146659-1598-4ecd-aab5-dd196ca94dde', 'rich_text', '<p><strong>Definition</strong>: Customer Focus encompasses anticipating, communicating, and addressing current &amp; emerging customer needs; actively listening to customers'' needs, goals, and expectations; developing, reinforcing and strengthening customer service culture; adjusting priorities to meet multiple and often competing customers’ demands, seeks and incorporates feedback from customers to improve performance, and follows up with customers to insure needs have been met satisfactory. This competency applies to both internal and external customers.</p>', 0, '[]'::jsonb, '2026-03-22T13:03:01.094431+00:00', '2026-03-22T13:03:45.140312+00:00', false, 0, NULL, false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('4b7ff7bd-2af1-4787-afd1-3a0032f617b6', 'b72cd008-8249-49be-9ef4-00383c586f79', '8d4ec265-a010-4ab2-bba9-53d3555bdaea', 'rich_text', '<p><strong>Definition</strong>: Ethics &amp; Integrity competency is defined as instilling mutual trust &amp; confidence, building and reinforcing inclusivity for all, accepting/owning responsibility for mistakes and successes, creating a culture that fosters high standards of integrity &amp; ethics, behaves in a fair, just, and ethical manner to all stakeholders, shows consistency in principles, values, and behaviors, and demonstrates a sense of responsibility and commitment to the organization, your colleagues, and all our customers.</p>', 0, '[]'::jsonb, '2026-03-22T13:03:01.207952+00:00', '2026-03-22T13:03:45.391588+00:00', false, 0, NULL, false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('3ba11051-32a2-4a61-ba98-13ff059c64e4', 'b72cd008-8249-49be-9ef4-00383c586f79', 'fe9ef691-ed12-4b99-a60c-03b173db3196', 'rich_text', '<p><strong>Definition</strong>: Creative Problem Solving is defined as proactive problem-solving focusing on the successful implementation of novel and creative solutions to known or anticipated problems, being mindful of and efficient in using resources (i.e., resourcefulness), and utilizing a visionary mindset.</p>', 0, '[]'::jsonb, '2026-03-20T21:36:20.988629+00:00', '2026-03-20T21:36:20.988629+00:00', false, 0, NULL, false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('f2f13e58-757f-446e-bcad-9c6d7705a272', 'b72cd008-8249-49be-9ef4-00383c586f79', 'fe9ef691-ed12-4b99-a60c-03b173db3196', 'multiple_choice', '<h2>Creative Problem Solving</h2><p><strong>Definition</strong>: Creative Problem Solving is defined as proactive problem-solving focusing on the successful implementation of novel and creative solutions to known or anticipated problems, being mindful of and efficient in using resources (i.e., resourcefulness), and utilizing a visionary mindset.</p><h3><em>Please select your rating for&nbsp;[name] for this dimension.</em></h3><p></p>', 1, '[{"id": "anchor-1767555172256-0", "name": "Below Expectations", "value": 1, "practice": false}, {"id": "anchor-1767555172256-1", "name": "Slightly Below Expectations", "value": 2, "practice": false}, {"id": "anchor-1767555172256-2", "name": "Meets Expectations", "value": 3, "practice": false}, {"id": "anchor-1767555172256-3", "name": "Slightly Exceeds Expectations", "value": 4, "practice": false}, {"id": "anchor-1767555172256-4", "name": "Exceeds Expectations", "value": 5, "practice": false}]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:10.498899+00:00', false, 1, '[]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('d9e0f35a-f733-4147-bd26-c41036f543cc', 'b72cd008-8249-49be-9ef4-00383c586f79', 'fe9ef691-ed12-4b99-a60c-03b173db3196', 'text_input', '<p><strong>Developmental Comments for Creative Problem Solving:</strong></p>', 2, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:10.554866+00:00', false, 2, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('98ca9426-2263-40b7-a1d2-cab70713b304', 'b72cd008-8249-49be-9ef4-00383c586f79', NULL, 'page_break', '', 3, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:10.608545+00:00', false, 3, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('75b2f321-e050-481e-9d00-1b478d16da9b', 'b72cd008-8249-49be-9ef4-00383c586f79', 'd89c92eb-ffe6-4bce-bdad-557b9e7cb418', 'multiple_choice', '<h2>Leadership Adaptability</h2><p><strong>Definition</strong>: Leadership Adaptability is having the ability to see the need for change early on. Having the willingness to smoothly and comfortably adjust his/her work style to the change as well as assist his/her team in positively adapting to the change. This competency also captures one''s psychological ownership over the change.</p><h3><em>Please select your rating for [name] for this dimension.</em></h3><p></p>', 4, '[{"id": "anchor-1767556055671-0", "name": "Below Expectations", "value": 1, "practice": false}, {"id": "anchor-1767556055671-1", "name": "Slightly Below Expectations", "value": 2, "practice": false}, {"id": "anchor-1767556055671-2", "name": "Meets Expectations", "value": 3, "practice": false}, {"id": "anchor-1767556055671-3", "name": "Slightly Exceeds Expectations", "value": 4, "practice": false}, {"id": "anchor-1767556055671-4", "name": "Exceeds Expectations", "value": 5, "practice": false}]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:10.661485+00:00', false, 4, '[]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('b6514ee8-d727-441c-90fd-c146e07194a6', 'b72cd008-8249-49be-9ef4-00383c586f79', 'd89c92eb-ffe6-4bce-bdad-557b9e7cb418', 'text_input', '<p><strong>Developmental Comments for Leadership Adaptability:</strong></p>', 5, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:10.714857+00:00', false, 5, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('0e52dfd5-de7e-48c4-971e-ea6d0790ee39', 'b72cd008-8249-49be-9ef4-00383c586f79', NULL, 'page_break', '', 6, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:10.7739+00:00', false, 6, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('f0f5a197-8618-403e-b4ab-1efa5afce24d', 'b72cd008-8249-49be-9ef4-00383c586f79', 'f63d9448-53b6-400c-af16-06c5591b4618', 'multiple_choice', '<h2>Collaboration</h2><p><strong>Definition</strong>: Collaboration is being able to effectively work with internal stakeholders/employees up and down the chain of organizational hierarchy (vertical) and horizontally with peers as well as external individuals/organizations/partners (e.g., vendor, community leaders) all the while&nbsp;knowing and showing ones authentic self to others at work while simultaneously knowing how one is portrayed across all work settings.&nbsp;</p><h3><em>Please select your rating for [name] for this dimension.</em></h3><p></p>', 7, '[{"id": "anchor-1767556141613-0", "name": "Below Expectations", "value": 1, "practice": false}, {"id": "anchor-1767556141613-1", "name": "Slightly Below Expectations", "value": 2, "practice": false}, {"id": "anchor-1767556141613-2", "name": "Meets Expectations", "value": 3, "practice": false}, {"id": "anchor-1767556141613-3", "name": "Slightly Exceeds Expectations", "value": 4, "practice": false}, {"id": "anchor-1767556141613-4", "name": "Exceeds Expectations", "value": 5, "practice": false}]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:10.827943+00:00', false, 7, '[]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('ee8b4ba3-fb0a-416a-aaf6-f3abea335bed', 'b72cd008-8249-49be-9ef4-00383c586f79', 'f63d9448-53b6-400c-af16-06c5591b4618', 'text_input', '<p><strong>Developmental Comments for Collaboration:</strong></p>', 8, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:10.881695+00:00', false, 8, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('31369f9f-f515-45c6-aa00-12704dc69103', 'b72cd008-8249-49be-9ef4-00383c586f79', NULL, 'page_break', '', 9, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:10.935617+00:00', false, 9, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('e486ac7c-9781-4d3f-b172-7fff9670e0a8', 'b72cd008-8249-49be-9ef4-00383c586f79', '538385e0-b455-4667-ac08-58a8c610e4ad', 'multiple_choice', '<h2>Self-Development</h2><p><strong>Definition</strong>: Self-Development encompasses identification of weaknesses and positive action to overcome identified weaknesses, continuing to build one''s strengths, being self-aware of actions and how they impact others, transferring formal and informal training/development back to one''s daily job, and mastering all aspects of management, not just functional expertise.</p><h3><em>Please select your rating for [name] for this dimension.</em></h3><p></p>', 10, '[{"id": "anchor-1767556260378-0", "name": "Below Expectations", "value": 1, "practice": false}, {"id": "anchor-1767556260378-1", "name": "Slightly Below Expectations", "value": 2, "practice": false}, {"id": "anchor-1767556260378-2", "name": "Meets Expectations", "value": 3, "practice": false}, {"id": "anchor-1767556260378-3", "name": "Slightly Exceeds Expectations", "value": 4, "practice": false}, {"id": "anchor-1767556260378-4", "name": "Exceeds Expectations", "value": 5, "practice": false}]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:10.987627+00:00', false, 10, '[]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('4732540c-b3bc-4352-ba02-960cc4e38b86', 'b72cd008-8249-49be-9ef4-00383c586f79', '538385e0-b455-4667-ac08-58a8c610e4ad', 'text_input', '<p><strong>Developmental Comments for Self-Development:</strong></p>', 11, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.043455+00:00', false, 11, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('13ced703-a7ed-497a-81aa-5ea9220264a7', 'b72cd008-8249-49be-9ef4-00383c586f79', NULL, 'page_break', '', 12, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.096585+00:00', false, 12, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('a631997d-e404-4539-a43e-8e701ca1812d', 'b72cd008-8249-49be-9ef4-00383c586f79', 'b7b50624-5ebf-45e0-918c-4707d4216ceb', 'multiple_choice', '<h2>Performance Management</h2><p><strong>Definition</strong>: Performance Management is defined as the ability to consistently lead and develop individuals and teams, set goals, create&nbsp;and implement&nbsp;a valued rewards structure, consistently hold&nbsp;individuals and teams accountable in an effective and positive manner, and provide the necessary information in a clear and actionable manner.</p><h3><em>Please select your rating for [name] for this dimension.</em></h3><p></p>', 13, '[{"id": "anchor-1767556337079-0", "name": "Below Expectations", "value": 1, "practice": false}, {"id": "anchor-1767556337079-1", "name": "Slightly Below Expectations", "value": 2, "practice": false}, {"id": "anchor-1767556337079-2", "name": "Meets Expectations", "value": 3, "practice": false}, {"id": "anchor-1767556337079-3", "name": "Slightly Exceeds Expectations", "value": 4, "practice": false}, {"id": "anchor-1767556337079-4", "name": "Exceeds Expectations", "value": 5, "practice": false}]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.152413+00:00', false, 13, '[]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('f178b118-7aa2-454b-b12b-fb64fd1acfeb', 'b72cd008-8249-49be-9ef4-00383c586f79', 'b7b50624-5ebf-45e0-918c-4707d4216ceb', 'text_input', '<p><strong>Developmental Comments for Performance Management:</strong></p>', 14, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.206882+00:00', false, 14, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('b001c010-a057-4006-ac56-f98ae67ca018', 'b72cd008-8249-49be-9ef4-00383c586f79', NULL, 'page_break', '', 15, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.262897+00:00', false, 15, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('17b2ee76-44a7-4ef2-8ef9-44a6bea2432f', 'b72cd008-8249-49be-9ef4-00383c586f79', 'ac1edb09-46c8-403e-b2a9-4948a4652967', 'multiple_choice', '<h2>Business Mindset</h2><p><strong>Definition</strong>: Business Mindset encompasses having a clear and complete focus on the organization as a sustainable/growing business, seeing and implementing the entire vision of the organization, inclusive of internal and external stakeholders, and linking departmental/unit operations to all business indicators (i.e., labor costs, customer satisfaction, quality), and how departmental/unit metrics truly impact the entire business.</p><h3><em>Please select your rating for [name] for this dimension.</em></h3><p></p>', 16, '[{"id": "anchor-1767556615127-0", "name": "Below Expectations", "value": 1, "practice": false}, {"id": "anchor-1767556615127-1", "name": "Slightly Below Expectations", "value": 2, "practice": false}, {"id": "anchor-1767556615127-2", "name": "Meets Expectations", "value": 3, "practice": false}, {"id": "anchor-1767556615127-3", "name": "Slightly Exceeds Expectations", "value": 4, "practice": false}, {"id": "anchor-1767556615127-4", "name": "Exceeds Expectations", "value": 5, "practice": false}]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.321119+00:00', false, 16, '[]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('0ab79bac-ace3-4092-967c-a07a2248c2b1', 'b72cd008-8249-49be-9ef4-00383c586f79', 'ac1edb09-46c8-403e-b2a9-4948a4652967', 'text_input', '<p><strong>Developmental Comments for Business Mindset:</strong></p>', 17, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.380494+00:00', false, 17, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('1b765f19-2260-4cc2-b3fb-8a76668e1482', 'b72cd008-8249-49be-9ef4-00383c586f79', NULL, 'page_break', '', 18, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.433434+00:00', false, 18, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('661efc1e-9e6a-4cc3-835c-64610708b30a', 'b72cd008-8249-49be-9ef4-00383c586f79', '3f146659-1598-4ecd-aab5-dd196ca94dde', 'multiple_choice', '<h2>Customer Focus</h2><p><strong>Definition</strong>: Customer Focus encompasses anticipating, communicating, and addressing current &amp; emerging customer needs; actively listening to customers’ needs, goals, and expectations; developing, reinforcing and strengthening customer service culture; adjusting priorities to meet multiple and often competing customers’ demands, seeks and incorporates feedback from customers to improve performance, and follows up with customers to insure needs have been met satisfactory. This competency applies to both internal and external customers.​</p><h3><em>Please select your rating for [name] for this dimension.</em></h3><p></p>', 19, '[{"id": "anchor-1767556699448-0", "name": "Below Expectations", "value": 1, "practice": false}, {"id": "anchor-1767556699448-1", "name": "Slightly Below Expectations", "value": 2, "practice": false}, {"id": "anchor-1767556699448-2", "name": "Meets Expectations", "value": 3, "practice": false}, {"id": "anchor-1767556699448-3", "name": "Slightly Exceeds Expectations", "value": 4, "practice": false}, {"id": "anchor-1767556699448-4", "name": "Exceeds Expectations", "value": 5, "practice": false}]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.495789+00:00', false, 19, '[]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('69d8930f-4724-4061-91d1-9662d60001a5', 'b72cd008-8249-49be-9ef4-00383c586f79', '3f146659-1598-4ecd-aab5-dd196ca94dde', 'text_input', '<p><strong>Developmental Comments for Customer Focus:</strong></p>', 20, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.561658+00:00', false, 20, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('94ef3f70-1cbc-4a70-bb6e-439f8eafe432', 'b72cd008-8249-49be-9ef4-00383c586f79', NULL, 'page_break', '', 21, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.623309+00:00', false, 21, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('739db0a9-7304-47e3-9d79-4639ac345a27', 'b72cd008-8249-49be-9ef4-00383c586f79', '823f32bf-3339-482f-b3a9-2b6a1e028ced', 'multiple_choice', '<h2>Communication</h2><p><strong>Definition</strong>: Communication is defined as clearly, concisely, and accurately conveying necessary information when it is needed while avoiding sharing unfounded information/rumors. Communication also encompasses providing rationale behind messages/decisions; seeking to understand others views and priorities, adjusting communication styles to audience, and encouraging open and candid dialogue from others.​</p><h3><em>Please select your rating for [name] for this dimension.</em></h3><p></p>', 22, '[{"id": "anchor-1767556779094-0", "name": "Below Expectations", "value": 1, "practice": false}, {"id": "anchor-1767556779094-1", "name": "Slightly Below Expectations", "value": 2, "practice": false}, {"id": "anchor-1767556779094-2", "name": "Meets Expectations", "value": 3, "practice": false}, {"id": "anchor-1767556779094-3", "name": "Slightly Exceeds Expectations", "value": 4, "practice": false}, {"id": "anchor-1767556779094-4", "name": "Exceeds Expectations", "value": 5, "practice": false}]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.6796+00:00', false, 22, '[]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('c6797f0a-ba29-4f38-a200-b09f239c4369', 'b72cd008-8249-49be-9ef4-00383c586f79', '823f32bf-3339-482f-b3a9-2b6a1e028ced', 'text_input', '<p><strong>Developmental Comments for Communication:</strong></p>', 23, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.733772+00:00', false, 23, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('f15e178f-3646-4247-a064-40c57fc1f01d', 'b72cd008-8249-49be-9ef4-00383c586f79', NULL, 'page_break', '', 24, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.790946+00:00', false, 24, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('5397a60c-fd13-4762-927c-b4477738926f', 'b72cd008-8249-49be-9ef4-00383c586f79', '8d4ec265-a010-4ab2-bba9-53d3555bdaea', 'multiple_choice', '<h2>Ethics &amp; Integrity</h2><p><strong>Definition</strong>: Ethics &amp; Integrity competency is defined as instilling mutual trust &amp; confidence, building and reinforcing inclusivity for all, accepting/owning responsibility for mistakes and successes, creating a culture that fosters high standards of integrity &amp; ethics, behaves in a fair, just, and ethical manner to all stakeholders, shows consistency in principles, values, and behaviors, and demonstrates a sense of responsibility and commitment to the organization, colleagues, and all customers.​</p><h3><em>Please select your rating for [name] for this dimension.</em></h3><p></p>', 25, '[{"id": "anchor-1767556874533-0", "name": "Below Expectations", "value": 1, "practice": false}, {"id": "anchor-1767556874533-1", "name": "Slightly Below Expectations", "value": 2, "practice": false}, {"id": "anchor-1767556874533-2", "name": "Meets Expectations", "value": 3, "practice": false}, {"id": "anchor-1767556874533-3", "name": "Slightly Exceeds Expectations", "value": 4, "practice": false}, {"id": "anchor-1767556874533-4", "name": "Exceeds Expectations", "value": 5, "practice": false}]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.847277+00:00', false, 25, '[]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('37aa1d4b-aa3d-424f-94f4-c305e74f2ec3', 'b72cd008-8249-49be-9ef4-00383c586f79', '8d4ec265-a010-4ab2-bba9-53d3555bdaea', 'text_input', '<p><strong>Developmental Comments for Ethics &amp; Integrity:&nbsp;</strong></p>', 26, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.906716+00:00', false, 26, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('13835f8c-3b99-49cf-9904-8f2d2758140a', 'b72cd008-8249-49be-9ef4-00383c586f79', NULL, 'instructions', '{"text":"<h2><strong><em>INSTRUCTIONS - PLEASE READ CAREFULLY</em></strong></h2><p><strong>​</strong>The dimensions below are designed to provide developmental feedback to strengthen leadership. &nbsp;Please use the scales below to indicate your ratings for <strong>[name] </strong>on the following performance dimensions. &nbsp;</p><p>First read the dimension and then review all of the descriptors for a given dimension. These are example descriptions to help you better understand dimension levels.&nbsp;</p><p>Each dimension ranges from ‘below expectations’ to ‘exceeds expectations''. You will notice that under ‘below expectations’, ‘meets expectations’, and ‘exceeds expectations’ there are several statements that define performance at these respective levels. The ratings for ‘slightly below expectations’ and ‘slightly exceeds expectations’ do not have descriptions but would be a mix of the descriptions immediately to the left and right. Please select the rating that is most accurate for <strong>[name]</strong> based upon your experience with<strong> [name]</strong>.&nbsp;</p><p>Third, you are highly encouraged to include examples of observed or documented behaviors to aid in the developmental feedback process. Please provide additional detail to help <strong>[name]</strong> develop as a leader. Only provide information that you have observed - do not report stories or interpretations or things that might be considered ''gossip''.&nbsp;</p>","next":"Continue"}', 27, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:11.959129+00:00', false, 27, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('2aad8e1b-8768-4db4-a563-48661c4c1778', 'b72cd008-8249-49be-9ef4-00383c586f79', NULL, 'page_break', '', 28, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:12.014983+00:00', false, 28, NULL, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO fields (id, assessment_id, dimension_id, type, content, "order", anchors, created_at, updated_at, practice, number, insights_table, required)
VALUES ('c7198941-48c1-4834-a1d6-24daaaa13ff2', 'b72cd008-8249-49be-9ef4-00383c586f79', NULL, 'page_break', '', 29, '[]'::jsonb, '2026-03-20T21:36:20.870421+00:00', '2026-03-22T13:04:12.071425+00:00', false, 29, NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Industry benchmarks (based on staging score averages + ~0.5 offset)
-- Uses first available industry as a generic benchmark source
INSERT INTO benchmarks (dimension_id, industry_id, value, created_at, updated_at)
SELECT d.id, (SELECT id FROM industries LIMIT 1), b.value, now(), now()
FROM (VALUES
  ('fe9ef691-ed12-4b99-a60c-03b173db3196'::uuid, 3.1),  -- Creative Problem Solving
  ('d89c92eb-ffe6-4bce-bdad-557b9e7cb418'::uuid, 4.2),  -- Leadership Adaptability
  ('f63d9448-53b6-400c-af16-06c5591b4618'::uuid, 4.1),  -- Collaboration
  ('538385e0-b455-4667-ac08-58a8c610e4ad'::uuid, 3.6),  -- Self-Development
  ('b7b50624-5ebf-45e0-918c-4707d4216ceb'::uuid, 3.3),  -- Performance Management
  ('ac1edb09-46c8-403e-b2a9-4948a4652967'::uuid, 3.5),  -- Business Mindset
  ('3f146659-1598-4ecd-aab5-dd196ca94dde'::uuid, 3.8),  -- Customer Focus
  ('823f32bf-3339-482f-b3a9-2b6a1e028ced'::uuid, 3.5),  -- Communication
  ('8d4ec265-a010-4ab2-bba9-53d3555bdaea'::uuid, 3.6)   -- Ethics & Integrity
) AS b(dim_id, value)
JOIN dimensions d ON d.id = b.dim_id
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify
SELECT 'Assessment: ' || title FROM assessments WHERE id = 'b72cd008-8249-49be-9ef4-00383c586f79';
SELECT 'Dimensions: ' || count(*)::text FROM dimensions WHERE assessment_id = 'b72cd008-8249-49be-9ef4-00383c586f79';
SELECT 'Fields: ' || count(*)::text FROM fields WHERE assessment_id = 'b72cd008-8249-49be-9ef4-00383c586f79';
