import type { Driver } from '../types/openf1';

/**
 * Interface for race prediction results
 */
export interface PredictionResult {
  driverNumber: number;
  driverName: string;
  predictedPosition: number;
  predictedTime?: number; // Predicted lap time or gap estimate
  confidence: number; // 0-100 percentage
  qualifyingPosition?: number;
  qualifyingTime?: number;
}

/**
 * Interface for model coefficients loaded from JSON
 */
export interface ModelCoefficients {
  intercept: number;
  qualifyingDeltaWeight: number;
  constructorTrendWeight: number;
  circuitTypeWeight: number;
  historicalPerformanceWeight: number;
  metadata: {
    trainedAt: string;
    datasetSize: number;
    modelVersion: string;
    accuracy: number;
  };
}

/**
 * Race Predictor class that loads pre-trained model coefficients
 * and predicts race outcomes based on qualifying performance
 */
export class RacePredictor {
  private modelCoefficients: ModelCoefficients | null = null;
  private isModelLoaded: boolean = false;
  private drivers: Map<number, Driver> = new Map();

  /**
   * Initialize the race predictor by loading model coefficients
   */
  async initialize(drivers: Driver[]): Promise<void> {
    try {
      // Store driver information for lookups
      drivers.forEach(driver => {
        this.drivers.set(driver.driver_number, driver);
      });

      // Load pre-trained model coefficients from JSON
      const response = await fetch('/model_coefficients.json');
      if (!response.ok) {
        throw new Error('Failed to load model coefficients');
      }
      
      this.modelCoefficients = await response.json();
      this.isModelLoaded = true;
    } catch (error) {
      console.error('Error loading race prediction model:', error);
      this.isModelLoaded = false;
      throw error;
    }
  }

  /**
   * Predict race outcomes based on qualifying times
   * @param qualifyingTimes - Map of driver numbers to their qualifying lap times
   * @returns Array of predicted race results sorted by predicted position
   */
  predictRaceOutcome(
    qualifyingTimes: Record<number, number>
  ): PredictionResult[] {
    if (!this.isModelLoaded || !this.modelCoefficients) {
      throw new Error('Model not loaded. Call initialize() first.');
    }

    const driverNumbers = Object.keys(qualifyingTimes).map(Number);
    const times = Object.values(qualifyingTimes);
    
    // Calculate qualifying delta (gap to fastest qualifying time)
    const minQualifyingTime = Math.min(...times);
    const qualifyingDeltas = Object.fromEntries(
      driverNumbers.map(driverNum => [
        driverNum,
        qualifyingTimes[driverNum] - minQualifyingTime
      ])
    );

    // Calculate predictions for each driver
    const predictions: PredictionResult[] = driverNumbers.map(driverNum => {
      const qualifyingDelta = qualifyingDeltas[driverNum];
      
      // Simple linear regression model:
      // predictedPosition = intercept + (qualifyingDelta × weight) + noise
      // We'll use a regression-based approach to estimate race position
      
      const baseScore = this.modelCoefficients!.intercept +
        (qualifyingDelta * this.modelCoefficients!.qualifyingDeltaWeight);
      
      // Normalize to position (1-20)
      const predictedPosition = Math.max(1, Math.min(20, Math.round(baseScore)));
      
      // Calculate confidence based on how well the model fits this scenario
      // Higher confidence for drivers close to their qualifying position
      const confidence = this.calculateConfidence(qualifyingDelta, driverNum);
      
      const driver = this.drivers.get(driverNum);
      const qualifyingTime = qualifyingTimes[driverNum];
      
      return {
        driverNumber: driverNum,
        driverName: driver ? driver.broadcast_name : `Driver ${driverNum}`,
        predictedPosition,
        predictedTime: baseScore,
        confidence,
        qualifyingTime,
      };
    });

    // Sort by predicted position and assign final positions
    predictions.sort((a, b) => a.predictedPosition - b.predictedPosition);
    
    // Reassign positions to ensure unique values
    predictions.forEach((pred, index) => {
      pred.predictedPosition = index + 1;
    });

    return predictions;
  }

  /**
   * Calculate confidence interval for a prediction
   * Factors: qualifying delta, historical volatility, etc.
   */
  private calculateConfidence(qualifyingDelta: number, driverNumber: number): number {
    if (!this.modelCoefficients) return 50;

    // Base confidence decreases with qualifying delta
    // (larger deltas = less predictable race outcome)
    const deltaConfidence = Math.max(40, 100 - (qualifyingDelta * 2));
    
    // Model accuracy factor from training metadata
    const modelAccuracyFactor = this.modelCoefficients.metadata.accuracy;
    
    // Final confidence: weighted combination
    const confidence = (deltaConfidence * 0.6) + (modelAccuracyFactor * 40);
    
    return Math.min(100, Math.max(20, Math.round(confidence)));
  }

  /**
   * Get model metadata
   */
  getModelMetadata() {
    return this.modelCoefficients?.metadata;
  }

  /**
   * Check if model is loaded
   */
  isLoaded(): boolean {
    return this.isModelLoaded;
  }
}

// Export singleton instance
export const racePredictor = new RacePredictor();
