import { useState, useMemo, useEffect } from "react";

// ── DATA ──────────────────────────────────────────────────────────────────────

const SENTENCES = [
  { id: 0, text: "To Sherlock Holmes she is always the woman." },
  { id: 1, text: "I have seldom heard him mention her under any other name." },
  { id: 2, text: "In his eyes she eclipses and predominates the whole of her sex." },
  { id: 3, text: "It was not that he felt any emotion akin to love for Irene Adler." },
  { id: 4, text: "All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind." },
  { id: 5, text: "He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position." },
  { id: 6, text: "He never spoke of the softer passions, save with a gibe and a sneer." },
];

// Pre-segmented sentence text for rendering
const SENTENCE_SEGMENTS = [
  [
    { text: "To ", mid: null },
    { text: "Sherlock Holmes", mid: "m_h0" },
    { text: " ", mid: null },
    { text: "she", mid: "m_i0" },
    { text: " is always the ", mid: null },
    { text: "woman", mid: "m_i_n0" },
    { text: ".", mid: null },
  ],
  [
    { text: "I", mid: "m_w0" },
    { text: " have seldom heard ", mid: null },
    { text: "him", mid: "m_h1" },
    { text: " mention ", mid: null },
    { text: "her", mid: "m_i1" },
    { text: " under any other name.", mid: null },
  ],
  [
    { text: "In ", mid: null },
    { text: "his", mid: "m_h2" },
    { text: " eyes ", mid: null },
    { text: "she", mid: "m_i2" },
    { text: " eclipses and predominates the whole of ", mid: null },
    { text: "her", mid: "m_i3" },
    { text: " sex.", mid: null },
  ],
  [
    { text: "It", mid: "m_it0" },
    { text: " was not that ", mid: null },
    { text: "he", mid: "m_h3" },
    { text: " felt any emotion akin to love for ", mid: null },
    { text: "Irene Adler", mid: "m_i4" },
    { text: ".", mid: null },
  ],
  [
    { text: "All emotions", mid: "m_em0" },
    { text: ", and that one particularly, were abhorrent to ", mid: null },
    { text: "his", mid: "m_h4" },
    { text: " cold, precise but admirably balanced ", mid: null },
    { text: "mind", mid: "m_h_mind" },
    { text: ".", mid: null },
  ],
  [
    { text: "He", mid: "m_h5" },
    { text: " was, ", mid: null },
    { text: "I", mid: "m_w1" },
    { text: " take it, the most perfect reasoning and observing ", mid: null },
    { text: "machine", mid: "m_h_mach" },
    { text: " that the world has seen, but as a lover ", mid: null },
    { text: "he", mid: "m_h6" },
    { text: " would have placed ", mid: null },
    { text: "himself", mid: "m_h7" },
    { text: " in a false position.", mid: null },
  ],
  [
    { text: "He", mid: "m_h8" },
    { text: " never spoke of the softer passions, save with a gibe and a sneer.", mid: null },
  ],
];

const MENTIONS = {
  m_h0:     { id: "m_h0",     text: "Sherlock Holmes", pos: "PROPN", sid: 0 },
  m_i0:     { id: "m_i0",     text: "she",             pos: "PRON",  sid: 0 },
  m_i_n0:   { id: "m_i_n0",   text: "woman",           pos: "NOUN",  sid: 0 },
  m_w0:     { id: "m_w0",     text: "I",               pos: "PRON",  sid: 1 },
  m_h1:     { id: "m_h1",     text: "him",             pos: "PRON",  sid: 1 },
  m_i1:     { id: "m_i1",     text: "her",             pos: "PRON",  sid: 1 },
  m_h2:     { id: "m_h2",     text: "his",             pos: "PRON",  sid: 2 },
  m_i2:     { id: "m_i2",     text: "she",             pos: "PRON",  sid: 2 },
  m_i3:     { id: "m_i3",     text: "her",             pos: "PRON",  sid: 2 },
  m_it0:    { id: "m_it0",    text: "It",              pos: "PRON",  sid: 3 },
  m_h3:     { id: "m_h3",     text: "he",              pos: "PRON",  sid: 3 },
  m_i4:     { id: "m_i4",     text: "Irene Adler",     pos: "PROPN", sid: 3 },
  m_em0:    { id: "m_em0",    text: "All emotions",    pos: "NOUN",  sid: 4 },
  m_h4:     { id: "m_h4",     text: "his",             pos: "PRON",  sid: 4 },
  m_h_mind: { id: "m_h_mind", text: "mind",            pos: "NOUN",  sid: 4 },
  m_h5:     { id: "m_h5",     text: "He",              pos: "PRON",  sid: 5 },
  m_w1:     { id: "m_w1",     text: "I",               pos: "PRON",  sid: 5 },
  m_h_mach: { id: "m_h_mach", text: "machine",         pos: "NOUN",  sid: 5 },
  m_h6:     { id: "m_h6",     text: "he",              pos: "PRON",  sid: 5 },
  m_h7:     { id: "m_h7",     text: "himself",         pos: "PRON",  sid: 5 },
  m_h8:     { id: "m_h8",     text: "He",              pos: "PRON",  sid: 6 },
};

