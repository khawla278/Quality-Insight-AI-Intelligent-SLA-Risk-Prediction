from __future__ import annotations

import json
import logging
import math
import os
import sys
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
    "llama-3.3-70b-versatile"
)

GROQ_CLIENT: Groq | None = None

if GROQ_API_KEY:
    try:
        GROQ_CLIENT = Groq(api_key=GROQ_API_KEY)
        logger = logging.getLogger("sla-breach-api")
    except Exception as error:
        GROQ_CLIENT = None



# ============================================================
# DIRECTORIES
# ============================================================

# C:/stage api/app
APP_DIR = Path(__file__).resolve().parent

# C:/stage api
BASE_DIR = APP_DIR.parent

# C:/stage api/models
MODEL_DIR = BASE_DIR / "models"

# C:/stage api/app/static
STATIC_DIR = APP_DIR / "static"


# ============================================================
# MODEL FILES
# ============================================================

MODEL_PATH = (
    MODEL_DIR /
    "sla_breach_portable_v1.0.0.joblib"
)

METADATA_PATH = (
    MODEL_DIR /
    "sla_breach_portable_v1.0.0_meta.json"
)

# Crossrail NCR model.  It is intentionally kept separate from the IT
# incident model so that one unavailable artifact does not take the other
# predictor offline.
NCR_MODEL_PATH = MODEL_DIR / "crossrail_ncr_predictor.joblib"
NCR_METADATA_PATH = MODEL_DIR / "model_metadata.json"
NCR_ASSET_DIR = STATIC_DIR / "crossrail"

# This is the exact source-column name saved in the training artifact.  The
# API exposes the much clearer `proposed_disposition` field and maps it here.
NCR_DISPOSITION_COLUMN = (
    "NCR Classification,_x000D_\n\teB_Proposed_Disposition "
    "AS [Proposed_Disposition"
)


# ============================================================
# IMAGE FILES
# ============================================================

CONFUSION_MATRIX_PATH = (
    STATIC_DIR /
    "matrice de confusion .png"
)

ROC_CURVE_PATH = (
    STATIC_DIR /
    "roc.png"
)


# ============================================================
# GLOBAL VARIABLES
# ============================================================

MODEL: Any | None = None

METADATA: dict[str, Any] = {}
NCR_MODEL: dict[str, Any] | None = None
NCR_METADATA: dict[str, Any] = {}
NCR_LOAD_ERROR: str | None = None


# ============================================================
# PYDANTIC MODELS
# ============================================================

