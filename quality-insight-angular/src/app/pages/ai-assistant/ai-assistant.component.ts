import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  HttpClient,
  HttpClientModule
} from '@angular/common/http';


// ============================================================
// PREDICTION HISTORY
// ============================================================

interface PredictionHistoryItem {

  risk?: string;

  risk_level?: string;

  probability?: number;

  confidence?: number;

  date?: string;

  created_at?: string;

  timestamp?: string;

  prediction_date?: string;

  prediction?: string;

  drivers?: any[];

  influential_features?: any[];

  input?: any;

  incident?: any;
}


// ============================================================
// LATEST HIGH RISK
// ============================================================

interface LatestHighRiskPrediction {

  risk: string;

  probability: number;

  date: string;

  drivers: any[];

  input: any;

  prediction: string;
}


// ============================================================
// AI RESPONSE
// ============================================================

interface AIAgentResponse {

  success: boolean;

  question: string;

  intent: string;

  answer: string;

  risk_level: string;

  probability: number;

  prediction: string;

  llm_model: string;

  generated_by: string;

  summary: string | null;

  risk_analysis: string | null;

  immediate_actions: string[];

  recommended_actions: string[];

  preventive_actions: string[];

  monitoring_actions: string[];

  priority: string | null;

  expected_outcome: string | null;
}


// ============================================================
// COMPONENT
// ============================================================

