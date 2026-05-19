// Pepper experiment — participant booking flow.
// Three calendar styles share this component; pass `calendarStyle` prop.
//
// Flow:
//   1. Intro     — study blurb + "예약 시작"
//   2. Sessions  — pick 3 slots (gated by spacingRule = ≥1 day apart)
//   3. Details   — name / DOB / phone / participant ID + consent
//   4. Confirm   — "연구팀과 확인 후 안내" screen

const PALETTES = {
  warm: { bg: '#f6f2ec', surface: '#fbf8f3', ink: '#2a2722', muted: '#7a7268', line: '#e8e0d3', a: '#e8d5c4', b: '#c9d6c4', c: '#d6c9d9', accent: '#8a6d52' },
  sage: { bg: '#f4f5f0', surface: '#fafbf6', ink: '#262924', muted: '#737568', line: '#e1e3d8', a: '#cdd9c8', b: '#c5d0db', c: '#e3dcc6', accent: '#5e7259' },
  blush: { bg: '#fbf7f4', surface: '#fffdfb', ink: '#2b2422', muted: '#7e7068', line: '#ede2db', a: '#f2d4cf', b: '#cdd6e8', c: '#e9dccb', accent: '#a4625a' },
  stone: { bg: '#f3f1ee', surface: '#f9f8f5', ink: '#252523', muted: '#73706a', line: '#e3e0d9', a: '#d4d4d4', b: '#bfc8c2', c: '#c2bdb4', accent: '#5d5a52' },
  iris: { bg: '#f7f4ef', surface: '#fcfaf6', ink: '#2a2730', muted: '#76707c', line: '#e8e1d6', a: '#d8c8e0', b: '#cce0d6', c: '#f0d6c8', accent: '#6e5a82' }
};

