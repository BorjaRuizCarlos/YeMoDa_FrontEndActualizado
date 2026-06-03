import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { azureService } from '../../services';
import { toast } from 'sonner';
import { Cloud, Loader2 } from 'lucide-react';

export default function AzureRet() {
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [stories, setStories] = useState<any[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  useEffect(() => {
    // Check if we have a callback from OAuth
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const handleOAuthCallback = async (code: string, state: string) => {
    setLoading(true);
    try {
      const response = await azureService.completeOAuth({ code, state });
      toast.success(`Connection successful. ${response.subscriptions_registered} subscription(s) registered.`);

      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      // Load the stories
      await fetchStories();
    } catch (error) {
      toast.error('Error completing the connection to Azure DevOps');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOAuth = async () => {
    setConnecting(true);
    try {
      const data = await azureService.startOAuth();
      window.location.href = data.authorize_url;
    } catch (error) {
      toast.error('Error starting the connection to Azure DevOps');
      console.error(error);
      setConnecting(false);
    }
  };

  const fetchStories = async () => {
    setStoriesLoading(true);
    try {
      const data = await azureService.getStories();
      setStories(data);
    } catch (error) {
      toast.error('Error loading Azure DevOps stories');
      console.error(error);
    } finally {
      setStoriesLoading(false);
    }
  };

  return (
    <div className="px-4 pb-6 pt-3 max-w-[1600px]">
      <h1 className="text-[13px] font-semibold text-foreground mb-0.5">Azure Return</h1>
      <p className="text-[11px] text-muted-foreground mb-4">Microsoft Azure DevOps information</p>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card border border-border rounded-[4px] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-[12px] font-semibold text-foreground">User Stories</h2>
            </div>
            {loading || storiesLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse bg-secondary rounded" />)}
              </div>
            ) : stories.length === 0 ? (
              <div className="py-12 text-center p-4">
                <p className="text-[11px] text-muted-foreground">
                  No stories available, or you haven't connected yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {stories.map((story) => (
                  <div key={story.id} className="p-4 hover:bg-surface-secondary/20 transition-colors">
                    <p className="text-[12px] font-medium text-foreground">{story.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{story.status}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-[4px] p-4">
            <h2 className="text-[12px] font-semibold text-foreground mb-2">Connection</h2>
            <div className="rounded-[4px] border border-border p-3 bg-surface-secondary/30">
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Connect your Microsoft Azure DevOps account to view your user stories.
                  </p>
                </div>
                <button
                  onClick={handleStartOAuth}
                  disabled={connecting || loading}
                  className="w-full h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[11px] font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      Connect Azure DevOps
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
