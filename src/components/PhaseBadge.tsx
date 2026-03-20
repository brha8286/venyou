"use client";

type Phase =
  | "Talent"
  | "Promotion"
  | "Production"
  | "Transportation"
  | "Crew"
  | "Event Day"
  | "Strike"
  | "Post-Event";

const phaseConfig: Record<Phase, string> = {
  Talent: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Promotion: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Production: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Transportation: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Crew: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Event Day": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Strike: "bg-red-500/20 text-red-400 border-red-500/30",
  "Post-Event": "bg-green-500/20 text-green-400 border-green-500/30",
};

interface PhaseBadgeProps {
  phase: Phase;
}

export default function PhaseBadge({ phase }: PhaseBadgeProps) {
  const classes = phaseConfig[phase];
  return (
    <span
      data-ui="phase-badge"
      data-phase={phase}
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${classes}`}
    >
      {phase}
    </span>
  );
}
