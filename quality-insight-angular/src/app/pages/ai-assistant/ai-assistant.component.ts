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
  RiskLevel,
  PredictionResponse
} from '../../models/api.models';


// ============================================================
// CHAT MESSAGE
// ============================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}


// ============================================================
// HISTORY
// ============================================================

interface AssistantHistoryItem {
  risk: RiskLevel;
  probability: number;
  date: string;
  title?: string;
  source?: string;
  input?: Record<string, unknown>;
}


// ============================================================
// LATEST PREDICTION STORAGE
// ============================================================

interface LatestPredictionStorage {
  prediction?: PredictionResponse;
  input?: Record<string, unknown>;
  title?: string;
  source?: string;
  createdAt?: string;
}


// ============================================================
// AI BACKEND RESPONSE
// ============================================================

interface AIAgentResponse {
  success?: boolean;
  question?: string;
  risk_level?: string;
  probability?: number;
  prediction?: string;
  intent?: string;
  summary?: string;
  risk_analysis?: string;
  immediate_actions?: string[];
  preventive_actions?: string[];
  recommended_actions?: string[];
  monitoring_actions?: string[];
  priority?: string;
  expected_outcome?: string;
  llm_model?: string;
  generated_by?: string;
  answer?: string;
  response?: string;
  content?: string;
  message?: string;
}


// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.css'
})
export class AiAssistantComponent
  implements OnInit, OnDestroy {

  // ==========================================================
  // API
  // ==========================================================

  private readonly API_URL =
    'http://127.0.0.1:8000';

  private readonly AI_ENDPOINT =
    '/ai-agent/solutions';


  // ==========================================================
  // LOCAL STORAGE
  // ==========================================================

  private readonly HISTORY_KEY =
    'predictionHistory';

  private readonly LATEST_PREDICTION_KEY =
    'latestPrediction';


  // ==========================================================
  // CHAT
  // ==========================================================

  messages: ChatMessage[] = [];

  question = '';

  loading = false;

  errorMessage = '';


  // ==========================================================
  // PREDICTION DATA
  // ==========================================================

  history: AssistantHistoryItem[] = [];

  latestHighPrediction:
    PredictionResponse |
    AssistantHistoryItem |
    null = null;

  latestPrediction:
    PredictionResponse |
    AssistantHistoryItem |
    null = null;

  latestHighInput:
    Record<string, unknown> | null = null;

  latestPredictionInput:
    Record<string, unknown> | null = null;

  latestHighTitle = '';

  latestHighSource = '';

  latestHighCreatedAt = '';

  latestPredictionTitle = '';

  latestPredictionSource = '';

  latestPredictionCreatedAt = '';


  // ==========================================================
  // STATISTICS
  // ==========================================================

  totalPredictions = 0;

  highCount = 0;

  mediumCount = 0;

  lowCount = 0;

  highPercentage = 0;

  mediumPercentage = 0;

  lowPercentage = 0;

  averageProbability = 0;

  maximumProbability = 0;

  minimumProbability = 0;


  // ==========================================================
  // REFRESH
  // ==========================================================

  private refreshInterval:
    ReturnType<typeof setInterval> | null = null;

  private lastSnapshot = '';


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.loadAllData();

    this.addInitialMessage();

    this.lastSnapshot =
      this.getStorageSnapshot();

    this.refreshInterval =
      setInterval(
        () => this.checkForDataChanges(),
        1000
      );
  }


  // ==========================================================
  // DESTROY
  // ==========================================================

  ngOnDestroy(): void {

    if (this.refreshInterval !== null) {

      clearInterval(
        this.refreshInterval
      );

      this.refreshInterval = null;
    }
  }


  // ==========================================================
  // LOAD ALL DATA
  // ==========================================================

  private loadAllData(): void {

    this.loadHistory();

    this.loadLatestPrediction();

    this.calculateStatistics();
  }


  // ==========================================================
  // INITIAL MESSAGE
  // ==========================================================

  private addInitialMessage(): void {

    if (this.messages.length > 0) {
      return;
    }

    this.messages.push({

      role: 'assistant',

      content:
        `Hello! I am Quality Insight AI.

I can answer free-form questions about:

• SLA management
• SLA breach risk
• Incident prioritization
• Service quality
• HIGH, MEDIUM and LOW risk
• Prediction analysis
• Preventive actions
• Corrective actions
• Risk reduction
• Incident management
• Root cause analysis
• Operational monitoring
• Prediction statistics`,

      createdAt:
        new Date().toISOString()
    });
  }


  // ==========================================================
  // LOAD HISTORY
  // ==========================================================

  private loadHistory(): void {

    try {

      const stored =
        localStorage.getItem(
          this.HISTORY_KEY
        );

      if (!stored) {

        this.history = [];

        return;
      }

      const parsed: unknown =
        JSON.parse(stored);

      if (!Array.isArray(parsed)) {

        this.history = [];

        return;
      }

      const normalized:
        AssistantHistoryItem[] = [];

      for (const raw of parsed) {

        if (
          !raw ||
          typeof raw !== 'object'
        ) {
          continue;
        }

        const item =
          raw as Record<string, unknown>;

        const risk =
          this.normalizeRisk(
            item['risk'] ??
            item['risk_level'] ??
            item['prediction']
          );

        const probability =
          this.normalizeProbability(
            item['probability'] ??
            item['confidence'] ??
            item['risk_probability'] ??
            item['probability_score']
          );

        normalized.push({

          risk,

          probability,

          date:
            this.getHistoryDate(item),

          title:
            item['title'] !== undefined
              ? String(item['title'])
              : '',

          source:
            item['source'] !== undefined
              ? String(item['source'])
              : '',

          input:
            this.isRecord(
              item['input']
            )
              ? item['input']
              : undefined
        });
      }

      this.history =
        normalized.sort(
          (a, b) =>
            this.getDateTimestamp(b.date) -
            this.getDateTimestamp(a.date)
        );

    }
    catch (error) {

      console.error(
        'Unable to load prediction history:',
        error
      );

      this.history = [];
    }
  }


  // ==========================================================
  // LOAD LATEST PREDICTION
  // ==========================================================

  private loadLatestPrediction(): void {

    this.latestPrediction = null;

    this.latestHighPrediction = null;

    this.latestPredictionInput = null;

    this.latestHighInput = null;

    this.latestPredictionTitle = '';

    this.latestPredictionSource = '';

    this.latestPredictionCreatedAt = '';

    this.latestHighTitle = '';

    this.latestHighSource = '';

    this.latestHighCreatedAt = '';


    let storage:
      LatestPredictionStorage | null = null;

    try {

      const raw =
        localStorage.getItem(
          this.LATEST_PREDICTION_KEY
        );

      if (raw) {

        const parsed: unknown =
          JSON.parse(raw);

        if (
          parsed &&
          typeof parsed === 'object'
        ) {

          storage =
            parsed as LatestPredictionStorage;
        }
      }

    }
    catch (error) {

      console.error(
        'Unable to load latest prediction:',
        error
      );
    }


    const latest =
      storage?.prediction;

    const storageDate =
      storage?.createdAt
        ? this.getDateTimestamp(
            storage.createdAt
          )
        : 0;


    // ========================================================
    // LATEST PREDICTION
    // ========================================================

    if (latest) {

      this.latestPrediction =
        latest;

      this.latestPredictionInput =
        storage?.input ?? null;

      this.latestPredictionTitle =
        String(
          storage?.title ?? ''
        );

      this.latestPredictionSource =
        String(
          storage?.source ?? 'DASHBOARD'
        );

      this.latestPredictionCreatedAt =
        String(
          storage?.createdAt ?? ''
        );
    }


    // ========================================================
    // FIND LATEST HIGH
    // ========================================================

    const highItems =
      this.history.filter(
        item =>
          item.risk === 'HIGH'
      );

    let historyLatestHigh:
      AssistantHistoryItem | null = null;

    if (highItems.length > 0) {

      historyLatestHigh =
        highItems.reduce(
          (
            latestItem,
            currentItem
          ) => {

            if (!latestItem) {
              return currentItem;
            }

            return (
              this.getDateTimestamp(
                currentItem.date
              ) >
              this.getDateTimestamp(
                latestItem.date
              )
            )
              ? currentItem
              : latestItem;
          },
          null as
            AssistantHistoryItem |
            null
        );
    }

    const historyHighDate =
      historyLatestHigh
        ? this.getDateTimestamp(
            historyLatestHigh.date
          )
        : 0;


    const latestIsHigh =
      latest !== undefined &&
      this.normalizeRisk(
        this.getPredictionRiskValue(
          latest
        )
      ) === 'HIGH';


    // ========================================================
    // MOST RECENT HIGH
    // ========================================================

    if (
      latest &&
      latestIsHigh &&
      (
        !historyLatestHigh ||
        storageDate >= historyHighDate
      )
    ) {

      this.latestHighPrediction =
        latest;

      this.latestHighInput =
        storage?.input ?? null;

      this.latestHighTitle =
        String(
          storage?.title ?? ''
        );

      this.latestHighSource =
        String(
          storage?.source ?? 'DASHBOARD'
        );

      this.latestHighCreatedAt =
        String(
          storage?.createdAt ?? ''
        );

      return;
    }

    if (historyLatestHigh) {

      this.latestHighPrediction =
        historyLatestHigh;

      this.latestHighInput =
        historyLatestHigh.input ?? null;

      this.latestHighTitle =
        historyLatestHigh.title ?? '';

      this.latestHighSource =
        historyLatestHigh.source ?? '';

      this.latestHighCreatedAt =
        historyLatestHigh.date;
    }
  }


  // ==========================================================
  // CALCULATE STATISTICS
  // ==========================================================

  private calculateStatistics(): void {

    this.totalPredictions =
      this.history.length;

    this.highCount =
      this.history.filter(
        item =>
          item.risk === 'HIGH'
      ).length;

    this.mediumCount =
      this.history.filter(
        item =>
          item.risk === 'MEDIUM'
      ).length;

    this.lowCount =
      this.history.filter(
        item =>
          item.risk === 'LOW'
      ).length;

    if (
      this.totalPredictions === 0
    ) {

      this.highPercentage = 0;
      this.mediumPercentage = 0;
      this.lowPercentage = 0;
      this.averageProbability = 0;
      this.maximumProbability = 0;
      this.minimumProbability = 0;

      return;
    }

    this.highPercentage =
      (
        this.highCount /
        this.totalPredictions
      ) * 100;

    this.mediumPercentage =
      (
        this.mediumCount /
        this.totalPredictions
      ) * 100;

    this.lowPercentage =
      (
        this.lowCount /
        this.totalPredictions
      ) * 100;

    const probabilities =
      this.history
        .map(
          item =>
            item.probability
        )
        .filter(
          value =>
            Number.isFinite(value)
        );

    if (
      probabilities.length === 0
    ) {

      this.averageProbability = 0;
      this.maximumProbability = 0;
      this.minimumProbability = 0;

      return;
    }

    this.averageProbability =
      probabilities.reduce(
        (
          sum,
          value
        ) =>
          sum + value,
        0
      ) /
      probabilities.length;

    this.maximumProbability =
      Math.max(
        ...probabilities
      );

    this.minimumProbability =
      Math.min(
        ...probabilities
      );
  }


  // ==========================================================
  // PUBLIC LATEST PROBABILITY
  // IMPORTANT: USED BY HTML
  // ==========================================================

  getPredictionProbabilityPublic(): number {

    if (!this.latestPrediction) {
      return 0;
    }

    return this.getPredictionProbability(
      this.latestPrediction
    );
  }


  // ==========================================================
  // PUBLIC LATEST RISK
  // ==========================================================

  getLatestRisk(): RiskLevel {

    if (!this.latestPrediction) {
      return 'LOW';
    }

    return this.getPredictionRisk(
      this.latestPrediction
    );
  }


  // ==========================================================
  // PUBLIC LATEST DATE
  // ==========================================================

  getLatestPredictionDate(): string {

    return this.latestPredictionCreatedAt;
  }


  // ==========================================================
  // PUBLIC LATEST TITLE
  // ==========================================================

  getLatestPredictionTitle(): string {

    return this.latestPredictionTitle || '—';
  }


  // ==========================================================
  // PUBLIC LATEST SOURCE
  // ==========================================================

  getLatestPredictionSource(): string {

    return this.latestPredictionSource || 'DASHBOARD';
  }


  // ==========================================================
  // SEND QUESTION
  // ==========================================================

  async sendQuestion(): Promise<void> {

    const cleanQuestion =
      this.question.trim();

    if (
      !cleanQuestion ||
      this.loading
    ) {
      return;
    }

    this.messages.push({

      role: 'user',

      content:
        cleanQuestion,

      createdAt:
        new Date().toISOString()
    });

    this.question = '';

    this.loading = true;

    this.errorMessage = '';

    this.loadAllData();

    try {

      const localAnswer =
        this.tryLocalAnswer(
          cleanQuestion
        );

      if (localAnswer !== null) {

        this.messages.push({

          role: 'assistant',

          content:
            localAnswer,

          createdAt:
            new Date().toISOString()
        });

        return;
      }

      const answer =
        await this.askBackend(
          cleanQuestion
        );

      this.messages.push({

        role: 'assistant',

        content:
          this.cleanAIResponse(
            answer
          ),

        createdAt:
          new Date().toISOString()
      });

    }
    catch (error) {

      console.error(
        'AI Assistant error:',
        error
      );

      this.errorMessage =
        'The AI service is temporarily unavailable.';

      this.messages.push({

        role: 'assistant',

        content:
          this.buildThematicFallback(
            cleanQuestion
          ),

        createdAt:
          new Date().toISOString()
      });

    }
    finally {

      this.loading = false;
    }
  }


  // ==========================================================
  // BACKEND
  // ==========================================================

  private async askBackend(
    question: string
  ): Promise<string> {

    const latestPrediction =
      this.serializePrediction(
        this.latestPrediction
      );

    const latestHighPrediction =
      this.serializePrediction(
        this.latestHighPrediction
      );

    const currentRisk =
      this.latestPrediction
        ? this.getPredictionRisk(
            this.latestPrediction
          )
        : 'UNKNOWN';

    const currentProbability =
      this.latestPrediction
        ? this.getPredictionProbability(
            this.latestPrediction
          )
        : 0;

    const incident =
      this.latestPredictionInput ??
      this.latestHighInput ??
      {};

    const influentialFeatures =
      this.extractInfluentialFeatures(
        this.latestPrediction
      );

    const statistics = {

      total_predictions:
        this.totalPredictions,

      high_count:
        this.highCount,

      medium_count:
        this.mediumCount,

      low_count:
        this.lowCount,

      high_percentage:
        Number(
          this.highPercentage.toFixed(2)
        ),

      medium_percentage:
        Number(
          this.mediumPercentage.toFixed(2)
        ),

      low_percentage:
        Number(
          this.lowPercentage.toFixed(2)
        ),

      average_probability:
        Number(
          this.averageProbability.toFixed(6)
        ),

      maximum_probability:
        Number(
          this.maximumProbability.toFixed(6)
        ),

      minimum_probability:
        Number(
          this.minimumProbability.toFixed(6)
        ),

      latest_prediction:
        latestPrediction,

      latest_prediction_date:
        this.latestPredictionCreatedAt,

      latest_prediction_title:
        this.latestPredictionTitle,

      latest_prediction_source:
        this.latestPredictionSource,

      latest_high_prediction:
        latestHighPrediction,

      latest_high_prediction_date:
        this.latestHighCreatedAt,

      latest_high_title:
        this.latestHighTitle,

      latest_high_source:
        this.latestHighSource
    };

    const payload = {

      question,

      risk_level:
        currentRisk,

      prediction:
        currentRisk,

      probability:
        currentProbability,

      incident,

      influential_features:
        influentialFeatures,

      statistics,

      history:
        this.history.slice(
          0,
          50
        )
    };

    const response =
      await fetch(
        `${this.API_URL}${this.AI_ENDPOINT}`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            'Accept':
              'application/json'
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );

    if (!response.ok) {

      const errorText =
        await response.text();

      throw new Error(
        `AI service returned HTTP ${response.status}: ${errorText}`
      );
    }

    const data: unknown =
      await response.json();

    if (
      typeof data === 'string' &&
      data.trim()
    ) {

      return data.trim();
    }

    if (
      data &&
      typeof data === 'object'
    ) {

      return this.buildBackendAnswer(
        data as AIAgentResponse
      );
    }

    throw new Error(
      'The AI service returned an empty answer.'
    );
  }


  // ==========================================================
  // BACKEND ANSWER
  // ==========================================================

  private buildBackendAnswer(
    result: AIAgentResponse
  ): string {

    const directAnswer =
      result.answer ??
      result.response ??
      result.content ??
      result.message;

    if (
      typeof directAnswer === 'string' &&
      directAnswer.trim()
    ) {

      return directAnswer.trim();
    }

    const sections: string[] = [];

    if (result.summary?.trim()) {

      sections.push(
        result.summary.trim()
      );
    }

    if (result.risk_analysis?.trim()) {

      sections.push(
        `Risk analysis:\n${result.risk_analysis.trim()}`
      );
    }

    if (
      Array.isArray(result.immediate_actions) &&
      result.immediate_actions.length
    ) {

      sections.push(
        this.formatActionSection(
          'Immediate actions',
          result.immediate_actions
        )
      );
    }

    if (
      Array.isArray(result.preventive_actions) &&
      result.preventive_actions.length
    ) {

      sections.push(
        this.formatActionSection(
          'Preventive actions',
          result.preventive_actions
        )
      );
    }

    if (
      Array.isArray(result.recommended_actions) &&
      result.recommended_actions.length
    ) {

      sections.push(
        this.formatActionSection(
          'Recommended actions',
          result.recommended_actions
        )
      );
    }

    if (
      Array.isArray(result.monitoring_actions) &&
      result.monitoring_actions.length
    ) {

      sections.push(
        this.formatActionSection(
          'Monitoring actions',
          result.monitoring_actions
        )
      );
    }

    if (result.expected_outcome?.trim()) {

      sections.push(
        `Expected outcome:\n${result.expected_outcome.trim()}`
      );
    }

    return sections.length
      ? sections.join('\n\n')
      : 'The AI service processed the question but did not return a detailed explanation.';
  }


  // ==========================================================
  // ACTION FORMAT
  // ==========================================================

  private formatActionSection(
    title: string,
    actions: string[]
  ): string {

    const validActions =
      actions
        .filter(
          action =>
            typeof action === 'string' &&
            action.trim()
        )
        .map(
          action =>
            action.trim()
        );

    return validActions.length
      ? `${title}:\n${validActions
          .map(
            (action, index) =>
              `${index + 1}. ${action}`
          )
          .join('\n')}`
      : '';
  }


  // ==========================================================
  // LOCAL ANSWERS
  // ==========================================================

  private tryLocalAnswer(
    question: string
  ): string | null {

    const q =
      this.normalizeQuestion(
        question
      );

    if (
      this.matches(
        q,
        [
          'how many predictions',
          'total predictions',
          'total number of predictions',
          'number of predictions',
          'count of predictions',
          'combien de predictions',
          'nombre de predictions'
        ]
      )
    ) {

      return `There are ${this.totalPredictions} predictions in total.`;
    }

    if (
      this.matches(
        q,
        [
          'how many high predictions',
          'how many predictions are high',
          'number of high predictions',
          'number of high',
          'count high predictions',
          'high prediction count',
          'combien de high',
          'nombre de high'
        ]
      )
    ) {

      return `There are ${this.highCount} HIGH predictions.`;
    }

    if (
      this.matches(
        q,
        [
          'how many medium predictions',
          'how many predictions are medium',
          'number of medium predictions',
          'number of medium',
          'count medium predictions',
          'medium prediction count',
          'combien de medium',
          'nombre de medium'
        ]
      )
    ) {

      return `There are ${this.mediumCount} MEDIUM predictions.`;
    }

    if (
      this.matches(
        q,
        [
          'how many low predictions',
          'how many predictions are low',
          'number of low predictions',
          'number of low',
          'count low predictions',
          'low prediction count',
          'combien de low',
          'nombre de low'
        ]
      )
    ) {

      return `There are ${this.lowCount} LOW predictions.`;
    }

    if (
      this.matches(
        q,
        [
          'prediction statistics',
          'prediction summary',
          'statistics of predictions',
          'show statistics',
          'give me the prediction statistics',
          'prediction overview',
          'statistiques des predictions'
        ]
      )
    ) {

      return this.buildStatisticsAnswer();
    }

    if (
      this.matches(
        q,
        [
          'latest high prediction',
          'what is the latest high prediction',
          'what is the latest high',
          'last high prediction',
          'last high risk prediction'
        ]
      )
    ) {

      return this.buildLatestHighAnswer();
    }

    if (
      this.matches(
        q,
        [
          'what is the latest prediction',
          'latest prediction',
          'most recent prediction',
          'last prediction',
          'most recent risk prediction',
          'derniere prediction'
        ]
      )
    ) {

      return this.buildLatestPredictionAnswer();
    }

    return null;
  }


  // ==========================================================
  // LATEST HIGH
  // ==========================================================

  private buildLatestHighAnswer(): string {

    if (!this.latestHighPrediction) {

      return 'No HIGH prediction is currently available in the application.';
    }

    let answer =
      `The latest HIGH prediction has a probability of ${this.formatProbability(
        this.getLatestHighProbability()
      )}.`;

    if (this.latestHighCreatedAt) {

      answer +=
        `\n\nRecorded on: ${this.formatDateTime(
          this.latestHighCreatedAt
        )}.`;
    }

    if (this.latestHighTitle) {

      answer +=
        `\nIncident: ${this.latestHighTitle}.`;
    }

    if (this.latestHighSource) {

      answer +=
        `\nSource: ${this.latestHighSource}.`;
    }

    return answer;
  }


  // ==========================================================
  // LATEST PREDICTION
  // ==========================================================

  private buildLatestPredictionAnswer(): string {

    if (!this.latestPrediction) {

      return 'No latest prediction is currently available in the application.';
    }

    const risk =
      this.getPredictionRisk(
        this.latestPrediction
      );

    const probability =
      this.getPredictionProbability(
        this.latestPrediction
      );

    let answer =
      `The latest prediction is classified as ${risk} risk with a probability of ${this.formatProbability(
        probability
      )}.`;

    if (this.latestPredictionCreatedAt) {

      answer +=
        `\n\nRecorded on: ${this.formatDateTime(
          this.latestPredictionCreatedAt
        )}.`;
    }

    if (this.latestPredictionTitle) {

      answer +=
        `\nIncident: ${this.latestPredictionTitle}.`;
    }

    return answer;
  }


  // ==========================================================
  // STATISTICS ANSWER
  // ==========================================================

  private buildStatisticsAnswer(): string {

    return (
      `Current prediction statistics:\n\n` +

      `• Total predictions: ${this.totalPredictions}\n` +

      `• HIGH: ${this.highCount} (${this.formatPercent(
        this.highPercentage
      )})\n` +

      `• MEDIUM: ${this.mediumCount} (${this.formatPercent(
        this.mediumPercentage
      )})\n` +

      `• LOW: ${this.lowCount} (${this.formatPercent(
        this.lowPercentage
      )})\n\n` +

      `Average probability: ${this.formatProbability(
        this.averageProbability
      )}.`
    );
  }


  // ==========================================================
  // FALLBACK
  // ==========================================================

  private buildThematicFallback(
    question: string
  ): string {

    const q =
      this.normalizeQuestion(
        question
      );

    if (
      this.containsAny(
        q,
        [
          'prevent',
          'prevention',
          'reduce risk',
          'reduce the risk',
          'avoid risk',
          'avoid sla',
          'prevent sla',
          'how can we reduce',
          'how can we prevent',
          'what should we do',
          'what actions',
          'improve service quality',
          'incident prioritization',
          'prioritize incident'
        ]
      )
    ) {

      return (
        `The AI service is temporarily unavailable, but the general Quality Insight AI approach is:\n\n` +

        `1. Prioritize incidents according to their risk and SLA exposure.\n` +
        `2. Verify ownership and assignment.\n` +
        `3. Start investigation early.\n` +
        `4. Monitor the remaining SLA time.\n` +
        `5. Identify blockers and dependencies.\n` +
        `6. Apply appropriate corrective actions.\n` +
        `7. Monitor progress until resolution.\n` +
        `8. Escalate when the SLA deadline is approaching.`
      );
    }

    return (
      `I understand your question is related to Quality Insight AI.\n\n` +
      `The AI service is temporarily unavailable, so I cannot provide a reliable AI-generated answer to this specific question right now.\n\n` +
      `Please try again in a moment.`
    );
  }


  // ==========================================================
  // CLEAN RESPONSE
  // ==========================================================

  private cleanAIResponse(
    answer: string
  ): string {

    return answer?.trim()
      ? answer.trim()
      : 'The AI service did not return a valid answer.';
  }


  // ==========================================================
  // SERIALIZE
  // ==========================================================

  private serializePrediction(
    prediction:
      PredictionResponse |
      AssistantHistoryItem |
      null
  ): unknown {

    return prediction ?? null;
  }


  // ==========================================================
  // FEATURES
  // ==========================================================

  private extractInfluentialFeatures(
    prediction:
      PredictionResponse |
      AssistantHistoryItem |
      null
  ): unknown[] {

    if (!prediction) {
      return [];
    }

    const candidate =
      prediction as unknown as Record<
        string,
        unknown
      >;

    const features =
      candidate['influential_features'] ??
      candidate['influentialFeatures'] ??
      candidate['features'] ??
      [];

    return Array.isArray(features)
      ? features
      : [];
  }


  // ==========================================================
  // MATCH
  // ==========================================================

  private matches(
    question: string,
    phrases: string[]
  ): boolean {

    return phrases.some(
      phrase => {

        const normalized =
          this.normalizeQuestion(
            phrase
          );

        return (
          question === normalized ||
          question.includes(normalized)
        );
      }
    );
  }


  // ==========================================================
  // CONTAINS
  // ==========================================================

  private containsAny(
    question: string,
    words: string[]
  ): boolean {

    return words.some(
      word =>
        question.includes(
          this.normalizeQuestion(
            word
          )
        )
    );
  }


  // ==========================================================
  // NORMALIZE QUESTION
  // ==========================================================

  private normalizeQuestion(
    value: string
  ): string {

    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /[’']/g,
        ' '
      )
      .replace(
        /[^a-z0-9\s-]/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();
  }


  // ==========================================================
  // NORMALIZE RISK
  // ==========================================================

  private normalizeRisk(
    value: unknown
  ): RiskLevel {

    const normalized =
      String(
        value ?? ''
      )
        .trim()
        .toUpperCase();

    if (
      normalized.includes('HIGH')
    ) {

      return 'HIGH';
    }

    if (
      normalized.includes('MEDIUM') ||
      normalized === 'MED'
    ) {

      return 'MEDIUM';
    }

    return 'LOW';
  }


  // ==========================================================
  // NORMALIZE PROBABILITY
  // ==========================================================

  private normalizeProbability(
    value: unknown
  ): number {

    let probability =
      Number(value);

    if (
      !Number.isFinite(
        probability
      )
    ) {

      return 0;
    }

    if (
      probability > 1
    ) {

      probability /= 100;
    }

    return Math.min(
      Math.max(
        probability,
        0
      ),
      1
    );
  }


  // ==========================================================
  // HISTORY DATE
  // ==========================================================

  private getHistoryDate(
    item: Record<string, unknown>
  ): string {

    const candidates = [

      item['predictionDate'],
      item['prediction_date'],
      item['createdAt'],
      item['created_at'],
      item['timestamp'],
      item['prediction_timestamp'],
      item['predicted_at'],
      item['date']
    ];

    for (
      const value of candidates
    ) {

      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ''
      ) {
        continue;
      }

      const date =
        new Date(
          String(value)
        );

      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {

        return date.toISOString();
      }
    }

    return new Date().toISOString();
  }


  // ==========================================================
  // DATE TIMESTAMP
  // ==========================================================

  private getDateTimestamp(
    value: string
  ): number {

    const timestamp =
      new Date(
        value
      ).getTime();

    return Number.isNaN(
      timestamp
    )
      ? 0
      : timestamp;
  }


  // ==========================================================
  // RECORD
  // ==========================================================

  private isRecord(
    value: unknown
  ): value is Record<string, unknown> {

    return Boolean(
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    );
  }


  // ==========================================================
  // LATEST HIGH PROBABILITY
  // ==========================================================

  getLatestHighProbability(): number {

    if (!this.latestHighPrediction) {
      return 0;
    }

    return this.getPredictionProbability(
      this.latestHighPrediction
    );
  }


  // ==========================================================
  // RISK VALUE
  // ==========================================================

  private getPredictionRiskValue(
    prediction: PredictionResponse
  ): unknown {

    const candidate =
      prediction as unknown as Record<
        string,
        unknown
      >;

    return (
      candidate['risk_level'] ??
      candidate['risk'] ??
      candidate['prediction'] ??
      ''
    );
  }


  // ==========================================================
  // GET RISK
  // ==========================================================

  private getPredictionRisk(
    prediction:
      PredictionResponse |
      AssistantHistoryItem
  ): RiskLevel {

    const candidate =
      prediction as unknown as Record<
        string,
        unknown
      >;

    if (
      candidate['risk_level'] !== undefined
    ) {

      return this.normalizeRisk(
        candidate['risk_level']
      );
    }

    if (
      candidate['risk'] !== undefined
    ) {

      return this.normalizeRisk(
        candidate['risk']
      );
    }

    if (
      candidate['prediction'] !== undefined
    ) {

      return this.normalizeRisk(
        candidate['prediction']
      );
    }

    return 'LOW';
  }


  // ==========================================================
  // GET PROBABILITY
  // ==========================================================

  private getPredictionProbability(
    prediction:
      PredictionResponse |
      AssistantHistoryItem
  ): number {

    const candidate =
      prediction as unknown as Record<
        string,
        unknown
      >;

    const value =
      candidate['probability'] ??
      candidate['confidence'] ??
      candidate['risk_probability'] ??
      candidate['probability_score'];

    return this.normalizeProbability(
      value
    );
  }


  // ==========================================================
  // FORMAT PROBABILITY
  // ==========================================================

  formatProbability(
    value: number
  ): string {

    const percentage =
      value <= 1
        ? value * 100
        : value;

    return (
      percentage.toFixed(1)
    ) + '%';
  }


  // ==========================================================
  // FORMAT PERCENT
  // ==========================================================

  formatPercent(
    value: number
  ): string {

    return (
      value.toFixed(1)
    ) + '%';
  }


  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  formatDateTime(
    value: string
  ): string {

    if (!value) {
      return '—';
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '—';
    }

    return date.toLocaleString(
      'en-GB',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }


  // ==========================================================
  // STORAGE SNAPSHOT
  // ==========================================================

  private getStorageSnapshot(): string {

    return [

      localStorage.getItem(
        this.HISTORY_KEY
      ) ?? '',

      localStorage.getItem(
        this.LATEST_PREDICTION_KEY
      ) ?? ''

    ].join('||');
  }


  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  private checkForDataChanges(): void {

    const snapshot =
      this.getStorageSnapshot();

    if (
      snapshot ===
      this.lastSnapshot
    ) {

      return;
    }

    this.lastSnapshot =
      snapshot;

    this.loadAllData();
  }


  // ==========================================================
  // QUICK QUESTIONS
  // ==========================================================

  askLatestPrediction(): void {

    this.question =
      'What is the latest prediction?';

    void this.sendQuestion();
  }


  askStatistics(): void {

    this.question =
      'Give me the prediction statistics.';

    void this.sendQuestion();
  }


  askHighRisk(): void {

    this.question =
      'How many HIGH predictions are there?';

    void this.sendQuestion();
  }


  askWhyHigh(): void {

    this.question =
      'Why can a prediction be classified as HIGH risk, and what actions can reduce the risk?';

    void this.sendQuestion();
  }


  // ==========================================================
  // CLEAR CHAT
  // ==========================================================

  clearChat(): void {

    this.messages = [];

    this.question = '';

    this.errorMessage = '';

    this.addInitialMessage();
  }


  // ==========================================================
  // ENTER
  // ==========================================================

  onEnter(
    event: Event
  ): void {

    const keyboardEvent =
      event as KeyboardEvent;

    if (
      keyboardEvent.shiftKey
    ) {

      return;
    }

    keyboardEvent.preventDefault();

    if (
      this.question.trim() &&
      !this.loading
    ) {

      void this.sendQuestion();
    }
  }


  // ==========================================================
  // TRACK MESSAGE
  // ==========================================================

  trackMessage(
    index: number,
    message: ChatMessage
  ): string {

    return (
      `${message.role}-${index}-${message.createdAt}`
    );
  }

}