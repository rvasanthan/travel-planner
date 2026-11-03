import { Plane } from "lucide-react";

const Cloud = ({ className, style }) => (
  <svg viewBox="0 0 80 44" className={`absolute fill-white ${className}`} style={style}>
    <path d="M12 42a12 12 0 0 1-1-24 16 16 0 0 1 30-6 14 14 0 0 1 26 8 11 11 0 0 1-2 22z" />
  </svg>
);

// Purely decorative travel scenery behind the page content.
export default function TravelBackdrop() {
  return (
    <div className="backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <Cloud className="top-[14%] h-14 w-28 opacity-90 motion-safe:animate-drift" />
      <Cloud className="top-[42%] h-10 w-20 opacity-80 motion-safe:animate-drift-slow" style={{ animationDelay: "-40s" }} />
      <Cloud className="top-[70%] h-16 w-32 opacity-70 motion-safe:animate-drift" style={{ animationDelay: "-25s" }} />

      <div className="absolute left-0 top-[24%] w-full motion-safe:animate-cruise">
        <div className="flex items-center gap-3">
          <Plane className="h-7 w-7 rotate-45 text-teal-600/40" />
          <span className="h-px w-40 border-t-2 border-dashed border-teal-600/30" />
        </div>
      </div>

      <svg viewBox="0 0 120 150" className="absolute right-[4%] top-[52%] hidden h-40 w-32 motion-safe:animate-float lg:block">
        <path d="M60 4C30 4 10 28 10 54c0 24 22 44 40 56h20c18-12 40-32 40-56C110 28 90 4 60 4z" fill="#fde68a" opacity=".75" />
        <path d="M60 4c-14 12-20 34-20 56s8 38 14 50h12c6-12 14-28 14-50S74 16 60 4z" fill="#99f6e4" opacity=".7" />
        <path d="M50 110h20l-3 22H53z" fill="#d6b88a" opacity=".8" />
        <path d="M50 110l-6 0M70 110l6 0" stroke="#b08968" strokeWidth="2" />
      </svg>

      <svg viewBox="0 0 100 100" className="absolute -left-10 bottom-[12%] h-56 w-56 text-teal-700/10 motion-safe:animate-spin-slow">
        <g fill="currentColor">
          <path d="M50 2l6 40 40 8-40 8-6 40-6-40-40-8 40-8z" />
          <path d="M50 14l3 30 30 6-30 6-3 30-3-30-30-6 30-6z" opacity=".5" />
        </g>
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
      </svg>

      <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className="absolute bottom-0 h-40 w-full sm:h-52">
        <path d="M0 220V150l140-70 120 60 160-110 150 100 160-80 170 90 140-70 130 60 130-50 140 90v50z" fill="#ccfbf1" opacity=".55" />
        <path d="M0 220v-50l180-60 140 50 200-80 180 70 200-50 160 60 200-40 180 50v50z" fill="#99f6e4" opacity=".35" />
      </svg>
    </div>
  );
}
