'use strict';

/**
 * The label a screen puts up where it has nothing to offer a choice of.
 *
 * Where an account reaches exactly one หลักสูตร or one ภาควิชา, the filter bar
 * states which rather than drawing a `select` of one - and the statement is the
 * word and the name inside a single element:
 *
 *     <span className="flex items-center gap-2 ...">
 *       หลักสูตร
 *       <span className="rounded-lg bg-gray-100 ...">{programs[0].program_name_th}</span>
 *     </span>
 *
 * Two things about that are worth writing down once instead of in every row.
 *
 * There is **no space** between the word and the name in the element's text:
 * JSX drops the newline between the word and the `<span>`, so `textContent` is
 * the two run together, although `gap-2` draws them apart. A read written with
 * the space in it finds nothing, on all six screens - measured.
 *
 * And the read has to be of **this** element rather than of the name anywhere
 * on the page. Until #93 the label read `0501 <name>`, which was unique by
 * accident; the name on its own is in every row of the table below it - 53
 * elements on the PLO screen - so a page-wide read of it is a strict-mode
 * violation and not an assertion. The word is what says the screen is *telling*
 * the person which one they are looking at, which is what these rows are about.
 */
const statedLabel = (page, word, name) => page.getByText(word + name, { exact: true });

module.exports = { statedLabel };
