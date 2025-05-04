'use server';

import type { ContributorInfo } from '@/services/github';
import { getRepoContributors } from '@/services/github';
import { z } from 'zod';

const RepoInputSchema = z.object({
  repoFullName: z.string().min(1, 'Repository name is required.'),
  githubToken: z.string().min(1, 'GitHub token is required.'),
});

export type FetchContributorsResult =
  | { success: true; data: ContributorInfo[] }
  | { success: false; error: string };

/**
 * Server Action to fetch repository contributors.
 * Handles the interaction with the GitHub service on the server-side.
 *
 * @param repoFullName The full name of the repository (e.g., "owner/repo").
 * @param githubToken The GitHub Personal Access Token.
 * @returns A promise resolving to an object indicating success or failure.
 */
export async function fetchContributorsAction(
  repoFullName: string,
  githubToken: string
): Promise<FetchContributorsResult> {
  const validation = RepoInputSchema.safeParse({ repoFullName, githubToken });

  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  try {
    console.log(`Server Action: Fetching contributors for ${repoFullName}`);
    const data = await getRepoContributors(repoFullName, githubToken);
    console.log(`Server Action: Successfully fetched ${data.length} contributors for ${repoFullName}`);
    return { success: true, data: data };
  } catch (error) {
    console.error(`Server Action Error fetching contributors for ${repoFullName}:`, error);
    // Ensure a user-friendly error message is returned
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while fetching contributors.';
    return { success: false, error: errorMessage };
  }
}
