import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { t } from "../../lib/i18n";

export const INTRO_STORAGE_KEY = "scriptorium.intro.v1";
/** Dispatched on `window` to show the opening again (from "Ajuda e sobre"). */
export const REPLAY_INTRO_EVENT = "scriptorium:replay-intro";

/**
 * Inline in <head>: on a first visit, covers the page until the opening mounts, so the app does
 * not flash underneath. The timer is a safety net in case the scripts never run.
 */
export const INTRO_INIT = `(function(){try{if(localStorage.getItem('${INTRO_STORAGE_KEY}')!=='seen'){var r=document.documentElement;r.classList.add('intro-pending');setTimeout(function(){r.classList.remove('intro-pending')},6000)}}catch(e){}})()`;

/** Milliseconds from the start of the sequence; the CSS delays in intro-splash.css match these. */
const FONT_WAIT_MS = 1500;
const QUILL_AT_MS = 2600;
const OPEN_AT_MS = 4600;
const OPEN_MS = 1100;
const STATIC_OPEN_AT_MS = 1600;
const STATIC_OPEN_MS = 400;

type Phase = "hidden" | "waiting" | "playing" | "opening";

const vars = (values: Record<string, string | number>) => values as CSSProperties;

const SCRIPTS = [
  {
    className: "intro-script-he",
    lang: "he",
    dir: "rtl" as const,
    text: "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ",
    from: "-3%",
    to: "4%",
    delay: "0.3s",
  },
  {
    className: "intro-script-el",
    lang: "grc",
    dir: "ltr" as const,
    text: "Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος",
    from: "4%",
    to: "-3%",
    delay: "0.55s",
  },
  {
    className: "intro-script-la",
    lang: "la",
    dir: "ltr" as const,
    text: "In principio erat Verbum, et Verbum erat apud Deum",
    from: "-2%",
    to: "3%",
    delay: "0.8s",
  },
];

const FLECKS = [
  { x: "2%", y: "70%", size: "3px", delay: "1.25s" },
  { x: "9%", y: "18%", size: "2px", delay: "1.4s" },
  { x: "14%", y: "84%", size: "4px", delay: "1.55s" },
  { x: "-3%", y: "38%", size: "2px", delay: "1.7s" },
  { x: "20%", y: "8%", size: "3px", delay: "1.85s" },
  { x: "6%", y: "52%", size: "2px", delay: "2s" },
  { x: "17%", y: "46%", size: "3px", delay: "2.2s" },
  { x: "-1%", y: "92%", size: "2px", delay: "2.4s" },
  { x: "24%", y: "62%", size: "2px", delay: "2.6s" },
  { x: "11%", y: "-4%", size: "3px", delay: "2.9s" },
];

const FLOURISH = "M8 24 C 52 6, 96 40, 142 22 S 214 6, 250 22 S 318 34, 344 18 S 368 12, 372 20";

/** The illuminated initial: gilded frame, vines, the letter traced then inked, a glint of light. */
function IlluminatedInitial() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clip = `intro-clip-${id}`;
  const glint = `intro-glint-${id}`;
  return (
    <svg className="intro-initial" viewBox="0 0 120 120">
      <defs>
        <clipPath id={clip}>
          <rect x="11" y="11" width="98" height="98" rx="2" />
        </clipPath>
        <linearGradient id={glint} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" className="intro-glint-stop-edge" />
          <stop offset="0.5" className="intro-glint-stop-core" />
          <stop offset="1" className="intro-glint-stop-edge" />
        </linearGradient>
      </defs>
      <rect className="intro-initial-ground" x="4" y="4" width="112" height="112" rx="4" />
      <rect
        className="intro-frame intro-frame-outer"
        x="4"
        y="4"
        width="112"
        height="112"
        rx="4"
        pathLength={1}
      />
      <rect
        className="intro-frame intro-frame-inner"
        x="11"
        y="11"
        width="98"
        height="98"
        rx="2"
        pathLength={1}
      />
      <path
        className="intro-vine"
        pathLength={1}
        d="M15 104 C 26 96, 20 84, 30 78 S 42 70, 36 62"
      />
      <path
        className="intro-vine"
        pathLength={1}
        d="M105 16 C 94 24, 100 36, 90 42 S 78 50, 84 58"
      />
      {(
        [
          [4, 4, 3.4],
          [116, 4, 3.4],
          [116, 116, 3.4],
          [4, 116, 3.4],
          [36, 62, 1.8],
          [84, 58, 1.8],
        ] as const
      ).map(([cx, cy, r], index) => (
        <circle
          key={index}
          className="intro-dot"
          cx={cx}
          cy={cy}
          r={r}
          style={vars({ "--i": index })}
        />
      ))}
      <text className="intro-letter" x="60" y="91" textAnchor="middle" fontSize="88">
        S
      </text>
      <g clipPath={`url(#${clip})`}>
        <g transform="rotate(18 60 60)">
          <rect
            className="intro-glint"
            x="-10"
            y="-30"
            width="34"
            height="180"
            fill={`url(#${glint})`}
          />
        </g>
      </g>
    </svg>
  );
}

