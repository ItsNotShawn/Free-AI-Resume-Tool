import { useState } from "react";
import { StepShell } from "@/components/StepShell";
import { LongAnswer } from "@/components/LongAnswer";
import { ConfirmButton, Notice, TextField } from "@/components/ui";
import { Link } from "@/router";
import { useMemoryFile } from "@/lib/memory/store";
import { EXTRA_SECTIONS, emptyRole } from "@/lib/memory/schema";
import {
  addEntry,
  addManualSkills,
  getNote,
  manualSkills,
  removeAtom,
  removeEntry,
  setAbout,
  setExtras,
  setNote,
  setProfile,
  updateEntry,
  updateRole,
} from "@/lib/memory/edit";
import { SECTIONS } from "@/lib/sections";
import { ROLE_QUESTIONS, buildSteps, stepHref } from "@/lib/steps";
import type { ExtraSection, ListSection, Role, RolePrompt, WorkMode } from "@/lib/types";

/** Routes /setup/<step> to the right screen. */
export function Setup({ step }: { step: string }) {
  const { memory } = useMemoryFile();

  if (step === "" || step === "contact") return <ContactStep />;
  if (step === "jobs") return <JobsCountStep />;

  const job = /^job\/([^/]+)\/(basics|did|wins|tools)$/.exec(step);
  if (job) {
    const role = memory.roles.find((r) => r.id === job[1]);
    if (!role) return <MissingStep />;
    return job[2] === "basics" ? <JobBasicsStep role={role} /> : <JobQuestionStep role={role} prompt={job[2] as RolePrompt} />;
  }

  if (step === "education" || step === "certifications") return <ListStep section={step} />;
  if ((EXTRA_SECTIONS as string[]).includes(step)) return <ListStep section={step as ExtraSection} />;
  if (step === "skills") return <SkillsStep />;
  if (step === "hobbies") return <HobbiesStep />;
  if (step === "extras") return <ExtrasStep />;
  if (step === "about/process" || step === "about/motivation") return <AboutStep which={step} />;
  if (step === "done") return <DoneStep />;
  return <MissingStep />;
}

function MissingStep() {
  return (
    <StepShell step="contact" question="That step doesn't exist">
      <p className="muted">
        It may belong to a job that was removed. <Link to="/memory" className="underline">Go to the overview</Link>.
      </p>
    </StepShell>
  );
}

/* ------------------------------- Contact ------------------------------- */

function ContactStep() {
  const { memory, update } = useMemoryFile();
  const p = memory.profile;
  const set = (patch: Partial<typeof p>) => update(setProfile(patch));
  const links = [p.links[0] ?? "", p.links[1] ?? ""];

  return (
    <StepShell
      step="contact"
      question="Let's start with how employers reach you"
      help="This only appears at the top of your resume. It stays in your file."
    >
      <TextField label="Full name" value={p.name} onChange={(v) => set({ name: v })} autoComplete="name" placeholder="Jordan Smith" />
      <TextField label="Email" type="email" value={p.email} onChange={(v) => set({ email: v })} autoComplete="email" placeholder="jordan@example.com" />
      <TextField label="Phone" type="tel" value={p.phone} onChange={(v) => set({ phone: v })} autoComplete="tel" placeholder="(555) 555-0142" />
      <TextField
        label="City and state"
        value={p.location}
        onChange={(v) => set({ location: v })}
        autoComplete="address-level2"
        placeholder="Springfield, MA"
        hint="City and state is plenty. Leave out your street address."
      />
      {links.map((l, i) => (
        <TextField
          key={i}
          label={i === 0 ? "LinkedIn or website (optional)" : "Another link (optional)"}
          type="url"
          value={l}
          placeholder={i === 0 ? "linkedin.com/in/jordansmith" : "jordansmith.com"}
          onChange={(v) => {
            const next = [...links];
            next[i] = v;
            set({ links: next });
          }}
        />
      ))}
    </StepShell>
  );
}

/* ------------------------------- Jobs ------------------------------- */

