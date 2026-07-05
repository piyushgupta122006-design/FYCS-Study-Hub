import React from "react";

// Detects the specific error signatures thrown when a lazy-loaded chunk
// 404s after a new deploy overwrote the old hashed JS files. Different
// browsers phrase this differently, so we match on all known variants.
const isChunkLoadError = (error) => {
  const msg = error?.message || "";
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    error?.name === "ChunkLoadError"
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);

    if (isChunkLoadError(error)) {
      // A stale chunk means the user's tab is running an old build.
      // Force a single hard reload to pull the fresh index.html + chunks.
      // The sessionStorage flag prevents an infinite reload loop if the
      // new build somehow has the same problem (e.g. offline).
      const alreadyRetried = sessionStorage.getItem("chunk-reload-attempted");
      if (!alreadyRetried) {
        sessionStorage.setItem("chunk-reload-attempted", "1");
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#FFD700]/40 border-t-[#FFD700] animate-spin" />
          <p className="text-sm text-white/70 max-w-xs">
            {this.state.isChunkError
              ? "A new version of the site is available. Refreshing…"
              : "Something went wrong. Please refresh the page."}
          </p>
          {!this.state.isChunkError && (
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#FFD700] text-black font-semibold text-sm"
            >
              Refresh
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
