import { useLayoutEffect, useReducer, useRef } from 'react'

import { marks } from '../../lib/bands'
import { shortened } from '../../lib/thaiWrap'

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
/**
 * How tall a node with nothing attached is, when there is nothing to measure it
 * against — an empty ตอนเรียน, where every node is blank.
 *
 * Otherwise it takes the height of the smallest node in its own column that
 * *does* carry something: see `stackedColumn`.
 */
const MIN_NODE = 6
/** A band worth almost nothing is still a band, and this is how thick. */
const MIN_BAND = 1.5

/**
 * The room each column's labels have — #115.
 *
 * The right one runs from where its labels start to the edge of the drawing.
 * The left one is the whole of the drawing in front of its bar, because those
 * labels are anchored at their end and grow backwards from
 * `LEFT_LABEL_END` towards nought.
 *
 * Both columns, and not only the one the ticket was written about: `clo_number`
 * is a `varchar(50)` a ผู้สอน types on #27, the left labels had no cut of any
 * kind, and at this size fifty characters is about four times the ninety-two
 * units in front of the bar. It is the same clipping with the same blast radius,
 * one column over, and the criterion #115 states is about a ป้าย and not about
 * an Activity: *no label may leave the `viewBox`*.
 */
const RIGHT_LABEL_ROOM = WIDTH - RIGHT_LABEL_START
const LEFT_LABEL_ROOM = LEFT_LABEL_END

/**
 * How many characters of an Activity's name fit beside the diagram — before the
 * font has been asked, and only then.
 *
 * Chosen against the room and the size the label is written at, not by taste:
 * the labels start at `RIGHT_LABEL_START` and the drawing ends at `WIDTH`, and
 * at `LABEL_SIZE` a Thai character comes to about six units of that, so fifty
 * is where the room runs out and forty-eight is just inside it. The first walk
 * had it at thirty, which cut names in half with a fifth of the room still
 * empty to their right.
 *
 * That reasoning holds only for the alphabet it was measured in, which is what
 * [#115](https://github.com/khthana/Deep-QA/issues/115) is: a count of
 * characters does not bound a width. Forty-eight Roman capitals measure 358
 * units against the 300 there are, and an `svg` clips what leaves its `viewBox`
 * with no `…` to say anything was lost. The cut is now `shortened`, against the
 * width the font gives; this is what a label reads on the commit before the
 * first measurement, and in a browser with no SVG text metrics at all. It is
 * never painted — `useLayoutEffect` corrects it inside the same commit — and it
 * is kept because the alternative on that commit is a name at its full width.
 */
const LABEL_CHARS = 48

/**
 * How big the labels are written.
 *
 * Eleven was too small to read comfortably at the size the diagram renders —
 * the walk's words — and the diagram is the one place on this screen where a
 * label cannot be enlarged by zooming without taking the drawing with it.
 */
const LABEL_SIZE = 'text-[13px]'

/**
 * The provisional cut, in the room the column actually has.
 *
 * `LABEL_CHARS` was measured against `RIGHT_LABEL_ROOM` and nothing else, so the
 * left column gets the same guess scaled to its own width rather than the right
 * column's number — forty-eight characters in ninety-two units is the defect
 * this file is fixing, written into its own fallback. The scaling is a straight
 * line, which is exactly as true as a character count is: it is here to be
 * wrong by less until the measurement lands, and #115's row 13 is what proves
 * the measurement lands.
 */
const charsFor = room => Math.max(1, Math.round((LABEL_CHARS * room) / RIGHT_LABEL_ROOM))

const shorten = (text, room) => {
  const chars = charsFor(room)
  return text.length > chars ? `${text.slice(0, chars - 1)}…` : text
}

const keyOf = (text, room) => `${room}\u0000${text}`

