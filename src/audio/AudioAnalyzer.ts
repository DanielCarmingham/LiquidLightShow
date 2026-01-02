export interface AudioData {
  bass: number;
  mids: number;
  highs: number;
  volume: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private stream: MediaStream | null = null;
  private _isActive = false;
  private smoothedData: AudioData = { bass: 0, mids: 0, highs: 0, volume: 0 };
  private smoothing = 0.8;

  get isActive(): boolean {
    return this._isActive;
  }

  async start(): Promise<boolean> {
    if (this._isActive) return true;

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Create audio context and analyzer
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect microphone to analyzer
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);

      // Create data array for frequency data
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this._isActive = true;
      return true;
    } catch (error) {
      console.warn('Microphone access denied:', error);
      return false;
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this._isActive = false;
    this.smoothedData = { bass: 0, mids: 0, highs: 0, volume: 0 };
  }

  toggle(): Promise<boolean> {
    if (this._isActive) {
      this.stop();
      return Promise.resolve(false);
    } else {
      return this.start();
    }
  }

  getFrequencyData(): AudioData {
    if (!this._isActive || !this.analyser || !this.dataArray) {
      return { bass: 0, mids: 0, highs: 0, volume: 0 };
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    const bufferLength = this.dataArray.length;
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    const binSize = nyquist / bufferLength;

    // Calculate frequency band averages
    // Bass: 20-250 Hz
    const bassStart = Math.floor(20 / binSize);
    const bassEnd = Math.floor(250 / binSize);
    let bassSum = 0;
    for (let i = bassStart; i <= bassEnd; i++) {
      bassSum += this.dataArray[i];
    }
    const bass = bassSum / (bassEnd - bassStart + 1) / 255;

    // Mids: 250-2000 Hz
    const midsStart = Math.floor(250 / binSize);
    const midsEnd = Math.floor(2000 / binSize);
    let midsSum = 0;
    for (let i = midsStart; i <= midsEnd; i++) {
      midsSum += this.dataArray[i];
    }
    const mids = midsSum / (midsEnd - midsStart + 1) / 255;

    // Highs: 2000-12000 Hz
    const highsStart = Math.floor(2000 / binSize);
    const highsEnd = Math.min(Math.floor(12000 / binSize), bufferLength - 1);
    let highsSum = 0;
    for (let i = highsStart; i <= highsEnd; i++) {
      highsSum += this.dataArray[i];
    }
    const highs = highsSum / (highsEnd - highsStart + 1) / 255;

    // Overall volume
    let volumeSum = 0;
    for (let i = 0; i < bufferLength; i++) {
      volumeSum += this.dataArray[i];
    }
    const volume = volumeSum / bufferLength / 255;

    // Apply smoothing for more organic response
    this.smoothedData.bass =
      this.smoothedData.bass * this.smoothing + bass * (1 - this.smoothing);
    this.smoothedData.mids =
      this.smoothedData.mids * this.smoothing + mids * (1 - this.smoothing);
    this.smoothedData.highs =
      this.smoothedData.highs * this.smoothing + highs * (1 - this.smoothing);
    this.smoothedData.volume =
      this.smoothedData.volume * this.smoothing + volume * (1 - this.smoothing);

    return { ...this.smoothedData };
  }
}
