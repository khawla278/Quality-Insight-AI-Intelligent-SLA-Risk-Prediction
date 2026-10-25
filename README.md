# Quality Insight AI

## Intelligent SLA Breach Risk Prediction Platform

> **AI-powered Quality Management Platform for SLA Breach Risk Prediction**

Quality Insight AI is an intelligent quality-management platform that combines **Machine Learning, Explainable AI, FastAPI, Angular and Generative AI** to identify, predict and monitor operational SLA risks.

The platform predicts whether an incident is likely to exceed its configured Service Level Agreement (SLA) target. It helps operational teams identify high-risk incidents, prioritize interventions and implement preventive actions.

The application includes:

- SLA breach risk prediction
- Interactive dashboard
- Advanced analytics
- Explainable AI
- Prediction history
- AI Assistant powered by Groq
- Notification center
- Proactive quality monitoring

---

# Table of Contents

1. Project Overview
2. Key Features
3. System Architecture
4. Technology Stack
5. Machine Learning Model
6. Risk Classification
7. Explainable AI
8. Generative AI Assistant
9. REST API
10. Frontend Application
11. Prediction History
12. Notifications
13. Frontend Structure
14. Complete Project Structure
15. Prerequisites
16. Installation
17. Environment Configuration
18. Running the Application
19. API Testing
20. Machine Learning Workflow
21. Model Performance
22. Project Objectives
23. Future Improvements

---

# 1. Project Overview

Quality Insight AI is designed to help quality, support and project teams identify incidents that are likely to exceed their SLA deadlines.

The platform combines:

- **Angular** for the user interface
- **FastAPI** for backend services
- **LightGBM** for SLA breach prediction
- **SHAP** for model explainability
- **Groq API** for AI-powered recommendations

## System Workflow

```text
                 QUALITY INSIGHT AI
                         │
                         ▼
                 ANGULAR FRONTEND
                         │
                         ▼
                   FASTAPI BACKEND
                         │
                         ▼
                 DATA VALIDATION
                         │
                         ▼
                FEATURE ENGINEERING
                         │
                         ▼
                 LIGHTGBM MODEL
                         │
                         ▼
                SLA BREACH PROBABILITY
                         │
                         ▼
                  RISK CLASSIFICATION
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
         Dashboard    Analytics  Explainability
             │           │           │
             └───────────┼───────────┘
                         ▼
                     Historique
                         │
                         ▼
                    AI Assistant
                         │
                         ▼
                    Notifications
                         │
                         ▼
                 QUALITY MONITORING
                         │
                         ▼
                  PROACTIVE ACTION
```

The application provides a complete workflow for predicting, explaining and monitoring SLA breach risks.

---

# 2. Key Features

## Machine Learning

- SLA breach risk prediction
- Probability estimation
- Binary classification
- HIGH, MEDIUM and LOW risk levels
- Single-record prediction
- Batch prediction
- Feature engineering
- Model metadata
- Model health monitoring

## Explainable AI

- Feature importance
- SHAP analysis
- Individual prediction explanations
- Confusion matrix
- ROC curve
- Model evaluation metrics
- Prediction probability interpretation

## Quality Management

- Incident risk monitoring
- SLA deadline monitoring
- High-risk incident identification
- Prediction history
- Risk-level filtering
- Notification management
- Treated notification management
- Preventive action recommendations

## Generative AI

The platform includes a dedicated AI Assistant that can provide:

- SLA risk analysis
- Immediate actions
- Preventive actions
- Recommended interventions
- Monitoring strategies
- Expected outcomes
- Historical prediction analysis

## Web Application

The Angular application includes:

- Home page
- SLA prediction interface
- Dashboard
- Analytics
- Explainability
- Prediction history
- AI Assistant
- Notifications
- Risk visualization
- PDF report generation

---

# 3. System Architecture

