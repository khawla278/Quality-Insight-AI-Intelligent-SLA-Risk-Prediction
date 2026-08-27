from __future__ import annotations

import json
import logging
import math
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

import joblib
import numpy as np
import pandas as pd

from dotenv import load_dotenv
from groq import Groq

from fastapi import (
    FastAPI,
    HTTPException,
    Query,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger("sla-breach-api")


# ============================================================
# ENVIRONMENT - AI AGENT
# ============================================================

load_dotenv(
    Path(__file__).resolve().parent.parent / ".env"
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "llama-3.3-70b-versatile",
)

GROQ_CLIENT: Groq | None = None


def initialize_groq() -> None:
    global GROQ_CLIENT

    if not GROQ_API_KEY:
        GROQ_CLIENT = None

        logger.warning(
            "GROQ_API_KEY is not configured. "
            "AI Agent is unavailable."
        )

        return

    try:
        GROQ_CLIENT = Groq(
            api_key=GROQ_API_KEY
        )

        logger.info(
            "Groq AI Agent initialized successfully."
        )

        logger.info(
            "Groq model: %s",
            GROQ_MODEL,
        )

    except Exception as error:
        GROQ_CLIENT = None

        logger.exception(
            "Unable to initialize Groq: %s",
            error,
        )


# ============================================================
# DIRECTORIES
# ============================================================

APP_DIR = Path(__file__).resolve().parent
BASE_DIR = APP_DIR.parent
MODEL_DIR = BASE_DIR / "models"
STATIC_DIR = APP_DIR / "static"


# ============================================================
# MODEL FILES
# ============================================================

MODEL_PATH = (
    MODEL_DIR
    / "sla_breach_portable_v1.0.0.joblib"
)

METADATA_PATH = (
    MODEL_DIR
    / "sla_breach_portable_v1.0.0_meta.json"
)


# ============================================================
# IMAGE FILES
# ============================================================

CONFUSION_MATRIX_PATH = STATIC_DIR / "matrice.png"
ROC_CURVE_PATH = STATIC_DIR / "roc1.png"


# ============================================================
# GLOBAL VARIABLES
# ============================================================

MODEL: Any | None = None
METADATA: dict[str, Any] = {}


# ============================================================
# PYDANTIC MODELS
# ============================================================

class IncidentRequest(BaseModel):

    model_config = ConfigDict(
        extra="forbid"
    )

    incident_state: str = Field(
        ...,
        min_length=1,
    )

    category: str = Field(
        ...,
        min_length=1,
    )

    subcategory: str = Field(
        ...,
        min_length=1,
    )

    u_symptom: str = Field(
        ...,
        min_length=1,
    )

    assignment_group: str = Field(
        ...,
        min_length=1,
    )

    assigned_to: str = Field(
        ...,
        min_length=1,
    )

    impact: int = Field(
        ...,
        ge=1,
        le=5,
    )

    urgency: int = Field(
        ...,
        ge=1,
        le=5,
    )

    priority: int = Field(
        ...,
        ge=1,
        le=5,
    )

    opened_at: Any

    @field_validator(
        "incident_state",
        "category",
        "subcategory",
        "u_symptom",
        "assignment_group",
        "assigned_to",
    )
    @classmethod
    def validate_text(
        cls,
        value: str,
    ) -> str:

        value = value.strip()

        if not value:
            raise ValueError(
                "Value cannot be empty."
            )

        return value


class BatchPredictionRequest(BaseModel):

    model_config = ConfigDict(
        extra="forbid"
    )

    incidents: list[IncidentRequest] = Field(
        ...,
        min_length=1,
        max_length=1000,
    )


class GeneratedFeatures(BaseModel):

    open_month: int
    open_day: int
    open_dayofweek: int
    open_hour: int
    open_quarter: int
    open_is_weekend: int
    open_is_business_hours: int


class PredictionResponse(BaseModel):

    risk_level: Literal[
        "HIGH",
        "MEDIUM",
        "LOW",
    ]

    probability: float
    confidence: float
    threshold: float
    medium_threshold: float
    model_version: str
    sla_target_days: int

    prediction: Literal[
        "SLA_BREACH",
        "NO_SLA_BREACH",
    ]

    generated_features: GeneratedFeatures


class BatchPredictionItem(
    PredictionResponse
):

    index: int


class BatchPredictionResponse(BaseModel):

    count: int

    predictions: list[
        BatchPredictionItem
    ]

    model_version: str
    sla_target_days: int


class FeatureInfluenceItem(BaseModel):

    feature: str
    original_value: Any
    comparison_value: Any
    original_probability: float
    comparison_probability: float
    influence: float
    direction: str
    explanation: str


class PredictionExplanationResponse(BaseModel):

    prediction: PredictionResponse
    explanation_method: str
    warning: str

    most_influential_features: list[
        FeatureInfluenceItem
    ]


class GlobalFeatureImportanceItem(BaseModel):

    feature: str
    importance: float
    normalized_importance: float


class GlobalFeatureImportanceResponse(BaseModel):

    model_version: str
    importance_type: str
    feature_mapping_available: bool
    warning: str | None

    features: list[
        GlobalFeatureImportanceItem
    ]


# ============================================================
# AI AGENT REQUEST
# ============================================================

class AIAgentRequest(BaseModel):

    """
    Request compatible avec le JSON actuel du frontend.

    Les champs statistics et history sont optionnels afin de
    permettre au frontend d'envoyer les statistiques de
    l'application lorsqu'elles sont disponibles.
    """

    model_config = ConfigDict(
        extra="forbid"
    )

    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
    )

    risk_level: str = Field(
        default="UNKNOWN"
    )

    probability: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )

    prediction: str = Field(
        default=""
    )

    incident: dict[str, Any] = Field(
        default_factory=dict
    )

    influential_features: list[
        dict[str, Any]
    ] = Field(
        default_factory=list
    )

    # --------------------------------------------------------
    # OPTIONAL APPLICATION DATA
    # --------------------------------------------------------

    statistics: dict[str, Any] | None = None

    history: list[dict[str, Any]] | None = None


# ============================================================
# AI AGENT RESPONSE
# ============================================================

class AIAgentResponse(BaseModel):

    success: bool

    question: str

    risk_level: str

    probability: float

    prediction: str

    intent: str

    summary: str

    risk_analysis: str

    immediate_actions: list[str]

    preventive_actions: list[str]

    recommended_actions: list[str]

    monitoring_actions: list[str]

    priority: str

    expected_outcome: str

    llm_model: str

    generated_by: str


