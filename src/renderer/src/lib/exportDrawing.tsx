import { renderToStaticMarkup } from 'react-dom/server'
import { Drawing, FONT, legendEntries, legendHeight, SvgDefs, SvgLegend } from '../drawing/Drawing'
import { layoutProject } from '../drawing/geometry'
import type { Face, Project } from '../model/types'

/** Render front and rear elevations, one above the other, as a standalone SVG document. */
export function elevationSvg(project: Project, opts: { faces?: Face[]; showCables?: boolean } = {}): { svg: string; width: number; height: number } {
  const faces = opts.faces ?? ['front', 'rear']
  const layout = layoutProject(project)
  const pad = 30
  const titleH = 50
  const sectionH = layout.height + 40
  const width = Math.max(layout.width + pad * 2, 420)
  const legend = legendEntries(project)
  const legendH = legendHeight(legend.length, width - pad * 2)
  const height = titleH + sectionH * faces.length + (legendH ? legendH + 10 : 0) + pad
  const date = new Date().toLocaleDateString()
  const body = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgDefs />
      <rect width={width} height={height} fill="#15171b" />
      <text x={pad} y={32} fontFamily={FONT} fontSize={18} fontWeight={600} fill="#f3f4f6">
        {project.name}
      </text>
      <text x={width - pad} y={32} fontFamily={FONT} fontSize={11} fill="#9ca3af" textAnchor="end">
        {`${project.racks.length} rack(s) · ${project.devices.length} device(s) · ${date}`}
      </text>
      {faces.map((face, i) => (
        <g key={face} transform={`translate(${pad}, ${titleH + i * sectionH})`}>
          <text x={0} y={14} fontFamily={FONT} fontSize={12} fontWeight={700} fill="#9ca3af" letterSpacing={2}>
            {face === 'front' ? 'FRONT ELEVATION' : 'REAR ELEVATION'}
          </text>
          <g transform="translate(0, 24)">
            <Drawing project={project} layout={layout} face={face} showCables={opts.showCables ?? true} />
          </g>
        </g>
      ))}
      {legendH > 0 && <SvgLegend entries={legend} x={pad} y={titleH + sectionH * faces.length + 10} width={width - pad * 2} />}
    </svg>
  )
  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\n${body}`, width, height }
}

export async function svgToPng(svg: string, width: number, height: number, scale = 2): Promise<Uint8Array> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not render the drawing'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('PNG encoding failed')
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    URL.revokeObjectURL(url)
  }
}