```text
                         USER
                          │
                          ▼
              ┌────────────────────────┐
              │    ANGULAR FRONTEND    │
              │                        │
              │ Angular / TypeScript   │
              │ HTML5 / CSS3           │
              │ RxJS                   │
              │ Chart.js               │
              │ jsPDF                  │
              └────────────┬───────────┘
                           │
                       HTTP / REST
                           │
                           ▼
              ┌────────────────────────┐
              │     FASTAPI BACKEND    │
              │                        │
              │ Request Validation     │
              │ Feature Engineering    │
              │ ML Inference           │
              │ Explainability         │
              │ AI Agent Integration   │
              └────────────┬───────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ LIGHTGBM │ │   SHAP   │ │   GROQ   │
        │   MODEL  │ │          │ │    AI    │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          ▼
                Prediction and Analysis
                          │
                          ▼
              ┌────────────────────────┐
              │    APPLICATION UI      │
              │                        │
              │ Dashboard              │
              │ Analytics              │
              │ Explainability         │
              │ History                │
              │ AI Assistant           │
              │ Notifications          │
              └────────────────────────┘
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
| LightGBM | Gradient boosting classifier |
| Joblib | Model serialization |
| SHAP | Explainable AI |

## Generative AI

| Technology | Purpose |
|---|---|
| Groq API | Generative AI inference |
| `openai/gpt-oss-120b` | Configured AI model |

---

# 5. Machine Learning Model

## 5.1 Objective

Model 1 predicts whether an incident is likely to exceed its configured SLA target.

The current business target is **5 days**.

The model helps operational teams:

- Identify high-risk incidents.
- Prioritize interventions.
- Monitor SLA performance.
- Reduce late resolutions.
- Improve support efficiency.
- Make data-driven decisions.

## 5.2 Model Configuration

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

SLA Target:
5 days
```

## 5.3 Prediction Classes

```text
SLA_BREACH = 1
        │
        ▼
Incident predicted to exceed the SLA target


SLA_BREACH = 0
        │
        ▼
Incident predicted not to exceed the SLA target
```

The model produces a prediction and an estimated probability of SLA breach.

---

# 6. Risk Classification

The predicted probability is converted into three operational risk levels.

| Risk Level | Probability |
|---|---|
| HIGH | ≥ 68% |
| MEDIUM | 35% to less than 68% |
| LOW | Less than 35% |

```text
Probability ≥ 0.68
        → HIGH

0.35 ≤ Probability < 0.68
        → MEDIUM

Probability < 0.35
        → LOW
```

These thresholds support incident prioritization and should be interpreted alongside operational context.

---

# 7. Explainable AI

Quality Insight AI provides mechanisms to understand the predictions generated by the Machine Learning model.

The explainability layer includes:

- Global feature importance
- SHAP analysis
- Individual prediction explanations
- Confusion matrix
- ROC curve
- Classification metrics

## Explainability Workflow

```text
Incident Data
      │
      ▼
Feature Engineering
      │
      ▼
LightGBM Model
      │
      ▼
Prediction Probability
      │
      ▼
Feature Contributions
      │
      ▼
Explanation
      │
      ▼
Angular Interface
```

Feature importance and SHAP values help explain the model's behavior. They do not, by themselves, establish real-world causation.

## Explainability Route

```text
/explainability
```

This page displays available explanation information for the SLA breach model.

---

# 8. Generative AI Assistant

Quality Insight AI integrates a dedicated AI Assistant through the Groq API.

Configured model:

```text
openai/gpt-oss-120b
```

## Route

```text
/ai-assistant
```

The assistant helps users interpret SLA risk predictions and identify appropriate operational actions.

### Example Question

```text
What actions should I take to reduce the risk of SLA breach?
```

### Assistant Capabilities

- Analyze the current incident risk.
- Explain the prediction in accessible language.
- Recommend immediate actions.
- Suggest preventive measures.
- Propose monitoring strategies.
- Analyze supplied prediction history.
- Provide expected outcomes.

## AI Assistant Input

The backend can receive:

```text
Question
Risk Level
Prediction Probability
Prediction Result
Incident Information
Influential Features
Statistics
Prediction History
```

## AI Response Structure

The assistant is designed to provide structured information:

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

The assistant should use the supplied prediction values and statistics, avoid inventing metrics, and avoid presenting model correlations as proven causes.

---

# 9. REST API

The backend is implemented using FastAPI.

## Base URL

```text
http://127.0.0.1:8000
```

## Interactive Documentation

```text
http://127.0.0.1:8000/docs
```

## OpenAPI Specification

```text
http://127.0.0.1:8000/openapi.json
```

## 9.1 General Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API root |
| GET | `/health` | Backend and model health status |

## 9.2 Model 1 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/model1/features` | Return input features |
| GET | `/model1/model` | Return model information |
| POST | `/model1/predict` | Single prediction |
| POST | `/model1/predict/batch` | Batch prediction |
| POST | `/model1/predict/explain` | Prediction explanation |
| GET | `/model1/feature-importance` | Feature importance |
| GET | `/model1/confusion-matrix` | Confusion matrix data |
| GET | `/model1/confusion-matrix/image` | Confusion matrix image |
| GET | `/model1/roc-curve` | ROC curve data |
| GET | `/model1/roc-curve/image` | ROC curve image |

