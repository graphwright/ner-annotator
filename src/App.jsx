import { useEffect, useMemo, useRef, useState } from "react";

const SAMPLE_DOCUMENT = {
  sentences: [
    { id: 0, text: "To Sherlock Holmes she is always the woman." },
    { id: 1, text: "I have seldom heard him mention her under any other name." },
    { id: 2, text: "In his eyes she eclipses and predominates the whole of her sex." },
    { id: 3, text: "It was not that he felt any emotion akin to love for Irene Adler." },
    { id: 4, text: "All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind." },
    { id: 5, text: "He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position." },
    { id: 6, text: "He never spoke of the softer passions, save with a gibe and a sneer." },
  ],
  mentions: [
    { id: "m_h0", text: "Sherlock Holmes", pos: "PROPN", sid: 0, start: 3, end: 18 },
    { id: "m_i0", text: "she", pos: "PRON", sid: 0, start: 19, end: 22 },
    { id: "m_i_n0", text: "woman", pos: "NOUN", sid: 0, start: 37, end: 42 },
    { id: "m_w0", text: "I", pos: "PRON", sid: 1, start: 0, end: 1 },
    { id: "m_h1", text: "him", pos: "PRON", sid: 1, start: 20, end: 23 },
    { id: "m_i1", text: "her", pos: "PRON", sid: 1, start: 32, end: 35 },
    { id: "m_h2", text: "his", pos: "PRON", sid: 2, start: 3, end: 6 },
    { id: "m_i2", text: "she", pos: "PRON", sid: 2, start: 12, end: 15 },
    { id: "m_i3", text: "her", pos: "PRON", sid: 2, start: 55, end: 58 },
    { id: "m_it0", text: "It", pos: "PRON", sid: 3, start: 0, end: 2 },
    { id: "m_h3", text: "he", pos: "PRON", sid: 3, start: 16, end: 18 },
    { id: "m_i4", text: "Irene Adler", pos: "PROPN", sid: 3, start: 53, end: 64 },
    { id: "m_em0", text: "All emotions", pos: "NOUN", sid: 4, start: 0, end: 12 },
    { id: "m_h4", text: "his", pos: "PRON", sid: 4, start: 59, end: 62 },
    { id: "m_h_mind", text: "mind", pos: "NOUN", sid: 4, start: 100, end: 104 },
    { id: "m_h5", text: "He", pos: "PRON", sid: 5, start: 0, end: 2 },
    { id: "m_w1", text: "I", pos: "PRON", sid: 5, start: 8, end: 9 },
    { id: "m_h_mach", text: "machine", pos: "NOUN", sid: 5, start: 60, end: 67 },
    { id: "m_h6", text: "he", pos: "PRON", sid: 5, start: 108, end: 110 },
    { id: "m_h7", text: "himself", pos: "PRON", sid: 5, start: 129, end: 136 },
    { id: "m_h8", text: "He", pos: "PRON", sid: 6, start: 0, end: 2 },
  ],
  clusters: [
    {
      id: "c_holmes",
      label: "Holmes",
      color: "#f59e0b",
      mentionIds: ["m_h0", "m_h1", "m_h2", "m_h3", "m_h4", "m_h5", "m_h6", "m_h7", "m_h8", "m_h_mind", "m_h_mach"],
      canonicalId: "character:sherlock_holmes",
      confidence: 0.97,
      provisional: false,
    },
    {
      id: "c_irene",
      label: "Irene Adler",
      color: "#f472b6",
      mentionIds: ["m_i0", "m_i1", "m_i2", "m_i3", "m_i4", "m_i_n0"],
      canonicalId: "character:irene_adler",
      confidence: 0.91,
      provisional: false,
    },
    {
      id: "c_watson",
      label: "Watson",
      color: "#60a5fa",
      mentionIds: ["m_w0", "m_w1"],
      canonicalId: "character:john_watson",
      confidence: 0.88,
      provisional: false,
    },
    {
      id: "c_unresolved",
      label: "Unresolved",
      color: "#94a3b8",
      mentionIds: ["m_it0", "m_em0"],
      canonicalId: null,
      confidence: 0.28,
      provisional: true,
    },
  ],
  entities: {
    "character:sherlock_holmes": {
      label: "Sherlock Holmes",
      type: "character",
      description: "Consulting detective, 221B Baker Street. Central figure of 60 canonical works.",
      url: "https://bakerstreet.fandom.com/wiki/Sherlock_Holmes",
    },
    "character:irene_adler": {
      label: "Irene Adler",
      type: "character",
      description: "Opera contralto and adventuress. Appears in A Scandal in Bohemia (SCAN).",
      url: "https://bakerstreet.fandom.com/wiki/Irene_Adler",
    },
    "character:john_watson": {
      label: "Dr. John H. Watson",
      type: "character",
      description: "Army surgeon, retired. Holmes's companion and first-person narrator.",
      url: "https://bakerstreet.fandom.com/wiki/John_H._Watson",
    },
  },
};

const POS_COLORS = { PROPN: "#fbbf24", PRON: "#93c5fd", NOUN: "#86efac" };
const STAGE_INFO = [
  { n: 1, label: "Mentions", desc: "Raw noun/pronoun detection" },
  { n: 2, label: "Coreference", desc: "Cluster linking" },
  { n: 3, label: "Canonical", desc: "Entity ID resolution (identity service)" },
];

const SERVICE_HELP_TEXT = "Cloudflare Tunnel recommended (alternatives: ngrok, bore.sh, Tailscale Funnel, frp).";
const IDENTITY_SETUP_URL = "https://github.com/graphwright/ner-annotator#identity-service-stage-3";
const CLUSTER_COLORS = ["#f59e0b", "#f472b6", "#60a5fa", "#34d399", "#a78bfa", "#f97316", "#22d3ee", "#94a3b8"];

const PROVIDERS = {
  anthropic: {
    label: "Anthropic",
    defaultModel: "claude-3-5-sonnet-latest",
    endpoint: "https://api.anthropic.com/v1/messages",
  },
  openai: {
    label: "OpenAI",
    defaultModel: "gpt-4.1",
    endpoint: "https://api.openai.com/v1/chat/completions",
  },
};

