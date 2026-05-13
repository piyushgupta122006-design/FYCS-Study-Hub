// Mock Database for CS Study Hub
// This simulates a real database with relational data

export const mockData = {
  // Semesters Data
  semesters: [
    { id: "1", name: "Semester 1", active: true },
    { id: "2", name: "Semester 2", active: true },
    { id: "3", name: "Semester 3", active: true },
    { id: "4", name: "Semester 4", active: true }
  ],

  // Subjects Data (4 subjects per semester)
  subjects: [
    // Semester 1 Subjects
    { id: "c-prog", name: "C Programming", semId: "1", icon: "Code" },
    { id: "maths-1", name: "Mathematics I", semId: "1", icon: "Sigma" },
    { id: "de", name: "Digital Electronics", semId: "1", icon: "Cpu" },
    { id: "it-tools", name: "IT Tools", semId: "1", icon: "Wrench" },
    
    // Semester 2 Subjects
    { id: "ds", name: "Data Structures", semId: "2", icon: "Brackets" },
    { id: "dbms", name: "DBMS", semId: "2", icon: "Database" },
    { id: "oop", name: "OOP", semId: "2", icon: "Boxes" },
    { id: "os", name: "Operating Systems", semId: "2", icon: "Monitor" },
    
    // Semester 3 Subjects
    { id: "cn", name: "Computer Networks", semId: "3", icon: "Network" },
    { id: "java", name: "Core Java", semId: "3", icon: "Coffee" },
    { id: "se", name: "Software Engineering", semId: "3", icon: "Book" },
    { id: "ada", name: "Automata Theory", semId: "3", icon: "Settings" },
    
    // Semester 4 Subjects
    { id: "wt", name: "Web Technologies", semId: "4", icon: "Globe" },
    { id: "ai", name: "Artificial Intelligence", semId: "4", icon: "Bot" },
    { id: "ml", name: "Machine Learning", semId: "4", icon: "Cpu" },
    { id: "cyber", name: "Cyber Security", semId: "4", icon: "Shield" }
  ],

  // Materials Data (Approved + Pending)
  materials: [
    // === APPROVED MATERIALS (8 items) ===
    {
      id: "mat-001",
      title: "Unit 1 Notes - C Programming Basics",
      subjectId: "c-prog",
      semId: "1",
      type: "Notes",
      link: "https://drive.google.com/file/d/1example1",
      status: "Approved",
      views: 1247,
      downloads: 389,
      uploadedBy: "Admin",
      date: "2024-01-15"
    },
    {
      id: "mat-002",
      title: "Maths I - Previous Year Questions 2023",
      subjectId: "maths-1",
      semId: "1",
      type: "PYQ",
      link: "https://drive.google.com/file/d/1example2",
      status: "Approved",
      views: 892,
      downloads: 256,
      uploadedBy: "Admin",
      date: "2024-01-10"
    },
    {
      id: "mat-003",
      title: "Data Structures - Complete Guide",
      subjectId: "ds",
      semId: "2",
      type: "Notes",
      link: "https://drive.google.com/file/d/1example3",
      status: "Approved",
      views: 1567,
      downloads: 634,
      uploadedBy: "Admin",
      date: "2024-01-20"
    },
    {
      id: "mat-004",
      title: "DBMS Important Queries",
      subjectId: "dbms",
      semId: "2",
      type: "Practical",
      link: "https://drive.google.com/file/d/1example4",
      status: "Approved",
      views: 743,
      downloads: 189,
      uploadedBy: "Admin",
      date: "2024-01-18"
    },
    {
      id: "mat-005",
      title: "Java OOP Concepts Explained",
      subjectId: "java",
      semId: "3",
      type: "Notes",
      link: "https://drive.google.com/file/d/1example5",
      status: "Approved",
      views: 921,
      downloads: 298,
      uploadedBy: "Admin",
      date: "2024-01-25"
    },
    {
      id: "mat-006",
      title: "Web Technologies Assignment Solutions",
      subjectId: "wt",
      semId: "4",
      type: "Assignment",
      link: "https://drive.google.com/file/d/1example6",
      status: "Approved",
      views: 654,
      downloads: 167,
      uploadedBy: "Admin",
      date: "2024-01-22"
    },
    {
      id: "mat-007",
      title: "Digital Electronics - Unit 2",
      subjectId: "de",
      semId: "1",
      type: "Notes",
      link: "https://drive.google.com/file/d/1example7",
      status: "Approved",
      views: 432,
      downloads: 123,
      uploadedBy: "Admin",
      date: "2024-01-12"
    },
    {
      id: "mat-008",
      title: "Software Engineering - SDLC Models",
      subjectId: "se",
      semId: "3",
      type: "Notes",
      link: "https://drive.google.com/file/d/1example8",
      status: "Approved",
      views: 567,
      downloads: 145,
      uploadedBy: "Admin",
      date: "2024-01-28"
    },

    // === PENDING MATERIALS (4 items) ===
    {
      id: "mat-009",
      title: "C Programming Practical Files",
      subjectId: "c-prog",
      semId: "1",
      type: "Practical",
      link: "https://drive.google.com/file/d/1pending1",
      status: "Pending",
      views: 0,
      downloads: 0,
      uploadedBy: "Rahul Kumar",
      date: "2024-01-30"
    },
    {
      id: "mat-010",
      title: "Data Structures Lab Manual",
      subjectId: "ds",
      semId: "2",
      type: "Practical",
      link: "https://drive.google.com/file/d/1pending2",
      status: "Pending",
      views: 0,
      downloads: 0,
      uploadedBy: "Priya Sharma",
      date: "2024-01-29"
    },
    {
      id: "mat-011",
      title: "Mathematics I Assignment 3",
      subjectId: "maths-1",
      semId: "1",
      type: "Assignment",
      link: "https://drive.google.com/file/d/1pending3",
      status: "Pending",
      views: 0,
      downloads: 0,
      uploadedBy: "Amit Patel",
      date: "2024-01-31"
    },
    {
      id: "mat-012",
      title: "AI Neural Networks Presentation",
      subjectId: "ai",
      semId: "4",
      type: "Notes",
      link: "https://drive.google.com/file/d/1pending4",
      status: "Pending",
      views: 0,
      downloads: 0,
      uploadedBy: "Sneha Gupta",
      date: "2024-02-01"
    }
  ]
};

// Utility functions for data manipulation
export const utils = {
  // Get subjects by semester ID
  getSubjectsBySemester: (semId) => {
    return mockData.subjects.filter(subject => subject.semId === semId);
  },

  // Get materials by subject ID
  getMaterialsBySubject: (subjectId) => {
    return mockData.materials.filter(material => 
      material.subjectId === subjectId && material.status === "Approved"
    );
  },

  // Get materials by semester ID
  getMaterialsBySemester: (semId) => {
    return mockData.materials.filter(material => 
      material.semId === semId && material.status === "Approved"
    );
  },

  // Get pending materials
  getPendingMaterials: () => {
    return mockData.materials.filter(material => material.status === "Pending");
  },

  // Get approved materials
  getApprovedMaterials: () => {
    return mockData.materials.filter(material => material.status === "Approved");
  },

  // Generate unique ID
  generateId: () => {
    return `mat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};

export default mockData;