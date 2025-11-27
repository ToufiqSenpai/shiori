export enum SetupStep {
  Welcome = 0,
  Directory = 1,
  Token = 2,
  Hardware = 3,
  Confirm = 4,
  Download = 5,
}

export const SETUP_STEP_COUNT = Object.keys(SetupStep).length / 2;
