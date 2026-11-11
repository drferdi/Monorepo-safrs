// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Data Ascension System (DAS) - Type Definitions
 *
 * Core type definitions for the AI-powered form field mapping system.
 *
 * @module lib/scraper/adaptive/types
 */

// ============================================================================
// FIELD TYPES
// ============================================================================

/**
 * Supported form field types
 */
export type FieldType =
  'text' | 'number' | 'select' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'time' | 'hidden';

// ============================================================================
// FIELD ATTRIBUTES
// ============================================================================

/**
 * Extracted HTML attributes from a form field
 */
export interface FieldAttributes {
  /** Field name attribute */
  name: string | null;
  /** Field id attribute */
  id: string | null;
  /** Placeholder text */
  placeholder: string | null;
  /** ARIA label for accessibility */
  ariaLabel: string | null;
  /** CSS class names */
  className: string;
  /** Whether field is required */
  required: boolean;
  /** Whether field is disabled */
  disabled: boolean;
  /** Whether field is readonly */
  readonly: boolean;
  /** Current field value */
  value: string;
}

// ============================================================================
// FIELD CONTEXT
// ============================================================================

/**
 * Contextual information about a field's surroundings
 */
export interface FieldContext {
  /** Parent form ID if exists */
  formId: string | null;
  /** Nearest section header text */
  sectionHeader: string | null;
  /** Labels found near this field */
  siblingLabels: string[];
  /** Parent element class names (for grouping) */
  parentClasses: string[];
}

// ============================================================================
// FIELD POSITION
// ============================================================================

/**
 * Visual position and visibility of a field
 */
export interface FieldPosition {
  /** X coordinate from viewport */
  x: number;
  /** Y coordinate from viewport */
  y: number;
  /** Field width in pixels */
  width: number;
  /** Field height in pixels */
  height: number;
  /** Whether field is visible in viewport */
  isVisible: boolean;
}

// ============================================================================
// FIELD SIGNATURE
// ============================================================================

/**
 * Complete signature of a form field for AI mapping
 *
 * This is the primary data structure used by DAS to represent
 * a form field and its context for intelligent mapping.
 */
export interface FieldSignature {
  /** Unique identifier for this field (generated) */
  id: string;
  /** Tag name of the element (input, select, textarea) */
  tagName: string;
  /** Computed unique CSS selector for this field */
  selector: string;
  /** Classified field type */
  fieldType: FieldType;
  /** Extracted HTML attributes */
  attributes: FieldAttributes;
  /** Associated label text (from <label> or aria-label) */
  label: string | null;
  /** Contextual information */
  context: FieldContext;
  /** Visual position data */
  position: FieldPosition;
}

// ============================================================================
// SCAN RESULT
// ============================================================================

/**
 * Result of scanning a page for form fields
 */
export interface ScanResult {
  /** Array of detected field signatures */
  fields: FieldSignature[];
  /** URL of the scanned page */
  pageUrl: string;
  /** Title of the scanned page */
  pageTitle: string;
  /** Timestamp when scan was performed */
  timestamp: number;
  /** Number of forms found on page */
  formCount: number;
  /** Duration of scan in milliseconds */
  scanDuration: number;
}

// ============================================================================
// SCAN OPTIONS
// ============================================================================

/**
 * Options for customizing field scanning behavior
 */
export interface ScanOptions {
  /** Include hidden fields in results (default: false) */
  includeHidden?: boolean;
  /** Include disabled fields in results (default: true) */
  includeDisabled?: boolean;
  /** Maximum DOM traversal depth (default: 10) */
  maxDepth?: number;
  /** Specific form selector to scan (default: all forms) */
  formSelector?: string;
  /** Include fields outside of forms (default: true) */
  includeOrphanFields?: boolean;
}

// ============================================================================
// CLINICAL FIELD CLASSIFICATION (for safety)
// ============================================================================

/**
 * Clinical field categories for safety validation
 * Fields in these categories require extra caution during AI mapping
 */
