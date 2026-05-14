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

function ResearcherInbox({ palette = 'warm', scale = 1 }) {
  const C = window.PALETTES[palette] || window.PALETTES.warm;
  const [active, setActive] = React.useState('req-12');
  const [reqs, setReqs] = React.useState(MOCK_REQUESTS);
  const current = reqs.find((r) => r.id === active);

  const setStatus = (id, status) => setReqs(reqs.map((r) => r.id === id ? { ...r, status } : r));

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
            <div style={{ display:'flex', gap: 8 }}>
              {current.status === 'pending' ? (
                <>
                  <button onClick={() => setStatus(current.id, 'confirmed')} style={{
                    padding: '9px 16px', borderRadius: 999, background: C.ink, color: C.surface,
                    border: 'none', fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}>확정 후 문자 발송</button>
                  <button style={{
                    padding: '9px 14px', borderRadius: 999, background: 'transparent',
                    border: `1px solid ${C.line}`, color: C.ink, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
                  }}>일정 변경 요청</button>
                </>
              ) : (
                <span style={{ fontSize: 12, color: C.muted }}>5/5 18:42에 확정 문자 발송됨</span>
              )}
            </div>
          </div>

          <section style={{
            display:'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12,
            marginBottom: 22,
          }}>
            <Cell C={C} k="이름" v={current.name} />
            <Cell C={C} k="생년월일" v={current.dob} />
            <Cell C={C} k="휴대전화" v={current.phone} mono />
            <Cell C={C} k="참여자 ID" v={current.pid} mono />
          </section>

          <section style={{
            background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
            padding: '18px 22px', marginBottom: 18,
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>요청한 세션 · 3회</div>
              <div style={{ fontSize: 11, color: C.muted }}>모두 가능 시간대 · 충돌 없음</div>
            </div>
            {current.sessions.map((s, i) => {
              const d = window.dayByKey(s.key).date;
              return (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns: '32px 1fr 200px 80px', gap: 16, alignItems:'center',
                  padding: '12px 0', borderTop: i > 0 ? `1px solid ${C.line}` : 'none',
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 11, background: i === 0 ? C.a : i === 1 ? C.b : C.c,
                    display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize: 11, fontWeight: 500,
                  }}>{i+1}</span>
                  <div style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{window.fmtKoDate(d)}</div>
                  <div style={{ fontSize: 13, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                    {s.time} – {window.addMin(s.time, 40)}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, textAlign: 'right' }}>실험실 B3</div>
                </div>
              );
            })}
          </section>

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

Object.assign(window, { ResearcherInbox });
