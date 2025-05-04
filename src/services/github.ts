/**
 * Represents information about a contributor's role and permissions within a repository.
 */
export interface ContributorRole {
  /**
   * The role of the contributor (e.g., owner, collaborator, member).
   */
  role: string;
  /**
   * The permissions granted to the contributor (e.g., read, write, admin).
   */
  permissions: string[];
}

/**
 * Represents a contributor's activities within a repository.
 */
export interface ContributorActivities {
  /**
   * The number of pull requests created by the contributor.
   */
  pullRequests: number;
  /**
   * The number of commits authored by the contributor.
   */
  commits: number;
  /**
   * The number of issues opened by the contributor.
   */
  issuesOpened: number;
  // Consider adding: reviews submitted, lines of code added/deleted, etc.
}

/**
 * Represents a GitHub repository linked to a contributor.
 */
export interface GithubRepo {
  /**
   * The full name of the repository (owner/repo).
   */
  name: string;
  /**
   * The URL of the repository.
   */
  url: string;
  /**
   * The role of the user in this *external* repository.
   */
  role: string; // e.g., Owner, Contributor, Maintainer
}

/**
 * Represents a contributor's information, including details within the repository,
 * external repositories, and personal information.
 */
export interface ContributorInfo {
  /**
   * The contributor's GitHub username.
   */
  username: string;
  /**
   * Information about the contributor's role and permissions *within the target repository*.
   */
  roleInfo: ContributorRole;
  /**
   * The contributor's activities *within the target repository*.
   */
  activities: ContributorActivities;
  /**
   * A list of *other relevant* repositories the contributor participates in.
   * Note: Fetching *all* repos might be excessive. Focus on significant ones if possible.
   */
  externalRepos: GithubRepo[];
  /**
   * The contributor's publicly listed email addresses.
   */
  emails: string[];
  // Consider adding: profile URL, location, company, bio, website URL, etc.
}

/**
 * Asynchronously retrieves information about contributors to a GitHub repository.
 *
 * IMPORTANT: This is a placeholder. A real implementation requires using the GitHub REST API
 * (e.g., with `fetch` or a library like `octokit`) and making multiple authenticated calls
 * to endpoints like:
 *   - `/repos/{owner}/{repo}/contributors`
 *   - `/repos/{owner}/{repo}/collaborators/{username}/permission`
 *   - `/search/commits?q=author:{username}+repo:{owner}/{repo}` (and similar for PRs/issues)
 *   - `/users/{username}`
 *   - `/users/{username}/repos` (potentially filtered)
 *
 * Handling pagination, rate limits, and error responses is crucial for a robust solution.
 * Using a free tier might impose strict rate limits.
 *
 * @param repoName The name of the GitHub repository (e.g., "owner/repo").
 * @param githubToken The GitHub token for authentication.
 * @returns A promise that resolves to an array of ContributorInfo objects.
 * @throws {Error} If the API request fails or the token/repo is invalid.
 */
