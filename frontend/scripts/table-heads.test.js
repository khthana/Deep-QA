const test = require('node:test')
const assert = require('node:assert')

const { examine } = require('./table-heads')

const table = head => `
import { TABLE_HEAD } from '../lib/tableHead'
export default function Screen() {
  return (
    <table>
      ${head}
      <tbody><tr><td className="text-xs text-slate-500">x</td></tr></tbody>
    </table>
  )
}
`

test('a head that reads TABLE_HEAD, with plain cells, is clean', () => {
  const found = examine(table('<thead className={TABLE_HEAD}><tr><th className="px-4 py-2 text-center">a</th></tr></thead>'))
  assert.deepStrictEqual([found.heads.length, found.notHead, found.cells], [1, [], []])
})

test('a head with no className, or with the classes copied as a string, is red', () => {
  assert.strictEqual(examine(table('<thead><tr><th>a</th></tr></thead>')).notHead.length, 1)
  assert.strictEqual(
    examine(table('<thead className="bg-gray-50 text-gray-600"><tr><th>a</th></tr></thead>')).notHead.length,
    1
  )
})

test('a cell that re-sets size, colour, weight or ground is red, in a string or a template', () => {
  const found = examine(
    table(
      '<thead className={TABLE_HEAD}><tr className="border-b text-xs"><th className="px-4 font-medium">a</th>' +
        '<th className={`px-2 ${x} text-slate-500`}>b</th><th className="bg-slate-100">c</th></tr></thead>'
    )
  )
  assert.deepStrictEqual(
    found.cells.map(cell => cell.resets),
    [['text-xs'], ['font-medium'], ['text-slate-500'], ['bg-slate-100']]
  )
})

test("the head's own ground on a sticky cell, and a span inside a cell, are not asked", () => {
  const found = examine(
    table(
      '<thead className={TABLE_HEAD}><tr><th className="sticky left-0 bg-gray-50">a' +
        '<span className="font-normal text-slate-400">b</span></th></tr></thead>'
    )
  )
  assert.deepStrictEqual(found.cells, [])
})

test('a cell outside the head is not asked', () => {
  assert.deepStrictEqual(examine(table('<thead className={TABLE_HEAD}><tr><th>a</th></tr></thead>')).cells, [])
})

const marking = text =>
  examine(
    table(`<thead className={TABLE_HEAD}><tr>{/* ${text} */}<th className="text-xs">a</th></tr></thead>`)
  )

test('a marker needs a reason and a ticket', () => {
  assert.strictEqual(marking('table-head: the codes are narrow (#314)').markers[0].ok, true)
  assert.strictEqual(marking('table-head: (#314)').markers[0].ok, false)
  assert.strictEqual(marking('table-head: no ticket').markers[0].ok, false)
})

test('a marker belongs to the head it sits in, and one outside every head belongs to none', () => {
  const inside = marking('table-head: narrow (#314)')
  assert.strictEqual(inside.markers[0].head, inside.cells[0].head)
  const outside = examine('// table-head: narrow (#314)\n' + table('<thead className={TABLE_HEAD} />'))
  assert.strictEqual(outside.markers[0].head, null)
})

test('alignment is not asked, and any size, colour or arbitrary value is', () => {
  const found = examine(
    table(
      '<thead className={TABLE_HEAD}><tr><th className="text-left text-center text-right">a</th>' +
        '<th className="text-2xl text-blue-700 text-black text-[11px] font-[600]">b</th></tr></thead>'
    )
  )
  assert.deepStrictEqual(
    found.cells.map(cell => cell.resets),
    [['text-2xl', 'text-blue-700', 'text-black', 'text-[11px]', 'font-[600]']]
  )
})
