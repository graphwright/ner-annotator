# NER Annotator

![Screenshot](https://raw.githubusercontent.com/graphwright/ner-annotator/main/screenshot.png)

Try it live: https://graphwright.github.io/ner-annotator/

NER Annotator is a browser UI for a 3-stage entity workflow:
1. Mention detection (nouns/pronouns)
2. Coreference clustering
3. Canonical entity resolution

## What's implemented

- Offset-based mention rendering (`start`/`end` character spans)
- Cluster editing (merge, split, canonical override)
- Import/export of annotation JSON (round-trip compatible)
- Stage 3 identity-service integration via URL (resolve selected cluster on demand)
- Canonical metadata display (ID, label, URL, description)

## Run locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## JSON wire format

```json
{
  "sentences": [{"id": 0, "text": "To Sherlock Holmes she is always the woman."}],
  "mentions": [{"id": "m_h0", "sid": 0, "start": 3, "end": 18, "text": "Sherlock Holmes", "pos": "PROPN"}],
  "clusters": [{
    "id": "c_holmes",
    "label": "Holmes",
    "color": "#f59e0b",
    "mentionIds": ["m_h0"],
    "canonicalId": "character:sherlock_holmes",
    "confidence": 0.97,
    "provisional": false
  }],
  "entities": {
    "character:sherlock_holmes": {
      "label": "Sherlock Holmes",
      "type": "character",
      "description": "Consulting detective",
      "url": "https://..."
    }
  }
}
```

Notes:
- `entities` is optional.
- Imported documents are validated before loading.
- Overlapping or invalid mention spans are clipped/skipped safely in rendering.

## Identity service (stage 3)

Stage 3 resolves canonical IDs by calling an identity service URL you provide.

Recommended path:
- Run a local service (example: `examples/identity_service.py`)
- Expose it with a reverse tunnel (Cloudflare Tunnel recommended)
- Paste the tunnel URL into the Stage 3 identity-service field

### Example local service

```bash
python examples/identity_service.py --port 7700
```

### Example tunnel (Cloudflare)

```bash
cloudflared tunnel --url http://localhost:7700
```

Alternatives: ngrok, bore.sh, Tailscale Funnel, frp.

### Why not GitHub Pages as relay?

GitHub Pages is static hosting only; it cannot proxy tunnel traffic.
A separate relay/tunnel service is required.

## Deferred items

- Direct browser-to-LLM provider calls (Claude/OpenAI)
- Local persistence of API keys or session state

Both are feasible and may be added later, but are intentionally deferred.