export type ClinicalFieldCategory =
  | 'vital_signs' // BP, HR, RR, Temp, SpO2
  | 'medication' // Drug name, dosage, route
  | 'allergy' // Allergy information
  | 'patient_id' // RM number, BPJS
  | 'diagnosis' // ICD codes
  | 'general'; // Non-critical fields

/**
 * Mapping hints for AI semantic mapper
 */
export interface FieldMappingHint {
  /** Suggested clinical category */
  category: ClinicalFieldCategory;
  /** Confidence level for this hint (0-1) */
  confidence: number;
  /** Reasoning for the classification */
  reasoning: string;
}

// ============================================================================
// PHASE 2: SEMANTIC MAPPER TYPES
// ============================================================================

/**
 * Page types supported by DAS
 */
export type PageType = 'anamnesa' | 'resep' | 'soap' | 'diagnosa' | 'unknown';

/**
 * Context for AI mapping decisions
 */
export interface MappingContext {
  /** Type of medical form */
  pageType: PageType;
  /** Patient age (affects clinical context) */
  patientAge?: number;
  /** Active medical conditions/tags */
  medicalContext?: string[];
  /** Page URL for cache key */
  pageUrl?: string;
}

/**
 * Request to map payload data to form fields
 */
export interface MappingRequest {
  /** Data to fill into form */
  payload: Record<string, unknown>;
  /** Detected form fields */
  fields: FieldSignature[];
  /** Clinical context */
  context: MappingContext;
}

/**
 * Single field mapping result
 */
export interface FieldMapping {
  /** Key from payload data */
  payloadKey: string;
  /** Target form field */
  targetField: FieldSignature;
  /** AI confidence score (0.0 - 1.0) */
  confidence: number;
  /** AI reasoning for this mapping */
  reasoning: string;
  /** Fill action to take */
  action: MappingAction;
}

/**
 * Action to take for a mapping based on confidence
 */
export type MappingAction =
  | 'AUTO_FILL' // >= 0.95 confidence
  | 'CAUTIOUS_FILL' // 0.80 - 0.95 confidence (fill + flag)
  | 'HUMAN_REQUIRED'; // < 0.80 confidence (show dialog)

/**
 * Complete mapping result from semantic mapper
 */
export interface MappingResult {
  /** Successful field mappings */
  mappings: FieldMapping[];
  /** Payload keys without field match */
  unmapped: string[];
  /** Safety warnings */
  warnings: string[];
  /** Whether result came from cache */
  fromCache: boolean;
  /** Total processing time in ms */
  latencyMs: number;
}

/**
 * Options for semantic mapper
 */
export interface MapperOptions {
  /** Force AI mapping even if cached (default: false) */
  bypassCache?: boolean;
  /** Minimum confidence threshold (default: 0.80) */
  minConfidence?: number;
  /** Include unmapped fields in result (default: true) */
  includeUnmapped?: boolean;
  /** Page type override */
  pageType?: PageType;
}

// ============================================================================
// PHASE 2: CACHE TYPES
// ============================================================================

/**
 * Cache entry for successful mappings
 */
export interface MappingCacheEntry {
  /** Hash of page + form structure */
  pageHash: string;
  /** Page type for this entry */
  pageType: PageType;
  /** Cached field mappings */
  mappings: Array<{
    payloadKey: string;
    fieldSelector: string;
    confidence: number;
  }>;
  /** When entry was created */
  timestamp: number;
  /** Success rate from feedback (0-1) */
  successRate: number;
  /** Number of times cache was hit */
  hitCount: number;
  /** When entry expires */
  expiresAt: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total entries in cache */
  totalEntries: number;
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Oldest entry timestamp */
  oldestEntry: number;
  /** Storage used in bytes */
  storageUsed: number;
}

// ============================================================================
// PHASE 2: VALIDATION TYPES
// ============================================================================

/**
 * Result of safety validation
 */
export interface ValidationResult {
  /** Whether all mappings passed validation */
  isValid: boolean;
  /** Mappings that passed */
  approved: FieldMapping[];
  /** Mappings requiring human review */
  needsReview: FieldMapping[];
  /** Mappings blocked by safety rules */
  blocked: FieldMapping[];
  /** Validation warnings */
  warnings: string[];
}

