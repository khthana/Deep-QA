# GitHub scripts

## `publish-tickets.sh`

Creates GitHub issues in bulk from a plain-text file, one issue per block.

```bash
bash scripts/github/publish-tickets.sh scripts/github/ticket-sources/phase-0-foundation.txt
```

Blocks are separated by a line reading `@@@TICKET@@@`. The **first line after the marker is the issue title**; the
rest is the body. Every issue is created with the `ready-for-agent` label. The script prints each new issue number
beside its title.

It exists because building issue bodies with shell heredocs breaks: apostrophes and nested quotes in prose bodies
cause the shell to swallow the rest of the command. Passing a file to `--body-file` sidesteps quoting entirely.

**This creates issues; it does not update them.** Re-running it against a file that was already published produces
duplicates. Edit issues with `gh issue edit` instead.

## `ticket-sources/`

The exact bodies used to publish issues [#2](https://github.com/khthana/Deep-QA/issues/2)–[#45](https://github.com/khthana/Deep-QA/issues/45)
on 2026-08-16, kept as a record of what was asked for and as a starting point if the ticket set ever needs
regenerating. Issues were created in file order, and numbering came out as ticket *N* → issue *N+1*.

These files do **not** carry the blocking edges. Those were added afterwards as native GitHub issue dependencies:

```bash
gh api --method POST repos/khthana/Deep-QA/issues/<child>/dependencies/blocked_by \
  -F issue_id=<blocker-database-id>
```

where the blocker's database id — not its `#number` — comes from
`gh api repos/khthana/Deep-QA/issues/<n> --jq .id`. The full edge list is in
[`docs/07-ticket-breakdown.md`](../../docs/07-ticket-breakdown.md).

If the issues here ever disagree with GitHub, **GitHub is authoritative** — these files are a snapshot of the moment
of publication and are not kept in sync.
