import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';
import * as path from 'path';
import { NUM_FEATURES } from './featureExtractor';

export class MLService {
  private model: tf.LayersModel | null = null;
  private readonly modelDir = path.join(process.cwd(), 'models', 'ml');
  private readonly modelPath = path.join(this.modelDir, 'model.json');

  private lastAccuracy: number = 0;
  private lastLoss: number = 0;
  private samplesCount: number = 0;

  constructor() {
    this.ensureModelDir();
  }

  getStatus() {
    return {
      isLoaded: !!this.model,
      lastAccuracy: this.lastAccuracy,
      lastLoss: this.lastLoss,
      samplesCount: this.samplesCount,
      modelPath: this.modelPath
    };
  }

  private ensureModelDir() {
    if (!fs.existsSync(this.modelDir)) {
      fs.mkdirSync(this.modelDir, { recursive: true });
    }
  }

  async initModel() {
    if (fs.existsSync(this.modelPath)) {
      try {
        console.log('🤖 ML Service: Loading existing model from disk...');
        this.model = await this.loadModelFromDisk();
        // Compile after loading
        this.model.compile({
          optimizer: tf.train.adam(0.001),
          loss: 'binaryCrossentropy',
          metrics: ['accuracy']
        });
        console.log('✅ ML Service: Model loaded and compiled.');
        return;
      } catch (err) {
        console.error('❌ ML Service: Error loading model:', err);
      }
    }

    console.log('🤖 ML Service: Creating new model architecture...');
    const model = tf.sequential();
    
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu',
      inputShape: [NUM_FEATURES]
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    model.add(tf.layers.dense({
      units: 8,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    this.model = model;
    console.log('✅ ML Service: New model created.');
  }

  async scoreSignal(features: number[]): Promise<{ score: number; verdict: string }> {
    if (!this.model) await this.initModel();
    if (!this.model) return { score: 0.5, verdict: 'ERROR' };

    const input = tf.tensor2d([features]);
    const prediction = this.model.predict(input) as tf.Tensor;
    const score = (await prediction.data())[0];
    
    input.dispose();
    prediction.dispose();

    let verdict = 'SKIP';
    if (score >= 0.8) verdict = 'STRONG_TAKE';
    else if (score >= 0.6) verdict = 'TAKE';
    else if (score >= 0.4) verdict = 'NEUTRAL';
    else if (score >= 0.2) verdict = 'WEAK';
    else verdict = 'STRONG_SKIP';

    return { score, verdict };
  }

  async train(features: number[][], labels: number[]): Promise<{ accuracy: number; loss: number }> {
    if (!this.model) await this.initModel();
    if (!this.model) throw new Error('Model not initialized');

    console.log(`🤖 ML Service: Starting advanced training on ${features.length} samples...`);

    // 1. Calculate Class Weights for Imbalanced Trading Data (Wins vs Losses balance)
    const numWins = labels.filter(l => l === 1).length;
    const numLosses = labels.length - numWins;
    const total = labels.length;
    
    const classWeight: Record<number, number> = {
      0: numLosses > 0 ? (total / (2 * numLosses)) : 1.0,
      1: numWins > 0 ? (total / (2 * numWins)) : 1.0
    };
    
    console.log(`🤖 ML Service: Class balance - Wins: ${numWins}, Losses: ${numLosses}. Dynamic Class Weights:`, classWeight);

    const xTrain = tf.tensor2d(features);
    const yTrain = tf.tensor2d(labels, [labels.length, 1]);

    // 2. Training configuration with early stopping and validation splitting
    let bestValLoss = Infinity;
    let epochsWithoutImprovement = 0;
    const patience = 8; // Stop if validation loss stalls for 8 epochs

    const history = await this.model.fit(xTrain, yTrain, {
      epochs: 80,
      batchSize: 16, // Smaller batch sizes yield better generalisation on micro-datasets
      validationSplit: 0.2,
      shuffle: true,
      verbose: 0,
      classWeight,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const valLoss = logs?.val_loss || 0;
          const valAcc = logs?.val_acc || 0;
          
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(4)}, acc = ${logs?.acc.toFixed(4)} | val_loss = ${valLoss.toFixed(4)}, val_acc = ${valAcc.toFixed(4)}`);
          }

          // Adaptive Learning Rate Decay (reduce LR if validation stalls)
          if (epoch > 0 && epoch % 15 === 0) {
            const currentLr = (this.model?.optimizer as any).learningRate;
            if (currentLr) {
              const newLr = currentLr * 0.5;
              (this.model!.optimizer as any).learningRate = newLr;
              console.log(`📉 [ADAPTIVE LR] Decayed learning rate to ${newLr.toFixed(6)}`);
            }
          }

          // Early stopping logic
          if (valLoss < bestValLoss) {
            bestValLoss = valLoss;
            epochsWithoutImprovement = 0;
          } else {
            epochsWithoutImprovement++;
            if (epochsWithoutImprovement >= patience) {
              console.log(`🛑 [EARLY STOPPING] Triggered at epoch ${epoch} to prevent overfitting. Best val_loss: ${bestValLoss.toFixed(4)}`);
              this.model?.stopTraining;
            }
          }
        }
      }
    });

    const accuracy = history.history.acc[history.history.acc.length - 1] as number;
    const loss = history.history.loss[history.history.loss.length - 1] as number;

    this.lastAccuracy = accuracy;
    this.lastLoss = loss;
    this.samplesCount = features.length;

    console.log(`✅ ML Service: Training complete. Accuracy: ${(accuracy * 100).toFixed(2)}%`);

    await this.saveModelToDisk();

    xTrain.dispose();
    yTrain.dispose();

    return { accuracy, loss };
  }

  private async saveModelToDisk() {
    if (!this.model) return;
    
    // Custom save handler for Node.js without tfjs-node
    const saveHandler = {
      save: async (modelArtifacts: tf.io.ModelArtifacts) => {
        const weightData = modelArtifacts.weightData;
        const weightSpecs = modelArtifacts.weightSpecs;
        
        // Remove weightData from modelArtifacts to save as JSON
        const modelTopology = modelArtifacts.modelTopology;
        const format = modelArtifacts.format;
        const generatedBy = modelArtifacts.generatedBy;
        const convertedBy = modelArtifacts.convertedBy;

        const manifest = {
          modelTopology,
          format,
          generatedBy,
          convertedBy,
          weightsManifest: [{
            paths: ['weights.bin'],
            weights: weightSpecs
          }]
        };

        fs.writeFileSync(this.modelPath, JSON.stringify(manifest, null, 2));
        
        let weightBytes = 0;
        if (weightData) {
          const buffer = Buffer.from(weightData as ArrayBuffer);
          fs.writeFileSync(path.join(this.modelDir, 'weights.bin'), buffer);
          weightBytes = buffer.byteLength;
        }

        return {
          modelArtifactsInfo: {
            dateSaved: new Date(),
            modelTopologyType: 'JSON' as const,
            modelTopologyBytes: JSON.stringify(modelTopology).length,
            weightSpecsBytes: JSON.stringify(weightSpecs).length,
            weightDataBytes: weightBytes,
          }
        };
      }
    };

    await (this.model as tf.LayersModel).save(saveHandler as tf.io.IOHandler);
    console.log('💾 ML Service: Model saved to disk.');
  }

  private async loadModelFromDisk(): Promise<tf.LayersModel> {
    const loadHandler: tf.io.IOHandler = {
      load: async () => {
        const modelJsonStr = fs.readFileSync(this.modelPath, 'utf8');
        const modelJson = JSON.parse(modelJsonStr);
        
        const weightData = fs.readFileSync(path.join(this.modelDir, 'weights.bin'));
        
        const modelArtifacts: tf.io.ModelArtifacts = {
          modelTopology: modelJson.modelTopology,
          format: modelJson.format,
          generatedBy: modelJson.generatedBy,
          convertedBy: modelJson.convertedBy,
          weightSpecs: modelJson.weightsManifest[0].weights,
          weightData: weightData.buffer.slice(weightData.byteOffset, weightData.byteOffset + weightData.byteLength) as ArrayBuffer
        };
        
        return modelArtifacts;
      }
    };

    return await tf.loadLayersModel(loadHandler);
  }
}

export const mlService = new MLService();
