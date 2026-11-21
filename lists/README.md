# Blaikhole filter lists

These lists are the heart of the project and the thing we want everyone to adopt. They are
published under **CC-BY-4.0**: use them anywhere, in any tool, just keep the attribution.

## Format

A list file is JSON:

```
{
  "name": "...", "version": "...", "updated": "YYYY-MM-DD", "license": "CC-BY-4.0",
  "lists": [
    {
      "id": "google-ai",
      "name": "Human-readable name",
      "recommended": true,              // on by default
      "match": ["google."],             // hostname substrings this applies to
      "css": ["selector", ...],         // hidden via injected CSS (fast, flash-free)
      "contains": [                     // durable text/aria anchors (applied in JS)
        { "text": "ai overview", "scope": "h1,h2,[role=heading]", "up": 4, "maxlen": 24 }
      ]
    }
  ]
}
```

- **`css`** rules are the fast path. They hide by structure.
- **`contains`** rules are the durable path for churn-prone surfaces: find an element whose visible
  text or `aria-label` contains `text` (shorter than `maxlen`, to avoid false matches), then act on
  the ancestor `up` levels above it. Use specific labels ("ai overview"), never broad words ("ai").

## The discipline (non-negotiable)

- **Never** match on vague signals that catch human content. No "hide anything containing AI".
- Prefer durable anchors (`aria-label`, `role`, stable `data-*`, visible labels) over class names,
  which churn (e.g. Google rotates `.GcKpu`, `.hdzaWe`).
- Every rule must be verified against the live site before it is trusted. This is the ongoing work.

## Contributing

PRs welcome: add a new AI surface, fix a broken selector, add a site. Keep rules minimal and
specific. Credit to upstream open lists we build on (laylavish HUGE AI Blocklist and others, CC0).
