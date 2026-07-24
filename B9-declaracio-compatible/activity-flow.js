export const ACTIVITY_STEPS = Object.freeze({
  PREDICTION: 1,
  WORKED_CASE: 2,
  REFLECTION: 3,
  TRANSFER: 4,
  TAKEAWAY: 5,
});

const FIRST_STEP = ACTIVITY_STEPS.PREDICTION;
const LAST_STEP = ACTIVITY_STEPS.TAKEAWAY;

function isValidStep(step) {
  return Number.isInteger(step) && step >= FIRST_STEP && step <= LAST_STEP;
}

export class ActivityFlow {
  constructor() {
    this.currentStep = FIRST_STEP;
    this.predictionRevealed = false;
    this.workedCaseConfirmed = false;
    this.reflectionCorrect = false;
    this.transferConfirmed = false;
    this.completed = false;
  }

  revealPrediction() {
    this.predictionRevealed = true;
  }

  setWorkedCaseConfirmed(value) {
    this.workedCaseConfirmed = Boolean(value);
    if (!this.workedCaseConfirmed) {
      this.reflectionCorrect = false;
      this.transferConfirmed = false;
    }
  }

  setReflectionCorrect(value) {
    const accepted = Boolean(value) && this.workedCaseConfirmed;
    this.reflectionCorrect = accepted;
    if (!accepted) {
      this.transferConfirmed = false;
    }
    return accepted;
  }

  setTransferConfirmed(value) {
    const accepted = Boolean(value) && this.reflectionCorrect;
    this.transferConfirmed = accepted;
    return accepted;
  }

  canEnter(step) {
    if (!isValidStep(step)) {
      return false;
    }

    const requirements = {
      [ACTIVITY_STEPS.PREDICTION]: true,
      [ACTIVITY_STEPS.WORKED_CASE]: this.predictionRevealed,
      [ACTIVITY_STEPS.REFLECTION]: this.workedCaseConfirmed,
      [ACTIVITY_STEPS.TRANSFER]: this.reflectionCorrect,
      [ACTIVITY_STEPS.TAKEAWAY]: this.transferConfirmed,
    };
    return requirements[step];
  }

  enter(step) {
    if (!isValidStep(step)) {
      return false;
    }

    const movingBack = step < this.currentStep;
    if (!movingBack && !this.canEnter(step)) {
      return false;
    }

    this.currentStep = step;
    if (step === ACTIVITY_STEPS.TAKEAWAY) {
      this.completed = true;
    }
    return true;
  }

  resetTransfer() {
    this.transferConfirmed = false;
    if (this.currentStep > ACTIVITY_STEPS.TRANSFER) {
      this.currentStep = ACTIVITY_STEPS.TRANSFER;
    }
  }

  snapshot() {
    return Object.freeze({
      currentStep: this.currentStep,
      predictionRevealed: this.predictionRevealed,
      workedCaseConfirmed: this.workedCaseConfirmed,
      reflectionCorrect: this.reflectionCorrect,
      transferConfirmed: this.transferConfirmed,
      completed: this.completed,
    });
  }
}
