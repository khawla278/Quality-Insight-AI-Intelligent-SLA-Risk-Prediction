import {
  Injectable,
  inject
} from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  BatchPredictionResponse,
  ExplanationResponse,
  FeaturesResponse,
  HealthResponse,
  ImportanceResponse,
  IncidentRequest,
  PredictionResponse,
  CrossrailNcrPrediction,
  CrossrailNcrRequest,
  CrossrailModelInfo
} from '../models/api.models';


@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly http =
    inject(HttpClient);

  private readonly baseUrl =
    'http://127.0.0.1:8000';


  health(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(
      `${this.baseUrl}/health`
    );
  }


  features(): Observable<FeaturesResponse> {
    return this.http.get<FeaturesResponse>(
      `${this.baseUrl}/features`
    );
  }


  predict(
    payload: IncidentRequest
  ): Observable<PredictionResponse> {
    return this.http.post<PredictionResponse>(
      `${this.baseUrl}/predict`,
      payload
    );
  }


  explain(
    payload: IncidentRequest,
    topN: number = 8
  ): Observable<ExplanationResponse> {

    const params =
      new HttpParams().set(
        'top_n',
        String(topN)
      );

    return this.http.post<ExplanationResponse>(
      `${this.baseUrl}/predict/explain`,
      payload,
      {
        params
      }
    );
  }


  featureImportance(
    topN: number = 20
  ): Observable<ImportanceResponse> {

    const params =
      new HttpParams().set(
        'top_n',
        String(topN)
      );

    return this.http.get<ImportanceResponse>(
      `${this.baseUrl}/model/feature-importance`,
      {
        params
      }
    );
  }


  predictBatch(
    incidents: IncidentRequest[]
  ): Observable<BatchPredictionResponse> {

    return this.http.post<BatchPredictionResponse>(
      `${this.baseUrl}/predict/batch`,
      {
        incidents
      }
    );
  }


  crossrailPredict(
    payload: CrossrailNcrRequest
  ): Observable<CrossrailNcrPrediction> {

    return this.http.post<CrossrailNcrPrediction>(
      `${this.baseUrl}/crossrail/predict`,
      payload
    );
  }

  crossrailModel(): Observable<CrossrailModelInfo> {
    return this.http.get<CrossrailModelInfo>(
      `${this.baseUrl}/crossrail/model`
    );
  }

}