/**
 * Confidence thresholds for safety decisions
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Auto-fill without confirmation */
  AUTO_FILL: 0.95,
  /** Fill but flag for review */
  CAUTIOUS_FILL: 0.8,
  /** Require human confirmation */
  HUMAN_REQUIRED: 0,
} as const;

// ============================================================================
// PHASE 3: LEARNING FEEDBACK LOOP TYPES
// ============================================================================

/**
 * Outcome of a fill attempt
 */
export type FillOutcome =
  | 'success' // Fill completed without issues
  | 'auto_corrected' // User manually corrected the fill
  | 'failed' // Fill failed (element not found, etc.)
  | 'rejected' // User rejected the mapping
  | 'timeout'; // No interaction within threshold

/**
 * Single learning entry for feedback tracking
 */
export interface LearningEntry {
  /** Unique ID for this entry */
  id: string;
  /** Page type where mapping occurred */
  pageType: PageType;
  /** Page URL hash for grouping */
  pageHash: string;
  /** Payload key that was mapped */
  payloadKey: string;
  /** Target field selector */
  fieldSelector: string;
  /** Original AI confidence */
  confidence: number;
  /** Fill outcome */
  outcome: FillOutcome;
  /** Time from fill to user interaction (ms) */
  interactionTime: number | null;
  /** User's corrected value (if auto_corrected) */
  correctedValue: string | null;
  /** Timestamp of the fill attempt */
  timestamp: number;
  /** Session ID for grouping related fills */
  sessionId: string;
}

/**
 * Aggregated statistics for a specific mapping
 */
export interface MappingStats {
  /** Payload key */
  payloadKey: string;
  /** Field selector */
  fieldSelector: string;
  /** Total attempts */
  totalAttempts: number;
  /** Successful fills */
  successCount: number;
  /** Auto-corrected fills */
  correctedCount: number;
  /** Failed fills */
  failedCount: number;
  /** Calculated success rate */
  successRate: number;
  /** Average confidence */
  avgConfidence: number;
  /** First recorded attempt */
  firstSeen: number;
  /** Last recorded attempt */
  lastSeen: number;
}

/**
 * Criteria for cache promotion
 */
export interface PromotionCriteria {
  /** Minimum confidence score */
  minConfidence: number;
  /** Minimum success rate */
  minSuccessRate: number;
  /** Minimum number of attempts */
  minAttempts: number;
  /** Minimum time since first success (stability check) */
  minStabilityPeriod: number;
}

/**
 * Default promotion criteria
 */
export const DEFAULT_PROMOTION_CRITERIA: PromotionCriteria = {
  minConfidence: 0.95,
  minSuccessRate: 0.95,
  minAttempts: 5,
  minStabilityPeriod: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Learning store configuration
 */
export interface LearningStoreConfig {
  /** IndexedDB database name */
  dbName: string;
  /** Database version */
  dbVersion: number;
  /** Maximum entries to retain */
  maxEntries: number;
  /** Entry retention period (ms) */
  retentionPeriod: number;
  /** Promotion criteria */
  promotionCriteria: PromotionCriteria;
}

/**
 * Default learning store configuration
 */
export const DEFAULT_LEARNING_CONFIG: LearningStoreConfig = {
  dbName: 'DASLearningStore',
  dbVersion: 1,
  maxEntries: 10000,
  retentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
  promotionCriteria: DEFAULT_PROMOTION_CRITERIA,
};

/**
 * Learning analytics summary
 */
export interface LearningAnalytics {
  /** Total learning entries */
  totalEntries: number;
  /** Entries by outcome */
  byOutcome: Record<FillOutcome, number>;
  /** Entries by page type */
  byPageType: Record<PageType, number>;
  /** Overall success rate */
  overallSuccessRate: number;
  /** Mappings eligible for promotion */
  promotionCandidates: number;
  /** Database size estimate (bytes) */
  estimatedSize: number;
  /** Oldest entry timestamp */
  oldestEntry: number;
  /** Newest entry timestamp */
  newestEntry: number;
}
