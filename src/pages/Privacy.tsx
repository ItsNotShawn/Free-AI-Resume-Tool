import { AppShell } from "@/components/AppShell";
import { ConfirmButton, Notice } from "@/components/ui";
import { WhereYourDataGoes } from "@/components/WhereYourDataGoes";
import { useStore } from "@/lib/memory/store";
import { navigate } from "@/router";
import { useState } from "react";

export function Privacy() {
  const { memory, clear } = useStore();
  const [cleared, setCleared] = useState(false);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Where your data goes</h1>
      <p className="muted mt-2">
        Short version: nowhere we can see it. This site has no server, so nothing is stored on our end.
      </p>
      <div className="mt-6">
        <WhereYourDataGoes />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Clear this browser</h2>
        <p className="muted mt-1">
          Removes the backup copy this site keeps in this browser. Your downloaded memory file isn't affected.
        </p>
        <div className="mt-3">
          {cleared ? (
            <Notice tone="ok">Done. Nothing from this site is left in this browser.</Notice>
          ) : (
            <ConfirmButton
              className="btn-danger"
              confirmLabel={memory ? "Yes, clear it (undownloaded changes will be lost)" : "Yes, clear it"}
              onConfirm={() => {
                clear();
                setCleared(true);
                window.setTimeout(() => navigate("/"), 1500);
              }}
            >
              Clear this browser
            </ConfirmButton>
          )}
        </div>
      </section>
    </AppShell>
  );
}
