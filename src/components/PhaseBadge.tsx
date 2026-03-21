"use client";

const phaseConfig: Record<string, { label: string; classes: string }> = {
  talent:       { label: "Talent",         classes: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  promotion:    { label: "Promotion",      classes: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  production:   { label: "Production",     classes: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  transportation: { label: "Transportation", classes: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  crew:         { label: "Crew",           classes: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  event_day:    { label: "Event Day",      classes: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  strike:       { label: "Strike",         classes: "bg-red-500/20 text-red-400 border-red-500/30" },
  post_event:   { label: "Post-Event",     classes: "bg-green-500/20 text-green-400 border-green-500/30" },
};

interface PhaseBadgeProps {
  phase: string;
}

export default function PhaseBadge({ phase }: PhaseBadgeProps) {
  const config = phaseConfig[phase] ?? { label: phase, classes: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" };
  return (
    <span
      data-ui="phase-badge"
      data-phase={phase}
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
