import {
  Component,
  OnInit,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  ApiService
} from '../../service/api.service';

import {
  ExplanationResponse,
  HealthResponse,
  HistoryItem,
  IncidentRequest,
  PredictionResponse,
  RiskLevel,
  NonConformanceRecord,
  NCState
} from '../../models/api.models';


// ============================================================
// INCIDENT STATE
// ============================================================

type IncidentState =
  | 'RAISED'
  | 'ASSIGNED'
  | 'UNDER_INVESTIGATION'
  | 'CORRECTIVE_ACTION'
  | 'CLOSED'
  | 'REJECTED';


// ============================================================
// INCIDENT FORM
// ============================================================

interface IncidentForm {

  title: string;

  incident_state:
    IncidentState | '';

  category: string;

  subcategory: string;

  u_symptom: string;

  assignment_group: string;

  assigned_to: string;

  impact: number;

  urgency: number;

  priority: number;

  date: string;

  time: string;

}


// ============================================================
// API ERROR
// ============================================================

interface ApiErrorShape {

  status?: number;

  error?: {

    detail?: unknown;

    message?: string;

  };

}


// ============================================================
// VALIDATION ERROR
// ============================================================

interface ValidationErrorItem {

  loc?: unknown[];

  msg?: string;

}


// ============================================================
// COMPONENT
// ============================================================

