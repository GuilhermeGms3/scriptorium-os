import type { CSSProperties } from "react";
import { t } from "../../lib/i18n";

const vars = (values: Record<string, string | number>) => values as CSSProperties;

const WORD = "SCRIPTORIUM";
/** The Greek letter each Latin one comes from: the reel passes through it just before landing. */
const GREEK_ORIGIN: Record<string, string> = {
  S: "Σ",
  C: "Γ",
  R: "Ρ",
  I: "Ι",
  P: "Π",
  T: "Τ",
  O: "Ο",
  U: "Υ",
  M: "Μ",
};
const HEBREW = "אבגדהוזחטיכלמנסעפצקרשת";
const GREEK = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ";

/** Seven glyphs per letter: Hebrew and Greek, then its Greek origin, then the letter itself. */
function reel(letter: string, index: number): string[] {
  const hebrew = (step: number) => HEBREW[(index * 7 + step * 3) % HEBREW.length] ?? "א";
  const greek = (step: number) => GREEK[(index * 5 + step * 7) % GREEK.length] ?? "Α";
  return [
    hebrew(0),
    greek(1),
    hebrew(2),
    greek(3),
    hebrew(4),
    GREEK_ORIGIN[letter] ?? greek(5),
    letter,
  ];
}

const SCRIPTS = [
  {
    className: "intro-script-he",
    lang: "he",
    dir: "rtl" as const,
    text: "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ",
  },
  {
    className: "intro-script-el",
    lang: "grc",
    dir: "ltr" as const,
    text: "Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος",
  },
  {
    className: "intro-script-la",
    lang: "la",
    dir: "ltr" as const,
    text: "In principio erat Verbum, et Verbum erat apud Deum",
  },
];

/**
 * The opening of Scriptorium OS, in the same identity as the app's top bar: the book mark is drawn,
 * each letter of SCRIPTORIUM turns through Hebrew and Greek letters before landing (passing through
 * the Greek letter it comes from), "OS" arrives, the motto is typed, and the name flies to the
 * logo in the top bar as the app appears. Static markup, rendered on the server; hidden unless
 * <html> has `intro-on`. Everything that moves is CSS; the timing lives in INTRO_INIT.
 */
export function IntroSplash() {
  const tagline = t("about.tagline");
  return (
    <div className="intro" aria-hidden="true">
      <div className="intro-paper" />
      <div className="intro-backdrop">
        <div className="intro-ruling">
          {Array.from({ length: 9 }, (_, index) => (
            <span key={index} style={vars({ "--i": index })} />
          ))}
        </div>
        {SCRIPTS.map((script) => (
          <p
            key={script.lang}
            className={`intro-script ${script.className}`}
            lang={script.lang}
            dir={script.dir}
          >
            {script.text}
          </p>
        ))}
      </div>
      <div className="intro-center">
        <div className="intro-lockup">
          <span className="intro-mark" data-intro-mark="">
            {/* The "book-marked" icon of the top bar (lucide, ISC), drawn stroke by stroke. */}
            <svg className="intro-icon" viewBox="0 0 24 24">
              <path
                className="intro-icon-book"
                pathLength={1}
                d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"
              />
              <path className="intro-icon-ribbon" pathLength={1} d="M10 2v8l3-3 3 3V2" />
            </svg>
            <span className="intro-word">
              {[...WORD].map((letter, index) => (
                <span key={index} className="intro-cell" style={vars({ "--i": index })}>
                  <span className="intro-reel">
                    {reel(letter, index).map((glyph, step) => (
                      <span key={step} className={step === 6 ? "intro-glyph-final" : undefined}>
                        {glyph}
                      </span>
                    ))}
                  </span>
                </span>
              ))}
            </span>
          </span>
          <span className="intro-os-wrap">
            <span className="intro-os">OS</span>
          </span>
        </div>
        <div className="intro-extras">
          <span className="intro-rule" />
          <p className="intro-tagline">
            <span className="intro-typed" style={vars({ "--chars": tagline.length })}>
              {tagline}
            </span>
          </p>
        </div>
      </div>
      <button type="button" className="intro-skip" tabIndex={-1}>
        Pular abertura <kbd>Esc</kbd>
      </button>
    </div>
  );
}
