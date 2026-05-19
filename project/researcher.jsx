// Researcher inbox: mock of the email the PI receives when a participant submits.
// Two-pane layout — list of pending requests on the left, detail on the right.

const MOCK_REQUESTS = [
  {
    id: 'req-12',
    name: '김민지', dob: '2002-08-14', phone: '010-2845-3119', pid: 'P-024',
    submittedAt: '2026-07-08 14:22',
    status: 'pending',
    sessions: [
      { key: '2026-07-13', time: '10:55' },
      { key: '2026-07-16', time: '14:00' },
      { key: '2026-07-20', time: '15:55' }],
  },
  {
    id: 'req-11',
    name: '박지훈', dob: '1999-02-03', phone: '010-7712-0044', pid: 'P-023',
    submittedAt: '2026-07-08 11:08',
    status: 'pending',
    sessions: [
      { key: '2026-07-14', time: '09:55' },
      { key: '2026-07-18', time: '13:05' },
      { key: '2026-07-22', time: '11:50' }],
  },
  {
    id: 'req-10',
    name: '이수아', dob: '2001-11-29', phone: '010-3361-9802', pid: 'P-022',
    submittedAt: '2026-07-07 18:40',
    status: 'confirmed',
    sessions: [
      { key: '2026-07-12', time: '13:55' },
      { key: '2026-07-15', time: '11:50' },
      { key: '2026-07-17', time: '16:50' }],
  },
];