# ============================================================
# LOAD METADATA
# ============================================================

def load_metadata() -> dict[str, Any]:

    if not METADATA_PATH.exists():

        raise FileNotFoundError(
            f"Metadata file not found: "
            f"{METADATA_PATH}"
        )

    logger.info(
        "Loading metadata: %s",
        METADATA_PATH,
    )

    with open(
        METADATA_PATH,
        "r",
        encoding="utf-8",
    ) as file:

        data = json.load(file)

    if not isinstance(data, dict):

        raise ValueError(
            "Metadata JSON must contain "
            "a JSON object."
        )

    logger.info(
        "Metadata loaded successfully."
    )

    return data


# ============================================================
# LOAD MODEL
# ============================================================

def load_model() -> Any:

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            f"Model file not found: "
            f"{MODEL_PATH}"
        )

    logger.info(
        "Loading model: %s",
        MODEL_PATH,
    )

    model = joblib.load(
        MODEL_PATH
    )

    logger.info(
        "Model loaded successfully."
    )

    return model


# ============================================================
# LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(
    app: FastAPI,
):

    global MODEL
    global METADATA

    logger.info(
        "========================================"
    )

    logger.info(
        "STARTING SLA BREACH RISK API"
    )

    logger.info(
        "========================================"
    )

    try:

        METADATA = load_metadata()
        MODEL = load_model()

        initialize_groq()

        logger.info(
            "Model version: %s",
            METADATA.get("model_version"),
        )

        logger.info(
            "Model name: %s",
            METADATA.get("model_name"),
        )

        logger.info(
            "Model type: %s",
            METADATA.get("model_type"),
        )

        logger.info(
            "Confusion matrix exists: %s",
            CONFUSION_MATRIX_PATH.exists(),
        )

        logger.info(
            "ROC curve exists: %s",
            ROC_CURVE_PATH.exists(),
        )

        logger.info(
            "AI Agent available: %s",
            GROQ_CLIENT is not None,
        )

        logger.info(
            "API started successfully."
        )

    except Exception as error:

        logger.exception(
            "Startup error: %s",
            error,
        )

        MODEL = None
        METADATA = {}

    yield

    MODEL = None
    METADATA = {}

    logger.info(
        "API stopped."
    )


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="SLA Breach Risk API",
    description=(
        "AI API for predicting the probability "
        "of SLA breach for incidents."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost:4201",
        "http://127.0.0.1:4201",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# CHECK MODEL
# ============================================================

def check_model() -> None:

    if MODEL is None:

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,

            detail={
                "message": "Model is not loaded.",

                "model_path":
                    str(MODEL_PATH),

                "metadata_path":
                    str(METADATA_PATH),
            },
        )


# ============================================================
# THRESHOLDS
# ============================================================

def get_high_threshold() -> float:

    try:

        return float(
            METADATA.get(
                "threshold",
                0.68,
            )
        )

    except (
        TypeError,
        ValueError,
    ):

        return 0.68


def get_medium_threshold() -> float:

    try:

        return float(
            METADATA.get(
                "medium_threshold",
                0.35,
            )
        )

    except (
        TypeError,
        ValueError,
    ):

        return 0.35


# ============================================================
# DATE
# ============================================================

def parse_opened_at(
    value: Any,
):

    try:

        return pd.to_datetime(value)

    except Exception as error:

        raise ValueError(
            f"Invalid opened_at value: {value}"
        ) from error


# ============================================================
# GENERATED FEATURES
# ============================================================

def get_generated_features(
    opened_at: Any,
) -> dict[str, int]:

    date = parse_opened_at(opened_at)

    return {

        "open_month":
            int(date.month),

        "open_day":
            int(date.day),

        "open_dayofweek":
            int(date.dayofweek),

        "open_hour":
            int(date.hour),

        "open_quarter":
            int(date.quarter),

        "open_is_weekend":
            int(date.dayofweek >= 5),

        "open_is_business_hours":
            int(
                date.dayofweek < 5
                and 8 <= date.hour < 18
            ),
    }


# ============================================================
# INCIDENT TO DICTIONARY
# ============================================================

def incident_to_dict(
    incident: IncidentRequest,
) -> dict[str, Any]:

    generated = get_generated_features(
        incident.opened_at
    )

    return {

        "incident_state":
            incident.incident_state,

        "category":
            incident.category,

        "subcategory":
            incident.subcategory,

        "u_symptom":
            incident.u_symptom,

        "assignment_group":
            incident.assignment_group,

        "assigned_to":
            incident.assigned_to,

        "impact":
            incident.impact,

        "urgency":
            incident.urgency,

        "priority":
            incident.priority,

        **generated,
    }


# ============================================================
# DATAFRAME
# ============================================================

def build_dataframe(
    incidents: list[IncidentRequest],
) -> pd.DataFrame:

    categorical_features = METADATA.get(
        "categorical_features",
        [],
    )

    numerical_features = METADATA.get(
        "numerical_features",
        [],
    )

    expected_features = (
        categorical_features
        +
        numerical_features
    )

    if not expected_features:

        raise ValueError(
            "No model features found in metadata."
        )

    dataframe = pd.DataFrame(
        [
            incident_to_dict(incident)
            for incident in incidents
        ]
    )

    missing_features = [
        feature
        for feature in expected_features
        if feature not in dataframe.columns
    ]

    if missing_features:

        raise ValueError(
            "Missing model features: "
            + ", ".join(missing_features)
        )

    dataframe = dataframe[
        expected_features
    ].copy()

    for feature in categorical_features:

        dataframe[feature] = (
            dataframe[feature]
            .fillna("UNKNOWN")
            .astype(str)
        )

    for feature in numerical_features:

        dataframe[feature] = pd.to_numeric(
            dataframe[feature],
            errors="coerce",
        )

        if dataframe[feature].isna().any():

            raise ValueError(
                f"Invalid numerical feature: "
                f"{feature}"
            )

    return dataframe


# ============================================================
# PREDICT PROBABILITY
# ============================================================

