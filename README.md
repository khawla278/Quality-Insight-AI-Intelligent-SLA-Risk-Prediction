# Quality Insight AI

## Intelligent SLA & NCR Risk Prediction Platform

> **AI-powered Quality Management Platform for SLA Breach and Crossrail Non-Conformance Risk Prediction**

Quality Insight AI is an intelligent quality-management platform that combines **Machine Learning, Explainable AI, FastAPI, Angular and Generative AI** to identify, predict and monitor operational quality risks.

The platform provides two complementary Machine Learning solutions:

- **Model 1 — SLA Breach Risk Prediction**
- **Model 2 — Crossrail NCR Late Close-Out Prediction**

Each model has its own:

- Prediction interface
- Dashboard
- Analytics
- Explainability
- Prediction history
- AI Assistant
- Notification center

The platform also provides AI-powered assistance through the **Groq API**, enabling contextual analysis, recommended actions, preventive actions and monitoring strategies.

---

# Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Key Features](#2-key-features)
- [3. System Architecture](#3-system-architecture)
- [4. Technology Stack](#4-technology-stack)
- [5. Machine Learning Models](#5-machine-learning-models)
- [6. Model 1 — SLA Breach Risk](#6-model-1--sla-breach-risk)
- [7. Model 2 — Crossrail NCR Risk](#7-model-2--crossrail-ncr-risk)
- [8. Explainable AI](#8-explainable-ai)
- [9. Generative AI Assistants](#9-generative-ai-assistants)
- [10. REST API](#10-rest-api)
- [11. Frontend Application](#11-frontend-application)
- [12. Prediction History and Local Storage](#12-prediction-history-and-local-storage)
- [13. Notifications](#13-notifications)
- [14. Complete Frontend Structure](#14-complete-frontend-structure)
- [15. Complete Project Structure](#15-complete-project-structure)
- [16. Prerequisites](#16-prerequisites)
- [17. Installation](#17-installation)
- [18. Environment Configuration](#18-environment-configuration)
- [19. Running the Application](#19-running-the-application)
- [20. API Testing](#20-api-testing)
- [21. Machine Learning Workflow](#21-machine-learning-workflow)
- [22. Model Performance](#22-model-performance)
- [23. Project Objectives](#23-project-objectives)
- [24. Future Improvements](#24-future-improvements)

---

# 1. Project Overview

Quality Insight AI is designed to help **quality, support and project teams** identify operational risks before they become critical.

The platform combines:

```text
Angular Frontend
       ↓
FastAPI REST API
       ↓
Data Validation
       ↓
Feature Engineering
       ↓
Machine Learning
       ↓
Risk Probability
       ↓
Risk Classification
       ↓
Explainability
       ↓
Dashboard / Analytics / History
       ↓
AI Assistant
       ↓
Notifications
```

The platform contains two independent Machine Learning workflows.

```text
                    QUALITY INSIGHT AI
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
       MODEL 1 — SLA               MODEL 2 — NCR
       BREACH RISK                 LATE CLOSE-OUT
             │                           │
             ▼                           ▼
       SLA Prediction              NCR Prediction
             │                           │
      ┌──────┼──────┐             ┌──────┼──────┐
      ▼      ▼      ▼             ▼      ▼      ▼
    Model  Dashboard Explain     Model  Dashboard Explain
      │      │      │             │      │      │
      └──────┼──────┘             └──────┼──────┘
             ▼                           ▼
          History                    History
             │                           │
             ▼                           ▼
       AI Assistant               AI Assistant
             │                           │
             ▼                           ▼
       Notifications               Notifications
             │                           │
             └─────────────┬─────────────┘
                           ▼
                  QUALITY MONITORING
```

The two workflows share the same application ecosystem but maintain separate prediction logic, histories, AI assistance and notification interfaces.

---

# 2. Key Features

## Machine Learning

- SLA breach risk prediction
- Crossrail NCR late close-out prediction
- Probability estimation
- Risk classification
- Single-record prediction
- Batch prediction
- Feature engineering
- Ensemble learning
- Model metadata
- Model health monitoring

## Explainable AI

- Feature importance
- SHAP analysis
- Individual prediction explanations
- Confusion matrix
- ROC curve
- Model performance metrics
- Prediction probability interpretation

## Quality Management

- Incident risk monitoring
- NCR risk monitoring
- SLA monitoring
- NCR late close-out monitoring
- Prediction history
- Risk-level filtering
- High-risk identification
- Notification management
- Treated notification management

## Generative AI

The platform provides dedicated AI Assistants for the two workflows.

### Model 1 AI Assistant

```text
/ai-assistant
```

Used for SLA breach risk analysis.

### Model 2 AI Assistant

```text
/model2-ai-assistant
```

Used for Crossrail NCR risk analysis.

The AI Assistants can provide:

- Risk analysis
- Immediate actions
- Preventive actions
- Recommended actions
- Monitoring actions
- Expected outcomes
- Historical statistics analysis

## Web Application

The Angular application provides:

- Home page
- Model 1 pages
- Model 2 pages
- Dashboards
- Analytics
- Explainability
- Prediction history
- AI Assistants
- Notifications
- Responsive navigation
- Risk visualization

---

# 3. System Architecture

```text
                              USER
                               │
                               ▼
                 ┌──────────────────────────┐
                 │      ANGULAR FRONTEND    │
                 │                          │
                 │  Angular / TypeScript    │
                 │  HTML5 / CSS3            │
                 │  RxJS                    │
                 │  Chart.js                │
                 │  jsPDF                   │
                 └────────────┬─────────────┘
                              │
                         HTTP / REST
                              │
                              ▼
                 ┌──────────────────────────┐
                 │      FASTAPI BACKEND     │
                 │                          │
                 │  Request Validation      │
                 │  Feature Engineering     │
                 │  ML Inference            │
                 │  Explainability          │
                 │  AI Agent                │
                 └────────────┬─────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ MODEL 1  │    │ MODEL 2  │    │ AI AGENT │
        │   SLA    │    │   NCR    │    │   Groq   │
        └────┬─────┘    └────┬─────┘    └────┬─────┘
             │               │               │
             └───────────────┼───────────────┘
                             ▼
                    Prediction & Analysis
                             │
                             ▼
                 ┌─────────────────────────┐
                 │      APPLICATION UI     │
                 │                         │
                 │ Dashboard               │
                 │ Analytics               │
                 │ Explainability          │
                 │ History                 │
                 │ AI Assistant            │
                 │ Notifications           │
                 └─────────────────────────┘
```

---

# 4. Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| Angular | Web application framework |
| TypeScript | Application programming language |
| HTML5 | UI structure |
| CSS3 | Styling |
| RxJS | Reactive programming |
| Chart.js | Data visualization |
| Bootstrap Icons | UI icons |
| jsPDF | PDF report generation |

## Backend

| Technology | Purpose |
|---|---|
| Python | Backend and ML programming |
| FastAPI | REST API framework |
| Uvicorn | ASGI server |
| Pydantic | Data validation |
| Pandas | Data processing |
| NumPy | Numerical computation |
| Scikit-learn | ML utilities and evaluation |
| LightGBM | Gradient boosting |
| XGBoost | Gradient boosting |
| CatBoost | Gradient boosting |
| Joblib | Model serialization |
| SHAP | Explainable AI |

## Generative AI

| Technology | Purpose |
|---|---|
| Groq API | Generative AI inference |
| `openai/gpt-oss-120b` | Configured AI model |

---

# 5. Machine Learning Models

Quality Insight AI contains two independent Machine Learning systems.

| Model | Business Problem | Target |
|---|---|---|
| Model 1 | SLA breach prediction | `SLA_BREACH` |
| Model 2 | NCR late close-out prediction | `LATE_CLOSE_OUT` |

The models have different:

- Datasets
- Features
- Feature-engineering pipelines
- Algorithms
- Thresholds
- Business objectives

---

# 6. Model 1 — SLA Breach Risk

## 6.1 Objective

Model 1 predicts whether an incident is likely to exceed its configured SLA target.

The current business target is:

```text
5 days
```

The model helps operational teams:

- identify high-risk incidents;
- prioritize intervention;
- monitor approaching SLA deadlines;
- reduce late resolution;
- improve support performance.

---

## 6.2 Model Configuration

```text
Model:
SLA Breach Risk Classifier

Version:
1.0.0

Algorithm:
LightGBM Binary Classifier

Type:
Binary Classification

Target:
SLA_BREACH
```

---

## 6.3 Prediction Classes

```text
SLA_BREACH = 1
        ↓
Incident exceeds SLA target

SLA_BREACH = 0
        ↓
Incident does not exceed SLA target
```

---

## 6.4 Risk Classification

The prediction probability is converted into three risk levels.

| Risk Level | Probability |
|---|---:|
| HIGH | ≥ 68% |
| MEDIUM | 35% – < 68% |
| LOW | < 35% |

```text
Probability ≥ 0.68
        → HIGH

0.35 ≤ Probability < 0.68
        → MEDIUM

Probability < 0.35
        → LOW
```

---

## 6.5 Model 1 Frontend

The Model 1 frontend workflow is:

```text
Model
  ↓
Dashboard
  ↓
Analytics
  ↓
Explainability
  ↓
Historique
  ↓
AI Assistant
  ↓
Notifications
```

Routes:

```text
/model
/dashboard
/analytics
/explainability
/historique
/ai-assistant
/notification
```

---

# 7. Model 2 — Crossrail NCR Risk

## 7.1 Objective

Model 2 predicts whether a **Crossrail Non-Conformance Report (NCR)** is likely to experience a late close-out.

The target is based on:

```text
was_late = Days Late > 0
```

The prediction is intended to be performed during the NCR lifecycle, before final closure, so that teams can take preventive action.

---

## 7.2 Model Configuration

```text
Model:
Crossrail NCR Late Close-Out Prediction

Version:
1.0.0

Type:
Binary Classification

Champion:
Voting Ensemble

Number of Models:
3
```

The ensemble combines:

```text
XGBoost
LightGBM
CatBoost
```

---

## 7.3 Prediction Classes

```text
LATE_CLOSE_OUT
        ↓
NCR is predicted to close late

ON_TIME_CLOSE_OUT
        ↓
NCR is predicted to close on time
```

---

## 7.4 Risk Classification

The configured thresholds are:

```text
High Threshold:
43.5%

Medium Threshold:
28.3%
```

| Risk Level | Probability |
|---|---:|
| HIGH | ≥ 43.5% |
| MEDIUM | 28.3% – < 43.5% |
| LOW | < 28.3% |

```text
Probability ≥ 43.5%
        → HIGH

28.3% ≤ Probability < 43.5%
        → MEDIUM

Probability < 28.3%
        → LOW
```

---

## 7.5 Ensemble Configuration

The champion model is a weighted Voting Ensemble.

| Algorithm | Weight |
|---|---:|
| XGBoost | 0.03% |
| LightGBM | 42.72% |
| CatBoost | 57.26% |

The ensemble combines predictions from the three algorithms according to the configured weights.

---

## 7.6 Model 2 Frontend

The Model 2 frontend workflow is:

```text
Model 2
   ↓
Dashboard
   ↓
Analytics
   ↓
Explainability
   ↓
Historique
   ↓
AI Assistant
   ↓
Notifications
```

Routes:

```text
/model2
/model2-dashboard
/model2-analytics
/model2-explainability
/model2-historique
/model2-ai-assistant
/model2-notification
```

---

# 8. Explainable AI

Quality Insight AI does not only provide a prediction. It also provides mechanisms to understand the model output.

The explainability layer includes:

- Feature importance
- SHAP analysis
- Individual prediction explanations
- Confusion matrix
- ROC curve
- Model statistics

## Explainability Pipeline

```text
Input
  ↓
Feature Engineering
  ↓
ML Model
  ↓
Prediction Probability
  ↓
Feature Contributions
  ↓
Explanation
  ↓
Angular Interface
```

### Important Interpretation Note

Feature importance and SHAP values describe how features are used by the Machine Learning model. They should not automatically be interpreted as proof of real-world causation.

---

## Model 1 Explainability

Route:

```text
/explainability
```

The page displays explainability information for the SLA Breach model.

---

## Model 2 Explainability

Route:

```text
/model2-explainability
```

The page displays explainability information for the Crossrail NCR model, including feature importance and SHAP-related analysis.

---

# 9. Generative AI Assistants

Quality Insight AI includes AI-powered assistants using the **Groq API**.

Configured model:

```text
openai/gpt-oss-120b
```

The platform provides two AI Assistant interfaces.

---

## 9.1 Model 1 AI Assistant

Route:

```text
/ai-assistant
```

The assistant analyzes SLA breach predictions.

It can answer questions such as:

```text
What actions should I take to reduce the risk of SLA breach?
```

It can use:

- Current prediction
- Risk level
- Probability
- Incident information
- Influential features
- Prediction history
- Historical statistics

---

## 9.2 Model 2 AI Assistant

Route:

```text
/model2-ai-assistant
```

The assistant analyzes Crossrail NCR predictions.

Example:

```text
What actions should I take to reduce the risk of late close-out?
```

It can provide:

- Risk analysis
- Immediate actions
- Preventive actions
- Recommended actions
- Monitoring actions
- Expected outcomes

---

## 9.3 AI Assistant Input

The backend can receive:

```text
Question
Risk Level
Prediction Probability
Prediction Result
Incident / NCR Information
Influential Features
Statistics
Prediction History
```

---

## 9.4 AI Response Structure

The AI Agent is designed to return structured information:

```text
intent
summary
risk_analysis
immediate_actions
preventive_actions
recommended_actions
monitoring_actions
priority
expected_outcome
```

The AI Agent should:

- use the supplied prediction values;
- use supplied statistics;
- avoid inventing statistics;
- avoid changing Machine Learning results;
- avoid claiming causality from model features;
- respond in the same language as the user's question.

---

# 10. REST API

The backend is implemented using **FastAPI**.

Default local server:

```text
http://127.0.0.1:8000
```

Interactive Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

OpenAPI specification:

```text
http://127.0.0.1:8000/openapi.json
```

---

## 10.1 General Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API root |
| GET | `/health` | Backend and model health status |

---

## 10.2 Model 1 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/model1/features` | Return Model 1 input features |
| GET | `/model1/model` | Model information |
| POST | `/model1/predict` | Single prediction |
| POST | `/model1/predict/batch` | Batch prediction |
| POST | `/model1/predict/explain` | Prediction explanation |
| GET | `/model1/feature-importance` | Feature importance |
| GET | `/model1/confusion-matrix` | Confusion matrix data |
| GET | `/model1/confusion-matrix/image` | Confusion matrix image |
| GET | `/model1/roc-curve` | ROC curve data |
| GET | `/model1/roc-curve/image` | ROC curve image |

> The exact availability of an endpoint depends on the current FastAPI implementation.

---

## 10.3 Model 2 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/model2/features` | Return Model 2 features |
| GET | `/model2/model` | Model information |
| POST | `/model2/predict` | Single NCR prediction |
| POST | `/model2/predict/batch` | Batch NCR prediction |
| POST | `/model2/predict/explain` | Prediction with explanation |
| GET | `/model2/feature-importance` | Feature importance |
| GET | `/model2/feature-importance/image` | Feature importance image |
| GET | `/model2/confusion-matrix` | Confusion matrix data |
| GET | `/model2/confusion-matrix/image` | Confusion matrix image |
| GET | `/model2/roc-curve` | ROC curve data |
| GET | `/model2/roc-curve/image` | ROC curve image |

---

## 10.4 AI Agent Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai-agent/solutions` | Generate AI analysis |
| GET | `/ai-agent/health` | AI Agent status |

---

# 11. Frontend Application

The frontend is developed using **Angular and TypeScript**.

The frontend is organized into two main Machine Learning workflows.

```text
                         QUALITY INSIGHT AI
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
             MODEL 1                       MODEL 2
           SLA BREACH                    CROSSRAIL NCR
                 │                             │
       ┌─────────┼─────────┐         ┌────────┼─────────┐
       ▼         ▼         ▼         ▼        ▼         ▼
     Model   Analytics  Explain    Model   Analytics  Explain
       │         │         │         │        │         │
       └─────────┼─────────┘         └────────┼─────────┘
                 │                             │
                 ▼                             ▼
             History                       History
                 │                             │
                 ▼                             ▼
          AI Assistant                  AI Assistant
                 │                             │
                 ▼                             ▼
          Notifications                  Notifications
```

---

## 11.1 Model 1 Pages

```text
Home
 │
 └── Model 1 — SLA Breach
       │
       ├── Model
       ├── Dashboard
       ├── Analytics
       ├── Explainability
       ├── Historique
       ├── AI Assistant
       └── Notifications
```

Routes:

| Page | Route |
|---|---|
| Home | `/home` |
| Model | `/model` |
| Dashboard | `/dashboard` |
| Analytics | `/analytics` |
| Explainability | `/explainability` |
| Historique | `/historique` |
| AI Assistant | `/ai-assistant` |
| Notifications | `/notification` |

---

## 11.2 Model 2 Pages

```text
Model 2 — Crossrail NCR
       │
       ├── Model 2
       ├── Dashboard
       ├── Analytics
       ├── Explainability
       ├── Historique
       ├── AI Assistant
       └── Notifications
```

Routes:

| Page | Route |
|---|---|
| Model 2 | `/model2` |
| Model 2 Dashboard | `/model2-dashboard` |
| Model 2 Analytics | `/model2-analytics` |
| Model 2 Explainability | `/model2-explainability` |
| Model 2 Historique | `/model2-historique` |
| Model 2 AI Assistant | `/model2-ai-assistant` |
| Model 2 Notifications | `/model2-notification` |

---

## 11.3 Frontend Data Flow

### Model 1

```text
User
 │
 ▼
Model 1 Page
 │
 ▼
ApiService
 │
 ▼
POST /model1/predict
 │
 ▼
FastAPI
 │
 ▼
SLA ML Model
 │
 ▼
Prediction
 │
 ├── Dashboard
 ├── Analytics
 ├── Explainability
 ├── Historique
 ├── AI Assistant
 └── Notifications
```

### Model 2

```text
User
 │
 ▼
Model 2 Page
 │
 ▼
ApiService
 │
 ▼
POST /model2/predict
 │
 ▼
FastAPI
 │
 ▼
Crossrail NCR ML Model
 │
 ▼
Prediction
 │
 ├── Dashboard
 ├── Analytics
 ├── Explainability
 ├── Historique
 ├── AI Assistant
 └── Notifications
```

---

# 12. Prediction History and Local Storage

The frontend maintains prediction information to support monitoring and historical analysis.

The two workflows maintain logically separate histories.

```text
Browser
   │
   ▼
localStorage
   │
   ├── Model 1
   │     └── SLA Prediction History
   │
   └── Model 2
         └── NCR Prediction History
```

Main storage keys include:

```text
predictionHistory
nonConformanceHistory
latestPredictionExplanation
qualityInsightNotifications
```

---

## 12.1 Model 1 History

Route:

```text
/historique
```

The history page is used to review SLA prediction records.

Users can:

- review previous predictions;
- inspect risk levels;
- inspect prediction probabilities;
- identify high-risk incidents;
- export historical information.

---

## 12.2 Model 2 History

Route:

```text
/model2-historique
```

The history page is dedicated to Crossrail NCR predictions.

Users can:

- review previous NCR predictions;
- identify high-risk NCRs;
- inspect prediction probabilities;
- analyze late close-out risk;
- review historical NCR information.

---

## 12.3 Latest Prediction

The application can maintain the latest prediction context to support:

```text
Dashboard
AI Assistant
Explainability
Notifications
```

The latest prediction information is handled through the frontend storage workflow.

> `localStorage` is a client-side storage mechanism. It is appropriate for the current prototype/application workflow but should be replaced or complemented by persistent server-side storage for a production multi-user deployment.

---

# 13. Notifications

Quality Insight AI provides notification management for both Machine Learning workflows.

Each model has a dedicated notification page.

```text
                    QUALITY INSIGHT AI
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
          MODEL 1                   MODEL 2
        SLA BREACH               CROSSRAIL NCR
              │                         │
              ▼                         ▼
         Prediction                Prediction
              │                         │
              ▼                         ▼
        Risk Evaluation          Risk Evaluation
              │                         │
              ▼                         ▼
          High Risk                 High Risk
              │                         │
              ▼                         ▼
      SLA Notification          NCR Notification
              │                         │
              ▼                         ▼
       /notification          /model2-notification
```

---

## 13.1 Model 1 Notifications

Model 1 notifications are associated with **SLA Breach Risk**.

Workflow:

```text
SLA Prediction
      ↓
Risk Evaluation
      ↓
HIGH Risk
      ↓
SLA Notification
      ↓
/notification
```

The notification system can highlight incidents requiring operational attention.

The configured SLA business target is:

```text
5 days
```

---

## 13.2 Model 2 Notifications

Model 2 notifications are associated with **Crossrail NCR Late Close-Out Risk**.

Workflow:

```text
NCR Prediction
      ↓
Risk Evaluation
      ↓
HIGH Risk
      ↓
NCR Notification
      ↓
/model2-notification
```

The notification system can highlight NCRs predicted to have a high probability of late close-out.

---

## 13.3 Notification Lifecycle

```text
Prediction
    ↓
Risk Assessment
    ↓
Notification Generated
    ↓
Notification Displayed
    ↓
User Reviews Notification
    ↓
Mark as Treated / Remove
```

The application supports notification management, including:

- viewing notifications;
- identifying high-risk items;
- marking notifications as treated;
- removing notifications;
- notification retention according to the frontend workflow.

---

# 14. Complete Frontend Structure

The Angular application follows this structure:

```text
quality-insight-angular/
│
├── src/
│   │
│   ├── app/
│   │   │
│   │   ├── pages/
│   │   │   │
│   │   │   ├── home/
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │
│   │   │   ├── model/
│   │   │   │
│   │   │   ├── explainability/
│   │   │   │
│   │   │   ├── historique/
│   │   │   │
│   │   │   ├── ai-assistant/
│   │   │   │
│   │   │   ├── notification/
│   │   │   │
│   │   │   ├── model2/
│   │   │   │
│   │   │   ├── model2-dashboard/
│   │   │   │
│   │   │   ├── model2-analytics/
│   │   │   │
│   │   │   ├── model2-explainability/
│   │   │   │
│   │   │   ├── model2-historique/
│   │   │   │
│   │   │   ├── model2-ai-assistant/
│   │   │   │
│   │   │   └── model2-notification/
│   │   │
│   │   ├── components/
│   │   │
│   │   ├── services/
│   │   │
│   │   ├── models/
│   │   │
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   └── app.routes.ts
│   │
│   ├── assets/
│   │
│   ├── styles.css
│   └── index.html
│
├── angular.json
├── package.json
├── package-lock.json
├── tsconfig.json
└── ...
```

---

## 14.1 Pages Directory

The complete `pages/` directory is:

```text
pages/
│
├── home/
│
├── dashboard/
│
├── analytics/
│
├── model/
│
├── explainability/
│
├── historique/
│
├── ai-assistant/
│
├── notification/
│
├── model2/
│
├── model2-dashboard/
│
├── model2-analytics/
│
├── model2-explainability/
│
├── model2-historique/
│
├── model2-ai-assistant/
│
└── model2-notification/
```

---

## 14.2 Page Responsibilities

| Page | Responsibility |
|---|---|
| `home` | Application entry point |
| `model` | SLA prediction |
| `dashboard` | SLA risk dashboard |
| `analytics` | SLA analytics |
| `explainability` | SLA model explanations |
| `historique` | SLA prediction history |
| `ai-assistant` | SLA AI Assistant |
| `notification` | SLA notifications |
| `model2` | Crossrail NCR prediction |
| `model2-dashboard` | NCR risk dashboard |
| `model2-analytics` | NCR analytics |
| `model2-explainability` | NCR model explanations |
| `model2-historique` | NCR prediction history |
| `model2-ai-assistant` | NCR AI Assistant |
| `model2-notification` | NCR notifications |

---

## 14.3 Services

The Angular application uses services to communicate with the backend and manage application data.

```text
services/
│
├── api.service.ts
├── notification.service.ts
└── ...
```

### API Service

The API service communicates with FastAPI.

```text
Angular
   │
   ▼
ApiService
   │
   ├── Model 1 API
   │
   ├── Model 2 API
   │
   └── AI Agent API
           │
           ▼
        FastAPI
```

The service can handle:

- Model 1 predictions
- Model 1 batch predictions
- Model 1 explanations
- Model 2 predictions
- Model 2 batch predictions
- Model 2 explanations
- Feature importance
- Model information
- AI Agent requests
- Backend health checks

---

# 15. Complete Project Structure

```text
Quality-Insight-AI-Intelligent-SLA-Risk-Prediction-2models/
│
├── backend/
│   │
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   │
│   ├── models/
│   │   ├── sla_breach_portable_v1.0.0.joblib
│   │   ├── sla_breach_portable_v1.0.0_meta.json
│   │   ├── model_metadata.json
│   │   └── ...
│   │
│   ├── services/
│   │
│   ├── routers/
│   │
│   └── ...
│
├── quality-insight-angular/
│   │
│   ├── src/
│   │   │
│   │   ├── app/
│   │   │   │
│   │   │   ├── pages/
│   │   │   │   ├── home/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── analytics/
│   │   │   │   ├── model/
│   │   │   │   ├── explainability/
│   │   │   │   ├── historique/
│   │   │   │   ├── ai-assistant/
│   │   │   │   ├── notification/
│   │   │   │   ├── model2/
│   │   │   │   ├── model2-dashboard/
│   │   │   │   ├── model2-analytics/
│   │   │   │   ├── model2-explainability/
│   │   │   │   ├── model2-historique/
│   │   │   │   ├── model2-ai-assistant/
│   │   │   │   └── model2-notification/
│   │   │   │
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   ├── app.component.ts
│   │   │   ├── app.component.html
│   │   │   └── app.routes.ts
│   │   │
│   │   ├── assets/
│   │   ├── styles.css
│   │   └── index.html
│   │
│   ├── angular.json
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── ...
│
├── .gitignore
├── README.md
└── ...
```

---

# 16. Prerequisites

Before running the project, install:

- Python 3.10+
- Node.js
- npm
- Angular CLI
- Git

Verify:

```bash
python --version
node --version
npm --version
git --version
```

Verify Angular:

```bash
ng version
```

---

# 17. Installation

## 17.1 Clone the Repository

```bash
git clone <repository-url>
cd Quality-Insight-AI-Intelligent-SLA-Risk-Prediction-2models
```

Replace:

```text
<repository-url>
```

with the actual Git repository URL.

---

## 17.2 Backend Installation

Go to the backend:

```bash
cd backend
```

Create a virtual environment:

### Windows

```bash
python -m venv venv
```

Activate:

```bash
venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## 17.3 Frontend Installation

Open another terminal.

Go to the Angular application:

```bash
cd quality-insight-angular
```

Install dependencies:

```bash
npm install
```

If Angular CLI is not installed:

```bash
npm install -g @angular/cli
```

---

# 18. Environment Configuration

The backend uses environment variables for external AI services.

Create:

```text
backend/.env
```

Example:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

The backend loads these variables during initialization.

---

# 19. Running the Application

The application consists of two services:

```text
Angular Frontend
        +
FastAPI Backend
```

Both must be running.

---

## 19.1 Start the Backend

From the project root:

```bash
cd backend
```

Activate the virtual environment.

Windows:

```bash
venv\Scripts\activate
```

Start FastAPI:

```bash
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

---

## 19.2 Start the Frontend

Open a second terminal:

```bash
cd quality-insight-angular
```

Start Angular:

```bash
ng serve
```

Frontend:

```text
http://localhost:4200
```

Open:

```text
http://localhost:4200
```

---

## 19.3 Application URLs

| Component | URL | Port |
|---|---|---:|
| Angular | `http://localhost:4200` | 4200 |
| FastAPI | `http://127.0.0.1:8000` | 8000 |
| Swagger | `http://127.0.0.1:8000/docs` | 8000 |
| OpenAPI | `http://127.0.0.1:8000/openapi.json` | 8000 |

---

# 20. API Testing

Before testing the Angular frontend, verify that the backend is running correctly.

---

## 20.1 Health Check

Open:

```text
http://127.0.0.1:8000/health
```

The response should indicate that the backend is available and provide the configured model status.

---

## 20.2 Swagger

Open:

```text
http://127.0.0.1:8000/docs
```

Swagger provides an interactive interface for testing the API.

You can use it to:

- inspect endpoints;
- inspect request schemas;
- send test requests;
- inspect responses;
- validate backend integration.

---

## 20.3 Model 1 API Testing

Example workflow:

```text
POST /model1/predict
       ↓
SLA Prediction
       ↓
Probability
       ↓
Risk Level
```

Then:

```text
POST /model1/predict/explain
```

for the prediction explanation.

---

## 20.4 Model 2 API Testing

Example workflow:

```text
POST /model2/predict
       ↓
NCR Prediction
       ↓
Probability
       ↓
Risk Level
```

Then:

```text
POST /model2/predict/explain
```

for the prediction explanation.

---

## 20.5 AI Agent Testing

The AI Agent endpoint is:

```text
POST /ai-agent/solutions
```

The request can contain:

```text
question
risk_level
probability
prediction
incident
influential_features
statistics
history
```

---

# 21. Machine Learning Workflow

The complete Machine Learning workflow is:

```text
Raw Dataset
     ↓
Data Cleaning
     ↓
Feature Engineering
     ↓
Train / Validation / Test
     ↓
Model Training
     ↓
Model Evaluation
     ↓
Model Serialization
     ↓
FastAPI Deployment
     ↓
Angular Integration
     ↓
Prediction
     ↓
Risk Classification
     ↓
Explainability
     ↓
History
     ↓
AI Assistant
     ↓
Notifications
```

---

## Model 1 Workflow

```text
Incident
   ↓
Feature Engineering
   ↓
LightGBM
   ↓
SLA Breach Probability
   ↓
HIGH / MEDIUM / LOW
   ↓
Explanation
   ↓
Dashboard / History
   ↓
AI Assistant
   ↓
Notification
```

---

## Model 2 Workflow

```text
NCR
   ↓
NCR Feature Engineering
   ↓
XGBoost + LightGBM + CatBoost
   ↓
Ensemble Probability
   ↓
HIGH / MEDIUM / LOW
   ↓
Explanation
   ↓
Dashboard / History
   ↓
AI Assistant
   ↓
Notification
```

---

# 22. Model Performance

## 22.1 Model 1 — SLA Breach

Current evaluation results:

| Metric | Result |
|---|---:|
| Accuracy | 76% |
| Precision | 60% |
| Recall | 65% |
| F1 Score | 62% |
| ROC-AUC | 82% |

These values represent the current evaluation performance of the SLA breach classifier.

---

## 22.2 Model 2 — Crossrail NCR

Current outer-test results:

| Metric | Result |
|---|---:|
| Accuracy | 79.64% |
| AUC | 83.91% |
| PR-AUC | 73.25% |
| F1 Score | 65.68% |
| Precision | 69.95% |
| Recall | 61.91% |

Classification threshold:

```text
43.5%
```

---

# 23. Project Objectives

The main objectives of Quality Insight AI are:

1. Predict SLA breach risk.
2. Predict Crossrail NCR late close-out risk.
3. Identify high-risk incidents.
4. Identify high-risk NCRs.
5. Provide probability-based risk classification.
6. Explain Machine Learning predictions.
7. Provide feature importance and SHAP analysis.
8. Centralize SLA prediction history.
9. Centralize NCR prediction history.
10. Provide dedicated AI assistance for each model.
11. Generate operational recommendations.
12. Support preventive and corrective actions.
13. Provide dedicated notifications for SLA risks.
14. Provide dedicated notifications for NCR risks.
15. Improve proactive quality monitoring.
16. Provide a unified quality-management platform.
17. Support data-driven decision making.

---

# 24. Future Improvements

Possible future improvements include:

## Backend

- PostgreSQL integration
- Persistent prediction storage
- User authentication
- Role-based access control
- Centralized notification storage
- Background prediction processing
- Model version management
- Model monitoring
- Automated retraining

## Machine Learning

- Hyperparameter optimization
- Improved class balancing
- Cross-validation
- Threshold optimization
- Calibration of probabilities
- Advanced feature engineering
- Model drift detection
- Automated model evaluation

## Explainable AI

- More detailed SHAP explanations
- Global and local explanations
- Explanation comparison between predictions
- Automated explanation reports

## Frontend

- Advanced filtering
- Real-time notifications
- Interactive analytics
- Advanced KPI monitoring
- User profiles
- Role-based dashboards
- Exportable reports
- Improved mobile responsiveness

## Generative AI

- Context-aware conversational memory
- Model-specific AI agents
- Automated quality reports
- AI-generated action plans
- AI-assisted root-cause investigation
- Natural-language analytics
- Automated daily risk summaries

---

# Final Architecture

The complete Quality Insight AI architecture can be summarized as:

```text
                           QUALITY INSIGHT AI
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
                 ▼                                 ▼
             MODEL 1                           MODEL 2
           SLA BREACH                        CROSSRAIL NCR
                 │                                 │
        ┌────────┼────────┐                ┌───────┼────────┐
        │        │        │                │       │        │
        ▼        ▼        ▼                ▼       ▼        ▼
      Model  Dashboard Explain           Model  Dashboard Explain
        │        │        │                │       │        │
        └────────┼────────┘                └───────┼────────┘
                 │                                 │
                 ▼                                 ▼
             History                           History
                 │                                 │
                 ▼                                 ▼
          AI Assistant                      AI Assistant
                 │                                 │
                 ▼                                 ▼
          Notifications                      Notifications
                 │                                 │
                 └────────────────┬────────────────┘
                                  ▼
                         QUALITY MONITORING
                                  │
                                  ▼
                         PROACTIVE ACTION
```

Quality Insight AI therefore provides a unified platform for **predicting, explaining, monitoring and managing SLA and Crossrail NCR operational risks** through Machine Learning, Explainable AI and Generative AI.
