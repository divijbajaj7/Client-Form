import { ArrowUpRight } from 'lucide-react';

interface NeonSurveyButtonProps {
  onClick: () => void;
  label?: string;
  size?: 'md' | 'lg';
}

export function NeonSurveyButton({
  onClick,
  label = 'Take the AI Readiness Survey',
  size = 'lg',
}: NeonSurveyButtonProps) {
  const sizeClasses =
    size === 'lg'
      ? 'px-6 py-3.5 text-sm sm:text-base gap-3'
      : 'px-5 py-2.5 text-sm gap-2.5';

  return (
    <div className="neon-orbit-wrapper">
      <button
        type="button"
        onClick={onClick}
        className={`group relative inline-flex items-center justify-center rounded-[11px] bg-[#0B1120] font-semibold text-white transition-colors duration-150 hover:bg-[#111A2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0 cursor-pointer ${sizeClasses}`}
      >
        <span>{label}</span>
        <ArrowUpRight
          className="h-4 w-4 text-cyan-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
