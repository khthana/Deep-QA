/**
 * What a learning outcome's `outcome_type` is called where a person reads it.
 *
 * Four English words go into the database and four Thai ones come out on
 * screen, and until #44 the map between them existed three times: exported
 * from `components/plos/PloForm.js` where #19 first needed it, copied into
 * #42's report, and about to be copied into #44's. Three copies of four
 * strings is not a size problem — it is that a curriculum committee renaming
 * one of these would rename it on one screen, and nothing would say so.
 *
 * It sits here rather than staying exported from the form for the reason a
 * page importing a constant *from a form component* is itself a smell: what a
 * type is called has nothing to do with writing one down. `lib/bands.js` holds
 * the same kind of thing one level over — how a figure is drawn, for every
 * screen that draws one.
 */
export const OUTCOME_TYPES = {
  knowledge: 'ความรู้',
  skills: 'ทักษะ',
  ethics: 'จริยธรรม',
  character: 'ลักษณะบุคคล',
}
