'use client';

import type { ContributorInfo } from '@/services/github';
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Github, Loader2, Users, Mail, GitPullRequest, GitCommit, MessageSquare, Building, ExternalLink, Info, AlertTriangle } from 'lucide-react'; // Added AlertTriangle

import { fetchContributorsAction } from '@/app/actions'; // Import the Server Action
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
// Removed direct import of getRepoContributors as it's now called via Server Action
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


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
  const [repoName, setRepoName] = React.useState<string | null>(null); // Store repo name for context
  const [errorOccurred, setErrorOccurred] = React.useState<string | null>(null); // Track if an error occurred and store message
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
    setErrorOccurred(null); // Reset error state
    setRepoName(null); // Clear repo name

    const repoMatch = values.repo.match(/^(?:https?:\/\/github\.com\/)?([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)(?:\.git)?\/?$/);
    if (!repoMatch || !repoMatch[1]) {
        toast({
            variant: "destructive",
            title: "Invalid Repository Format",
            description: "Please enter a valid repository name (e.g., owner/repo) or URL.",
        });
        setIsLoading(false);
        setErrorOccurred("Invalid repository format provided."); // Set error message
        return;
    }
    const currentRepoName = repoMatch[1];
    setRepoName(currentRepoName); // Store the repo name


    try {
      // Call the Server Action
      console.log(`[Client] Calling fetchContributorsAction for ${currentRepoName}`);
      const result = await fetchContributorsAction(currentRepoName, values.token);
      console.log(`[Client] Received result from fetchContributorsAction:`, result);

      if (result.success) {
        if (result.data.length === 0) {
           toast({
               title: "No Contributors Found",
               description: `Could not find any contributors for ${currentRepoName}, or the repository might be private/inaccessible.`,
               variant: "default"
           });
           setSelectedContributor(null); // Ensure details pane clears
        } else {
            setSelectedContributor(result.data[0]); // Select first contributor by default
        }
        setContributors(result.data);
        // setErrorOccurred(null); // Ensure error state is clear on success
      } else {
        // Handle errors returned from the Server Action
        const errorMessage = result.error || 'Failed to fetch contributor data. Please check details and try again.';
        console.error('[Client] Error fetching contributors via Server Action:', errorMessage);
        toast({
          variant: 'destructive',
          title: 'Error Fetching Data',
          description: errorMessage,
        });
        setErrorOccurred(errorMessage); // Set error message
        setContributors([]); // Clear any potential stale data
        setSelectedContributor(null);
      }

    } catch (error) {
      // Catch unexpected errors during the action call itself (e.g., network issues)
       const clientErrorMessage = error instanceof Error ? error.message : 'An unexpected error occurred on the client side.';
      console.error('[Client] Unexpected error calling fetchContributorsAction:', error);
      toast({
        variant: 'destructive',
        title: 'Client Error',
        description: clientErrorMessage,
      });
      setErrorOccurred(clientErrorMessage); // Set error message
      setContributors([]); // Clear any potential stale data
      setSelectedContributor(null);
    } finally {
      console.log(`[Client] Finished processing request for ${currentRepoName}. Setting isLoading to false.`);
      setIsLoading(false);
    }
  }

  // console.log("[Client Render] State:", { isLoading, contributorsLength: contributors.length, selectedContributor: selectedContributor?.username, errorOccurred, repoName, isSubmitted: form.formState.isSubmitted });


  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-10 px-4">
      {/* Form Card - Always Visible */}
      <Card className="w-full max-w-4xl shadow-lg border border-border mb-8">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
             <Github className="h-8 w-8 text-primary" />
             <CardTitle className="text-3xl font-bold">
                Repo Insights
             </CardTitle>
          </div>
          <CardDescription>
            Enter a GitHub repository (owner/repo or link) and a Personal Access Token to view contributor details.
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
                      <Input placeholder="e.g., facebook/react or https://github.com/facebook/react" {...field} className="bg-input"/>
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
                      <Input type="password" placeholder="Enter your GitHub Personal Access Token" {...field} className="bg-input"/>
                    </FormControl>
                     <FormDescription className="text-xs">
                       A Personal Access Token (classic or fine-grained) with repository read access is required. Your token is sent securely to the server for this request and is not stored.
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

       {/* Loading Indicator */}
       {isLoading && (
        <div className="w-full max-w-4xl">
           <Card className="shadow-md border border-border">
             <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[200px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="mt-4 text-lg font-semibold text-foreground">Loading Contributor Data...</p>
                <p className="mt-1 text-muted-foreground">Fetching details for {repoName || 'repository'}...</p>
             </CardContent>
           </Card>
        </div>
      )}

       {/* Results Display - Only show if NOT loading AND there are contributors */}
       {!isLoading && contributors.length > 0 && (
         <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6">
            {/* Contributor List */}
            <Card className="w-full md:w-1/3 shadow-md border border-border">
                 <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"> <Users className="h-5 w-5 text-primary" /> Contributors ({contributors.length})</CardTitle>
                    <CardDescription>Select a contributor to view details.</CardDescription>
                 </CardHeader>
                 <CardContent className="p-0">
                     <ScrollArea className="h-[450px] px-4 pb-4">
                         <div className="space-y-2">
                            {contributors.map((contributor) => (
                                <Button
                                    key={contributor.username}
                                    variant={selectedContributor?.username === contributor.username ? "secondary" : "ghost"}
                                    className="w-full justify-start h-auto py-2 px-3 text-left items-center"
                                    onClick={() => setSelectedContributor(contributor)}
                                >
                                    <Github className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground"/>
                                    <span className="truncate flex-grow font-medium">{contributor.username}</span>
                                    <Badge variant="outline" className="ml-auto flex-shrink-0 text-xs">{contributor.roleInfo.role}</Badge>
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                 </CardContent>
            </Card>

             {/* Contributor Details */}
             <Card className="w-full md:w-2/3 shadow-md border border-border flex-grow">
                 <CardHeader>
                    <CardTitle className="text-xl">Contributor Details</CardTitle>
                     <CardDescription>
                       {selectedContributor ? `Showing details for ${selectedContributor.username}` : "Select a contributor from the list."}
                    </CardDescription>
                 </CardHeader>
                <CardContent>
                    {selectedContributor ? (
                         <ScrollArea className="h-[450px] pr-4 -mr-4"> {/* Offset padding for scrollbar */}
                            <Accordion type="multiple" defaultValue={['repo-info', 'external-info', 'personal-info']} className="w-full">
                                {/* Repository Info */}
                                <AccordionItem value="repo-info" className="border-b border-border">
                                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">Repository Information</AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2 pl-2">
                                        <div className="flex items-center space-x-2">
                                           <strong className="w-24">Role:</strong>
                                           <Badge variant="secondary">{selectedContributor.roleInfo.role}</Badge>
                                        </div>
                                        <div className="flex items-start space-x-2">
                                            <strong className="w-24 pt-0.5">Permissions:</strong>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedContributor.roleInfo.permissions.length > 0 ?
                                                 selectedContributor.roleInfo.permissions.map(perm => <Badge key={perm} variant="outline" className="text-xs">{perm}</Badge>)
                                                 : <span className="text-sm text-muted-foreground">No specific permissions listed.</span>
                                                }
                                            </div>
                                        </div>
                                        <Separator className="my-4"/>
                                        <h4 className="font-medium text-base">Contribution Activity:</h4>
                                        <div className="flex items-center space-x-2 text-sm">
                                            <GitCommit className="inline h-4 w-4 text-muted-foreground"/>
                                            <span>Contributions:</span>
                                            <span className="font-semibold">{selectedContributor.activities.commits}</span>
                                        </div>
                                        <p className='text-xs text-muted-foreground pt-1'>
                                            (Note: Detailed PR/Issue counts require more complex API queries and are currently omitted.)
                                        </p>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* External Info */}
                                <AccordionItem value="external-info" className="border-b border-border">
                                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">Other Public Repos ({selectedContributor.externalRepos.length})</AccordionTrigger>
                                    <AccordionContent className="pt-2 pl-2">
                                        {selectedContributor.externalRepos.length > 0 ? (
                                            <ul className="space-y-2">
                                                {selectedContributor.externalRepos.map(repo => (
                                                    <li key={repo.url} className="flex items-center justify-between text-sm space-x-2 py-1">
                                                       <div className="flex items-center gap-2 min-w-0">
                                                          <Building className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                                          <a href={repo.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-accent truncate" title={repo.name}>
                                                              {repo.name}
                                                          </a>
                                                          <ExternalLink className="inline h-3 w-3 ml-1 text-muted-foreground flex-shrink-0"/>
                                                        </div>
                                                        <Badge variant="outline" className="flex-shrink-0 text-xs">{repo.role}</Badge>
                                                    </li>
                                                ))}
                                                <p className='text-xs text-muted-foreground pt-3'>(Showing up to 5 most recently updated public repos contributor has interacted with.)</p>
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No other relevant public repository information found.</p>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Personal Info */}
                                <AccordionItem value="personal-info" className="border-b-0">
                                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">Personal Information</AccordionTrigger>
                                    <AccordionContent className="space-y-3 pt-2 pl-2">
                                         <div className="flex items-center space-x-2">
                                            <Mail className="h-4 w-4 text-muted-foreground"/>
                                            <h4 className="font-medium text-base"> Public Email:</h4>
                                         </div>
                                         {selectedContributor.emails.length > 0 ? (
                                            <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                                                {selectedContributor.emails.map(email => <li key={email}>{email}</li>)}
                                            </ul>
                                        ) : (
                                             <p className="text-sm text-muted-foreground pl-6">No public email found.</p>
                                        )}
                                        {/* Add more personal info sections here if available from API */}
                                         <Separator className="my-4"/>
                                         <div className="flex items-center space-x-2">
                                            <Github className="h-4 w-4 text-muted-foreground"/>
                                            <a href={`https://github.com/${selectedContributor.username}`} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline hover:text-accent">
                                                 View Profile on GitHub <ExternalLink className="inline h-3 w-3 ml-1"/>
                                            </a>
                                          </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </ScrollArea>
                    ) : (
                         // Placeholder when no contributor is selected but results exist
                        <div className="h-[450px] flex items-center justify-center text-muted-foreground border border-dashed rounded-md">
                            <p>Select a contributor to view details.</p>
                        </div>
                    )}
                </CardContent>
             </Card>
         </div>
      )}

      {/* Placeholder/Info: Submitted but NO results */}
      {!isLoading && form.formState.isSubmitted && contributors.length === 0 && !errorOccurred && (
           <Alert variant="default" className="w-full max-w-4xl shadow-md border border-border">
             <Info className="h-4 w-4" />
             <AlertTitle>No Contributors Found</AlertTitle>
             <AlertDescription>
               No contributors were found for "{repoName}". This could be because the repository is empty, private (and the token lacks access), or uses a different contribution model.
             </AlertDescription>
           </Alert>
      )}

      {/* Error Display - Only show if NOT loading AND an error occurred */}
      {!isLoading && errorOccurred && (
           <Alert variant="destructive" className="w-full max-w-4xl shadow-md">
             <AlertTriangle className="h-4 w-4" /> {/* Use AlertTriangle for destructive */}
             <AlertTitle>Error</AlertTitle>
             <AlertDescription>
               Failed to fetch contributor data for "{repoName || 'the repository'}".
               <br />
               Reason: {errorOccurred}
               <br />
               Please check the repository name/link, ensure your GitHub token is valid and has the necessary permissions, and verify your network connection.
             </AlertDescription>
           </Alert>
      )}

      {/* Initial State / Not Submitted Yet - Only show if NOT loading, NOT submitted, NO error */}
      {!isLoading && !form.formState.isSubmitted && !errorOccurred && (
          <div className="w-full max-w-4xl text-center text-muted-foreground mt-8">
             {/* You could add an introductory message here if desired */}
             {/* <p>Enter repository details above to get started.</p> */}
          </div>
      )}

    </div>
  );
}