const COUNTS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function JobsCountStep() {
  const { memory, update } = useMemoryFile();
  const existing = memory.roles.length;
  const [count, setCount] = useState<number | null>(existing > 0 ? existing : null);

  function onNext() {
    const n = count ?? 0;
    let roles: Role[] = memory.roles;
    if (n > existing) {
      const fresh = Array.from({ length: n - existing }, emptyRole);
      roles = [...memory.roles, ...fresh];
      update((m) => ({ ...m, roles: [...m.roles, ...fresh] }));
    }
    return roles.length > 0 ? `job/${roles[0].id}/basics` : "education";
  }

  return (
    <StepShell
      step="jobs"
      question="How many jobs do you want on your resume?"
      help="Most resumes cover the last 10 to 15 years. Count internships and part-time work if they're relevant. You can add or remove jobs later."
      onNext={onNext}
      nextDisabled={count === null}
    >
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Number of jobs">
        {COUNTS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={count === n}
            onClick={() => setCount(n)}
            className={count === n ? "btn-primary" : "btn-secondary"}
          >
            {n === 0 ? "None yet" : n}
          </button>
        ))}
        <input
          className="input text-center"
          type="number"
          inputMode="numeric"
          min={9}
          max={30}
          placeholder="More"
          aria-label="More than 8 jobs"
          value={count !== null && count > 8 ? count : ""}
          onChange={(e) => {
            const v = Number(e.target.value);
            setCount(Number.isFinite(v) && v > 0 ? Math.min(30, Math.floor(v)) : null);
          }}
        />
      </div>
      {count !== null && count < existing && (
        <Notice tone="warn">
          You already have {existing} jobs. Nothing will be deleted. Remove jobs you don't want from the overview.
        </Notice>
      )}
      {count !== null && count > 0 && (
        <p className="muted text-sm">Next, it'll ask about each job one at a time, starting with your most recent.</p>
      )}
    </StepShell>
  );
}

const MODES: { value: WorkMode | null; label: string }[] = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
  { value: null, label: "Leave out" },
];

function JobBasicsStep({ role }: { role: Role }) {
  const { memory, update } = useMemoryFile();
  const i = memory.roles.findIndex((r) => r.id === role.id);
  const set = (patch: Partial<Role>) => update(updateRole(role.id, patch));

  return (
    <StepShell
      step={`job/${role.id}/basics`}
      question={i === 0 ? "Your most recent job: the basics" : `Job ${i + 1}: the basics`}
      help="Where you worked, your title, and when. Month and year is enough."
    >
      <TextField label="Company or organization" value={role.company} onChange={(v) => set({ company: v })} placeholder="Acme Corp" />
      <TextField label="Your job title" value={role.title} onChange={(v) => set({ title: v })} placeholder="Customer Support Lead" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Started"
          type="month"
          value={role.start_month ?? ""}
          onChange={(v) => set({ start_month: v || null })}
          placeholder="2021-03"
        />
        {!role.is_current && (
          <TextField
            label="Ended"
            type="month"
            value={role.end_month ?? ""}
            onChange={(v) => set({ end_month: v || null })}
            placeholder="2024-06"
          />
        )}
      </div>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={role.is_current}
          onChange={(e) => set({ is_current: e.target.checked, end_month: e.target.checked ? null : role.end_month })}
        />
        <span>I still work here</span>
      </label>
      <TextField label="Location (optional)" value={role.location} onChange={(v) => set({ location: v })} placeholder="Boston, MA" />
      <fieldset>
        <legend className="label">Where did you work?</legend>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.label}
              type="button"
              aria-pressed={role.work_mode === m.value}
              onClick={() => set({ work_mode: m.value })}
              className={role.work_mode === m.value ? "btn-primary px-3 py-2 text-sm" : "btn-secondary px-3 py-2 text-sm"}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>
    </StepShell>
  );
}

function roleName(role: Role): string {
  if (role.title && role.company) return `${role.title} at ${role.company}`;
  return role.company || role.title || "this job";
}

