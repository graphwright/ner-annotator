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
- Import raw text (`.txt`) and JSON annotation files
- Stage 1 LLM mention extraction (nouns/proper nouns/pronouns) with strict JSON parsing and schema validation
- Stage 2 LLM coreference clustering with strict JSON parsing, schema validation, and separate run action
- Session-only LLM configuration (provider, model, API key) in the header
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

## LLM stages (1 and 2)

Stages 1 and 2 can call Anthropic or OpenAI directly from the browser.

- API key is session-only (not persisted to localStorage)
- Provider and model are selectable in the header
- Stage 1 and Stage 2 prompts are editable independently in the right panel
- Stage 2 (`Run coref`) is intentionally separate so stage-1 output can be reviewed/edited first
- Raw text sentence splitting is intentionally lightweight and may need cleanup for abbreviations/edge punctuation
- Browser API-key mode is for experimentation; keys are exposed to browser/network tooling and should not be production secrets

### Stage 1 response schema

```json
{
  "mentions": [
    { "id": "m_0", "sid": 0, "start": 0, "end": 4, "text": "John", "pos": "PROPN" }
  ]
}
```

### Stage 2 response schema

```json
{
  "clusters": [
    { "id": "c_0", "label": "John", "mentionIds": ["m_0"], "confidence": 0.9 }
  ]
}
```

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

- Local persistence of API keys or session state