const toClustersById = (clusters) => Object.fromEntries(clusters.map((cluster) => [cluster.id, { ...cluster }]));
const toMentionsById = (mentions) => Object.fromEntries(mentions.map((mention) => [mention.id, { ...mention }]));

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isSafeInteger = (value) => Number.isInteger(value) && Number.isFinite(value);

const splitSentences = (rawText) => {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (!normalized) throw new Error("Raw text is empty.");
  const matches = normalized.match(/[^.!?\n]+[.!?]?/g) || [];
  const sentences = matches
    .map((text, index) => ({ id: index, text: text.trim() }))
    .filter((sentence) => sentence.text.length > 0);
  if (!sentences.length) throw new Error("Could not derive sentences from raw text.");
  return sentences;
};

const extractJsonString = (text) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  const direct = text.trim();
  if (direct.startsWith("{") || direct.startsWith("[")) return direct;

  const firstBrace = direct.indexOf("{");
  const lastBrace = direct.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return direct.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("Model response did not contain JSON.");
};

const parseModelJson = (text) => {
  const jsonCandidate = extractJsonString(text);
  try {
    return JSON.parse(jsonCandidate);
  } catch {
    throw new Error("Model returned invalid JSON.");
  }
};

const parseStage1Mentions = (payload, sentences) => {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.mentions)) {
    throw new Error("Stage 1 response must be an object with a mentions array.");
  }

  const sentenceById = Object.fromEntries(sentences.map((sentence) => [sentence.id, sentence]));
  const mentions = payload.mentions.map((mention, index) => {
    if (!mention || typeof mention !== "object") throw new Error(`mentions[${index}] must be an object.`);
    if (!isSafeInteger(mention.sid) || !sentenceById[mention.sid]) throw new Error(`mentions[${index}].sid is invalid.`);
    if (!isSafeInteger(mention.start) || !isSafeInteger(mention.end)) throw new Error(`mentions[${index}] start/end must be integers.`);
    if (mention.end <= mention.start) throw new Error(`mentions[${index}] end must be greater than start.`);
    if (typeof mention.text !== "string" || !mention.text.trim()) throw new Error(`mentions[${index}].text is required.`);
    if (typeof mention.pos !== "string" || !mention.pos.trim()) throw new Error(`mentions[${index}].pos is required.`);

    const sentenceText = sentenceById[mention.sid].text;
    if (mention.start < 0 || mention.end > sentenceText.length) {
      throw new Error(`mentions[${index}] span is outside sentence bounds.`);
    }

    return {
      id: typeof mention.id === "string" && mention.id.trim() ? mention.id.trim() : `m_${mention.sid}_${mention.start}_${mention.end}`,
      sid: mention.sid,
      start: mention.start,
      end: mention.end,
      text: mention.text.trim(),
      pos: mention.pos.trim().toUpperCase(),
    };
  });

  const seen = new Set();
  mentions.forEach((mention) => {
    if (seen.has(mention.id)) throw new Error(`Duplicate mention id: ${mention.id}`);
    seen.add(mention.id);
  });

  return mentions.sort((a, b) => a.sid - b.sid || a.start - b.start || a.end - b.end);
};

const parseStage2Clusters = (payload, mentionIds, mentionsById) => {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.clusters)) {
    throw new Error("Stage 2 response must be an object with a clusters array.");
  }

  const knownMentionIds = new Set(mentionIds);
  const usedMentions = new Set();

  const clusters = payload.clusters.map((cluster, index) => {
    if (!cluster || typeof cluster !== "object") throw new Error(`clusters[${index}] must be an object.`);
    const mentionIdArray = Array.isArray(cluster.mentionIds) ? cluster.mentionIds : cluster.mention_ids;
    if (!Array.isArray(mentionIdArray)) throw new Error(`clusters[${index}] must include mentionIds.`);

    const normalizedMentionIds = mentionIdArray.map((mentionId, mentionIndex) => {
      if (typeof mentionId !== "string" || !knownMentionIds.has(mentionId)) {
        throw new Error(`clusters[${index}].mentionIds[${mentionIndex}] is unknown.`);
      }
      if (usedMentions.has(mentionId)) throw new Error(`Mention ${mentionId} appears in multiple clusters.`);
      usedMentions.add(mentionId);
      return mentionId;
    });

    const id = typeof cluster.id === "string" && cluster.id.trim() ? cluster.id.trim() : `c_${index}`;
    const label = typeof cluster.label === "string" && cluster.label.trim() ? cluster.label.trim() : `Cluster ${index + 1}`;
    const confidence = isFiniteNumber(cluster.confidence) ? Math.max(0, Math.min(1, cluster.confidence)) : 0.5;

    return {
      id,
      label,
      color: CLUSTER_COLORS[index % CLUSTER_COLORS.length],
      mentionIds: normalizedMentionIds,
      canonicalId: null,
      confidence,
      provisional: true,
    };
  });

  mentionIds.forEach((mentionId) => {
    if (usedMentions.has(mentionId)) return;
    clusters.push({
      id: `c_singleton_${mentionId}`,
      label: mentionsById[mentionId]?.text || "Singleton",
      color: "#94a3b8",
      mentionIds: [mentionId],
      canonicalId: null,
      confidence: 0.25,
      provisional: true,
    });
  });

  const seenClusterIds = new Set();
  clusters.forEach((cluster) => {
    if (seenClusterIds.has(cluster.id)) throw new Error(`Duplicate cluster id: ${cluster.id}`);
    seenClusterIds.add(cluster.id);
  });

  return clusters;
};

const extractProviderText = (provider, payload) => {
  if (provider === "anthropic") {
    if (!Array.isArray(payload?.content)) throw new Error("Anthropic response missing content.");
    const textBlock = payload.content.find((block) => block?.type === "text");
    if (!textBlock?.text) throw new Error("Anthropic response missing text content.");
    return textBlock.text;
  }

  const message = payload?.choices?.[0]?.message?.content;
  if (typeof message !== "string" || !message.trim()) throw new Error("OpenAI response missing message content.");
  return message;
};

