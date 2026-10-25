import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildCatalog } from '../library'
import { buildExample } from '../model/example'
import { parseProject, serializeProject } from '../model/serialize'
import { elevationSvg } from './exportDrawing'

const example = buildExample(buildCatalog())

describe('drawing export', () => {
  it('renders front and rear elevations as SVG', () => {
    const { svg, width, height } = elevationSvg(example)
    expect(svg.startsWith('<?xml')).toBe(true)
    expect(svg).toContain('FRONT ELEVATION')
    expect(svg).toContain('REAR ELEVATION')
    expect(svg).toContain('leaf-a')
    expect(width).toBeGreaterThan(500)
    expect(height).toBeGreaterThan(500)
  })

  // Run with WRITE_EXAMPLE=1 to refresh examples/compute-pod.rack.
  it.skipIf(!process.env.WRITE_EXAMPLE)('writes the example design file', () => {
    const text = serializeProject(example)
    expect(parseProject(text).warnings).toEqual([])
    writeFileSync('examples/compute-pod.rack', text)
    writeFileSync('examples/compute-pod-elevations.svg', elevationSvg(example).svg)
  })
})
