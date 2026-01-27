import { InspectResult } from './types.js';

/**
 * Render inspection result as human-readable text
 */
export function renderTextReport(result: InspectResult): string {
  const lines: string[] = [];

  // Header
  lines.push('=== Memograph Inspect Report ===');
  lines.push(`Drift Score: ${result.drift_score}/100 (raw: ${result.raw_score})`);
  lines.push(`Token Waste: ${result.token_waste_pct}%`);
  lines.push('');

  // Critical Events
  if (result.events.length > 0) {
    lines.push('Critical Events:');
    for (const event of result.events) {
      const idxList = event.evidence.msg_idxs.join(',');
      lines.push(
        `- [${event.type}] sev=${event.severity} conf=${event.confidence.toFixed(2)} idx=${idxList}`
      );
      lines.push(`  ${event.summary}`);
    }
  } else {
    lines.push('Critical Events: None detected');
  }
  lines.push('');

  // Should-have-been memory
  if (result.should_have_been_memory.length > 0) {
    lines.push('Should-have-been memory (top):');
    for (const fact of result.should_have_been_memory) {
      lines.push(
        `- ${fact.fact_key}="${fact.fact_value}" @${fact.msg_idx} (conf ${fact.confidence.toFixed(2)})`
      );
    }
  } else {
    lines.push('Should-have-been memory: None extracted');
  }
  lines.push('');

  // Timings
  lines.push('Timings (ms):');
  lines.push(`- extract_facts: ${result.timings_ms.extract_facts}`);
  
  if (result.timings_ms.drift_detection !== undefined) {
    lines.push(`- drift_detection: ${result.timings_ms.drift_detection}`);
  } else {
    // Legacy/Heuristic mode timings
    lines.push(`- repetition: ${result.timings_ms.repetition}`);
    lines.push(`- session_reset: ${result.timings_ms.session_reset}`);
    lines.push(`- contradictions: ${result.timings_ms.contradictions}`);
    lines.push(`- pref_forgotten: ${result.timings_ms.pref_forgotten}`);
  }

  return lines.join('\n');
}

/**
 * Render inspection result as JSON
 */
export function renderJsonReport(result: InspectResult): string {
  return JSON.stringify(result, null, 2);
}