function IntroScene() {
  return (
    <div className="intro-scene">
      <div className="intro-ruling">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} style={vars({ "--i": index })} />
        ))}
      </div>
      <span className="intro-margin intro-margin-left" />
      <span className="intro-margin intro-margin-right" />
      {SCRIPTS.map((script) => (
        <p
          key={script.lang}
          className={`intro-script ${script.className}`}
          lang={script.lang}
          dir={script.dir}
          style={vars({ "--from": script.from, "--to": script.to, "--delay": script.delay })}
        >
          {script.text}
        </p>
      ))}
      <div className="intro-bloom" />
      <div className="intro-center">
        <div className="intro-wordmark">
          <IlluminatedInitial />
          <span className="intro-word">
            {[..."criptorium"].map((letter, index) => (
              <span key={index} style={vars({ "--i": index })}>
                {letter}
              </span>
            ))}
          </span>
          <span className="intro-os">
            OS
            <span className="intro-caret" />
          </span>
          {FLECKS.map((fleck, index) => (
            <span
              key={index}
              className="intro-fleck"
              style={vars({
                "--x": fleck.x,
                "--y": fleck.y,
                "--size": fleck.size,
                "--delay": fleck.delay,
              })}
            />
          ))}
        </div>
        <svg className="intro-flourish" viewBox="0 0 380 44">
          <path className="intro-flourish-line" pathLength={1} d={FLOURISH} />
          <g className="intro-quill">
            {/* The quill of the "feather" icon (lucide, ISC), with its nib on the path. */}
            <g transform="scale(1.25) translate(-2 -22)">
              <path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z" />
              <path d="M16 8 2 22" />
              <path d="M17.5 15H9" />
            </g>
            <animateMotion
              begin="indefinite"
              dur="1.1s"
              fill="freeze"
              path={FLOURISH}
              rotate="auto"
              calcMode="spline"
              keyPoints="0;1"
              keyTimes="0;1"
              keySplines="0.45 0.05 0.35 1"
            />
          </g>
        </svg>
        <p className="intro-tagline">{t("about.tagline")}</p>
      </div>
    </div>
  );
}

function storedAsSeen(): boolean {
  try {
    return window.localStorage.getItem(INTRO_STORAGE_KEY) === "seen";
  } catch {
    // Without storage it would replay on every visit; better not to show it at all.
    return true;
  }
}

function rememberSeen(): void {
  try {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "seen");
  } catch {
    // Nothing to remember it in.
  }
}

/**
 * The opening of Scriptorium OS, on the first visit only. A click, Esc, Enter or Space skip it;
 * with "reduce motion" it is the finished page, which simply fades.
 */
export function IntroSplash() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);

  const start = useCallback(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setPhase("waiting");
  }, []);
  const skip = useCallback(
    () =>
      setPhase((current) => (current === "waiting" || current === "playing" ? "opening" : current)),
    [],
  );

  useEffect(() => {
    if (storedAsSeen()) document.documentElement.classList.remove("intro-pending");
    else start();
    window.addEventListener(REPLAY_INTRO_EVENT, start);
    return () => window.removeEventListener(REPLAY_INTRO_EVENT, start);
  }, [start]);

  // Mounted: the cover can go. Start once the fonts have arrived (or after a short wait).
  useEffect(() => {
    if (phase !== "waiting") return;
    document.documentElement.classList.remove("intro-pending");
    skipRef.current?.focus({ preventScroll: true });
    let cancelled = false;
    const play = () => {
      if (!cancelled) setPhase((current) => (current === "waiting" ? "playing" : current));
    };
    const timer = window.setTimeout(play, FONT_WAIT_MS);
    void document.fonts?.ready.then(play);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    const timers = reduced
      ? [window.setTimeout(() => setPhase("opening"), STATIC_OPEN_AT_MS)]
      : [
          window.setTimeout(() => {
            rootRef.current
              ?.querySelectorAll<SVGAnimationElement>("animateMotion")
              .forEach((motion) => motion.beginElement());
          }, QUILL_AT_MS),
          window.setTimeout(() => setPhase("opening"), OPEN_AT_MS),
        ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [phase, reduced]);

  useEffect(() => {
    if (phase !== "opening") return;
    rememberSeen();
    const timer = window.setTimeout(() => setPhase("hidden"), reduced ? STATIC_OPEN_MS : OPEN_MS);
    return () => window.clearTimeout(timer);
  }, [phase, reduced]);

  useEffect(() => {
    if (phase === "hidden") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab") event.preventDefault();
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, skip]);

  if (phase === "hidden") return null;
  const running = phase === "playing" || phase === "opening";
  return (
    <div
      ref={rootRef}
      className="intro"
      role="dialog"
      aria-modal="true"
      aria-label="Abertura do Scriptorium OS"
      data-phase={phase === "opening" ? "opening" : "playing"}
      {...(running ? { "data-run": "" } : {})}
      {...(reduced ? { "data-static": "" } : {})}
      onClick={skip}
    >
      <div className="intro-leaf intro-leaf-left" aria-hidden="true">
        <IntroScene />
      </div>
      <div className="intro-leaf intro-leaf-right" aria-hidden="true">
        <IntroScene />
      </div>
      <button
        ref={skipRef}
        type="button"
        className="intro-skip"
        onClick={(event) => {
          event.stopPropagation();
          skip();
        }}
      >
        Pular abertura <kbd>Esc</kbd>
      </button>
    </div>
  );
}
