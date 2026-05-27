# NER Annotator

![Screenshot](https://raw.githubusercontent.com/graphwright/ner-annotator/main/screenshot.png)


**Link:** [https://claude.ai/chat/0bcae533-311f-4a8e-8367-038e4174e324](https://claude.ai/chat/0bcae533-311f-4a8e-8367-038e4174e324)  

## User:

> 5/24/2026 22:28:16

I want to look at a different approach to ner. The idea would be to first identify all occurrences of nouns and pronouns with location info and store those as mentions. Second you link those together where you can, like dereferencing pronouns. Third you try to identify canonical IDs where possible. Does that sound reasonable?

## Assistant:

> 5/24/2026 22:28:45

Yes, that's a sound decomposition — it maps cleanly onto the classic NLP pipeline of **mention detection → coreference resolution → entity linking**, and the separation of concerns is a real virtue. Each stage is independently testable and the failure modes are different at each level.

A few thoughts on each step:

**Step 1 (mention extraction):** Using POS tags to pull nouns/pronouns is high-recall by design, which is what you want here. spaCy's noun chunks plus pronoun filtering from the dependency parse gives you clean spans with token offsets. The catch is that in Holmes, generic nouns are everywhere — "the room", "the case", "the man" — so you'll be drowning in low-salience mentions. You might want a salience filter at this stage or just accept the noise and let step 3 absorb it.

**Step 2 (coreference):** This is the hardest step, especially in Victorian prose. spaCy has an experimental coref component (in `spacy-experimental`) that's transformer-based and reasonably good, but literary text with long-distance pronoun chains ("Holmes lit his pipe. He remarked...") will still cause errors. The key design question is whether you want coref to produce hard clusters or soft candidates with confidence scores. Soft is better — it lets step 3 make the final call.

**Step 3 (canonicalization):** This is where your provisional ID scheme fits naturally. Mentions that survive coref clustering either get a confident canonical ID (via Baker Street Wiki lookup or LLM judgment) or get a provisional one. The provisional entities still participate in the graph, just flagged.

One architectural point: your frozen Pydantic model chain probably wants a `Mention` type (span + location + POS), a `MentionCluster` type (output of coref), and then `Entity` (output of canonicalization). The cluster is an intermediate that may or may not have been in your existing design.

The main risk is that step 2 errors propagate into step 3 in ways that are hard to detect. Worth designing the pipeline so you can inspect and override coref clusters manually before canonicalization runs.

## User:

> 5/24/2026 22:47:32

It probably makes sense to create a browser based UI for going thru these steps and highlighting the clusters in the text. Click on a mention and it tells you whatever it thinks it knows about that mention.

## Assistant:

> 5/24/2026 22:49:08

The concept is solid — annotation tools like Brat and Prodigy follow exactly this pattern, so it's proven territory. A few thoughts:

**What works well about the approach:**
The three-stage view maps directly to your pipeline stages, which means the UI can also serve as a debugging tool — you can see exactly where the pipeline went wrong (bad mention detection vs. bad coref vs. bad canonicalization).

**Improvements worth considering:**

*Cluster visualization:* Color-coding by cluster is the standard approach, but in a dense passage you can end up with 15+ clusters and run out of perceptually distinct colors. A useful fallback is underlining style (solid/dashed/dotted) as a secondary dimension, so you're encoding two bits of information per mention.

*Confidence as a visual signal:* Highlight opacity could encode confidence — a high-confidence canonical mention is fully saturated, a provisional one is washed out. Gives you at-a-glance uncertainty without cluttering the UI.

*Staged reveal:* Rather than showing all three stages simultaneously, letting you toggle between them is useful for debugging. Step 1 shows all raw mentions (noisy). Step 2 shows coref clusters. Step 3 shows canonical IDs where resolved. You can immediately see what coref collapsed and what survived to canonicalization.

*Correction workflow:* The most valuable thing this tool could do beyond visualization is let you manually merge or split clusters and override canonical IDs. That correction data becomes ground truth for evaluating and improving the pipeline. If you don't build that in from the start, the tool stays read-only and its value is limited.

*Sentence-level vs. document-level view:* For long texts you might want a sentence-grid overview where each row is a sentence and colored dots indicate which entity clusters appear in it — like a character presence matrix. Useful for Holmes where you want to track who appears in which scenes.

The correction workflow is probably the highest-leverage addition. Even a simple "merge these two clusters" / "this pronoun should point here instead" with export to JSON would let you build a labeled dataset as a side effect of using the tool.

## User:

> 5/24/2026 22:55:36

Good stuff, okay now please go ahead and code that up.

## Assistant:

> 5/24/2026 22:59:59

All three stages are implemented with the opening paragraph of *A Scandal in Bohemia* as sample data:

**Stage 1 — Mentions:** highlights by POS type (PROPN / PRON / NOUN) with no cluster information yet — just the raw detection layer.

**Stage 2 — Coreference:** color-codes by cluster (Holmes amber, Irene pink, Watson blue, unresolved gray with reduced opacity). The detail panel shows all mentions in the cluster as clickable chips.

**Stage 3 — Canonical:** same clustering but with `✓` badges on resolved proper nouns, provisional clusters visually faded, and the entity description panel visible on click.

**Corrections panel** (stages 2+): merge two clusters via dropdown, split a mention out to a new singleton, and override a canonical ID (stage 3 only, Enter key works).

**Character presence matrix** at the bottom shows which named entities appear in each sentence — you can see the Holmes/Irene/Watson distribution across the seven sentences at a glance.

> File: [/mnt/user-data/outputs/ner-annotator.jsx](https://claude.ai/api/organizations/840440cd-f1be-4af9-8726-7ed95cf3825c/conversations/0bcae533-311f-4a8e-8367-038e4174e324/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fner-annotator.jsx)

## User:

> 5/27/2026 8:41:30

How does one run a JSX file? What kind of server or infra does one put around it?

## Assistant:

> 5/27/2026 8:41:44

JSX isn't directly runnable — it needs to be transpiled to plain JavaScript first. A few paths depending on what you want:

**Quickest: Vite**

This is the standard choice now. From zero:

```bash
npm create vite@latest ner-annotator -- --template react
cd ner-annotator
npm install
```

Then drop your `.jsx` file into `src/`, adjust `src/main.jsx` to import and render it, and `npm run dev` gives you a hot-reloading dev server at `localhost:5173`. `npm run build` produces a static `dist/` folder you can serve anywhere.

**For production serving**, the build output is just static files — no Node process needed at runtime. You can serve it from:
- nginx (drop `dist/` into the webroot — fits naturally alongside your existing nginx-proxy setup)
- Any S3-compatible bucket with static hosting
- Caddy, if you prefer that

**If you want something even simpler for local iteration**, you can skip the bundler entirely with a CDN-based approach — put this in an `index.html`:

```html
<script type="module">
  import React from "https://esm.sh/react@18";
  import { createRoot } from "https://esm.sh/react-dom@18/client";
  // JSX won't work here without a transform step
</script>
```

But JSX syntax specifically requires a transform, so you'd need to either pre-compile or use `https://esm.sh/htm` as a JSX-free alternative syntax. Not worth the friction unless you really want zero tooling.

**Recommended path for your use case**: Vite dev server locally, then `npm run build` and serve `dist/` via your existing nginx on the DigitalOcean droplet when you want it accessible. The whole pipeline is maybe 10 minutes to set up from scratch.

## Assistant:

> 5/27/2026 8:48:36

Good. Now scaffold the React project around it:

```bash
npm create vite@latest . -- --template react
```

The `.` installs into the current directory. It'll ask if you want to proceed with the existing files — say yes. Then:

```bash
npm install
```

Move your JSX file into `src/`, and update `src/main.jsx` to point at it:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import NERAnnotator from './ner-annotator.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NERAnnotator />
  </StrictMode>
)
```

Then:

```bash
npm run dev
```

And you should be live at `localhost:5173`.

## User:

> 5/27/2026 8:55:29

I just copied ner-annotator.jsx into App.jsx and it worked immediately. Very impressive.

## Assistant:

> 5/27/2026 8:55:32

Nice — Vite's default wiring already imports `App.jsx` so that's the path of least resistance.
