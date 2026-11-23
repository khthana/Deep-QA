/**
 * An account's status as the delivered screen drew it: a switch in its own
 * column - #302.
 *
 * `DEEP-QA-FRONTEND/.../UserMangement/UserTable.js` used MUI's `Switch`, which
 * is a checkbox underneath. This is a `<button role="switch">` instead, for a
 * reason a checkbox cannot meet: a checkbox flips its own state in the DOM at
 * the press, before anybody has answered #86's question, and a switch that
 * moved and then moved back would say for a moment that the account had
 * changed when nothing had been written. A button changes nothing at the press;
 * `checked` comes from the row the server sent, so the switch points the other
 * way only once the reload has drawn the account the other way.
 *
 * `label` is the accessible name - *สถานะ ‹ชื่อ›*, `docs/users-screen.md` rule
 * 2 - because the switch carries no word of its own (the owner's answer of
 * 23 November 2569 kept the delivered cell, which says nothing beside it), and
 * a screen reader hears the state from `aria-checked`. `title` is only handed
 * in for the one row that cannot be pressed, where it says why (#84).
 */
export default function StatusSwitch({ checked, label, title, onClick, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
