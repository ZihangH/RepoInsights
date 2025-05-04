'use client';

import type { ContributorInfo } from '@/services/github';
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Github, Loader2, Users, Mail, GitPullRequest, GitCommit, MessageSquare, Building, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getRepoContributors } from '@/services/github';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


// Schema for form validation
const formSchema = z.object({
  repo: z.string().min(1, 'Repository name or link is required.')
           .regex(/^(?:https?:\/\/github\.com\/)?([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)(?:\.git)?\/?$/, 'Invalid GitHub repository format. Use owner/repo or a full GitHub URL.'),
  token: z.string().min(1, 'GitHub token is required.'),
});

export default function Home() {
  const [contributors, setContributors] = React.useState<ContributorInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedContributor, setSelectedContributor] = React.useState<ContributorInfo | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repo: '',
      token: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setContributors([]); // Clear previous results
    setSelectedContributor(null); // Clear selected contributor

    const repoMatch = values.repo.match(/^(?:https?:\/\/github\.com\/)?([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)(?:\.git)?\/?$/);
    if (!repoMatch || !repoMatch[1]) {
        toast({
            variant: "destructive",
            title: "Invalid Repository Format",
            description: "Please enter a valid repository name (e.g., owner/repo) or URL.",
        });
        setIsLoading(false);
        return;
    }
    const repoName = repoMatch[1];


    try {
      // Simulate API call for now
      // const data = await getRepoContributors(repoName, values.token);
      // Replace with actual API call when implemented
       const data = await new Promise<ContributorInfo[]>(resolve => setTimeout(() => resolve([
        {
          username: 'octocat',
          roleInfo: { role: 'Owner', permissions: ['admin', 'read', 'write'] },
          activities: { pullRequests: 25, commits: 150, issuesOpened: 5 },
          externalRepos: [
            { name: 'Spoon-Knife', url: 'https://github.com/octocat/Spoon-Knife', role: 'Owner' },
            { name: 'linguist', url: 'https://github.com/github/linguist', role: 'Contributor' }
          ],
          emails: ['octocat@github.com']
        },
         {
          username: 'hubot',
          roleInfo: { role: 'Collaborator', permissions: ['read', 'write'] },
          activities: { pullRequests: 10, commits: 50, issuesOpened: 2 },
          externalRepos: [
             { name: 'hubot-scripts', url: 'https://github.com/github/hubot-scripts', role: 'Maintainer' }
           ],
          emails: ['hubot@github.com', 'support@github.com']
         },
       ]), 1500));

      if (data.length === 0) {
         toast({
             title: "No Contributors Found",
             description: "Could not find any contributors for this repository.",
         });
      }

      setContributors(data);
    } catch (error) {
      console.error('Error fetching contributors:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch contributor data. Please check the repository name, token, and your network connection.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center py-10 px-4">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
             <Github className="h-8 w-8" /> Repo Insights
          </CardTitle>
          <CardDescription>
            Enter a GitHub repository name (owner/repo) or link and your GitHub token to view contributor details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="repo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository Name or Link</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., facebook/react or https://github.com/facebook/react" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub Token</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your GitHub Personal Access Token" {...field} />
                    </FormControl>
                     <FormDescription>
                      A token with 'repo' scope might be needed for private repositories. Your token is used only for this request and is not stored.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching Contributors...
                  </>
                ) : (
                  'Get Insights'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

       {isLoading && (
        <div className="mt-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading contributor data...</p>
        </div>
      )}

      {!isLoading && contributors.length > 0 && (
         <div className="mt-8 w-full max-w-4xl flex flex-col md:flex-row gap-6">
            {/* Contributor List */}
            <Card className="w-full md:w-1/3 shadow-md">
                 <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"> <Users className="h-5 w-5" /> Contributors ({contributors.length})</CardTitle>
                 </CardHeader>
                 <CardContent className="p-0">
                     <ScrollArea className="h-[400px] px-6">
                         <div className="space-y-3">
                            {contributors.map((contributor) => (
                                <Button
                                    key={contributor.username}
                                    variant={selectedContributor?.username === contributor.username ? "secondary" : "ghost"}
                                    className="w-full justify-start h-auto py-2 px-3 text-left"
                                    onClick={() => setSelectedContributor(contributor)}
                                >
                                    <Github className="mr-2 h-4 w-4 flex-shrink-0"/>
                                    <span className="truncate flex-grow">{contributor.username}</span>
                                    <Badge variant="outline" className="ml-auto flex-shrink-0">{contributor.roleInfo.role}</Badge>
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                 </CardContent>
            </Card>

             {/* Contributor Details */}
             <Card className="w-full md:w-2/3 shadow-md flex-grow">
                 <CardHeader>
                    <CardTitle className="text-xl">Contributor Details</CardTitle>
                     <CardDescription>
                       {selectedContributor ? `Showing details for ${selectedContributor.username}` : "Select a contributor from the list to see their details."}
                    </CardDescription>
                 </CardHeader>
                <CardContent>
                    {selectedContributor ? (
                         <ScrollArea className="h-[400px] pr-4">
                            <Accordion type="multiple" defaultValue={['repo-info', 'external-info', 'personal-info']} className="w-full">
                                {/* Repository Info */}
                                <AccordionItem value="repo-info">
                                    <AccordionTrigger className="text-lg font-semibold">Repository Information</AccordionTrigger>
                                    <AccordionContent className="space-y-3 pl-2">
                                        <p><strong>Role:</strong> <Badge variant="secondary">{selectedContributor.roleInfo.role}</Badge></p>
                                        <p><strong>Permissions:</strong></p>
                                        <div className="flex flex-wrap gap-1">
                                            {selectedContributor.roleInfo.permissions.map(perm => <Badge key={perm} variant="outline">{perm}</Badge>)}
                                        </div>
                                        <Separator className="my-3"/>
                                        <h4 className="font-medium">Activities:</h4>
                                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                             <li><GitPullRequest className="inline h-4 w-4 mr-1"/>Pull Requests: {selectedContributor.activities.pullRequests}</li>
                                             <li><GitCommit className="inline h-4 w-4 mr-1"/>Commits: {selectedContributor.activities.commits}</li>
                                             <li><MessageSquare className="inline h-4 w-4 mr-1"/>Issues Opened: {selectedContributor.activities.issuesOpened}</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* External Info */}
                                <AccordionItem value="external-info">
                                    <AccordionTrigger className="text-lg font-semibold">External Repositories ({selectedContributor.externalRepos.length})</AccordionTrigger>
                                    <AccordionContent className="space-y-3 pl-2">
                                        {selectedContributor.externalRepos.length > 0 ? (
                                            <ul className="space-y-2">
                                                {selectedContributor.externalRepos.map(repo => (
                                                    <li key={repo.url} className="flex items-center justify-between text-sm">
                                                       <div className="flex items-center gap-2">
                                                          <Building className="h-4 w-4 text-muted-foreground"/>
                                                          <a href={repo.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-accent">
                                                              {repo.name} <ExternalLink className="inline h-3 w-3 ml-1"/>
                                                           </a>
                                                        </div>
                                                        <Badge variant="outline">{repo.role}</Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-muted-foreground">No external repository information available.</p>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Personal Info */}
                                <AccordionItem value="personal-info">
                                    <AccordionTrigger className="text-lg font-semibold">Personal Information</AccordionTrigger>
                                    <AccordionContent className="space-y-3 pl-2">
                                         <h4 className="font-medium flex items-center gap-2"><Mail className="h-4 w-4"/> Public Emails:</h4>
                                         {selectedContributor.emails.length > 0 ? (
                                            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                                {selectedContributor.emails.map(email => <li key={email}>{email}</li>)}
                                            </ul>
                                        ) : (
                                             <p className="text-muted-foreground">No public emails found.</p>
                                        )}
                                        {/* Add more personal info sections here if available from API */}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </ScrollArea>
                    ) : (
                        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                            <p>Select a contributor to view details.</p>
                        </div>
                    )}
                </CardContent>
             </Card>
         </div>
      )}

        {!isLoading && contributors.length === 0 && form.formState.isSubmitted && (
            <Card className="w-full max-w-4xl mt-8 shadow-md">
                <CardContent className="pt-6 text-center text-muted-foreground">
                    No contributors found for the specified repository, or an error occurred.
                </CardContent>
            </Card>
        )}


    </div>
  );
}