// ── Date helpers ────────────────────────────────────────────────────────────
const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const KO_MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addDays = (d, n) => {const x = new Date(d);x.setDate(x.getDate() + n);return x;};
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtKoDate = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${KO_DAYS[d.getDay()]})`;
const fmtTime = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

// Anchor "today" to the first day of the scheduling window so the demo is reproducible.
const TODAY = new Date(2026, 6, 12); // 2026-07-12, a Sunday
const WINDOW_END = addDays(TODAY, 14); // window runs through 2026-07-25 inclusive

// Per-day availability hours [startHour, endHour) — end is exclusive (a session
// must finish by this hour). Days not listed here have no availability.
const DAY_HOURS = {
  '2026-07-12': [13, 21],
  '2026-07-13': [9, 21],
  '2026-07-14': [9, 21],
  '2026-07-15': [9, 21],
  '2026-07-16': [9, 21],
  '2026-07-17': [9, 21],
  '2026-07-18': [9, 21],
  '2026-07-19': [13, 21],
  '2026-07-20': [9, 21],
  '2026-07-21': [9, 21],
  '2026-07-22': [9, 21],
  '2026-07-23': [9, 21],
  '2026-07-24': [9, 21],
  '2026-07-25': [9, 21]
};

// Generate availability: 40-min sessions + 15-min buffer (55m blocks).
// A handful of "taken" slots simulate the researcher's existing GCal events.
function buildAvailability() {
  const taken = new Set([
  '2026-07-13_10:00', '2026-07-13_14:50',
  '2026-07-14_11:50', '2026-07-14_16:50',
  '2026-07-15_09:55', '2026-07-15_15:55',
  '2026-07-16_13:05', '2026-07-17_10:50', '2026-07-17_19:30',
  '2026-07-20_09:00', '2026-07-20_14:00',
  '2026-07-21_11:50', '2026-07-22_15:55',
  '2026-07-23_10:00', '2026-07-23_18:25',
  '2026-07-24_13:05']
  );
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(TODAY, i);
    const key = ymd(d);
    const hours = DAY_HOURS[key];
    const slots = [];
    if (hours) {
      const [startHour, endHour] = hours;
      let h = startHour, m = 0;
      while (h * 60 + m + 40 <= endHour * 60) {
        const t = fmtTime(h, m);
        const slotKey = `${key}_${t}`;
        slots.push({ time: t, taken: taken.has(slotKey) });
        m += 55;
        while (m >= 60) {m -= 60;h += 1;}
      }
    }
    days.push({ date: d, key, slots });
  }
  return days;
}

const AVAILABILITY = buildAvailability();
const dayByKey = (k) => AVAILABILITY.find((d) => d.key === k);

// ── Booking app ─────────────────────────────────────────────────────────────
function BookingApp({ palette = 'warm', calendarStyle = 'month-drawer', showConsent = true, scale = 1, onSubmit, bookedSlots }) {
  const C = PALETTES[palette] || PALETTES.warm;
  const [step, setStep] = React.useState('intro'); // intro | info | sessions | details | confirm
  // selected: array of { key, time }
  const [selected, setSelected] = React.useState([]);
  const [form, setForm] = React.useState({ name: '', dob: '', phone: '', pid: '', consent: false });
  const [readInfo, setReadInfo] = React.useState(false);

  // Layer the live "booked by other participants" set on top of the static
  // schedule so slots claimed by pending or confirmed requests aren't re-bookable.
  const availability = React.useMemo(() => {
    if (!bookedSlots || bookedSlots.size === 0) return AVAILABILITY;
    return AVAILABILITY.map((d) => ({
      ...d,
      slots: d.slots.map((s) => ({
        ...s,
        taken: s.taken || bookedSlots.has(`${d.key}_${s.time}`)
      }))
    }));
  }, [bookedSlots]);
  const lookupDay = React.useCallback((k) => availability.find((d) => d.key === k), [availability]);

  // If a previously selected slot has just been taken by someone else, drop it.
  React.useEffect(() => {
    if (!bookedSlots || bookedSlots.size === 0) return;
    setSelected((sel) => sel.filter((s) => !bookedSlots.has(`${s.key}_${s.time}`)));
  }, [bookedSlots]);

  const reset = () => {setStep('intro');setSelected([]);setForm({ name: '', dob: '', phone: '', pid: '', consent: false });setReadInfo(false);};

  // Hand the completed submission to the parent so the researcher inbox sees it.
  const submit = () => {
    if (onSubmit) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      onSubmit({
        id: `req-${now.getTime()}`,
        name: form.name.trim(),
        dob: form.dob,
        phone: form.phone.trim(),
        pid: '', // researcher assigns
        submittedAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
        status: 'pending',
        sessions: selected.map((s) => ({ key: s.key, time: s.time })),
      });
    }
    setStep('confirm');
  };

  const stepIdx = { intro: 0, info: 1, sessions: 2, details: 3, confirm: 4 }[step];

  return (
    <div style={{
      ...frameStyle(C),
      transform: scale !== 1 ? `scale(${scale})` : undefined,
      transformOrigin: 'top left'
    }}>
      <Header C={C} step={step} stepIdx={stepIdx} />

      <div style={{ flex: 1, overflow: 'auto', padding: '36px 56px 56px' }}>
        {step === 'intro' && <Intro C={C} onNext={() => setStep('info')} />}
        {step === 'info' &&
        <StudyInfo C={C} readInfo={readInfo} setReadInfo={setReadInfo}
        onBack={() => setStep('intro')} onNext={() => setStep('sessions')} />
        }
        {step === 'sessions' &&
        <Sessions
          C={C}
          calendarStyle={calendarStyle}
          availability={availability}
          dayByKey={lookupDay}
          selected={selected}
          setSelected={setSelected}
          onBack={() => setStep('info')}
          onNext={() => setStep('details')} />

        }
        {step === 'details' &&
        <Details
          C={C}
          form={form}
          setForm={setForm}
          selected={selected}
          showConsent={showConsent}
          onBack={() => setStep('sessions')}
          onNext={submit} />

        }
        {step === 'confirm' &&
        <Confirm C={C} form={form} selected={selected} onReset={reset} />
        }
      </div>
    </div>);

}

// ── Frame & header ──────────────────────────────────────────────────────────
const frameStyle = (C) => ({
  width: 1200,
  height: 820,
  background: C.bg,
  color: C.ink,
  fontFamily: '"Söhne","Inter","Helvetica Neue",system-ui,sans-serif',
  fontFeatureSettings: '"ss01","cv11"',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 12,
  overflow: 'hidden',
  boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 24px 60px -30px rgba(0,0,0,0.18)'
});

function Header({ C, step, stepIdx }) {
  const labels = ['소개', '연구 설명', '세션 선택', '참여자 정보', '신청 완료'];
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 56px',
      borderBottom: `1px solid ${C.line}`,
      background: C.surface
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: `linear-gradient(135deg, ${C.a}, ${C.b})`,
          border: `1px solid ${C.line}`
        }} />
        <div style={{ fontSize: 14, letterSpacing: 0.2 }}>
          <div style={{ fontWeight: 500 }}>Pepper Study</div>
          <div style={{ color: C.muted, fontSize: 12 }}>참여자 일정 예약</div>
        </div>
      </div>
      <ol style={{
        display: 'flex', gap: 8, listStyle: 'none', margin: 0, padding: 0,
        fontSize: 12, color: C.muted
      }}>
        {labels.map((l, i) => {
          const active = i === stepIdx;
          const done = i < stepIdx;
          return (
            <li key={l} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: active ? C.ink : done ? C.ink : C.muted,
              opacity: done ? 0.7 : 1
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 9,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: active ? C.ink : done ? C.line : 'transparent',
                color: active ? C.surface : C.ink,
                border: active ? 'none' : `1px solid ${C.line}`,
                fontSize: 11, fontWeight: 500
              }}>{i + 1}</span>
              <span style={{ fontWeight: active ? 500 : 400 }}>{l}</span>
              {i < labels.length - 1 && <span style={{ width: 14, height: 1, background: C.line, marginLeft: 4 }} />}
            </li>);

        })}
      </ol>
    </header>);

}

// ── Intro screen ────────────────────────────────────────────────────────────
function Intro({ C, onNext }) {
  return (
    <div style={{ maxWidth: 720, margin: '12px auto 0' }}>
      <div style={{ fontSize: 12, letterSpacing: 1.2, color: C.muted, textTransform: 'uppercase', marginBottom: 16 }}>
        Pepper · 인간–로봇 상호작용 연구
      </div>
      <h1 style={{
        fontSize: 36, fontWeight: 500, lineHeight: 1.2, letterSpacing: -0.4,
        margin: '0 0 20px', textWrap: 'pretty'
      }}>
        안녕하세요,<br />소셜 로봇 페퍼 연구팀입니다.
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: C.ink, opacity: 0.84, margin: '0 0 28px', textWrap: 'pretty' }}>이 연구는 사람들이 소셜 로봇 페퍼(Pepper)와 반복적으로 대화할 때 자신의 생각을 어떻게 소통하는지, 그리고 로봇의
설계가 그러한 소통 방식 및 관계적 결과에 어떠한 영향을 미치는지 알아보고자 설계된 실험 연구입니다.


      </p>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        margin: '0 0 36px'
      }}>
        <FactCard C={C} swatch={C.a} k="세션 수" v="3회" sub="각 40분" />
        <FactCard C={C} swatch={C.b} k="기간" v="2주 이내" sub="최소 1일 간격" />
        <FactCard C={C} swatch={C.c} k="장소" v="실험실 대면" sub="세부사항 안내" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onNext} style={primaryBtn(C)}>연구 설명 보기 →</button>
        <span style={{ fontSize: 13, color: C.muted }}>전체 약 3분 소요</span>
      </div>
    </div>);

}

// ── Study info (연구참여설명서) ────────────────────────────────────────────
function StudyInfo({ C, readInfo, setReadInfo, onBack, onNext }) {
  const scrollRef = React.useRef(null);
  const [atBottom, setAtBottom] = React.useState(false);
  const [hasOverflow, setHasOverflow] = React.useState(false);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    setAtBottom(bottom);
    if (bottom) setReadInfo(true);
  };

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setHasOverflow(el.scrollHeight > el.clientHeight + 4);

    // The DesignCanvas viewport intercepts wheel events for pan/zoom (with
    // preventDefault), so a normal bubbled wheel never reaches our scroll box.
    // Capture the event early, scroll manually, and stop it from reaching the canvas.
    const onWheelCapture = (e) => {
      const canScroll = el.scrollHeight > el.clientHeight;
      if (!canScroll) return;
      const atTop = el.scrollTop <= 0;
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      const goingDown = e.deltaY > 0;
      const goingUp = e.deltaY < 0;
      // Only consume the event if there's room to scroll in that direction
      if ((goingDown && !atEnd) || (goingUp && !atTop)) {
        e.stopPropagation();
        e.preventDefault();
        el.scrollTop += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheelCapture, { passive: false });
    return () => el.removeEventListener('wheel', onWheelCapture);
  }, []);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };
  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ fontSize: 12, letterSpacing: 1.2, color: C.muted, textTransform: 'uppercase', marginBottom: 10 }}>
        Step 2 · 사전 안내
      </div>
      <h2 style={{ fontSize: 28, fontWeight: 500, margin: '0 0 6px', letterSpacing: -0.3 }}>연구참여설명서</h2>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px' }}>
        예약 전, 아래 내용을 충분히 읽어주시기 바랍니다.
      </p>

      <div style={{ position: 'relative' }}>
      <div ref={scrollRef} onScroll={onScroll} style={{
          background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
          padding: '28px 36px', maxHeight: 380, overflow: 'auto',
          fontSize: 15, lineHeight: 1.8, color: C.ink,
          scrollBehavior: 'smooth'
        }}>
        <p style={{ margin: '0 0 14px' }}>
          본 연구의 목적은 사람들이 소셜 로봇 페퍼(Pepper)와 반복적으로 대화할 때 자신의 소통 방식을 로봇에 맞게
          조율하는 행동을 보이는지, 그리고 로봇의 설계가 그러한 조율 행동 및 관계적 결과에 어떠한 영향을 미치는지
          이해하는 것입니다. 이를 통해 사람들이 기계와의 소통에서도 대인 상호작용과 유사한 행동을 보이는지 파악하고,
          향후 소셜 로봇 설계 및 인간–기계 상호작용 연구에 필요한 경험적 근거를 마련하고자 합니다.
        </p>

        <InfoH C={C}>1) 연구참여대상 및 연구대상자 수</InfoH>
        <p style={{ margin: '0 0 16px' }}>
          본 연구는 만 18세 이상 남녀로서 3번의 세션에 걸쳐 소셜 로봇과 약 10분 정도 대화하는 것이 가능한 사람들이
          참여할 수 있습니다. 모집되신 연구대상자들을 다시 제외할 기준은 없습니다. 연구 참여는 자발적이며,
          대략 <strong style={{ fontWeight: 500 }}>55명</strong>의 실험 참여자를 모집할 계획입니다.
        </p>

        <InfoH C={C}>2) 연구참여기간</InfoH>
        <p style={{ margin: '0 0 16px' }}>
          이 연구는 <strong style={{ fontWeight: 500 }}>2026년 6월 초부터 12월 초순까지</strong> 진행될 예정입니다.
          단 한 번의 실험에 참여하는 시간은 약 <strong style={{ fontWeight: 500 }}>30분에서 50분 정도</strong>
          (실험 안내 + 사전 설문 + 대화 세션 + 사후 설문 + 디브리핑)일 것으로 예상됩니다.
        </p>

        <InfoH C={C}>3) 연구 진행 과정 및 참여 방법</InfoH>
        <p style={{ margin: '0 0 12px' }}>
          연구는 다음과 같은 과정으로 진행됩니다. 귀하는 본 실험 연구에 대한 소개를 보시고 참여에 응하셨을 것입니다.
          이 실험은 <strong style={{ fontWeight: 500 }}>1~2주에 걸쳐 총 세 차례의 세션</strong>으로 구성되어 있으며,
          각 세션은 일주일 간격으로 진행됩니다.
        </p>
        <ul style={{ margin: '0 0 18px', paddingLeft: 20, listStyle: 'disc' }}>
          <li style={{ margin: '0 0 10px' }}>
            <strong style={{ fontWeight: 500 }}>정보 제공 및 동의 (약 3분)</strong> · 실험 시작 전 연구 참여 설명서를 검토하시고,
            궁금한 점에 대해 보조 연구원이 답변해 드립니다. 내용을 충분히 확인하신 후 참여 동의서에 서명하시게 됩니다.
          </li>
          <li style={{ margin: '0 0 10px' }}>
            <strong style={{ fontWeight: 500 }}>사전 설문 (약 5분)</strong> · 연령, 성별 등 기본적인 인구통계학적 질문과 함께
            로봇에 대한 사전 태도 및 소통 조절 의향에 관한 설문에 응답하시게 됩니다. 사전 설문은 첫 번째 세션에서만 진행됩니다.
          </li>
          <li style={{ margin: '0 0 10px' }}>
            <strong style={{ fontWeight: 500 }}>소셜 로봇 페퍼(Pepper)와의 대화 세션 (세션당 약 5~10분)</strong> ·
            페퍼와 1:1로 대화를 나누시게 됩니다. 각 세션은 약 1주일 간격으로 진행되며, 대화 내용은 분석을 위해 텍스트로
            기록됩니다. 매 세션 대화가 끝난 후에는 간단한 사후 설문에 응답하시게 됩니다.
          </li>
          <li style={{ margin: '0 0 10px' }}>
            <strong style={{ fontWeight: 500 }}>반구조화 인터뷰 (약 30분, 마지막 세션에만 진행)</strong> ·
            세 번째 세션이 끝난 후 연구원과의 인터뷰가 진행됩니다. 인터뷰에는 페퍼와의 대화 경험 및 인식 변화에 관한
            개방형 질문이 포함되며, 정확한 분석을 위해 음성 녹음됩니다. 수집된 자료는 연구 이외의 목적으로 사용되지 않습니다.
          </li>
          <li style={{ margin: '0 0 0' }}>
            <strong style={{ fontWeight: 500 }}>마무리 및 보상 지급 (약 3~5분)</strong> · 궁금한 점을 질문하실 수 있으며,
            보조 연구원이 간단한 안내를 드립니다. 모든 세션이 종료된 후 참여 보상(5만원 상당)이 지급됩니다.
          </li>
        </ul>

        <InfoH C={C}>4) 개인정보 및 자료 처리</InfoH>
        <p style={{ margin: '0 0 12px' }}>
          대화 세션 및 인터뷰는 연구 목적의 기록 및 분석을 위해 녹음·녹화될 수 있으며, 수집된 모든 자료는 무기명으로
          처리되어 연구 이외의 목적으로 사용되지 않습니다.
        </p>
        <p style={{ margin: '0 0 18px' }}>
          참여 보상 지급을 위해 성명, 전화번호, 은행 계좌번호, 신분증 정보가 수집될 수 있으며, 관련 법규에 따라
          안전하게 관리된 후 연구 종료 시 폐기됩니다.
        </p>

        <div style={{
            marginTop: 18, paddingTop: 14, borderTop: `1px dashed ${C.line}`,
            fontSize: 12, color: C.muted, lineHeight: 1.7
          }}>
          책임 연구자 · 이선경 교수님 (sunnylee@korea.ac.kr)<br />
          연구 후원 기관 · 고려대학교, 한국연구재단<br />
          실험 관련 문의 · 지여원 조교 (jessi2001@korea.ac.kr)
        </div>
      </div>

      {/* Scroll-to-bottom CTA — visible while there's still content below */}
      <button onClick={scrollToBottom}
        aria-label="맨 아래로 스크롤"
        style={{
          position: 'absolute', right: 18, bottom: 18,
          display: hasOverflow && !atBottom ? 'inline-flex' : 'none',
          alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 999,
          background: C.ink, color: C.surface, border: 'none',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 4px 14px -4px rgba(0,0,0,0.25)'
        }}>
        끝까지 보기
        <span style={{ fontSize: 14, lineHeight: 1 }}>↓</span>
      </button>

      {/* Bottom fade hint — there's more below */}
      <div style={{
          position: 'absolute', left: 1, right: 1, bottom: 1, height: 48,
          borderRadius: '0 0 12px 12px', pointerEvents: 'none',
          background: `linear-gradient(to bottom, transparent, ${C.surface})`,
          opacity: hasOverflow && !atBottom ? 1 : 0,
          transition: 'opacity 200ms'
        }} />
      </div>

      <label style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        marginTop: 16, padding: '14px 18px',
        background: readInfo ? C.surface : 'transparent',
        border: `1px solid ${readInfo ? C.line : 'transparent'}`,
        borderRadius: 10, cursor: 'pointer',
        transition: 'background 160ms, border-color 160ms'
      }}>
        <input type="checkbox" checked={readInfo}
        onChange={(e) => setReadInfo(e.target.checked)}
        style={{ marginTop: 3, accentColor: C.ink }} />
        <span style={{ fontSize: 13, color: C.ink, lineHeight: 1.55 }}>
          위 연구참여설명서를 충분히 읽고 이해하였으며, 다음 단계로 진행하는 데 동의합니다.
        </span>
      </label>

      {/* The 'next' CTA only appears once the participant has agreed. */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 24
      }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', color: C.muted, fontFamily: 'inherit',
          fontSize: 13, cursor: 'pointer', padding: '8px 0'
        }}>← 이전</button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          opacity: readInfo ? 1 : 0,
          transform: readInfo ? 'translateY(0)' : 'translateY(6px)',
          pointerEvents: readInfo ? 'auto' : 'none',
          transition: 'opacity 220ms ease, transform 220ms ease'
        }}>
          <span style={{ fontSize: 12, color: C.muted }}>동의가 확인되었습니다</span>
          <button onClick={onNext} style={primaryBtn(C)}>세션 선택하기 →</button>
        </div>
      </div>
    </div>);

}

function InfoH({ C, children }) {
  return (
    <h3 style={{
      fontSize: 14.5, fontWeight: 500, color: C.ink,
      margin: '0 0 8px', letterSpacing: 0.1
    }}>{children}</h3>);

}

function FactCard({ C, swatch, k, v, sub }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10,
      padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 6
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: swatch }} />
        {k}
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.2 }}>{v}</div>
      <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>
    </div>);

}

// ── Sessions step ───────────────────────────────────────────────────────────
function Sessions({ C, calendarStyle, selected, setSelected, onBack, onNext, availability = AVAILABILITY, dayByKey: lookupDay = dayByKey }) {
  const remaining = 3 - selected.length;

  // Toggle: add or remove a slot. Enforce ≥1 day apart and max 3.
  const toggle = (key, time) => {
    const exists = selected.find((s) => s.key === key && s.time === time);
    if (exists) {
      setSelected(selected.filter((s) => !(s.key === key && s.time === time)));
      return;
    }
    if (selected.length >= 3) return;
    // ≥1 day apart: no other selection on same date or adjacent date with overlap?
    // Spec says "Minimum 1 day apart" → different dates, at least 1 day between.
    const d = lookupDay(key).date;
    const tooClose = selected.some((s) => {
      const sd = lookupDay(s.key).date;
      const diff = Math.abs((d - sd) / 86400000);
      return diff < 1; // same day disallowed by this rule already
    });
    if (tooClose) return;
    setSelected([...selected, { key, time }].sort((a, b) => (a.key + a.time).localeCompare(b.key + b.time)));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 500, margin: '0 0 6px', letterSpacing: -0.2 }}>세션 3회를 선택해 주세요</h2>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            7월 12일 – 7월 25일 · 09:00 – 21:00 (일부 날짜는 13:00 시작) · 각 세션은 최소 1일 이상 간격을 두어야 합니다.
          </p>
        </div>
        <SelectionPills C={C} selected={selected} onRemove={(s) => toggle(s.key, s.time)} remaining={remaining} />
      </div>

      {calendarStyle === 'month-drawer' && <MonthDrawer C={C} availability={availability} dayByKey={lookupDay} selected={selected} toggle={toggle} />}
      {calendarStyle === 'two-week-grid' && <TwoWeekGrid C={C} availability={availability} dayByKey={lookupDay} selected={selected} toggle={toggle} />}
      {calendarStyle === 'agenda' && <Agenda C={C} availability={availability} selected={selected} toggle={toggle} />}

      {/* Sticky footer — back link, progress hint, and "next" CTA that fades in only when all 3 are picked */}
      <div style={{
        position: 'sticky', bottom: -36, marginTop: 24,
        padding: '20px 0 4px',
        background: `linear-gradient(to bottom, transparent, ${C.bg} 28%)`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', color: C.muted, fontFamily: 'inherit',
          fontSize: 13, cursor: 'pointer', padding: '8px 0',
        }}>← 이전</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {selected.length < 3 ? (
            <span style={{ fontSize: 12, color: C.muted }}>
              {3 - selected.length}개의 세션을 더 선택해 주세요
            </span>
          ) : (
            <>
              <span style={{ fontSize: 12, color: C.muted }}>세션 3회가 모두 선택되었습니다</span>
              <button onClick={onNext} style={primaryBtn(C)}>참여자 정보 입력 →</button>
            </>
          )}
        </div>
      </div>
    </div>);

}

function SelectionPills({ C, selected, onRemove, remaining }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {[0, 1, 2].map((i) => {
        const s = selected[i];
        if (!s) return (
          <div key={i} style={{
            padding: '8px 12px', borderRadius: 999,
            border: `1px dashed ${C.line}`, color: C.muted, fontSize: 12,
            minWidth: 110, textAlign: 'center'
          }}>세션 {i + 1}</div>);

        const d = dayByKey(s.key).date;
        return (
          <button key={i} onClick={() => onRemove(s)} style={{
            padding: '8px 12px', borderRadius: 999,
            background: C.ink, color: C.surface, border: 'none',
            fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6
          }}>
            {fmtKoDate(d)} · {s.time}
            <span style={{ opacity: 0.6 }}>×</span>
          </button>);

      })}
    </div>);

}

// ── Calendar style A: Month + slot drawer ──────────────────────────────────
function MonthDrawer({ C, selected, toggle, availability, dayByKey: lookupDay }) {
  const [focus, setFocus] = React.useState(availability[0].key);
  const day = lookupDay(focus);

  // Build month grid for May 2026 (the month containing TODAY).
  const monthStart = startOfMonth(TODAY);
  const firstDow = monthStart.getDay();
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24,
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
      overflow: 'hidden', minHeight: 420
    }}>
      {/* Month grid */}
      <div style={{ padding: '24px 24px 24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{TODAY.getFullYear()}년 {TODAY.getMonth() + 1}월</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <NavBtn C={C}>‹</NavBtn>
            <NavBtn C={C}>›</NavBtn>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, fontSize: 11, color: C.muted, marginBottom: 6 }}>
          {KO_DAYS.map((d) => <div key={d} style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {Array.from({ length: firstDow }).map((_, i) => <div key={'pad' + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1);
            const key = ymd(date);
            const av = lookupDay(key);
            const inWindow = !!av;
            const free = av && av.slots.some((s) => !s.taken);
            const isFocus = key === focus;
            const selectedCount = selected.filter((s) => s.key === key).length;
            const isPast = date < TODAY;
            return (
              <button
                key={key}
                onClick={() => inWindow && free && setFocus(key)}
                disabled={!inWindow || !free}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 8,
                  border: isFocus ? `1px solid ${C.ink}` : `1px solid transparent`,
                  background: isFocus ? C.ink : selectedCount ? C.a : 'transparent',
                  color: isFocus ? C.surface : !inWindow || !free ? C.muted : C.ink,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  cursor: inWindow && free ? 'pointer' : 'default',
                  position: 'relative',
                  padding: 6,
                  textAlign: 'left',
                  opacity: isPast ? 0.35 : !inWindow ? 0.45 : !free ? 0.55 : 1,
                  fontVariantNumeric: 'tabular-nums'
                }}>
                
                <div style={{ fontWeight: isFocus ? 500 : 400 }}>{i + 1}</div>
                {inWindow && free &&
                <div style={{
                  position: 'absolute', bottom: 6, left: 6, right: 6,
                  display: 'flex', gap: 2
                }}>
                    {selectedCount > 0 ?
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: isFocus ? C.surface : C.ink }} /> :
                  <span style={{ fontSize: 10, color: isFocus ? C.surface : C.muted, opacity: 0.8 }}>{av.slots.filter((s) => !s.taken).length}</span>
                  }
                  </div>
                }
              </button>);

          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 18, fontSize: 11, color: C.muted }}>
          <Legend swatch={C.a} label="선택됨" />
          <Legend swatch={C.line} label="가능" />
          <Legend swatch={C.muted} label="마감" outline />
        </div>
      </div>

      {/* Slot drawer */}
      <div style={{ padding: '24px 28px 24px 0', borderLeft: `1px solid ${C.line}`, paddingLeft: 24 }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>
          {KO_DAYS[day.date.getDay()]}요일
        </div>
        <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 18, letterSpacing: -0.2 }}>
          {day.date.getMonth() + 1}월 {day.date.getDate()}일
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
          maxHeight: 320, overflow: 'auto', paddingRight: 4
        }}>
          {day.slots.map((s) => {
            const isSel = !!selected.find((x) => x.key === day.key && x.time === s.time);
            return (
              <SlotBtn key={s.time} C={C} time={s.time} taken={s.taken} selected={isSel}
              onClick={() => !s.taken && toggle(day.key, s.time)} />);

          })}
          {day.slots.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>이 날에는 가능한 시간대가 없습니다.</div>}
        </div>
      </div>
    </div>);

}

function SlotBtn({ C, time, taken, selected, onClick }) {
  return (
    <button onClick={onClick} disabled={taken} style={{
      padding: '10px 12px', borderRadius: 8, fontFamily: 'inherit',
      fontSize: 13, fontVariantNumeric: 'tabular-nums',
      cursor: taken ? 'not-allowed' : 'pointer',
      background: selected ? C.ink : taken ? 'transparent' : C.bg,
      color: selected ? C.surface : taken ? C.muted : C.ink,
      border: selected ? 'none' : `1px solid ${C.line}`,
      textDecoration: taken ? 'line-through' : 'none',
      textAlign: 'left',
      opacity: taken ? 0.55 : 1,
      transition: 'background 120ms, color 120ms'
    }}>{time}</button>);

}

function NavBtn({ C, children }) {
  return (
    <button style={{
      width: 26, height: 26, borderRadius: 6,
      background: 'transparent', border: `1px solid ${C.line}`,
      color: C.ink, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13
    }}>{children}</button>);

}
function Legend({ swatch, label, outline }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 10, height: 10, borderRadius: 3,
        background: outline ? 'transparent' : swatch,
        border: outline ? `1px solid ${swatch}` : 'none'
      }} />
      {label}
    </span>);

}

// ── Calendar style B: Two-week grid with side panel ────────────────────────
function TwoWeekGrid({ C, selected, toggle, availability, dayByKey: lookupDay }) {
  const [focus, setFocus] = React.useState(availability[0].key);
  const day = lookupDay(focus);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
        padding: '20px 22px'
      }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>2주 일정</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {availability.map((d) => {
            const free = d.slots.filter((s) => !s.taken).length;
            const isFocus = d.key === focus;
            const sel = selected.filter((s) => s.key === d.key).length;
            const dow = d.date.getDay();
            const isWknd = dow === 0 || dow === 6;
            return (
              <button key={d.key}
              onClick={() => free && setFocus(d.key)}
              disabled={!free}
              style={{
                background: isFocus ? C.ink : sel ? C.a : C.bg,
                color: isFocus ? C.surface : isWknd ? C.muted : C.ink,
                border: `1px solid ${isFocus ? C.ink : C.line}`,
                borderRadius: 8, padding: '12px 10px',
                textAlign: 'left', fontFamily: 'inherit', cursor: free ? 'pointer' : 'default',
                opacity: !free ? 0.5 : 1, minHeight: 78,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: 10, color: isFocus ? C.surface : C.muted, opacity: 0.8 }}>{KO_DAYS[dow]}</div>
                <div style={{ fontSize: 18, fontWeight: 500, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.2 }}>{d.date.getDate()}</div>
                <div style={{ fontSize: 10, color: isFocus ? C.surface : C.muted }}>{free > 0 ? `${free}개 가능` : '—'}</div>
              </button>);

          })}
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: '20px 22px' }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>{KO_DAYS[day.date.getDay()]}요일</div>
        <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 16, letterSpacing: -0.2 }}>{day.date.getMonth() + 1}월 {day.date.getDate()}일</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, maxHeight: 280, overflow: 'auto', paddingRight: 4 }}>
          {day.slots.map((s) => {
            const isSel = !!selected.find((x) => x.key === day.key && x.time === s.time);
            return <SlotBtn key={s.time} C={C} time={s.time} taken={s.taken} selected={isSel} onClick={() => !s.taken && toggle(day.key, s.time)} />;
          })}
        </div>
      </div>
    </div>);

}

// ── Calendar style C: Vertical agenda ──────────────────────────────────────
function Agenda({ C, selected, toggle, availability }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
      padding: '8px 24px', maxHeight: 500, overflow: 'auto'
    }}>
      {availability.map((d, i) => {
        const free = d.slots.filter((s) => !s.taken);
        if (free.length === 0) return null;
        return (
          <div key={d.key} style={{
            display: 'grid', gridTemplateColumns: '160px 1fr', gap: 24,
            padding: '20px 0', borderBottom: i < availability.length - 1 ? `1px solid ${C.line}` : 'none'
          }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{KO_DAYS[d.date.getDay()]}요일</div>
              <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.3, fontVariantNumeric: 'tabular-nums' }}>
                {d.date.getMonth() + 1}.{String(d.date.getDate()).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{free.length}개 시간대</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {d.slots.map((s) => {
                if (s.taken) return null;
                const isSel = !!selected.find((x) => x.key === d.key && x.time === s.time);
                return (
                  <button key={s.time} onClick={() => toggle(d.key, s.time)} style={{
                    padding: '8px 14px', borderRadius: 999, fontFamily: 'inherit',
                    fontSize: 13, fontVariantNumeric: 'tabular-nums',
                    background: isSel ? C.ink : C.bg, color: isSel ? C.surface : C.ink,
                    border: isSel ? 'none' : `1px solid ${C.line}`,
                    cursor: 'pointer'
                  }}>{s.time}</button>);

              })}
            </div>
          </div>);

      })}
    </div>);

}

// ── Details step ────────────────────────────────────────────────────────────
function Details({ C, form, setForm, selected, showConsent, onBack, onNext }) {
  const valid = form.name.trim() && form.dob && form.phone.trim() && (!showConsent || form.consent);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 500, margin: '0 0 6px', letterSpacing: -0.2 }}>참여자 정보</h2>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 24px' }}>
          연구팀이 일정 확정과 사전 안내를 위해 사용합니다. 정보는 연구 목적 외에는 사용되지 않습니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field C={C} label="이름" placeholder="홍길동" value={form.name} onChange={upd('name')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field C={C} label="생년월일" type="date" value={form.dob} onChange={upd('dob')} />
            <Field C={C} label="휴대전화" placeholder="010-0000-0000" value={form.phone} onChange={upd('phone')} />
          </div>
          {showConsent &&
          <label style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px',
            background: C.surface, cursor: 'pointer'
          }}>
              <input type="checkbox" checked={form.consent}
            onChange={(e) => setForm({ ...form, consent: e.target.checked })}
            style={{ marginTop: 3, accentColor: C.ink }} />
              <div style={{ fontSize: 13, lineHeight: 1.55, color: C.ink }}>
                <div style={{ marginBottom: 2 }}>연구 참여 동의</div>
                <div style={{ color: C.muted, fontSize: 12 }}>
                  본 연구의 절차·녹음/녹화·개인정보 처리방침을 확인하였으며, 자발적으로 참여에 동의합니다.
                </div>
              </div>
            </label>
          }
        </div>
        <div style={{ marginTop: 24 }}>
          <Footer C={C} onBack={onBack} onNext={onNext} nextLabel="신청 제출 →" nextDisabled={!valid} inline />
        </div>
      </div>

      {/* Summary card */}
      <aside style={{
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
        padding: '20px 22px', alignSelf: 'start'
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1.2, color: C.muted, textTransform: 'uppercase', marginBottom: 12 }}>요약</div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>선택한 세션</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>각 40분 · 실험실 대면</div>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {selected.map((s, i) => {
            const d = dayByKey(s.key).date;
            return (
              <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 11, background: i === 0 ? C.a : i === 1 ? C.b : C.c,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 500
                }}>{i + 1}</span>
                <div>
                  <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmtKoDate(d)}</div>
                  <div style={{ fontSize: 12, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{s.time} – {addMin(s.time, 40)}</div>
                </div>
              </li>);

          })}
        </ol>
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px dashed ${C.line}`, fontSize: 12, color: C.muted }}>
          위 시간은 신청 후 연구팀의 확인 절차를 거쳐 확정됩니다.
        </div>
      </aside>
    </div>);

}

