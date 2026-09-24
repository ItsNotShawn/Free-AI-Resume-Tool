/**
 * Single source of truth for which Claude model the app uses.
 * MVP decision: Claude Sonnet for both structuring and generation. No Opus.
 * ANTHROPIC_MODEL may override (e.g. a Haiku model for structuring later),
 * but any Opus model is refused and falls back to the default.
 */
export const DEFAULT_MODEL = "claude-sonnet-5";

export function claudeModel(): string {
  const override = process.env.ANTHROPIC_MODEL?.trim();
  if (!override) return DEFAULT_MODEL;
  if (/opus/i.test(override)) {
    console.warn(`[ai] ANTHROPIC_MODEL="${override}" is an Opus model, which this app doesn't use. Using ${DEFAULT_MODEL}.`);
    return DEFAULT_MODEL;
  }
  return override;
}
