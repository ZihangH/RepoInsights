/**
 * Represents information about a contributor's role and permissions within a repository.
 */
export interface ContributorRole {
  /**
   * The role of the contributor (e.g., owner, collaborator, member).
   * Derived from collaborator permissions endpoint or general knowledge (e.g., repo owner).
   */
  role: string;
  /**
   * The permissions granted to the contributor (e.g., read, write, admin).
   * Derived from collaborator permissions endpoint.
   */
  permissions: string[];
}

/**
 * Represents a contributor's activities within a repository.
 */
export interface ContributorActivities {
  /**
   * The number of pull requests created by the contributor.
   * NOTE: This requires additional API calls (search API) and is omitted for simplicity.
   */
  pullRequests: number;
  /**
   * The number of commits/contributions as reported by the /contributors endpoint.
   * This is a general measure of contribution activity.
   */
  commits: number;
  /**
   * The number of issues opened by the contributor.
   * NOTE: This requires additional API calls (search API) and is omitted for simplicity.
   */
  issuesOpened: number;
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
   * The role of the user in this *external* repository (simplified).
   */
  role: string; // e.g., Admin, Write, Read
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
   * The contributor's activities *within the target repository* (simplified).
   */
  activities: ContributorActivities;
  /**
   * A list of *other relevant* public repositories the contributor participates in.
   * Limited to a small number for performance.
   */
  externalRepos: GithubRepo[];
  /**
   * The contributor's publicly listed email addresses.
   */
  emails: string[];
  // Consider adding: profile URL, location, company, bio, website URL, etc. from user endpoint
}


// Helper function to safely make fetch requests
async function safeFetch(url: string, options: RequestInit): Promise<Response> {
    try {
        const response = await fetch(url, options);
        return response;
    } catch (error) {
        if (error instanceof Error) {
             console.error(`Network error fetching ${url}: ${error.message}`);
             throw new Error(`Network error: ${error.message}`);
        }
         throw new Error(`An unknown network error occurred while fetching ${url}`);
    }
}

/**
 * Asynchronously retrieves information about contributors to a GitHub repository using the GitHub REST API.
 *
 * This implementation focuses on core information available from primary endpoints
 * (`/contributors`, `/collaborators/{username}/permission`, `/users/{username}`, `/users/{username}/repos`)
 * to balance detail with API rate-limit considerations.
 *
 * @param repoName The name of the GitHub repository (e.g., "owner/repo").
 * @param githubToken The GitHub Personal Access Token (classic or fine-grained) for authentication.
 *        Needs 'repo' scope or read access to the specific repository.
 * @returns A promise that resolves to an array of ContributorInfo objects.
 * @throws {Error} If the API request fails, the token/repo is invalid, or rate limits are hit.
 */
