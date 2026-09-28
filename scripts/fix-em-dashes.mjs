/**
 * fix-em-dashes.mjs
 *
 * PPF style rule: the em dash (U+2014 "-") is not allowed anywhere on the site.
 * This walks the source tree and replaces every em dash with a plain hyphen.
 *
 * Usage:
 *   node scripts/fix-em-dashes.mjs           # apply changes
 *   node scripts/fix-em-dashes.mjs --dry     # report only
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join, extname, relative } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = join(__dirname, '..')

const DRY = process.argv.includes('--dry')
const EM = '\u2014'

const ROOTS = ['.']
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.md', '.json', '.css', '.sql'])
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.expo', 'android', 'ios', '.vscode'])
// This script documents the character it removes, so it must skip itself.
const SKIP_FILES = new Set(['fix-em-dashes.mjs', 'fix-em-dashes-db.js'])

let filesChanged = 0
let totalReplacements = 0
const report = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) { walk(full); continue }
    if (!EXTS.has(extname(entry))) continue
    if (SKIP_FILES.has(entry)) continue

    const content = readFileSync(full, 'utf8')
    if (!content.includes(EM)) continue

    const count = content.split(EM).length - 1
    totalReplacements += count
    filesChanged += 1
    report.push(`  ${String(count).padStart(3)}  ${relative(root, full)}`)

    if (!DRY) {
      writeFileSync(full, content.split(EM).join('-'), 'utf8')
    }
  }
}

for (const r of ROOTS) {
  try { walk(join(root, r)) } catch { /* missing root, skip */ }
}

console.log(report.join('\n'))
console.log(`\n${DRY ? '[DRY RUN] ' : ''}${filesChanged} file(s), ${totalReplacements} em dash(es) ${DRY ? 'found' : 'replaced'}.`)
