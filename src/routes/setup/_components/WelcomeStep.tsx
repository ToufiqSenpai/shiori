import { Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { useSetupStore } from '../../../stores/setupStore';

const APP_VERSION = '0.1.0';

export function WelcomeStep() {
  const nextStep = useSetupStore((state) => state.nextStep);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">AI Note Meet Summarizer</CardTitle>
        <CardDescription>Version {APP_VERSION}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-muted-foreground">
          Welcome! This application helps you automatically transcribe and
          summarize your meetings using AI. It uses local speech-to-text models
          for transcription and can connect to cloud LLMs for intelligent
          summarization.
        </p>
        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          <p>✓ Transcribe meetings with Whisper AI</p>
          <p>✓ Generate smart summaries with LLM</p>
          <p>✓ Works offline with local models</p>
          <p>✓ Privacy-focused - your data stays local</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={nextStep}>
          Get Started
        </Button>
      </CardFooter>
    </Card>
  );
}
