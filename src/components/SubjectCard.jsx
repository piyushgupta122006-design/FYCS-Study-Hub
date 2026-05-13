import { Download, ExternalLink } from "lucide-react";

export default function SubjectCard({
  icon,
  title,
  subtitle,
  tags = [],
  isLive = false,
  onView,
}) {
  return (
    <div className="glass-card p-4 relative">
      {isLive ? (
        <div className="absolute right-3 top-3 badge-live">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm leading-snug truncate">{title}</h3>
          {subtitle ? (
            <p className="text-[11px] text-white/60 mt-1 truncate">
              {subtitle}
            </p>
          ) : null}

          {tags?.length ? (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/15"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          className="btn-primary flex-1 py-2 text-sm rounded-xl"
          onClick={onView}
        >
          View <ExternalLink size={16} />
        </button>
        <button
          type="button"
          className="h-10 w-10 rounded-xl glass-card flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="Download"
          title="Download"
        >
          <Download size={18} className="text-white/80" />
        </button>
      </div>
    </div>
  );
}

