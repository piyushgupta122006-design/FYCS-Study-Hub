import { Code, Edit3, FileText, Filter, Search as SearchIcon, Star } from "lucide-react";
import { useMemo, useState } from "react";
import SubjectCard from "../components/SubjectCard";

export default function Search() {
  const [q, setQ] = useState("");

  const materials = useMemo(
    () => [
      {
        id: "c-unit-1",
        title: "Unit 1 - Introduction to C Programming",
        subtitle: "Semester 1 • Programming in C",
        tags: ["Notes", "Unit 1", "Basics"],
        isLive: true,
      },
      {
        id: "c-practical",
        title: "Practical File - C Programs",
        subtitle: "Semester 1 • Programming in C",
        tags: ["Practicals", "Lab", "Programs"],
        isLive: true,
      },
      {
        id: "maths-imp",
        title: "Important Questions - Mathematics I",
        subtitle: "Semester 1 • Mathematics I",
        tags: ["IMP", "Important", "Exam"],
        isLive: true,
      },
      {
        id: "viva-de",
        title: "Viva Questions - Digital Electronics",
        subtitle: "Semester 1 • Digital Electronics",
        tags: ["Questions", "Viva"],
        isLive: true,
      },
      {
        id: "ds-complete",
        title: "Data Structures Complete Notes",
        subtitle: "Semester 2 • Data Structures",
        tags: ["Notes", "Complete", "All Units"],
        isLive: true,
      },
      {
        id: "dbms-assign",
        title: "DBMS Assignment Solutions",
        subtitle: "Semester 2 • Database Management",
        tags: ["Assignments", "Solutions"],
        isLive: true,
      },
    ],
    []
  );

  const filtered = materials.filter((m) => {
    if (!q.trim()) return true;
    const hay = `${m.title} ${m.subtitle} ${(m.tags || []).join(" ")}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <div className="p-5 pt-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 glass-card px-4 py-3 flex items-center gap-3">
          <SearchIcon size={18} className="text-white/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search materials, subjects..."
            className="w-full bg-transparent outline-none text-sm placeholder:text-white/35"
          />
        </div>
        <button
          type="button"
          className="glass-card h-12 w-12 flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="Filters"
          title="Filters"
        >
          <Filter size={18} className="text-white/70" />
        </button>
      </div>

      <div className="space-y-4">
        {filtered.map((m) => (
          <SubjectCard
            key={m.id}
            icon={
              m.tags.includes('Notes') ? <FileText size={18} className="text-blue-400" /> :
              m.tags.includes('Practicals') ? <Code size={18} className="text-green-400" /> :
              m.tags.includes('IMP') ? <Star size={18} className="text-yellow-400" /> :
              m.tags.includes('Assignment') ? <Edit3 size={18} className="text-purple-400" /> :
              <FileText size={18} className="text-white/90" />
            }
            title={m.title}
            subtitle={m.subtitle}
            tags={m.tags}
            isLive={m.isLive}
            onView={() => {}}
          />
        ))}
      </div>
    </div>
  );
}

