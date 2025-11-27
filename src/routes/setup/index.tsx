import { createFileRoute } from '@tanstack/react-router';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useSetupStore } from '../../stores/setupStore';
import { SetupStep, SETUP_STEP_COUNT, LLM_PROVIDER_INFO } from '../../enums';
import {
  validateDirectory,
  validateHfToken,
  validateLlmApiKey,
} from '../../lib/validation';
import { cn } from '../../lib/utils';

// Step components
import { WelcomeStep } from './_components/WelcomeStep';
import { DirectoryStep } from './_components/DirectoryStep';
import { TokenStep } from './_components/TokenStep';
import { HardwareModelStep } from './_components/HardwareModelStep';
import { ConfirmStep } from './_components/ConfirmStep';
import { DownloadStep } from './_components/DownloadStep';

export const Route = createFileRoute('/setup/')({
  component: RouteComponent,
});

function RouteComponent() {
  const currentStep = useSetupStore((state) => state.currentStep);
  const isValidating = useSetupStore((state) => state.isValidating);
  const setIsValidating = useSetupStore((state) => state.setIsValidating);
  const nextStep = useSetupStore((state) => state.nextStep);
  const prevStep = useSetupStore((state) => state.prevStep);
  const setValidationError = useSetupStore(
    (state) => state.setValidationError
  );
  const clearAllErrors = useSetupStore((state) => state.clearAllErrors);

  // Get current values for validation
  const dataDirectory = useSetupStore((state) => state.dataDirectory);
  const hfToken = useSetupStore((state) => state.hfToken);
  const llmProvider = useSetupStore((state) => state.llmProvider);
  const llmApiKey = useSetupStore((state) => state.llmApiKey);

  const llmInfo = LLM_PROVIDER_INFO[llmProvider];

  // Render current step component
  const renderStep = () => {
    switch (currentStep) {
      case SetupStep.Welcome:
        return <WelcomeStep />;
      case SetupStep.Directory:
        return <DirectoryStep />;
      case SetupStep.Token:
        return <TokenStep />;
      case SetupStep.Hardware:
        return <HardwareModelStep />;
      case SetupStep.Confirm:
        return <ConfirmStep />;
      case SetupStep.Download:
        return <DownloadStep />;
      default:
        return <WelcomeStep />;
    }
  };

  // Validate current step before proceeding
  const validateCurrentStep = async (): Promise<boolean> => {
    clearAllErrors();
    setIsValidating(true);

    try {
      switch (currentStep) {
        case SetupStep.Directory: {
          const result = await validateDirectory(dataDirectory);
          if (!result.valid) {
            setValidationError('dataDirectory', result.error || 'Invalid directory');
            return false;
          }
          return true;
        }

        case SetupStep.Token: {
          const result = await validateHfToken(hfToken);
          if (!result.valid) {
            setValidationError('hfToken', result.error || 'Invalid token');
            return false;
          }
          return true;
        }

        case SetupStep.Hardware: {
          if (llmInfo.requiresApiKey) {
            const result = await validateLlmApiKey(llmProvider, llmApiKey);
            if (!result.valid) {
              setValidationError('llmApiKey', result.error || 'Invalid API key');
              return false;
            }
          }
          return true;
        }

        default:
          return true;
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Handle next button click
  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      nextStep();
    }
  };

  // Determine button text
  const getNextButtonText = () => {
    if (isValidating) return 'Validating...';
    if (currentStep === SetupStep.Confirm) return 'Start Setup';
    return 'Next';
  };

  // Check if we should show navigation buttons
  const showNavigation =
    currentStep !== SetupStep.Welcome && currentStep !== SetupStep.Download;
  const showBackButton = currentStep > SetupStep.Welcome && currentStep < SetupStep.Download;
  const showNextButton = currentStep > SetupStep.Welcome && currentStep < SetupStep.Download;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Dot stepper */}
      <div className="mb-8 flex items-center gap-2">
        {Array.from({ length: SETUP_STEP_COUNT }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              index === currentStep
                ? 'bg-primary'
                : index < currentStep
                  ? 'bg-primary/50'
                  : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="w-full max-w-lg">{renderStep()}</div>

      {/* Navigation buttons */}
      {showNavigation && (
        <div className="mt-6 flex w-full max-w-lg gap-4">
          {showBackButton && (
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isValidating}
              className="flex-1"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          {showNextButton && (
            <Button
              onClick={handleNext}
              disabled={isValidating}
              className="flex-1"
            >
              {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {getNextButtonText()}
              {!isValidating && <ChevronRight className="ml-2 h-4 w-4" />}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