const INITIAL_CLUSTERS = {
  c_holmes: {
    id: "c_holmes", label: "Holmes", color: "#f59e0b",
    mentionIds: ["m_h0","m_h1","m_h2","m_h3","m_h4","m_h5","m_h6","m_h7","m_h8","m_h_mind","m_h_mach"],
    canonicalId: "character:sherlock_holmes", confidence: 0.97, provisional: false,
  },
  c_irene: {
    id: "c_irene", label: "Irene Adler", color: "#f472b6",
    mentionIds: ["m_i0","m_i1","m_i2","m_i3","m_i4","m_i_n0"],
    canonicalId: "character:irene_adler", confidence: 0.91, provisional: false,
  },
  c_watson: {
    id: "c_watson", label: "Watson", color: "#60a5fa",
    mentionIds: ["m_w0","m_w1"],
    canonicalId: "character:john_watson", confidence: 0.88, provisional: false,
  },
  c_unresolved: {
    id: "c_unresolved", label: "Unresolved", color: "#94a3b8",
    mentionIds: ["m_it0","m_em0"],
    canonicalId: null, confidence: 0.28, provisional: true,
  },
};

const ENTITIES = {
  "character:sherlock_holmes": {
    label: "Sherlock Holmes", type: "character",
    description: "Consulting detective, 221B Baker Street. Central figure of 60 canonical works.",
  },
  "character:irene_adler": {
    label: "Irene Adler", type: "character",
    description: "Opera contralto and adventuress. Appears in A Scandal in Bohemia (SCAN).",
  },
  "character:john_watson": {
    label: "Dr. John H. Watson", type: "character",
    description: "Army surgeon, retired. Holmes's companion and first-person narrator.",
  },
};

