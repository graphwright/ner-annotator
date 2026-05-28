# Future plans for this thing

**Link:** [https://claude.ai/chat/0bcae533-311f-4a8e-8367-038e4174e324](https://claude.ai/chat/0bcae533-311f-4a8e-8367-038e4174e324)  

## Assistant:

> 5/27/2026 14:12:12

<details><summary>Though process</summary>

> Analyzed source architecture, identified hardcoded data and scalability gaps.
>
> - Let me read the file-reading skill first, then look at the uploaded zip file.
> - Check file-reading skill
> - List zip contents
> - Extract and read App.jsx
> - Now I have the full source. Let me read through it and give a useful analysis.
>   
>   Key observations:
>   1. The data is entirely hardcoded — `SENTENCES`, `SENTENCE_SEGMENTS`, `MENTIONS`, `INITIAL_CLUSTERS`, `ENTITIES` are all static JS objects
>   2. `SENTENCE_SEGMENTS` is manually pre-tokenized — each sentence is hand-split into segments with `mid` references. This is going to be painful to maintain
>   3. Three-stage UI works well
>   4. Corrections panel: merge, split, override canonical
>   5. Character presence matrix
>   6. State is ephemeral — no export, no persistence
>   7. The real bottleneck is the lack of a data pipeline — everything needs to be fed from actual spaCy output, and the manual segment encoding would need to be generated algorithmically from character offsets rather than hand-coded for each sentence. Right now it's just a static demo with 7 sentences from SCAN, so scaling this would require automating the tokenization and mention linking process entirely.
> - **Done**

</details>

Good, I have the full source now. Here's my read:

**What's solid:** The three-stage toggle, the cluster detail panel, the presence matrix, and the corrections (merge/split/override) are all well-structured. The inline style approach is verbose but keeps it self-contained. The `mentionToCluster` memo is the right way to invert the cluster→mentions map.

**The main structural issue: `SENTENCE_SEGMENTS` is a scaling cliff.** You've manually pre-tokenized every sentence into `{text, mid}` pairs. That works for 7 sentences but it's O(n) hand labor for a full story. The natural replacement is a render function that takes sentence text plus a list of `{start, end, mid}` character-offset spans and splits the string programmatically:

```js
function renderSentence(text, mentions) {
  // mentions: [{start, end, mid}] sorted by start
  const segments = [];
  let cursor = 0;
  for (const m of mentions) {
    if (cursor < m.start) segments.push({ text: text.slice(cursor, m.start), mid: null });
    segments.push({ text: text.slice(m.start, m.end), mid: m.mid });
    cursor = m.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), mid: null });
  return segments;
}
```

That means `MENTIONS` entries need `{start, end}` char offsets within their sentence (trivially available from spaCy's `token.idx`), and `SENTENCE_SEGMENTS` goes away entirely.

**The second issue: no export.** The corrections state lives in React and evaporates on refresh. You'll want a "Download JSON" button that serializes the current `clusters` state — that's your ground truth output file. Something like:

```js
const exportCorrections = () => {
  const blob = new Blob([JSON.stringify({ sentences: SENTENCES, mentions: MENTIONS, clusters }, null, 2)], 
    { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "annotations.json";
  a.click();
};
```

**The third issue: no data loading.** Right now you can't point it at a different text. The next natural step is a JSON upload widget so you can drop in the output of your spaCy pipeline and have it populate `SENTENCES`, `MENTIONS`, and `INITIAL_CLUSTERS` from that file rather than from hardcoded constants.

Want me to refactor it with the character-offset renderer, export, and a JSON loader? That would make it genuinely usable as a pipeline debugging tool rather than a demo.

## User:

> 5/27/2026 20:27:45

These are all things I want to phase in. I also would like a connection to a LLM to find the mentions and figure out the coreferences. I think the canonical IDs need to be done by something specialized to the knowledge domain, like the identity service.

## Assistant:

> 5/27/2026 20:28:10

<details><summary>Though process</summary>

> Architected phased integration of LLM and identity service components.
>
> - Will wants to phase in several improvements and is thinking about the architecture. Let me engage with this thoughtfully.
>   
>   The key architectural points he's raising:
>   1. LLM for mention detection and coreference (steps 1 and 2)
>   2. Identity service for canonicalization (step 3) — this fits perfectly with Graphwright's existing IdentityServer design
>   
>   Let me think about this architecture:
>   
>   **LLM for mentions + coref:** This is interesting because it collapses steps 1 and 2 into one LLM call, or you could do them separately. The LLM can return structured JSON with mentions (text, start, end, pos) and coreference clusters in one shot. 
>   
>   The LLM actually handles this task quite well with a properly structured prompt. For the identity service piece, the IdentityServer already has the atomic Postgres operations for find-or-create semantics, which is perfect. The canonical ID assignment is domain-specific — Baker Street Wiki names for Holmes, equipment tags for industrial control — so the UI should call the identity service for step 3 rather than relying on the LLM to guess at canonical IDs.
>   
>   The phasing strategy makes sense: start with the character offset renderer and export on the frontend, then add the JSON loader for testing with real data, integrate the LLM for mentions and coreference, and finally wire up the identity service for canonical ID assignment.
>   
>   For the LLM prompt, I'm structuring it to return mentions with their character offsets and part-of-speech tags, plus coreference clusters with confidence scores. The LLM actually outperforms spaCy's coreference for Victorian prose because it has world knowledge about the characters. The key constraint is that the LLM should only output clusters — the identity service handles the canonical ID assignment separately.
> - **Done**

</details>

That division of labor is exactly right, and it maps cleanly onto a clean separation of concerns:

**LLM handles the linguistic work** (steps 1 and 2) — mention detection and coreference are fundamentally about language understanding. The LLM has world knowledge about pronouns, discourse structure, and character names across the Holmes corpus that spaCy's coref model doesn't. You can get both steps in a single structured-output call: give it the sentence text, ask it to return mentions with char offsets and cluster assignments in JSON.

**Identity service handles the semantic work** (step 3) — canonical ID assignment is domain-specific by nature. The LLM might confidently say "this cluster refers to the same entity as Irene Adler" but it shouldn't be the one minting `character:irene_adler`. That's the IdentityServer's job — it owns the namespace, enforces uniqueness, and runs the find-or-create atomically. The UI sends a cluster label + representative mentions to the identity service and gets back a canonical ID or a provisional one.

**A few things worth thinking through before you start phasing:**

The LLM output schema needs to be stable across calls since it becomes the wire format between the LLM step and the UI. Worth nailing down the JSON shape now — something like `{mentions: [{id, text, start, end, sid, pos}], clusters: [{id, label, mention_ids, confidence}]}` — before you build the renderer around it.

The identity service integration also raises a UI question: when you're in stage 3, do you call the identity service per cluster on demand (user clicks "resolve"), or does the stage transition trigger a batch call for all unresolved clusters? Batch is faster but noisier; on-demand is slower but lets the user review coref corrections before canonicalization runs.

Also — the LLM will sometimes produce overlapping mentions or mis-segment spans, especially around possessives and compound nouns. The character-offset renderer needs to handle that gracefully (skip or clip overlapping spans) rather than crash.

What's your preferred phasing order? My suggestion would be: renderer + export first (pure frontend, no new deps), then JSON loader, then LLM integration, then identity service — so each phase produces something immediately testable.

## User:

> 5/28/2026 7:23:19

When I talk about *including a LLM connection*, what I envision is that a user can provide an API key for Claude or ChatGPT or whatever, and it could be stored in the localstore of their browser for later use, and used (somehow, maybe directly from the front end in some AJAX-like way?) to run queries against the text. Does that sound feasible?

## Assistant:

> 5/28/2026 7:23:38

<details><summary>Though process</summary>

> Validated feasibility of browser-based API calls with localStorage key storage.
>
> - Will is asking about feasibility of calling LLM APIs directly from the browser frontend using user-provided API keys stored in localStorage.
>   
>   Key points:
>   1. **Feasibility:** Yes, absolutely feasible. Direct browser-to-API calls work fine for Anthropic and OpenAI APIs - they both support CORS for browser requests.
>   2. **localStorage:** Fine for API keys in a personal tool context. Not ideal for a public app (XSS risk), but for a tool like this where it's essentially a personal dev tool, it's acceptable.
>   3. **CORS:** Anthropic's API does support CORS from browsers. 
>   
>   Both OpenAI and Anthropic support CORS, so direct fetch calls from the browser work without needing a backend. Since this is a static GitHub Pages site, there's no server to proxy through anyway, making direct API calls the right approach. The localStorage tradeoff is reasonable for a personal dev tool—XSS is a concern but acceptable given the context, and it's worth noting that this is different from Claude.ai artifacts where localStorage isn't supported.
> - **Done**

</details>

Yes, completely feasible — and for a personal tool like this it's the right architecture. Both Anthropic and OpenAI expose APIs with CORS headers that allow direct browser `fetch()` calls, so there's no backend needed.

The pattern is straightforward:

```js
// Store on save
localStorage.setItem('anthropic_api_key', key);

// Retrieve on use
const key = localStorage.getItem('anthropic_api_key');

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    'anthropic-dangerous-direct-browser-access': 'true',  // required header
  },
  body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [...] }),
});
```

That last header is the notable one — Anthropic requires you to explicitly opt into direct browser access, which is their way of acknowledging you've made a conscious choice to expose the key client-side.

**The security tradeoff is worth naming clearly:** localStorage is readable by any JavaScript running on the page, so XSS would expose the key. For a personal dev tool on GitHub Pages with no third-party scripts, that risk is effectively zero. If this ever becomes a public multi-user tool you'd want a backend proxy instead, but that's not the problem you're solving now.

**Multi-provider support** is also easy to layer in — just store a provider discriminator alongside the key and branch on it:

```js
const PROVIDERS = {
  anthropic: { url: 'https://api.anthropic.com/v1/messages', ... },
  openai:    { url: 'https://api.openai.com/v1/chat/completions', ... },
};
```

The main wrinkle is that the response schemas differ between providers, so you'll want a thin adapter layer that normalizes both into your internal `{mentions, clusters}` format.

Phasing-wise this fits naturally after the JSON loader — by then you have a stable wire format and the LLM just becomes another way to populate it.
