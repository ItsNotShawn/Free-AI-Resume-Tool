import type { ListSection } from "@/lib/types";

/** Wording for each list-style section (education, certifications, extras). */
export type SectionConfig = {
  name: string;
  question: string;
  help: string;
  title: { label: string; placeholder: string };
  org: { label: string; placeholder: string };
  dates: { label: string; placeholder: string } | null;
  details: { label: string; placeholder: string; long: boolean } | null;
  addLabel: string;
  itemName: string;
};

export const SECTIONS: Record<ListSection, SectionConfig> = {
  education: {
    name: "Education",
    question: "Where did you go to school?",
    help: "Degrees, diplomas, bootcamps or programs. Add each one separately.",
    title: { label: "Degree or program", placeholder: "B.S. Mechanical Engineering" },
    org: { label: "School", placeholder: "State University" },
    dates: { label: "Dates or graduation year", placeholder: "2016 – 2020" },
    details: { label: "Anything else (optional)", placeholder: "Honors, GPA, minor, relevant coursework", long: false },
    addLabel: "Add a school",
    itemName: "school",
  },
  certifications: {
    name: "Certifications & licenses",
    question: "Do you have any certifications or licenses?",
    help: "Professional certifications, licenses, or completed courses with a credential.",
    title: { label: "Certification or license", placeholder: "Google Analytics Certification" },
    org: { label: "Issued by", placeholder: "Google" },
    dates: { label: "When (optional)", placeholder: "2023, expires 2026" },
    details: null,
    addLabel: "Add a certification",
    itemName: "certification",
  },
  projects: {
    name: "Projects",
    question: "Tell me about projects worth showing",
    help: "Side projects, school projects, freelance work or anything you built.",
    title: { label: "Project name", placeholder: "Neighborhood food-bank tracker" },
    org: { label: "Your role or context (optional)", placeholder: "Solo side project" },
    dates: { label: "When (optional)", placeholder: "2024" },
    details: { label: "What it was and what you did", placeholder: "Talk it through: what it does, what you built, how it turned out.", long: true },
    addLabel: "Add a project",
    itemName: "project",
  },
  volunteer: {
    name: "Volunteer work",
    question: "Any volunteer work?",
    help: "Unpaid roles count, especially if they show skills the job needs.",
    title: { label: "Your role", placeholder: "Event coordinator" },
    org: { label: "Organization", placeholder: "Riverside Food Pantry" },
    dates: { label: "When (optional)", placeholder: "2021 – present" },
    details: { label: "What you did", placeholder: "Talk it through: what you did and what came of it.", long: true },
    addLabel: "Add volunteer work",
    itemName: "volunteer role",
  },
  awards: {
    name: "Awards",
    question: "Any awards or recognition?",
    help: "Awards, scholarships, honors or competitions.",
    title: { label: "Award", placeholder: "Employee of the Quarter" },
    org: { label: "From", placeholder: "Acme Corp" },
    dates: { label: "Year (optional)", placeholder: "2023" },
    details: { label: "What it was for (optional)", placeholder: "", long: false },
    addLabel: "Add an award",
    itemName: "award",
  },
  languages: {
    name: "Languages",
    question: "What languages do you speak?",
    help: "Spoken languages and how well you speak them.",
    title: { label: "Language", placeholder: "Spanish" },
    org: { label: "How well", placeholder: "Conversational" },
    dates: null,
    details: null,
    addLabel: "Add a language",
    itemName: "language",
  },
};