def extract_positive_probability(
    dataframe: pd.DataFrame,
) -> np.ndarray:

    if MODEL is None:

        raise ValueError(
            "Model is not loaded."
        )

    if not hasattr(
        MODEL,
        "predict_proba",
    ):

        raise ValueError(
            "Model does not support predict_proba()."
        )

    probabilities = np.asarray(
        MODEL.predict_proba(dataframe),
        dtype=float,
    )

    if probabilities.ndim != 2:

        raise ValueError(
            "Invalid predict_proba output."
        )

    if probabilities.shape[1] == 1:

        result = probabilities[:, 0]

    else:

        classes = getattr(
            MODEL,
            "classes_",
            None,
        )

        if classes is None:

            result = probabilities[:, -1]

        else:

            positive_index = None

            for index, value in enumerate(classes):

                value_str = str(value).lower()

                if value_str in {
                    "1",
                    "true",
                    "sla_breach",
                    "breach",
                    "positive",
                }:

                    positive_index = index
                    break

            if positive_index is None:

                positive_index = (
                    probabilities.shape[1] - 1
                )

            result = probabilities[
                :,
                positive_index,
            ]

    return np.clip(
        result,
        0.0,
        1.0,
    )


# ============================================================
# RISK LEVEL
# ============================================================

def get_risk_level(
    probability: float,
) -> Literal[
    "HIGH",
    "MEDIUM",
    "LOW",
]:

    high = get_high_threshold()
    medium = get_medium_threshold()

    if probability >= high:
        return "HIGH"

    if probability >= medium:
        return "MEDIUM"

    return "LOW"


# ============================================================
# CREATE PREDICTION
# ============================================================