function ResearcherInbox({ palette = 'warm', scale = 1, requests, setRequests }) {
  const C = window.PALETTES[palette] || window.PALETTES.warm;
  // Fall back to local state if no shared store was passed in (e.g. standalone preview).
  const [localReqs, setLocalReqs] = React.useState(MOCK_REQUESTS);
  const reqs = requests || localReqs;
  const setReqs = setRequests || setLocalReqs;

  // Default to the most recent (top of list) when the active id isn't in the list anymore.
  const [active, setActive] = React.useState(reqs[0]?.id);
  React.useEffect(() => {
    if (!reqs.find((r) => r.id === active)) setActive(reqs[0]?.id);
  }, [reqs, active]);
  const current = reqs.find((r) => r.id === active) || reqs[0];
  if (!current) {
    return (
      <div style={{
        width: 1200, height: 820, background: C.bg, color: C.ink,
        fontFamily: '"Söhne","Inter","Helvetica Neue",system-ui,sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 24px 60px -30px rgba(0,0,0,0.18)',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, color: C.muted, textTransform: 'uppercase', marginBottom: 10 }}>
            받은편지함
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>대기 중인 신청이 없습니다</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            새 참여자 신청이 접수되면 이곳에 표시됩니다.
          </div>
        </div>
      </div>
    );
  }

  const setStatus = (id, status) => setReqs(reqs.map((r) => r.id === id ? { ...r, status } : r));
  const patchCurrent = (patch) => setReqs(reqs.map((r) => r.id === active ? { ...r, ...patch } : r));
  const deleteCurrent = () => setReqs(reqs.filter((r) => r.id !== active));

  return (
    <div style={{
      width: 1200, height: 820, background: C.bg, color: C.ink,
      fontFamily: '"Söhne","Inter","Helvetica Neue",system-ui,sans-serif',
      display: 'flex', flexDirection: 'column',
      borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 24px 60px -30px rgba(0,0,0,0.18)',
      transform: scale !== 1 ? `scale(${scale})` : undefined,
      transformOrigin: 'top left',
    }}>
      {/* Top bar */}
      <header style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding: '14px 24px', borderBottom: `1px solid ${C.line}`,
        background: C.surface, fontSize: 12, color: C.muted,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: `linear-gradient(135deg, ${C.a}, ${C.b})`, border: `1px solid ${C.line}` }} />
          <span style={{ color: C.ink, fontWeight: 500 }}>Pepper Study</span>
          <span style={{ color: C.muted }}>· 연구자 받은편지함</span>
        </div>
        <div style={{ display:'flex', gap: 16 }}>
          <span>대기 {reqs.filter((r) => r.status === 'pending').length}</span>
          <span>확정 {reqs.filter((r) => r.status === 'confirmed').length}</span>
        </div>
      </header>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: 0 }}>
        {/* List */}
        <aside style={{
          borderRight: `1px solid ${C.line}`, overflow: 'auto',
          background: C.surface,
        }}>
          <div style={{ padding: '16px 18px 8px', fontSize: 11, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            새 신청
          </div>
          {reqs.map((r) => {
            const isActive = r.id === active;
            const earliest = r.sessions[0];
            return (
              <button key={r.id} onClick={() => setActive(r.id)} style={{
                width: '100%', textAlign: 'left',
                padding: '14px 18px',
                background: isActive ? C.bg : 'transparent',
                border: 'none',
                borderLeft: isActive ? `2px solid ${C.ink}` : '2px solid transparent',
                borderBottom: `1px solid ${C.line}`,
                cursor: 'pointer', fontFamily: 'inherit', color: C.ink,
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
                  <StatusPill C={C} status={r.status} />
                </div>
                <div style={{ fontSize: 12, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                  {r.pid} · 첫 세션 {window.fmtKoDate(window.dayByKey(earliest.key).date)} {earliest.time}
                </div>
                <div style={{ fontSize: 11, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>접수 {r.submittedAt}</div>
              </button>
            );
          })}
        </aside>

        {/* Detail */}
        <main style={{ padding: '28px 36px 32px', overflow: 'auto' }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
            새 일정 신청 · {current.id}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 22 }}>
            <h2 style={{ fontSize: 24, fontWeight: 500, margin: 0, letterSpacing: -0.2 }}>
              {current.name}님의 세션 신청
            </h2>
            <div style={{ display:'flex', gap: 8, alignItems: 'center' }}>
              {current.status === 'pending' ? (
                <>
                  <button onClick={() => setStatus(current.id, 'confirmed')} style={{
                    padding: '9px 16px', borderRadius: 999, background: C.ink, color: C.surface,
                    border: 'none', fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}>확정으로 변경</button>
                  <button style={{
                    padding: '9px 14px', borderRadius: 999, background: 'transparent',
                    border: `1px solid ${C.line}`, color: C.ink, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
                  }}>일정 변경 요청</button>
                </>
              ) : (
                <span style={{ fontSize: 12, color: C.muted }}>{current.submittedAt.slice(5)}에 확정됨</span>
              )}
              <DeleteRequestButton C={C} onDelete={() => deleteCurrent()} />
            </div>
          </div>

          <section style={{
            display:'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12,
            marginBottom: 22,
          }}>
            <Cell C={C} k="이름" v={current.name} />
            <Cell C={C} k="생년월일" v={current.dob} />
            <Cell C={C} k="휴대전화" v={current.phone} mono />
            <EditableCell C={C} k="참여자 ID" v={current.pid} mono
                          placeholder="P-000"
                          onChange={(v) => patchCurrent({ pid: v })} />
          </section>

          <SessionsBlock C={C} current={current} patchCurrent={patchCurrent} />

          {/* SMS template */}
          <section style={{
            background: C.bg, border: `1px dashed ${C.line}`, borderRadius: 12,
            padding: '16px 20px',
          }}>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
              발송할 문자 미리보기
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.ink, fontFamily: 'inherit' }}>
              [Pepper Study] {current.name}님, 신청해 주신 3개 세션이 확정되었습니다.<br/>
              · {window.fmtKoDate(window.dayByKey(current.sessions[0].key).date)} {current.sessions[0].time}<br/>
              · {window.fmtKoDate(window.dayByKey(current.sessions[1].key).date)} {current.sessions[1].time}<br/>
              · {window.fmtKoDate(window.dayByKey(current.sessions[2].key).date)} {current.sessions[2].time}<br/>
              장소: 실험실 B3 · 변경 시 회신 부탁드립니다.
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function StatusPill({ C, status }) {
  const map = {
    pending:   { bg: C.a, label: '검토 대기' },
    confirmed: { bg: C.b, label: '확정' },
  };
  const m = map[status] || map.pending;
  return (
    <span style={{
      fontSize: 10, padding: '3px 8px', borderRadius: 999,
      background: m.bg, color: C.ink, letterSpacing: 0.3,
    }}>{m.label}</span>
  );
}

// Two-step delete confirm so a stray click doesn't nuke a real submission.
function DeleteRequestButton({ C, onDelete }) {
  const [confirming, setConfirming] = React.useState(false);
  const timerRef = React.useRef(null);

  // Auto-collapse back to idle if the researcher doesn't follow through.
  React.useEffect(() => {
    if (!confirming) return;
    timerRef.current = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timerRef.current);
  }, [confirming]);

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)}
              title="이 신청 건 삭제"
              style={{
                padding: '9px 10px', borderRadius: 999, background: 'transparent',
                border: `1px solid ${C.line}`, color: C.muted,
                fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 4,
              }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
        삭제
      </button>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 4,
      padding: '3px 4px 3px 12px', borderRadius: 999,
      background: C.bg, border: `1px solid ${C.accent}`,
    }}>
      <span style={{ fontSize: 11, color: C.accent, fontWeight: 500 }}>정말 삭제할까요?</span>
      <button onClick={() => { setConfirming(false); onDelete(); }} style={{
        padding: '5px 12px', borderRadius: 999, background: C.accent, color: '#fff',
        border: 'none', fontFamily: 'inherit', fontSize: 11, fontWeight: 500, cursor: 'pointer',
      }}>삭제</button>
      <button onClick={() => setConfirming(false)} style={{
        padding: '5px 10px', borderRadius: 999, background: 'transparent',
        color: C.muted, border: 'none', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer',
      }}>취소</button>
    </span>
  );
}

// Inline-editable variant of Cell. Click anywhere on it to edit; Enter/blur saves.
function EditableCell({ C, k, v, mono, placeholder, onChange }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(v);
  const inputRef = React.useRef(null);

  React.useEffect(() => { setDraft(v); }, [v]);
  React.useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    const trimmed = (draft || '').trim();
    if (trimmed && trimmed !== v) onChange(trimmed);
    else setDraft(v);
    setEditing(false);
  };
  const cancel = () => { setDraft(v); setEditing(false); };

  return (
    <div onClick={() => !editing && setEditing(true)}
         style={{
           background: C.surface, border: `1px solid ${editing ? C.ink : C.line}`, borderRadius: 10,
           padding: '12px 14px', cursor: editing ? 'text' : 'pointer',
           position: 'relative', transition: 'border-color 120ms',
         }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 11, color: C.muted, marginBottom: 4,
      }}>
        <span>{k}</span>
        {!editing && (
          <span style={{ fontSize: 10, color: C.muted, opacity: 0.7 }}>✎ 수정</span>
        )}
      </div>
      {editing ? (
        <input
          ref={inputRef}
          value={draft || ''}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none',
            padding: 0, margin: 0, color: C.ink,
            fontFamily: 'inherit', fontSize: 14, fontWeight: 500, letterSpacing: -0.1,
            fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
          }}
        />
      ) : (
        <div style={{
          fontSize: 14, fontWeight: 500, letterSpacing: -0.1,
          fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
          color: v ? C.ink : C.muted,
        }}>{v || placeholder}</div>
      )}
    </div>
  );
}

