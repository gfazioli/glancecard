// Types for glancecard's library entry (src/index.js). The data a fetcher returns is GitHub's,
// passed on to the models as it is, so it stays opaque; the models are typed as far as a
// program reads them.

export interface Client {
  graphql<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T>;
  rest<T = unknown>(path: string): Promise<{ data: T; link: string }>;
  /** An image as a data URI, or null. */
  image(url: string): Promise<string | null>;
}

export function createClient(options: {
  token: string;
  userAgent?: string;
  apiUrl?: string;
  timeoutMs?: number;
  imageTimeoutMs?: number;
  retryDelayMs?: number;
}): Client;

/** Avatars as data URIs keyed by URL, asked for at `px` pixels. */
export function loadImages(client: Client, urls: (string | null | undefined)[], px: number): Promise<Record<string, string>>;

/** A repository's starred weeks, oldest first. */
export type StarWeeks = { week: string; days: number[] }[];

export interface StarStore {
  load(): Promise<void>;
  /** Writes the file and returns its path; null without a file. */
  save(): Promise<string | null>;
  history(client: Client, full: string, count: number): Promise<StarWeeks | null>;
}

export function starStore(options?: { file?: string | null; now?: Date }): StarStore;
export function fetchStars(client: Client, full: string, count?: number): Promise<StarWeeks | null>;
export function mergeStars(histories: (StarWeeks | null)[]): StarWeeks | null;

/** What a fetcher returns: GitHub's answers as plain JSON, for a model. */
export interface CardData {
  kind: "profile" | "repo";
  fetchedAt: string;
  [field: string]: unknown;
}

export function fetchRepo(
  client: Client,
  full: string,
  options?: { now?: Date; timeZone?: string; maxCommits?: number; allowPrivate?: boolean; stars?: StarStore | boolean },
): Promise<CardData>;

export function fetchProfile(client: Client, login: string, options?: { now?: Date; stars?: StarStore | boolean }): Promise<CardData>;

export interface StarHistory {
  points: { day: string; total: number }[];
  total: number;
  last30: number;
  lastYear: number;
  best: { day: string; count: number } | null;
  first: string | null;
}

export interface ProfileModel {
  user: {
    login: string;
    name: string | null;
    bio: string | null;
    company: string | null;
    location: string | null;
    websiteUrl: string | null;
    createdAt: string;
    avatarUrl: string;
    followers: { totalCount: number };
    following: { totalCount: number };
  };
  counts: { prs: number; merged: number; issues: number };
  today: string;
  repoCount: number;
  stars: number;
  forks: number;
  topRepos: { name: string; stargazerCount: number; forkCount: number; primaryLanguage: { name: string; color: string | null } | null }[];
  languages: { name: string; color: string; count: number }[];
  years: number;
  joinedYear: number;
  calendar: { totalContributions: number };
  days: { day: string; count: number }[];
  commits: number;
  contributedRepos: number;
  starHistory: StarHistory | null;
}

export interface RepoModel {
  repo: {
    name: string;
    nameWithOwner: string;
    description: string | null;
    homepageUrl: string | null;
    createdAt: string;
    pushedAt: string;
    isArchived: boolean;
    isPrivate: boolean;
    stargazerCount: number;
    forkCount: number;
    watchers: { totalCount: number };
    licenseInfo: { spdxId: string } | null;
    repositoryTopics: { nodes: { topic: { name: string } }[] };
    openIssues: { totalCount: number };
    closedIssues: { totalCount: number };
    openPRs: { totalCount: number };
    mergedPRs: { totalCount: number };
    defaultBranchRef: { name: string };
  };
  today: string;
  now: string;
  idleDays: number;
  latestTag: string | null;
  days: { day: string; count: number }[];
  yearCommits: number;
  capped: boolean;
  streak: number;
  longest: number;
  activeDays: number;
  busiestDay: string;
  peakHour: number;
  weekly: number[];
  last30: number;
  languages: { name: string; color: string; share: number }[];
  essentials: { label: string; ok: boolean }[];
  commits: { abbreviatedOid: string; messageHeadline: string; authoredDate: string; day: string; author: { name: string; user: { login: string } | null } }[];
  totalCommits: number;
  releases: { tagName: string; publishedAt: string; day: string }[];
  releaseCount: number;
  cadence: unknown;
  downloads: number;
  contributors: { login: string; contributions: number; type: string; avatarUrl: string }[];
  contributorCount: number;
  bots: number;
  stars: StarHistory | null;
}

export function profileModel(data: CardData, options?: { now?: Date; timeZone?: string }): ProfileModel;
export function repoModel(data: CardData, options?: { now?: Date; timeZone?: string }): RepoModel;

/** Everything a renderer draws with, for one look. */
export type Theme = { readonly name: string; readonly isDark: boolean } & Record<string, unknown>;

export const LOOK_NAMES: string[];
/** The looks, and `dark` and `light` (Midnight and Daylight under the names the Action writes). */
export const THEME_NAMES: string[];
export function theme(look: string): Theme;
export function lightOf(look: string): string;
export function inSeason(name: string, day: string): boolean;
export function resolveLook(name: string, options?: { now?: Date; timeZone?: string; allSeasons?: boolean }): string;

export const REPO_SECTIONS: string[];
export const CALENDARS: string[];
export const STARS_CHARTS: string[];

export function renderRepo(
  model: RepoModel,
  options?: { theme?: Theme; sections?: string[]; images?: Record<string, string>; calendar?: string; starsChart?: string },
): string;

export function renderProfile(
  model: ProfileModel,
  options?: { theme?: Theme; images?: Record<string, string>; calendar?: string; stars?: boolean; starsChart?: string },
): string;

/** The file name of each repository's cards: its name, or owner-name where another in the list shares it. */
export function fileBases(repos: string[]): Map<string, string>;
export function fileNames(base: string, themes: string[]): [string, string][];

/** What the Action and the CLI do: every card, written to `outDir`. */
export function renderCards(options: {
  client: Client;
  repos?: string[];
  profile?: string | null;
  outDir?: string;
  themes?: string[];
  timeZone?: string;
  sections?: string[];
  calendar?: string;
  starsChart?: string;
  maxCommits?: number;
  allowPrivate?: boolean;
  allSeasons?: boolean;
  now?: Date;
  log?: (line: string) => void;
}): Promise<{ files: string[]; failures: { target: string; error: Error }[]; state: string[] }>;

/** Days and hours in a time zone. */
export function clock(timeZone: string): { day(at: Date | string): string; hour(at: Date | string): number };
