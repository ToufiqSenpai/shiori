import { Folder } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { useSetupStore } from '../../../stores/setupStore';

export function DirectoryStep() {
  const dataDirectory = useSetupStore((state) => state.dataDirectory);
  const updateConfig = useSetupStore((state) => state.updateConfig);
  const validationErrors = useSetupStore((state) => state.validationErrors);

  const handleSelectDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Data Directory',
      });

      if (selected) {
        updateConfig({ dataDirectory: selected as string });
      }
    } catch (error) {
      console.error('Failed to open directory picker:', error);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Select Data Directory</CardTitle>
        <CardDescription>
          Choose where to store AI models, application settings, and database
          files. This location should have enough space for the models you plan
          to download.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="directory">Directory Path</Label>
          <div className="flex gap-2">
            <Input
              id="directory"
              value={dataDirectory}
              readOnly
              placeholder="Click the folder button to select a directory"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleSelectDirectory}
              aria-label="Select directory"
            >
              <Folder className="h-4 w-4" />
            </Button>
          </div>
          {validationErrors.dataDirectory && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>
                {validationErrors.dataDirectory}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">What will be stored here:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Whisper speech-to-text models</li>
            <li>Local LLM models (if selected)</li>
            <li>Application database</li>
            <li>Configuration files</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
