import fs from 'fs'

const p = 'lib/contentStore.ts'
let s = fs.readFileSync(p, 'utf8')

const startMarker = '      merge: (persistedState: any, currentState: any) => {'
const endMarker = '      onRehydrateStorage:'

const i = s.indexOf(startMarker)
const j = s.indexOf(endMarker)
if (i < 0 || j < 0) {
  console.error('markers not found', i, j)
  process.exit(1)
}

const mergeBody = s.slice(i + startMarker.length, j).trim()
// mergeBody should end with `return merged` and `}`

const header = `export function mergePersistedSiteConfig(persistedState: any, currentState: ContentStore): any {\n`

const footer = `\n}\n\n`

const insertNeedle = 'export const useContentStore = create<ContentStore>>()('
const insertPoint = s.indexOf(insertNeedle)
if (insertPoint < 0) {
  console.error('insert point not found, sample:', s.slice(s.indexOf('export const useContentStore'), s.indexOf('export const useContentStore') + 80))
  process.exit(1)
}

const newS =
  s.slice(0, insertPoint) +
  header +
  mergeBody +
  footer +
  s.slice(insertPoint)

const replaced = newS.replace(startMarker + mergeBody + '\n', '      merge: mergePersistedSiteConfig,\n')

if (replaced === newS) {
  console.error('replace failed')
  process.exit(1)
}

fs.writeFileSync(p, replaced)
console.log('OK')
