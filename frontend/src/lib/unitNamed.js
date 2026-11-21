import { kindWord } from '../components/users/scopeLabel'

/**
 * A programme as an option of a programme picker reads it - #298.
 *
 * `program_name_th` may be null in the schema (`db/migrations/0001`), and a
 * picker that drew it bare offered a choice with no words on it. The owner
 * answered on 21 November 2569 that such a programme reads by its kind word
 * and its code, `หลักสูตร 0501` - #297's answer for the scope picker, carried to
 * the eleven programme pickers - and that the column stays nullable.
 *
 * Shared text and not a shared claim (#104): each picker's *use* of it is its
 * own, and the mutants that prove it are at the call sites. The kind word is
 * `scopeLabel`'s, so the two cannot drift apart.
 */
export const programNamed = entry =>
  entry.program_name_th || `${kindWord('program')} ${entry.program_id}`
