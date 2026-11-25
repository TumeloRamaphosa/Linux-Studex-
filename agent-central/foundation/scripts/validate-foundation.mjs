#!/usr/bin/env node
/**
 * Schema-oriented validation for agent-central/foundation JSON.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const EVIDENCE = new Set(['historical', 'unverified', 'blocked', 'tested']);
const RUNTIME_BINDING = new Set(['in-process-demo', 'index-only', 'unverified-external']);
const RECORD_KIND = new Set(['example', 'proposed', 'accepted']);
const LANES = new Set(['meat', 'coffee', 'stud-bot-vm-workplace', 'gaming', 'platform-engineering']);

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const index = load('data/index.json');
const submissions = load('data/work-submissions.json');

if (index.schemaVersion !== '1.0.0') fail('index schemaVersion must be 1.0.0');
if (submissions.schemaVersion !== '1.0.0') fail('work-submissions schemaVersion must be 1.0.0');

const agentIds = [];
for (const a of index.central.agents) {
  if (agentIds.includes(a.id)) fail(`Duplicate agent id: ${a.id}`);
  agentIds.push(a.id);
  if ('vmAgent' in a) fail(`Deprecated vmAgent on ${a.id}`);
  if (!RUNTIME_BINDING.has(a.runtimeBinding)) fail(`Invalid runtimeBinding on ${a.id}`);
  if (a.runtimeHealth !== 'unverified') fail(`runtimeHealth must be unverified on ${a.id}`);
  if (a.provisionedVm !== false) fail(`provisionedVm must be false on ${a.id}`);
  if (!EVIDENCE.has(a.status)) fail(`Invalid status on ${a.id}`);
  if (a.softwareTestEvidence && a.softwareTestEvidence.status === 'tested' && a.runtimeHealth !== 'unverified') {
    fail(`softwareTestEvidence cannot imply runtimeHealth on ${a.id}`);
  }
  if (a.dataRoomPath && !a.dataRoomPath.includes('.example.') && !a.dataRoomPath.endsWith('robusca-chief-of-staff.json')) {
    fail(`dataRoomPath must be .example. or approved agent file: ${a.id}`);
  }
}

for (const lane of index.central.businessLanes) {
  if (!LANES.has(lane.id)) fail(`Invalid lane ${lane.id}`);
  if (!EVIDENCE.has(lane.status)) fail(`Invalid lane status ${lane.id}`);
  if (lane.status === 'tested') fail(`Lane ${lane.id} must not use tested without runtime proof`);
}

const notion = index.central.notionCanons?.links;
for (const key of ['projects', 'workSubmissions', 'fleetWiki', 'businessPlanEvidenceIndex']) {
  if (!notion?.[key]?.startsWith('https://app.notion.com/p/')) fail(`Invalid Notion canon: ${key}`);
}
if (notion.businessPlanEvidenceIndex !== 'https://app.notion.com/p/4123ef073992811a9c3dc01e9222ca71') {
  fail('Robusca business plan index URL mismatch after curated-context audit');
}

const subIds = [];
for (const s of submissions.submissions) {
  if (subIds.includes(s.id)) fail(`Duplicate submission ${s.id}`);
  subIds.push(s.id);
  if (!RECORD_KIND.has(s.recordKind)) fail(`recordKind required on ${s.id}`);
  if (s.recordKind !== 'accepted' && s.approvalGate?.state === 'approved') {
    fail(`Non-accepted record cannot be approved: ${s.id}`);
  }
  if (s.status === 'tested' && s.recordKind === 'example') fail(`Example cannot be status tested: ${s.id}`);
}

console.log(
  JSON.stringify({
    ok: true,
    agents: agentIds.length,
    submissions: subIds.length,
    notionCanonKeys: Object.keys(notion),
    robuscaBusinessPlanIndexAudited: true,
  })
);
