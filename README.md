# Sylvia Nopar Thomas — one-page site

Single self-contained `index.html`. No build step, no npm, no framework. Open the
file directly in a browser and it works. Only external dependency is Google Fonts
(Bricolage Grotesque + Instrument Sans).

```
index.html          the whole site — markup, CSS, JS
images/             the four uploaded assets
```

## Audit mode

Append `?audit` to the URL. Every claim that is not yet verified gets outlined in
magenta and labelled with its flag ID from the client packet §9, and the full list
prints to the console. Use this to walk Sylvia through the punch list.

```
index.html?audit
```

There are currently **13 tagged claims**.

---

## Launch blockers

Ordered by what can actually stop Thursday.

| # | Flag | Blocker | What unblocks it |
|---|---|---|---|
| 1 | F6 | **No domain.** None of the four domain questions were answered. | Buy one today on an account we control. |
| 2 | F20 | **Contact form has no handler.** `action=""` is a deliberate placeholder. | Cloudflare Pages Function or Formspree. Must route to her inbox without rendering the address. |
| 3 | F1 | **Zero testimonials.** One pending. | Ask REI + Thrifty Traveler this week. |
| 4 | F3/F4 | **REI naming, and the Puddle Creative relationship is undefined.** REI is named in text (defensible). No REI logo or key art is used. | Confirm whether her REI work runs through Puddle, and get a yes before any REI mark goes on the page. |

## Unverified claims currently on the page

None of these are false — they are hers. They are unsourced, which is a different
problem in front of an editorially-minded audience that checks things.

| Flag | Claim | Needed |
|---|---|---|
| F7 | 29,000 → 50,000 listens in ~90 days | One number. A second version on file says 25k → 40k. Backend screenshot. |
| F8 | The Shorty Award story, and the awards list | Which show, which year, which category, Bronze or Best in Show. Publicly checkable. |
| F9 | Top 10 travel podcasts on Apple Podcasts | Country, category, month. Weakest line on the page — cutting it costs almost nothing. |
| F10 | Over 6 million downloads | Attributed to the show, never to her. Confirm it's current. |
| F11 | 55–60% → ~85% completion; 80%+ consumption | Platform and date range for each. |

## Decisions made during the build

- **Headshot.** Used `sylvia-portrait-betholson.jpg`, the real photograph with a
  named third-party photographer. Did **not** use `sylvia-headshot-aragon.jpeg` —
  it has AI-generation tells and "Aragon" is an AI headshot service. Per F2, a
  synthetic photo of a real person on a trust page is a bad trade.
- **`wiwl-key-art.jpg` is unused.** REI-owned, permission not confirmed (F3).
- **No client logo bar, no custom cursor, no parallax, no modals.** Two clients
  do not make a marquee.
- **The capability ticker runs her disciplines, not client logos.**
- **`sticky-proof` was not built.** The design direction marks it cut-first.
- **The page never depends on JavaScript to be readable.** The `rise-in`
  animation is scoped to a `.js` class set in the head, and a failsafe un-hides
  everything after 2s if the main script never wires up. Scripts stripped,
  blocked, or throwing all still render the full page. Verified in all three
  paths — this matters for embeds, and for a live demo.

## Known copy/layout mismatch

The button reads **"Book the intro call"** but there is no booking link and the
flow is a form. Per assumption #12 in the copy doc the label should read
"Send me a message" if it stays a form. The copy was not edited — this needs
Sylvia's call. The form's own submit button already reads "Send me a message".

## Deviations from the design direction, and why

- Award list on the violet band is white at **72%**, not the specified 60%. At 60%
  it measures 3.6:1 against `--violet` and fails AA for 18px body text. 72% gives
  4.69:1. The system marks contrast rules non-negotiable, so contrast won.
- Footer links are bone text with a magenta underline rather than magenta text.
  Magenta on `--ink` at 18px is 4.46:1 (fails AA), and the palette rules forbid
  magenta type below 24px anyway.
- The violet fill sits on **Credibility** rather than the Numbers row. The page
  grew from 8 sections to 11, and the system allows only two full-bleed fills;
  putting violet on the heaviest section keeps the longest bone run to three.
