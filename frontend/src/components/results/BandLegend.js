import { BANDS, rangeOf } from '../../lib/bands'

/**
 * BR-20's five bands, as a reader meets them.
 *
 * The colours come from `lib/bands.js` and the ranges from the `band_floors`
 * that travelled with the data, so neither is a copy: a legend that kept its
 * own numbers would go on saying 3.0 – 3.4 after the rule moved, and it would
 * be right about the colour and wrong about what the colour meant.
 *
 * Drawn the same way on every screen that draws a band, which is three of them
 * now — the third is where the copies were noticed.
 */
export default function BandLegend({ floors }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {Object.entries(BANDS).map(([band, look]) => (
        <span key={band} className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className={`inline-block h-3 w-3 rounded-sm ${look.chip}`} />
          {rangeOf(floors, Number(band))}
        </span>
      ))}
    </div>
  )
}