// Sessions block — read-only by default, becomes editable when researcher clicks "세션 수정".
function SessionsBlock({ C, current, patchCurrent }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(current.sessions);

  // Reset draft whenever we switch between requests or exit edit mode.
  React.useEffect(() => { setDraft(current.sessions); }, [current.id, current.sessions]);

  const startEdit = () => { setDraft(current.sessions); setEditing(true); };
  const cancel = () => { setDraft(current.sessions); setEditing(false); };
  const save = () => { patchCurrent({ sessions: draft }); setEditing(false); };

  const updateSession = (idx, patch) => {
    setDraft(draft.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  // Validation while editing: each pair of sessions must be on different days, ≥1 day apart.
  const validationError = React.useMemo(() => {
    if (!editing) return null;
    for (let i = 0; i < draft.length; i++) {
      if (!draft[i].key || !draft[i].time) return '날짜와 시간을 모두 선택해 주세요.';
      for (let j = i + 1; j < draft.length; j++) {
        if (draft[i].key === draft[j].key) return '같은 날짜에 두 세션을 배치할 수 없습니다.';
      }
    }
    return null;
  }, [editing, draft]);

  const sessions = editing ? draft : current.sessions;

  return (
    <section style={{
      background: C.surface, border: `1px solid ${editing ? C.ink : C.line}`, borderRadius: 12,
      padding: '18px 22px', marginBottom: 18,
      transition: 'border-color 160ms',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>요청한 세션 · 3회</div>
        {!editing ? (
          <button onClick={startEdit} style={{
            background: 'transparent', border: `1px solid ${C.line}`, color: C.ink,
            borderRadius: 999, padding: '5px 12px', fontFamily: 'inherit', fontSize: 11,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            세션 수정
          </button>
        ) : (
          <div style={{ fontSize: 11, color: C.muted }}>참여자의 일정 변경 요청을 반영합니다</div>
        )}
      </div>

      {sessions.map((s, i) => {
        const dot = (
          <span style={{
            width: 22, height: 22, borderRadius: 11,
            background: i === 0 ? C.a : i === 1 ? C.b : C.c,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 500, flexShrink: 0,
          }}>{i + 1}</span>
        );
        if (editing) {
          return (
            <SessionEditorRow key={i} C={C} session={s} index={i} dot={dot}
                              onChange={(patch) => updateSession(i, patch)}
                              isFirst={i === 0} />
          );
        }
        const d = window.dayByKey(s.key)?.date;
        return (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 200px 80px', gap: 16, alignItems: 'center',
            padding: '12px 0', borderTop: i > 0 ? `1px solid ${C.line}` : 'none',
          }}>
            {dot}
            <div style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{d ? window.fmtKoDate(d) : s.key}</div>
            <div style={{ fontSize: 13, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
              {s.time} – {window.addMin(s.time, 40)}
            </div>
            <div style={{ fontSize: 11, color: C.muted, textAlign: 'right' }}>실험실 B3</div>
          </div>
        );
      })}

      {editing && (
        <div style={{
          marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 12, color: validationError ? C.accent : C.muted, minHeight: 18 }}>
            {validationError || '시간대는 원래 가능 시간 내에서만 선택할 수 있습니다.'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cancel} style={{
              background: 'transparent', border: `1px solid ${C.line}`, color: C.ink,
              borderRadius: 999, padding: '7px 14px', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
            }}>취소</button>
            <button onClick={save} disabled={!!validationError} style={{
              background: C.ink, color: C.surface, border: 'none',
              borderRadius: 999, padding: '7px 16px', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
              cursor: validationError ? 'not-allowed' : 'pointer',
              opacity: validationError ? 0.4 : 1,
            }}>변경 저장</button>
          </div>
        </div>
      )}
    </section>
  );
}

// Single editable session row (date select + time select, both constrained by AVAILABILITY).
function SessionEditorRow({ C, session, index, dot, onChange, isFirst }) {
  const availableDays = window.AVAILABILITY.filter((d) => d.slots.some((s) => !s.taken));
  const currentDay = window.dayByKey(session.key);
  const availableTimes = currentDay
    ? currentDay.slots.filter((s) => !s.taken || s.time === session.time)
    : [];

  const selectStyle = {
    background: C.bg, border: `1px solid ${C.line}`, borderRadius: 8,
    padding: '8px 12px', fontFamily: 'inherit', fontSize: 13, color: C.ink,
    fontVariantNumeric: 'tabular-nums', cursor: 'pointer', outline: 'none',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='${encodeURIComponent(C.muted)}' stroke-width='1.4' fill='none' stroke-linecap='round'/></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 30,
  };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '32px 1fr 200px 80px', gap: 16, alignItems: 'center',
      padding: '10px 0', borderTop: !isFirst ? `1px solid ${C.line}` : 'none',
    }}>
      {dot}
      <select value={session.key}
              onChange={(e) => {
                const newDay = window.dayByKey(e.target.value);
                const firstFree = newDay?.slots.find((s) => !s.taken);
                onChange({ key: e.target.value, time: firstFree ? firstFree.time : session.time });
              }}
              style={selectStyle}>
        {availableDays.map((d) => (
          <option key={d.key} value={d.key}>{window.fmtKoDate(d.date)}</option>
        ))}
      </select>
      <select value={session.time}
              onChange={(e) => onChange({ time: e.target.value })}
              style={selectStyle}>
        {availableTimes.map((s) => (
          <option key={s.time} value={s.time}>{s.time} – {window.addMin(s.time, 40)}</option>
        ))}
      </select>
      <div style={{ fontSize: 11, color: C.muted, textAlign: 'right' }}>실험실 B3</div>
    </div>
  );
}

function Cell({ C, k, v, mono }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10,
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{k}</div>
      <div style={{
        fontSize: 14, fontWeight: 500, letterSpacing: -0.1,
        fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
      }}>{v}</div>
    </div>
  );
}

Object.assign(window, { ResearcherInbox, MOCK_REQUESTS });
