import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Sparkles, Trophy, X } from "lucide-react";

export interface ChampionCelebrationProps {
  championName: string | null;
  championLogo?: string | null;
  tournamentName: string;
  isFinished: boolean;
}

const FIREWORKS = ["one", "two", "three", "four", "five", "six"] as const;

const PARTICLES = Array.from({ length: 26 }, (_, index) => ({
  x: [8, 14, 20, 29, 36, 44, 53, 61, 70, 78, 86, 92, 16, 25, 34, 42, 50, 58, 67, 75, 83, 10, 31, 49, 69, 89][index],
  y: [18, 42, 74, 28, 64, 14, 48, 80, 24, 56, 12, 68, 88, 10, 38, 70, 22, 52, 84, 34, 76, 60, 92, 6, 46, 90][index],
  delay: (index % 9) * 0.22,
  duration: 3.6 + (index % 5) * 0.32,
  tone: index % 3 === 1 ? "blue" : "gold",
}));

const CONFETTI = Array.from({ length: 22 }, (_, index) => ({
  x: [6, 11, 18, 24, 33, 39, 46, 54, 62, 68, 74, 81, 88, 94, 15, 28, 43, 57, 72, 85, 21, 66][index],
  delay: (index % 11) * 0.16,
  duration: 4.2 + (index % 6) * 0.24,
  rotate: index % 2 === 0 ? "18deg" : "-26deg",
  tone: index % 4 === 0 ? "blue" : index % 4 === 1 ? "white" : "gold",
}));

export function ChampionFireworks({
  isActive = false,
  compact = false,
  layer = "primary",
}: {
  isActive?: boolean;
  compact?: boolean;
  layer?: "primary" | "secondary";
}) {
  return (
    <div
      aria-hidden="true"
      className={`champion-fireworks champion-fireworks--${layer}${
        isActive ? " champion-fireworks--active" : ""
      }${compact ? " champion-fireworks--compact" : ""}`}
    >
      {FIREWORKS.map((firework) => (
        <span
          key={firework}
          className={`champion-firework champion-firework--${firework}`}
        />
      ))}
    </div>
  );
}

function ChampionScreenEffects({
  isActive,
  particles,
  confetti,
  onClose,
}: {
  isActive: boolean;
  particles: ReactNode;
  confetti: ReactNode;
  onClose: () => void;
}) {
  if (!isActive || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="champion-screen-effects">
      <div className="champion-screen-effects__aurora" aria-hidden="true" />
      <ChampionFireworks isActive />
      <ChampionFireworks isActive layer="secondary" />
      <div
        className="champion-confetti-field champion-confetti-field--screen"
        aria-hidden="true"
      >
        {confetti}
      </div>
      <div
        className="champion-particle-field champion-particle-field--screen"
        aria-hidden="true"
      >
        {particles}
      </div>
      <button
        type="button"
        className="champion-screen-effects__close"
        onClick={onClose}
        aria-label="Fechar comemoracao"
      >
        <X className="h-4 w-4" />
      </button>
    </div>,
    document.body,
  );
}

export function ChampionCelebration({
  championName,
  championLogo,
  tournamentName,
  isFinished,
}: ChampionCelebrationProps) {
  const [isIntroVisible, setIsIntroVisible] = useState(false);
  const normalizedChampionName = championName?.trim() ?? "";
  const shouldRender = isFinished && normalizedChampionName.length > 0;

  useEffect(() => {
    if (!shouldRender) {
      setIsIntroVisible(false);
      return;
    }

    setIsIntroVisible(true);

    const timeoutId = window.setTimeout(() => {
      setIsIntroVisible(false);
    }, 6800);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedChampionName, shouldRender, tournamentName]);

  const particles = useMemo(
    () =>
      PARTICLES.map((particle, index) => (
        <span
          key={`particle-${index}`}
          className={`champion-particle champion-particle--${particle.tone}`}
          style={
            {
              "--x": `${particle.x}%`,
              "--y": `${particle.y}%`,
              "--delay": `${particle.delay}s`,
              "--duration": `${particle.duration}s`,
            } as CSSProperties
          }
        />
      )),
    [],
  );
  const confetti = useMemo(
    () =>
      CONFETTI.map((piece, index) => (
        <span
          key={`confetti-${index}`}
          className={`champion-confetti champion-confetti--${piece.tone}`}
          style={
            {
              "--x": `${piece.x}%`,
              "--delay": `${piece.delay}s`,
              "--duration": `${piece.duration}s`,
              "--rotate": piece.rotate,
            } as CSSProperties
          }
        />
      )),
    [],
  );

  if (!shouldRender) {
    return null;
  }

  return (
    <>
    <ChampionScreenEffects
      isActive={isIntroVisible}
      particles={particles}
      confetti={confetti}
      onClose={() => setIsIntroVisible(false)}
    />
    <section
      className={`champion-celebration champion-celebration--premium${
        isIntroVisible ? " champion-celebration--active champion-celebration--showcase" : ""
      }`}
      aria-live={isIntroVisible ? "polite" : "off"}
    >
      <div className="champion-confetti-field" aria-hidden="true">
        {confetti}
      </div>
      <div className="champion-particle-field" aria-hidden="true">
        {particles}
      </div>
      <div className="champion-celebration__stadium" aria-hidden="true" />
      <div className="champion-celebration__glow" aria-hidden="true" />

      {isIntroVisible ? (
        <button
          type="button"
          className="champion-celebration__close"
          onClick={() => setIsIntroVisible(false)}
          aria-label="Fechar comemoracao"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      <div className="champion-celebration__content">
        <div className="champion-celebration__centerpiece">
          <div className="champion-celebration__trophy-ring" aria-hidden="true" />
          <div className="champion-celebration__trophy">
            <Trophy className="h-14 w-14" />
          </div>
          {championLogo ? (
            <div className="champion-celebration__logo">
              <img src={championLogo} alt="" />
            </div>
          ) : null}
        </div>

        <div className="champion-celebration__copy-block">
          <div className="champion-celebration__kicker">
            <Sparkles className="h-3.5 w-3.5" />
            Titulo confirmado
          </div>
          <p className="champion-celebration__title">CAMPEÃO</p>
          <h3 className="champion-celebration__name">{normalizedChampionName}</h3>
          <p className="champion-celebration__copy">
            {tournamentName} coroou seu campeao. O chaveamento permanece abaixo para consulta.
          </p>
          <button
            type="button"
            className="champion-celebration__action"
            onClick={() => setIsIntroVisible(false)}
          >
            Ver chaveamento
          </button>
        </div>
      </div>
    </section>
    </>
  );
}
