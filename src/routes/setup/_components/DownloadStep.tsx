import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { useSetupStore } from '../../../stores/setupStore';
import { DownloadStatus } from '../../../enums';
import { cn } from '../../../lib/utils';

export function DownloadStep() {
  const navigate = useNavigate();
  const downloadItems = useSetupStore((state) => state.downloadItems);
  const downloadStatus = useSetupStore((state) => state.downloadStatus);
  const downloadMessage = useSetupStore((state) => state.downloadMessage);
  const initializeDownloadItems = useSetupStore(
    (state) => state.initializeDownloadItems
  );
  const setDownloadStatus = useSetupStore((state) => state.setDownloadStatus);
  const setDownloadMessage = useSetupStore((state) => state.setDownloadMessage);
  const setDownloadProgress = useSetupStore(
    (state) => state.setDownloadProgress
  );
  const setDownloadItemStatus = useSetupStore(
    (state) => state.setDownloadItemStatus
  );

  // Initialize download items on mount
  useEffect(() => {
    initializeDownloadItems();
  }, [initializeDownloadItems]);

  // Simulate download process (TODO: Replace with actual Tauri backend calls)
  useEffect(() => {
    if (downloadStatus !== DownloadStatus.Idle || downloadItems.length === 0) {
      return;
    }

    const simulateDownload = async () => {
      setDownloadStatus(DownloadStatus.Downloading);

      for (const item of downloadItems) {
        setDownloadMessage(`Downloading ${item.label}...`);
        setDownloadItemStatus(item.id, 'downloading');

        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          setDownloadProgress(item.id, progress);
        }

        setDownloadItemStatus(item.id, 'complete');
      }

      setDownloadStatus(DownloadStatus.Processing);
      setDownloadMessage('Setting up Python environment and PyTorch...');
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setDownloadMessage('Installing dependencies...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setDownloadMessage('Configuring application...');
      await new Promise((resolve) => setTimeout(resolve, 500));

      setDownloadStatus(DownloadStatus.Complete);
      setDownloadMessage('Setup complete! You can now start using the app.');
    };

    simulateDownload();
  }, [
    downloadStatus,
    downloadItems,
    setDownloadStatus,
    setDownloadMessage,
    setDownloadProgress,
    setDownloadItemStatus,
  ]);

  const isComplete = downloadStatus === DownloadStatus.Complete;
  const isError = downloadStatus === DownloadStatus.Error;
  const isProcessing =
    downloadStatus === DownloadStatus.Downloading ||
    downloadStatus === DownloadStatus.Processing;

  const handleGoToMain = () => {
    // TODO: Navigate to main app page when implemented
    navigate({ to: '/' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'downloading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : isError ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin" />
          )}
          {isComplete
            ? 'Setup Complete'
            : isError
              ? 'Setup Failed'
              : 'Setting Up'}
        </CardTitle>
        <CardDescription>
          {isComplete
            ? 'Everything is ready. You can start using the app now.'
            : isError
              ? 'Something went wrong during setup.'
              : 'Please wait while we download models and configure the app.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Download items progress */}
        <div className="space-y-4">
          {downloadItems.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  <span
                    className={cn(
                      'text-sm',
                      item.status === 'complete' && 'text-muted-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {item.progress}%
                </span>
              </div>
              <Progress value={item.progress} className="h-2" />
            </div>
          ))}
        </div>

        {/* Status message */}
        {downloadMessage && (
          <div
            className={cn(
              'rounded-lg p-4 text-sm',
              isComplete
                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                : isError
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            {isProcessing && (
              <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
            )}
            {downloadMessage}
          </div>
        )}

        {/* Completion button */}
        {isComplete && (
          <Button className="w-full" onClick={handleGoToMain}>
            Go to Main Page
          </Button>
        )}

        {/* Retry button on error */}
        {isError && (
          <Button
            className="w-full"
            variant="destructive"
            onClick={() => {
              setDownloadStatus(DownloadStatus.Idle);
              initializeDownloadItems();
            }}
          >
            Retry Setup
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