@Component({

  selector: 'app-dashboard',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './dashboard.component.html',

  styleUrl:
    './dashboard.component.css'

})
export class DashboardComponent
  implements OnInit {


  // ==========================================================
  // MATH
  // ==========================================================

  readonly Math = Math;


  // ==========================================================
  // API
  // ==========================================================

  private readonly api =
    inject(ApiService);


  // ==========================================================
  // CONNECTION STATUS
  // ==========================================================

  health =
    false;

  modelLoaded =
    false;

  loading =
    false;


  // ==========================================================
  // MESSAGES
  // ==========================================================

  errorMessage =
    '';

  successMessage =
    '';

  alertMessage =
    '';


  // ==========================================================
  // STEP NAVIGATION
  // ==========================================================

  currentStep =
    1;

  readonly totalSteps =
    3;


  // ==========================================================
  // BACKEND DATA
  // ==========================================================

  healthResponse:
    HealthResponse | null =
      null;


  /*
   * Current prediction only.
   *
   * This is the prediction currently displayed by Dashboard.
   *
   * It is NOT loaded from localStorage when Dashboard starts.
   */

  prediction:
    PredictionResponse | null =
      null;


  /*
   * Explanation currently displayed by Dashboard.
   */

  explanation:
    ExplanationResponse | null =
      null;


  // ==========================================================
  // PREDICTION HISTORY
  // ==========================================================

  predictionHistory:
    HistoryItem[] =
      [];


  // ==========================================================
  // INCIDENT FORM
  // ==========================================================

  incident:
    IncidentForm =
      this.createEmptyIncident();


  // ==========================================================
  // INITIALIZATION
  // ==========================================================

  ngOnInit(): void {

    this.loadHealth();

    this.loadPredictionHistory();

    /*
     * Do not restore the old prediction into the Dashboard UI.
     *
     * The last prediction remains available to Explainability
     * through localStorage['latestPrediction'].
     */

    this.clearCurrentPrediction();

  }


  // ==========================================================
  // CREATE EMPTY INCIDENT
  // ==========================================================

  private createEmptyIncident():
    IncidentForm {

    const now =
      new Date();


    return {

      title:
        '',

      incident_state:
        'RAISED',

      category:
        '',

      subcategory:
        '',

      u_symptom:
        '',

      assignment_group:
        '',

      assigned_to:
        '',

      impact:
        2,

      urgency:
        2,

      priority:
        3,

      date:
        this.formatDateForInput(
          now
        ),

      time:
        this.formatTimeForInput(
          now
        )

    };

  }


  // ==========================================================
  // DATE FORMAT
  // ==========================================================

  private formatDateForInput(
    date: Date
  ): string {

    return (

      `${date.getFullYear()}-` +

      `${String(
        date.getMonth() + 1
      ).padStart(2, '0')}-` +

      `${String(
        date.getDate()
      ).padStart(2, '0')}`

    );

  }


  // ==========================================================
  // TIME FORMAT
  // ==========================================================

  private formatTimeForInput(
    date: Date
  ): string {

    return (

      `${String(
        date.getHours()
      ).padStart(2, '0')}:` +

      `${String(
        date.getMinutes()
      ).padStart(2, '0')}`

    );

  }


  // ==========================================================
  // STEP NAVIGATION
  // ==========================================================

  goToStep(
    step: number
  ): void {

    if (
      step < 1 ||
      step > this.totalSteps
    ) {

      return;

    }


    this.currentStep =
      step;


    this.clearMessages();

  }


  // ==========================================================
  // NEXT STEP
  // ==========================================================

  nextStep(): void {

    if (
      !this.validateCurrentStep()
    ) {

      return;

    }


    if (
      this.currentStep <
      this.totalSteps
    ) {

      this.currentStep++;

      this.clearMessages();

    }

  }


  // ==========================================================
  // PREVIOUS STEP
  // ==========================================================

  previousStep(): void {

    if (
      this.currentStep > 1
    ) {

      this.currentStep--;

      this.clearMessages();

    }

  }


  // ==========================================================
  // STEP VALIDATION
  // ==========================================================

  private validateCurrentStep():
    boolean {

    if (
      this.currentStep === 1
    ) {

      if (

        !this.cleanString(
          this.incident.title
        )

        ||

        !this.cleanString(
          this.incident.category
        )

        ||

        !this.cleanString(
          this.incident.subcategory
        )

        ||

        !this.cleanString(
          this.incident.u_symptom
        )

      ) {

        this.errorMessage =
          'Please complete the title, category, subcategory and symptom.';

        return false;

      }

    }


    if (
      this.currentStep === 2
    ) {

      if (

        !this.cleanString(
          this.incident.incident_state
        )

        ||

        !this.cleanString(
          this.incident.assignment_group
        )

        ||

        !this.cleanString(
          this.incident.assigned_to
        )

      ) {

        this.errorMessage =
          'Please complete the state, assignment group and assigned user.';

        return false;

      }


      if (

        !this.isValidNumericLevel(
          this.incident.impact
        )

        ||

        !this.isValidNumericLevel(
          this.incident.urgency
        )

        ||

        !this.isValidNumericLevel(
          this.incident.priority
        )

      ) {

        this.errorMessage =
          'Impact, urgency and priority must be between 1 and 5.';

        return false;

      }

    }


    if (
      this.currentStep === 3
    ) {

      if (

        !this.cleanString(
          this.incident.date
        )

        ||

        !this.cleanString(
          this.incident.time
        )

      ) {

        this.errorMessage =
          'Date and time are required.';

        return false;

      }

    }


    return true;

  }


  // ==========================================================
  // HEALTH CHECK
  // ==========================================================

  loadHealth(): void {

    this.api
      .health()
      .subscribe({

        next:
          (
            response:
              HealthResponse
          ) => {

            this.healthResponse =
              response;


            this.health =
              response.status === 'healthy';


            this.modelLoaded =
              this.health &&
              response.model_loaded === true;


            if (
              this.modelLoaded
            ) {

              this.clearConnectionError();

            }

            else {

              this.errorMessage =
                response.load_error
                ??
                'The backend is running, but the ML model is not loaded.';

            }

          },


        error:
          (
            error: unknown
          ) => {

            console.error(
              'Health API error:',
              error
            );


            this.health =
              false;


            this.modelLoaded =
              false;


            this.healthResponse =
              null;


            this.errorMessage =
              this.extractApiError(
                error
              );

          }

      });

  }


  // ==========================================================
  // CURRENT RISK
  // ==========================================================

  get risk():
    RiskLevel | null {

    return (

      this.prediction
        ?.risk_level

      ??

      null

    );

  }


  // ==========================================================
  // PROBABILITY
  // ==========================================================

  get percentage():
    number {

    return (

      (
        this.prediction
          ?.probability

        ??

        0
      )

      *

      100

    );

  }


  // ==========================================================
  // CONFIDENCE
  // ==========================================================

  get confidencePercentage():
    number {

    return (

      (
        this.prediction
          ?.confidence

        ??

        0
      )

      *

      100

    );

  }


  // ==========================================================
  // TOTAL PREDICTIONS
  // ==========================================================

  get totalPredictions():
    number {

    return (
      this.predictionHistory.length
    );

  }


  // ==========================================================
  // HISTORY COMPATIBILITY
  // ==========================================================

  get history():
    HistoryItem[] {

    return (
      this.predictionHistory
    );

  }


  // ==========================================================
  // PROGRESS
  // ==========================================================

  get progressPercentage():
    number {

    return (

      (
        this.currentStep
        /
        this.totalSteps
      )

      *

      100

    );

  }


  // ==========================================================
  // PREDICT RISK
  // ==========================================================

  predictRisk(): void {

    if (
      this.loading
    ) {

      return;

    }


    this.clearMessages();


    /*
     * Clear only the Dashboard display.
     *
     * Do NOT delete latestPrediction from localStorage.
     */

    this.clearCurrentPrediction();


    if (
      !this.health
    ) {

      this.errorMessage =
        'The FastAPI backend is unavailable.';

      this.loadHealth();

      return;

    }


    if (
      !this.modelLoaded
    ) {

      this.errorMessage =
        'The ML model is not available.';

      this.loadHealth();

      return;

    }


    if (
      !this.isFormValid()
    ) {

      this.errorMessage =
        'Please complete all required fields correctly.';

      return;

    }


    let payload:
      IncidentRequest;


    try {

      payload =
        this.buildPredictionPayload();

    }

    catch (
      error: unknown
    ) {

      this.errorMessage =

        error instanceof Error

          ? error.message

          : 'The entered information is invalid.';

      return;

    }


    this.loading =
      true;


    this.api
      .explain(
        payload,
        8
      )
      .subscribe({

        // ====================================================
        // SUCCESS
        // ====================================================

        next:
          (
            response:
              ExplanationResponse
          ) => {

            this.loading =
              false;


            // ==================================================
            // CURRENT DASHBOARD RESULT
            // ==================================================

            this.explanation =
              response;


            this.prediction =
              response.prediction;


            // ==================================================
            // IMPORTANT
            //
            // SAVE THE EXACT LATEST PREDICTION GENERATED
            // BY THE DASHBOARD.
            //
            // Explainability reads this value.
            // ==================================================

            this.saveLatestPrediction(
              payload,
              response
            );


            // ==================================================
            // HISTORY
            // ==================================================

            const historyItem:
              HistoryItem =
              {

                title:
                  this.incident.title.trim(),

                risk:
                  response
                    .prediction
                    .risk_level,

                probability:
                  response
                    .prediction
                    .probability,

                date:
                  payload.opened_at,

                drivers:
                  [],

                input:
                  {

                    ...payload,

                    title:
                      this.incident.title.trim()

                  }

              };


            this.predictionHistory = [

              ...this.predictionHistory,

              historyItem

            ].slice(-100);


            this.savePredictionHistory();


            // ==================================================
            // NON-CONFORMANCE HISTORY
            // ==================================================

            this.savePredictionAsNonConformance(
              payload,
              response
            );


            // ==================================================
            // RISK ALERT
            // ==================================================

            this.setAlertMessage(
              response
                .prediction
                .risk_level
            );


            // ==================================================
            // SUCCESS
            // ==================================================

            this.successMessage =
              'Prediction generated successfully. ' +
              'The non-conformance has been added to the history.';

          },


        // ====================================================
        // ERROR
        // ====================================================

        error:
          (
            error: unknown
          ) => {

            console.error(
              'Prediction API error:',
              error
            );


            this.loading =
              false;


            this.clearCurrentPrediction();


            this.errorMessage =
              this.extractApiError(
                error
              );

          }

      });

  }


  // ==========================================================
  // SAVE LATEST PREDICTION
  //
  // THIS IS THE IMPORTANT NEW METHOD.
  //
  // It creates the single source of truth used by
  // Explainability.
  // ==========================================================

  private saveLatestPrediction(

    input:
      IncidentRequest,

    response:
      ExplanationResponse

  ): void {

    try {

      const latestPrediction = {

        prediction:
          response.prediction,

        input:
          {

            ...input,

            title:
              this.incident.title.trim()

          },

        title:
          this.incident.title.trim(),

        source:
          'DASHBOARD',

        createdAt:
          new Date().toISOString()

      };


      // ======================================================
      // LAST PREDICTION
      // ======================================================

      localStorage.setItem(

        'latestPrediction',

        JSON.stringify(
          latestPrediction
        )

      );


      // ======================================================
      // COMPLETE EXPLANATION
      // ======================================================

      localStorage.setItem(

        'latestPredictionExplanation',

        JSON.stringify(
          response
        )

      );


      console.log(
        'Latest Dashboard prediction saved:',
        latestPrediction
      );

    }

    catch (
      error: unknown
    ) {

      console.error(
        'Unable to save latest prediction:',
        error
      );

    }

  }


  // ==========================================================
  // CLEAR CURRENT PREDICTION
  //
  // IMPORTANT:
  // This clears only the Dashboard UI.
  //
  // It DOES NOT delete latestPrediction.
  // ==========================================================

  private clearCurrentPrediction():
    void {

    this.prediction =
      null;


    this.explanation =
      null;


    this.alertMessage =
      '';

  }


  // ==========================================================
  // BUILD PREDICTION PAYLOAD
  // ==========================================================

  private buildPredictionPayload():
    IncidentRequest {

    return {

      incident_state:
        this.cleanString(
          this.incident.incident_state
        ),

      category:
        this.cleanString(
          this.incident.category
        ),

      subcategory:
        this.cleanString(
          this.incident.subcategory
        ),

      u_symptom:
        this.cleanString(
          this.incident.u_symptom
        ),

      assignment_group:
        this.cleanString(
          this.incident.assignment_group
        ),

      assigned_to:
        this.cleanString(
          this.incident.assigned_to
        ),

      impact:
        this.normalizeNumericLevel(
          this.incident.impact,
          'impact'
        ),

      urgency:
        this.normalizeNumericLevel(
          this.incident.urgency,
          'urgency'
        ),

      priority:
        this.normalizeNumericLevel(
          this.incident.priority,
          'priority'
        ),

      opened_at:
        this.buildOpenedAt()

    };

  }


  // ==========================================================
  // BUILD OPENED AT
  // ==========================================================

  private buildOpenedAt():
    string {

    const date =
      this.cleanString(
        this.incident.date
      );


    const time =
      this.cleanString(
        this.incident.time
      );


    if (
      !date ||
      !time
    ) {

      throw new Error(
        'Date and time are required.'
      );

    }


    const localDateTime =
      new Date(
        `${date}T${time}:00`
      );


    if (
      Number.isNaN(
        localDateTime.getTime()
      )
    ) {

      throw new Error(
        'The date or time is invalid.'
      );

    }


    return (
      localDateTime.toISOString()
    );

  }


  // ==========================================================
  // CLEAN STRING
  // ==========================================================

  private cleanString(
    value: unknown
  ): string {

    return String(
      value ?? ''
    ).trim();

  }


  // ==========================================================
  // NORMALIZE NUMERIC LEVEL
  // ==========================================================

  private normalizeNumericLevel(
    value: unknown,
    fieldName: string
  ): number {

    const numericValue =
      Number(value);


    if (
      !Number.isFinite(
        numericValue
      )
    ) {

      throw new Error(
        `The ${fieldName} field must be numeric.`
      );

    }


    const normalizedValue =
      Math.round(
        numericValue
      );


    if (
      normalizedValue < 1
      ||
      normalizedValue > 5
    ) {

      throw new Error(
        `The ${fieldName} field must be between 1 and 5.`
      );

    }


    return normalizedValue;

  }


  // ==========================================================
  // VALID NUMERIC LEVEL
  // ==========================================================

  private isValidNumericLevel(
    value: unknown
  ): boolean {

    const numericValue =
      Number(value);


    return (

      Number.isFinite(
        numericValue
      )

      &&

      numericValue >= 1

      &&

      numericValue <= 5

    );

  }


  // ==========================================================
  // FULL FORM VALIDATION
  // ==========================================================

  isFormValid(): boolean {

    return (

      this.cleanString(
        this.incident.title
      ).length > 0

      &&

      this.cleanString(
        this.incident.incident_state
      ).length > 0

      &&

      this.cleanString(
        this.incident.category
      ).length > 0

      &&

      this.cleanString(
        this.incident.subcategory
      ).length > 0

      &&

      this.cleanString(
        this.incident.u_symptom
      ).length > 0

      &&

      this.cleanString(
        this.incident.assignment_group
      ).length > 0

      &&

      this.cleanString(
        this.incident.assigned_to
      ).length > 0

      &&

      this.cleanString(
        this.incident.date
      ).length > 0

      &&

      this.cleanString(
        this.incident.time
      ).length > 0

      &&

      this.isValidNumericLevel(
        this.incident.impact
      )

      &&

      this.isValidNumericLevel(
        this.incident.urgency
      )

      &&

      this.isValidNumericLevel(
        this.incident.priority
      )

    );

  }


  // ==========================================================
  // RISK ICON
  // ==========================================================

  riskIcon():
    string {

    switch (
      this.risk
    ) {

      case 'HIGH':

        return 'bi-exclamation-octagon-fill';

      case 'MEDIUM':

        return 'bi-exclamation-triangle-fill';

      case 'LOW':

        return 'bi-check-circle-fill';

      default:

        return 'bi-shield';

    }

  }


  // ==========================================================
  // RISK LEVEL
  // ==========================================================

  getRiskLevel(
    response:
      PredictionResponse | null
  ): RiskLevel {

    return (

      response
        ?.risk_level

      ??

      'LOW'

    );

  }


  // ==========================================================
  // RISK PERCENTAGE
  // ==========================================================

  getRiskPercentage():
    number {

    return (
      this.percentage
    );

  }


  // ==========================================================
  // RISK ICON COMPATIBILITY
  // ==========================================================

  getRiskIcon():
    string {

    return (
      this.riskIcon()
    );

  }


  // ==========================================================
  // RISK ALERT
  // ==========================================================

  private setAlertMessage(
    riskLevel:
      RiskLevel
  ): void {

    switch (
      riskLevel
    ) {

      case 'HIGH':

        this.alertMessage =
          'High risk of SLA breach. Immediate intervention is recommended.';

        break;

      case 'MEDIUM':

        this.alertMessage =
          'Medium risk of SLA breach. Close monitoring is recommended.';

        break;

      case 'LOW':

        this.alertMessage =
          'Low risk of SLA breach. Continue standard monitoring.';

        break;

    }

  }


  // ==========================================================
  // RESET FORM
  // ==========================================================

  resetForm(): void {

    this.incident =
      this.createEmptyIncident();


    this.clearCurrentPrediction();


    this.currentStep =
      1;


    this.loading =
      false;


    this.clearMessages();

  }


  // ==========================================================
  // LOAD PREDICTION HISTORY
  // ==========================================================

  private loadPredictionHistory():
    void {

    try {

      const stored =
        localStorage.getItem(
          'predictionHistory'
        );


      if (
        !stored
      ) {

        this.predictionHistory =
          [];

        return;

      }


      const parsed:
        unknown =
        JSON.parse(
          stored
        );


      if (
        !Array.isArray(
          parsed
        )
      ) {

        this.predictionHistory =
          [];

        return;

      }


      this.predictionHistory =

        parsed

          .filter(
            (
              item: unknown
            ): item is HistoryItem => {

              if (
                !item ||
                typeof item !== 'object'
              ) {

                return false;

              }


              const historyItem =
                item as Partial<HistoryItem>;


              return Boolean(

                historyItem.risk

                &&

                Number.isFinite(
                  Number(
                    historyItem.probability
                  )
                )

              );

            }
          )

          .map(
            (
              item: HistoryItem
            ): HistoryItem => {

              return {

                title:
                  String(
                    item.title
                    ??
                    item.input?.title
                    ??
                    'Incident prediction'
                  ),

                risk:
                  this.normalizeRisk(
                    item.risk
                  ),

                probability:
                  this.normalizeProbability(
                    item.probability
                  ),

                date:
                  String(
                    item.date
                    ??
                    new Date().toISOString()
                  ),

                drivers:
                  [],

                input:
                  item.input

              };

            }
          )

          .slice(-100);

    }

    catch (
      error: unknown
    ) {

      console.error(
        'Prediction history error:',
        error
      );


      this.predictionHistory =
        [];

    }

  }


  // ==========================================================
  // SAVE PREDICTION HISTORY
  // ==========================================================

  private savePredictionHistory():
    void {

    try {

      localStorage.setItem(

        'predictionHistory',

        JSON.stringify(
          this.predictionHistory
        )

      );

    }

    catch (
      error: unknown
    ) {

      console.error(
        'Prediction history save error:',
        error
      );

    }

  }


  // ==========================================================
  // SAVE NON-CONFORMANCE
  // ==========================================================

  private savePredictionAsNonConformance(

    input:
      IncidentRequest,

    response:
      ExplanationResponse

  ): void {

    try {

      const stored =
        localStorage.getItem(
          'nonConformanceHistory'
        );


      let records:
        NonConformanceRecord[] =
          [];


      if (
        stored
      ) {

        try {

          const parsed:
            unknown =
            JSON.parse(
              stored
            );


          if (
            Array.isArray(
              parsed
            )
          ) {

            records =
              parsed.filter(
                (
                  item: unknown
                ): item is NonConformanceRecord => {

                  if (
                    !item ||
                    typeof item !== 'object'
                  ) {

                    return false;

                  }


                  const record =
                    item as Partial<NonConformanceRecord>;


                  return Boolean(

                    record.ref

                    &&

                    record.title

                  );

                }
              );

          }

        }

        catch {

          records =
            [];

        }

      }


      const ref =
        this.generateNextNCRef(
          records
        );


      const title =
        this.generateNCTitle(
          {

            ...input,

            title:
              this.incident.title

          }
        );


      const record:
        NonConformanceRecord =
        {

          ref,

          title,

          category:
            input.category
            ||
            '—',

          assignment_group:
            input.assignment_group
            ||
            '—',

          state:
            this.normalizeNCState(
              input.incident_state
            ),

          risk:
            this.normalizeRisk(
              response
                .prediction
                .risk_level
            ),

          probability:
            this.normalizeProbability(
              response
                .prediction
                .probability
            ),

          raised:
            input.opened_at
            ||
            new Date().toISOString(),

          source:
            'DASHBOARD',

          input:
            {

              ...input,

              title:
                this.incident.title.trim()

            },

          prediction:
            response.prediction

        };


      records = [

        record,

        ...records

      ].slice(
        0,
        100
      );


      localStorage.setItem(

        'nonConformanceHistory',

        JSON.stringify(
          records
        )

      );

    }

    catch (
      error: unknown
    ) {

      console.error(
        'Non-conformance save error:',
        error
      );

    }

  }


  // ==========================================================
  // GENERATE NC REFERENCE
  // ==========================================================

  private generateNextNCRef(
    records:
      NonConformanceRecord[]
  ): string {

    let max =
      0;


    for (
      const record of records
    ) {

      const match =
        String(
          record.ref
        ).match(
          /NC-(\d+)/i
        );


      if (
        match
      ) {

        const number =
          Number(
            match[1]
          );


        if (
          Number.isFinite(number)
          &&
          number > max
        ) {

          max =
            number;

        }

      }

    }


    return (

      'NC-'

      +

      String(
        max + 1
      ).padStart(
        4,
        '0'
      )

    );

  }


  // ==========================================================
  // GENERATE NC TITLE
  // ==========================================================

  private generateNCTitle(
    input:
      Partial<IncidentRequest>
  ): string {

    const title =
      this.cleanString(
        input.title
      );


    if (
      title
    ) {

      return title;

    }


    const symptom =
      this.cleanString(
        input.u_symptom
      );


    if (
      symptom
    ) {

      return symptom;

    }


    const category =
      this.cleanString(
        input.category
      );


    const subcategory =
      this.cleanString(
        input.subcategory
      );


    if (
      category &&
      subcategory
    ) {

      return (
        category
        +
        ' - '
        +
        subcategory
      );

    }


    return 'Incident prediction';

  }


  // ==========================================================
  // NORMALIZE NC STATE
  // ==========================================================

  private normalizeNCState(
    value: unknown
  ): NCState {

    const state =
      this.cleanString(
        value
      )
        .toUpperCase()
        .replace(
          /[\s-]+/g,
          '_'
        );


    switch (
      state
    ) {

      case 'ASSIGNED':

        return 'ASSIGNED';

      case 'UNDER_INVESTIGATION':

      case 'INVESTIGATION':

      case 'IN_PROGRESS':

        return 'UNDER_INVESTIGATION';

      case 'CORRECTIVE_ACTION':

        return 'CORRECTIVE_ACTION';

      case 'CLOSED':

        return 'CLOSED';

      case 'REJECTED':

        return 'REJECTED';

      default:

        return 'RAISED';

    }

  }


  // ==========================================================
  // NORMALIZE RISK
  // ==========================================================

  private normalizeRisk(
    value: unknown
  ): RiskLevel {

    const risk =
      this.cleanString(
        value
      )
        .toUpperCase();


    if (
      risk.includes('HIGH')
    ) {

      return 'HIGH';

    }


    if (
      risk.includes('MEDIUM')
      ||
      risk.includes('MED')
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

      probability /=
        100;

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
  // API ERROR EXTRACTION
  // ==========================================================

  private extractApiError(
    error: unknown
  ): string {

    const apiError =
      error as ApiErrorShape;


    if (
      apiError?.status === 0
    ) {

      return (
        'Unable to connect to FastAPI on 127.0.0.1:8000. ' +
        'Please check the backend and CORS configuration.'
      );

    }


    const detail =
      apiError?.error?.detail;


    if (
      Array.isArray(
        detail
      )
    ) {

      return (

        detail

          .map(
            (
              raw: unknown
            ) => {

              const item =
                raw as ValidationErrorItem;


              const location =
                Array.isArray(
                  item.loc
                )
                  ? item.loc.join(
                      ' → '
                    )
                  : 'field';


              return (

                `${location}: ` +

                `${item.msg ?? 'Invalid value'}`

              );

            }
          )

          .join(
            ' | '
          )

      );

    }


    if (
      typeof detail === 'string'
    ) {

      return detail;

    }


    if (
      detail &&
      typeof detail === 'object'
    ) {

      const obj =
        detail as {

          message?: string;

          error?: string;

          load_error?: string;

        };


      return (

        obj.message

        ??

        obj.error

        ??

        obj.load_error

        ??

        JSON.stringify(
          obj
        )

      );

    }


    if (
      typeof apiError?.error?.message === 'string'
    ) {

      return (
        apiError.error.message
      );

    }


    switch (
      apiError?.status
    ) {

      case 400:

        return (
          'The prediction data is invalid.'
        );

      case 404:

        return (
          'The requested FastAPI endpoint was not found.'
        );

      case 422:

        return (
          'The data format is not accepted by FastAPI.'
        );

      case 500:

        return (
          'An internal error occurred during prediction.'
        );

      case 503:

        return (
          'The backend is available, but the ML model is not available.'
        );

      default:

        return (

          'API communication error'

          +

          (
            apiError?.status
              ? ` — HTTP ${apiError.status}`
              : ''
          )

          +

          '.'

        );

    }

  }


  // ==========================================================
  // CLEAR CONNECTION ERROR
  // ==========================================================

  private clearConnectionError():
    void {

    const message =
      this.errorMessage.toLowerCase();


    if (

      message.includes(
        'backend'
      )

      ||

      message.includes(
        'model'
      )

      ||

      message.includes(
        'fastapi'
      )

    ) {

      this.errorMessage =
        '';

    }

  }


  // ==========================================================
  // CLEAR ALL MESSAGES
  // ==========================================================

  private clearMessages():
    void {

    this.errorMessage =
      '';

    this.successMessage =
      '';

    this.alertMessage =
      '';

  }

}