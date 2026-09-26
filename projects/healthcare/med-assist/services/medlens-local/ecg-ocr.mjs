import sharp from 'sharp';
import { PSM, createWorker } from 'tesseract.js';

const OCR_TARGET_WIDTH = 1600;
const DEFAULT_ECG_TEXT_REGION_PRESETS = [
  {
    id: 'upper-right-header',
    leftRatio: 0.48,
    topRatio: 0.02,
    widthRatio: 0.48,
    heightRatio: 0.26,
  },
  {
    id: 'upper-band',
    leftRatio: 0.05,
    topRatio: 0.02,
    widthRatio: 0.9,
    heightRatio: 0.24,
  },
  {
    id: 'right-column',
    leftRatio: 0.56,
    topRatio: 0.04,
    widthRatio: 0.38,
    heightRatio: 0.42,
  },
  {
    id: 'center-band',
    leftRatio: 0.12,
    topRatio: 0.16,
    widthRatio: 0.76,
    heightRatio: 0.22,
  },
  {
    id: 'lower-right-interpretation',
    leftRatio: 0.5,
    topRatio: 0.58,
    widthRatio: 0.47,
    heightRatio: 0.34,
  },
  {
    id: 'lower-band',
    leftRatio: 0.05,
    topRatio: 0.62,
    widthRatio: 0.9,
    heightRatio: 0.28,
  },
  {
    id: 'right-half',
    leftRatio: 0.5,
    topRatio: 0.05,
    widthRatio: 0.47,
    heightRatio: 0.86,
  },
];
const POSITIVE_SIGNAL_WEIGHTS = [
  { pattern: /\b(?:heart|ventricular|vent\.?|hr)\s*rate\b/i, weight: 5 },
  { pattern: /\b(?:pr|p-r)\s*(?:interval|int)?\b/i, weight: 4 },
  { pattern: /\bqrs(?:\s*(?:duration|dur))?\b/i, weight: 4 },
  { pattern: /\bqt(?:\s*\/\s*qtc)?\b/i, weight: 3 },
  { pattern: /\bqtc\b/i, weight: 3 },
  { pattern: /\b(?:p\/qrs\/t|p\/r\/t|p-r-t)\s*ax(?:is|es)\b/i, weight: 4 },
  { pattern: /\bp\s*axis\b/i, weight: 2 },
  { pattern: /\bqrs\s*axis\b/i, weight: 2 },
  { pattern: /\bt\s*axis\b/i, weight: 2 },
  {
    pattern:
      /\b(?:sinus|atrial|junctional|paced|rhythm|fibrillation|flutter|tachycardia|bradycardia)\b/i,
    weight: 4,
  },
  { pattern: /\b(?:machine\s*)?interpret(?:ation)?\b/i, weight: 4 },
  { pattern: /\bdiagnos(?:is|e|tic)\b/i, weight: 2 },
];
const NEGATIVE_SIGNAL_WEIGHTS = [
  { pattern: /\bpatient\s*name\b/i, weight: 4 },
  { pattern: /\bmrn\b/i, weight: 4 },
  { pattern: /\bdob\b|\bdate\s+of\s+birth\b/i, weight: 4 },
  { pattern: /\baddress\b/i, weight: 3 },
  { pattern: /\bphone\b|\bmobile\b/i, weight: 3 },
  { pattern: /\bmember\s*id\b|\bid\s*[:#]/i, weight: 3 },
  { pattern: /\bhospital\b|\bmedical\s*center\b|\bdepartment\b|\bclinic\b/i, weight: 2 },
];
const IDENTIFIER_PATTERNS = [
  /\bpatient\s*name\b/i,
  /\bmrn\b/i,
  /\bdob\b|\bdate\s+of\s+birth\b/i,
  /\baddress\b/i,
  /\bphone\b|\bmobile\b/i,
  /\bmember\s*id\b|\bid\s*[:#]/i,
];
const UNIT_PATTERNS = [
  { pattern: /\bms\b/gi, weight: 1, cap: 3 },
  { pattern: /\bbpm\b/gi, weight: 1, cap: 2 },
  { pattern: /\bdeg\b/gi, weight: 1, cap: 3 },
];
const MIN_REGION_WIDTH = 220;
const MIN_REGION_HEIGHT = 90;

let workerPromise;

export function normalizeRecognizedText(value) {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
        user_defined_dpi: '150',
      });
      return worker;
    })().catch((error) => {
      workerPromise = undefined;
      throw error;
    });
  }

  return workerPromise;
}

function getOrientedDimensions(metadata) {
  return {
    width: metadata.autoOrient?.width ?? metadata.width ?? 0,
    height: metadata.autoOrient?.height ?? metadata.height ?? 0,
  };
}

function clampRegionRect(rect, maxWidth, maxHeight) {
  const left = Math.max(0, Math.min(rect.left, Math.max(0, maxWidth - 1)));
  const top = Math.max(0, Math.min(rect.top, Math.max(0, maxHeight - 1)));
  const width = Math.max(1, Math.min(rect.width, maxWidth - left));
  const height = Math.max(1, Math.min(rect.height, maxHeight - top));

  return { left, top, width, height };
}

