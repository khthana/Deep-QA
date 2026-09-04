import { marks } from '../../lib/bands'

/**
 * The flow between outcomes and the work that assesses them, in SVG and by
 * hand — #39.
 *
 * ## Why not a chart library
 *
 * `RadarChart.js` gives the three reasons and they hold here: a charting
 * package would be the largest dependency the application carries, its Thai
 * labels would be its problem rather than ours, and a canvas is a picture that
 * neither a screen reader nor the browser seam can read. Every band below is a
 * `<path>` with a title, every node is a labelled rectangle, and the tables
 * beside the diagram carry every number it draws.
 *
 * The inherited screen used `@nivo/sankey` for this, which is where the
 * dependency question came from in the first place.
 *
 * ## A band is as wide as the marks it carries
 *
 * Not as wide as the per cent. `activity_clo_mapping` holds both, and only one
 * of them can be compared across two Activities: a ten-mark exercise giving
 * all of itself to one outcome reads `weight = 100`, exactly as a hundred-mark
 * project doing the same does. Drawn on per cent, the two would come out the
 * same width, and *which outcome carries the marking load* — the question this
 * screen exists to answer — would be unanswerable from it.
 *
 * So the width of every band, and the height of every node, is marks. The per
 * cent is in the table underneath, where it is a number to read rather than a
 * length to compare.
 *
 * ## A node with nothing attached still has a body
 *
 * An outcome nothing assesses and a piece of work attributed to no outcome are
 * both drawn: a bar of the minimum height with no band leaving it. A node
 * scaled honestly to nought marks would be nought pixels tall, which is the
 * one drawing that hides the case the diagram is for. They are also named in
 * words under the diagram rather than left to be spotted, for the reason #38
 * lists the outcomes needing attention instead of leaving them to the colours.
 */

/**
 * The palette the outcomes are drawn in, and their bands with them.
 *
 * Not `RadarChart`'s `SERIES`: that is four entries because four lines is what
 * a radar can carry, and every entry there pairs a colour with a dash pattern
 * so that colour is never the only difference. Here there is no line to dash
 * and there are nine outcomes in the seed alone, so this is a longer list of
 * hues chosen to stay apart from one another.
 *
 * **Colour carries nothing on this screen that is not also written down.** It
 * is here so that a band can be followed by eye from an outcome to the work
 * that assesses it; every band's own title says which two it joins, and the
 * detail table lists all of them in text.
 */
const OUTCOME_COLOURS = [
  '#0F2A60',
  '#B45309',
  '#0F766E',
  '#7E22CE',
  '#B91C1C',
  '#1D4ED8',
  '#4D7C0F',
  '#BE185D',
  '#0E7490',
  '#57534E',
]

export const colourOf = index => OUTCOME_COLOURS[index % OUTCOME_COLOURS.length]

const WIDTH = 880
const PAD = 14
/** Where each column's bar stands, and how wide the bar is. */
const LEFT_X = 100
const RIGHT_X = 560
const NODE_W = 12
/** The room the labels have either side, which is what decides where the bars stand. */
const LEFT_LABEL_END = LEFT_X - 8
const RIGHT_LABEL_START = RIGHT_X + NODE_W + 8

/** The height the taller column aims for, before its gaps are added. */
const BODY = 400
const GAP = 16
/** A node with no marks attached is still a node, and this is how tall. */
const MIN_NODE = 6
/** A band worth almost nothing is still a band, and this is how thick. */
const MIN_BAND = 1.5

/** How many characters of an Activity's name fit beside the diagram. */
const LABEL_CHARS = 30

const shorten = text =>
  text.length > LABEL_CHARS ? `${text.slice(0, LABEL_CHARS - 1)}…` : text

/**
 * How thick one band is drawn.
 *
 * Written once because it is read twice — a band is *stroked* at this width and
 * *stacked* at it inside the node it leaves — and the two have to be the same
 * number or the bars stop containing what comes out of them. Two copies of a
 * formula whose halves are computed a hundred lines apart is the kind of
 * duplication that shows up as a drawing very slightly wrong.
 */
const thicknessOf = (link, scale) => Math.max(MIN_BAND, link.marks * scale)

/**
 * One column of nodes, laid out top to bottom, with each node's bands stacked
 * inside it.
 *
 * The stacking order is the *other* column's order, which is what keeps the
 * bands from crossing more than the data forces them to: two outcomes assessed
 * by the same two Activities in the same order produce parallel bands rather
 * than a braid.
 */
function stackedColumn(nodes, linksOf, scale) {
  const laid = nodes.map(node => {
    const bands = linksOf(node).map(link => ({
      link,
      thickness: thicknessOf(link, scale),
    }))
    // The bar is exactly as tall as what is stacked in it, so a band can never
    // start outside the node it leaves.
    const height = bands.reduce((sum, band) => sum + band.thickness, 0)
    return { node, bands, height: bands.length === 0 ? MIN_NODE : height }
  })

  const total =
    laid.reduce((sum, one) => sum + one.height, 0) +
    GAP * Math.max(laid.length - 1, 0)
  return { laid, total }
}

/** Where each column starts, so that both are centred against the taller one. */
const offsetOf = (total, tallest) => PAD + (tallest - total) / 2

/**
 * A band, as a stroked curve rather than a filled shape.
 *
 * The thickness is the stroke width, which means the quantity the diagram is
 * *about* is a number in the DOM rather than a distance between two edges of a
 * polygon. A reader — a person with an inspector, or the browser seam — can
 * ask what a band was drawn at instead of inferring it from geometry, and a
 * band drawn at the wrong width cannot hide behind a correct title.
 */
