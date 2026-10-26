#!/usr/bin/env node
/**
 * export_context.js — versión adaptada a Duel Binder (Deber 4)
 * Consolida el código fuente del proyecto en un único Markdown para usarlo
 * como contexto en IAs. Sin dependencias externas.
 *
 * Qué cambia respecto a la versión genérica (busca "PROYECTO" en este archivo):
 *  - PROJECT_BRIEF: resumen del proyecto y del deber al inicio del Markdown,
 *    para que la IA entienda el objetivo antes de leer el código.
 *  - PRIORITY: orden de lectura (config → capa de query → API → hooks → pantallas).
 *  - .env.example sí se incluye (no tiene secretos); .env nunca.
 *
 * Uso:
 *   node export_context.js                 → genera contexto_proyecto.md
 *   node export_context.js --out ctx.md    → nombre de salida personalizado
 *   node export_context.js --max-kb 500    → límite de tamaño por archivo
 *   node export_context.js --dry           → solo muestra qué incluiría
 */
const fs = require('fs');
const path = require('path');

// ───────────────────────── CLI ─────────────────────────
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const ROOT_DIR = __dirname;
const OUTPUT_FILE = getArg('--out', 'contexto_proyecto.md');
const MAX_FILE_KB = Number(getArg('--max-kb', 300));
const DRY_RUN = args.includes('--dry');
const SELF = path.basename(__filename);

// ─────────────────────── Helpers de reglas ───────────────────────
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Coincide con una carpeta de ese nombre en cualquier nivel */
const anyLevel = (name) => new RegExp(`(^|/)${esc(name)}$`);
/** Coincide solo con una carpeta en la raíz del proyecto */
const rootOnly = (name) => new RegExp(`^${esc(name)}$`);
const toPosix = (p) => p.split(path.sep).join('/');
const matchAny = (rules, value) => rules.some((r) => r.test(value));

// ─────────────────────── PROYECTO: resumen para la IA ───────────────────────
const PROJECT_BRIEF = `
**Duel Binder** — Deber 4 de Programación Móvil (PUCE).

- **Stack:** Expo SDK 57 · React Native (New Architecture) · Expo Router (rutas en \`src/app/\`) · TypeScript estricto.
- **Datos:** API pública YGOPRODeck (solo lectura, rate limit 20 req/s, imágenes cacheadas en disco con expo-image) + MockAPI recurso \`binder\` (datos propios).
- **Estado:** TanStack Query v5 con PersistQueryClientProvider + AsyncStorage, mutaciones offline con setMutationDefaults, onlineManager con NetInfo y resumePausedMutations en el onSuccess del provider.
- **Reglas del deber:** queryKeys jerárquicas en \`src/query/queryKeys.ts\`; staleTime/gcTime distintos por fuente; gcTime >= maxAge del persister; mutaciones de creación y edición con mutationKey e invalidación; cambios pendientes visibles en pantalla; diseño no genérico (tema binder/playmat de Yu-Gi-Oh).
- **Convenciones:** alias \`@/\` → \`src/\`; colores y fuentes solo desde \`src/theme/tokens.ts\`; logs con \`logger\` de \`src/lib/logger.ts\` (no console.log suelto); instalar paquetes con \`npx expo install\`.
`.trim();

// PROYECTO: orden de lectura en el Markdown (lo que no coincide va al final, alfabético)
const PRIORITY = [
  /^(README|AGENTS)\.md$/,
  /^(package|app|eas|tsconfig)\.json$/,
  /^\.env\.example$/,
  /^src\/config\//,
  /^src\/query\//,
  /^src\/api\//,
  /^src\/hooks\//,
  /^src\/lib\//,
  /^src\/app\//,
  /^src\/components\//,
  /^src\/theme\//,
];

