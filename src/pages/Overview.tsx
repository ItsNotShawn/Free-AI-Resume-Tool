import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfirmButton, Notice } from "@/components/ui";
import { Link, navigate } from "@/router";
import { useMemoryFile } from "@/lib/memory/store";
import { emptyRole, EXTRA_SECTIONS } from "@/lib/memory/schema";
import { addRole, getNote, manualSkills, removeRole } from "@/lib/memory/edit";
import { formatRange } from "@/lib/months";
import { SECTIONS } from "@/lib/sections";
import { stepHref } from "@/lib/steps";
import type { ListSection, Role, RolePrompt } from "@/lib/types";

const PROMPTS: RolePrompt[] = ["did", "wins", "tools"];
const MODE_LABEL = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" } as const;

export function Overview() {
  const { memory, update, download, dirty, filename, clear } = useMemoryFile();
  const p = memory.profile;
  const skills = manualSkills(memory);

  function newJob() {
    const role = emptyRole();
    update(addRole(role));
    navigate(stepHref(`job/${role.id}/basics`));
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{p.name ? `${p.name}'s career memory` : "Your career memory"}</h1>
          <p className="muted mt-1 text-sm">File: {filename}</p>
        </div>
        <Link to="/setup/contact" className="btn-secondary">
          Guided setup
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        <Section title="Contact" edit="contact">
          {p.name || p.email || p.phone ? (
            <p className="muted">{[p.name, p.email, p.phone, p.location, ...p.links.filter(Boolean)].filter(Boolean).join(" · ")}</p>
          ) : (
            <Empty />
          )}
        </Section>

        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Jobs</h2>
            <button type="button" className="btn-quiet text-sm" onClick={newJob}>
              + Add a job
            </button>
          </div>
          {memory.roles.length === 0 ? (
            <Empty />
          ) : (
            <ul className="mt-3 divide-y divide-stone-200 dark:divide-stone-800">
              {memory.roles.map((r) => (
                <JobRow key={r.id} role={r} onRemove={() => update(removeRole(r.id))} />
              ))}
            </ul>
          )}
        </section>

        <ListSummary section="education" />
        <ListSummary section="certifications" />

        <Section title="Other skills" edit="skills">
          {skills.length ? <p className="muted">{skills.map((s) => s.text).join(", ")}</p> : <Empty />}
        </Section>

        <Section title="Hobbies" edit="hobbies">
          {memory.about.hobbies.trim() ? <p className="muted line-clamp-2">{memory.about.hobbies}</p> : <Empty />}
        </Section>

        <Section title="Optional sections" edit="extras">
          {memory.extras.length === 0 ? (
            <p className="muted">None chosen. Projects, volunteer work, awards and languages are available.</p>
          ) : (
            <ul className="muted space-y-1">
              {EXTRA_SECTIONS.filter((k) => memory.extras.includes(k)).map((k) => (
                <li key={k}>
                  <Link to={stepHref(k)} className="underline hover:no-underline">
                    {SECTIONS[k].name}
                  </Link>
                  : {countLabel(memory.sections[k].length, SECTIONS[k].itemName)}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="About you" edit="about/process">
          <p className="muted">
            How you work: {memory.about.work_process.trim() ? "answered" : "not answered yet"} · What excites you:{" "}
            {memory.about.motivation.trim() ? "answered" : "not answered yet"}
          </p>
        </Section>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Your file</h2>
        {dirty ? (
          <p className="muted mt-1">You have changes that aren't in your downloaded file yet.</p>
        ) : (
          <p className="muted mt-1">Your downloaded file is up to date.</p>
        )}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" className={dirty ? "btn-primary" : "btn-secondary"} onClick={download}>
            Download your memory file
          </button>
          <Link to="/" className="btn-secondary">
            Open a different file
          </Link>
          <ConfirmButton
            className="btn-quiet"
            confirmLabel={dirty ? "Close without downloading" : "Close and clear"}
            onConfirm={() => {
              clear();
              navigate("/");
            }}
          >
            Close and clear this browser
          </ConfirmButton>
        </div>
        <div className="mt-4">
          <Notice>
            Keep the downloaded file somewhere safe, like your Documents folder or cloud drive. It's the only copy outside this
            browser, and we can't recover it for you.
          </Notice>
        </div>
      </section>
    </AppShell>
  );
}

function Section({ title, edit, children }: { title: string; edit: string; children: ReactNode }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <Link to={stepHref(edit)} className="btn-quiet text-sm">
          Edit
        </Link>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Empty() {
  return <p className="text-stone-500">Nothing yet.</p>;
}

function countLabel(n: number, item: string): string {
  return `${n} ${item}${n === 1 ? "" : "s"}`;
}

function ListSummary({ section }: { section: ListSection }) {
  const { memory } = useMemoryFile();
  const entries = memory.sections[section].filter((e) => e.title || e.org);
  return (
    <Section title={SECTIONS[section].name} edit={section}>
      {entries.length === 0 ? (
        <Empty />
      ) : (
        <ul className="muted space-y-1">
          {entries.map((e) => (
            <li key={e.id}>{[e.title, e.org, e.dates].filter(Boolean).join(" · ")}</li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function JobRow({ role, onRemove }: { role: Role; onRemove: () => void }) {
  const { memory } = useMemoryFile();
  const answered = PROMPTS.filter((q) => getNote(memory, role.id, q).trim()).length;
  const range = formatRange(role.start_month, role.end_month, role.is_current);
  const meta = [range, role.location, role.work_mode ? MODE_LABEL[role.work_mode] : ""].filter(Boolean).join(" · ");

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="font-medium">
          {role.title || "Untitled role"}
          {role.company ? ` at ${role.company}` : ""}
        </p>
        {meta && <p className="muted text-sm">{meta}</p>}
        <p className="text-sm text-stone-500">{answered} of 3 questions answered</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link to={stepHref(`job/${role.id}/basics`)} className="btn-quiet text-sm">
          Edit
        </Link>
        <ConfirmButton className="btn-quiet text-sm" confirmLabel="Remove job and its answers" onConfirm={onRemove}>
          Remove
        </ConfirmButton>
      </div>
    </li>
  );
}