export async function getRepoContributors(
  repoName: string,
  githubToken: string
): Promise<ContributorInfo[]> {
  console.log(`Fetching contributors for ${repoName} using GitHub API`);

  const BASE_URL = 'https://api.github.com';
  const headers = {
    'Authorization': `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28' // Recommended practice
  };

  try {
    // 1. Get basic contributor list (includes usernames, contribution counts)
    // Note: This endpoint primarily lists users with push access who have contributed.
    // It might not list *all* collaborators if they haven't pushed commits.
    // It also might include external contributors without explicit collaborator status.
    const contributorsRes = await safeFetch(`${BASE_URL}/repos/${repoName}/contributors`, { headers });

     if (contributorsRes.status === 404) {
       throw new Error(`Repository "${repoName}" not found. Please check the name.`);
     }
     if (contributorsRes.status === 401 || contributorsRes.status === 403) {
       // Check rate limit headers
       const rateLimitRemaining = contributorsRes.headers.get('X-RateLimit-Remaining');
       if (rateLimitRemaining === '0') {
         const rateLimitReset = contributorsRes.headers.get('X-RateLimit-Reset');
         const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toLocaleTimeString() : 'unknown';
         throw new Error(`GitHub API rate limit exceeded. Please try again after ${resetTime}.`);
       }
       throw new Error('Authentication failed or insufficient permissions. Check your GitHub token and its scopes.');
     }
    if (!contributorsRes.ok) {
        throw new Error(`Failed to fetch contributors: ${contributorsRes.status} ${contributorsRes.statusText}`);
    }
    const contributorsData = await contributorsRes.json();

    if (!Array.isArray(contributorsData)) {
        console.warn('Received non-array contributors data:', contributorsData);
        return []; // Return empty if data format is unexpected
    }

    // Limit the number of contributors to process to avoid excessive API calls, e.g., max 50
    const limitedContributors = contributorsData.slice(0, 50);

    const contributorInfoPromises: Promise<ContributorInfo | null>[] = limitedContributors.map(async (contributor) => {
      if (!contributor || typeof contributor.login !== 'string') {
          console.warn('Skipping invalid contributor data:', contributor);
          return null; // Skip invalid entries
      }
      const username = contributor.login;

      try {
        // Fetch user details, permissions, and external repos in parallel
        const [userRes, permissionRes, reposRes] = await Promise.all([
          safeFetch(`${BASE_URL}/users/${username}`, { headers }),
          safeFetch(`${BASE_URL}/repos/${repoName}/collaborators/${username}/permission`, { headers }),
          safeFetch(`${BASE_URL}/users/${username}/repos?type=public&per_page=5&sort=updated`, { headers }) // Limit results
        ]);

        // Process user data (optional: extract more fields like bio, location)
        const userData = userRes.ok ? await userRes.json() : {};
        const publicEmails = [userData.email].filter(Boolean) as string[]; // Get public email if available

        // Process permission data
        let role = 'Contributor'; // Default role if not a direct collaborator or owner
        let permissions: string[] = [];
         if (permissionRes.ok) {
            const permissionData = await permissionRes.json();
            role = permissionData.role_name ? permissionData.role_name.charAt(0).toUpperCase() + permissionData.role_name.slice(1) : 'Collaborator'; // Capitalize role
            permissions = Object.keys(permissionData.permissions || {}).filter(p => permissionData.permissions[p]);
         } else if (permissionRes.status !== 404) {
            // Log unexpected errors, but don't fail the whole process for one user's permission check
            console.warn(`Could not fetch permissions for ${username} in ${repoName}: ${permissionRes.status} ${permissionRes.statusText}`);
         }
         // Potentially check if contributor is the repo owner (requires fetching repo details - skipped for simplicity)


        // Process external repos data
        let externalRepos: GithubRepo[] = [];
        if (reposRes.ok) {
            const reposData = await reposRes.json();
             if (Array.isArray(reposData)) {
                externalRepos = reposData.map((repo: any) => ({
                    name: repo.full_name,
                    url: repo.html_url,
                    // Simplified role based on permissions available in the user repos list
                    role: repo.permissions?.admin ? 'Admin' : (repo.permissions?.push ? 'Write' : 'Read')
                })).filter(repo => repo.name !== repoName); // Exclude the target repo itself
            }
        } else {
            console.warn(`Could not fetch external repos for ${username}: ${reposRes.status} ${reposRes.statusText}`);
        }


        // Construct the ContributorInfo object
        return {
          username: username,
          roleInfo: {
            role: role,
            permissions: permissions,
          },
          activities: {
            pullRequests: 0, // Omitted for simplicity
            commits: contributor.contributions || 0, // Use count from initial contributors call
            issuesOpened: 0, // Omitted for simplicity
          },
          externalRepos: externalRepos,
          emails: publicEmails,
        };
      } catch (userError) {
           console.error(`Error processing contributor ${username}:`, userError);
           return null; // Return null for this contributor if sub-requests fail
      }
    });

    // Wait for all promises and filter out any null results (due to errors)
    const results = await Promise.all(contributorInfoPromises);
    return results.filter((info): info is ContributorInfo => info !== null);

  } catch (error) {
    console.error("GitHub API Error:", error);
    if (error instanceof Error) {
         // Re-throw specific errors for better UI feedback
         throw new Error(`Failed to retrieve contributor data: ${error.message}`);
    }
     throw new Error("An unknown error occurred while fetching data from GitHub.");
  }
}
