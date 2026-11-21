// GENERATED from lists/blaikhole-core.json by scripts/sync-list.sh. Do not edit by hand.
window.__BLAIKHOLE_LIST__ = {
  "name": "Blaikhole Core",
  "version": "0.1.0",
  "updated": "2026-11-21",
  "license": "CC-BY-4.0",
  "homepage": "https://github.com/Evening-Star-System/Blaikhole",
  "note": "Starter rules. Selectors and text anchors must be verified and tuned against each live site; class-name selectors churn and are the ongoing maintenance work. Prefer durable anchors (aria-label, role, stable data-* and visible labels) over class names.",
  "lists": [
    {
      "id": "google-ai",
      "name": "Google AI Overviews and AI Mode",
      "recommended": true,
      "match": ["google."],
      "css": [
        "div[data-subtree='aiov']",
        "div[aria-label='AI Overview']",
        "block-component:has([aria-label='AI Overview'])"
      ],
      "contains": [
        { "text": "ai overview", "scope": "h1,h2,h3,[role='heading'],div[aria-label]", "up": 4, "maxlen": 24 }
      ]
    },
    {
      "id": "ai-assistants",
      "name": "AI assistant panels (Copilot, Gemini, Meta AI, Grok)",
      "recommended": true,
      "match": ["bing.com", "microsoft.com", "github.com", "facebook.com", "instagram.com", "x.com", "twitter.com"],
      "css": [
        "#b_sydConvCont",
        "div[aria-label='Copilot']",
        "div[aria-label='Meta AI']",
        "a[aria-label='Grok']",
        "div[data-testid='GrokDrawer']"
      ],
      "contains": [
        { "text": "ask meta ai", "scope": "span,div[aria-label],a", "up": 2, "maxlen": 24 },
        { "text": "ask grok", "scope": "span,a,div[aria-label]", "up": 2, "maxlen": 24 }
      ]
    },
    {
      "id": "reddit-answers",
      "name": "Reddit Answers",
      "recommended": true,
      "match": ["reddit.com"],
      "css": ["a[href*='/answers']", "reddit-answers", "div[data-testid='reddit-answers']"],
      "contains": [
        { "text": "reddit answers", "scope": "a,span,[role='heading']", "up": 2, "maxlen": 24 }
      ]
    },
    {
      "id": "youtube-ai",
      "name": "YouTube AI features",
      "recommended": true,
      "match": ["youtube.com"],
      "css": [
        "ytd-ai-summary-renderer",
        "button[aria-label*='AI']",
        "#google-ai-overview"
      ],
      "contains": [
        { "text": "ai summary", "scope": "span,[role='heading'],button", "up": 3, "maxlen": 24 }
      ]
    },
    {
      "id": "pinterest-ai",
      "name": "Pinterest AI slop",
      "recommended": true,
      "match": ["pinterest."],
      "css": [
        "div[data-test-id='ai-generated-label']",
        "[aria-label*='AI generated']",
        "div:has(> [data-test-id='ai-generated-label'])"
      ],
      "contains": [
        { "text": "ai generated", "scope": "span,div[aria-label],[data-test-id]", "up": 5, "maxlen": 24 }
      ]
    },
    {
      "id": "amazon-ai",
      "name": "Amazon AI (Rufus and AI slop)",
      "recommended": true,
      "match": ["amazon."],
      "css": [
        "#rufus-sidebar",
        "div[data-card-metrics-id*='rufus']",
        "[aria-label*='Rufus']",
        "div[data-csa-c-content-id*='ai-generated']"
      ],
      "contains": [
        { "text": "ai-generated", "scope": "span,div[aria-label],[data-csa-c-content-id]", "up": 3, "maxlen": 28 }
      ]
    },
    {
      "id": "etsy-ai",
      "name": "Etsy AI slop",
      "recommended": true,
      "match": ["etsy."],
      "css": ["[data-ai-generated]", "div:has(> [data-ai-generated])"],
      "contains": [
        { "text": "created with ai", "scope": "span,p,div[aria-label]", "up": 4, "maxlen": 28 }
      ]
    }
  ]
}
;
