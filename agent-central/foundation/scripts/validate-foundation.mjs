#!/usr/bin/env node
/**
 * Complementary validation for agent-central/foundation JSON only.
 * Provenance: cursor/agent-central-foundation-7328 (does not replace PR #5 central-store tests).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

const index = load('data/index.json');
const submissions = load('data/work-submissions.json');

const agentIds = index.central.agents.map((a) => a.id);
const dupAgents = agentIds.filter((id, i) => agentIds.indexOf(id) !== i);
if (dupAgents.length) {
  console.error('Duplicate agent ids:', dupAgents);
  process.exit(1);
}

const subIds = submissions.submissions.map((s) => s.id);
const dupSubs = subIds.filter((id, i) => subIds.indexOf(id) !== i);
if (dupSubs.length) {
  console.error('Duplicate submission ids:', dupSubs);
  process.exit(1);
}

const notion = index.central.notionCanons?.links;
const required = ['projects', 'workSubmissions', 'fleetWiki'];
for (const key of required) {
  if (!notion?.[key]?.startsWith('https://app.notion.com/p/')) {
    console.error('Missing or invalid Notion canon:', key);
    process.exit(1);
  }
}

console.log(
  JSON.stringify({
    ok: true,
    agents: agentIds.length,
    submissions: subIds.length,
    notionCanonKeys: required,
  })
);