The exact availability of each endpoint depends on the current FastAPI implementation.

## 9.3 AI Agent Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai-agent/solutions` | Generate AI analysis |
| GET | `/ai-agent/health` | Check AI Agent status |

---

# 10. Frontend Application

The frontend is developed using Angular and TypeScript.

## 10.1 Model 1 Pages

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

## 10.2 Routes

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

## 10.3 Frontend Data Flow

```text
User
 │
 ▼
Model Page
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
LightGBM Model
 │
 ▼
Prediction and Probability
 │
 ├── Dashboard
 ├── Analytics
 ├── Explainability
 ├── Historique
 ├── AI Assistant
 └── Notifications
```

The Angular API service manages communication between the frontend and FastAPI.

---

# 11. Prediction History and Local Storage

The application maintains prediction information to support historical review and monitoring.

```text
Browser
   │
   ▼
localStorage
   │
   ▼
SLA Prediction History
```

Main storage keys include:

```text
predictionHistory
latestPredictionExplanation
qualityInsightNotifications
```

## History Page

Route:

```text
/historique
```

The history page allows users to:

- Review previous SLA predictions.
- Inspect risk levels and probabilities.
- Identify high-risk incidents.
- Review historical prediction information.
- Export historical data when supported.

The latest prediction context can also support the dashboard, explainability, AI Assistant and notification workflows.

> `localStorage` is client-side storage. For production use, it should be complemented or replaced by persistent server-side storage, particularly for multi-user access.

---

# 12. Notifications

The notification center highlights incidents that may require operational attention.

## Notification Workflow

```text
SLA Prediction
      │
      ▼
Risk Evaluation
      │
      ▼
Notification Generation
      │
      ▼
Notification Display
      │
      ▼
User Reviews Notification
      │
      ▼
Mark as Treated / Remove
```

## Notifications Route

```text
/notification
```

The notification interface supports the application's configured notification-management features, including:

- Viewing notifications.
- Identifying high-risk incidents.
- Marking notifications as treated.
- Removing notifications.
- Reviewing notifications associated with SLA predictions.

The configured SLA target is **5 days**.

---

# 13. Frontend Structure

The Angular application follows this structure:

```text
quality-insight-angular/
│
├── src/
│   │
│   ├── app/
│   │   │
│   │   ├── pages/
│   │   │   ├── home/
│   │   │   ├── dashboard/
│   │   │   ├── analytics/
│   │   │   ├── model/
│   │   │   ├── explainability/
│   │   │   ├── historique/
│   │   │   ├── ai-assistant/
│   │   │   └── notification/
│   │   │
│   │   ├── components/
│   │   ├── services/
│   │   ├── models/
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   └── app.routes.ts
│   │
│   ├── assets/
│   ├── styles.css
│   └── index.html
│
├── angular.json
├── package.json
├── package-lock.json
├── tsconfig.json
└── ...
```

## Page Responsibilities

| Page | Responsibility |
|---|---|
| `home` | Application entry point |
| `model` | SLA breach prediction |
| `dashboard` | SLA risk overview |
| `analytics` | SLA risk analytics |
| `explainability` | Model explanations |
| `historique` | Prediction history |
| `ai-assistant` | AI-powered SLA analysis |
| `notification` | SLA risk notifications |

## Services

```text
services/
│
├── api.service.ts
├── notification.service.ts
└── ...
```

The API service can handle:

- SLA predictions
- Batch predictions
- Prediction explanations
- Feature importance
- Model information
- AI Agent requests
- Backend health checks

---

# 14. Complete Project Structure

```text
Quality-Insight-AI-Intelligent-SLA-Risk-Prediction/
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
│   ├── routers/
│   └── ...
│
├── quality-insight-angular/
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/
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
│   └── ...
│
├── .gitignore
├── README.md
└── ...
```

---

# 15. Prerequisites

Install the following tools:

- Python 3.10+
- Node.js
- npm
- Angular CLI
- Git

Verify the installations:

```bash
python --version
node --version
npm --version
git --version
ng version
```

---

# 16. Installation

## 16.1 Clone the Repository

```bash
git clone <repository-url>
cd Quality-Insight-AI-Intelligent-SLA-Risk-Prediction
```

Replace `<repository-url>` with the actual repository URL.

## 16.2 Backend Installation

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

## 16.3 Frontend Installation

Open another terminal and navigate to the Angular project:

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

# 17. Environment Configuration

Create the following file:

```text
backend/.env
```

Example configuration:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

Replace `your_groq_api_key` with your own API key.

