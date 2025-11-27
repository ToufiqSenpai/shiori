export enum Accelerator {
  CPU = 'cpu',
  CUDA = 'cuda',
  ROCm = 'rocm',
  OpenVINO = 'openvino',
}

export const ACCELERATOR_LABELS: Record<Accelerator, string> = {
  [Accelerator.CPU]: 'CPU',
  [Accelerator.CUDA]: 'NVIDIA CUDA',
  [Accelerator.ROCm]: 'AMD ROCm',
  [Accelerator.OpenVINO]: 'Intel OpenVINO',
};