/**
 * Every label cut to the room its own column has, measured in the font that
 * draws it — #115.
 *
 * `labels` is a `{ text, room }` for each one, and a measurement is remembered
 * against **both**: the same words are a different answer in front of a bar and
 * beside one, and a cache keyed on the words alone would hand the left column
 * the right column's cut.
 *
 * ## Why a probe and not the labels themselves
 *
 * The measurement has to be of the glyphs this document shapes, so it is taken
 * from a `<text>` of the same class inside this same `<svg>`, appended and
 * removed inside one synchronous body. Measuring the labels in place would mean
 * writing candidate strings into them, and each of those elements holds the full
 * name in a `<title>` — the tooltip criterion 1 asks for. The probe has nothing
 * to lose.
 *
 * ## Before paint, and again when the font arrives
 *
 * `useLayoutEffect` rather than `useEffect`, for #164's reason on
 * `EntrySection`: an effect that runs after paint hands the browser the
 * uncorrected commit and the browser draws it. Here that frame would be a name
 * at its full width, clipped.
 *
 * And the cache is emptied once `document.fonts` is done, because *Noto Sans
 * Thai* is loaded with `display: swap`: a measurement taken before it arrives is
 * a claim about whichever fallback was drawing, and every width moves when the
 * real font swaps in. `pass` is in the dependencies so that emptying the cache
 * is enough to make this run again.
 *
 * Nothing evicts an entry otherwise. Its key is the words and the room, so the
 * map holds one string per label this screen has been shown since it mounted,
 * and the screen is remounted by every route it can reach. A screen that could
 * page through labels without remounting would want a bound here; this one
 * cannot.
 */function useMeasuredLabels(labels) {
  const svg = useRef(null)
  const cut = useRef(new Map())
  const [pass, remeasure] = useReducer(n => n + 1, 0)
  const key = labels.map(label => keyOf(label.text, label.room)).join('\u0001')

  useLayoutEffect(() => {
    const drawing = svg.current
    if (!drawing) return
    const probe = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    // The one thing this needs, asked of the object that will be asked for it
    // rather than of the browser's name for its class.
    if (typeof probe.getComputedTextLength !== 'function') return
    probe.setAttribute('class', LABEL_SIZE)
    drawing.append(probe)
    const widthOf = candidate => {
      probe.textContent = candidate
      return probe.getComputedTextLength()
    }

    let added = false
    for (const { text, room } of labels) {
      if (cut.current.has(keyOf(text, room))) continue
      cut.current.set(keyOf(text, room), shortened(text, room, widthOf))
      added = true
    }
    probe.remove()
    if (added) remeasure()
    // `labels` is a fresh array on every render and `key` is what is actually
    // different about it — the same shape `EntrySection` uses, and for the same
    // reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pass])

  useLayoutEffect(() => {
    if (!document.fonts) return
    let live = true
    document.fonts.ready.then(() => {
      if (!live) return
      cut.current = new Map()
      remeasure()
    })
    return () => {
      live = false
    }
  }, [])

  return {
    svg,
    labelOf: (text, room) => cut.current.get(keyOf(text, room)) ?? shorten(text, room),
  }
}

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
    return { node, bands, height }
  })

  // A node with nothing attached takes the height of the smallest node in its
  // own column that carries something, rather than a few pixels of its own.
  // Scaled honestly it would be nothing at all, and the walk's word for the
  // six-pixel compromise was *แปลก* — it read as a speck of dust rather than as
  // a part of the diagram.
  //
  // The cost is that a bar with a body is read as a bar carrying marks, and
  // this one carries none. Three things say so and none of them is its size:
  // it is hollow where every other bar is filled, its outline is dashed, and
  // its title reads 0.00 คะแนน. It is also named in a sentence under the
  // diagram, which is where a ผู้สอน is actually told about it.
  const bodies = laid.filter(one => one.bands.length > 0).map(one => one.height)
  const blank = bodies.length > 0 ? Math.min(...bodies) : MIN_NODE
  for (const one of laid) if (one.bands.length === 0) one.height = blank

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
  const { svg, labelOf } = useMeasuredLabels([
    ...clos.map(clo => ({ text: clo.clo_number, room: LEFT_LABEL_ROOM })),
    ...activities.map(activity => ({
      text: activity.activity_name,
      room: RIGHT_LABEL_ROOM,
    })),
  ])
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
      ref={svg}
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
            strokeOpacity="0.6"
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
              className={`fill-slate-600 ${LABEL_SIZE}`}
            >
              {labelOf(node.clo_number, LEFT_LABEL_ROOM)}
              {/* The whole of it, for the same reason the right column does it:
                  a cut is honest only while what was cut is still reachable. */}
              <title>{node.clo_number}</title>
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
              className={`fill-slate-600 ${LABEL_SIZE}`}
            >
              {labelOf(node.activity_name, RIGHT_LABEL_ROOM)}
              <title>{node.activity_name}</title>
            </text>
          </g>
        )
      })}
    </svg>
  )
}