def create_prediction(
    incident: IncidentRequest,
    probability: float,
) -> PredictionResponse:

    high_threshold = get_high_threshold()
    medium_threshold = get_medium_threshold()

    prediction: Literal[
        "SLA_BREACH",
        "NO_SLA_BREACH",
    ]

    if probability >= high_threshold:

        prediction = "SLA_BREACH"

    else:

        prediction = "NO_SLA_BREACH"

    generated = get_generated_features(
        incident.opened_at
    )

    return PredictionResponse(

        risk_level=get_risk_level(
            probability
        ),

        probability=round(
            probability,
            6,
        ),

        confidence=round(
            max(
                probability,
                1.0 - probability,
            ),
            6,
        ),

        threshold=high_threshold,

        medium_threshold=medium_threshold,

        model_version=str(
            METADATA.get(
                "model_version",
                "unknown",
            )
        ),

        sla_target_days=int(
            METADATA.get(
                "sla_target_days",
                5,
            )
        ),

        prediction=prediction,

        generated_features=GeneratedFeatures(
            **generated
        ),
    )


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {

        "application":
            "SLA Breach Risk API",

        "version":
            "1.0.0",

        "status":
            "/health",

        "predict":
            "/predict",

        "explain":
            "/predict/explain",

        "batch":
            "/predict/batch",

        "features":
            "/features",

        "feature_importance":
            "/model/feature-importance",

        "confusion_matrix":
            "/model/confusion-matrix",

        "confusion_matrix_image":
            "/model/confusion-matrix/image",

        "roc_curve":
            "/model/roc-curve",

        "roc_curve_image":
            "/model/roc-curve/image",

        "ai_agent":
            "/ai-agent/solutions",

        "ai_agent_health":
            "/ai-agent/health",

        "docs":
            "/docs",
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    model_loaded = MODEL is not None
    metadata_loaded = bool(METADATA)

    if not metadata_loaded:

        return {

            "status":
                "unhealthy",

            "model_loaded":
                model_loaded,

            "metadata_loaded":
                False,

            "ai_agent_available":
                GROQ_CLIENT is not None,

            "ai_model":
                GROQ_MODEL,

            "message":
                "Metadata was not loaded.",

            "metadata_path":
                str(METADATA_PATH),
        }

    metrics = METADATA.get(
        "metrics",
        {},
    )

    if not isinstance(metrics, dict):
        metrics = {}

    risk_bands = METADATA.get(
        "risk_bands",
        {},
    )

    if not isinstance(risk_bands, dict):
        risk_bands = {}

    limitations = METADATA.get(
        "limitations",
        [],
    )

    if not isinstance(limitations, list):
        limitations = []

    categorical_features = METADATA.get(
        "categorical_features",
        [],
    )

    numerical_features = METADATA.get(
        "numerical_features",
        [],
    )

    return {

        "status":
            "healthy"
            if model_loaded
            else "unhealthy",

        "model_loaded":
            model_loaded,

        "metadata_loaded":
            metadata_loaded,

        "ai_agent_available":
            GROQ_CLIENT is not None,

        "ai_model":
            GROQ_MODEL,

        "model_version":
            METADATA.get("model_version"),

        "model_name":
            METADATA.get("model_name"),

        "model_type":
            METADATA.get("model_type"),

        "model_family":
            METADATA.get("model_family"),

        "model_description":
            METADATA.get("model_description"),

        "business_purpose":
            METADATA.get("business_purpose"),

        "target_name":
            METADATA.get("target_name"),

        "target_definition":
            METADATA.get("target_definition"),

        "positive_class":
            METADATA.get("positive_class"),

        "negative_class":
            METADATA.get("negative_class"),

        "exported_at":
            METADATA.get("exported_at"),

        "training_date":
            METADATA.get("training_date"),

        "python_version":
            METADATA.get("python_version"),

        "sklearn_version":
            METADATA.get("sklearn_version"),

        "lightgbm_version":
            METADATA.get("lightgbm_version"),

        "threshold":
            METADATA.get("threshold"),

        "medium_threshold":
            METADATA.get("medium_threshold"),

        "sla_target_days":
            METADATA.get("sla_target_days"),

        "training_iterations":
            METADATA.get("training_iterations"),

        "metrics":
            metrics,

        "categorical_features":
            categorical_features,

        "numerical_features":
            numerical_features,

        "risk_bands":
            risk_bands,

        "images": {

            "confusion_matrix":
                "/model/confusion-matrix/image",

            "roc_curve":
                "/model/roc-curve/image",
        },

        "image_files": {

            "confusion_matrix":
                CONFUSION_MATRIX_PATH.name,

            "roc_curve":
                ROC_CURVE_PATH.name,
        },

        "image_available": {

            "confusion_matrix":
                CONFUSION_MATRIX_PATH.exists(),

            "roc_curve":
                ROC_CURVE_PATH.exists(),
        },

        "limitations":
            limitations,
    }


# ============================================================
# DEBUG METADATA
# ============================================================

@app.get(
    "/debug/metadata",
    tags=["Debug"],
)
def debug_metadata():

    if not METADATA:

        raise HTTPException(
            status_code=503,

            detail={
                "message":
                    "Metadata is not loaded.",

                "metadata_path":
                    str(METADATA_PATH),
            },
        )

    return METADATA


# ============================================================
# FEATURES
# ============================================================

@app.get(
    "/features",
    tags=["Model"],
)
def get_features():

    check_model()

    return {

        "categorical_features":
            METADATA.get(
                "categorical_features",
                [],
            ),

        "numerical_features":
            METADATA.get(
                "numerical_features",
                [],
            ),

        "target_name":
            METADATA.get(
                "target_name"
            ),

        "target_definition":
            METADATA.get(
                "target_definition"
            ),
    }


# ============================================================
# PREDICT
# ============================================================

@app.post(
    "/predict",
    response_model=PredictionResponse,
    tags=["Prediction"],
)
def predict(
    incident: IncidentRequest,
):

    check_model()

    try:

        dataframe = build_dataframe(
            [incident]
        )

        probabilities = extract_positive_probability(
            dataframe
        )

        probability = float(
            probabilities[0]
        )

        if not math.isfinite(probability):

            raise ValueError(
                "Invalid prediction probability."
            )

        return create_prediction(
            incident,
            probability,
        )

    except HTTPException:
        raise

    except Exception as error:

        logger.exception(
            "Prediction error"
        )

        raise HTTPException(
            status_code=500,

            detail={
                "message":
                    "Prediction failed.",

                "error":
                    str(error),
            },
        )


# ============================================================
# BATCH PREDICTION
# ============================================================

@app.post(
    "/predict/batch",
    response_model=BatchPredictionResponse,
    tags=["Prediction"],
)
def predict_batch(
    request: BatchPredictionRequest,
):

    check_model()

    try:

        dataframe = build_dataframe(
            request.incidents
        )

        probabilities = extract_positive_probability(
            dataframe
        )

        predictions = []

        for index, probability in enumerate(
            probabilities
        ):

            result = create_prediction(
                request.incidents[index],
                float(probability),
            )

            predictions.append(
                BatchPredictionItem(
                    index=index,
                    **result.model_dump(),
                )
            )

        return BatchPredictionResponse(

            count=len(predictions),

            predictions=predictions,

            model_version=str(
                METADATA.get(
                    "model_version",
                    "unknown",
                )
            ),

            sla_target_days=int(
                METADATA.get(
                    "sla_target_days",
                    5,
                )
            ),
        )

    except HTTPException:
        raise

    except Exception as error:

        logger.exception(
            "Batch prediction error"
        )

        raise HTTPException(
            status_code=500,

            detail={
                "message":
                    "Batch prediction failed.",

                "error":
                    str(error),
            },
        )


# ============================================================
# COMPARISON VALUE
# ============================================================

def get_comparison_value(
    feature: str,
    current_value: Any,
) -> Any:

    categorical = set(
        METADATA.get(
            "categorical_features",
            [],
        )
    )

    if feature in categorical:
        return "UNKNOWN"

    comparison_values = {

        "impact": 1,
        "urgency": 1,
        "priority": 1,
        "open_month": 1,
        "open_day": 1,
        "open_dayofweek": 0,
        "open_hour": 12,
        "open_quarter": 1,
        "open_is_weekend": 0,
        "open_is_business_hours": 1,
    }

    return comparison_values.get(
        feature,
        current_value,
    )


# ============================================================
# LOCAL EXPLANATION
# ============================================================

def explain_locally(
    dataframe: pd.DataFrame,
    original_probability: float,
) -> list[FeatureInfluenceItem]:

    results = []

    for feature in dataframe.columns:

        original_value = dataframe.iloc[0][feature]

        comparison_value = get_comparison_value(
            feature,
            original_value,
        )

        modified = dataframe.copy()

        modified.loc[
            modified.index[0],
            feature,
        ] = comparison_value

        try:

            comparison_probability = float(
                extract_positive_probability(
                    modified
                )[0]
            )

            influence = (
                original_probability
                - comparison_probability
            )

            if influence > 0.000001:

                direction = "INCREASES_RISK"

                explanation = (
                    f"{feature} increases "
                    "the predicted SLA breach risk."
                )

            elif influence < -0.000001:

                direction = "DECREASES_RISK"

                explanation = (
                    f"{feature} decreases "
                    "the predicted SLA breach risk."
                )

            else:

                direction = "NEUTRAL"

                explanation = (
                    f"{feature} has limited influence."
                )

            results.append(
                FeatureInfluenceItem(

                    feature=feature,

                    original_value=str(
                        original_value
                    ),

                    comparison_value=str(
                        comparison_value
                    ),

                    original_probability=round(
                        original_probability,
                        6,
                    ),

                    comparison_probability=round(
                        comparison_probability,
                        6,
                    ),

                    influence=round(
                        influence,
                        6,
                    ),

                    direction=direction,

                    explanation=explanation,
                )
            )

        except Exception as error:

            logger.warning(
                "Explanation error for %s: %s",
                feature,
                error,
            )

    results.sort(
        key=lambda item: abs(item.influence),
        reverse=True,
    )

    return results


# ============================================================
# PREDICT + EXPLAIN
# ============================================================

@app.post(
    "/predict/explain",
    response_model=PredictionExplanationResponse,
    tags=["Explainability"],
)
def predict_explain(
    incident: IncidentRequest,

    top_n: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
):

    check_model()

    try:

        dataframe = build_dataframe(
            [incident]
        )

        probability = float(
            extract_positive_probability(
                dataframe
            )[0]
        )

        prediction = create_prediction(
            incident,
            probability,
        )

        explanations = explain_locally(
            dataframe,
            probability,
        )

        return PredictionExplanationResponse(

            prediction=prediction,

            explanation_method=
                "Local sensitivity analysis",

            warning=(
                "Local explanations indicate "
                "model sensitivity and do not "
                "constitute causal evidence."
            ),

            most_influential_features=
                explanations[:top_n],
        )

    except HTTPException:
        raise

    except Exception as error:

        logger.exception(
            "Explanation error"
        )

        raise HTTPException(
            status_code=500,

            detail={
                "message":
                    "Explanation failed.",

                "error":
                    str(error),
            },
        )


# ============================================================
# GET FINAL ESTIMATOR
# ============================================================

def get_final_estimator(
    model: Any,
) -> Any:

    if hasattr(model, "named_steps"):

        steps = list(
            model.named_steps.values()
        )

        if steps:
            return steps[-1]

    if hasattr(model, "steps"):

        steps = model.steps

        if steps:
            return steps[-1][1]

    return model


# ============================================================
# FEATURE IMPORTANCE
# ============================================================

@app.get(
    "/model/feature-importance",
    response_model=GlobalFeatureImportanceResponse,
    tags=["Explainability"],
)
def feature_importance(
    top_n: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
):

    check_model()

    estimator = get_final_estimator(MODEL)

    importance = getattr(
        estimator,
        "feature_importances_",
        None,
    )

    if importance is None:

        raise HTTPException(
            status_code=422,

            detail=(
                "The loaded model does not "
                "provide feature_importances_."
            ),
        )

    importance = np.asarray(
        importance,
        dtype=float,
    ).reshape(-1)

    feature_names = None

    if hasattr(MODEL, "named_steps"):

        steps = list(
            MODEL.named_steps.values()
        )

        if len(steps) >= 2:

            preprocessor = steps[-2]

            if hasattr(
                preprocessor,
                "get_feature_names_out",
            ):

                try:

                    feature_names = list(
                        preprocessor
                        .get_feature_names_out()
                    )

                except Exception:

                    feature_names = None

    if feature_names is None:

        feature_names = (
            METADATA.get(
                "categorical_features",
                [],
            )
            +
            METADATA.get(
                "numerical_features",
                [],
            )
        )

    if len(feature_names) != len(importance):

        feature_names = [
            f"feature_{index}"
            for index in range(len(importance))
        ]

    total_importance = float(
        np.sum(np.abs(importance))
    )

    results = []

    for name, value in zip(
        feature_names,
        importance,
    ):

        value_float = float(value)

        normalized = (
            abs(value_float)
            / total_importance
            if total_importance > 0
            else 0.0
        )

        results.append(
            GlobalFeatureImportanceItem(

                feature=str(name),

                importance=round(
                    abs(value_float),
                    6,
                ),

                normalized_importance=round(
                    normalized,
                    6,
                ),
            )
        )

    results.sort(
        key=lambda item: item.importance,
        reverse=True,
    )

    return GlobalFeatureImportanceResponse(

        model_version=str(
            METADATA.get(
                "model_version",
                "unknown",
            )
        ),

        importance_type=
            "LightGBM feature importance",

        feature_mapping_available=True,

        warning=None,

        features=results[:top_n],
    )


# ============================================================
# CONFUSION MATRIX IMAGE
# ============================================================

@app.get(
    "/model/confusion-matrix/image",
    tags=["Model Evaluation"],
)
def get_confusion_matrix_image():

    if not CONFUSION_MATRIX_PATH.exists():

        raise HTTPException(
            status_code=404,

            detail={
                "message":
                    "Confusion matrix image not found.",

                "path":
                    str(CONFUSION_MATRIX_PATH),
            },
        )

    return FileResponse(
        path=str(CONFUSION_MATRIX_PATH),
        media_type="image/png",
        filename="confusion_matrix.png",
    )


# ============================================================
# ROC IMAGE
# ============================================================

@app.get(
    "/model/roc-curve/image",
    tags=["Model Evaluation"],
)
def get_roc_curve_image():

    if not ROC_CURVE_PATH.exists():

        raise HTTPException(
            status_code=404,

            detail={
                "message":
                    "ROC curve image not found.",

                "path":
                    str(ROC_CURVE_PATH),
            },
        )

    return FileResponse(
        path=str(ROC_CURVE_PATH),
        media_type="image/png",
        filename="roc_curve.png",
    )


# ============================================================
# CONFUSION MATRIX INFO
# ============================================================

@app.get(
    "/model/confusion-matrix",
    tags=["Model Evaluation"],
)
def get_confusion_matrix():

    return {

        "name":
            "Confusion Matrix",

        "available":
            CONFUSION_MATRIX_PATH.exists(),

        "image_url":
            "/model/confusion-matrix/image",

        "file":
            CONFUSION_MATRIX_PATH.name,

        "description":
            "Confusion matrix of the "
            "SLA Breach Risk Classifier.",
    }


# ============================================================
# ROC CURVE INFO
# ============================================================

@app.get(
    "/model/roc-curve",
    tags=["Model Evaluation"],
)
def get_roc_curve():

    return {

        "name":
            "ROC Curve",

        "available":
            ROC_CURVE_PATH.exists(),

        "image_url":
            "/model/roc-curve/image",

        "file":
            ROC_CURVE_PATH.name,

        "description":
            "ROC curve of the "
            "SLA Breach Risk Classifier.",
    }


# ============================================================
# ============================================================
# QUALITY INSIGHT AI AGENT
# ============================================================
# ============================================================


# ============================================================
# NORMALIZE AI LIST
# ============================================================

def normalize_agent_list(
    value: Any,
) -> list[str]:

    if value is None:
        return []

    if isinstance(value, str):

        text = value.strip()

        if not text:
            return []

        return [text]

    if not isinstance(value, list):
        return []

    normalized: list[str] = []

    for item in value:

        if item is None:
            continue

        if isinstance(item, dict):

            text = (
                item.get("text")
                or item.get("action")
                or item.get("description")
                or item.get("title")
                or ""
            )

        else:

            text = str(item)

        text = str(text).strip()

        if text:
            normalized.append(text)

    return normalized


# ============================================================
# SAFE FLOAT
# ============================================================

def safe_probability(
    value: Any,
) -> float:

    if value is None:
        return 0.0

    if isinstance(value, str):

        value = value.strip()
        value = value.replace("%", "").strip()

    try:

        number = float(value)

    except (
        TypeError,
        ValueError,
    ):

        return 0.0

    if not math.isfinite(number):
        return 0.0

    # --------------------------------------------------------
    # Frontend may occasionally send 82.5 instead of 0.825.
    # Normalize it here.
    # --------------------------------------------------------

    if number > 1.0 and number <= 100.0:
        number = number / 100.0

    return max(
        0.0,
        min(
            1.0,
            number,
        ),
    )


# ============================================================
# FORMAT PROBABILITY
# ============================================================

def probability_to_percent(
    probability: float,
) -> float:

    probability = safe_probability(
        probability
    )

    return round(
        probability * 100.0,
        1,
    )


# ============================================================
# SAFE JSON
# ============================================================

def safe_json_value(
    value: Any,
) -> Any:

    if value is None:
        return None

    if isinstance(
        value,
        (
            str,
            int,
            float,
            bool,
        ),
    ):

        if isinstance(value, float):

            if not math.isfinite(value):
                return None

        return value

    if isinstance(value, dict):

        return {
            str(key):
                safe_json_value(item)
            for key, item in value.items()
        }

    if isinstance(value, list):

        return [
            safe_json_value(item)
            for item in value
        ]

    return str(value)


# ============================================================
# QUALITY INSIGHT AI AGENT
# ============================================================

import json
import logging
from typing import Any

from fastapi import HTTPException, status


logger = logging.getLogger(__name__)


# ============================================================
# BUILD AI AGENT CONTEXT
# ============================================================

def build_agent_context(
    request: AIAgentRequest,
) -> dict[str, Any]:

    probability = safe_probability(
        request.probability
    )

    probability_percent = round(
        probability * 100.0,
        2,
    )

    incident = (
        request.incident
        if isinstance(request.incident, dict)
        else {}
    )

    influential_features = (
        request.influential_features
        if isinstance(request.influential_features, list)
        else []
    )

    statistics = (
        request.statistics
        if isinstance(request.statistics, dict)
        else {}
    )

    history = (
        request.history
        if isinstance(request.history, list)
        else []
    )

    return {

        # ======================================================
        # CURRENT PREDICTION
        # ======================================================

        "current_prediction": {

            "risk_level": str(
                request.risk_level or "UNKNOWN"
            ).strip().upper(),

            "prediction": str(
                request.prediction or "UNKNOWN"
            ).strip().upper(),

            "probability": round(
                probability,
                6,
            ),

            "probability_percent":
                probability_percent,
        },

        # ======================================================
        # INCIDENT
        # ======================================================

        "incident":
            safe_json_value(incident),

        # ======================================================
        # MODEL SIGNALS
        # ======================================================

        "influential_features":
            safe_json_value(
                influential_features
            ),

        # ======================================================
        # APPLICATION STATISTICS
        # ======================================================

        "statistics":
            safe_json_value(
                statistics
            ),

        # ======================================================
        # HISTORY
        # ======================================================

        "history":
            safe_json_value(
                history
            ),

        # ======================================================
        # MODEL INFORMATION
        # ======================================================

        "model": {

            "model_version":
                METADATA.get(
                    "model_version",
                    "unknown",
                ),

            "model_name":
                METADATA.get(
                    "model_name",
                    "SLA Breach Risk Classifier",
                ),

            "model_type":
                METADATA.get(
                    "model_type",
                    "unknown",
                ),

            "high_threshold":
                get_high_threshold(),

            "medium_threshold":
                get_medium_threshold(),
        },

        # ======================================================
        # SLA
        # ======================================================

        "sla": {

            "target_days":
                METADATA.get(
                    "sla_target_days",
                    5,
                ),

            "business_start_hour":
                METADATA.get(
                    "business_start_hour",
                    8,
                ),

            "business_end_hour":
                METADATA.get(
                    "business_end_hour",
                    18,
                ),
        },
    }


# ============================================================
# SYSTEM PROMPT
# ============================================================

AI_AGENT_SYSTEM_PROMPT = """
You are QUALITY INSIGHT AI.

You are the intelligent AI assistant integrated into the
Quality Insight AI application.

Your role is to answer ANY question that is relevant to
the Quality Insight AI domain.

============================================================
DOMAIN
============================================================

You can answer questions about:

- IT incident management
- incident prioritization
- service quality
- SLA management
- SLA breach prevention
- SLA breach risk
- incident escalation
- incident monitoring
- incident resolution
- incident ownership
- incident investigation
- corrective actions
- preventive actions
- root cause analysis
- risk reduction
- operational monitoring
- non-conformance management
- quality management
- prediction interpretation
- HIGH / MEDIUM / LOW risk
- prediction probabilities
- application statistics
- historical predictions
- model signals
- operational recommendations
- continuous improvement

Do NOT restrict yourself to a predefined list of questions.

If the user asks a new question that is clearly related to
the Quality Insight AI domain, answer it normally.

============================================================
LANGUAGE
============================================================

Always answer in the SAME LANGUAGE as the user's question.

English question -> English answer.

French question -> French answer.

Arabic question -> Arabic answer when possible.

Do not translate the user's question unless necessary.

============================================================
GENERAL KNOWLEDGE
============================================================

You may answer conceptual and professional questions using
your general knowledge.

Examples:

"How can incident prioritization improve service quality?"

"What are the benefits of proactive SLA monitoring?"

"How can we reduce HIGH-risk incidents?"

"What is root cause analysis?"

"Why is incident ownership important?"

"What actions can prevent SLA breaches?"

These questions do NOT require application statistics.

Provide a useful professional answer.

============================================================
APPLICATION DATA
============================================================

The CONTEXT contains data from the Quality Insight AI
application.

Use application data when the user asks about:

- current prediction
- latest prediction
- prediction probability
- HIGH count
- MEDIUM count
- LOW count
- total predictions
- prediction percentages
- prediction history
- latest HIGH prediction
- model information
- current incident
- influential features
- SLA configuration

Never invent application data.

If requested application data is not present in CONTEXT,
say that the requested application data is not available.

============================================================
STATISTICS
============================================================

When statistics are present in CONTEXT, use the exact values.

Never invent:

- total predictions
- HIGH count
- MEDIUM count
- LOW count
- percentages
- average probability
- maximum probability
- minimum probability

Do not calculate historical statistics from a single
current prediction.

============================================================
ML PREDICTION
============================================================

The ML prediction is authoritative.

Never change:

- risk_level
- prediction
- probability

The AI explains the prediction.

Probability represents estimated risk.

For example:

82.5% means the model estimates an 82.5% probability of
SLA breach.

Never describe probability as certainty.

Do NOT say:

"The incident will definitely breach SLA."

Say:

"The model estimates a high risk of SLA breach."

============================================================
RISK LEVELS
============================================================

HIGH:

- prioritize immediately
- verify ownership
- investigate quickly
- identify blockers
- verify dependencies
- monitor SLA closely
- accelerate corrective action
- escalate when appropriate

MEDIUM:

- monitor proactively
- verify ownership
- identify blockers
- review priority
- intervene before risk increases

LOW:

- continue normal monitoring
- maintain ownership
- follow standard controls
- avoid unnecessary escalation

============================================================
INFLUENTIAL FEATURES
============================================================

Influential features are model signals.

They are NOT proof of causality.

Never say:

"Feature X caused the incident."

Say:

"Feature X influenced the model prediction."

============================================================
SLA
============================================================

Use the SLA duration supplied in CONTEXT.

Never invent an SLA duration.

If the SLA duration is unavailable, explain the concept
without inventing a specific duration.

============================================================
QUESTION ANSWERING
============================================================

Answer the EXACT question.

Do not respond with a generic fallback when the question is
within the Quality Insight AI domain.

For example, if the user asks:

"How can incident prioritization improve service quality?"

Give a direct explanation such as:

- critical incidents are addressed first
- customer impact is reduced
- response resources are allocated efficiently
- SLA breaches can be prevented
- resolution times can improve
- service availability and reliability can improve

Do not say that application statistics are unavailable
unless the user explicitly asks for statistics.

============================================================
GREETING
============================================================

For greetings:

intent = "greeting"

summary = natural greeting

All action arrays should be empty.

priority = "NORMAL"

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

No Markdown.

No ```json.

Use exactly this structure:

{
    "intent": "general",
    "summary": "",
    "risk_analysis": "",
    "immediate_actions": [],
    "preventive_actions": [],
    "recommended_actions": [],
    "monitoring_actions": [],
    "priority": "NORMAL",
    "expected_outcome": ""
}

Allowed intents:

greeting
general
sla
risk
incident
recommendation
explanation

Allowed priorities:

LOW
NORMAL
MEDIUM
HIGH
CRITICAL

============================================================
FINAL RULE
============================================================

Be precise.

Be professional.

Be useful.

Answer domain questions freely.

Do not require the question to match predefined phrases.

Never invent application data.

Never modify ML results.

Never invent statistics.
"""


# ============================================================
# CLEAN AI JSON
# ============================================================

def clean_ai_json_response(
    content: str,
) -> str:

    if not content:
        raise ValueError(
            "AI Agent returned an empty response."
        )

    cleaned = str(content).strip()

    # Remove markdown fences if the model adds them.
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:].strip()

    elif cleaned.startswith("```"):
        cleaned = cleaned[3:].strip()

    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()

    # Extract JSON object if additional text exists.
    first = cleaned.find("{")
    last = cleaned.rfind("}")

    if first >= 0 and last > first:
        cleaned = cleaned[first:last + 1]

    return cleaned


