// Everything a repository card needs from GitHub, as plain JSON: what the
// model reads, and what a test fixture records.

import { starStore } from "../stars.js";
import { addDays, clock } from "../time.js";
import { calendarStart } from "./model.js";

const REPO_QUERY = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    name nameWithOwner description homepageUrl createdAt pushedAt diskUsage isArchived isPrivate
    stargazerCount forkCount
    watchers { totalCount }
    licenseInfo { spdxId }
    isSecurityPolicyEnabled
    repositoryTopics(first: 20) { nodes { topic { name } } }
    languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
      totalSize
      edges { size node { name color } }
    }
    branches: refs(refPrefix: "refs/heads/") { totalCount }
    tags: refs(refPrefix: "refs/tags/", first: 1, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
      totalCount
      nodes { name }
    }
    openIssues: issues(states: OPEN) { totalCount }
    closedIssues: issues(states: CLOSED) { totalCount }
    openPRs: pullRequests(states: OPEN) { totalCount }
    mergedPRs: pullRequests(states: MERGED) { totalCount }
    releases(first: 5, orderBy: { field: CREATED_AT, direction: DESC }) {
      totalCount
      nodes { tagName publishedAt description }
    }
    defaultBranchRef {
      name
      target {
        ... on Commit {
          history(first: 6) {
            totalCount
            nodes { abbreviatedOid messageHeadline authoredDate author { name user { login } } }
          }
        }
      }
    }
  }
}`;

const RELEASES_QUERY = `
query($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    releases(first: 100, after: $after, orderBy: { field: CREATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes { publishedAt releaseAssets(first: 100) { nodes { downloadCount } } }
    }
  }
}`;

const HISTORY_QUERY = `
query($owner: String!, $name: String!, $since: GitTimestamp!, $after: String) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(first: 100, since: $since, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes { authoredDate }
          }
        }
      }
    }
  }
}`;

async function fetchReleases(client, owner, name) {
  const releases = [];
  let after = null;
  do {
    const page = (await client.graphql(RELEASES_QUERY, { owner, name, after })).repository.releases;
    for (const r of page.nodes) {
      releases.push({ publishedAt: r.publishedAt, downloads: r.releaseAssets.nodes.reduce((a, n) => a + n.downloadCount, 0) });
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return releases;
}

/** Commit dates since `since`, newest first, stopping after `maxCommits`. */
async function fetchHistory(client, owner, name, since, maxCommits) {
  const dates = [];
  let after = null;
  let capped = false;
  do {
    const repo = (await client.graphql(HISTORY_QUERY, { owner, name, since, after })).repository;
    const page = repo.defaultBranchRef.target.history;
    dates.push(...page.nodes.map((c) => c.authoredDate));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    if (after && dates.length >= maxCommits) {
      capped = true;
      after = null;
    }
  } while (after);
  return { dates: dates.slice(0, maxCommits), capped };
}

async function fetchContributors(client, full) {
  const { data, link } = await client.rest(`/repos/${full}/contributors?per_page=100`);
  let total = data.length;
  if (/rel="next"/.test(link)) {
    const last = await client.rest(`/repos/${full}/contributors?per_page=1`);
    total = Number(last.link.match(/[?&]page=(\d+)>; rel="last"/)?.[1] ?? total);
  }
  return {
    total,
    list: data.slice(0, 6).map((c) => ({ login: c.login, contributions: c.contributions, type: c.type, avatarUrl: c.avatar_url })),
    bots: data.filter((c) => c.type === "Bot").length,
  };
}

// Only the paths the essentials look at are kept: the root, .github/ and
// docs/ one level down, and the workflows.
const KEPT_PATH = /^[^/]+$|^(\.github|docs)\/[^/]+$|^\.github\/workflows\/[^/]+$/;

async function fetchTree(client, full, branch) {
  const { data } = await client.rest(`/repos/${full}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  const tree = data.tree ?? [];
  return {
    files: tree.filter((e) => e.type === "blob").length,
    truncated: Boolean(data.truncated),
    paths: tree.map((e) => e.path).filter((p) => KEPT_PATH.test(p)),
  };
}

/**
 * Fetches a repository's card data. `now` and `timeZone` set how far back the
 * commit history goes: to the first day the calendar draws. `stars` is the
 * store the star history is read through (`src/stars.js`), true for one of
 * its own, or false to leave it out.
 */
export async function fetchRepo(client, full, { now = new Date(), timeZone = "UTC", maxCommits = 5000, allowPrivate = false, stars = true } = {}) {
  const [owner, name, extra] = String(full).split("/");
  if (!owner || !name || extra !== undefined) throw new Error(`"${full}" is not owner/name`);
  const repo = (await client.graphql(REPO_QUERY, { owner, name })).repository;
  if (!repo) throw new Error(`${full} was not found, or this token cannot see it`);
  if (repo.isPrivate && !allowPrivate) {
    throw new Error(`${full} is private; a card would publish its data (set allow-private to render it anyway)`);
  }
  if (!repo.defaultBranchRef) throw new Error(`${full} has no commits yet`);

  const since = `${addDays(calendarStart(clock(timeZone).day(now)), -1)}T00:00:00Z`;
  const [history, releases, contributors, tree, starHistory] = await Promise.all([
    fetchHistory(client, owner, name, since, maxCommits),
    fetchReleases(client, owner, name),
    fetchContributors(client, `${owner}/${name}`),
    fetchTree(client, `${owner}/${name}`, repo.defaultBranchRef.name),
    stars ? (stars === true ? starStore() : stars).history(client, `${owner}/${name}`, repo.stargazerCount) : null,
  ]);
  return { kind: "repo", fetchedAt: new Date(now).toISOString(), repo, history, releases, contributors, tree, stars: starHistory };
}