export async function getRepoContributors(
  repoName: string,
  githubToken: string
): Promise<ContributorInfo[]> {
  console.log(`Fetching contributors for ${repoName} (using placeholder data)`);

  // --- START PLACEHOLDER IMPLEMENTATION ---
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Simulate potential errors (uncomment to test error handling)
  // if (repoName === 'error/repo') {
  //   throw new Error("Simulated API Error: Repository not found or invalid token.");
  // }
  // if (Math.random() < 0.1) { // Simulate random network error
  //    throw new Error("Simulated Network Error");
  // }


  // Return mock data - replace with actual API calls
   if (repoName.toLowerCase() === 'facebook/react') {
        return [
            {
                username: 'gaearon',
                roleInfo: { role: 'Member', permissions: ['read', 'write'] },
                activities: { pullRequests: 50, commits: 500, issuesOpened: 10 },
                externalRepos: [ { name: 'reduxjs/redux', url: 'https://github.com/reduxjs/redux', role: 'Creator' } ],
                emails: ['dan.abramov@meta.com']
            },
            {
                username: 'sebmarkbage',
                roleInfo: { role: 'Member', permissions: ['read', 'write', 'admin'] },
                activities: { pullRequests: 80, commits: 700, issuesOpened: 15 },
                externalRepos: [],
                emails: ['sebmarkbage@meta.com']
            },
             {
                username: 'sophiebits',
                roleInfo: { role: 'Member', permissions: ['read', 'write'] },
                activities: { pullRequests: 30, commits: 200, issuesOpened: 5 },
                externalRepos: [],
                emails: []
            }
        ];
   }

   // Default mock data
  return [
    {
      username: 'testuser1',
      roleInfo: {
        role: 'Collaborator',
        permissions: ['read', 'write'],
      },
      activities: {
        pullRequests: 12,
        commits: 45,
        issuesOpened: 4,
      },
      externalRepos: [
        {
          name: 'another-org/some-lib',
          url: 'https://github.com/another-org/some-lib',
          role: 'Contributor',
        },
      ],
      emails: ['test1@example.com', 'dev-alias@example.org'],
    },
     {
      username: 'testuser2-owner',
      roleInfo: {
        role: 'Owner',
        permissions: ['admin', 'read', 'write', 'delete'],
      },
      activities: {
        pullRequests: 5,
        commits: 150,
        issuesOpened: 20,
      },
      externalRepos: [
        {
          name: 'personal-project/tool',
          url: 'https://github.com/testuser2-owner/personal-project',
          role: 'Owner',
        },
         {
          name: 'some-oss/framework',
          url: 'https://github.com/some-oss/framework',
          role: 'Maintainer',
        },
      ],
      emails: ['main@example.com'],
    },
  ];
  // --- END PLACEHOLDER IMPLEMENTATION ---

  /*
  // --- START EXAMPLE ACTUAL IMPLEMENTATION OUTLINE ---
  const BASE_URL = 'https://api.github.com';
  const headers = {
    'Authorization': `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28' // Recommended practice
  };

  try {
    // 1. Get basic contributor list (includes usernames, contribution counts)
    const contributorsRes = await fetch(`${BASE_URL}/repos/${repoName}/contributors`, { headers });
    if (!contributorsRes.ok) throw new Error(`Failed to fetch contributors: ${contributorsRes.statusText}`);
    const contributorsData = await contributorsRes.json();

    if (!Array.isArray(contributorsData)) throw new Error('Invalid contributors data received');

    const contributorInfoPromises: Promise<ContributorInfo>[] = contributorsData.map(async (contributor) => {
      const username = contributor.login;

      // 2. Get specific user details (emails, bio, etc.) - parallel fetch
      const userRes = await fetch(`${BASE_URL}/users/${username}`, { headers });
      const userData = userRes.ok ? await userRes.json() : {};

      // 3. Get permissions - parallel fetch
      const permissionRes = await fetch(`${BASE_URL}/repos/${repoName}/collaborators/${username}/permission`, { headers });
      const permissionData = permissionRes.ok ? await permissionRes.json() : {};

      // 4. Get external repos (example: public repos user owns/contributes to) - parallel fetch
      //    This can be complex/rate-limit heavy. Be selective.
      const reposRes = await fetch(`${BASE_URL}/users/${username}/repos?type=public&per_page=5&sort=updated`, { headers }); // Limit results
      const reposData = reposRes.ok ? await reposRes.json() : [];
      const externalRepos: GithubRepo[] = (reposData || []).map((repo: any) => ({
          name: repo.full_name,
          url: repo.html_url,
          role: repo.permissions?.admin ? 'Admin' : (repo.permissions?.push ? 'Write' : 'Read') // Simplified role
      }));


      // 5. Get detailed activities (commits, PRs) - can be VERY expensive, consider simplifying or skipping
      //    Example: Get commit count (might differ slightly from /contributors count)
      //    const commitsRes = await fetch(`${BASE_URL}/search/commits?q=author:${username}+repo:${repoName}`, { headers: {...headers, Accept: 'application/vnd.github.cloak-preview'} }); // Need preview header for commit search
      //    const commitsData = commitsRes.ok ? await commitsRes.json() : { total_count: 0 };

      return {
        username: username,
        roleInfo: {
          role: permissionData.role_name || 'Unknown', // Adjust mapping as needed
          permissions: Object.keys(permissionData.permissions || {}).filter(p => permissionData.permissions[p]),
        },
        activities: {
          pullRequests: 0, // Placeholder - Requires PR search API call
          commits: contributor.contributions, // Use count from initial contributors call (approximation)
          issuesOpened: 0, // Placeholder - Requires issue search API call
        },
        externalRepos: externalRepos,
        emails: [userData.email].filter(Boolean) as string[], // Filter null/undefined
      };
    });

    return await Promise.all(contributorInfoPromises);

  } catch (error) {
    console.error("GitHub API Error:", error);
    if (error instanceof Error) {
         throw new Error(`Failed to retrieve contributor data: ${error.message}`);
    }
     throw new Error("An unknown error occurred while fetching data from GitHub.");
  }
  // --- END EXAMPLE ACTUAL IMPLEMENTATION OUTLINE ---
  */
}
