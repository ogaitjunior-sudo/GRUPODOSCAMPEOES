import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamPhotoBadgeProps {
  name: string;
  photoUrl?: string | null;
  fallbackImageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  imageClassName?: string;
}

export function TeamPhotoBadge({
  name,
  photoUrl,
  fallbackImageUrl,
  size = "md",
  className,
  imageClassName,
}: TeamPhotoBadgeProps) {
  const [imageStage, setImageStage] = useState<"primary" | "fallback" | "none">("primary");

  useEffect(() => {
    setImageStage("primary");
  }, [fallbackImageUrl, photoUrl]);

  const primaryImageUrl = photoUrl ?? null;
  const secondaryImageUrl = fallbackImageUrl ?? null;
  const displayImageUrl =
    imageStage === "primary"
      ? primaryImageUrl ?? secondaryImageUrl
      : imageStage === "fallback"
        ? secondaryImageUrl
        : null;
  const sizeClassName =
    size === "sm" ? "h-14 w-14" : size === "lg" ? "h-28 w-28" : "h-20 w-20";
  const iconClassName = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-12 w-12" : "h-8 w-8";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full border border-primary/25 bg-background/80 shadow-[0_0_30px_hsl(51_100%_50%_/_0.12)]",
        sizeClassName,
        className,
      )}
      aria-label={`Foto da equipe ${name}`}
    >
      {displayImageUrl ? (
        <img
          src={displayImageUrl}
          alt={`Foto da equipe ${name}`}
          className={cn("h-full w-full object-cover", imageClassName)}
          onError={() => {
            if (imageStage === "primary" && primaryImageUrl && secondaryImageUrl) {
              setImageStage("fallback");
              return;
            }

            setImageStage("none");
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,hsl(51_100%_50%_/_0.12),transparent_45%),linear-gradient(180deg,hsl(0_0%_9%),hsl(0_0%_6%))] text-primary">
          <Shield className={iconClassName} />
        </div>
      )}
    </div>
  );
}
