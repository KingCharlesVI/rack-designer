import { describe, expect, it } from 'vitest'
import { buildCatalog } from '../library'
import { validatePack } from '../model/packs'
import { portColor, portColorClass } from '../model/ports'
import type { ComponentDef, PortGroup } from '../model/types'
import { groupBounds, layoutPorts, RAIL_W, U_PX } from './geometry'

const sw = (groups: PortGroup[], category: ComponentDef['category'] = 'switch'): ComponentDef => ({
  id: `t-${Math.random()}`,
  manufacturer: 'Acme',
  model: 'Test',
  category,
  uHeight: 1,
  fullDepth: true,
  ports: groups
})

const layout = (c: ComponentDef, face: 'front' | 'rear' = 'front') => layoutPorts(c, face, RAIL_W, c.uHeight * U_PX, false)
const pos = (boxes: ReturnType<typeof layout>, id: string) => boxes.find((b) => b.port.id === id)!

describe('port arrangement', () => {
  it('numbers switch ports down columns, other devices across rows', () => {
    const g: PortGroup = { id: 'p', type: 'rj45', count: 4, face: 'front', rows: 2 }
    const s = layout(sw([g]))
    expect(pos(s, 'p-2').x).toBeCloseTo(pos(s, 'p-1').x)
    expect(pos(s, 'p-2').y).toBeGreaterThan(pos(s, 'p-1').y)
    const panel = layout(sw([g], 'patch-panel'))
    expect(pos(panel, 'p-2').y).toBeCloseTo(pos(panel, 'p-1').y)
    expect(pos(panel, 'p-2').x).toBeGreaterThan(pos(panel, 'p-1').x)
    const forced = layout(sw([{ ...g, order: 'rows' }]))
    expect(pos(forced, 'p-2').y).toBeCloseTo(pos(forced, 'p-1').y)
  })

  it('honours explicit rows', () => {
    const boxes = layout(sw([{ id: 'p', type: 'rj45', count: 24, face: 'front', rows: 3 }]))
    expect(new Set(boxes.map((b) => b.y.toFixed(2))).size).toBe(3)
  })

  it('adds a gap between blocks', () => {
    const boxes = layout(sw([{ id: 'p', type: 'rj45', count: 24, face: 'front', rows: 2, blockEvery: 6 }]))
    // Ports 11/12 are the 6th column, 13/14 the 7th (first of the second block).
    const step = pos(boxes, 'p-3').x - pos(boxes, 'p-1').x
    const jump = pos(boxes, 'p-13').x - pos(boxes, 'p-11').x
    expect(jump).toBeGreaterThan(step * 1.5)
  })

  it('keeps manually placed groups in place and flows the others around them', () => {
    const groups: PortGroup[] = [
      { id: 'a', type: 'rj45', count: 24, face: 'front', rows: 2 },
      { id: 'b', type: 'sfp+', count: 4, face: 'front' },
      { id: 'c', type: 'rj45-mgmt', count: 1, face: 'front' }
    ]
    const moved = groups.map((g) => (g.id === 'b' ? { ...g, x: 80 } : g))
    const bounds = groupBounds(layout(sw(moved)))
    const [a, b, c] = ['a', 'b', 'c'].map((id) => bounds.get(id)!)
    expect(b.x).toBeCloseTo(RAIL_W * 0.8, 0)
    // The management port fits in the gap between the RJ45 block and the moved group.
    expect(c.x).toBeGreaterThan(a.x + a.w)
    expect(c.x + c.w).toBeLessThan(b.x)
    // Nothing overlaps and everything stays on the faceplate.
    for (const [p, q] of [[a, b], [a, c], [b, c]]) expect(p.x + p.w <= q.x || q.x + q.w <= p.x).toBe(true)
    for (const r of [a, b, c]) expect(r.x + r.w).toBeLessThanOrEqual(RAIL_W)
  })

  it('skips automatic groups past a placed group when they would collide', () => {
    const bounds = groupBounds(
      layout(sw([{ id: 'a', type: 'rj45', count: 8, face: 'front', x: 26 }, { id: 'b', type: 'rj45', count: 8, face: 'front' }]))
    )
    expect(bounds.get('b')!.x).toBeGreaterThan(bounds.get('a')!.x + bounds.get('a')!.w)
  })

  it('aligns groups vertically', () => {
    const c: ComponentDef = { ...sw([{ id: 'a', type: 'rj45', count: 4, face: 'front', align: 'top' }, { id: 'b', type: 'rj45', count: 4, face: 'front', align: 'bottom' }]), uHeight: 2 }
    const bounds = groupBounds(layout(c))
    expect(bounds.get('a')!.y).toBeLessThan(5)
    expect(bounds.get('b')!.y + bounds.get('b')!.h).toBeGreaterThan(2 * U_PX - 5)
  })

  it('keeps every port of real 48-port switches on the faceplate', () => {
    const catalog = buildCatalog()
    for (const id of ['cisco-catalyst-c9300-48p', 'cisco-nexus-n9k-c93180yc-fx', 'generic-switch-48x-25g-sfp28-plus-8x-100g']) {
      const c = catalog.byId.get(id)!
      for (const b of layout(c)) {
        expect(b.x).toBeGreaterThanOrEqual(0)
        expect(b.x + b.w).toBeLessThanOrEqual(RAIL_W)
        expect(b.y + b.h).toBeLessThanOrEqual(U_PX)
      }
    }
  })
})

describe('port colour codes', () => {
  it('distinguishes PoE, copper, management and power ports', () => {
    expect(portColorClass('rj45-poe').id).toBe('poe')
    expect(portColorClass('rj45').id).toBe('copper')
    expect(portColorClass('rj45-mgmt').id).toBe('mgmt')
    expect(portColorClass('sfp28').id).toBe('sfp')
    expect(portColorClass('osfp').id).toBe('qsfp')
    expect(portColorClass('lc').id).toBe('fiber')
    expect(portColorClass('c13').id).toBe('power-out')
    expect(portColorClass('c14').id).toBe('power-in')
    expect(portColorClass('poe').color).not.toBe(portColorClass('rj45').color)
  })

  it('lets a group override its colour', () => {
    expect(portColor({ type: 'rj45', color: '#123456' })).toBe('#123456')
    expect(portColor({ type: 'rj45' })).toBe(portColorClass('rj45').color)
  })

  it('keeps layout fields in packs and drops invalid ones', () => {
    const r = validatePack({
      format: 'rack-designer-library',
      version: 2,
      name: 'x',
      components: [
        {
          id: 'c', manufacturer: 'A', model: 'B', category: 'switch', uHeight: 1, fullDepth: true,
          ports: [
            { id: 'ok', type: 'rj45-poe', count: 48, face: 'front', rows: 2, order: 'columns', blockEvery: 12, x: 25, align: 'top', color: '#ff8800' },
            { id: 'bad', type: 'rj45', count: 4, face: 'front', order: 'zigzag', blockEvery: -1, x: 400, align: 'left', color: 'red' }
          ]
        }
      ]
    })
    const [ok, bad] = r.pack!.components[0].ports
    expect(ok).toMatchObject({ rows: 2, order: 'columns', blockEvery: 12, x: 25, align: 'top', color: '#ff8800' })
    expect(bad.order ?? bad.blockEvery ?? bad.x ?? bad.align ?? bad.color).toBeUndefined()
  })
})
