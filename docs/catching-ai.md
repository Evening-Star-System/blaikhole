# Catching AI we missed

Found AI that Blaikhole did not block? You can add it in a few minutes. You do not need to know how
to code. Here is the whole process.

## 1. Capture the rule

1. Open the page that shows the AI.
2. Open your browser's developer console: press **F12** (or right-click the page and choose
   **Inspect**, then open the **Console** tab).
3. Open `scripts/capture-selector.js` from this repo, copy the whole file, paste it into the console,
   and press Enter. You will see a message that capture is on.
4. Move your mouse over the AI thing you want gone. It gets a purple outline. **Click it.**
5. A ready-to-paste rule is now copied to your clipboard (and printed in the console). Press **Escape**
   if you change your mind.

Tip: click the whole AI box, not the text inside it. If the outline is too small, hover a little
higher up the page until the whole thing is outlined, then click.

## 2. Add it to the list

Open `lists/blaikhole-core.json`. Find the list for that site (for example `pinterest-ai`), or add a
new one, and paste what you captured into its `css` or `contains`. The capture gives you the right
shape already. Then run:

```
bash scripts/sync-list.sh
```

Reload the page. The AI should be gone. Make sure nothing you wanted is gone too.

## 3. What makes a good rule

- **Good:** stable things the site is unlikely to rename, like `aria-label`, `role`, an
  author-written `id`, or a `data-testid`. The capture helper prefers these automatically.
- **Avoid:** class names like `.GcKpu`. Sites change these constantly, and a rule built on them breaks
  within weeks. The capture helper refuses to use them, and if it cannot find anything stable it gives
  you a text anchor instead.
- **Never** match a broad word like "ai" on its own. It will hide real human content. Use a specific
  phrase like "ai overview" or "created with ai".

## 4. Share it back

Open a pull request with your change. Describe the site and what the AI was. That is it. Your one rule
protects everyone who uses Blaikhole.
