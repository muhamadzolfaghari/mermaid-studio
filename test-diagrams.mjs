import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!doctype html><html><body><div id="container"></div></body></html>`, {
  url: 'http://localhost:4173/mermaid-studio/',
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
global.Element = dom.window.Element;
global.HTMLElement = dom.window.HTMLElement;
global.SVGElement = dom.window.SVGElement;
global.XMLSerializer = dom.window.XMLSerializer;

// Dynamically import Mermaid and templates
const { default: mermaid } = await import('mermaid');
const { DIAGRAM_TEMPLATES } = await import('./src/components/templates.js');
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Mermaid Studio Verification Suite...\n');

mermaid.initialize({
  startOnLoad: false,
  suppressErrorRendering: true,
  securityLevel: 'loose',
  theme: 'dark',
});

let passed = 0;
let failed = 0;

// Test Group 1: Starter Diagram Templates
console.log('--- Test Group 1: Starter Diagram Templates ---');
for (const tpl of DIAGRAM_TEMPLATES) {
  try {
    const valid = await mermaid.parse(tpl.code);
    if (valid !== false) {
      console.log(`✅ [Template] "${tpl.title}" (${tpl.kind}) passed syntax check.`);
      passed++;
    } else {
      console.error(`❌ [Template] "${tpl.title}" returned false.`);
      failed++;
    }
  } catch (err) {
    console.error(`❌ [Template] "${tpl.title}" threw error:`, err.message);
    failed++;
  }
}

// Test Group 2: Tourism reference .mmd files in public/reference-mmd/
console.log('\n--- Test Group 2: Reference .mmd Files ---');
const refDir = './public/reference-mmd';
const refFiles = fs.readdirSync(refDir).filter(f => f.endsWith('.mmd'));
for (const file of refFiles) {
  const content = fs.readFileSync(path.join(refDir, file), 'utf8');
  try {
    const valid = await mermaid.parse(content);
    if (valid !== false) {
      console.log(`✅ [Reference .mmd] "${file}" passed syntax check.`);
      passed++;
    } else {
      console.error(`❌ [Reference .mmd] "${file}" returned false.`);
      failed++;
    }
  } catch (err) {
    console.error(`❌ [Reference .mmd] "${file}" threw error:`, err.message);
    failed++;
  }
}

// Test Group 3: Syntax Error Detection
console.log('\n--- Test Group 3: Syntax Error Detection ---');
const invalidCode = 'flowchart TD\n  A --> [Missing bracket\n  ??? Invalid syntax';
try {
  await mermaid.parse(invalidCode);
  console.error('❌ Expected syntax error but parse succeeded!');
  failed++;
} catch (err) {
  console.log('✅ Syntax error was properly detected and caught:', err.message.split('\n')[0]);
  passed++;
}

// Test Group 4: Inspect production bundle dist/
console.log('\n--- Test Group 4: Production Dist Inspection ---');
if (!fs.existsSync('./dist/index.html')) {
  console.log('⚠️ ./dist/index.html does not exist yet. Please run `npm run build` before testing dist output.');
} else {
  const distHtml = fs.readFileSync('./dist/index.html', 'utf8');
  const checks = [
    { name: 'Base path in JS script', check: distHtml.includes('/mermaid-studio/assets/index-') },
    { name: 'Base path in CSS link', check: distHtml.includes('/mermaid-studio/assets/index-') },
    { name: 'Base path in favicon', check: distHtml.includes('/mermaid-studio/favicon.svg') },
    { name: 'Stage canvas element present', check: distHtml.includes('id="stage"') },
    { name: 'Diagram container present', check: distHtml.includes('id="diagram-container"') },
    { name: 'Code editor present', check: distHtml.includes('id="codeEditor"') },
    { name: 'SEO title present', check: distHtml.includes('<title>Mermaid Studio') },
    { name: 'SEO meta description present', check: distHtml.includes('name="description"') },
  ];

  for (const c of checks) {
    if (c.check) {
      console.log(`✅ [Dist Check] ${c.name}`);
      passed++;
    } else {
      console.error(`❌ [Dist Check] FAILED: ${c.name}`);
      failed++;
    }
  }
}

// Test Group 5: Design System & CVA Components
console.log('\n--- Test Group 5: Design System & CVA Components ---');
try {
  const {
    cn,
    buttonVariants,
    badgeVariants,
    cardVariants,
    inputVariants,
    createButton,
    createBadge,
  } = await import('./src/components/ui/index.js');

  // 1. cn() utility tests
  const mergedClass = cn('p-4 text-sm', false && 'hidden', 'text-white', 'p-2');
  if (mergedClass.includes('p-2') && !mergedClass.includes('p-4') && mergedClass.includes('text-white')) {
    console.log('✅ [Design System] cn() successfully handles conditionals and resolves Tailwind conflicts.');
    passed++;
  } else {
    console.error('❌ [Design System] cn() failed conflict resolution:', mergedClass);
    failed++;
  }

  // 2. buttonVariants tests
  const defaultBtn = buttonVariants();
  const aiBtn = buttonVariants({ variant: 'ai', size: 'sm' });
  const destructiveBtn = buttonVariants({ variant: 'destructive', size: 'lg' });

  if (
    defaultBtn.includes('bg-primary') &&
    aiBtn.includes('bg-gradient-to-r') &&
    aiBtn.includes('h-8') &&
    destructiveBtn.includes('bg-destructive') &&
    destructiveBtn.includes('h-10')
  ) {
    console.log('✅ [Design System] buttonVariants correctly generates CVA variant & size classes.');
    passed++;
  } else {
    console.error('❌ [Design System] buttonVariants generated unexpected classes.');
    failed++;
  }

  // 3. badgeVariants tests
  const aiBadge = badgeVariants({ variant: 'ai', size: 'sm' });
  if (aiBadge.includes('border-indigo-500/40') && aiBadge.includes('text-[10px]')) {
    console.log('✅ [Design System] badgeVariants correctly generates CVA badge classes.');
    passed++;
  } else {
    console.error('❌ [Design System] badgeVariants failed:', aiBadge);
    failed++;
  }

  // 4. inputVariants tests
  const monoInput = inputVariants({ variant: 'mono' });
  if (monoInput.includes('font-mono') && monoInput.includes('border-border')) {
    console.log('✅ [Design System] inputVariants correctly generates CVA input classes.');
    passed++;
  } else {
    console.error('❌ [Design System] inputVariants failed:', monoInput);
    failed++;
  }

  // 5. cardVariants tests
  const interactiveCard = cardVariants({ variant: 'interactive', padding: 'sm' });
  if (interactiveCard.includes('hover:border-primary/50') && interactiveCard.includes('p-3')) {
    console.log('✅ [Design System] cardVariants correctly generates CVA card classes.');
    passed++;
  } else {
    console.error('❌ [Design System] cardVariants failed:', interactiveCard);
    failed++;
  }

  // 6. createButton helper test
  let clicked = false;
  const domBtn = createButton({
    variant: 'ai',
    size: 'sm',
    className: 'custom-extra-class',
    content: '<span>Test AI</span>',
    onClick: () => { clicked = true; },
  });

  domBtn.click();
  if (
    domBtn instanceof dom.window.HTMLButtonElement &&
    domBtn.className.includes('custom-extra-class') &&
    domBtn.className.includes('bg-gradient-to-r') &&
    clicked === true
  ) {
    console.log('✅ [Design System] createButton() creates reactive, fully-styled DOM elements.');
    passed++;
  } else {
    console.error('❌ [Design System] createButton() failed DOM test.');
    failed++;
  }

  // 7. createBadge helper test
  const domBadge = createBadge({
    variant: 'success',
    text: 'Active',
  });
  if (
    domBadge instanceof dom.window.HTMLElement &&
    domBadge.textContent === 'Active' &&
    domBadge.className.includes('bg-emerald-500/10')
  ) {
    console.log('✅ [Design System] createBadge() creates valid styled badge DOM elements.');
    passed++;
  } else {
    console.error('❌ [Design System] createBadge() failed DOM test.');
    failed++;
  }
} catch (err) {
  console.error('❌ [Design System] Component imports or test failed:', err);
  failed++;
}

console.log(`\n========================================`);
console.log(`Total checks passed: ${passed}, failed: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}

