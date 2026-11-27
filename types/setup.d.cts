// Types for `glancecard/setup` (site/editor.js): the website's setup editor without its page.
// The workflow, embed and prompt functions rewrite the README's own blocks, which the caller
// passes in, by exact strings; a block that has drifted throws.

export const LOOKS: string[];
export const DARK_LOOKS: string[];
export const LIGHT_LOOKS: string[];
export const TUBES: string[];
export const LIGHT: string;
/** The theme names in the order the Action lists them. */
export const THEME_ORDER: string[];
/** When a seasonal look is worn, by look. */
export const SEASONS: Record<string, string>;
export const STARS: string[];
export const SECTIONS: string[];
export const LIGHT_SWATCHES: Record<string, string>;
export const MINUTE: number;

export function lightOf(look: string): string;
export function offsetMinutes(zone: string, at: Date): number;
export function hours(zone: string, date?: Date): { utcHour: number; minutes: number; label: string; shift: number }[];

export interface Refresh {
  often?: "day" | "week";
  utcHour?: number;
  /** Null: untouched, no `time-zone` line. */
  zone?: string | null;
  /** Whether the zone was picked, and goes into the prompt too. */
  explicit?: boolean;
  date?: Date;
}

export const DEFAULT_REFRESH: Required<Omit<Refresh, "date">>;

export function refreshPlan(refresh?: Refresh): {
  cron: string;
  comment: string;
  cadence: string;
  zone: string | null;
  promptZone: string | null;
};

export function parseThemes(value: string): string[];
export function fileNames(base: string, themes: string[]): [string, string][];

export interface Choice {
  /** `follow`: a dark look and a light side for a <picture>; `one`: one look, one file. */
  mode?: "follow" | "one";
  dark?: string;
  light?: "own" | "daylight";
  look?: string;
  calendar?: string;
  stars?: string;
  sections?: string[];
  refresh?: Refresh;
}

export const DEFAULT: Required<Omit<Choice, "refresh">>;

/** What a choice writes: each input line (null where the default needs none), the themes, the embed. */
export interface Plan {
  theme: string | null;
  sections: string | null;
  calendar: string | null;
  stars: string | null;
  themes: string[];
  embed: { picture: boolean; look?: string; dark?: string; light?: string };
  season: string | null;
  seasonPaired: boolean;
  refresh: ReturnType<typeof refreshPlan>;
}

export function plan(choice?: Choice): Plan;
/** The README's "Set it up by hand" workflow, for the plan. */
export function workflow(yaml: string, plan: Plan): string;
/** The README's "Show a card" embed, for the plan. */
export function embed(snippet: string, plan: Plan): string;
/** The README's one-paste prompt, for the plan. */
export function prompt(text: string, plan: Plan): string;

// What the website's editor shows beside the choice.

/** The look a card shows on `side` for a choice. */
export function previewLook(choice: Pick<Choice, "mode" | "dark" | "light" | "look">, side?: "dark" | "light"): string;
/** The file the Action writes for that card and side. */
export function previewFile(plan: Plan, card: "profile" | "repo", side?: "dark" | "light"): string;
/** A `sections` input line as a list; all of them for none. */
export function sectionsOf(line: string | null): string[];
/** The alt text of the card shown for a choice. */
export function previewAlt(choice: { card: "profile" | "repo"; look: string; calendar?: string; stars?: string; sections?: string[] }): string;
/** When a seasonal look is worn and what the card wears out of season; empty for any other look. */
export function seasonHint(look: string, paired?: boolean): string;
/** The refresh in words, in the zone and in UTC. */
export function refreshNote(refresh: { often?: "day" | "week"; utcHour: number; zone: string; date?: Date }): string;
