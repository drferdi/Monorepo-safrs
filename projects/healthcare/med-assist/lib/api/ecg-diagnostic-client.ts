import { analyzeEcgImage, isAcceptedEcgImageFile, medlensClient } from './medlens-client';

export { medlensClient };

export function isAcceptedEcgFile(file: File): boolean {
  return isAcceptedEcgImageFile(file);
}

export async function analyzeEcgDiagnosticFile(file: File) {
  return analyzeEcgImage(file);
}
