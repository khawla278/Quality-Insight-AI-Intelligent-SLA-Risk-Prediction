import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

import {
  Observable,
  throwError
} from 'rxjs';

import {
  catchError
} from 'rxjs/operators';


// ============================================================
// AI AGENT REQUEST
// EXACTLY COMPATIBLE WITH FASTAPI AIAgentRequest
// ============================================================

export interface AIAgentRequest {

  question: string;

  risk_level: string;

  probability: number;

  prediction: string;

  incident: Record<string, unknown>;

  influential_features:
    Array<Record<string, unknown>>;

  statistics:
    Record<string, unknown>;

  history:
    Array<Record<string, unknown>>;
}


// ============================================================
// AI AGENT RESPONSE
// EXACTLY COMPATIBLE WITH FASTAPI AIAgentResponse
// ============================================================

export interface AIAgentResponse {

  success: boolean;

  question: string;

  risk_level: string;

  probability: number;

  prediction: string;

  intent: string;

  summary: string;

  risk_analysis: string;

  immediate_actions: string[];

  preventive_actions: string[];

  recommended_actions: string[];

  monitoring_actions: string[];

  priority: string;

  expected_outcome: string;

  llm_model: string;

  generated_by: string;
}


// ============================================================
// AI AGENT HEALTH
// ============================================================

export interface AIAgentHealthResponse {

  available: boolean;

  model: string;

  provider: string;

  service: string;

  status: string;

  specialization: string[];

  capabilities: string[];

  ml_prediction_authoritative: boolean;

  statistics_from_application_only: boolean;
}


// ============================================================
// SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class AiAgentService {

  private readonly API_URL =
    'http://127.0.0.1:8000';

  private readonly AI_AGENT_URL =
    `${this.API_URL}/ai-agent/solutions`;

  private readonly AI_AGENT_HEALTH_URL =
    `${this.API_URL}/ai-agent/health`;


  constructor(
    private readonly http: HttpClient
  ) {}


  // ==========================================================
  // ASK AI AGENT
  // ==========================================================

  ask(
    request: AIAgentRequest
  ): Observable<AIAgentResponse> {

    return this.http
      .post<AIAgentResponse>(
        this.AI_AGENT_URL,
        request
      )
      .pipe(
        catchError(
          (
            error: HttpErrorResponse
          ) => {

            console.error(
              'AI Agent HTTP error:',
              error
            );

            return throwError(
              () => error
            );
          }
        )
      );
  }


  // ==========================================================
  // HEALTH
  // ==========================================================

  health():
    Observable<AIAgentHealthResponse> {

    return this.http
      .get<AIAgentHealthResponse>(
        this.AI_AGENT_HEALTH_URL
      )
      .pipe(
        catchError(
          (
            error: HttpErrorResponse
          ) => {

            console.error(
              'AI Agent health error:',
              error
            );

            return throwError(
              () => error
            );
          }
        )
      );
  }
}