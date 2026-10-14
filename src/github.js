// A small GitHub API client on the global fetch: GraphQL, REST, and images
// as data URIs. Retries what GitHub answers with a 5xx now and then, and turns
// a spent rate limit into an error that says when it resets.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createClient({ token, userAgent = "glancecard", apiUrl = "https://api.github.com" } = {}) {
  if (!token) throw new Error("A GitHub token is required (GITHUB_TOKEN, GH_TOKEN, or a signed-in gh)");
  const headers = { Authorization: `bearer ${token}`, "User-Agent": userAgent };

  async function request(url, init, attempt = 1) {
    let res;
    try {
      res = await fetch(url, init);
    } catch (err) {
      if (attempt >= 3) throw err;
      await sleep(2000 * attempt);
      return request(url, init, attempt + 1);
    }
    if (res.status >= 500 && attempt < 3) {
      await sleep(2000 * attempt);
      return request(url, init, attempt + 1);
    }
    if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
      const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
      throw new Error(`GitHub API rate limit reached; it resets at ${new Date(reset).toISOString()}`);
    }
    return res;
  }

  return {
    async graphql(query, variables) {
      const res = await request(`${apiUrl}/graphql`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      const body = await res.json().catch(() => ({}));
      const errors = body.errors ?? [];
      if (errors.some((e) => e.type === "RATE_LIMITED")) throw new Error("GitHub GraphQL rate limit reached");
      if (errors.some((e) => e.type === "NOT_FOUND")) throw new Error(errors.find((e) => e.type === "NOT_FOUND").message);
      if (!res.ok || errors.length) throw new Error(`GraphQL HTTP ${res.status}: ${JSON.stringify(errors.length ? errors : body)}`);
      return body.data;
    },

    async rest(path) {
      const res = await request(`${apiUrl}${path}`, {
        headers: { ...headers, Accept: "application/vnd.github+json" },
      });
      if (res.status === 204) return { data: [], link: "" };
      if (!res.ok) throw new Error(`GET ${path}: HTTP ${res.status}`);
      return { data: await res.json(), link: res.headers.get("link") ?? "" };
    },

    /** An image as a data URI, or null: a missing avatar must not fail a card. */
    async image(url) {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const type = res.headers.get("content-type") || "image/png";
        const bytes = Buffer.from(await res.arrayBuffer());
        return `data:${type};base64,${bytes.toString("base64")}`;
      } catch {
        return null;
      }
    },
  };
}

/** Avatars as data URIs keyed by URL, asked for at `px` pixels. */
export async function loadImages(client, urls, px) {
  const unique = [...new Set(urls.filter(Boolean))];
  const pairs = await Promise.all(
    unique.map(async (url) => [url, await client.image(`${url}${url.includes("?") ? "&" : "?"}s=${px}`)]),
  );
  return Object.fromEntries(pairs.filter(([, data]) => data));
}