function buildRegionRectFromPreset(preset, imageWidth, imageHeight) {
  const rect = clampRegionRect(
    {
      left: Math.round(imageWidth * preset.leftRatio),
      top: Math.round(imageHeight * preset.topRatio),
      width: Math.round(imageWidth * preset.widthRatio),
      height: Math.round(imageHeight * preset.heightRatio),
    },
    imageWidth,
    imageHeight
  );

  if (rect.width < MIN_REGION_WIDTH || rect.height < MIN_REGION_HEIGHT) {
    return null;
  }

  return {
    id: preset.id,
    ...rect,
  };
}

function buildCandidateTextRegions(metadata, regionPresets = DEFAULT_ECG_TEXT_REGION_PRESETS) {
  const { width, height } = getOrientedDimensions(metadata);
  if (!width || !height) return [];

  return regionPresets
    .map((preset) => buildRegionRectFromPreset(preset, width, height))
    .filter(Boolean);
}

function countPatternMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function getEcgTextUsabilityScore(text) {
  const normalized = normalizeRecognizedText(text);
  if (!normalized) return 0;

  let score = 0;
  for (const signal of POSITIVE_SIGNAL_WEIGHTS) {
    if (signal.pattern.test(normalized)) {
      score += signal.weight;
    }
  }

  for (const unit of UNIT_PATTERNS) {
    score += Math.min(countPatternMatches(normalized, unit.pattern), unit.cap) * unit.weight;
  }

  for (const signal of NEGATIVE_SIGNAL_WEIGHTS) {
    if (signal.pattern.test(normalized)) {
      score -= signal.weight;
    }
  }

  return score;
}

function containsIdentifierLikeText(text) {
  const normalized = normalizeRecognizedText(text);
  return IDENTIFIER_PATTERNS.some((pattern) => pattern.test(normalized));
}

async function preprocessEcgImageForOcr(inputBuffer, options = {}) {
  const image = sharp(inputBuffer, { limitInputPixels: false }).rotate();
  if (options.regionRect) {
    image.extract(options.regionRect);
  }

  const width = options.workingWidth ?? 0;

  if (width > 0 && width < OCR_TARGET_WIDTH) {
    image.resize({
      width: OCR_TARGET_WIDTH,
      fit: 'inside',
      withoutEnlargement: false,
    });
  }

  return image.grayscale().normalize().sharpen({ sigma: 1 }).png().toBuffer();
}

async function recognizeProcessedBufferWithWorker(processedBuffer) {
  const worker = await getOcrWorker();
  const {
    data: { text },
  } = await worker.recognize(processedBuffer);

  return normalizeRecognizedText(text);
}

export async function recognizeEcgTextFromImageBuffer(inputBuffer, options = {}) {
  const metadata = await sharp(inputBuffer, { limitInputPixels: false }).metadata();
  const candidateRegions = buildCandidateTextRegions(metadata, options.regionPresets);
  const recognizeProcessedBuffer =
    options.recognizeProcessedBuffer ?? recognizeProcessedBufferWithWorker;
  let bestCropCandidate = null;
  let identifierDetected = false;

  for (const region of candidateRegions) {
    try {
      const processedBuffer = await preprocessEcgImageForOcr(inputBuffer, {
        regionRect: region,
        workingWidth: region.width,
      });
      const text = normalizeRecognizedText(
        await recognizeProcessedBuffer(processedBuffer, {
          source: 'crop',
          regionId: region.id,
        })
      );
      identifierDetected ||= containsIdentifierLikeText(text);
      const score = getEcgTextUsabilityScore(text);
      const candidate = {
        text,
        source: 'crop',
        regionId: region.id,
        fallbackUsed: false,
        score,
        candidateCount: candidateRegions.length,
        identifierDetected,
      };

      if (!bestCropCandidate || candidate.score > bestCropCandidate.score) {
        bestCropCandidate = candidate;
      }
    } catch {
      // Continue to other candidate regions, then fall back to full-image OCR.
    }
  }

  if (bestCropCandidate && bestCropCandidate.score > 0) {
    bestCropCandidate.identifierDetected = identifierDetected;
    return bestCropCandidate;
  }

  const { width } = getOrientedDimensions(metadata);
  const processedBuffer = await preprocessEcgImageForOcr(inputBuffer, {
    workingWidth: width,
  });
  const text = normalizeRecognizedText(
    await recognizeProcessedBuffer(processedBuffer, {
      source: 'full-image',
      regionId: null,
    })
  );
  identifierDetected ||= containsIdentifierLikeText(text);

  return {
    text,
    source: 'full-image',
    regionId: null,
    fallbackUsed: candidateRegions.length > 0,
    score: getEcgTextUsabilityScore(text),
    candidateCount: candidateRegions.length,
    identifierDetected,
  };
}
