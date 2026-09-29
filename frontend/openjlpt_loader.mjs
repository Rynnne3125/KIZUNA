import fs from 'fs';
import path from 'path';
import vm from 'vm';

const BASE_URL = 'https://openjlpt.com';
const CACHE_DIR = path.resolve('./.openjlpt_cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const loadedModules = new Map();

export async function fetchAsset(relPath) {
  const safeName = relPath.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cachePath = path.join(CACHE_DIR, safeName);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, 'utf8');
  const url = relPath.startsWith('http') ? relPath : `${BASE_URL}/${relPath.replace(/^\//, '')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  fs.writeFileSync(cachePath, text, 'utf8');
  return text;
}

export async function loadChunk(relPath) {
  const cleanName = path.basename(relPath);
  if (loadedModules.has(cleanName)) return loadedModules.get(cleanName);
  const code = await fetchAsset(`assets/${cleanName}`);
  const importRegex = /import\s*(?:(\{[^}]*\})|(\*\s*as\s*\w+)|(\w+))?\s*(?:,\s*(\{[^}]*\}))?\s*from\s*["']\.\/([^"']+)["']\s*;?/g;
  const deps = [];
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    deps.push({ named: match[1] || match[4], def: match[3], target: match[5] });
  }
  let preamble = '';
  for (const d of deps) {
    const isDataMod = /michinori|minna|nikki|kanji|grammar|vocab|Tango|choukai|library|ontap|skm|n3Grammar|examRouter|mimikara/i.test(d.target);
    let modObj = isDataMod ? await loadChunk(d.target).catch(() => ({})) : {};
    const modVar = `__dep_${Math.random().toString(36).slice(2, 9)}`;
    globalThis[modVar] = modObj;
    if (d.named) {
      const bindings = d.named.replace(/^\{|\}$/g, '').trim().split(',').map(s => s.trim()).filter(Boolean);
      for (const b of bindings) {
        const [orig, local] = b.split(/\s+as\s+/).map(s => s.trim());
        preamble += `const ${local || orig} = globalThis.${modVar}[${JSON.stringify(orig)}] ?? __uProxy;\n`;
      }
    }
    if (d.def) preamble += `const ${d.def} = globalThis.${modVar}.default ?? __uProxy;\n`;
  }
  let transformed = code.replace(importRegex, '').replace(/import\s*["'][^"']+["']\s*;?/g, '');
  const exportedMap = [];
  transformed = transformed.replace(/export\s*\{([^}]+)\}\s*;?/g, (_, list) => {
    for (const p of list.split(',').map(s => s.trim()).filter(Boolean)) {
      const [local, alias] = p.split(/\s+as\s+/).map(s => s.trim());
      exportedMap.push({ local, alias: alias || local });
    }
    return '';
  });
  const retObj = [
    ...exportedMap.map(e => `${JSON.stringify(e.alias)}: typeof ${e.local} !== 'undefined' ? ${e.local} : undefined`),
    `__internal_t: typeof t !== 'undefined' ? t : undefined`,
    `__internal_n: typeof n !== 'undefined' ? n : undefined`,
    `__internal_i: typeof i !== 'undefined' ? i : undefined`,
    `__internal_h: typeof h !== 'undefined' ? h : undefined`,
    `__internal_e: typeof e !== 'undefined' ? e : undefined`
  ].join(', ');
  const createUProxy = () => {
    const p = new Proxy(function(){ return p; }, {
      get(_, prop) {
        if (prop === Symbol.toPrimitive) return () => '';
        if (prop === 'forEach' || prop === 'map' || prop === 'filter') return () => [];
        return p;
      },
      apply() { return p; }
    });
    return p;
  };
  const res = vm.runInNewContext(`(function(){\n${preamble}\n${transformed}\nreturn { ${retObj} };\n})()`, {
    globalThis, __uProxy: createUProxy(), console, Object, Array, String, Number, Boolean, Math, Date, RegExp, JSON, Map, Set, Promise,
    window: {}, document: {}, navigator: {}, localStorage: { getItem: () => null, setItem: () => {} }
  }, { timeout: 15000 });
  loadedModules.set(cleanName, res);
  return res;
}
