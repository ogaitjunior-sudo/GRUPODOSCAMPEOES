import { useEffect, useState, type CSSProperties } from "react";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TeamIdentityData {
  id: string;
  name: string;
  flagUrl?: string | null;
}

function hashTeamName(value: string) {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function getTeamInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "EQ";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getTeamMarkStyle(name: string) {
  const seed = hashTeamName(name);
  const hueA = seed % 360;
  const hueB = (seed * 1.7 + 55) % 360;

  return {
    background: `linear-gradient(145deg, hsl(${hueA} 72% 58%), hsl(${hueB} 68% 42%))`,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 20px rgba(0,0,0,0.18)",
  } satisfies CSSProperties;
}

export function TeamCrest({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = getTeamInitials(name);
  const sizeClassName =
    size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-16 w-16 text-lg" : "h-9 w-9 text-xs";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[10px] border border-white/15 font-heading font-bold uppercase tracking-[0.12em] text-white",
        sizeClassName,
        className,
      )}
      style={getTeamMarkStyle(name)}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function TeamFlagBadge({
  teamName,
  flagUrl,
  size = "md",
  className,
}: {
  teamName: string;
  flagUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [flagUrl]);

  const sizeClassName =
    size === "sm"
      ? "h-5 min-w-[1.6rem] rounded-md px-1"
      : size === "lg"
        ? "h-8 min-w-[2.4rem] rounded-lg px-1.5"
        : "h-6 min-w-[2rem] rounded-md px-1.5";
  const iconClassName = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";

  if (!flagUrl || hasError) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center border border-white/10 bg-white/[0.05] text-muted-foreground",
          sizeClassName,
          className,
        )}
        title={`Bandeira nao cadastrada para ${teamName}`}
        aria-label={`Bandeira nao cadastrada para ${teamName}`}
      >
        <Flag className={iconClassName} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center overflow-hidden border border-white/10 bg-black/15",
        sizeClassName,
        className,
      )}
      title={`Bandeira de ${teamName}`}
      aria-hidden="true"
    >
      <img
        src={flagUrl}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setHasError(true)}
      />
    </span>
  );
}
