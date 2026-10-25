// Renders the app icon from build/icon.svg (and build/icon-small.svg for tiny sizes):
//   build/icon.png   512×512, used for the window icon and by electron-builder
//   build/icon.ico   multi-size Windows icon (16–256 px, PNG-compressed entries)
// Run after editing the SVGs:  npm run icons
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'

const dir = new URL('../build/', import.meta.url)
const large = readFileSync(new URL('icon.svg', dir), 'utf-8')
const small = readFileSync(new URL('icon-small.svg', dir), 'utf-8')

const render = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size }, shapeRendering: 2 }).render().asPng()

writeFileSync(new URL('icon.png', dir), render(large, 512))

// ICO: 6-byte header, one 16-byte directory entry per image, then the PNG data.
const sizes = [16, 24, 32, 48, 64, 128, 256]
const images = sizes.map((s) => render(s <= 32 ? small : large, s))
const header = Buffer.alloc(6 + 16 * sizes.length)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)
let offset = header.length
sizes.forEach((s, i) => {
  const e = 6 + i * 16
  header.writeUInt8(s >= 256 ? 0 : s, e)
  header.writeUInt8(s >= 256 ? 0 : s, e + 1)
  header.writeUInt8(0, e + 2)
  header.writeUInt8(0, e + 3)
  header.writeUInt16LE(1, e + 4)
  header.writeUInt16LE(32, e + 6)
  header.writeUInt32LE(images[i].length, e + 8)
  header.writeUInt32LE(offset, e + 12)
  offset += images[i].length
})
writeFileSync(new URL('icon.ico', dir), Buffer.concat([header, ...images]))
console.log(`Wrote build/icon.png and build/icon.ico (${sizes.join(', ')} px)`)
