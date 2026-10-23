/** The privacy explanation, shown on the home page and the privacy page. */
export function WhereYourDataGoes() {
  const items = [
    {
      title: "We never see or store your information",
      body: "This site is just a page that runs in your browser. There's no server behind it, no database, no accounts and no analytics or tracking. Nothing you type is sent to us, because there's no \"us\" to send it to.",
    },
    {
      title: "Your memory file is yours",
      body: "Everything you tell it is kept in one file you download and keep, like any other document. Next time, open that file and pick up where you left off. While you work, a backup copy is kept in this browser on this device so a refresh doesn't lose anything. You can clear it any time.",
    },
    {
      title: "The AI runs on your own account",
      body: "When you ask the AI for help, your text goes straight from your browser to Anthropic (the company that makes Claude) using your own API key. It never passes through us. Anthropic handles it under your account and their API terms, and you pay them directly for what you use.",
    },
    {
      title: "Dictation uses your browser's speech service",
      body: "The Dictate button uses the speech-to-text built into your browser. Chrome sends your audio to Google to transcribe it, and Safari uses Apple. If you'd rather not, type your answers or use the mic on your phone's keyboard.",
    },
  ];
  return (
    <ul className="space-y-4">
      {items.map((it) => (
        <li key={it.title} className="card">
          <h3 className="font-medium">{it.title}</h3>
          <p className="muted mt-1">{it.body}</p>
        </li>
      ))}
    </ul>
  );
}