// ─────────────────────── Configuración ───────────────────────
// Prioridad de evaluación:  never  >  forceInclude  >  ignoreFiles  >  allowedExtensions
const CONFIG = {
  // Carpetas que no se recorren (se evalúan contra la ruta relativa POSIX)
  ignoreDirs: [
    // Dependencias y control de versiones
    anyLevel('node_modules'), anyLevel('.git'), anyLevel('Pods'),
    // Prebuild nativo (solo en raíz: evita falsos positivos tipo src/components/ios)
    rootOnly('android'), rootOnly('ios'),
    anyLevel('.gradle'), anyLevel('.cxx'),
    // Expo / bundlers / builds
    anyLevel('.expo'), anyLevel('.expo-shared'), anyLevel('web-build'),
    anyLevel('dist'), anyLevel('build'), anyLevel('coverage'),
    anyLevel('.turbo'), anyLevel('.cache'), anyLevel('.tamagui'),
    // Editores / herramientas
    anyLevel('.vscode'), anyLevel('.idea'), anyLevel('.opencode'), rootOnly('.claude'),
    // Multimedia
    anyLevel('assets'), rootOnly('public'),
    // Tests (quítalo si quieres que la IA vea tus tests)
    anyLevel('__tests__'),
  ],

  // NUNCA se incluyen, ni aunque coincidan con forceInclude (se evalúan contra el nombre)
  never: [
    /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/,
    /^\.env(?!\.example$)/, // .env, .env.local, .env.production… (PROYECTO: .env.example sí entra)
    /\.(keystore|jks|mobileprovision|p8|p12|pem|key|cer|der)$/i,
    // Archivos con claves que suelen vivir en proyectos Expo/Firebase/EAS
    /^google-services\.json$/i,
    /^GoogleService-Info\.plist$/i,
    /^credentials\.json$/i, // credenciales locales de EAS (contiene passwords del keystore)
    /^service-account.*\.json$/i,
  ],

  // Archivos ignorados aunque tengan extensión permitida (contra el nombre)
  ignoreFiles: [
    /\.map$/, // *.js.map, *.d.ts.map
    /\.min\.js$/,
    /\.tsbuildinfo$/,
    /^export_context\.generico\.js$/, // PROYECTO: copia genérica en docs/, no es código de la app
  ],

  allowedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md'],

  // Siempre incluidos (contra la ruta relativa POSIX). Saltan el filtro de extensión y de tamaño.
  forceInclude: [
    // Configuración raíz crítica
    /^app\.json$/,
    /^app\.config\.(ts|js|mjs|cjs)$/,
    /^tsconfig(\.[\w-]+)?\.json$/,
    /^metro\.config\.(js|cjs|mjs|ts)$/,
    /^babel\.config\.(js|cjs|mjs)$/,
    /^eas\.json$/,
    /^package\.json$/,
    /^expo-env\.d\.ts$/,
    // PROYECTO: documentación y plantilla de entorno
    /^(README|AGENTS)\.md$/,
    /^\.env\.example$/,
    // Configs opcionales de UI / lint
    /^(tamagui|tailwind|eslint|prettier)\.config\.(ts|js|mjs|cjs)$/,
    /^\.(eslintrc|prettierrc)(\.(json|js|cjs))?$/,
    /^(nativewind-env\.d\.ts|global\.css)$/,
    // Rutas de Expo Router, con o sin src/
    /^(src\/)?app\/.+\.(tsx?|jsx?)$/,
  ],

  // Configs que se verifican al final del proceso
  expectedConfigs: [
    { label: 'app.json / app.config.*', patterns: [/^app\.json$/, /^app\.config\./], required: true },
    { label: 'package.json', patterns: [/^package\.json$/], required: true },
    { label: 'tsconfig.json', patterns: [/^tsconfig\.json$/], required: true },
    { label: 'eas.json', patterns: [/^eas\.json$/], required: true }, // PROYECTO: el APK sale de EAS
    { label: 'src/query/queryKeys.ts', patterns: [/^src\/query\/queryKeys\.ts$/], required: true },
    { label: 'metro.config.*', patterns: [/^metro\.config\./], required: false },
    { label: 'babel.config.*', patterns: [/^babel\.config\./], required: false },
  ],
};

const LANG_BY_EXT = {
  '.ts': 'ts', '.tsx': 'tsx', '.js': 'js', '.jsx': 'jsx', '.mjs': 'js', '.cjs': 'js',
  '.json': 'json', '.md': 'md', '.css': 'css',
};

// ─────────────────────── Recorrido ───────────────────────
const outputRel = toPosix(path.relative(ROOT_DIR, path.resolve(ROOT_DIR, OUTPUT_FILE)));
const skipped = {}; // razón → [rutas]
const skip = (reason, rel) => (skipped[reason] ||= []).push(rel);

function classify(rel, name) {
  if (rel === outputRel || rel === SELF) return { ok: false, reason: 'salida/script' };
  if (matchAny(CONFIG.never, name)) return { ok: false, reason: 'secreto o lockfile' };
  const forced = matchAny(CONFIG.forceInclude, rel);
  if (!forced) {
    if (matchAny(CONFIG.ignoreFiles, name)) return { ok: false, reason: 'ignorado por regla' };
    if (!CONFIG.allowedExtensions.includes(path.extname(name).toLowerCase())) {
      return { ok: false, reason: 'extensión no permitida' };
    }
  }
  return { ok: true, forced };
}

const isBinary = (buf) => buf.subarray(0, 8000).includes(0);

