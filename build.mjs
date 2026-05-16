/**
 * build.mjs — Assembles public/index.html from src/ source files.
 *
 * Usage:
 *   node build.mjs
 *   npm run build
 *
 * Structure:
 *   src/template.html   — HTML skeleton with <!-- BUILD:CSS --> and <!-- BUILD:JS --> placeholders
 *   src/styles.css      — all CSS extracted from the original <style> block
 *   src/js/01-config.js through 22-pipeline.js — JS split by responsibility
 *
 * The build concatenates all JS files in order into a single <script> block,
 * and inlines the CSS into a <style> block. No ES module bundler needed.
 * All variables remain global — just split for readability and maintainability.
 */

import { readFileSync, writeFileSync } from 'fs';

const JS_FILES = [
  'src/js/01-config.js',
  'src/js/02-cache.js',
  'src/js/03-utils.js',
  'src/js/04-api.js',
  'src/js/05-fallbacks.js',
  'src/js/06-ui.js',
  'src/js/07-render-01.js',
  'src/js/08-render-02.js',
  'src/js/09-render-03.js',
  'src/js/10-render-04.js',
  'src/js/11-render-05.js',
  'src/js/12-render-06.js',
  'src/js/13-render-07.js',      // legacy _legacyRunAgent7 (superseded by 26)
  'src/js/14-render-08.js',
  'src/js/15-render-09.js',
  'src/js/16-render-10.js',
  'src/js/17-render-11.js',
  'src/js/18-render-12.js',
  'src/js/19-render-13.js',
  'src/js/20-render-14.js',
  'src/js/21-render-15.js',
  'src/js/22-pipeline.js',
  'src/js/23-drilldown.js',
  'src/js/24-agent-09-parts.js', // Business Plan sub-calls (4 parts)
  'src/js/25-agent-10-parts.js', // Project Plan sub-calls (3 parts)
  'src/js/26-agent-fin-subs.js', // Financial Feasibility (replaces runAgent7)
  'src/js/27-agent-buildvsbuy.js', // Build vs Buy (Agent 16)
  'src/js/28-agent-sources.js',   // Sources & Citations (Agent 17)
  'src/js/29-export.js',          // Per-agent export (PDF/Word/Excel/Slides) + industry comparison
  'src/js/30-session.js',         // Auto-save, session restore & shareable URL
  'src/js/31-full-export.js',     // Full pipeline PDF export (all 17 agents)
  'src/js/32-phases.js',          // Phase selection & input validation
  'src/js/33-streaming.js',       // Streaming responses (claudeStream + claudeStreamJSON)
  'src/js/34-history.js',         // Session history — last 5 runs
  'src/js/35-compare-zip.js',     // ZIP comparison mode (two markets side by side)
  'src/js/36-demo-data.js',       // Dedicated demo data (replaces fragile prompt parsing)
  'src/js/37-runs.js',            // Persistent named pipeline runs
  'src/js/38-dag.js',             // Agent dependency graph visualization
  'src/js/39-scenario.js',        // Interactive financial scenario builder
  'src/js/40-local-guide.js',     // Ollama/local setup guide + data freshness helpers
  'src/js/41-agent-stress-guard.js', // Stress-test guard: safeClaudeJSON + A13/A14 overrides
  'src/js/43-real-data.js',      // Real data pipeline: prefetchRealData + buildRealDataCtx
  'src/js/44-verifier.js',       // Post-pipeline accuracy verifier vs live government sources
];

const CSS_FILES = ['src/styles.css'];

// Read template HTML
let html = readFileSync('src/template.html', 'utf8');

// Inline CSS
const css = CSS_FILES.map(f => readFileSync(f, 'utf8')).join('\n');
// Use a function as the replacement to avoid special $-patterns in String.replace
html = html.replace('<!-- BUILD:CSS -->', () => `<style>\n${css}\n</style>`);

// Inline JS
const js = JS_FILES.map(f => readFileSync(f, 'utf8')).join('\n\n');
html = html.replace('<!-- BUILD:JS -->', () => `<script>\n${js}\n</script>`);

writeFileSync('public/index.html', html);
console.log(`Built public/index.html (${Buffer.byteLength(html)} bytes, ${html.split('\n').length} lines)`);