@Component({

  selector: 'app-ai-assistant',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],

  templateUrl:
    './ai-assistant.component.html',

  styleUrls: [
    './ai-assistant.component.css'
  ]

})
export class AiAssistantComponent
  implements OnInit, OnDestroy {


  // ==========================================================
  // API
  // ==========================================================

  private readonly API_URL =
    'http://127.0.0.1:8000';


  // ==========================================================
  // LATEST HIGH RISK
  // ==========================================================

  latestHighRiskPrediction:
    LatestHighRiskPrediction | null = null;

  highRiskAvailable = false;


  // ==========================================================
  // AI AGENT
  // ==========================================================

  question = '';

  loading = false;

  errorMessage = '';

  aiResponse:
    AIAgentResponse | null = null;


  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(
    private readonly http: HttpClient
  ) {}


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.loadLatestHighRiskPrediction();

    window.addEventListener(
      'storage',
      this.handleStorageChange
    );
  }


  // ==========================================================
  // DESTROY
  // ==========================================================

  ngOnDestroy(): void {

    window.removeEventListener(
      'storage',
      this.handleStorageChange
    );
  }


  // ==========================================================
  // STORAGE CHANGE
  // ==========================================================

  private handleStorageChange = (
    event: StorageEvent
  ): void => {

    if (
      event.key === 'predictionHistory' ||
      event.key === 'latestPredictionExplanation'
    ) {

      this.loadLatestHighRiskPrediction();
    }
  };


  // ==========================================================
  // LOAD LATEST HIGH RISK
  // ==========================================================

  loadLatestHighRiskPrediction(): void {

    this.latestHighRiskPrediction = null;

    this.highRiskAvailable = false;

    const storedHistory =
      localStorage.getItem(
        'predictionHistory'
      );

    if (!storedHistory) {
      return;
    }

    try {

      const parsed: unknown =
        JSON.parse(storedHistory);

      if (!Array.isArray(parsed)) {
        return;
      }

      const history =
        parsed as PredictionHistoryItem[];


      // ------------------------------------------------------
      // HIGH ONLY
      // ------------------------------------------------------

      const highPredictions =
        history.filter(
          (item) =>
            this.isHighRisk(item)
        );


      if (highPredictions.length === 0) {
        return;
      }


      // ------------------------------------------------------
      // SORT NEWEST FIRST
      // ------------------------------------------------------

      highPredictions.sort(
        (a, b) => {

          const dateA =
            this.getHistoryDate(a);

          const dateB =
            this.getHistoryDate(b);

          return (
            this.getTimestamp(dateB) -
            this.getTimestamp(dateA)
          );
        }
      );


      // ------------------------------------------------------
      // LATEST HIGH
      // ------------------------------------------------------

      const latest =
        highPredictions[0];


      this.latestHighRiskPrediction = {

        risk: 'HIGH',

        probability:
          this.normalizeProbability(
            latest.probability
          ),

        date:
          this.getHistoryDate(
            latest
          ),

        drivers:
          this.extractDrivers(
            latest
          ),

        input:
          this.extractIncident(
            latest
          ),

        prediction:
          this.getPredictionValue(
            latest
          )

      };


      this.highRiskAvailable = true;


      console.log(
        'Latest HIGH-risk prediction:',
        this.latestHighRiskPrediction
      );

    }

    catch (error) {

      console.error(
        'Unable to load prediction history:',
        error
      );

      this.latestHighRiskPrediction = null;

      this.highRiskAvailable = false;
    }
  }


  // ==========================================================
  // CHECK HIGH RISK
  // ==========================================================

  private isHighRisk(
    item: PredictionHistoryItem
  ): boolean {

    const risk =
      String(
        item.risk ??
        item.risk_level ??
        ''
      )
      .trim()
      .toUpperCase();

    return risk === 'HIGH';
  }


  // ==========================================================
  // DATE
  // ==========================================================

  private getHistoryDate(
    item: PredictionHistoryItem
  ): string {

    return (
      item.date ??
      item.created_at ??
      item.timestamp ??
      item.prediction_date ??
      ''
    );
  }


  // ==========================================================
  // PREDICTION
  // ==========================================================

  private getPredictionValue(
    item: PredictionHistoryItem
  ): string {

    return (
      item.prediction
        ? String(item.prediction)
        : 'SLA_BREACH'
    );
  }


  // ==========================================================
  // INCIDENT
  // ==========================================================

  private extractIncident(
    item: PredictionHistoryItem
  ): any {

    if (
      item.input &&
      typeof item.input === 'object'
    ) {

      return item.input;
    }

    if (
      item.incident &&
      typeof item.incident === 'object'
    ) {

      return item.incident;
    }

    return {};
  }


  // ==========================================================
  // DRIVERS
  // ==========================================================

  private extractDrivers(
    item: PredictionHistoryItem
  ): any[] {

    if (
      Array.isArray(
        item.influential_features
      )
    ) {

      return item.influential_features;
    }

    if (
      Array.isArray(
        item.drivers
      )
    ) {

      return item.drivers;
    }

    return [];
  }


  // ==========================================================
  // TIMESTAMP
  // ==========================================================

  private getTimestamp(
    date: string
  ): number {

    if (!date) {
      return 0;
    }

    const timestamp =
      new Date(date).getTime();

    return Number.isNaN(timestamp)
      ? 0
      : timestamp;
  }


  // ==========================================================
  // NORMALIZE PROBABILITY
  // ==========================================================

  private normalizeProbability(
    probability: number | undefined
  ): number {

    if (
      probability === undefined ||
      probability === null
    ) {

      return 0;
    }

    const value =
      Number(probability);

    if (Number.isNaN(value)) {
      return 0;
    }


    // Backend returns 0.6919
    // Frontend displays 69.19%

    if (value >= 0 && value <= 1) {

      return value * 100;
    }


    // Already percentage

    return Math.min(
      Math.max(value, 0),
      100
    );
  }


  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  formatDate(
    date: string
  ): string {

    if (!date) {
      return '—';
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {

      return date;
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(parsedDate);
  }


  // ==========================================================
  // DRIVER NAME
  // ==========================================================

  getDriverName(
    driver: any
  ): string {

    if (!driver) {
      return 'Unknown factor';
    }

    return String(
      driver.feature ??
      driver.name ??
      driver.driver ??
      'Unknown factor'
    );
  }


  // ==========================================================
  // DRIVER IMPORTANCE
  // ==========================================================

  getDriverImportance(
    driver: any
  ): number {

    if (!driver) {
      return 0;
    }

    const value =
      Number(
        driver.importance ??
        driver.influence ??
        driver.value ??
        0
      );

    if (Number.isNaN(value)) {
      return 0;
    }

    const absolute =
      Math.abs(value);

    if (absolute <= 1) {

      return Math.min(
        absolute * 100,
        100
      );
    }

    return Math.min(
      absolute,
      100
    );
  }


  // ==========================================================
  // ASK AI
  // ==========================================================

  askAI(): void {

    this.errorMessage = '';

    const cleanQuestion =
      this.question.trim();


    if (!cleanQuestion) {

      this.errorMessage =
        'Please enter a question.';

      return;
    }


    if (!this.latestHighRiskPrediction) {

      this.errorMessage =
        'No HIGH-risk prediction is available.';

      return;
    }


    this.loading = true;

    this.aiResponse = null;


    const prediction =
      this.latestHighRiskPrediction;


    // ========================================================
    // EXACT PAYLOAD EXPECTED BY FASTAPI
    // ========================================================

    const request = {

      question:
        cleanQuestion,

      risk_level:
        prediction.risk,

      probability:
        prediction.probability / 100,

      prediction:
        prediction.prediction,

      incident:
        prediction.input ?? {},

      influential_features:
        prediction.drivers.map(
          (driver: any) => {

            if (
              driver &&
              typeof driver === 'object'
            ) {

              return {
                ...driver
              };
            }

            return {
              feature: String(driver)
            };
          }
        )

    };


    console.log(
      'AI AGENT REQUEST:',
      request
    );


    // ========================================================
    // POST /ai-agent/solutions
    // ========================================================

    this.http
      .post<AIAgentResponse>(
        `${this.API_URL}/ai-agent/solutions`,
        request
      )
      .subscribe({

        // ====================================================
        // SUCCESS
        // ====================================================

        next: (
          response: AIAgentResponse
        ) => {

          console.log(
            'AI AGENT RESPONSE:',
            response
          );

          this.aiResponse =
            this.normalizeAIResponse(
              response
            );

          this.loading = false;

          this.errorMessage = '';
        },


        // ====================================================
        // ERROR
        // ====================================================

        error: (
          error: any
        ) => {

          console.error(
            'AI AGENT ERROR:',
            error
          );

          this.loading = false;

          this.handleAIError(
            error
          );
        }

      });
  }


  // ==========================================================
  // NORMALIZE AI RESPONSE
  // ==========================================================

  private normalizeAIResponse(
    response: AIAgentResponse
  ): AIAgentResponse {

    return {

      ...response,

      summary:
        response.summary ?? null,

      risk_analysis:
        response.risk_analysis ?? null,

      immediate_actions:
        Array.isArray(
          response.immediate_actions
        )
          ? response.immediate_actions
          : [],

      recommended_actions:
        Array.isArray(
          response.recommended_actions
        )
          ? response.recommended_actions
          : [],

      preventive_actions:
        Array.isArray(
          response.preventive_actions
        )
          ? response.preventive_actions
          : [],

      monitoring_actions:
        Array.isArray(
          response.monitoring_actions
        )
          ? response.monitoring_actions
          : [],

      priority:
        response.priority ?? null,

      expected_outcome:
        response.expected_outcome ?? null

    };
  }


  // ==========================================================
  // HANDLE AI ERROR
  // ==========================================================

  private handleAIError(
    error: any
  ): void {

    // --------------------------------------------------------
    // FastAPI detail object
    // --------------------------------------------------------

    if (
      error?.error?.detail &&
      typeof error.error.detail === 'object'
    ) {

      const detail =
        error.error.detail;

      let message =
        detail.message ?? '';

      if (detail.hint) {

        message +=
          ` ${detail.hint}`;
      }

      this.errorMessage =
        message ||
        'AI Agent request failed.';

      return;
    }


    // --------------------------------------------------------
    // FastAPI detail string
    // --------------------------------------------------------

    if (
      typeof error?.error?.detail === 'string'
    ) {

      this.errorMessage =
        error.error.detail;

      return;
    }


    // --------------------------------------------------------
    // Generic message
    // --------------------------------------------------------

    if (
      typeof error?.error?.message === 'string'
    ) {

      this.errorMessage =
        error.error.message;

      return;
    }


    // --------------------------------------------------------
    // Connection error
    // --------------------------------------------------------

    if (error?.status === 0) {

      this.errorMessage =
        'Unable to connect to the AI backend. ' +
        'Make sure FastAPI is running on ' +
        'http://127.0.0.1:8000.';

      return;
    }


    // --------------------------------------------------------
    // Validation
    // --------------------------------------------------------

    if (error?.status === 422) {

      this.errorMessage =
        'The AI Agent request is invalid. ' +
        'Please check the data sent to the backend.';

      return;
    }


    // --------------------------------------------------------
    // Groq unavailable
    // --------------------------------------------------------

    if (error?.status === 503) {

      this.errorMessage =
        'The AI Agent is unavailable. ' +
        'Check the Groq configuration in the backend.';

      return;
    }


    // --------------------------------------------------------
    // Server error
    // --------------------------------------------------------

    if (error?.status === 500) {

      this.errorMessage =
        'The AI Agent encountered an internal server error. ' +
        'Check the FastAPI terminal.';

      return;
    }


    this.errorMessage =
      'Unable to generate AI recommendations.';
  }


  // ==========================================================
  // QUICK QUESTION
  // ==========================================================

  setImmediateQuestion(): void {

    this.question =
      'What are the immediate actions we should take to reduce this HIGH risk?';

    this.errorMessage = '';
  }


  setPreventiveQuestion(): void {

    this.question =
      'What preventive measures should we implement to avoid this risk?';

    this.errorMessage = '';
  }


  setStepByStepQuestion(): void {

    this.question =
      'Give me a step-by-step action plan to reduce this HIGH risk.';

    this.errorMessage = '';
  }


  // ==========================================================
  // CLEAR
  // ==========================================================

  clearQuestion(): void {

    this.question = '';

    this.aiResponse = null;

    this.errorMessage = '';
  }


  // ==========================================================
  // TRACK BY
  // ==========================================================

  trackByIndex(
    index: number
  ): number {

    return index;
  }

}