class IncidentRequest(BaseModel):

    model_config = ConfigDict(
        extra="forbid"
    )

    incident_state: str = Field(
        ...,
        min_length=1
    )

    category: str = Field(
        ...,
        min_length=1
    )

    subcategory: str = Field(
        ...,
        min_length=1
    )

    u_symptom: str = Field(
        ...,
        min_length=1
    )

    assignment_group: str = Field(
        ...,
        min_length=1
    )

    assigned_to: str = Field(
        ...,
        min_length=1
    )

    impact: int = Field(
        ...,
        ge=1,
        le=5
    )

    urgency: int = Field(
        ...,
        ge=1,
        le=5
    )

    priority: int = Field(
        ...,
        ge=1,
        le=5
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
        value: str
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


class CrossrailNcrRequest(BaseModel):
    """The user-facing fields for the Crossrail late-close-out model."""

    model_config = ConfigDict(extra="forbid")

    ticketing_system: Literal["Crossrail NCR"]
    title: str = Field(..., min_length=1)  # retained for ticket context; not model input
    site_area: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    organisation: str = Field(..., min_length=1)
    organisation_code: str = ""
    project_area: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    discipline: str = Field(..., min_length=1)
    root_cause: str = Field(..., min_length=1)
    proposed_disposition: str = Field(..., min_length=1)
    estimated_cost_of_ncr: float = Field(..., ge=0)
    date_initiated: Any
    required_close_out_date: Any


class CrossrailNcrPrediction(BaseModel):
    probability: float
    prediction: Literal["LATE_CLOSE_OUT", "ON_TIME_CLOSE_OUT"]
    risk_level: Literal["HIGH", "MEDIUM", "LOW"]
    threshold: float
    model_name: str
    model_version: str


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
        "LOW"
    ]

    probability: float

    confidence: float

    threshold: float

    medium_threshold: float

    model_version: str

    sla_target_days: int

    prediction: Literal[
        "SLA_BREACH",
        "NO_SLA_BREACH"
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

    model_config = ConfigDict(
        extra="forbid"
    )

    question: str = Field(
        ...,
        min_length=1,
        max_length=2000
    )

    risk_level: str = Field(
        default="UNKNOWN"
    )

    probability: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0
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
        METADATA_PATH
    )

    with open(
        METADATA_PATH,
        "r",
        encoding="utf-8"
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

    logger.info(
        "Metadata keys: %s",
        list(data.keys())
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
        MODEL_PATH
    )

    model = joblib.load(
        MODEL_PATH
    )

    logger.info(
        "Model loaded successfully."
    )

    return model


def load_ncr_metadata() -> dict[str, Any]:
    if not NCR_METADATA_PATH.exists():
        raise FileNotFoundError(f"NCR metadata file not found: {NCR_METADATA_PATH}")
    with open(NCR_METADATA_PATH, "r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError("NCR metadata JSON must contain a JSON object.")
    return data


def load_ncr_model() -> dict[str, Any]:
    """Load the portable NCR artifact and its custom transformer module."""
    if not NCR_MODEL_PATH.exists():
        raise FileNotFoundError(f"NCR model file not found: {NCR_MODEL_PATH}")

    # joblib stores NCRFeatureEngineer as ncr_preprocessing.NCRFeatureEngineer.
    # Adding MODEL_DIR makes that module importable during unpickling.
    model_dir_string = str(MODEL_DIR)
    if model_dir_string not in sys.path:
        sys.path.insert(0, model_dir_string)
    __import__("ncr_preprocessing")

    artifact = joblib.load(NCR_MODEL_PATH)
    required = {"model", "feature_engineer", "threshold"}
    if not isinstance(artifact, dict) or not required.issubset(artifact):
        raise ValueError("Invalid NCR artifact: required ensemble fields are missing.")
    return artifact


# ============================================================
# LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(
    app: FastAPI
):

    global MODEL
    global METADATA
    global NCR_MODEL
    global NCR_METADATA
    global NCR_LOAD_ERROR

    logger.info(
        "========================================"
    )

    logger.info(
        "STARTING SLA BREACH RISK API"
    )

    logger.info(
        "========================================"
    )

    logger.info(
        "MODEL PATH: %s",
        MODEL_PATH
    )

    logger.info(
        "METADATA PATH: %s",
        METADATA_PATH
    )

    logger.info(
        "STATIC DIR: %s",
        STATIC_DIR
    )

    try:

        METADATA = load_metadata()

        MODEL = load_model()

        logger.info(
            "Model version: %s",
            METADATA.get(
                "model_version"
            )
        )

        logger.info(
            "Model name: %s",
            METADATA.get(
                "model_name"
            )
        )

        logger.info(
            "Model type: %s",
            METADATA.get(
                "model_type"
            )
        )

        logger.info(
            "Confusion matrix exists: %s",
            CONFUSION_MATRIX_PATH.exists()
        )

        logger.info(
            "ROC curve exists: %s",
            ROC_CURVE_PATH.exists()
        )

        logger.info(
            "API started successfully."
        )

    except Exception as error:

        logger.exception(
            "Startup error: %s",
            error
        )

        MODEL = None
        METADATA = {}

    try:
        NCR_METADATA = load_ncr_metadata()
        NCR_MODEL = load_ncr_model()
        NCR_LOAD_ERROR = None
        logger.info("Crossrail NCR model loaded successfully.")
    except Exception as error:
        logger.exception("Crossrail NCR startup error: %s", error)
        NCR_MODEL = None
        NCR_METADATA = {}
        NCR_LOAD_ERROR = str(error)

    yield

    MODEL = None
    METADATA = {}
    NCR_MODEL = None
    NCR_METADATA = {}
    NCR_LOAD_ERROR = None

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
                "message":
                    "Model is not loaded.",

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
                0.68
            )
        )

    except (
        TypeError,
        ValueError
    ):

        return 0.68


def get_medium_threshold() -> float:

    try:

        return float(
            METADATA.get(
                "medium_threshold",
                0.35
            )
        )

    except (
        TypeError,
        ValueError
    ):

        return 0.35


# ============================================================
# DATE
# ============================================================

def parse_opened_at(
    value: Any
):

    try:

        return pd.to_datetime(
            value
        )

    except Exception as error:

        raise ValueError(
            f"Invalid opened_at value: {value}"
        ) from error


# ============================================================
# GENERATED FEATURES
# ============================================================

def get_generated_features(
    opened_at: Any
) -> dict[str, int]:

    date = parse_opened_at(
        opened_at
    )

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
            int(
                date.dayofweek >= 5
            ),

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
    incident: IncidentRequest
) -> dict[str, Any]:

    generated = (
        get_generated_features(
            incident.opened_at
        )
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
    incidents: list[IncidentRequest]
) -> pd.DataFrame:

    categorical_features = (
        METADATA.get(
            "categorical_features",
            []
        )
    )

    numerical_features = (
        METADATA.get(
            "numerical_features",
            []
        )
    )

    expected_features = (
        categorical_features
        +
        numerical_features
    )

    if not expected_features:

        raise ValueError(
            "No model features found "
            "in metadata."
        )

    dataframe = pd.DataFrame(
        [
            incident_to_dict(
                incident
            )
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
            + ", ".join(
                missing_features
            )
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
            errors="coerce"
        )

        if dataframe[
            feature
        ].isna().any():

            raise ValueError(
                f"Invalid numerical feature: "
                f"{feature}"
            )

    return dataframe


# ============================================================
# PREDICT PROBABILITY
# ============================================================

def extract_positive_probability(
    dataframe: pd.DataFrame
) -> np.ndarray:

    if MODEL is None:

        raise ValueError(
            "Model is not loaded."
        )

    if not hasattr(
        MODEL,
        "predict_proba"
    ):

        raise ValueError(
            "Model does not support "
            "predict_proba()."
        )

    probabilities = np.asarray(
        MODEL.predict_proba(
            dataframe
        ),
        dtype=float
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
            None
        )

        if classes is None:

            result = probabilities[:, -1]

        else:

            positive_index = None

            for index, value in enumerate(
                classes
            ):

                value_str = str(
                    value
                ).lower()

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
                positive_index
            ]

    result = np.clip(
        result,
        0.0,
        1.0
    )

    return result


