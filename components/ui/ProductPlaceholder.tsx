"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const gameColors: Record<string, string> = {
  MM2: "from-game-mm2/20 to-game-mm2/5",
  ADOPT_ME: "from-game-adopt/20 to-game-adopt/5",
  SAB: "from-game-sab/20 to-game-sab/5",
  GAG2: "from-game-gag2/20 to-game-gag2/5",
  OTHER: "from-rbx-blue/10 to-rbx-elevated",
};

const gameIcons: Record<string, string> = {
  MM2: "🔪",
  ADOPT_ME: "🐾",
  SAB: "🏄",
  GAG2: "😄",
  OTHER: "🎮",
};

interface ProductImagePlaceholderProps {
  name: string;
  game?: string;
  imageUrl?: string | null;
  className?: string;
}

function ProductFallback({
  name,
  game,
  className,
}: {
  name: string;
  game: string;
  className?: string;
}) {
  const gradient = gameColors[game] ?? gameColors.OTHER;
  const icon = gameIcons[game] ?? "🎮";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 bg-gradient-to-br",
        gradient,
        className
      )}
    >
      <span className="text-3xl leading-none select-none">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-rbx-muted select-none">
        {initials || name.slice(0, 3).toUpperCase()}
      </span>
    </div>
  );
}

export function ProductImagePlaceholder({
  name,
  game = "OTHER",
  imageUrl,
  className,
}: ProductImagePlaceholderProps) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={cn("object-cover", className)}
        onError={() => setImgError(true)}
      />
    );
  }

  return <ProductFallback name={name} game={game} className={className} />;
}

/** Return CSS classes for a game badge */
export function gameBadgeClass(game: string): string {
  return `game-badge-${game}` in {} ? `game-badge-${game}` : "game-badge-OTHER";
}

/** Return CSS classes for a rarity badge */
export function rarityBadgeClass(rarity: string): string {
  const normalized = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase();
  return `rarity-${normalized}`;
}

/** Bot avatar placeholder */
export function BotAvatarPlaceholder({
  username,
  size = "md",
}: {
  username: string;
  size?: "sm" | "md" | "lg";
}) {
  const initial = username[0]?.toUpperCase() ?? "B";
  const sizeClass = {
    sm: "h-8 w-8 text-sm",
    md: "h-12 w-12 text-lg",
    lg: "h-16 w-16 text-2xl",
  }[size];

  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-rbx bg-rbx-blue font-extrabold text-white select-none",
        sizeClass
      )}
    >
      {initial}
    </div>
  );
}