function JobQuestionStep({ role, prompt }: { role: Role; prompt: RolePrompt }) {
  const { memory, update } = useMemoryFile();
  const q = ROLE_QUESTIONS[prompt];
  return (
    <StepShell
      step={`job/${role.id}/${prompt}`}
      question={q.question}
      help={
        <>
          <span className="font-medium text-stone-900 dark:text-stone-100">{roleName(role)}.</span> {q.help}
        </>
      }
    >
      <LongAnswer
        label="Your answer"
        hideLabel
        value={getNote(memory, role.id, prompt)}
        onChange={(v) => update(setNote(role.id, prompt, v))}
        placeholder={q.placeholder}
      />
      <p className="text-sm text-stone-500">Skip anything that doesn't apply. Your words are saved exactly as you say them.</p>
    </StepShell>
  );
}

/* ---------------------- Education, certs, extras ---------------------- */

function ListStep({ section }: { section: ListSection }) {
  const { memory, update } = useMemoryFile();
  const cfg = SECTIONS[section];
  const entries = memory.sections[section];

  return (
    <StepShell step={section} question={cfg.question} help={cfg.help} nextLabel={entries.length ? "Next" : "Skip"}>
      {entries.length === 0 && <p className="muted">Nothing added yet.</p>}
      {entries.map((e, i) => (
        <div key={e.id} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">
              {cfg.itemName.charAt(0).toUpperCase() + cfg.itemName.slice(1)} {i + 1}
            </h2>
            <ConfirmButton confirmLabel="Remove" onConfirm={() => update(removeEntry(section, e.id))}>
              Remove
            </ConfirmButton>
          </div>
          <TextField
            label={cfg.title.label}
            value={e.title}
            placeholder={cfg.title.placeholder}
            onChange={(v) => update(updateEntry(section, e.id, { title: v }))}
          />
          <TextField
            label={cfg.org.label}
            value={e.org}
            placeholder={cfg.org.placeholder}
            onChange={(v) => update(updateEntry(section, e.id, { org: v }))}
          />
          {cfg.dates && (
            <TextField
              label={cfg.dates.label}
              value={e.dates}
              placeholder={cfg.dates.placeholder}
              onChange={(v) => update(updateEntry(section, e.id, { dates: v }))}
            />
          )}
          {cfg.details &&
            (cfg.details.long ? (
              <LongAnswer
                label={cfg.details.label}
                value={e.details}
                rows={5}
                placeholder={cfg.details.placeholder}
                onChange={(v) => update(updateEntry(section, e.id, { details: v }))}
              />
            ) : (
              <TextField
                label={cfg.details.label}
                value={e.details}
                placeholder={cfg.details.placeholder}
                onChange={(v) => update(updateEntry(section, e.id, { details: v }))}
              />
            ))}
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={() => update(addEntry(section))}>
        + {cfg.addLabel}
      </button>
    </StepShell>
  );
}

/* ------------------------------- Skills ------------------------------- */

function SkillsStep() {
  const { memory, update } = useMemoryFile();
  const [draft, setDraft] = useState("");
  const skills = manualSkills(memory);

  function add() {
    const parts = draft.split(/[,;\n]/);
    update(addManualSkills(parts));
    setDraft("");
  }

  return (
    <StepShell
      step="skills"
      question="Any other skills to add?"
      help="Skills and tools you mentioned for each job will be picked out for you in the next update. Add anything else here, like languages you code in, certifications-in-progress or soft skills you can back up."
      nextLabel={skills.length ? "Next" : "Skip"}
    >
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label htmlFor="skill-input" className="sr-only">
          Skills
        </label>
        <input
          id="skill-input"
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Excel, public speaking, Spanish"
        />
        <button type="submit" className="btn-secondary" disabled={!draft.trim()}>
          Add
        </button>
      </form>
      <p className="text-sm text-stone-500">Separate several with commas.</p>
      {skills.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <li key={s.id} className="inline-flex items-center gap-1 rounded-full border border-stone-300 py-1 pr-1 pl-3 text-sm dark:border-stone-700">
              {s.text}
              <button
                type="button"
                className="rounded-full px-2 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800"
                aria-label={`Remove ${s.text}`}
                onClick={() => update(removeAtom(s.id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </StepShell>
  );
}

/* --------------------------- Hobbies, extras --------------------------- */

function HobbiesStep() {
  const { memory, update } = useMemoryFile();
  return (
    <StepShell
      step="hobbies"
      question="What do you do outside of work?"
      help="Hobbies and interests. They'll only show up on a resume when they're relevant to the job, like woodworking for a maker-space role or coaching for a team-lead job."
      nextLabel={memory.about.hobbies.trim() ? "Next" : "Skip"}
    >
      <LongAnswer
        label="Your answer"
        hideLabel
        rows={6}
        value={memory.about.hobbies}
        onChange={(v) => update(setAbout({ hobbies: v }))}
        placeholder="For example: &quot;I restore old bikes, I'm into trail running, and I volunteer as a youth soccer coach on weekends…&quot;"
      />
    </StepShell>
  );
}

const EXTRA_LABELS: Record<ExtraSection, string> = {
  projects: "Projects",
  volunteer: "Volunteer work",
  awards: "Awards and honors",
  languages: "Languages you speak",
};

function ExtrasStep() {
  const { memory, update } = useMemoryFile();
  const chosen = new Set(memory.extras);

  function toggle(k: ExtraSection) {
    const next = new Set(chosen);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    update(setExtras(EXTRA_SECTIONS.filter((x) => next.has(x))));
  }

  return (
    <StepShell
      step="extras"
      question="Want to add any of these?"
      help="Pick any that apply. Each one gets its own short question next."
      onNext={() => EXTRA_SECTIONS.find((k) => chosen.has(k)) ?? "about/process"}
    >
      <div className="space-y-2">
        {EXTRA_SECTIONS.map((k) => (
          <label key={k} className="card flex cursor-pointer items-center gap-3 py-3">
            <input type="checkbox" className="h-5 w-5" checked={chosen.has(k)} onChange={() => toggle(k)} />
            <span>{EXTRA_LABELS[k]}</span>
          </label>
        ))}
      </div>
    </StepShell>
  );
}

/* ------------------------------- About ------------------------------- */

function AboutStep({ which }: { which: "about/process" | "about/motivation" }) {
  const { memory, update } = useMemoryFile();
  const isProcess = which === "about/process";
  const value = isProcess ? memory.about.work_process : memory.about.motivation;
  return (
    <StepShell
      step={which}
      question={isProcess ? "How do you like to work?" : "What excites you about your work?"}
      help={
        isProcess
          ? "Describe your process: how you take on a new problem, how you work with other people, what you're known for. This keeps your summary in your own voice."
          : "What kind of work gets you going, and what are you looking for next? This helps match your summary and tone to each job."
      }
      nextLabel={value.trim() ? "Next" : "Skip"}
    >
      <LongAnswer
        label="Your answer"
        hideLabel
        value={value}
        onChange={(v) => update(setAbout(isProcess ? { work_process: v } : { motivation: v }))}
        placeholder={
          isProcess
            ? "For example: \"I like to understand the whole problem before I touch anything, so I usually start by talking to the people involved…\""
            : "For example: \"I love the moment a messy process finally runs smoothly. Next I'd like to work somewhere smaller where I can own more of it…\""
        }
      />
    </StepShell>
  );
}

/* ------------------------------- Done ------------------------------- */

function DoneStep() {
  const { memory, download, dirty } = useMemoryFile();
  const steps = buildSteps(memory);
  return (
    <StepShell step="done" question="That's everything for now">
      <p className="muted">
        Your answers are in your memory file. Download it now so you have it, and open it here any time to keep going.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn-primary" onClick={download}>
          {dirty ? "Download your memory file" : "Download again"}
        </button>
        <Link to="/memory" className="btn-secondary">
          See the overview
        </Link>
      </div>
      <Notice>
        <strong className="font-semibold">Coming in the next update:</strong> add your own AI key and turn your answers into
        resume facts you confirm, then build a resume for a specific job.
      </Notice>
      <p className="text-sm text-stone-500">
        Want to change something? Go <Link to={stepHref(steps[0])} className="underline">back to the start</Link> or edit any
        section from the overview.
      </p>
    </StepShell>
  );
}
