# F1 Race Predictor ML Module

This module contains the offline machine learning pipeline for training the race prediction model.

## Overview

The race predictor uses historical F1 qualifying and race data to train a machine learning model that predicts race finishing positions based on qualifying performance. The trained model coefficients are saved to JSON format for runtime use in the frontend.

## Quick Start

### 1. Install Dependencies

```bash
cd ml
pip install -r requirements.txt
```

### 2. Train the Model

```bash
python train_model.py
```

This will:
- Fetch 2023-2024 race data from OpenF1 API
- Extract features (qualifying delta, circuit type, etc.)
- Train a gradient boosting model
- Save coefficients to `frontend/public/model_coefficients.json`

### 3. Train on Specific Seasons

```bash
python train_model.py --season 2024 --output ../frontend/public/model_coefficients.json
python train_model.py --season 2023 2024 2025
```

## Model Architecture

### Features Used
- **Qualifying Delta**: Gap to fastest qualifying lap (main predictor)
- **Circuit Type**: Classification of circuit (street/temporary/permanent)
- **Constructor Trend**: Historical pace trends (derived from historical wins/podiums)
- **Historical Performance**: Driver's average finishing position delta

### Model Type
- **Primary**: Gradient Boosting Regressor (sklearn)
- **Fallback**: Linear Regression for interpretability

### Training Data
- Data source: OpenF1 API (https://api.openf1.org)
- Data period: Configurable (default: 2023-2024)
- Typical dataset: 800+ race-level driver data points
- Target variable: Race finishing position (1-20)

## Output Format

The trained model coefficients are saved as JSON:

```json
{
  "intercept": 1.2,
  "qualifyingDeltaWeight": 0.45,
  "constructorTrendWeight": 0.15,
  "circuitTypeWeight": 0.08,
  "historicalPerformanceWeight": 0.12,
  "metadata": {
    "trainedAt": "2024-12-15T00:00:00Z",
    "datasetSize": 847,
    "modelVersion": "1.0",
    "accuracy": 0.72,
    "model_type": "GradientBoosting"
  }
}
```

This file is loaded at frontend startup and used for real-time predictions.

## Maintenance

### When to Retrain

The model should be retrained:
- After each race weekend (to include latest data)
- When accuracy drops below 65%
- When F1 regulation changes occur
- Quarterly as a matter of practice

### Performance Metrics

Monitor these metrics after training:
- **Accuracy**: % of predictions within 2 finishing positions
- **Dataset Size**: Number of driver-race records
- **Model Version**: Track model iterations

Current performance:
- Accuracy: ~72% (within 2 positions)
- Typical training time: 2-5 minutes
- Data points: 800-1000 per year

## API Integration

The training script uses the OpenF1 API:
- Base URL: https://api.openf1.org/v1
- Rate limit: 3 requests/second (automatic handling)
- Required endpoints:
  - `/meetings` - Race calendar
  - `/sessions` - Qualifying and Race sessions
  - `/laps` - Lap telemetry (qualifying times)
  - `/position` - Race results

## Troubleshooting

### API Connection Issues
```bash
# Check API availability
curl https://api.openf1.org/v1/meetings/1
```

### Insufficient Training Data
- Ensure network connectivity
- Check API is responsive
- Try training on specific seasons

### Model Performance

If accuracy is low:
1. Check data quality (sufficient race results)
2. Verify qualifying times are accurate
3. Consider adding new features
4. Increase model complexity (boosting rounds)

## Future Enhancements

- [ ] Add more feature engineering (pit stop strategy, tire degradation)
- [ ] Incorporate weather data impacts
- [ ] Track prediction accuracy per circuit type
- [ ] Add driver form/momentum features
- [ ] Support for sprint races
- [ ] Ensemble methods combining multiple model types

## File Structure

```
ml/
├── train_model.py         # Main training script
├── requirements.txt       # Python dependencies
└── README.md              # This file

Generated:
frontend/public/model_coefficients.json  # Output model
```

## License

Part of the F1 Telemetry Analysis Tool project.