**Security note:** Do not commit `.env` or API keys to a public repository. Add the file to `.gitignore`.

---

# 18. Running the Application

The application consists of two services:

```text
Angular Frontend
       +
FastAPI Backend
```

Both services must be running.

## 18.1 Start the Backend

From the backend directory, activate the virtual environment and run:

```bash
uvicorn main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

## 18.2 Start the Frontend

Open another terminal:

```bash
cd quality-insight-angular
ng serve
```

Open the application:

```text
http://localhost:4200
```

## Application URLs

| Component | URL |
|---|---|
| Angular | `http://localhost:4200` |
| FastAPI | `http://127.0.0.1:8000` |
| Swagger | `http://127.0.0.1:8000/docs` |
| OpenAPI | `http://127.0.0.1:8000/openapi.json` |

---

# 19. API Testing

## 19.1 Health Check

Open:

```text
http://127.0.0.1:8000/health
```

The endpoint should report the backend's health and available model status.

## 19.2 Swagger

Open:

```text
http://127.0.0.1:8000/docs
```

Use Swagger to inspect endpoints, review request schemas, send test requests and examine responses.

## 19.3 SLA Prediction

Send a request to:

```text
POST /model1/predict
```

The workflow is:

```text
Incident Data
      ↓
SLA Prediction
      ↓
Probability
      ↓
Risk Level
```

## 19.4 Prediction Explanation

Send a request to:

```text
POST /model1/predict/explain
```

This endpoint returns an explanation if implemented and available in the running backend.

## 19.5 AI Agent

Endpoint:

```text
POST /ai-agent/solutions
```

The request may contain:

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

Use the request schema displayed in Swagger to construct valid requests.

---

# 20. Machine Learning Workflow

The complete workflow is:

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
SLA Prediction
     ↓
Risk Classification
     ↓
Explainability
     ↓
Prediction History
     ↓
AI Assistant
     ↓
Notifications
```

## SLA Prediction Workflow

```text
Incident
   ↓
Feature Engineering
   ↓
LightGBM Classifier
   ↓
SLA Breach Probability
   ↓
HIGH / MEDIUM / LOW
   ↓
Explanation
   ↓
Dashboard / Analytics / History
   ↓
AI Assistant
   ↓
Notification
   ↓
Preventive Action
```

---

# 21. Model Performance

The current evaluation results for the SLA breach classifier are:

| Metric | Result |
|---|---:|
| Accuracy | 76% |
| Precision | 60% |
| Recall | 65% |
| F1 Score | 62% |
| ROC-AUC | 82% |

These metrics describe the model's current evaluation performance. They should be interpreted in the context of the dataset, evaluation split, class distribution and chosen decision threshold.

The model supports risk prioritization but should not replace operational judgment.

---

# 22. Project Objectives

The main objectives of Quality Insight AI are to:

1. Predict SLA breach risk.
2. Estimate the probability of late incident resolution.
3. Identify high-risk incidents.
4. Classify incidents into risk levels.
5. Explain Machine Learning predictions.
6. Provide feature importance and SHAP analysis.
7. Centralize SLA prediction history.
8. Provide interactive dashboards and analytics.
9. Integrate an AI Assistant for risk analysis.
10. Recommend preventive and corrective actions.
11. Notify users about incidents requiring attention.
12. Support proactive quality monitoring.
13. Improve data-driven operational decisions.

---

# 23. Future Improvements

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
- Probability calibration
- Advanced feature engineering
- Model drift detection
- Automated model evaluation

## Explainable AI

- More detailed SHAP explanations
- Global and local explanations
- Prediction comparison
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
- Automated quality reports
- AI-generated action plans
- AI-assisted root-cause investigation
- Natural-language analytics
- Automated daily risk summaries

---

# Final Architecture

```text
                      QUALITY INSIGHT AI
                              │
                              ▼
                    MODEL 1 — SLA BREACH
                              │
               ┌──────────────┼──────────────┐
               │              │              │
               ▼              ▼              ▼
             Model         Dashboard      Analytics
               │              │              │
               └──────────────┼──────────────┘
                              │
                              ▼
                        Explainability
                              │
                              ▼
                          Historique
                              │
                              ▼
                         AI Assistant
                              │
                              ▼
                         Notifications
                              │
                              ▼
                      QUALITY MONITORING
                              │
                              ▼
                       PROACTIVE ACTION
```

Quality Insight AI provides a complete platform for **predicting, explaining, monitoring and managing SLA breach risks** through Machine Learning, Explainable AI and Generative AI.
