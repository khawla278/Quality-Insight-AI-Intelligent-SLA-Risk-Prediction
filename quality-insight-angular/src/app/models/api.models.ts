// ============================================================
// RISK
// ============================================================

export type RiskLevel =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW';


// ============================================================
// PREDICTION
// ============================================================

export type PredictionDecision =
  | 'SLA_BREACH'
  | 'NO_SLA_BREACH';

export type PredictionLabel =
  PredictionDecision;


// ============================================================
// INFLUENCE
// ============================================================

export type InfluenceDirection =
  | 'INCREASES_RISK'
  | 'DECREASES_RISK'
  | 'NEUTRAL'
  | 'NOT_AVAILABLE';


// ============================================================
// INCIDENT REQUEST
// IMPORTANT:
// title est local/optionnel.
// Le Dashboard ne l'envoie pas au backend.
// ============================================================

export interface IncidentRequest {

  incident_state: string;

  category: string;

  subcategory: string;

  u_symptom: string;

  assignment_group: string;

  assigned_to: string;

  impact: number;

  urgency: number;

  priority: number;

  opened_at: string;

  title?: string;
}


// ============================================================
// GENERATED FEATURES
// ============================================================

export interface GeneratedFeatures {

  open_month: number;

  open_day: number;

  open_dayofweek: number;

  open_hour: number;

  open_quarter: number;

  open_is_weekend: number;

  open_is_business_hours: number;
}


// ============================================================
// PREDICTION RESPONSE
// ============================================================

export interface PredictionResponse {

  risk_level: RiskLevel;

  probability: number;

  confidence: number;

  threshold: number;

  medium_threshold: number;

  model_version: string;

  sla_target_days: number;

  prediction: PredictionDecision;

  generated_features: GeneratedFeatures;
}


// ============================================================
// INFLUENCE
// ============================================================

export interface Influence {

  feature: string;

  original_value: unknown;

  comparison_value: unknown;

  original_probability: number;

  comparison_probability: number;

  influence: number;

  direction: InfluenceDirection;

  explanation: string;
}


export type PredictionInfluence = Influence;

export type FeatureInfluenceItem = Influence;


// ============================================================
// EXPLANATION
// ============================================================

export interface ExplanationResponse {

  prediction: PredictionResponse;

  explanation_method: string;

  warning: string;

  most_influential_features: Influence[];
}


// ============================================================
// IMPORTANCE
// ============================================================

export interface ImportanceItem {

  feature: string;

  importance: number;

  normalized_importance: number;
}


export type GlobalFeatureImportanceItem =
  ImportanceItem;


export interface ImportanceResponse {

  model_version: string;

  importance_type: string;

  feature_mapping_available: boolean;

  warning: string | null;

  features: ImportanceItem[];
}


// ============================================================
// FEATURES
// ============================================================

export interface FeaturesResponse {

  input_features: string[];

  automatically_generated_features: string[];

  model_features: string[];

  target_definition: string;

  important_note: string;
}


// ============================================================
// METRICS
// ============================================================

export interface EvaluationMetrics {

  accuracy?: number | null;

  precision?: number | null;

  recall?: number | null;

  f1_score?: number | null;

  roc_auc?: number | null;

  log_loss?: number | null;

  test_samples?: number | null;
}


// ============================================================
// RUNTIME
// ============================================================

export interface RuntimeInformation {

  python_version?: string;

  fastapi_version?: string;

  uvicorn_version?: string;

  sklearn_installed_version?: string;

  lightgbm_installed_version?: string;

  operating_system?: string;
}


// ============================================================
// HEALTH
// ============================================================

export interface HealthResponse {

  status:
    | 'healthy'
    | 'unhealthy';

  backend_online?: boolean;

  model_loaded: boolean;

  load_error?: string | null;

  model_version?: string | null;

  model_type?: string | null;

  exported_at?: string | null;

  training_date?: string | null;

  sklearn_version?: string | null;

  lightgbm_version?: string | null;

  sklearn_training_version?: string | null;

  lightgbm_training_version?: string | null;

  threshold?: number | null;

  medium_threshold?: number | null;

  sla_target_days: number;

  training_samples?: number | null;

  categorical_features_count?: number;

  numerical_features_count?: number;

  total_features_count?: number;

  categorical_features?: string[];

  numerical_features?: string[];

  model_path?: string;

  metadata_path?: string;

  metrics?: EvaluationMetrics;

  runtime?: RuntimeInformation;

  models?: {
    it_incident: {
      loaded: boolean;
      name?: string | null;
      version?: string | null;
    };
    crossrail_ncr: {
      loaded: boolean;
      name?: string | null;
      version?: string | null;
      threshold?: number | null;
      metrics?: Record<string, number>;
      load_error?: string | null;
    };
  };
}


// ============================================================
// PREDICTION HISTORY
// ============================================================

export interface HistoryItem {

  risk: RiskLevel;

  probability: number;

  date: string;

  title?: string;

  drivers: Influence[];

  input?: IncidentRequest;
}


// ============================================================
// NC STATE
// ============================================================

export type NCState =
  | 'RAISED'
  | 'ASSIGNED'
  | 'UNDER_INVESTIGATION'
  | 'CORRECTIVE_ACTION'
  | 'CLOSED'
  | 'REJECTED';


// ============================================================
// NC SOURCE
// ============================================================

export type NonConformanceSource =
  | 'DASHBOARD'
  | 'MANUAL';


// ============================================================
// NON-CONFORMANCE
// ============================================================

export interface NonConformanceRecord {

  ref: string;

  title: string;

  category: string;

  assignment_group: string;

  state: NCState;

  risk: RiskLevel;

  probability: number;

  raised: string;

  source: NonConformanceSource;

  input?: IncidentRequest;

  prediction?: PredictionResponse;
}


// ============================================================
// BATCH
// ============================================================

export interface BatchPredictionItem
  extends PredictionResponse {

  index: number;
}


export interface BatchPredictionResponse {

  count: number;

  predictions: BatchPredictionItem[];

  model_version: string;

  sla_target_days: number;
}


// ============================================================
// CROSSRAIL NCR MODEL
// ============================================================

export interface CrossrailNcrRequest {

  ticketing_system: 'Crossrail NCR';
  title: string;
  site_area: string;
  type: string;
  organisation: string;
  organisation_code: string;
  project_area: string;
  category: string;
  discipline: string;
  root_cause: string;
  proposed_disposition: string;
  estimated_cost_of_ncr: number;
  date_initiated: string;
  required_close_out_date: string;
}

export interface CrossrailNcrPrediction {

  probability: number;
  prediction: 'LATE_CLOSE_OUT' | 'ON_TIME_CLOSE_OUT';
  risk_level: RiskLevel;
  threshold: number;
  model_name: string;
  model_version: string;
}

export interface CrossrailModelInfo {
  project: string;
  champion_model: string;
  threshold: number;
  outer_test_metrics: Record<string, number>;
  required_input_fields: Record<string, string>;
  expected_assets: Record<string, string>;
  asset_urls: Record<string, string>;
  asset_available?: Record<string, boolean>;
  asset_directory: string;
}

export interface CrossrailNcrTicket extends CrossrailNcrRequest {

  ref: string;
  created_at: string;
  prediction?: CrossrailNcrPrediction;
}
