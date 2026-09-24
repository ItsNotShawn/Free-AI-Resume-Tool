import { toMonthInput } from "@/lib/months";
import type { Role } from "@/lib/types";

const input =
  "mt-1 block w-full rounded-md border border-stone-300 bg-transparent px-3 py-2 dark:border-stone-700";

/** Shared inputs for creating and editing a role. */
export function RoleFields({ role }: { role?: Role }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium">Job title *</span>
        <input name="title" required maxLength={200} defaultValue={role?.title} className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Company *</span>
        <input name="company" required maxLength={200} defaultValue={role?.company} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm font-medium">Location</span>
        <input
          name="location"
          maxLength={200}
          placeholder="City, remote, etc. (optional)"
          defaultValue={role?.location ?? ""}
          className={input}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Start month</span>
        <input
          type="month"
          name="start_month"
          placeholder="YYYY-MM"
          defaultValue={toMonthInput(role?.start_month ?? null)}
          className={input}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">End month</span>
        <input
          type="month"
          name="end_month"
          placeholder="YYYY-MM"
          defaultValue={toMonthInput(role?.end_month ?? null)}
          className={input}
        />
      </label>
      <label className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="is_current" defaultChecked={role?.is_current ?? false} />
        <span className="text-sm">I currently work here (end month is ignored)</span>
      </label>
    </div>
  );
}