function addMin(t, n) {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + n;
  return fmtTime(Math.floor(total / 60), total % 60);
}

function Field({ C, label, hint, ...rest }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <input {...rest} style={{
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8,
        padding: '11px 14px', fontSize: 14, color: C.ink, fontFamily: 'inherit',
        outline: 'none'
      }}
      onFocus={(e) => e.target.style.borderColor = C.ink}
      onBlur={(e) => e.target.style.borderColor = C.line} />
      
      {hint && <span style={{ fontSize: 11, color: C.muted }}>{hint}</span>}
    </label>);

}

// ── Confirm step ────────────────────────────────────────────────────────────
function Confirm({ C, form, selected, onReset }) {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', paddingTop: 20 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: `linear-gradient(135deg, ${C.a}, ${C.b})`,
        margin: '0 auto 22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${C.line}`
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="5 12 10 17 19 7" />
        </svg>
      </div>
      <h2 style={{ fontSize: 26, fontWeight: 500, margin: '0 0 10px', letterSpacing: -0.3 }}>신청이 접수되었습니다</h2>
      <p style={{ fontSize: 14, color: C.ink, opacity: 0.8, lineHeight: 1.7, margin: '0 0 28px', textWrap: 'pretty' }}>
        실험에 참여해 주셔서 감사합니다!<br />
        연구팀과 확인 후, 일정 확정 안내해 드리겠습니다.
      </p>

      <div style={{
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
        padding: '20px 24px', textAlign: 'left'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>임시 예약</div>
          <div style={{ fontSize: 11, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{form.name || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selected.map((s, i) => {
            const d = dayByKey(s.key).date;
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderTop: i > 0 ? `1px solid ${C.line}` : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 11, background: i === 0 ? C.a : i === 1 ? C.b : C.c,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{fmtKoDate(d)}</span>
                </div>
                <div style={{ fontSize: 13, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{s.time} – {addMin(s.time, 40)}</div>
              </div>);

          })}
        </div>
      </div>

      <div style={{ marginTop: 26, fontSize: 12, color: C.muted }}>
        24시간 이내에 확정 문자를 보내드립니다 · 문의: jessi2001@korea.ac.kr
      </div>
      <button onClick={onReset} style={{
        marginTop: 28, padding: '8px 16px', background: 'transparent', border: `1px solid ${C.line}`,
        color: C.ink, borderRadius: 999, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer'
      }}>처음으로 돌아가기</button>
    </div>);

}

// ── Footer (back / next) ────────────────────────────────────────────────────
function Footer({ C, onBack, onNext, nextLabel, nextDisabled, inline }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginTop: inline ? 0 : 32
    }}>
      <button onClick={onBack} style={{
        background: 'transparent', border: 'none', color: C.muted, fontFamily: 'inherit',
        fontSize: 13, cursor: 'pointer', padding: '8px 0'
      }}>← 이전</button>
      <button onClick={onNext} disabled={nextDisabled}
      style={{ ...primaryBtn(C), opacity: nextDisabled ? 0.4 : 1, cursor: nextDisabled ? 'not-allowed' : 'pointer' }}>
        {nextLabel}
      </button>
    </div>);

}

const primaryBtn = (C) => ({
  padding: '11px 20px', borderRadius: 999,
  background: C.ink, color: C.surface, border: 'none',
  fontFamily: 'inherit', fontSize: 13, fontWeight: 500, letterSpacing: 0.2,
  cursor: 'pointer'
});

Object.assign(window, { BookingApp, PALETTES, AVAILABILITY, dayByKey, fmtKoDate, addMin });