import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const V1_JS = [
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
  'src/js/13-render-07.js',
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
  'src/js/24-agent-09-parts.js',
  'src/js/25-agent-10-parts.js',
  'src/js/26-agent-fin-subs.js',
  'src/js/27-agent-buildvsbuy.js',
  'src/js/28-agent-sources.js',
  'src/js/29-export.js',
  'src/js/30-session.js',
  'src/js/31-full-export.js',
  'src/js/32-phases.js',
  'src/js/33-streaming.js',
  'src/js/34-history.js',
  'src/js/35-compare-zip.js',
  'src/js/36-demo-data.js',
  'src/js/37-runs.js',
  'src/js/38-dag.js',
  'src/js/39-scenario.js',
  'src/js/40-local-guide.js',
  'src/js/41-agent-stress-guard.js',
  'src/js/43-real-data.js',      // Real data pipeline: prefetchRealData + buildRealDataCtx
  'src/js/44-verifier.js',       // Post-pipeline accuracy verifier vs live government sources
].map(f => join(ROOT, f));

const V2_JS = [
  'v2/src/js/v2-01-state.js',
  'v2/src/js/v2-02-landing.js',
  'v2/src/js/v2-03-wizard.js',
  'v2/src/js/v2-04-copilot.js',
  'v2/src/js/v2-05-score.js',
  'v2/src/js/v2-06-dashboard.js',
  'v2/src/js/v2-07-portfolio.js',
  'v2/src/js/v2-08-investor.js',
  'v2/src/js/v2-09-execution.js',
  'v2/src/js/v2-10-features.js',
  'v2/src/js/v2-11-advanced.js',
  'v2/src/js/v2-12-drilldown.js',
  'v2/src/js/v2-13-enhancements.js',
  'v2/src/js/v2-14-missing.js',
  'v2/src/js/v2-15-demo-showcase.js',
  'v2/src/js/v2-16-free-apis.js',
].map(f => join(ROOT, f));

const CSS_FILES = [
  join(ROOT, 'src/styles.css'),
  join(ROOT, 'v2/src/styles-v2.css'),
];

let html = readFileSync(join(ROOT, 'v2/src/template-v2.html'), 'utf8');
const css = CSS_FILES.map(f => readFileSync(f, 'utf8')).join('\n');
html = html.replace('<!-- BUILD:CSS -->', () => `<style>\n${css}\n</style>`);

// Inject full v1 template body into #v1-shell for pixel-perfect Classic View
const v1Template = readFileSync(join(ROOT, 'src/template.html'), 'utf8');
const v1BodyMatch = v1Template.match(/<body>([\s\S]*?)<\/body>/i);
const v1Body = v1BodyMatch ? v1BodyMatch[1].trim() : '';
html = html.replace('<!-- BUILD:V1 -->', () => v1Body);

const js = [...V1_JS, ...V2_JS].map(f => readFileSync(f, 'utf8')).join('\n\n');
html = html.replace('<!-- BUILD:JS -->', () => `<script>\n${js}\n</script>`);

mkdirSync(join(ROOT, 'v2/public'), { recursive: true });
writeFileSync(join(ROOT, 'v2/public/index.html'), html);
console.log(`Built v2/public/index.html (${Buffer.byteLength(html)} bytes, ${html.split('\n').length} lines)`);
