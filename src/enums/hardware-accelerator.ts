export enum HardwareAccelerator {
  CPU = 'cpu',
  CUDA = 'cuda',
}

export const HARDWARE_ACCELERATOR_LABELS: Record<HardwareAccelerator, string> = {
  [HardwareAccelerator.CPU]: 'CPU',
  [HardwareAccelerator.CUDA]: 'CUDA',
};
