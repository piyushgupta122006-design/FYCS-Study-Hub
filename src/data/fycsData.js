/**
 * Dummy data (Semesters -> Subjects -> Materials)
 * This powers the dynamic routes:
 *  - /semester/:semId (subjects list)
 *  - /semester/:semId/:subjectId (materials list)
 */

export const fycsSemesters = [
  {
    id: "1",
    title: "Semester 1",
    subjects: [
      {
        id: "c",
        name: "Programming in C",
        short: "C Programming",
        materials: [
          {
            id: "c-unit-1",
            title: "Unit 1 Notes",
            meta: "Unit 1 • Basics",
            type: "Notes",
            tags: ["Notes", "Unit 1", "Basics"],
            link: "https://drive.google.com/",
            views: 247,
            downloads: 89,
            isLive: true,
          },
          {
            id: "c-practicals",
            title: "Practical File - C Programs",
            meta: "Lab • Programs",
            type: "Practicals",
            tags: ["Practicals", "Lab", "Programs"],
            link: "https://drive.google.com/",
            views: 312,
            downloads: 156,
            isLive: true,
          },
        ],
      },
      {
        id: "maths-1",
        name: "Mathematics I",
        short: "Maths I",
        materials: [
          {
            id: "maths-pyq-2024",
            title: "PYQ 2024 - Mathematics I",
            meta: "Final Exam • 2024",
            type: "PYQs",
            tags: ["PYQs", "2024", "Final Exam"],
            link: "https://drive.google.com/",
            views: 523,
            downloads: 287,
            isLive: true,
          },
        ],
      },
      {
        id: "de",
        name: "Digital Electronics",
        short: "Digital Electronics",
        materials: [
          {
            id: "de-viva",
            title: "Viva Questions - Digital Electronics",
            meta: "Viva • Questions",
            type: "Notes",
            tags: ["Questions", "Viva"],
            link: "https://drive.google.com/",
            views: 178,
            downloads: 92,
            isLive: true,
          },
        ],
      },
      {
        id: "it-tools",
        name: "IT Tools",
        short: "IT Tools",
        materials: [
          {
            id: "it-tools-handbook",
            title: "IT Tools - Quick Handbook",
            meta: "Basics • Short Notes",
            type: "Notes",
            tags: ["Notes", "Basics"],
            link: "https://drive.google.com/",
            views: 136,
            downloads: 64,
            isLive: true,
          },
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Semester 2",
    subjects: [
      {
        id: "ds",
        name: "Data Structures",
        short: "Data Structures",
        materials: [
          {
            id: "ds-complete",
            title: "Data Structures Complete Notes",
            meta: "All Units • Complete",
            type: "Notes",
            tags: ["Notes", "Complete", "All Units"],
            link: "https://drive.google.com/",
            views: 412,
            downloads: 234,
            isLive: true,
          },
        ],
      },
      {
        id: "dbms",
        name: "Database Management Systems",
        short: "DBMS",
        materials: [
          {
            id: "dbms-assign",
            title: "DBMS Assignment Solutions",
            meta: "Assignment • Solutions",
            type: "Assignments",
            tags: ["Assignments", "Solutions"],
            link: "https://drive.google.com/",
            views: 289,
            downloads: 167,
            isLive: true,
          },
        ],
      },
      {
        id: "oop",
        name: "Object Oriented Programming",
        short: "OOP",
        materials: [
          {
            id: "oop-unit-1",
            title: "Unit 1 Notes - OOP Concepts",
            meta: "Unit 1 • Concepts",
            type: "Notes",
            tags: ["Notes", "Unit 1"],
            link: "https://drive.google.com/",
            views: 198,
            downloads: 101,
            isLive: true,
          },
        ],
      },
      {
        id: "os",
        name: "Operating Systems (Intro)",
        short: "OS",
        materials: [
          {
            id: "os-basics",
            title: "OS Basics - Short Notes",
            meta: "Basics • Intro",
            type: "Notes",
            tags: ["Notes", "Basics"],
            link: "https://drive.google.com/",
            views: 154,
            downloads: 77,
            isLive: true,
          },
        ],
      },
    ],
  },
  {
    id: "3",
    title: "Semester 3",
    subjects: [
      {
        id: "cn",
        name: "Computer Networks",
        short: "Networks",
        materials: [
          {
            id: "cn-unit-1",
            title: "Unit 1 - Introduction to Networks",
            meta: "Unit 1 • Notes",
            type: "Notes",
            tags: ["Notes", "Unit 1"],
            link: "https://drive.google.com/",
            views: 121,
            downloads: 58,
            isLive: true,
          },
        ],
      },
      {
        id: "java",
        name: "Core Java",
        short: "Java",
        materials: [
          {
            id: "java-programs",
            title: "Core Java Programs (Practice Set)",
            meta: "Lab • Programs",
            type: "Practicals",
            tags: ["Lab", "Programs"],
            link: "https://drive.google.com/",
            views: 97,
            downloads: 44,
            isLive: true,
          },
        ],
      },
      {
        id: "se",
        name: "Software Engineering",
        short: "SE",
        materials: [
          {
            id: "se-pyq",
            title: "SE PYQs (Last 5 years)",
            meta: "PYQs • Compilation",
            type: "PYQs",
            tags: ["PYQs", "Compilation"],
            link: "https://drive.google.com/",
            views: 88,
            downloads: 39,
            isLive: true,
          },
        ],
      },
    ],
  },
  {
    id: "4",
    title: "Semester 4",
    subjects: [
      {
        id: "wt",
        name: "Web Technologies",
        short: "Web Tech",
        materials: [
          {
            id: "wt-notes",
            title: "WT Notes - Complete",
            meta: "Complete • Notes",
            type: "Notes",
            tags: ["Notes", "Complete"],
            link: "https://drive.google.com/",
            views: 76,
            downloads: 33,
            isLive: true,
          },
        ],
      },
      {
        id: "ai",
        name: "Artificial Intelligence",
        short: "AI",
        materials: [
          {
            id: "ai-unit-1",
            title: "AI Unit 1 Notes",
            meta: "Unit 1 • Notes",
            type: "Notes",
            tags: ["Notes", "Unit 1"],
            link: "https://drive.google.com/",
            views: 69,
            downloads: 29,
            isLive: true,
          },
        ],
      },
      {
        id: "mm",
        name: "Multimedia Systems",
        short: "Multimedia",
        materials: [
          {
            id: "mm-pyq",
            title: "Multimedia PYQs (2024)",
            meta: "PYQs • 2024",
            type: "PYQs",
            tags: ["PYQs", "2024"],
            link: "https://drive.google.com/",
            views: 54,
            downloads: 21,
            isLive: true,
          },
        ],
      },
    ],
  },
];

export function getSemesterById(semId) {
  return fycsSemesters.find((s) => s.id === String(semId));
}

export function getSubjectById(semId, subjectId) {
  const sem = getSemesterById(semId);
  if (!sem) return undefined;
  return sem.subjects.find((sub) => sub.id === String(subjectId));
}