const buildStage1Prompt = (customInstructions, sentences) => `${customInstructions}

Return JSON only with this exact shape:
{
  "mentions": [
    { "id": "m_...", "sid": 0, "start": 0, "end": 5, "text": "...", "pos": "NOUN|PROPN|PRON" }
  ]
}

Rules:
- Keep character offsets exact for each sentence.
- Include only noun/proper-noun/pronoun mentions.
- sid must reference sentence id below.
- Output no markdown, no explanation.

Sentences:
${JSON.stringify(sentences, null, 2)}`;

const buildStage2Prompt = (customInstructions, sentences, mentions) => `${customInstructions}

Return JSON only with this exact shape:
{
  "clusters": [
    { "id": "c_...", "label": "...", "mentionIds": ["m_1", "m_2"], "confidence": 0.0 }
  ]
}

Rules:
- Use only mention IDs provided below.
- Each mention ID may appear in at most one cluster.
- confidence must be between 0 and 1.
- Output no markdown, no explanation.

Sentences:
${JSON.stringify(sentences, null, 2)}

Mentions:
${JSON.stringify(mentions, null, 2)}`;

const normalizeDocument = (raw) => {
  if (!raw || typeof raw !== "object") throw new Error("JSON root must be an object.");
  if (!Array.isArray(raw.sentences) || !Array.isArray(raw.mentions) || !Array.isArray(raw.clusters)) {
    throw new Error("Document must include arrays: sentences, mentions, clusters.");
  }

  const sentences = raw.sentences.map((sentence, index) => {
    if (!sentence || typeof sentence !== "object") throw new Error(`sentences[${index}] must be an object.`);
    if (!isFiniteNumber(sentence.id)) throw new Error(`sentences[${index}].id must be a number.`);
    if (typeof sentence.text !== "string") throw new Error(`sentences[${index}].text must be a string.`);
    return { id: sentence.id, text: sentence.text };
  });

  const sentenceIds = new Set(sentences.map((sentence) => sentence.id));

  const mentions = raw.mentions.map((mention, index) => {
    if (!mention || typeof mention !== "object") throw new Error(`mentions[${index}] must be an object.`);
    if (typeof mention.id !== "string" || !mention.id.trim()) throw new Error(`mentions[${index}].id must be a non-empty string.`);
    if (!isFiniteNumber(mention.sid) || !sentenceIds.has(mention.sid)) throw new Error(`mentions[${index}].sid must match a sentence id.`);
    if (!isFiniteNumber(mention.start) || !isFiniteNumber(mention.end)) throw new Error(`mentions[${index}] start/end must be numbers.`);
    if (mention.end <= mention.start) throw new Error(`mentions[${index}] must have end > start.`);
    if (typeof mention.text !== "string") throw new Error(`mentions[${index}].text must be a string.`);
    if (typeof mention.pos !== "string") throw new Error(`mentions[${index}].pos must be a string.`);
    return {
      id: mention.id,
      sid: mention.sid,
      start: mention.start,
      end: mention.end,
      text: mention.text,
      pos: mention.pos,
    };
  });

  const mentionIds = new Set(mentions.map((mention) => mention.id));

  const clusters = raw.clusters.map((cluster, index) => {
    if (!cluster || typeof cluster !== "object") throw new Error(`clusters[${index}] must be an object.`);
    if (typeof cluster.id !== "string" || !cluster.id.trim()) throw new Error(`clusters[${index}].id must be a non-empty string.`);
    if (typeof cluster.label !== "string") throw new Error(`clusters[${index}].label must be a string.`);
    if (typeof cluster.color !== "string") throw new Error(`clusters[${index}].color must be a string.`);
    if (!Array.isArray(cluster.mentionIds)) throw new Error(`clusters[${index}].mentionIds must be an array.`);

    const normalizedMentionIds = cluster.mentionIds.map((mentionId, mentionIndex) => {
      if (typeof mentionId !== "string" || !mentionIds.has(mentionId)) {
        throw new Error(`clusters[${index}].mentionIds[${mentionIndex}] must reference a known mention id.`);
      }
      return mentionId;
    });

    return {
      id: cluster.id,
      label: cluster.label,
      color: cluster.color,
      mentionIds: normalizedMentionIds,
      canonicalId: typeof cluster.canonicalId === "string" ? cluster.canonicalId : null,
      confidence: isFiniteNumber(cluster.confidence) ? cluster.confidence : 0,
      provisional: typeof cluster.provisional === "boolean" ? cluster.provisional : !cluster.canonicalId,
    };
  });

  const entities = raw.entities && typeof raw.entities === "object" ? raw.entities : {};

  return { sentences, mentions, clusters, entities };
};

const buildSegments = (text, spans) => {
  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  const segments = [];
  let cursor = 0;

  sorted.forEach((span) => {
    let start = Math.max(0, Math.min(text.length, Math.floor(span.start)));
    let end = Math.max(0, Math.min(text.length, Math.floor(span.end)));
    if (end <= start) return;
    if (end <= cursor) return;

    if (start < cursor) start = cursor;

    if (cursor < start) {
      segments.push({ text: text.slice(cursor, start), mid: null });
    }

    segments.push({ text: text.slice(start, end), mid: span.id });
    cursor = end;
  });

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), mid: null });
  }

  return segments;
};

const normalizeServiceResponse = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { canonicalId: null, label: null, url: null, description: null, confidence: null };
  }

  return {
    canonicalId: typeof payload.canonical_id === "string"
      ? payload.canonical_id
      : typeof payload.canonicalId === "string"
        ? payload.canonicalId
        : null,
    label: typeof payload.label === "string" ? payload.label : null,
    url: typeof payload.url === "string" ? payload.url : null,
    description: typeof payload.description === "string" ? payload.description : null,
    confidence: isFiniteNumber(payload.confidence) ? payload.confidence : null,
  };
};