const curve = (y0, y1) => {
  const x0 = LEFT_X + NODE_W
  const x1 = RIGHT_X
  const mid = (x0 + x1) / 2
  return `M ${x0} ${y0.toFixed(1)} C ${mid} ${y0.toFixed(1)}, ${mid} ${y1.toFixed(1)}, ${x1} ${y1.toFixed(1)}`
}

/**
 * @param {{clo_id: number, clo_number: string, marks: number, link_count: number}[]} clos
 * @param {{activity_id: number, activity_name: string, marks: number, link_count: number}[]} activities
 * @param {{activity_id: number, clo_id: number, weight: number, marks: number}[]} links
 */
export default function OutcomeActivityFlow({
  clos,
  activities,
  links,
  title,
}) {
  const cloIndex = new Map(clos.map((clo, index) => [clo.clo_id, index]))
  const activityIndex = new Map(
    activities.map((activity, index) => [activity.activity_id, index])
  )

  // One scale for both columns. Two — one per side — would let a band leave an
  // outcome at one width and arrive at an Activity at another, which is a
  // drawing that contradicts itself about the only quantity it carries.
  const attached = links.reduce((sum, link) => sum + link.marks, 0)
  const blanks = Math.max(
    clos.filter(clo => clo.link_count === 0).length,
    activities.filter(activity => activity.link_count === 0).length
  )
  const scale =
    attached > 0 ? Math.max(BODY - blanks * MIN_NODE, 1) / attached : 0

  const left = stackedColumn(
    clos,
    clo =>
      links
        .filter(link => link.clo_id === clo.clo_id)
        .sort(
          (a, b) =>
            activityIndex.get(a.activity_id) - activityIndex.get(b.activity_id)
        ),
    scale
  )
  const right = stackedColumn(
    activities,
    activity =>
      links
        .filter(link => link.activity_id === activity.activity_id)
        .sort((a, b) => cloIndex.get(a.clo_id) - cloIndex.get(b.clo_id)),
    scale
  )

  const tallest = Math.max(left.total, right.total)
  const height = tallest + PAD * 2

  // Where each band meets each side. Walked once per column and remembered, so
  // that the two ends of one band are read off the same layout the nodes were
  // drawn from.
  const ends = new Map()
  const place = (column, side) => {
    let y = offsetOf(column.total, tallest)
    const placed = []
    for (const one of column.laid) {
      let inner = y
      for (const band of one.bands) {
        const key = `${band.link.activity_id}:${band.link.clo_id}`
        ends.set(key, {
          ...(ends.get(key) ?? {}),
          [side]: inner + band.thickness / 2,
        })
        inner += band.thickness
      }
      placed.push({ ...one, y })
      y += one.height + GAP
    }
    return placed
  }
  const leftNodes = place(left, 'y0')
  const rightNodes = place(right, 'y1')

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>

      {links.map(link => {
        const end = ends.get(`${link.activity_id}:${link.clo_id}`)
        const clo = clos[cloIndex.get(link.clo_id)]
        const activity = activities[activityIndex.get(link.activity_id)]
        if (!end || !clo || !activity) return null
        const said = `เส้น ${clo.clo_number} ${activity.activity_name} ${link.weight}% ${marks(
          link.marks
        )} คะแนน`
        return (
          <path
            key={`${link.activity_id}:${link.clo_id}`}
            d={curve(end.y0, end.y1)}
            fill="none"
            stroke={colourOf(cloIndex.get(link.clo_id))}
            strokeWidth={thicknessOf(link, scale)}
            strokeOpacity="0.4"
            aria-label={said}
          >
            <title>{said}</title>
          </path>
        )
      })}

      {leftNodes.map(({ node, y, height: h }) => {
        const said = `โหนด ${node.clo_number} ${marks(node.marks)} คะแนน ${node.link_count} กิจกรรม`
        return (
          <g key={node.clo_id}>
            <rect
              x={LEFT_X}
              y={y}
              width={NODE_W}
              height={h}
              rx="2"
              fill={
                node.link_count === 0
                  ? '#FFFFFF'
                  : colourOf(cloIndex.get(node.clo_id))
              }
              stroke={colourOf(cloIndex.get(node.clo_id))}
              strokeWidth={node.link_count === 0 ? 1.5 : 0}
              strokeDasharray={node.link_count === 0 ? '3 2' : undefined}
              aria-label={said}
            >
              <title>{said}</title>
            </rect>
            <text
              x={LEFT_LABEL_END}
              y={y + h / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-slate-600 text-[11px]"
            >
              {node.clo_number}
            </text>
          </g>
        )
      })}

      {rightNodes.map(({ node, y, height: h }) => {
        const said = `โหนด ${node.activity_name} ${marks(node.marks)} คะแนน ${node.link_count} ผลการเรียนรู้`
        return (
          <g key={node.activity_id}>
            <rect
              x={RIGHT_X}
              y={y}
              width={NODE_W}
              height={h}
              rx="2"
              fill={node.link_count === 0 ? '#FFFFFF' : '#94A3B8'}
              stroke="#64748B"
              strokeWidth={node.link_count === 0 ? 1.5 : 0}
              strokeDasharray={node.link_count === 0 ? '3 2' : undefined}
              aria-label={said}
            >
              <title>{said}</title>
            </rect>
            <text
              x={RIGHT_LABEL_START}
              y={y + h / 2}
              dominantBaseline="middle"
              className="fill-slate-600 text-[11px]"
            >
              {shorten(node.activity_name)}
              <title>{node.activity_name}</title>
            </text>
          </g>
        )
      })}
    </svg>
  )
}
