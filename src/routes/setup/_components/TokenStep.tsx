import { ExternalLink, Key } from 'lucide-react';
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

export function TokenStep() {
  const hfToken = useSetupStore((state) => state.hfToken);
  const updateConfig = useSetupStore((state) => state.updateConfig);
  const validationErrors = useSetupStore((state) => state.validationErrors);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Hugging Face Token
        </CardTitle>
        <CardDescription>
          This app downloads AI models from Hugging Face. An access token helps
          prevent rate limiting and allows access to gated models.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hfToken">Access Token</Label>
          <Input
            id="hfToken"
            type="password"
            value={hfToken}
            onChange={(e) => updateConfig({ hfToken: e.target.value })}
            placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxx"
          />
          {validationErrors.hfToken && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{validationErrors.hfToken}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium mb-2">How to get a Hugging Face token:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Create a free Hugging Face account</li>
            <li>Go to Settings → Access Tokens</li>
            <li>Create a new token with "Read" access</li>
            <li>Copy and paste it above</li>
          </ol>
          <a
            href="https://huggingface.co/docs/hub/security-tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-primary hover:underline"
          >
            Learn more about Hugging Face tokens
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
