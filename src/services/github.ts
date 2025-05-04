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
   * The role of the user in this *external* repository (simplified based on permissions).
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
   * The contributor's publicly listed email addresses found via the user endpoint.
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
             // Log the detailed network error on the server
             console.error(`Network error fetching ${url}: ${error.message}`);
             // Provide a more generic error message to the client
             throw new Error(`Network connection failed while trying to reach GitHub API.`);
        }
         throw new Error(`An unknown network error occurred while fetching ${url}`);
    }
}

/**
 * Handles API response errors, checking for common issues like rate limits and authentication.
 * @param response The fetch response object.
 * @param context A string describing the context of the API call (e.g., "fetching contributors").
 * @throws {Error} Specific error message based on the status code.
 */
function handleApiError(response: Response, context: string): void {
     if (response.status === 404) {
       throw new Error(`Resource not found (${context}). Please check the repository name or username.`);
     }
     if (response.status === 401) {
       throw new Error('Authentication failed. Please check your GitHub token.');
     }
     if (response.status === 403) {
       // Check rate limit headers specifically for 403 errors
       const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
       if (rateLimitRemaining === '0') {
         const rateLimitReset = response.headers.get('X-RateLimit-Reset');
         const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toLocaleTimeString() : 'unknown time';
         throw new Error(`GitHub API rate limit exceeded. Please wait and try again after ${resetTime}.`);
       }
       // If not a rate limit issue, it's likely permissions
       throw new Error('Insufficient permissions. Your token may lack the required scopes (e.g., repo access) or access to this specific resource.');
     }
     // For other non-OK statuses
     throw new Error(`Failed ${context}: GitHub API responded with ${response.status} ${response.statusText}`);
}


/**
 * Asynchronously retrieves information about contributors to a GitHub repository using the GitHub REST API.
 *
 * This implementation focuses on core information available from primary endpoints
 * (`/contributors`, `/collaborators/{username}/permission`, `/users/{username}`, `/users/{username}/repos`)
 * to balance detail with API rate-limit considerations.
 * It's designed to be called from a Server Action.
 *
 * @param repoName The name of the GitHub repository (e.g., "owner/repo").
 * @param githubToken The GitHub Personal Access Token (classic or fine-grained) for authentication.
 *        Needs 'repo' scope or read access to the specific repository.
 * @returns A promise that resolves to an array of ContributorInfo objects.
 * @throws {Error} If the primary API request (fetching contributors) fails, the token/repo is invalid, or rate limits are hit.
 *                 Sub-requests (permissions, user details, external repos) will log warnings but not throw, allowing partial data.
 */
