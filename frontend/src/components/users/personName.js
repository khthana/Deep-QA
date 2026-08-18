/**
 * An account as a person reads it, in one place — #13.
 *
 * The Thai name is what the university uses, so it comes first; the English one
 * is the fallback for the accounts that have no Thai name at all, and a dash is
 * the fallback for the ones that have neither. Extracted when the history
 * screen needed the same rule the users table already had: a picker that named
 * somebody differently from the row they came from is one bug waiting.
 */
export const personName = user =>
  [user.title_th, user.first_name_th, user.last_name_th]
    .filter(Boolean)
    .join(' ') ||
  [user.first_name_en, user.last_name_en].filter(Boolean).join(' ') ||
  '—'