function walk(absDir, files) {
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch (err) {
    console.warn(`⚠️  No se pudo leer ${absDir}: ${err.message}`);
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const abs = path.join(absDir, entry.name);
    const rel = toPosix(path.relative(ROOT_DIR, abs));

    if (entry.isSymbolicLink()) { skip('symlink', rel); continue; }

    if (entry.isDirectory()) {
      if (!matchAny(CONFIG.ignoreDirs, rel)) walk(abs, files);
      continue;
    }
    if (!entry.isFile()) continue;

    const decision = classify(rel, entry.name);
    if (!decision.ok) { skip(decision.reason, rel); continue; }

    const { size } = fs.statSync(abs);
    if (!decision.forced && size > MAX_FILE_KB * 1024) {
      skip(`mayor a ${MAX_FILE_KB} KB`, rel);
      continue;
    }

    const buf = fs.readFileSync(abs);
    if (isBinary(buf)) { skip('binario', rel); continue; }

    files.push({ rel, content: buf.toString('utf8'), size });
  }
}

// ─────────────────────── Render Markdown ───────────────────────
function buildTree(paths) {
  const root = {};
  for (const p of paths) {
    let node = root;
    for (const part of p.split('/')) node = node[part] ||= {};
  }
  const lines = [];
  const render = (node, prefix) => {
    const keys = Object.keys(node).sort((a, b) => {
      const aDir = Object.keys(node[a]).length > 0;
      const bDir = Object.keys(node[b]).length > 0;
      return aDir === bDir ? a.localeCompare(b) : aDir ? -1 : 1; // carpetas primero
    });
    keys.forEach((key, i) => {
      const last = i === keys.length - 1;
      const isDir = Object.keys(node[key]).length > 0;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${key}${isDir ? '/' : ''}`);
      if (isDir) render(node[key], prefix + (last ? '    ' : '│   '));
    });
  };
  render(root, '');
  return lines.join('\n');
}

/** Fence más largo que cualquier secuencia de backticks del contenido, para no romper el Markdown */
function fenceFor(content) {
  const runs = content.match(/`+/g) || [];
  const longest = runs.reduce((max, r) => Math.max(max, r.length), 0);
  return '`'.repeat(Math.max(3, longest + 1));
}

function render(files) {
  const totalChars = files.reduce((n, f) => n + f.content.length, 0);
  const parts = [
    '# Contexto Completo del Proyecto',
    '',
    `- **Proyecto:** ${path.basename(ROOT_DIR)}`,
    `- **Generado:** ${new Date().toISOString()}`,
    `- **Archivos:** ${files.length}`,
    `- **Código:** ~${Math.round(totalChars / 4).toLocaleString('es')} tokens (sin contar este encabezado)`,
    '',
    '## Resumen del proyecto',
    '',
    PROJECT_BRIEF,
    '',
    '## Estructura',
    '',
    '```',
    buildTree(files.map((f) => f.rel)),
    '```',
    '',
    '## Archivos',
  ];
  for (const f of files) {
    const fence = fenceFor(f.content);
    const lang = LANG_BY_EXT[path.extname(f.rel).toLowerCase()] || '';
    parts.push('', `### \`${f.rel}\``, '', `${fence}${lang}`, f.content.replace(/\s+$/, ''), fence);
  }
  return parts.join('\n') + '\n';
}

const rank = (rel) => {
  const i = PRIORITY.findIndex((r) => r.test(rel));
  return i === -1 ? PRIORITY.length : i;
};

// ─────────────────────── Main ───────────────────────
function main() {
  console.log('⏳ Recopilando código...');
  const files = [];
  walk(ROOT_DIR, files);
  files.sort((a, b) => rank(a.rel) - rank(b.rel) || a.rel.localeCompare(b.rel));

  // Verificación de configs críticas
  const relPaths = files.map((f) => f.rel);
  for (const cfg of CONFIG.expectedConfigs) {
    const found = relPaths.some((p) => matchAny(cfg.patterns, p));
    if (!found && cfg.required) console.warn(`⚠️  Falta config crítica: ${cfg.label}`);
    if (!found && !cfg.required) console.log(`ℹ️  No encontrado (opcional): ${cfg.label}`);
  }

  // Resumen de omitidos (sin listar node_modules, que ni se recorre)
  for (const [reason, list] of Object.entries(skipped)) {
    const preview = list.slice(0, 5).join(', ') + (list.length > 5 ? `, … (+${list.length - 5})` : '');
    console.log(`   omitidos [${reason}]: ${preview}`);
  }

  if (DRY_RUN) {
    console.log(`\n🔍 Dry run: se incluirían ${files.length} archivos:`);
    files.forEach((f) => console.log(`   ${f.rel}`));
    return;
  }

  const md = render(files);
  fs.writeFileSync(path.resolve(ROOT_DIR, OUTPUT_FILE), md, 'utf8');
  const tokens = Math.round(md.length / 4).toLocaleString('es');
  console.log(`✅ ${files.length} archivos consolidados en ${OUTPUT_FILE} (~${tokens} tokens)`);
}

main();