const POS_COLORS = { PROPN: "#fbbf24", PRON: "#93c5fd", NOUN: "#86efac" };
const STAGE_INFO = [
  { n: 1, label: "Mentions",     desc: "Raw noun/pronoun detection" },
  { n: 2, label: "Coreference",  desc: "Cluster linking" },
  { n: 3, label: "Canonical",    desc: "Entity ID resolution" },
];

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function NERAnnotator() {
  const [stage, setStage] = useState(2);
  const [clusters, setClusters] = useState(INITIAL_CLUSTERS);
  const [selectedMid, setSelectedMid] = useState(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [canonicalInput, setCanonicalInput] = useState("");

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Courier+Prime:ital@0;1&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const mentionToCluster = useMemo(() => {
    const map = {};
    Object.values(clusters).forEach(c => c.mentionIds.forEach(mid => { map[mid] = c.id; }));
    return map;
  }, [clusters]);

  const selectedMention = selectedMid ? MENTIONS[selectedMid] : null;
  const selectedCluster = selectedMid ? clusters[mentionToCluster[selectedMid]] : null;
  const selectedEntity  = selectedCluster?.canonicalId ? ENTITIES[selectedCluster.canonicalId] : null;

  const highlightStyle = (mid) => {
    const m = MENTIONS[mid];
    if (!m) return {};
    const isSel = mid === selectedMid;
    const sel = { outline: "2px solid", outlineOffset: 1 };

    if (stage === 1) {
      const c = POS_COLORS[m.pos] || "#94a3b8";
      return { backgroundColor: c + (isSel ? "55" : "28"), borderBottom: `2px solid ${c}`, borderRadius: 2, cursor: "pointer", padding: "1px 2px", ...(isSel ? { ...sel, outlineColor: c } : {}) };
    }
    const cid = mentionToCluster[mid];
    const cl = clusters[cid];
    if (!cl) return {};
    const c = cl.color;
    const faded = stage === 3 && cl.provisional;
    return {
      backgroundColor: c + (isSel ? "55" : faded ? "18" : "32"),
      borderBottom: `2px solid ${c + (faded ? "60" : "cc")}`,
      borderRadius: 2, cursor: "pointer", padding: "1px 2px",
      ...(isSel ? { ...sel, outlineColor: c } : {}),
    };
  };

  // Presence matrix — non-provisional clusters only
  const { matrixClusters, matrix } = useMemo(() => {
    const matrixClusters = Object.values(clusters).filter(c => !c.provisional);
    const matrix = SENTENCES.map(s =>
      Object.fromEntries(matrixClusters.map(c => [c.id, c.mentionIds.some(mid => MENTIONS[mid]?.sid === s.id)]))
    );
    return { matrixClusters, matrix };
  }, [clusters]);

  // ── Corrections ──
  const handleMerge = () => {
    if (!mergeTarget || !selectedMid) return;
    const srcId = mentionToCluster[selectedMid];
    if (srcId === mergeTarget) return;
    setClusters(prev => {
      const next = { ...prev };
      next[mergeTarget] = { ...next[mergeTarget], mentionIds: [...next[mergeTarget].mentionIds, ...next[srcId].mentionIds] };
      delete next[srcId];
      return next;
    });
    setMergeTarget(""); setSelectedMid(null);
  };

  const handleSplit = () => {
    if (!selectedMid) return;
    const srcId = mentionToCluster[selectedMid];
    setClusters(prev => {
      const next = { ...prev };
      next[srcId] = { ...next[srcId], mentionIds: next[srcId].mentionIds.filter(m => m !== selectedMid) };
      const newId = `c_new_${Date.now()}`;
      next[newId] = { id: newId, label: MENTIONS[selectedMid].text, color: "#94a3b8", mentionIds: [selectedMid], canonicalId: null, confidence: 0.3, provisional: true };
      return next;
    });
    setSelectedMid(null);
  };

  const handleSetCanonical = () => {
    if (!selectedCluster || !canonicalInput.trim()) return;
    setClusters(prev => ({
      ...prev,
      [selectedCluster.id]: { ...prev[selectedCluster.id], canonicalId: canonicalInput.trim(), provisional: false, confidence: 1.0 }
    }));
    setCanonicalInput("");
  };

  // ── Styles ──
  const s = {
    root: { fontFamily: "'DM Sans', sans-serif", background: "#0d1117", color: "#e2e8f0", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" },
    header: { borderBottom: "1px solid #21262d", padding: "10px 20px", display: "flex", alignItems: "center", gap: 20, background: "#161b22", flexShrink: 0 },
    logo: { fontSize: 12, color: "#58a6ff", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" },
    subtitle: { fontSize: 10, color: "#484f58", marginTop: 1 },
    stageBtn: (active) => ({
      padding: "5px 12px", borderRadius: 5, fontFamily: "inherit", fontSize: 11, cursor: "pointer",
      border: active ? "1px solid #388bfd" : "1px solid #30363d",
      background: active ? "#1f3049" : "transparent",
      color: active ? "#58a6ff" : "#8b949e",
      fontWeight: active ? 600 : 400,
    }),
    stageDesc: { fontSize: 10, color: "#484f58", fontStyle: "italic", marginLeft: "auto" },
    body: { display: "flex", flex: 1, overflow: "hidden" },
    textPane: { flex: 1, padding: "24px 32px", overflowY: "auto", borderRight: "1px solid #21262d" },
    legend: { display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" },
    legendDot: (color, provisional) => ({ width: 10, height: 10, borderRadius: 2, background: color + (provisional ? "35" : "55"), border: `1px solid ${color + (provisional ? "70" : "bb")}`, flexShrink: 0 }),
    text: { fontFamily: "'Courier Prime', monospace", fontSize: 16, lineHeight: 2, color: "#c9d1d9", maxWidth: 660 },
    matrixSection: { marginTop: 36, borderTop: "1px solid #21262d", paddingTop: 20 },
    matrixLabel: { fontSize: 10, color: "#484f58", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 },
    panel: { width: 300, background: "#161b22", padding: "20px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, flexShrink: 0 },
    panelSection: (borderColor) => ({ background: "#0d1117", border: `1px solid ${borderColor || "#30363d"}`, borderRadius: 6, padding: "12px 13px" }),
    sectionLabel: { fontSize: 10, color: "#484f58", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 },
    tag: (color) => ({ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: color + "25", color: color, border: `1px solid ${color}50` }),
    input: { flex: 1, background: "#0d1117", border: "1px solid #30363d", color: "#e2e8f0", borderRadius: 4, padding: "5px 8px", fontSize: 11, fontFamily: "monospace", outline: "none" },
    btn: (enabled, color) => ({
      padding: "5px 10px", borderRadius: 4, border: "1px solid #30363d",
      background: enabled ? "#21262d" : "transparent",
      color: enabled ? (color || "#e2e8f0") : "#484f58",
      fontSize: 11, cursor: enabled ? "pointer" : "default", fontFamily: "inherit",
    }),
    select: { flex: 1, background: "#0d1117", border: "1px solid #30363d", color: "#8b949e", borderRadius: 4, padding: "5px 8px", fontSize: 11, fontFamily: "inherit", outline: "none" },
  };

  const confColor = (v) => v > 0.8 ? "#3fb950" : v > 0.5 ? "#f0883e" : "#f85149";

  return (
    <div style={s.root}>
      {/* Header */}
      <header style={s.header}>
        <div>
          <div style={s.logo}>Graphwright</div>
          <div style={s.subtitle}>NER Annotation · A Scandal in Bohemia</div>
        </div>
        <div style={{ display: "flex", gap: 4, marginLeft: 24 }}>
          {STAGE_INFO.map(st => (
            <button key={st.n} style={s.stageBtn(stage === st.n)} onClick={() => setStage(st.n)}>
              <span style={{ color: stage === st.n ? "#58a6ff" : "#484f58", fontWeight: 700, marginRight: 4 }}>{st.n}.</span>
              {st.label}
            </button>
          ))}
        </div>
        <div style={s.stageDesc}>{STAGE_INFO[stage - 1].desc}</div>
      </header>

      <div style={s.body}>
        {/* Text pane */}
        <div style={s.textPane}>
          {/* Legend */}
          <div style={s.legend}>
            {stage === 1
              ? Object.entries(POS_COLORS).map(([pos, color]) => (
                  <div key={pos} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <div style={s.legendDot(color, false)} />
                    <span style={{ color: "#8b949e" }}>{pos}</span>
                  </div>
                ))
              : Object.values(clusters).map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <div style={s.legendDot(c.color, c.provisional)} />
                    <span style={{ color: c.provisional ? "#484f58" : "#8b949e", fontStyle: c.provisional ? "italic" : "normal" }}>
                      {c.label}
                      {stage === 3 && !c.provisional && <span style={{ color: "#3fb950", marginLeft: 3 }}>✓</span>}
                      {stage === 3 && c.provisional  && <span style={{ color: "#f0883e", marginLeft: 3 }}>?</span>}
                    </span>
                  </div>
                ))
            }
          </div>

          {/* Annotated text */}
          <div style={s.text}>
            {SENTENCE_SEGMENTS.map((segs, si) => (
              <span key={si}>
                {segs.map((seg, idx) => {
                  if (!seg.mid) return <span key={idx}>{seg.text}</span>;
                  const isSel = seg.mid === selectedMid;
                  return (
                    <span key={idx} style={highlightStyle(seg.mid)} onClick={() => setSelectedMid(isSel ? null : seg.mid)}>
                      {seg.text}
                      {stage === 3 && (() => {
                        const cl = clusters[mentionToCluster[seg.mid]];
                        return cl?.canonicalId && MENTIONS[seg.mid]?.pos === "PROPN"
                          ? <sup style={{ fontSize: 8, color: cl.color, marginLeft: 1 }}>✓</sup>
                          : null;
                      })()}
                    </span>
                  );
                })}
                {" "}
              </span>
            ))}
          </div>

          {/* Presence matrix */}
          <div style={s.matrixSection}>
            <div style={s.matrixLabel}>Character Presence Matrix</div>
            <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: "3px 10px", color: "#484f58", textAlign: "left", fontWeight: 400, fontFamily: "monospace", width: 24 }}>S</th>
                  {matrixClusters.map(c => (
                    <th key={c.id} style={{ padding: "3px 14px", color: c.color, fontWeight: 500, textAlign: "center", fontSize: 10 }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SENTENCES.map((s_, si) => (
                  <tr key={s_.id} style={{ borderTop: "1px solid #21262d" }}>
                    <td style={{ padding: "3px 10px", color: "#484f58", fontFamily: "monospace" }}>{si}</td>
                    {matrixClusters.map(c => (
                      <td key={c.id} style={{ padding: "3px 14px", textAlign: "center" }}>
                        {matrix[si][c.id]
                          ? <span style={{ color: c.color, fontSize: 13 }}>●</span>
                          : <span style={{ color: "#21262d" }}>·</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        <div style={s.panel}>
          {!selectedMention ? (
            <div style={{ color: "#484f58", fontSize: 11, fontStyle: "italic", textAlign: "center", marginTop: 48, lineHeight: 1.7 }}>
              Click any highlighted<br />mention to inspect it
            </div>
          ) : (<>
            {/* Mention */}
            <div>
              <div style={s.sectionLabel}>Mention</div>
              <div style={s.panelSection()}>
                <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 15, color: "#e2e8f0", marginBottom: 6 }}>
                  "{selectedMention.text}"
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={s.tag(POS_COLORS[selectedMention.pos] || "#94a3b8")}>{selectedMention.pos}</span>
                  <span style={{ fontSize: 10, color: "#484f58" }}>sentence {selectedMention.sid}</span>
                </div>
              </div>
            </div>

            {/* Cluster */}
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
                  <div style={{ fontSize: 10, color: "#484f58", marginBottom: 5 }}>
                    {selectedCluster.mentionIds.length} mentions:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {selectedCluster.mentionIds.map(mid => (
                      <span key={mid} onClick={() => setSelectedMid(mid)} style={{
                        fontSize: 10, fontFamily: "monospace", padding: "2px 6px", borderRadius: 3, cursor: "pointer",
                        background: mid === selectedMid ? selectedCluster.color + "40" : "#21262d",
                        color: mid === selectedMid ? selectedCluster.color : "#8b949e",
                        border: `1px solid ${mid === selectedMid ? selectedCluster.color + "60" : "transparent"}`,
                      }}>
                        {MENTIONS[mid]?.text}
                        <span style={{ color: "#484f58", marginLeft: 2 }}>·{MENTIONS[mid]?.sid}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Entity */}
            {stage === 3 && selectedEntity && (
              <div>
                <div style={s.sectionLabel}>Canonical Entity</div>
                <div style={s.panelSection("#3fb95030")}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#3fb950", marginBottom: 3 }}>{selectedEntity.label}</div>
                  <div style={{ fontSize: 10, color: "#484f58", fontFamily: "monospace", marginBottom: 7 }}>{selectedCluster.canonicalId}</div>
                  <div style={{ fontSize: 11, color: "#8b949e", lineHeight: 1.6 }}>{selectedEntity.description}</div>
                </div>
              </div>
            )}

            {/* Corrections */}
            {stage >= 2 && (
              <div>
                <div style={s.sectionLabel}>Corrections</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {/* Merge */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <select value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} style={s.select}>
                      <option value="">Merge into…</option>
                      {Object.values(clusters)
                        .filter(c => c.id !== mentionToCluster[selectedMid])
                        .map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <button onClick={handleMerge} style={s.btn(!!mergeTarget)}>Merge</button>
                  </div>
                  {/* Split */}
                  <button onClick={handleSplit} style={{ ...s.btn(true, "#f0883e"), textAlign: "left" }}>
                    Remove → new singleton
                  </button>
                  {/* Override canonical (stage 3 only) */}
                  {stage === 3 && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={canonicalInput}
                        onChange={e => setCanonicalInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSetCanonical()}
                        placeholder="Override canonical ID…"
                        style={s.input}
                      />
                      <button onClick={handleSetCanonical} style={s.btn(!!canonicalInput.trim(), "#3fb950")}>Set</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>)}
        </div>
      </div>
    </div>
  );
}
