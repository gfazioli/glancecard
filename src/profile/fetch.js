// Everything a profile card needs from GitHub, as plain JSON.
//
// Every number is the public one whatever token asks: repositories are read
// with `privacy: PUBLIC` and the pull request and issue counts are searches
// with `is:public`. The exception is the contribution calendar, which GitHub
// computes per viewer: a workflow's GITHUB_TOKEN sees what an anonymous
// visitor sees, a personal token may add private contributions.

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

export async function fetchProfile(client, login, { now = new Date() } = {}) {
  if (!/^[A-Za-z0-9-]+$/.test(String(login))) throw new Error(`"${login}" is not a GitHub login`);
  const data = await client.graphql(PROFILE_QUERY, {
    login,
    prs: `author:${login} is:pr is:public`,
    merged: `author:${login} is:pr is:merged is:public`,
    issues: `author:${login} is:issue is:public`,
  });
  if (!data.user) throw new Error(`No GitHub user "${login}"`);
  return {
    kind: "profile",
    fetchedAt: new Date(now).toISOString(),
    user: data.user,
    counts: { prs: data.prs.issueCount, merged: data.merged.issueCount, issues: data.issues.issueCount },
    repos: await fetchRepos(client, login),
  };
}