# ============================================================
# VALIDATE AI RESULT
# ============================================================

def validate_agent_result(
    result: Any,
) -> dict[str, Any]:

    if not isinstance(result, dict):
        raise ValueError(
            "AI response must be a JSON object."
        )

    allowed_intents = {
        "greeting",
        "general",
        "sla",
        "risk",
        "incident",
        "recommendation",
        "explanation",
    }

    allowed_priorities = {
        "LOW",
        "NORMAL",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

    intent = str(
        result.get("intent", "general")
        or "general"
    ).strip().lower()

    if intent not in allowed_intents:
        intent = "general"

    priority = str(
        result.get("priority", "NORMAL")
        or "NORMAL"
    ).strip().upper()

    if priority not in allowed_priorities:
        priority = "NORMAL"

    return {

        "intent":
            intent,

        "summary":
            str(
                result.get("summary", "")
                or ""
            ).strip(),

        "risk_analysis":
            str(
                result.get("risk_analysis", "")
                or ""
            ).strip(),

        "immediate_actions":
            normalize_agent_list(
                result.get(
                    "immediate_actions",
                    [],
                )
            ),

        "preventive_actions":
            normalize_agent_list(
                result.get(
                    "preventive_actions",
                    [],
                )
            ),

        "recommended_actions":
            normalize_agent_list(
                result.get(
                    "recommended_actions",
                    [],
                )
            ),

        "monitoring_actions":
            normalize_agent_list(
                result.get(
                    "monitoring_actions",
                    [],
                )
            ),

        "priority":
            priority,

        "expected_outcome":
            str(
                result.get(
                    "expected_outcome",
                    "",
                )
                or ""
            ).strip(),
    }


# ============================================================
# CALL GROQ
# ============================================================

def call_ai_agent(
    question: str,
    context: dict[str, Any],
) -> dict[str, Any]:

    if GROQ_CLIENT is None:

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "message":
                    "AI Agent is not configured.",

                "hint":
                    "Configure GROQ_API_KEY in the backend .env file.",
            },
        )

    question = str(
        question or ""
    ).strip()

    if not question:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message":
                    "The question cannot be empty."
            },
        )

    # Convert context ONLY here.
    context_json = json.dumps(
        context,
        ensure_ascii=False,
        indent=2,
        default=str,
    )

    user_prompt = f"""
USER QUESTION:
{question}

QUALITY INSIGHT AI APPLICATION CONTEXT:
{context_json}

IMPORTANT:

Answer the user's exact question.

If it is a conceptual Quality Insight AI question,
answer it using professional knowledge.

If it asks for application data, use only the values
present in the application context.

Never invent application statistics.

Return ONLY valid JSON matching the required structure.
"""

    try:

        response = (
            GROQ_CLIENT
            .chat
            .completions
            .create(
                model=GROQ_MODEL,

                messages=[
                    {
                        "role": "system",
                        "content":
                            AI_AGENT_SYSTEM_PROMPT,
                    },
                    {
                        "role": "user",
                        "content":
                            user_prompt,
                    },
                ],

                temperature=0.3,

                max_tokens=1600,

                response_format={
                    "type": "json_object"
                },
            )
        )

        if not response:
            raise RuntimeError(
                "Empty response from Groq."
            )

        if not response.choices:
            raise RuntimeError(
                "Groq returned no choices."
            )

        message = response.choices[0].message

        content = getattr(
            message,
            "content",
            None,
        )

        if not content:
            raise RuntimeError(
                "Groq returned empty content."
            )

        cleaned = clean_ai_json_response(
            content
        )

        result = json.loads(cleaned)

        return validate_agent_result(
            result
        )

    except HTTPException:
        raise

    except json.JSONDecodeError as exc:

        logger.exception(
            "Invalid JSON returned by AI Agent: %s",
            exc,
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message":
                    "The AI service returned invalid JSON.",

                "error":
                    str(exc),
            },
        ) from exc

    except Exception as exc:

        logger.exception(
            "Groq AI Agent failed: %s",
            exc,
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message":
                    "The AI service failed to process the question.",

                "error":
                    str(exc),

                "model":
                    GROQ_MODEL,
            },
        ) from exc