export async function getRepoContributors(
  repoName: string,
  githubToken: string
): Promise<ContributorInfo[]> {
  console.log(`[Service] Fetching contributors for ${repoName}`);

  const BASE_URL = 'https://api.github.com';
  const headers = {
    'Authorization': `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28' // Recommended practice
  };

  let contributorsData: any[];

  // 1. Get basic contributor list (Primary Request - Fail Fast if this fails)
  try {
    const contributorsRes = await safeFetch(`${BASE_URL}/repos/${repoName}/contributors?per_page=100`, { headers }); // Fetch up to 100

     if (!contributorsRes.ok) {
        // Throw specific errors based on status code for the main request
        handleApiError(contributorsRes, `fetching contributors for ${repoName}`);
        // The line below is unreachable if handleApiError throws, but needed for type safety
        throw new Error(`Unexpected error state after handling API error.`);
     }
    contributorsData = await contributorsRes.json();

    if (!Array.isArray(contributorsData)) {
        console.warn(`[Service] Received non-array contributors data for ${repoName}:`, contributorsData);
        throw new Error(`Unexpected data format received from GitHub API when fetching contributors.`);
    }
     console.log(`[Service] Found ${contributorsData.length} raw contributors for ${repoName}`);

  } catch (error) {
    console.error(`[Service] Critical error fetching contributors for ${repoName}:`, error);
    // Re-throw the error caught or created by handleApiError/safeFetch
    throw error;
  }


  // Limit the number of contributors to process further to avoid excessive API calls (e.g., max 50 detailed lookups)
  // This prevents hitting rate limits too quickly on repos with many contributors.
  const limitedContributors = contributorsData.slice(0, 50);
  if (contributorsData.length > 50) {
      console.warn(`[Service] Processing details for the first 50 out of ${contributorsData.length} contributors for ${repoName} due to limits.`);
  }

  const contributorInfoPromises: Promise<ContributorInfo | null>[] = limitedContributors.map(async (contributor) => {
    if (!contributor || typeof contributor.login !== 'string') {
        console.warn('[Service] Skipping invalid raw contributor data:', contributor);
        return null; // Skip invalid entries
    }
    const username = contributor.login;
    console.log(`[Service] Processing details for contributor: ${username}`);

    try {
      // Fetch user details, permissions, and external repos in parallel using Promise.allSettled
      // Promise.allSettled ensures all requests complete, even if some fail.
      const results = await Promise.allSettled([
        safeFetch(`${BASE_URL}/users/${username}`, { headers }),
        safeFetch(`${BASE_URL}/repos/${repoName}/collaborators/${username}/permission`, { headers }),
        safeFetch(`${BASE_URL}/users/${username}/repos?type=all&per_page=5&sort=pushed`, { headers }) // Fetch 5 repos user pushed to recently
      ]);

      const [userResult, permissionResult, reposResult] = results;

      // Process user data (optional: extract more fields like bio, location)
      let publicEmails: string[] = [];
      if (userResult.status === 'fulfilled' && userResult.value.ok) {
          const userData = await userResult.value.json();
          if (userData.email) {
              publicEmails = [userData.email];
          }
      } else if (userResult.status === 'rejected') {
          console.warn(`[Service] Failed to fetch user details for ${username}:`, userResult.reason);
      } else if (userResult.status === 'fulfilled' && !userResult.value.ok) {
          console.warn(`[Service] GitHub API error fetching user details for ${username}: ${userResult.value.status} ${userResult.value.statusText}`);
          // Optionally try to handle specific errors like 404, but for now just warn.
      }


      // Process permission data
      let role = 'Contributor'; // Default role
      let permissions: string[] = [];
      if (permissionResult.status === 'fulfilled' && permissionResult.value.ok) {
          const permissionData = await permissionResult.value.json();
           // Use role_name if available, otherwise determine based on permissions
           if (permissionData.role_name) {
               role = permissionData.role_name.charAt(0).toUpperCase() + permissionData.role_name.slice(1); // Capitalize role
           } else if (permissionData.permission) {
               // Map GitHub's permission level string to a Role name
               switch(permissionData.permission) {
                   case 'admin': role = 'Admin'; break;
                   case 'write': role = 'Maintainer'; break; // Or 'Write' if preferred
                   case 'read': role = 'Read'; break;
                   default: role = 'Collaborator'; // Fallback
               }
           }
          // Extract permissions if the structure is { permissions: { pull: true, push: true, ... } }
          if (permissionData.permissions && typeof permissionData.permissions === 'object') {
             permissions = Object.keys(permissionData.permissions).filter(p => permissionData.permissions[p] === true);
          } else if (permissionData.permission) {
             // If only permission level string is given, map it to common permissions
             if (permissionData.permission === 'admin') permissions = ['admin', 'push', 'pull'];
             else if (permissionData.permission === 'write') permissions = ['push', 'pull'];
             else if (permissionData.permission === 'read') permissions = ['pull'];
          }

      } else if (permissionResult.status === 'rejected') {
           console.warn(`[Service] Failed to fetch permissions for ${username} in ${repoName}:`, permissionResult.reason);
      } else if (permissionResult.status === 'fulfilled' && permissionResult.value.status !== 404) { // Ignore 404 (not a collaborator)
           console.warn(`[Service] GitHub API error fetching permissions for ${username} in ${repoName}: ${permissionResult.value.status} ${permissionResult.value.statusText}`);
           // Note: A 404 here often just means the user isn't an explicit collaborator with specific permissions set.
           // They might still be the owner or an org member with implicit access. We keep the 'Contributor' default.
      }
      // Consider adding a check if username matches repo owner (would require fetching repo details - skipped)


      // Process external repos data
      let externalRepos: GithubRepo[] = [];
      if (reposResult.status === 'fulfilled' && reposResult.value.ok) {
          const reposData = await reposResult.value.json();
           if (Array.isArray(reposData)) {
              externalRepos = reposData
                .filter((repo: any) => repo.full_name !== repoName) // Exclude the target repo itself
                .map((repo: any) => {
                   let repoRole = 'Read'; // Default assumption
                   if (repo.permissions) {
                       if (repo.permissions.admin) repoRole = 'Admin';
                       else if (repo.permissions.push) repoRole = 'Write';
                   }
                   return {
                       name: repo.full_name,
                       url: repo.html_url,
                       role: repoRole
                   };
               });
          }
      } else if (reposResult.status === 'rejected') {
           console.warn(`[Service] Failed to fetch external repos for ${username}:`, reposResult.reason);
      } else if (reposResult.status === 'fulfilled' && !reposResult.value.ok) {
           console.warn(`[Service] GitHub API error fetching external repos for ${username}: ${reposResult.value.status} ${reposResult.value.statusText}`);
      }


      // Construct the ContributorInfo object
      return {
        username: username,
        roleInfo: {
          role: role,
          permissions: permissions,
        },
        activities: {
          pullRequests: 0, // Placeholder - Requires more API calls
          commits: contributor.contributions || 0, // Use count from initial contributors call
          issuesOpened: 0, // Placeholder - Requires more API calls
        },
        externalRepos: externalRepos,
        emails: publicEmails,
      };
    } catch (processingError) {
         // Catch errors during the .json() parsing or processing of results
         console.error(`[Service] Error processing data for contributor ${username}:`, processingError);
         return null; // Return null for this contributor if processing fails
    }
  });

  // Wait for all promises and filter out any null results (due to errors in sub-requests or processing)
  const results = await Promise.all(contributorInfoPromises);
  const validResults = results.filter((info): info is ContributorInfo => info !== null);

  console.log(`[Service] Successfully processed details for ${validResults.length} contributors for ${repoName}`);
  return validResults;
}