# ============================================================
# RISK LEVEL
# ============================================================

def get_risk_level(
    probability: float
) -> Literal[
    "HIGH",
    "MEDIUM",
    "LOW"
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
    probability: float
) -> PredictionResponse:

    high_threshold = (
        get_high_threshold()
    )

    medium_threshold = (
        get_medium_threshold()
    )

    prediction: Literal[
        "SLA_BREACH",
        "NO_SLA_BREACH"
    ]

    if probability >= high_threshold:

        prediction = "SLA_BREACH"

    else:

        prediction = "NO_SLA_BREACH"

    generated = (
        get_generated_features(
            incident.opened_at
        )
    )

    return PredictionResponse(

        risk_level=
            get_risk_level(
                probability
            ),

        probability=
            round(
                probability,
                6
            ),

        confidence=
            round(
                max(
                    probability,
                    1.0 - probability
                ),
                6
            ),

        threshold=
            high_threshold,

        medium_threshold=
            medium_threshold,

        model_version=
            str(
                METADATA.get(
                    "model_version",
                    "unknown"
                )
            ),

        sla_target_days=
            int(
                METADATA.get(
                    "sla_target_days",
                    5
                )
            ),

        prediction=
            prediction,

        generated_features=
            GeneratedFeatures(
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

        "crossrail_ncr_predict":
            "/crossrail/predict",

        "crossrail_ncr_model":
            "/crossrail/model",

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

    model_loaded = (
        MODEL is not None
    )

    metadata_loaded = bool(
        METADATA
    )

    if not metadata_loaded:

        return {

            "status":
                "unhealthy",

            "model_loaded":
                model_loaded,

            "metadata_loaded":
                False,

            "message":
                "Metadata was not loaded.",

            "metadata_path":
                str(
                    METADATA_PATH
                ),
        }

    metrics = METADATA.get(
        "metrics",
        {}
    )

    if not isinstance(
        metrics,
        dict
    ):

        metrics = {}

    risk_bands = METADATA.get(
        "risk_bands",
        {}
    )

    if not isinstance(
        risk_bands,
        dict
    ):

        risk_bands = {}

    limitations = METADATA.get(
        "limitations",
        []
    )

    if not isinstance(
        limitations,
        list
    ):

        limitations = []

    categorical_features = (
        METADATA.get(
            "categorical_features",
            []
        )
    )

    numerical_features = (
        METADATA.get(
            "numerical_features",
            []
        )
    )

    # ========================================================
    # IMPORTANT :
    # NE PAS AJOUTER :
    #
    # "metadata": METADATA
    #
    # Sinon le JSON est répété une deuxième fois.
    # ========================================================

    return {

        "status":
            "healthy"
            if model_loaded
            else "unhealthy",

        "model_loaded":
            model_loaded,

        "models": {
            "it_incident": {
                "loaded": model_loaded,
                "name": METADATA.get("model_name"),
                "version": METADATA.get("model_version"),
            },
            "crossrail_ncr": {
                "loaded": NCR_MODEL is not None,
                "name": NCR_METADATA.get("champion_model"),
                "version": "1.0.0" if NCR_MODEL is not None else None,
                "threshold": NCR_METADATA.get("threshold"),
                "metrics": NCR_METADATA.get("outer_test_metrics", {}),
                "load_error": NCR_LOAD_ERROR,
            },
        },

        "metadata_loaded":
            metadata_loaded,

        "ai_agent_available":
            GROQ_CLIENT is not None,

        "model_version":
            METADATA.get(
                "model_version"
            ),

        "model_name":
            METADATA.get(
                "model_name"
            ),

        "model_type":
            METADATA.get(
                "model_type"
            ),

        "model_family":
            METADATA.get(
                "model_family"
            ),

        "model_description":
            METADATA.get(
                "model_description"
            ),

        "business_purpose":
            METADATA.get(
                "business_purpose"
            ),

        "target_name":
            METADATA.get(
                "target_name"
            ),

        "target_definition":
            METADATA.get(
                "target_definition"
            ),

        "positive_class":
            METADATA.get(
                "positive_class"
            ),

        "negative_class":
            METADATA.get(
                "negative_class"
            ),

        "exported_at":
            METADATA.get(
                "exported_at"
            ),

        "training_date":
            METADATA.get(
                "training_date"
            ),

        "python_version":
            METADATA.get(
                "python_version"
            ),

        "sklearn_version":
            METADATA.get(
                "sklearn_version"
            ),

        "lightgbm_version":
            METADATA.get(
                "lightgbm_version"
            ),

        "threshold":
            METADATA.get(
                "threshold"
            ),

        "medium_threshold":
            METADATA.get(
                "medium_threshold"
            ),

        "sla_target_days":
            METADATA.get(
                "sla_target_days"
            ),

        "training_iterations":
            METADATA.get(
                "training_iterations"
            ),

        "metrics":
            metrics,

        "categorical_features":
            categorical_features,

        "numerical_features":
            numerical_features,

        "risk_bands":
            risk_bands,

        # ====================================================
        # IMAGE URLS
        # ====================================================

        "images": {

            "confusion_matrix":
                "/model/confusion-matrix/image",

            "roc_curve":
                "/model/roc-curve/image",
        },

        # ====================================================
        # IMAGE FILE NAMES
        # ====================================================

        "image_files": {

            "confusion_matrix":
                CONFUSION_MATRIX_PATH.name,

            "roc_curve":
                ROC_CURVE_PATH.name,
        },

        # ====================================================
        # IMAGE AVAILABILITY
        # ====================================================

        "image_available": {

            "confusion_matrix":
                CONFUSION_MATRIX_PATH.exists(),

            "roc_curve":
                ROC_CURVE_PATH.exists(),
        },

        # ====================================================
        # LIMITATIONS
        # ====================================================

        "limitations":
            limitations,
    }


# ============================================================
# DEBUG METADATA
# ============================================================

@app.get(
    "/debug/metadata",
    tags=["Debug"]
)
def debug_metadata():

    if not METADATA:

        raise HTTPException(
            status_code=503,

            detail={
                "message":
                    "Metadata is not loaded.",

                "metadata_path":
                    str(
                        METADATA_PATH
                    ),
            },
        )

    # Ici on retourne le JSON original
    # uniquement pour le DEBUG.
    # Il n'est PAS intégré dans /health.

    return METADATA


# ============================================================
# FEATURES
# ============================================================

@app.get(
    "/features",
    tags=["Model"]
)
def get_features():

    check_model()

    return {

        "categorical_features":
            METADATA.get(
                "categorical_features",
                []
            ),

        "numerical_features":
            METADATA.get(
                "numerical_features",
                []
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
    tags=["Prediction"]
)
def predict(
    incident: IncidentRequest
):

    check_model()

    try:

        dataframe = build_dataframe(
            [incident]
        )

        probabilities = (
            extract_positive_probability(
                dataframe
            )
        )

        probability = float(
            probabilities[0]
        )

        if not math.isfinite(
            probability
        ):

            raise ValueError(
                "Invalid prediction probability."
            )

        return create_prediction(
            incident,
            probability
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
    tags=["Prediction"]
)
def predict_batch(
    request: BatchPredictionRequest
):

    check_model()

    try:

        dataframe = build_dataframe(
            request.incidents
        )

        probabilities = (
            extract_positive_probability(
                dataframe
            )
        )

        predictions = []

        for index, probability in enumerate(
            probabilities
        ):

            result = create_prediction(
                request.incidents[index],
                float(
                    probability
                )
            )

            predictions.append(
                BatchPredictionItem(
                    index=index,
                    **result.model_dump()
                )
            )

        return BatchPredictionResponse(

            count=len(
                predictions
            ),

            predictions=
                predictions,

            model_version=
                str(
                    METADATA.get(
                        "model_version",
                        "unknown"
                    )
                ),

            sla_target_days=
                int(
                    METADATA.get(
                        "sla_target_days",
                        5
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
# CROSSRAIL NCR PREDICTION
# ============================================================

def check_ncr_model() -> dict[str, Any]:
    if NCR_MODEL is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "message": "Crossrail NCR model is not loaded.",
                "model_path": str(NCR_MODEL_PATH),
                "metadata_path": str(NCR_METADATA_PATH),
                "load_error": NCR_LOAD_ERROR,
            },
        )
    return NCR_MODEL


def build_ncr_dataframe(request: CrossrailNcrRequest) -> pd.DataFrame:
    """Map API field names to the columns used when the NCR model was trained."""
    initiated = pd.to_datetime(request.date_initiated, errors="coerce")
    due = pd.to_datetime(request.required_close_out_date, errors="coerce")
    if pd.isna(initiated) or pd.isna(due):
        raise ValueError("date_initiated and required_close_out_date must be valid dates.")
    if due < initiated:
        raise ValueError("required_close_out_date cannot be before date_initiated.")

    return pd.DataFrame([{
        "Date Initiated": initiated,
        "Required Close Out Date": due,
        "Organisation": request.organisation.strip(),
        "Organisation Code": request.organisation_code.strip(),
        "Discipline": request.discipline.strip(),
        "Category": request.category.strip(),
        "Project Area": request.project_area.strip(),
        "Site Area": request.site_area.strip(),
        "Root Cause": request.root_cause.strip(),
        "Estimated_Cost_of_NCR": request.estimated_cost_of_ncr,
        NCR_DISPOSITION_COLUMN: request.proposed_disposition.strip(),
        "Type": request.type.strip(),
    }])


def ncr_positive_probability(artifact: dict[str, Any], dataframe: pd.DataFrame) -> float:
    """Run all three saved ensemble components and apply their saved weights."""
    transformed = artifact["feature_engineer"].transform(dataframe)
    ensemble = artifact["model"]
    models = ensemble.get("models", {})
    weights = ensemble.get("weights", [])
    model_names = ensemble.get("model_names", [])
    if not isinstance(models, dict) or len(weights) != len(model_names):
        raise ValueError("Invalid NCR ensemble configuration.")

    probabilities: list[float] = []
    for name in model_names:
        estimator = models.get(name)
        if estimator is None or not hasattr(estimator, "predict_proba"):
            raise ValueError(f"NCR ensemble component is invalid: {name}")

        # CatBoost's standalone artifact needs its categorical feature indexes
        # supplied again at inference; sklearn pipelines carry this internally.
        if estimator.__class__.__module__.startswith("catboost"):
            from catboost import Pool
            features = list(estimator.feature_names_)
            model_input = Pool(
                transformed[features],
                cat_features=estimator.get_cat_feature_indices(),
            )
        else:
            model_input = transformed

        value = float(np.asarray(estimator.predict_proba(model_input), dtype=float)[0, 1])
        probabilities.append(value)

    probability = float(np.average(probabilities, weights=np.asarray(weights, dtype=float)))
    if not math.isfinite(probability):
        raise ValueError("Invalid NCR prediction probability.")
    return float(np.clip(probability, 0.0, 1.0))


@app.post(
    "/crossrail/predict",
    response_model=CrossrailNcrPrediction,
    tags=["Crossrail NCR"],
)
def crossrail_predict(request: CrossrailNcrRequest):
    artifact = check_ncr_model()
    try:
        probability = ncr_positive_probability(artifact, build_ncr_dataframe(request))
        threshold = float(artifact["threshold"])
        # The NCR model has a binary operating threshold.  Medium is a useful
        # early-warning band below that decision threshold.
        risk_level: Literal["HIGH", "MEDIUM", "LOW"]
        if probability >= threshold:
            risk_level = "HIGH"
        elif probability >= threshold * 0.65:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        return CrossrailNcrPrediction(
            probability=round(probability, 6),
            prediction="LATE_CLOSE_OUT" if probability >= threshold else "ON_TIME_CLOSE_OUT",
            risk_level=risk_level,
            threshold=threshold,
            model_name=str(NCR_METADATA.get("champion_model", artifact.get("champion", "NCR ensemble"))),
            model_version="1.0.0",
        )
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Crossrail NCR prediction error")
        raise HTTPException(status_code=500, detail={"message": "Crossrail NCR prediction failed.", "error": str(error)})


@app.get("/crossrail/model", tags=["Crossrail NCR"])
def crossrail_model_info():
    artifact = check_ncr_model()
    return {
        **NCR_METADATA,
        "loaded": True,
        "threshold": artifact["threshold"],
        "prediction_definition": artifact.get("prediction_definition"),
        "prediction_point": artifact.get("prediction_point"),
        "asset_directory": str(NCR_ASSET_DIR),
        "expected_assets": {
            "confusion_matrix": "crossrail_confusion_matrix.png",
            "roc_curve": "crossrail_roc_curve.png",
            "feature_importance": "crossrail_feature_importance.png",
            "shap_summary": "crossrail_shap_summary.png",
        },
        "asset_urls": {
            name: f"/crossrail/assets/{filename}"
            for name, filename in {
                "confusion_matrix": "crossrail_confusion_matrix.png",
                "roc_curve": "crossrail_roc_curve.png",
                "feature_importance": "crossrail_feature_importance.png",
                "shap_summary": "crossrail_shap_summary.png",
            }.items()
        },
        "asset_available": {
            filename: (NCR_ASSET_DIR / filename).is_file()
            for filename in {
                "crossrail_confusion_matrix.png",
                "crossrail_roc_curve.png",
                "crossrail_feature_importance.png",
                "crossrail_shap_summary.png",
            }
        },
    }


@app.get("/crossrail/assets/{filename}", tags=["Crossrail NCR"])
def crossrail_model_asset(filename: str):
    allowed = {
        "crossrail_confusion_matrix.png",
        "crossrail_roc_curve.png",
        "crossrail_feature_importance.png",
        "crossrail_shap_summary.png",
    }
    if filename not in allowed:
        raise HTTPException(status_code=404, detail="Unknown Crossrail model asset.")
    path = NCR_ASSET_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"Asset not found. Add it to: {NCR_ASSET_DIR}")
    return FileResponse(path, media_type="image/png", filename=filename)


# ============================================================
# COMPARISON VALUE
# ============================================================

def get_comparison_value(
    feature: str,
    current_value: Any
) -> Any:

    categorical = set(
        METADATA.get(
            "categorical_features",
            []
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
        current_value
    )


# ============================================================
# LOCAL EXPLANATION
# ============================================================

def explain_locally(
    dataframe: pd.DataFrame,
    original_probability: float
) -> list[FeatureInfluenceItem]:

    results = []

    for feature in dataframe.columns:

        original_value = (
            dataframe.iloc[0][feature]
        )

        comparison_value = (
            get_comparison_value(
                feature,
                original_value
            )
        )

        modified = dataframe.copy()

        modified.loc[
            modified.index[0],
            feature
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

                direction = (
                    "INCREASES_RISK"
                )

                explanation = (
                    f"{feature} increases "
                    "the predicted SLA breach risk."
                )

            elif influence < -0.000001:

                direction = (
                    "DECREASES_RISK"
                )

                explanation = (
                    f"{feature} decreases "
                    "the predicted SLA breach risk."
                )

            else:

                direction = "NEUTRAL"

                explanation = (
                    f"{feature} has limited "
                    "influence."
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

                    original_probability=
                        round(
                            original_probability,
                            6
                        ),

                    comparison_probability=
                        round(
                            comparison_probability,
                            6
                        ),

                    influence=
                        round(
                            influence,
                            6
                        ),

                    direction=
                        direction,

                    explanation=
                        explanation,
                )
            )

        except Exception as error:

            logger.warning(
                "Explanation error for %s: %s",
                feature,
                error
            )

    results.sort(
        key=lambda item:
            abs(item.influence),
        reverse=True
    )

    return results


# ============================================================
# PREDICT + EXPLAIN
# ============================================================

@app.post(
    "/predict/explain",
    response_model=PredictionExplanationResponse,
    tags=["Explainability"]
)
def predict_explain(
    incident: IncidentRequest,

    top_n: int = Query(
        default=10,
        ge=1,
        le=50
    )
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
            probability
        )

        explanations = explain_locally(
            dataframe,
            probability
        )

        return PredictionExplanationResponse(

            prediction=
                prediction,

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
    model: Any
) -> Any:

    if hasattr(
        model,
        "named_steps"
    ):

        steps = list(
            model.named_steps.values()
        )

        if steps:

            return steps[-1]

    if hasattr(
        model,
        "steps"
    ):

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
    tags=["Explainability"]
)
def feature_importance(
    top_n: int = Query(
        default=20,
        ge=1,
        le=100
    )
):

    check_model()

    estimator = get_final_estimator(
        MODEL
    )

    importance = getattr(
        estimator,
        "feature_importances_",
        None
    )

    if importance is None:

        raise HTTPException(
            status_code=422,

            detail=(
                "The loaded model does not "
                "provide feature_importances_."
            )
        )

    importance = np.asarray(
        importance,
        dtype=float
    ).reshape(-1)

    feature_names = None

    if hasattr(
        MODEL,
        "named_steps"
    ):

        steps = list(
            MODEL.named_steps.values()
        )

        if len(steps) >= 2:

            preprocessor = steps[-2]

            if hasattr(
                preprocessor,
                "get_feature_names_out"
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
                []
            )

            +

            METADATA.get(
                "numerical_features",
                []
            )
        )

    if len(feature_names) != len(
        importance
    ):

        feature_names = [

            f"feature_{index}"

            for index
            in range(
                len(importance)
            )
        ]

    total_importance = float(
        np.sum(
            np.abs(
                importance
            )
        )
    )

    results = []

    for name, value in zip(
        feature_names,
        importance
    ):

        value_float = float(
            value
        )

        normalized = (

            abs(value_float)
            / total_importance

            if total_importance > 0

            else 0.0
        )

        results.append(
            GlobalFeatureImportanceItem(

                feature=str(
                    name
                ),

                importance=
                    round(
                        abs(value_float),
                        6
                    ),

                normalized_importance=
                    round(
                        normalized,
                        6
                    ),
            )
        )

    results.sort(
        key=lambda item:
            item.importance,
        reverse=True
    )

    return GlobalFeatureImportanceResponse(

        model_version=
            str(
                METADATA.get(
                    "model_version",
                    "unknown"
                )
            ),

        importance_type=
            "LightGBM feature importance",

        feature_mapping_available=
            True,

        warning=None,

        features=
            results[:top_n],
    )


# ============================================================
# CONFUSION MATRIX IMAGE
# ============================================================

@app.get(
    "/model/confusion-matrix/image",
    tags=["Model Evaluation"]
)
def get_confusion_matrix_image():

    if not CONFUSION_MATRIX_PATH.exists():

        raise HTTPException(
            status_code=404,

            detail={
                "message":
                    "Confusion matrix image "
                    "not found.",

                "path":
                    str(
                        CONFUSION_MATRIX_PATH
                    ),
            },
        )

    return FileResponse(

        path=str(
            CONFUSION_MATRIX_PATH
        ),

        media_type="image/png",

        filename="confusion_matrix.png"
    )


# ============================================================
# ROC IMAGE
# ============================================================

@app.get(
    "/model/roc-curve/image",
    tags=["Model Evaluation"]
)
def get_roc_curve_image():

    if not ROC_CURVE_PATH.exists():

        raise HTTPException(
            status_code=404,

            detail={
                "message":
                    "ROC curve image "
                    "not found.",

                "path":
                    str(
                        ROC_CURVE_PATH
                    ),
            },
        )

    return FileResponse(

        path=str(
            ROC_CURVE_PATH
        ),

        media_type="image/png",

        filename="roc_curve.png"
    )


# ============================================================
# CONFUSION MATRIX INFO
# ============================================================

@app.get(
    "/model/confusion-matrix",
    tags=["Model Evaluation"]
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
    tags=["Model Evaluation"]
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
# AGENT CONTEXT
# ============================================================

def build_agent_context(
    request: AIAgentRequest
):

    probability_percent = round(

        request.probability * 100,

        1

    )

    context = {

        "risk_level":
            request.risk_level,

        "risk_probability_percent":
            probability_percent,

        "prediction":
            request.prediction,

        "incident":
            request.incident,

        "influential_features":
            request.influential_features,

        "model_version":
            METADATA.get(
                "model_version",
                "unknown"
            ),

        "sla_target_days":
            METADATA.get(
                "sla_target_days",
                5
            ),

        "high_threshold":
            get_high_threshold(),

        "medium_threshold":
            get_medium_threshold(),
    }

    return json.dumps(

        context,

        indent=2,

        ensure_ascii=False,

        default=str

    )


# ============================================================
# AI SYSTEM PROMPT
# ============================================================

AI_AGENT_SYSTEM_PROMPT = """

You are QUALITY INSIGHT AI.

You are an intelligent enterprise assistant specialized
in IT service quality, incident management, SLA monitoring,
risk prediction, operational quality and corrective actions.

You are conversational, dynamic, analytical and helpful.

============================================================
CONVERSATION
============================================================

You must understand natural language.

If the user says:

"hello"
"bonjour"
"salut"
"hi"

respond naturally and professionally.

Do NOT say that you only answer SLA questions.

If the user says:

"merci"
"thank you"

respond naturally.

If the user asks a simple conversational question,
answer it naturally.

Do not repeat the same response every time.

Adapt your response to:

- the exact question
- the current risk
- the incident context
- the previous context supplied by the application

============================================================
QUALITY INSIGHT AI SPECIALIZATION
============================================================

Your main expertise is:

- IT incidents
- SLA
- SLA breach
- service quality
- incident prioritization
- risk management
- impact
- urgency
- priority
- escalation
- corrective actions
- preventive actions
- monitoring
- operational performance
- quality improvement
- AI-based risk prediction

When the question concerns these subjects,
provide expert and practical answers.

============================================================
ML PREDICTION
============================================================

The machine-learning model produces the risk prediction.

You MUST NOT change or contradict it.

The prediction is:

- HIGH
- MEDIUM
- LOW

The probability is supplied by the application.

Influential features represent model sensitivity,
not causal proof.

Never claim that a feature causes the risk.

============================================================
HIGH RISK
============================================================

For HIGH risk, consider:

- immediate intervention
- ownership confirmation
- escalation
- SLA monitoring
- resolution prioritization
- blocker identification
- active follow-up

============================================================
MEDIUM RISK
============================================================

For MEDIUM risk, consider:

- proactive monitoring
- blocker detection
- ownership review
- preventive actions
- priority review

============================================================
LOW RISK
============================================================

For LOW risk:

- normal monitoring
- maintain controls
- avoid unnecessary escalation

============================================================
IMPORTANT
============================================================

Do NOT invent incident information.

Use the supplied context when discussing the current incident.

For general conversation, you do not need to force
the answer into SLA terminology.

Answer the actual question.

Be concise when the question is simple.

Be more detailed when the question requires analysis.

Avoid generic repetitive answers.

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Use this structure:

{
    "intent": "greeting | general | sla | risk | incident | recommendation | explanation",
    "summary": "...",
    "risk_analysis": "...",
    "immediate_actions": [],
    "preventive_actions": [],
    "recommended_actions": [],
    "monitoring_actions": [],
    "priority": "NORMAL",
    "expected_outcome": "..."
}

For greetings:

intent = "greeting"

risk_analysis = ""

immediate_actions = []

preventive_actions = []

recommended_actions = []

monitoring_actions = []

priority = "NORMAL"

For general questions:

intent = "general"

For SLA/risk questions:

use the supplied ML context.

"""


# ============================================================
# CALL GROQ
# ============================================================

def call_ai_agent(
    question: str,
    context: str
):

    if GROQ_CLIENT is None:

        raise HTTPException(

            status_code=503,

            detail={

                "message":
                    "AI Agent is not configured.",

                "hint":
                    "Configure GROQ_API_KEY "
                    "in the backend .env file."
            }
        )

    user_prompt = f"""

USER QUESTION:

{question}

CURRENT QUALITY INSIGHT AI CONTEXT:

{context}

Answer the user naturally.

If this is a greeting or general question,
do not force it into an SLA answer.

If this concerns the current incident,
use the supplied incident and prediction data.

Return ONLY valid JSON.

"""

    try:

        response = GROQ_CLIENT.chat.completions.create(

            model=GROQ_MODEL,

            temperature=0.7,

            max_tokens=1200,

            messages=[

                {
                    "role":
                        "system",

                    "content":
                        AI_AGENT_SYSTEM_PROMPT
                },

                {
                    "role":
                        "user",

                    "content":
                        user_prompt
                }
            ]
        )

        content = (

            response

            .choices[0]

            .message

            .content

        )

        if not content:

            raise ValueError(
                "Groq returned an empty response."
            )

        content = content.strip()

        if content.startswith(
            "```json"
        ):

            content = content[7:]

        if content.startswith(
            "```"
        ):

            content = content[3:]

        if content.endswith(
            "```"
        ):

            content = content[:-3]

        content = content.strip()

        result = json.loads(
            content
        )

        if not isinstance(
            result,
            dict
        ):

            raise ValueError(
                "Groq response is not a JSON object."
            )

        return result

    except json.JSONDecodeError as error:

        logger.exception(
            "Groq JSON parsing error: %s",
            error
        )

        raise HTTPException(

            status_code=500,

            detail={

                "message":
                    "AI Agent returned invalid JSON.",

                "error":
                    str(error)
            }
        )

    except HTTPException:

        raise

    except Exception as error:

        logger.exception(
            "Groq request failed: %s",
            error
        )

        raise HTTPException(

            status_code=500,

            detail={

                "message":
                    "AI Agent request failed.",

                "error":
                    str(error)
            }
        )


# ============================================================
# NORMALIZE LIST
# ============================================================

def normalize_agent_list(
    value
):

    if not isinstance(
        value,
        list
    ):

        return []

    return [

        str(item).strip()

        for item in value

        if str(item).strip()

    ]


# ============================================================
# AI AGENT SOLUTIONS
# ============================================================

@app.post(
    "/ai-agent/solutions",
    response_model=AIAgentResponse,
    tags=["AI Agent"]
)
def ai_agent_solutions(
    request: AIAgentRequest
):

    logger.info(
        "AI Agent request | question=%s",
        request.question
    )

    context = build_agent_context(
        request
    )

    result = call_ai_agent(

        request.question,

        context

    )

    return AIAgentResponse(

        success=True,

        question=request.question,

        risk_level=request.risk_level,

        probability=round(
            request.probability,
            6
        ),

        prediction=request.prediction,

        intent=str(
            result.get(
                "intent",
                "general"
            )
        ),

        summary=str(
            result.get(
                "summary",
                ""
            )
        ),

        risk_analysis=str(
            result.get(
                "risk_analysis",
                ""
            )
        ),

        immediate_actions=
            normalize_agent_list(
                result.get(
                    "immediate_actions",
                    []
                )
            ),

        preventive_actions=
            normalize_agent_list(
                result.get(
                    "preventive_actions",
                    []
                )
            ),

        recommended_actions=
            normalize_agent_list(
                result.get(
                    "recommended_actions",
                    []
                )
            ),

        monitoring_actions=
            normalize_agent_list(
                result.get(
                    "monitoring_actions",
                    []
                )
            ),

        priority=str(
            result.get(
                "priority",
                "NORMAL"
            )
        ).upper(),

        expected_outcome=str(
            result.get(
                "expected_outcome",
                ""
            )
        ),

        llm_model=GROQ_MODEL,

        generated_by=
            "Quality Insight AI"
    )


# ============================================================
# AI AGENT HEALTH
# ============================================================

@app.get(
    "/ai-agent/health",
    tags=["AI Agent"]
)
def ai_agent_health():

    return {

        "available":
            GROQ_CLIENT is not None,

        "model":
            GROQ_MODEL,

        "provider":
            "Groq",

        "service":
            "Quality Insight AI",

        "specialization": [

            "IT Incident Management",

            "SLA Management",

            "Risk Prediction",

            "Service Quality",

            "Corrective Actions",

            "Preventive Actions",

            "Operational Monitoring"

        ]
    }

# ============================================================
# END
# ======================================
