import type { MemoryFile } from "@/lib/memory/schema";
import type { QuestionPrompt } from "@/lib/types";

/**
 * The guided setup, one short question per screen. The list is rebuilt from
 * the file, so adding a job or turning on an optional section adds steps.
 */

export const ROLE_QUESTIONS: Record<QuestionPrompt, { question: string; help: string; placeholder: string }> = {
  did: {
    question: "What did you do day to day?",
    help: "Your main responsibilities and projects, in your own words. Don't worry about polish; just talk it through.",
    placeholder:
      "For example: \"I handled all the incoming support tickets for our billing product, trained the new hires, and ran the weekly report for the ops team…\"",
  },
  wins: {
    question: "What were your wins?",
    help: "Results, improvements, numbers, praise, anything you're proud of. Rough numbers are fine. Say \"about\" if you're not sure.",
    placeholder:
      "For example: \"We cut the ticket backlog roughly in half in about three months. My manager asked me to write the training guide everyone uses now…\"",
  },
  tools: {
    question: "What tools, tech and skills did you use?",
    help: "Software, equipment, languages, methods. Just list them.",
    placeholder: "For example: \"Zendesk, Excel, a bit of SQL, Salesforce, de-escalation, onboarding and training\"",
  },
};

export type StepKey = string;

export function buildSteps(m: MemoryFile): StepKey[] {
  return [
    "contact",
    "jobs",
    ...m.roles.flatMap((r) => [`job/${r.id}/basics`, `job/${r.id}/did`, `job/${r.id}/wins`, `job/${r.id}/tools`]),
    "education",
    "certifications",
    "skills",
    "hobbies",
    "extras",
    ...m.extras,
    "about/process",
    "about/motivation",
    "done",
  ];
}

export function stepHref(step: StepKey): string {
  return `/setup/${step}`;
}

/** Short name of the part of the setup a step belongs to, for the progress line. */
export function stepGroup(step: StepKey, m: MemoryFile): string {
  if (step === "contact") return "Contact";
  if (step === "jobs") return "Jobs";
  if (step.startsWith("job/")) {
    const id = step.split("/")[1];
    const i = m.roles.findIndex((r) => r.id === id);
    return `Job ${i + 1} of ${m.roles.length}`;
  }
  if (step.startsWith("about/")) return "About you";
  if (step === "done") return "Done";
  const names: Record<string, string> = {
    education: "Education",
    certifications: "Certifications",
    skills: "Skills",
    hobbies: "Hobbies",
    extras: "Optional sections",
    projects: "Projects",
    volunteer: "Volunteer work",
    awards: "Awards",
    languages: "Languages",
  };
  return names[step] ?? "";
}
