// utils/syncProgressTracker.ts
type ProgressCallback = (progress: number) => void;
type MessageCallback = (message: string) => void;

interface SyncStep {
  name: string;
  weight: number; // Bobot durasi step ini (0-100)
  startProgress: number;
  endProgress: number;
}

export class SyncProgressTracker {
  private steps: SyncStep[] = [];
  private currentStep = 0;
  private progressCallbacks: ProgressCallback[] = [];
  private messageCallbacks: MessageCallback[] = [];
  private startTime = 0;

  constructor(steps: string[]) {
    // Initialize steps dengan bobot equal
    const weight = 100 / steps.length;
    this.steps = steps.map((name, index) => ({
      name,
      weight,
      startProgress: weight * index,
      endProgress: weight * (index + 1),
    }));
  }

  // Set custom weights untuk steps
  setWeights(weights: number[]) {
    if (weights.length !== this.steps.length || weights.reduce((a, b) => a + b) !== 100) {
      console.warn("Weights harus berjumlah 100 dan sesuai dengan jumlah steps");
      return;
    }

    let currentProgress = 0;
    this.steps.forEach((step, index) => {
      step.weight = weights[index];
      step.startProgress = currentProgress;
      currentProgress += weights[index];
      step.endProgress = currentProgress;
    });
  }

  onProgress(callback: ProgressCallback) {
    this.progressCallbacks.push(callback);
  }

  onMessage(callback: MessageCallback) {
    this.messageCallbacks.push(callback);
  }

  start() {
    this.startTime = Date.now();
    this.currentStep = 0;
    this.updateMessage();
    this.updateProgress(this.steps[0].startProgress);
  }

  nextStep() {
    this.currentStep = Math.min(this.currentStep + 1, this.steps.length - 1);
    this.updateMessage();
  }

  updateProgress(progress: number) {
    const clampedProgress = Math.min(100, Math.max(0, progress));
    this.progressCallbacks.forEach((cb) => cb(clampedProgress));
  }

  updateMessage() {
    const step = this.steps[this.currentStep];
    this.messageCallbacks.forEach((cb) => cb(step.name));
  }

  // Progress smooth dari start hingga end step saat ini
  animateToCurrentStep(duration: number = 1000) {
    const step = this.steps[this.currentStep];
    const startProgress = step.startProgress;
    const endProgress = step.endProgress;
    const range = endProgress - startProgress;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed / duration) * range + startProgress;

      if (elapsed < duration) {
        this.updateProgress(progress);
        requestAnimationFrame(animate);
      } else {
        this.updateProgress(endProgress);
      }
    };

    animate();
  }

  complete() {
    this.updateProgress(100);
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}

// ============= CONTOH PENGGUNAAN =============
/*
// Definisikan steps sync Anda
const tracker = new SyncProgressTracker([
  "Menginisialisasi database",
  "Sinkronisasi data master",
  "Sinkronisasi transaksi",
  "Optimasi database",
  "Selesai",
]);

// Set custom weights (berdasarkan estimasi durasi setiap step)
tracker.setWeights([10, 40, 35, 10, 5]);

// Listen to progress changes
tracker.onProgress((progress) => {
  setSyncProgress(progress);
});

// Listen to message changes
tracker.onMessage((message) => {
  setSyncMessage(message);
});

// Start tracking
tracker.start();

// Simulasi sync steps
async function performSync() {
  try {
    // Step 1: Init database
    await initDatabase();
    tracker.animateToCurrentStep(500);
    tracker.nextStep();

    // Step 2: Sync master data
    await syncMasterData();
    tracker.animateToCurrentStep(2000); // Step ini lebih lama
    tracker.nextStep();

    // Step 3: Sync transactions
    await syncTransactions();
    tracker.animateToCurrentStep(1800);
    tracker.nextStep();

    // Step 4: Optimize
    await optimizeDatabase();
    tracker.animateToCurrentStep(600);
    tracker.nextStep();

    // Complete
    tracker.complete();
  } catch (error) {
    console.error("Sync error:", error);
  }
}
*/