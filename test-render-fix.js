#!/usr/bin/env node

// Quick test to verify the render fix is working
import { renderTextReport } from './dist/core/render.js';

const mockResult = {
  drift_score: 30,
  raw_score: 30,
  token_waste_pct: 45.9,
  events: [
    {
      type: 'repetition_cluster',
      severity: 2,
      confidence: 0.90,
      evidence: { msg_idxs: [0, 2, 4], snippets: [] },
      summary: 'Test repetition'
    }
  ],
  should_have_been_memory: [
    {
      fact_key: 'pref:language',
      fact_value: 'English',
      msg_idx: 0,
      confidence: 1.0
    }
  ],
  timings_ms: {
    extract_facts: 2331.94,
    repetition: 0,
    session_reset: 0,
    contradictions: 0,
    pref_forgotten: 0,
    drift_detection: 1234.56  // This should be displayed!
  }
};

console.log('=== Testing Render Fix ===\n');
const output = renderTextReport(mockResult);
console.log(output);
console.log('\n=== Check above ===');
console.log('✓ Should show "drift_detection: 1234.56"');
console.log('✗ Should NOT show "repetition: 0" etc.');
