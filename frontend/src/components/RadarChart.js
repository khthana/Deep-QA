/**
 * A radar of five-point scores, in SVG and by hand — #36.
 *
 * ## Why not a chart library
 *
 * Three reasons, and the third is the one that decided it. A charting package
 * is the largest dependency this application would carry, for one screen.
 * Its Thai axis labels are its own problem to solve rather than ours. And a
 * canvas chart is a picture: nothing in it can be read by a screen reader, and
 * nothing in it can be asserted by the browser seam either — the two readers
 * this repository actually has. Every point below is an element with a title,
 * and the table beside the chart carries every number the chart draws.
 *
 * ## A blank is not a nought, here too
 *
 * `lib/attainment.js` refuses to read an unmarked outcome as a zero, and a
 * polygon is the easiest place in the whole application to undo that: a shape
 * needs a vertex on every axis, and the obvious vertex for *no data* sits at
 * the centre, which is exactly where a score of nought sits. So the line is
 * **broken** instead. A series is drawn as one or more runs of consecutive
 * scored axes, with a gap where an outcome has nobody measured on it, and no
 * marker is placed on the axis at all. A gap reads as a gap; a point at the
 * middle reads as a failure nobody earned.
 *
 * ## Colour is never the only difference
 *
 * Each series gets a colour and a dash pattern, the legend states both, and the
 * table under the chart is the whole of the data in text. A reader who cannot
 * tell two lines apart loses nothing but the shape.
 */

const SIZE = 360
const CENTRE = SIZE / 2
const RADIUS = 128
const LABEL_RADIUS = RADIUS + 26
const MAX = 5
const RINGS = [1, 2, 3, 4, 5]

/**
 * The series palette, in the order years are given.
 *
 * The base year is index nought and is the primary colour, because it is the
 * one the screen is about. The rest are chosen to stay apart in the two common
 * forms of colour blindness as well as in grey, which is what the dash patterns
 * are the backstop for.
 */
export const SERIES = [
  {
    stroke: '#0F2A60',
    fill: 'rgba(15, 42, 96, 0.12)',
    dash: '',
    dashLabel: 'เส้นทึบ',
  },
  {
    stroke: '#B45309',
    fill: 'rgba(180, 83, 9, 0.10)',
    dash: '6 4',
    dashLabel: 'เส้นประยาว',
  },
  {
    stroke: '#0F766E',
    fill: 'rgba(15, 118, 110, 0.10)',
    dash: '2 3',
    dashLabel: 'เส้นประสั้น',
  },
  {
    stroke: '#7E22CE',
    fill: 'rgba(126, 34, 206, 0.10)',
    dash: '8 3 2 3',
    dashLabel: 'เส้นประสลับ',
  },
]

export const seriesStyle = index => SERIES[index % SERIES.length]

/**
 * How many lines this chart can draw and still tell apart — the base year plus
 * this many comparisons.
 *
 * `seriesStyle` wraps, so a fifth series comes back solid navy: the same stroke
 * *and* the same dash as the base year, with a legend listing two rows a reader
 * cannot distinguish. The screen reads this and stops offering a year it has no
 * way to draw, rather than drawing it wrongly.
 */
export const MAX_COMPARISONS = SERIES.length - 1

/** Where one axis points. Twelve o'clock first, then clockwise, as a compass is read. */
function angleOf(index, count) {
  return (Math.PI * 2 * index) / count - Math.PI / 2
}

function pointAt(index, count, value) {
  const angle = angleOf(index, count)
  const distance = (value / MAX) * RADIUS
  return [
    CENTRE + Math.cos(angle) * distance,
    CENTRE + Math.sin(angle) * distance,
  ]
}

/**
 * A series as runs of consecutive scored axes, wrapping past the last one.
 *
 * A full series is one closed ring. A series with gaps is one or more open
 * lines, and the wrap has to be handled or a stretch that crosses twelve
 * o'clock comes out as two lines that stop either side of it. Starting the
 * scan just *after* a gap is the whole trick: from there one lap around the
 * ring meets every stretch once and entire, with no special case.
 */
function runsOf(values) {
  const count = values.length
  if (values.every(value => value === null)) return []
  if (values.every(value => value !== null)) {
    return [{ closed: true, indices: values.map((_, index) => index) }]
  }

  const firstGap = values.findIndex(value => value === null)
  const runs = []
  let current = []
  for (let step = 1; step <= count; step += 1) {
    const index = (firstGap + step) % count
    if (values[index] === null) {
      if (current.length > 0) runs.push({ closed: false, indices: current })
      current = []
      continue
    }
    current.push(index)
  }
  if (current.length > 0) runs.push({ closed: false, indices: current })
  // A stretch of one axis is a dot with no line to draw. The marker below
  // still goes on it, so the score is not lost — only the segment is.
  return runs.filter(run => run.indices.length > 1)
}

const pathOf = (values, run) =>
  run.indices
    .map((index, step) => {
      const [x, y] = pointAt(index, values.length, values[index])
      return `${step === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ') + (run.closed ? ' Z' : '')

/**
 * @param {{label: string, values: (number|null)[]}[]} series — the base year first.
 * @param {string[]} axes — one label per axis, the same length as every series.
 */
export default function RadarChart({ axes, series, title }) {
  const count = axes.length
  if (count < 3) return null

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full max-w-md"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>

      {RINGS.map(ring => (
        <polygon
          key={ring}
          points={axes
            .map((_, index) =>
              pointAt(index, count, ring)
                .map(n => n.toFixed(1))
                .join(',')
            )
            .join(' ')}
          fill="none"
          stroke={ring === MAX ? '#94a3b8' : '#e2e8f0'}
          strokeWidth="1"
        />
      ))}

      {axes.map((label, index) => {
        const [x, y] = pointAt(index, count, MAX)
        const [lx, ly] = (() => {
          const angle = angleOf(index, count)
          return [
            CENTRE + Math.cos(angle) * LABEL_RADIUS,
            CENTRE + Math.sin(angle) * LABEL_RADIUS,
          ]
        })()
        // The anchor follows the side of the circle the label is on, so a label
        // at three o'clock grows outwards and one at nine o'clock does too.
        const anchor =
          lx > CENTRE + 4 ? 'start' : lx < CENTRE - 4 ? 'end' : 'middle'
        return (
          <g key={label}>
            <line
              x1={CENTRE}
              y1={CENTRE}
              x2={x}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-slate-500 text-[10px]"
            >
              {label}
            </text>
          </g>
        )
      })}

      {series.map((one, seriesIndex) => {
        const style = seriesStyle(seriesIndex)
        const runs = runsOf(one.values)
        return (
          <g key={one.label}>
            {runs.map((run, runIndex) => (
              <path
                key={runIndex}
                d={pathOf(one.values, run)}
                fill={run.closed ? style.fill : 'none'}
                stroke={style.stroke}
                strokeWidth="2"
                strokeDasharray={style.dash || undefined}
                strokeLinejoin="round"
              />
            ))}
            {one.values.map((value, index) =>
              value === null ? null : (
                <circle
                  key={axes[index]}
                  cx={pointAt(index, count, value)[0]}
                  cy={pointAt(index, count, value)[1]}
                  r="3"
                  fill={style.stroke}
                >
                  <title>{`${one.label} ${axes[index]} ${value.toFixed(2)}`}</title>
                </circle>
              )
            )}
          </g>
        )
      })}
    </svg>
  )
}
