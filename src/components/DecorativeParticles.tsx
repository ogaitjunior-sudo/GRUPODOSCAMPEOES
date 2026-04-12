import { useState } from "react";
import { cn } from "@/lib/utils";

interface DecorativeParticlesProps {
  count?: number;
  minSize?: number;
  maxSize?: number;
  particleClassName?: string;
  className?: string;
  durationRange?: [number, number];
  maxDelay?: number;
}

interface Particle {
  size: number;
  left: number;
  top: number;
  delay: number;
  duration: number;
}

function randomNumber(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createParticles(
  count: number,
  minSize: number,
  maxSize: number,
  durationRange: [number, number],
  maxDelay: number,
): Particle[] {
  return Array.from({ length: count }, () => ({
    size: randomNumber(minSize, maxSize),
    left: randomNumber(0, 100),
    top: randomNumber(0, 100),
    delay: randomNumber(0, maxDelay),
    duration: randomNumber(durationRange[0], durationRange[1]),
  }));
}

export function DecorativeParticles({
  count = 20,
  minSize = 2,
  maxSize = 6,
  particleClassName = "bg-primary/40",
  className,
  durationRange = [2, 5],
  maxDelay = 3,
}: DecorativeParticlesProps) {
  const [particles] = useState(() =>
    createParticles(count, minSize, maxSize, durationRange, maxDelay),
  );

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {particles.map((particle, index) => (
        <div
          key={index}
          className={cn("absolute rounded-full animate-pulse-glow", particleClassName)}
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
