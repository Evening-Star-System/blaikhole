# Blaikhole

A black hole for AI slop.

Blaikhole is a free, open browser extension and a community-maintained filter list that make
unwanted AI disappear from the web: AI "overview" boxes, assistant panels wedged into every site,
and the flood of AI-generated slop on search and marketplaces. You install it and it just works.

- **Free and open, forever.** No subscriptions, no "pro" tier, no whitelisting, no ads.
- **No tracking, no account required.** The extension works on its own, offline.
- **It blocks, not just hides.** Where a site lets us switch AI off at the source, we do (for
  example, Google search comes back as plain results with no AI Overview). Everything else is hidden.
- **Deterministic, not guesswork.** It hides *known* AI surfaces by how they are built. It never
  tries to guess whether some piece of writing is "AI" (that approach is unreliable, and we refuse
  to ship it).
- **A standard, not a silo.** The filter list is meant to be adopted by everyone. Contributions
  welcome.

## How it works

The extension loads a filter list at page start and applies it two ways:

1. **Block at the source.** When a site exposes a switch that turns AI off server-side, Blaikhole
   uses it, so the AI never loads and never flashes.
2. **Hide the rest.** For AI surfaces with no such switch, Blaikhole hides them by their structure
   (stable attributes, roles, and text anchors), and keeps up as pages change.

A small counter shows how much AI was blocked on each page, so the scale of it speaks for itself.

## Install

In active development. A one-click install from the add-on stores is coming. For now you can build
and load it from source:

```
git clone https://github.com/Evening-Star-System/blaikhole
cd blaikhole
bash scripts/sync-list.sh
```

Then load `extension/` as a temporary add-on in your browser's developer mode.

## The filter list

The canonical list lives in `lists/blaikhole-core.json` and is published under CC-BY-4.0 so any tool
can adopt it with attribution. Editing the list and running `bash scripts/sync-list.sh` regenerates
the module the extension ships. See `CONTRIBUTING.md` to help.

## License

- Extension code: **AGPL-3.0-or-later**. Attribution stays, and anyone who builds on it or runs it
  as a service keeps their source open too.
- Filter lists: **CC-BY-4.0**, so any tool can adopt the list with attribution.

Built by Evening Star Productions.
