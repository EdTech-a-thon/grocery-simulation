// Reading and recombining the layered product masters.
//
// A master in art/masters holds every layer a product needs: the object itself,
// the blank printed panel, and the two alternative things that can be printed on
// that panel — the name brand's face and the shop's own CG Value face. The two
// shipped files are cut from that one drawing, so the name brand and its CG twin
// are guaranteed to share a silhouette: they are literally the same paths.

/** The layer ids a master may contain, in the order they must be drawn. */
export const layerOrder = ['item', 'label', 'brand', 'brand-cg']

/** Which layers make up each shipped file. */
const variants = {
  name: ['item', 'label', 'brand'],
  cg: ['item', 'label', 'brand-cg'],
}

/**
 * The master's opening `<svg ...>` tag, and its direct-child `<g id="...">`
 * layers. Nested groups inside a layer are left alone — only the top level is
 * split apart — so depth is counted rather than pattern-matched.
 */
export function readLayers(svg) {
  const openingTag = svg.match(/<svg[\s\S]*?>/)
  if (!openingTag) throw new Error('no <svg> tag')

  const body = svg.slice(openingTag.index + openingTag[0].length, svg.lastIndexOf('</svg'))
  const layers = {}
  const loose = []

  let cursor = 0
  while (cursor < body.length) {
    const open = body.indexOf('<g', cursor)
    if (open === -1) {
      loose.push(body.slice(cursor))
      break
    }

    loose.push(body.slice(cursor, open))

    // Walk forward to this group's own closing tag, counting the groups opened
    // inside it so a nested <g> does not end the layer early.
    let depth = 0
    let scan = open
    let end = -1
    while (scan < body.length) {
      const nextOpen = body.indexOf('<g', scan + 1)
      const nextClose = body.indexOf('</g', scan + 1)
      if (nextClose === -1) break
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1
        scan = nextOpen
      } else if (depth > 0) {
        depth -= 1
        scan = nextClose
      } else {
        end = body.indexOf('>', nextClose) + 1
        break
      }
    }
    if (end === -1) throw new Error('unclosed <g>')

    const group = body.slice(open, end)
    const id = (group.match(/^<g[^>]*\sid="([^"]+)"/) || [])[1]
    if (id) layers[id] = group
    else loose.push(group)

    cursor = end
  }

  return { openingTag: openingTag[0], layers, loose: loose.join('').trim() }
}

/** True when a master carries the printed-panel layers, i.e. it is packaged. */
export function isPackaged(layers) {
  return Boolean(layers['label'] && layers['brand'] && layers['brand-cg'])
}

/**
 * One shipped file cut from a master. `variant` is 'name' or 'cg'; a bare
 * unpackaged product has no CG twin and composes identically either way.
 */
export function compose(svg, variant) {
  const { layers } = readLayers(svg)
  const wanted = isPackaged(layers) ? variants[variant] : ['item']
  const drawn = wanted.filter((id) => layers[id]).map((id) => layers[id])

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 220">' +
    drawn.join('') +
    '</svg>\n'
  )
}
