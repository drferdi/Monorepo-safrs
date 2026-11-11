import type { Metadata } from 'sharp';

export type WaveformImageQuality = {
  readable?: boolean;
  status: 'readable' | 'limited' | 'unreadable';
  issues: string[];
};

export type WaveformTextSupport = {
  raw_ecg_relevant_text: string[];
  ocr_extracted_values: Record<string, string | undefined>;
  limitations: string[];
  ignored_or_redacted_identifiers_detected: boolean;
};

export type WaveformReviewOutput = {
  status: string;
  failedAssertions: string[];
  clinicalOutputAllowed?: boolean;
  reason?: string;
};

export type WaveformExtractionResult = {
  packet: unknown;
  reviewOutput: WaveformReviewOutput;
};

export function extractWaveformPacketFromImage(input: {
  inputBuffer: Buffer;
  sourceHash: string;
  file: File;
  metadata: Metadata;
  imageQuality: WaveformImageQuality;
  textSupport: WaveformTextSupport;
}): Promise<WaveformExtractionResult>;