export default function NERAnnotator() {
  const [stage, setStage] = useState(2);
  const [sentences, setSentences] = useState(SAMPLE_DOCUMENT.sentences);
  const [mentionOrder, setMentionOrder] = useState(SAMPLE_DOCUMENT.mentions.map((mention) => mention.id));
  const [mentionsById, setMentionsById] = useState(toMentionsById(SAMPLE_DOCUMENT.mentions));
  const [clusters, setClusters] = useState(toClustersById(SAMPLE_DOCUMENT.clusters));
  const [entities, setEntities] = useState(SAMPLE_DOCUMENT.entities || {});

  const [selectedMid, setSelectedMid] = useState(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [canonicalInput, setCanonicalInput] = useState("");

  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");

  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState(PROVIDERS.anthropic.defaultModel);
  const [apiKey, setApiKey] = useState("");
  const [stage1Prompt, setStage1Prompt] = useState("Identify noun, proper noun, and pronoun mentions.");
  const [stage2Prompt, setStage2Prompt] = useState("Group mentions that refer to the same entity.");
  const [llmState, setLlmState] = useState({ type: "", message: "" });
  const [runningMentions, setRunningMentions] = useState(false);
  const [runningCoref, setRunningCoref] = useState(false);

  const [identityServiceUrl, setIdentityServiceUrl] = useState("");
  const [resolveState, setResolveState] = useState({ type: "", message: "", linkHref: "", linkLabel: "" });
  const [resolving, setResolving] = useState(false);

  const jsonInputRef = useRef(null);
  const rawTextInputRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Courier+Prime:ital@0;1&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const handleProviderChange = (nextProvider) => {
    setProvider(nextProvider);
    setModel(PROVIDERS[nextProvider].defaultModel);
  };

  const callModel = async (prompt) => {
    if (!apiKey.trim()) throw new Error("Provide an API key first.");
    if (!model.trim()) throw new Error("Provide a model name first.");

    if (provider === "anthropic") {
      const response = await fetch(PROVIDERS.anthropic.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: model.trim(),
          max_tokens: 2000,
          temperature: 0,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) throw new Error(`LLM request failed (${response.status}).`);
      return extractProviderText("anthropic", await response.json());
    }

    const response = await fetch(PROVIDERS.openai.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey.trim(),
      },
      body: JSON.stringify({
        model: model.trim(),
        max_tokens: 2000,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`LLM request failed (${response.status}).`);
    return extractProviderText("openai", await response.json());
  };

  const mentionToCluster = useMemo(() => {
    const map = {};
    Object.values(clusters).forEach((cluster) => {
      cluster.mentionIds.forEach((mentionId) => {
        map[mentionId] = cluster.id;
      });
    });
    return map;
  }, [clusters]);

  const sentenceSegments = useMemo(() => {
    const mentionsBySentence = new Map(sentences.map((sentence) => [sentence.id, []]));

    mentionOrder.forEach((mentionId) => {
      const mention = mentionsById[mentionId];
      if (!mention || !mentionsBySentence.has(mention.sid)) return;
      mentionsBySentence.get(mention.sid).push({
        id: mention.id,
        start: mention.start,
        end: mention.end,
      });
    });

    return Object.fromEntries(
      sentences.map((sentence) => [
        sentence.id,
        buildSegments(sentence.text, mentionsBySentence.get(sentence.id) || []),
      ]),
    );
  }, [sentences, mentionOrder, mentionsById]);

  const selectedMention = selectedMid ? mentionsById[selectedMid] : null;
  const selectedCluster = selectedMid ? clusters[mentionToCluster[selectedMid]] : null;
  const selectedEntity = selectedCluster?.canonicalId ? entities[selectedCluster.canonicalId] : null;

  const highlightStyle = (mentionId) => {
    const mention = mentionsById[mentionId];
    if (!mention) return {};
    const isSelected = mentionId === selectedMid;
    const selectedOutline = { outline: "2px solid", outlineOffset: 1 };

    if (stage === 1) {
      const color = POS_COLORS[mention.pos] || "#94a3b8";
      return {
        backgroundColor: color + (isSelected ? "55" : "28"),
        borderBottom: `2px solid ${color}`,
        borderRadius: 2,
        cursor: "pointer",
        padding: "1px 2px",
        ...(isSelected ? { ...selectedOutline, outlineColor: color } : {}),
      };
    }

    const clusterId = mentionToCluster[mentionId];
    const cluster = clusters[clusterId];
    if (!cluster) return {};

    const faded = stage === 3 && cluster.provisional;
    return {
      backgroundColor: cluster.color + (isSelected ? "55" : faded ? "18" : "32"),
      borderBottom: `2px solid ${cluster.color + (faded ? "60" : "cc")}`,
      borderRadius: 2,
      cursor: "pointer",
      padding: "1px 2px",
      ...(isSelected ? { ...selectedOutline, outlineColor: cluster.color } : {}),
    };
  };

  const { matrixClusters, matrix } = useMemo(() => {
    const stableClusters = Object.values(clusters).filter((cluster) => !cluster.provisional);
    const matrixRows = sentences.map((sentence) =>
      Object.fromEntries(
        stableClusters.map((cluster) => [
          cluster.id,
          cluster.mentionIds.some((mentionId) => mentionsById[mentionId]?.sid === sentence.id),
        ]),
      ),
    );
    return { matrixClusters: stableClusters, matrix: matrixRows };
  }, [clusters, sentences, mentionsById]);

  const confColor = (value) => (value > 0.8 ? "#3fb950" : value > 0.5 ? "#f0883e" : "#f85149");

  const resetImportFeedback = () => {
    setImportError("");
    setImportMessage("");
  };

  const applyDocument = (document) => {
    setSentences(document.sentences);
    setMentionOrder(document.mentions.map((mention) => mention.id));
    setMentionsById(toMentionsById(document.mentions));
    setClusters(toClustersById(document.clusters));
    setEntities(document.entities || {});
    setSelectedMid(null);
    setMergeTarget("");
    setCanonicalInput("");
    setResolveState({ type: "", message: "", linkHref: "", linkLabel: "" });
    setLlmState({ type: "", message: "" });
  };

  const handleImportJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetImportFeedback();

    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const normalized = normalizeDocument(raw);
      applyDocument(normalized);
      setImportMessage(`Loaded JSON: ${file.name}`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not import JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleImportRawText = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetImportFeedback();

    try {
      const text = await file.text();
      const parsedSentences = splitSentences(text);
      applyDocument({ sentences: parsedSentences, mentions: [], clusters: [], entities: {} });
      setStage(1);
      setImportMessage(`Loaded raw text: ${file.name}`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not import raw text file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRunMentions = async () => {
    if (!sentences.length) {
      setLlmState({ type: "error", message: "Load raw text or JSON before running stage 1." });
      return;
    }

    setRunningMentions(true);
    setLlmState({ type: "", message: "" });

    try {
      const responseText = await callModel(buildStage1Prompt(stage1Prompt, sentences));
      const parsed = parseModelJson(responseText);
      const mentions = parseStage1Mentions(parsed, sentences);
      setMentionOrder(mentions.map((mention) => mention.id));
      setMentionsById(toMentionsById(mentions));
      setClusters({});
      setEntities({});
      setResolveState({ type: "", message: "", linkHref: "", linkLabel: "" });
      setSelectedMid(null);
      setStage(1);
      setLlmState({ type: "success", message: `Stage 1 complete: ${mentions.length} mentions.` });
    } catch (error) {
      setLlmState({ type: "error", message: error instanceof Error ? error.message : "Stage 1 failed." });
    } finally {
      setRunningMentions(false);
    }
  };

  const handleRunCoref = async () => {
    if (!mentionOrder.length) {
      setLlmState({ type: "error", message: "Run stage 1 first to generate mentions." });
      return;
    }

    setRunningCoref(true);
    setLlmState({ type: "", message: "" });

    try {
      const mentionList = mentionOrder.map((mentionId) => mentionsById[mentionId]).filter(Boolean);
      const responseText = await callModel(buildStage2Prompt(stage2Prompt, sentences, mentionList));
      const parsed = parseModelJson(responseText);
      const corefClusters = parseStage2Clusters(parsed, mentionOrder, mentionsById);
      setClusters(toClustersById(corefClusters));
      setEntities({});
      setResolveState({ type: "", message: "", linkHref: "", linkLabel: "" });
      setSelectedMid(null);
      setStage(2);
      setLlmState({ type: "success", message: `Stage 2 complete: ${corefClusters.length} clusters.` });
    } catch (error) {
      setLlmState({ type: "error", message: error instanceof Error ? error.message : "Stage 2 failed." });
    } finally {
      setRunningCoref(false);
    }
  };

  const handleExport = () => {
    const exportDoc = {
      sentences,
      mentions: mentionOrder.map((mentionId) => mentionsById[mentionId]).filter(Boolean),
      clusters: Object.values(clusters),
      entities,
    };

    const blob = new Blob([JSON.stringify(exportDoc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "annotations.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleMerge = () => {
    if (!mergeTarget || !selectedMid) return;

    const sourceId = mentionToCluster[selectedMid];
    if (!sourceId || sourceId === mergeTarget) return;

    setClusters((prev) => {
      if (!prev[sourceId] || !prev[mergeTarget]) return prev;

      const mergedIds = [...new Set([...prev[mergeTarget].mentionIds, ...prev[sourceId].mentionIds])];
      const next = {
        ...prev,
        [mergeTarget]: {
          ...prev[mergeTarget],
          mentionIds: mergedIds,
          confidence: Math.max(prev[mergeTarget].confidence || 0, prev[sourceId].confidence || 0),
          provisional: prev[mergeTarget].provisional && prev[sourceId].provisional,
        },
      };
      delete next[sourceId];
      return next;
    });

    setMergeTarget("");
    setSelectedMid(null);
  };

  const handleSplit = () => {
    if (!selectedMid) return;

    const sourceId = mentionToCluster[selectedMid];
    if (!sourceId) return;

    setClusters((prev) => {
      if (!prev[sourceId]) return prev;

      const next = { ...prev };
      const remainingIds = next[sourceId].mentionIds.filter((mentionId) => mentionId !== selectedMid);

      if (remainingIds.length > 0) {
        next[sourceId] = { ...next[sourceId], mentionIds: remainingIds };
      } else {
        delete next[sourceId];
      }

      const newId = `c_new_${Date.now()}`;
      const mention = mentionsById[selectedMid];
      next[newId] = {
        id: newId,
        label: mention?.text || "New cluster",
        color: "#94a3b8",
        mentionIds: [selectedMid],
        canonicalId: null,
        confidence: 0.3,
        provisional: true,
      };

      return next;
    });

    setSelectedMid(null);
  };

  const handleSetCanonical = () => {
    if (!selectedCluster || !canonicalInput.trim()) return;
    const canonicalId = canonicalInput.trim();

    setClusters((prev) => ({
      ...prev,
      [selectedCluster.id]: {
        ...prev[selectedCluster.id],
        canonicalId,
        provisional: false,
        confidence: Math.max(prev[selectedCluster.id].confidence || 0, 0.95),
      },
    }));

    setEntities((prev) => ({
      ...prev,
      [canonicalId]: {
        label: prev[canonicalId]?.label || selectedCluster.label,
        type: prev[canonicalId]?.type || "entity",
        description: prev[canonicalId]?.description || "Manually assigned canonical ID.",
        url: prev[canonicalId]?.url || null,
      },
    }));

    setCanonicalInput("");
  };

  const handleResolveCluster = async () => {
    if (!selectedCluster) return;

    if (!identityServiceUrl.trim()) {
      setResolveState({
        type: "warn",
        message: "You need a working identity service to resolve canonical IDs.",
        linkHref: IDENTITY_SETUP_URL,
        linkLabel: "How to set up identity service",
      });
      return;
    }

    setResolving(true);
    setResolveState({ type: "", message: "", linkHref: "", linkLabel: "" });

    try {
      const response = await fetch(identityServiceUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: selectedCluster.label, mentionIds: selectedCluster.mentionIds }),
      });

      if (!response.ok) {
        throw new Error(`Identity service returned ${response.status}.`);
      }

      const payload = normalizeServiceResponse(await response.json());

      if (!payload.canonicalId) {
        setResolveState({
          type: "warn",
          message: "No canonical match returned; cluster remains provisional.",
          linkHref: "",
          linkLabel: "",
        });
        return;
      }

      setClusters((prev) => ({
        ...prev,
        [selectedCluster.id]: {
          ...prev[selectedCluster.id],
          canonicalId: payload.canonicalId,
          provisional: false,
          confidence: payload.confidence ?? Math.max(prev[selectedCluster.id].confidence || 0, 0.95),
        },
      }));

      setEntities((prev) => ({
        ...prev,
        [payload.canonicalId]: {
          label: payload.label || prev[payload.canonicalId]?.label || selectedCluster.label,
          type: prev[payload.canonicalId]?.type || "character",
          description: payload.description || prev[payload.canonicalId]?.description || "Resolved via identity service.",
          url: payload.url || prev[payload.canonicalId]?.url || null,
        },
      }));

      setResolveState({ type: "success", message: `Resolved to ${payload.canonicalId}`, linkHref: "", linkLabel: "" });
    } catch (error) {
      setResolveState({
        type: "warn",
        message: (error instanceof Error ? error.message : "Identity service request failed.") + " Cluster remains provisional.",
        linkHref: IDENTITY_SETUP_URL,
        linkLabel: "Identity service setup guide",
      });
    } finally {
      setResolving(false);
    }
  };

  const s = {
    root: {
      fontFamily: "'DM Sans', sans-serif",
      background: "#0d1117",
      color: "#e2e8f0",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    header: {
      borderBottom: "1px solid #21262d",
      padding: "10px 20px",
      display: "flex",
      alignItems: "center",
      gap: 20,
      background: "#161b22",
      flexShrink: 0,
    },
    logo: { fontSize: 12, color: "#58a6ff", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" },
    subtitle: { fontSize: 10, color: "#484f58", marginTop: 1 },
    stageBtn: (active) => ({
      padding: "5px 12px",
      borderRadius: 5,
      fontFamily: "inherit",
      fontSize: 11,
      cursor: "pointer",
      border: active ? "1px solid #388bfd" : "1px solid #30363d",
      background: active ? "#1f3049" : "transparent",
      color: active ? "#58a6ff" : "#8b949e",
      fontWeight: active ? 600 : 400,
    }),
    stageDesc: { fontSize: 10, color: "#484f58", fontStyle: "italic", marginLeft: "auto" },
    smallInput: {
      background: "#0d1117",
      border: "1px solid #30363d",
      color: "#c9d1d9",
      borderRadius: 4,
      padding: "5px 8px",
      fontSize: 11,
      fontFamily: "inherit",
      outline: "none",
    },
    toolBtn: {
      padding: "5px 10px",
      borderRadius: 4,
      border: "1px solid #30363d",
      background: "#21262d",
      color: "#e2e8f0",
      fontSize: 11,
      cursor: "pointer",
      fontFamily: "inherit",
    },
    body: { display: "flex", flex: 1, overflow: "hidden" },
    textPane: { flex: 1, padding: "24px 32px", overflowY: "auto", borderRight: "1px solid #21262d" },
    callout: (color) => ({
      marginBottom: 14,
      border: `1px solid ${color}55`,
      background: `${color}12`,
      borderRadius: 6,
      padding: "8px 10px",
      color: color,
      fontSize: 11,
    }),
    legend: { display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" },
    legendDot: (color, provisional) => ({
      width: 10,
      height: 10,
      borderRadius: 2,
      background: color + (provisional ? "35" : "55"),
      border: `1px solid ${color + (provisional ? "70" : "bb")}`,
      flexShrink: 0,
    }),
    text: { fontFamily: "'Courier Prime', monospace", fontSize: 16, lineHeight: 2, color: "#c9d1d9", maxWidth: 760 },
    matrixSection: { marginTop: 36, borderTop: "1px solid #21262d", paddingTop: 20 },
    matrixLabel: { fontSize: 10, color: "#484f58", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 },
    panel: {
      width: 320,
      background: "#161b22",
      padding: "20px 16px",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 18,
      flexShrink: 0,
    },
    panelSection: (borderColor) => ({
      background: "#0d1117",
      border: `1px solid ${borderColor || "#30363d"}`,
      borderRadius: 6,
      padding: "12px 13px",
    }),
    sectionLabel: { fontSize: 10, color: "#484f58", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 },
    tag: (color) => ({ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: color + "25", color, border: `1px solid ${color}50` }),
    input: {
      flex: 1,
      background: "#0d1117",
      border: "1px solid #30363d",
      color: "#e2e8f0",
      borderRadius: 4,
      padding: "5px 8px",
      fontSize: 11,
      fontFamily: "monospace",
      outline: "none",
    },
    btn: (enabled, color) => ({
      padding: "5px 10px",
      borderRadius: 4,
      border: "1px solid #30363d",
      background: enabled ? "#21262d" : "transparent",
      color: enabled ? color || "#e2e8f0" : "#484f58",
      fontSize: 11,
      cursor: enabled ? "pointer" : "default",
      fontFamily: "inherit",
    }),
    select: {
      flex: 1,
      background: "#0d1117",
      border: "1px solid #30363d",
      color: "#8b949e",
      borderRadius: 4,
      padding: "5px 8px",
      fontSize: 11,
      fontFamily: "inherit",
      outline: "none",
    },
    textarea: {
      width: "100%",
      minHeight: 74,
      resize: "vertical",
      background: "#0d1117",
      border: "1px solid #30363d",
      color: "#c9d1d9",
      borderRadius: 4,
      padding: "7px 8px",
      fontSize: 11,
      fontFamily: "monospace",
      lineHeight: 1.5,
      outline: "none",
    },
  };

  return (
    <div style={s.root}>
      <header style={s.header}>
        <div>
          <div style={s.logo}>Graphwright</div>
          <div style={s.subtitle}>NER Annotation · A Scandal in Bohemia</div>
        </div>
        <div style={{ display: "flex", gap: 4, marginLeft: 24 }}>
          {STAGE_INFO.map((stageInfo) => (
            <button key={stageInfo.n} style={s.stageBtn(stage === stageInfo.n)} onClick={() => setStage(stageInfo.n)}>
              <span style={{ color: stage === stageInfo.n ? "#58a6ff" : "#484f58", fontWeight: 700, marginRight: 4 }}>{stageInfo.n}.</span>
              {stageInfo.label}
            </button>
          ))}
        </div>
        <select
          value={provider}
          onChange={(event) => handleProviderChange(event.target.value)}
          style={{ ...s.smallInput, width: 110 }}
          aria-label="LLM provider"
        >
          {Object.entries(PROVIDERS).map(([key, providerInfo]) => (
            <option key={key} value={key}>{providerInfo.label}</option>
          ))}
        </select>
        <input
          value={model}
          onChange={(event) => setModel(event.target.value)}
          placeholder="Model"
          style={{ ...s.smallInput, width: 150 }}
          aria-label="Model name"
        />
        <input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="API key (session)"
          style={{ ...s.smallInput, width: 170 }}
          aria-label="API key"
        />
        <button style={s.toolBtn} onClick={() => rawTextInputRef.current?.click()}>Import Raw Text</button>
        <button style={s.toolBtn} onClick={() => jsonInputRef.current?.click()}>Import JSON</button>
        <button style={s.toolBtn} onClick={handleExport}>Download JSON</button>
        <input ref={rawTextInputRef} type="file" accept=".txt,text/plain" style={{ display: "none" }} onChange={handleImportRawText} />
        <input ref={jsonInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportJson} />
        <div style={s.stageDesc}>{STAGE_INFO[stage - 1].desc}</div>
      </header>

      <div style={s.body}>
        <div style={s.textPane}>
          {importError && <div style={s.callout("#f85149")}>{importError}</div>}
          {importMessage && <div style={s.callout("#3fb950")}>{importMessage}</div>}
          {stage === 3 && !identityServiceUrl.trim() && (
            <div style={s.callout("#f0883e")}>
              You need a working identity service to do stage 3.
              {" "}
              <a
                href={IDENTITY_SETUP_URL}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#58a6ff" }}
                aria-label="Setup instructions (opens in new tab)"
              >
                Setup instructions
              </a>
            </div>
          )}

          <div style={s.legend}>
            {stage === 1
              ? Object.entries(POS_COLORS).map(([pos, color]) => (
                <div key={pos} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <div style={s.legendDot(color, false)} />
                  <span style={{ color: "#8b949e" }}>{pos}</span>
                </div>
              ))
              : Object.values(clusters).map((cluster) => (
                <div key={cluster.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <div style={s.legendDot(cluster.color, cluster.provisional)} />
                  <span style={{ color: cluster.provisional ? "#484f58" : "#8b949e", fontStyle: cluster.provisional ? "italic" : "normal" }}>
                    {cluster.label}
                    {stage === 3 && !cluster.provisional && <span style={{ color: "#3fb950", marginLeft: 3 }}>✓</span>}
                    {stage === 3 && cluster.provisional && <span style={{ color: "#f0883e", marginLeft: 3 }}>?</span>}
                  </span>
                </div>
              ))}
          </div>

          <div style={s.text}>
            {sentences.map((sentence) => (
              <span key={sentence.id}>
                {(sentenceSegments[sentence.id] || [{ text: sentence.text, mid: null }]).map((segment, index) => {
                  if (!segment.mid) return <span key={`${sentence.id}-${index}`}>{segment.text}</span>;

                  const isSelected = segment.mid === selectedMid;
                  return (
                    <span
                      key={`${sentence.id}-${index}`}
                      style={highlightStyle(segment.mid)}
                      onClick={() => setSelectedMid(isSelected ? null : segment.mid)}
                    >
                      {segment.text}
                      {stage === 3 && (() => {
                        const cluster = clusters[mentionToCluster[segment.mid]];
                        const mention = mentionsById[segment.mid];
                        return cluster?.canonicalId && mention?.pos === "PROPN"
                          ? <sup style={{ fontSize: 8, color: cluster.color, marginLeft: 1 }}>✓</sup>
                          : null;
                      })()}
                    </span>
                  );
                })}
                {" "}
              </span>
            ))}
          </div>

          <div style={s.matrixSection}>
            <div style={s.matrixLabel}>Character Presence Matrix</div>
            <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: "3px 10px", color: "#484f58", textAlign: "left", fontWeight: 400, fontFamily: "monospace", width: 24 }}>S</th>
                  {matrixClusters.map((cluster) => (
                    <th key={cluster.id} style={{ padding: "3px 14px", color: cluster.color, fontWeight: 500, textAlign: "center", fontSize: 10 }}>
                      {cluster.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sentences.map((sentence, sentenceIndex) => (
                  <tr key={sentence.id} style={{ borderTop: "1px solid #21262d" }}>
                    <td style={{ padding: "3px 10px", color: "#484f58", fontFamily: "monospace" }}>{sentenceIndex}</td>
                    {matrixClusters.map((cluster) => (
                      <td key={cluster.id} style={{ padding: "3px 14px", textAlign: "center" }}>
                        {matrix[sentenceIndex][cluster.id]
                          ? <span style={{ color: cluster.color, fontSize: 13 }}>●</span>
                          : <span style={{ color: "#21262d" }}>·</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={s.panel}>
          <div>
            <div style={s.sectionLabel}>LLM Pipeline</div>
            <div style={s.panelSection("#30363d")}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button onClick={handleRunMentions} disabled={runningMentions} style={s.btn(!runningMentions, "#58a6ff")}>
                  {runningMentions ? "Running stage 1..." : "Run mentions"}
                </button>
                <button onClick={handleRunCoref} disabled={runningCoref || !mentionOrder.length} style={s.btn(!runningCoref && !!mentionOrder.length, "#58a6ff")}>
                  {runningCoref ? "Running stage 2..." : "Run coref"}
                </button>
              </div>
              {llmState.message && (
                <div style={{ fontSize: 10, color: llmState.type === "error" ? "#f85149" : "#3fb950", marginBottom: 8 }}>
                  {llmState.message}
                </div>
              )}
              <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 4 }}>Stage 1 prompt</div>
              <textarea value={stage1Prompt} onChange={(event) => setStage1Prompt(event.target.value)} style={s.textarea} aria-label="Stage 1 prompt" />
              <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 4, marginTop: 10 }}>Stage 2 prompt</div>
              <textarea value={stage2Prompt} onChange={(event) => setStage2Prompt(event.target.value)} style={s.textarea} aria-label="Stage 2 prompt" />
            </div>
          </div>

          {stage === 3 && (
            <div>
              <div style={s.sectionLabel}>Identity Service</div>
              <div style={s.panelSection("#1f6feb55")}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <input
                    value={identityServiceUrl}
                    onChange={(event) => setIdentityServiceUrl(event.target.value)}
                    placeholder="https://...trycloudflare.com"
                    style={s.input}
                  />
                </div>
                <div style={{ color: "#8b949e", fontSize: 10, lineHeight: 1.5, marginBottom: 6 }}>
                  {SERVICE_HELP_TEXT}
                </div>
                {resolveState.message && (
                  <div style={{ fontSize: 10, color: resolveState.type === "error" ? "#f85149" : resolveState.type === "warn" ? "#f0883e" : "#3fb950" }}>
                    {resolveState.message}
                    {resolveState.linkHref && (
                      <>
                        {" "}
                        <a
                          href={resolveState.linkHref}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#58a6ff" }}
                          aria-label={`${resolveState.linkLabel || "Learn more"} (opens in new tab)`}
                        >
                          {resolveState.linkLabel || "Learn more"}
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedMention ? (
            <div style={{ color: "#484f58", fontSize: 11, fontStyle: "italic", textAlign: "center", marginTop: 24, lineHeight: 1.7 }}>
              Click any highlighted
              <br />
              mention to inspect it
            </div>
          ) : (
            <>
              <div>
                <div style={s.sectionLabel}>Mention</div>
                <div style={s.panelSection()}>
                  <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 15, color: "#e2e8f0", marginBottom: 6 }}>
                    "{selectedMention.text}"
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={s.tag(POS_COLORS[selectedMention.pos] || "#94a3b8")}>{selectedMention.pos}</span>
                    <span style={{ fontSize: 10, color: "#484f58" }}>sentence {selectedMention.sid}</span>
                    <span style={{ fontSize: 10, color: "#484f58", fontFamily: "monospace" }}>
                      {selectedMention.start}-{selectedMention.end}
                    </span>
                  </div>
                </div>
              </div>

              {stage >= 2 && selectedCluster && (
                <div>
                  <div style={s.sectionLabel}>Cluster</div>
                  <div style={s.panelSection(selectedCluster.color + "40")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <div style={{ width: 9, height: 9, borderRadius: 2, background: selectedCluster.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: selectedCluster.color }}>{selectedCluster.label}</span>
                      {selectedCluster.provisional && <span style={{ fontSize: 9, color: "#f0883e", marginLeft: "auto" }}>provisional</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 8 }}>
                      Confidence: <span style={{ color: confColor(selectedCluster.confidence) }}>{(selectedCluster.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#484f58", marginBottom: 5 }}>{selectedCluster.mentionIds.length} mentions:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {selectedCluster.mentionIds.map((mentionId) => (
                        <span
                          key={mentionId}
                          onClick={() => setSelectedMid(mentionId)}
                          style={{
                            fontSize: 10,
                            fontFamily: "monospace",
                            padding: "2px 6px",
                            borderRadius: 3,
                            cursor: "pointer",
                            background: mentionId === selectedMid ? selectedCluster.color + "40" : "#21262d",
                            color: mentionId === selectedMid ? selectedCluster.color : "#8b949e",
                            border: `1px solid ${mentionId === selectedMid ? selectedCluster.color + "60" : "transparent"}`,
                          }}
                        >
                          {mentionsById[mentionId]?.text}
                          <span style={{ color: "#484f58", marginLeft: 2 }}>·{mentionsById[mentionId]?.sid}</span>
                        </span>
                      ))}
                    </div>
                    {stage === 3 && (
                      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                        <button
                          onClick={handleResolveCluster}
                          disabled={resolving || !identityServiceUrl.trim()}
                          style={s.btn(!resolving && !!identityServiceUrl.trim(), "#58a6ff")}
                        >
                          {resolving ? "Resolving..." : "Resolve via service"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {stage === 3 && selectedEntity && (
                <div>
                  <div style={s.sectionLabel}>Canonical Entity</div>
                  <div style={s.panelSection("#3fb95030")}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#3fb950", marginBottom: 3 }}>{selectedEntity.label}</div>
                    <div style={{ fontSize: 10, color: "#484f58", fontFamily: "monospace", marginBottom: 7 }}>{selectedCluster?.canonicalId}</div>
                    {selectedEntity.url && (
                      <div style={{ fontSize: 10, marginBottom: 7 }}>
                        <a href={selectedEntity.url} target="_blank" rel="noreferrer" style={{ color: "#58a6ff" }}>
                          {selectedEntity.url}
                        </a>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#8b949e", lineHeight: 1.6 }}>{selectedEntity.description}</div>
                  </div>
                </div>
              )}

              {stage >= 2 && selectedCluster && (
                <div>
                  <div style={s.sectionLabel}>Corrections</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <select value={mergeTarget} onChange={(event) => setMergeTarget(event.target.value)} style={s.select}>
                        <option value="">Merge into…</option>
                        {Object.values(clusters)
                          .filter((cluster) => cluster.id !== mentionToCluster[selectedMid])
                          .map((cluster) => (
                            <option key={cluster.id} value={cluster.id}>{cluster.label}</option>
                          ))}
                      </select>
                      <button onClick={handleMerge} style={s.btn(!!mergeTarget)}>Merge</button>
                    </div>
                    <button onClick={handleSplit} style={{ ...s.btn(true, "#f0883e"), textAlign: "left" }}>
                      Remove → new singleton
                    </button>
                    {stage === 3 && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          value={canonicalInput}
                          onChange={(event) => setCanonicalInput(event.target.value)}
                          onKeyDown={(event) => event.key === "Enter" && handleSetCanonical()}
                          placeholder="Override canonical ID…"
                          style={s.input}
                        />
                        <button onClick={handleSetCanonical} style={s.btn(!!canonicalInput.trim(), "#3fb950")}>Set</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
