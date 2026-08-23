# The Section context is carried by section_id in the URL, and by nothing else

Every Teacher screen after the dashboard - the student list, the weighting scheme, the activities, the scores - is
meaningless without knowing which Section is meant. #24 has to decide what carries that answer between screens, and
the delivered system's answer cannot be kept.

The inherited menu spells the carrier as `%SUBJECT%`, substituted with `{subject_name_en}-Section-{section_number}`.
That names two different rows. `db/seed.js` opens the same Subject in two academic years and gives each a Section
numbered `1`, which is the ordinary shape of a subject taught every year rather than a quirk of the seed: one English
name, one section number, two Sections. A URL built that way is ambiguous the first time anyone teaches the same
subject twice, and the screen behind it would read whichever row the query happened to return first. Adding the year
and semester to the string would disambiguate it and would be a composite key spelled into a path segment, which is
what ADR-0001 has a surrogate for.

**So: the Section context is `course_sections.section_id`, and it appears in the route.** The Teacher routes become
`/teacher/teacherDashboard/:sectionId/<screen>`, `%SUBJECT%` is retired, and no copy of the selection is kept anywhere
else - not in `localStorage`, not in a context that outlives the route.

## Why the URL is the only carrier

The rebuild has already stopped caching selections like this one, in three places that each record why:
`AuthContext.js` no longer keeps `selectedRole` and `scopeID` in `localStorage`, and `RoleDropdown.js` and `Login.js`
carry the same note. A cached Section would reproduce exactly the defect #77 and #81 record for roles - a stored
selection and a route that disagree after a switch, with the stored copy winning silently.

The URL also answers #24's fifth criterion for free: the chosen Section survives a reload because the address does.
Nothing has to be written down and read back, so there is no state that can be stale, and a Teacher can send a
colleague a link to a screen and have it open on the same Section.

## What section_id is not

It is a *selection*, in the exact sense `acting` is a selection in #10: it says which of the caller's Sections they
are looking at, and it confers nothing. ADR-0002 governs unchanged - every request that names a Section re-reads
`course_sections_teacher` and refuses a Section the caller does not teach, whether or not it was on their dashboard
and whether or not they typed the id by hand. A URL naming a Section the account does not teach is worth exactly as
much as a URL naming none, which is #24's sixth criterion and is proved with `U_TEACH2`, the seeded Teacher who
teaches nothing.

## Consequences

- The Section-specific menu entries render only where the route has a `:sectionId`, which is #24's third and fourth
  criteria. The dashboard is the one Teacher screen that does not need one, and it is the only entry visible before a
  Section is chosen.
- The dashboard lists the Sections of the current term only. "Current" is `currentTerm()` in `db/term.js`, derived
  from the date rather than configured, so the list does not have to be re-pointed every November.
- Screens below this inherit the Offering through the Section rather than resolving it themselves, which is the same
  direction ADR-0003 already took CLOs and the weighting scheme: they belong to the Offering, and the Section is how a
  Teacher arrives at it.
- **Two gates, and they answer different questions.** The acting grant must be `TEACHER` for these routes to open at
  all, and the teaching register decides which Sections are then reachable. Neither substitutes for the other: without
  the first, an account holding both a committee grant and a teaching one would reach the Teacher screens while acting
  as the committee, and #24's seventh criterion - switch to the administrator role and back - would be a switch that
  changed nothing. `requireRole` already says this in its own words: an endpoint for teachers is not open to an account
  while it is acting as the committee.
- A consequence worth stating rather than discovering: #23 lets a Section be assigned to anyone in the user register,
  including somebody whose only grant is another role, because a section is sometimes taught by exactly such a person.
  That assignment is real and the register holds it, but without a `TEACHER` grant they cannot open these screens.
  Who may be assigned and who may open the screen are two questions; #23 answered the first and this answers the
  second, and widening either to match the other would give away the check the other one is.
- An id in a path is a number a curious person will edit. That is intended and is why the refusal is at the server;
  a dashboard that only ever offered reachable Sections would be a screen enforcing authorisation, which ADR-0002
  forbids.
