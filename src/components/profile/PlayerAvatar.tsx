import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  imageClassName?: string;
}

export function PlayerAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  imageClassName,
}: PlayerAvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const sizeClassName =
    size === "sm"
      ? "h-14 w-14"
      : size === "lg"
        ? "h-28 w-28"
        : size === "xl"
          ? "h-36 w-36"
          : "h-20 w-20";
  const iconClassName =
    size === "sm"
      ? "h-7 w-7"
      : size === "lg"
        ? "h-14 w-14"
        : size === "xl"
          ? "h-20 w-20"
          : "h-10 w-10";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full border border-primary/25 bg-background/80 shadow-[0_0_30px_hsl(51_100%_50%_/_0.12)]",
        sizeClassName,
        className,
      )}
      aria-label={`Foto do perfil de ${name}`}
    >
      {avatarUrl && !hasError ? (
        <img
          src={avatarUrl}
          alt={`Foto do perfil de ${name}`}
          className={cn("h-full w-full object-cover", imageClassName)}
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,hsl(51_100%_50%_/_0.12),transparent_45%),linear-gradient(180deg,hsl(0_0%_9%),hsl(0_0%_6%))] text-primary">
          <UserRound className={iconClassName} />
        </div>
      )}
    </div>
  );
}