# ============================================================
# AI AGENT SOLUTIONS
# ============================================================

@app.post(
    "/ai-agent/solutions",
    response_model=AIAgentResponse,
    tags=["AI Agent"],
)
def ai_agent_solutions(
    request: AIAgentRequest,
) -> AIAgentResponse:

    question = str(
        request.question or ""
    ).strip()

    if not question:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message":
                    "The question cannot be empty."
            },
        )

    logger.info(
        "AI Agent request | question=%s | risk=%s | "
        "prediction=%s | probability=%s",
        question,
        request.risk_level,
        request.prediction,
        request.probability,
    )

    # --------------------------------------------------------
    # NORMALIZE CURRENT PREDICTION
    # --------------------------------------------------------

    probability = round(
        safe_probability(
            request.probability
        ),
        6,
    )

    probability_percent = round(
        probability * 100.0,
        2,
    )

    risk_level = str(
        request.risk_level or "UNKNOWN"
    ).strip().upper()

    prediction = str(
        request.prediction or "UNKNOWN"
    ).strip().upper()

    # --------------------------------------------------------
    # AI CONFIGURATION
    # --------------------------------------------------------

    if GROQ_CLIENT is None:

        logger.error(
            "GROQ_CLIENT is None."
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "message":
                    "The AI service is not configured.",

                "provider":
                    "Groq",

                "model":
                    GROQ_MODEL,

                "hint":
                    "Set GROQ_API_KEY in .env and restart FastAPI.",
            },
        )

    # --------------------------------------------------------
    # BUILD CONTEXT
    # --------------------------------------------------------

    try:

        context = build_agent_context(
            request
        )

        context["current_request"] = {

            "question":
                question,

            "risk_level":
                risk_level,

            "prediction":
                prediction,

            "probability":
                probability,

            "probability_percent":
                probability_percent,
        }

    except Exception as exc:

        logger.exception(
            "Context creation failed: %s",
            exc,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message":
                    "Unable to build AI context.",

                "error":
                    str(exc),
            },
        ) from exc

    # --------------------------------------------------------
    # CALL AI
    # --------------------------------------------------------

    result = call_ai_agent(
        question=question,
        context=context,
    )

    # --------------------------------------------------------
    # NORMALIZE RESULT
    # --------------------------------------------------------

    intent = str(
        result.get(
            "intent",
            "general",
        )
        or "general"
    ).strip().lower()

    summary = str(
        result.get(
            "summary",
            "",
        )
        or ""
    ).strip()

    risk_analysis = str(
        result.get(
            "risk_analysis",
            "",
        )
        or ""
    ).strip()

    immediate_actions = normalize_agent_list(
        result.get(
            "immediate_actions",
            [],
        )
    )

    preventive_actions = normalize_agent_list(
        result.get(
            "preventive_actions",
            [],
        )
    )

    recommended_actions = normalize_agent_list(
        result.get(
            "recommended_actions",
            [],
        )
    )

    monitoring_actions = normalize_agent_list(
        result.get(
            "monitoring_actions",
            [],
        )
    )

    priority = str(
        result.get(
            "priority",
            "NORMAL",
        )
        or "NORMAL"
    ).strip().upper()

    if priority not in {
        "LOW",
        "NORMAL",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }:
        priority = "NORMAL"

    expected_outcome = str(
        result.get(
            "expected_outcome",
            "",
        )
        or ""
    ).strip()

    if not summary:

        summary = (
            risk_analysis
            or "Quality Insight AI analyzed the question."
        )

    logger.info(
        "AI Agent success | intent=%s | priority=%s | model=%s",
        intent,
        priority,
        GROQ_MODEL,
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return AIAgentResponse(

        success=True,

        question=question,

        risk_level=risk_level,

        probability=probability,

        prediction=prediction,

        intent=intent,

        summary=summary,

        risk_analysis=risk_analysis,

        immediate_actions=
            immediate_actions,

        preventive_actions=
            preventive_actions,

        recommended_actions=
            recommended_actions,

        monitoring_actions=
            monitoring_actions,

        priority=priority,

        expected_outcome=
            expected_outcome,

        llm_model=
            GROQ_MODEL,

        generated_by=
            "Quality Insight AI",
    )


# ============================================================
# AI AGENT HEALTH
# ============================================================

@app.get(
    "/ai-agent/health",
    tags=["AI Agent"],
)
def ai_agent_health() -> dict[str, Any]:

    available = (
        GROQ_CLIENT is not None
    )

    return {

        "available":
            available,

        "status":
            "ready"
            if available
            else "not_configured",

        "provider":
            "Groq",

        "model":
            GROQ_MODEL,

        "service":
            "Quality Insight AI",

        "supports_free_form_questions":
            True,

        "supports_domain_questions":
            True,

        "ml_prediction_authoritative":
            True,

        "statistics_from_application_only":
            True,

        "specialization": [

            "IT Incident Management",
            "Incident Prioritization",
            "SLA Management",
            "SLA Breach Risk",
            "SLA Breach Prevention",
            "Service Quality",
            "Risk Prediction",
            "Risk Reduction",
            "Corrective Actions",
            "Preventive Actions",
            "Root Cause Analysis",
            "Incident Monitoring",
            "Incident Escalation",
            "Non-Conformance Management",
            "Quality Improvement",
            "Operational Monitoring",
        ],

        "capabilities": [

            "Natural Language Conversation",
            "Free-Form Domain Questions",
            "Risk Explanation",
            "Prediction Interpretation",
            "Application Statistics",
            "Incident Analysis",
            "Incident Prioritization",
            "SLA Recommendations",
            "Risk Reduction",
            "Preventive Actions",
            "Corrective Actions",
            "Root Cause Analysis",
            "Operational Recommendations",
        ],
    }