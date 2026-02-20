export enum SubtitleLanguage {
  AUTO = 'AUTO',
  EN = 'EN',
  ZH = 'ZH',
  JA = 'JA',
  KO = 'KO',
  FR = 'FR',
  DE = 'DE',
  ES = 'ES'
}

export interface SubtitleSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  isRedundant: boolean;
  confidence: number;
}

export interface VideoMetadata {
  name: string;
  size: number;
  duration: number;
  url: string;
  file: File;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED'
}

export interface ProcessingStep {
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
}