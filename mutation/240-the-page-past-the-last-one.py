# -*- coding: utf-8 -*-
"""#240 — the two options the owner declined, made to run.

The owner answered #240 on 29 October 2569 with option ค: a request for a page
past the last one is answered, not refused, and the page comes back as asked.
A decision taken that way is a sentence on a sheet until something breaks when
it is reversed, which is what these two are for (#48 — when a ticket's proposal
is declined, the mutant to write is that proposal made to run).

Both live at `backend/routes/history.js`, because the one row in the backend
suite that asks for a page past the end is that route's (`history.test.js`, row
*and a page past the end is empty rather than an error*). The decision is about
`backend/lib/paging.js`'s contract and the proof is one route's, which is #123's
shape: a mutant on a shared rule kills where the rule is read, not everywhere it
holds. Ten of the eleven paged routes hold the contract with nothing, and that
number is the ticket's, not this file's to fix.

**Option ก cannot be written at `paging.js` at all**, which is half of what
decided the answer: `pageOf` runs before the count, so the ceiling has to be
written where `total` is known — here, and at the ten other sites that build
a paged body. `clampedtolastpage` is therefore what option ก would look like at
one of the eleven, not a faithful copy of a one-line fix that was available.

What they cannot measure: whether the other ten routes echo the page asked for.
Nothing asks them, so a ceiling added to one of those is invisible to the whole
suite — the row that would see it does not exist, and that is #240's own
*สัญญาวันนี้ถูกถือไว้ที่หนึ่งใน 11 route*.
"""

from harness import main

FILES = {
    "history": "backend/routes/history.js",
}

MUTANTS = {
    # Option ก made to run: the server clamps the page it reports to the last
    # one that exists. The rows stay empty - the offset is untouched, so this is
    # a mutant about what the answer *says* and not about what it carries - and
    # the status stays 200, so the row dies at the page assertion and at no
    # other, which is the claim the owner's answer is about (#233 - order a row
    # by what the mutant takes away).
    "clampedtolastpage": ("history",
        "      return res.status(200).json({\n"
        "        entries: rows,\n"
        "        total: counted.rows[0].total,\n"
        "        page,\n",
        "      const lastPage = Math.max(1, Math.ceil(counted.rows[0].total / perPage));\n"
        "      return res.status(200).json({\n"
        "        entries: rows,\n"
        "        total: counted.rows[0].total,\n"
        "        page: Math.min(page, lastPage),\n"),

    # Option ข made to run: the server refuses a page past the end. It is put
    # below the count and above the rows query, because the count is what says
    # the page is past the end - the same number a refusal then does not carry,
    # which is why the eleven screens cannot correct themselves under it. The
    # row dies at its status assertion, the first one it holds, so the claims
    # below that line are not read while this is applied (#88) - they are
    # `clampedtolastpage`'s to kill.
    "refusedpastthelastpage": ("history",
        "      const counted = await pool.query(\n"
        "        'SELECT count(*)::int AS total FROM user_log WHERE user_id = $1',\n"
        "        [target.user_id],\n"
        "      );\n",
        "      const counted = await pool.query(\n"
        "        'SELECT count(*)::int AS total FROM user_log WHERE user_id = $1',\n"
        "        [target.user_id],\n"
        "      );\n"
        "\n"
        "      if (counted.rows[0].total > 0 && offset >= counted.rows[0].total) {\n"
        "        return res.status(400).json({ message: 'page past the end' });\n"
        "      }\n"),
}

main(FILES, MUTANTS)
