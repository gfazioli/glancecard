// Everything a profile card needs from GitHub, as plain JSON.
//
// Every number is the public one whatever token asks: repositories are read
// with `privacy: PUBLIC` and the pull request and issue counts are searches
// with `is:public`. The exception is the contribution calendar, which GitHub
// computes per viewer: a workflow's GITHUB_TOKEN sees what an anonymous
// visitor sees, a personal token may add private contributions.

import { mergeStars, starStore } from "../stars.js";

const PROFILE_QUERY = `
query($login: String!, $prs: String!, $merged: String!, $issues: String!) {
  user(login: $login) {
    login name bio company location websiteUrl createdAt
    avatarUrl(size: 160)
    followers { totalCount }
    following { totalCount }
    contributionsCollection {
      totalCommitContributions
      totalRepositoriesWithContributedCommits
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date weekday contributionCount contributionLevel } }
      }
    }
  }
  prs: search(query: $prs, type: ISSUE) { issueCount }
  merged: search(query: $merged, type: ISSUE) { issueCount }
  issues: search(query: $issues, type: ISSUE) { issueCount }
}`;

const REPOS_QUERY = `
query($login: String!, $after: String) {
  user(login: $login) {
    repositories(first: 100, after: $after, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false) {
      pageInfo { hasNextPage endCursor }
      nodes { name stargazerCount forkCount primaryLanguage { name color } }
    }
  }
}`;

async function fetchRepos(client, login) {
  const repos = [];
  let after = null;
  do {
    const page = (await client.graphql(REPOS_QUERY, { login, after })).user.repositories;
    repos.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return repos;
}

/** `fn` over `items`, at most `limit` at a time, the results in order. */
async function pool(items, limit, fn) {
  const out = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Fetches a profile's card data. `stars` is the store the star histories of
 * its starred repositories are read through (`src/stars.js`), true for one of
 * its own, or false to leave them out: they cost a request for every 30 weeks
 * of each one's life, the first time.
 */
export async function fetchProfile(client, login, { now = new Date(), stars = true } = {}) {
  if (!/^[A-Za-z0-9-]+$/.test(String(login))) throw new Error(`"${login}" is not a GitHub login`);
  const data = await client.graphql(PROFILE_QUERY, {
    login,
    prs: `author:${login} is:pr is:public`,
    merged: `author:${login} is:pr is:merged is:public`,
    issues: `author:${login} is:issue is:public`,
  });
  if (!data.user) throw new Error(`No GitHub user "${login}"`);
  const repos = await fetchRepos(client, login);
  let history = null;
  if (stars) {
    const store = stars === true ? starStore() : stars;
    const starred = repos.filter((r) => r.stargazerCount > 0);
    history = mergeStars(await pool(starred, 6, (r) => store.history(client, `${login}/${r.name}`, r.stargazerCount)));
  }
  return {
    kind: "profile",
    fetchedAt: new Date(now).toISOString(),
    user: data.user,
    counts: { prs: data.prs.issueCount, merged: data.merged.issueCount, issues: data.issues.issueCount },
    repos,
    stars: history,
  };
}
