import { Loader2 } from "lucide-react";

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col h-screen w-full items-center justify-center bg-[#0a0a0a]">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <div className="absolute w-16 h-16 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin opacity-50"></div>
        {/* Inner spinning icon */}
        <Loader2 className="text-yellow-400 animate-spin z-10" size={32} />
      </div>
      <p className="mt-4 text-zinc-400 text-sm font-medium animate-pulse">Loading awesomeness...</p>
    </div>
  );
}