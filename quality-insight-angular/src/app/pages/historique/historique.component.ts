import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  jsPDF
} from 'jspdf';

import {
  NonConformanceRecord,
  RiskLevel,
  IncidentRequest,
  NCState
} from '../../models/api.models';


// ============================================================
// FORMULAIRE
// ============================================================

interface NewNCForm {

  title: string;

  category: string;

  subcategory: string;

  symptom: string;

  assignment_group: string;

  assigned_to: string;

  impact: number;

  urgency: number;

  priority: number;

  state: NCState;

  opened_at: string;

}


// ============================================================
// API RESPONSE
// ============================================================

interface PredictionApiResponse {

  risk_level?: string;

  probability?: number;

  confidence?: number;

  threshold?: number;

  medium_threshold?: number;

  model_version?: string;

  sla_target_days?: number;

  prediction?: string;

}


// ============================================================
// DASHBOARD HISTORY
// ============================================================

interface DashboardHistoryItem {

  id?: string | number;

  ref?: string;

  title?: string;

  input?: IncidentRequest;

  prediction?: string;

  risk?: string;

  risk_level?: string;

  probability?: number;

  confidence?: number;

  date?: string;

  created_at?: string;

  createdAt?: string;

  timestamp?: string;

  prediction_date?: string;

  predictionDate?: string;

  predicted_at?: string;

  prediction_timestamp?: string;

  raised?: string;

  assigned_at?: string;

  investigated_at?: string;

  corrective_action_at?: string;

  closed_at?: string;

  rejected_at?: string;

  model_version?: string;

}


// ============================================================
// HISTORY RECORD
// ============================================================

type HistoryRecord =
  NonConformanceRecord & {

    predictionDate: string;

    predictionOrder?: number;

    isDashboardPrediction?: boolean;

    raisedAt?: string;

    assignedAt?: string;

    investigatedAt?: string;

    correctiveActionAt?: string;

    closedAt?: string;

    rejectedAt?: string;

  };


// ============================================================
// COMPONENT
// ============================================================

@Component({

  selector: 'app-historique',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './historique.component.html',

  styleUrl:
    './historique.component.css'

})
export class HistoriqueComponent
  implements OnInit {


  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  private readonly API_URL =
    'http://127.0.0.1:8000';

  private readonly NC_HISTORY_KEY =
    'nonConformanceHistory';

  private readonly PREDICTION_HISTORY_KEY =
    'predictionHistory';


  // ==========================================================
  // DONNÉES
  // ==========================================================

  records: HistoryRecord[] = [];

  selectedRecord:
    HistoryRecord | null = null;

  showModal = false;

  showDetailsModal = false;

  isSubmitting = false;

  submitError:
    string | null = null;


  // ==========================================================
  // FORMULAIRE
  // ==========================================================

  newNC: NewNCForm =
    this.createEmptyForm();


  // ==========================================================
  // FILTRES
  // ==========================================================

  searchTerm = '';

  riskFilter:
    'ALL' | RiskLevel = 'ALL';


  // ==========================================================
  // PAGINATION
  // ==========================================================

  currentPage = 1;

  pageSize = 5;


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.loadHistory();

  }


  // ==========================================================
  // FORMULAIRE INITIAL
  // ==========================================================

  private createEmptyForm():
    NewNCForm {

    const now =
      new Date();

    const localDate =
      new Date(
        now.getTime() -
        now.getTimezoneOffset() *
        60000
      )
        .toISOString()
        .slice(0, 16);


    return {

      title: '',

      category: '',

      subcategory: '',

      symptom: '',

      assignment_group: '',

      assigned_to: '',

      impact: 2,

      urgency: 2,

      priority: 3,

      state: 'RAISED',

      opened_at: localDate

    };

  }


  // ==========================================================
  // CHARGER HISTORIQUE
  // ==========================================================

  loadHistory(): void {

    try {

      const existingRecords =
        this.loadNonConformanceHistory();


      const dashboardRecords =
        this.loadDashboardPredictionHistory();


      this.records =
        this.mergeRecords(
          existingRecords,
          dashboardRecords
        );


      this.sortRecords();

      this.saveHistory();

      this.currentPage = 1;

      this.fixCurrentPage();

    }

    catch (error) {

      console.error(
        'Erreur chargement historique :',
        error
      );

      this.records = [];

      this.currentPage = 1;

    }

  }


  // ==========================================================
  // CHARGER NC HISTORY
  // ==========================================================

  private loadNonConformanceHistory():
    HistoryRecord[] {

    try {

      const stored =
        localStorage.getItem(
          this.NC_HISTORY_KEY
        );


      if (!stored) {

        return [];

      }


      const parsed: unknown =
        JSON.parse(stored);


      if (!Array.isArray(parsed)) {

        return [];

      }


      return parsed

        .map(
          (
            item: unknown,
            index: number
          ) =>
            this.normalizeRecord(
              item,
              index
            )
        )

        .filter(
          (
            item:
              HistoryRecord | null
          ): item is HistoryRecord =>
            item !== null
        );

    }

    catch (error) {

      console.error(
        'Erreur lecture nonConformanceHistory :',
        error
      );

      return [];

    }

  }


  // ==========================================================
  // CHARGER PREDICTION HISTORY
  // ==========================================================

  private loadDashboardPredictionHistory():
    HistoryRecord[] {

    try {

      const stored =
        localStorage.getItem(
          this.PREDICTION_HISTORY_KEY
        );


      if (!stored) {

        return [];

      }


      const parsed: unknown =
        JSON.parse(stored);


      if (!Array.isArray(parsed)) {

        return [];

      }


      return (
        parsed as DashboardHistoryItem[]
      )

        .map(
          (
            item,
            index
          ) =>
            this.dashboardPredictionToRecord(
              item,
              index
            )
        )

        .filter(
          (
            item:
              HistoryRecord | null
          ): item is HistoryRecord =>
            item !== null
        );

    }

    catch (error) {

      console.error(
        'Erreur lecture predictionHistory :',
        error
      );

      return [];

    }

  }


  // ==========================================================
  // DASHBOARD → RECORD
  // ==========================================================

  private dashboardPredictionToRecord(
    item: DashboardHistoryItem,
    index: number
  ): HistoryRecord | null {

    if (
      !item ||
      typeof item !== 'object'
    ) {

      return null;

    }


    const input:
      IncidentRequest =
      item.input ??
      ({} as IncidentRequest);


    const predictionDate =
      this.findPredictionDate(item) ??
      this.createFallbackPredictionDate(index);


    const raisedAt =
      this.getOptionalDate(
        input.opened_at ??
        item.raised ??
        item.date ??
        item.createdAt ??
        item.created_at ??
        item.timestamp
      );


    const assignedAt =
      this.getOptionalDate(
        item.assigned_at
      );


    const investigatedAt =
      this.getOptionalDate(
        item.investigated_at
      );


    const correctiveActionAt =
      this.getOptionalDate(
        item.corrective_action_at
      );


    const closedAt =
      this.getOptionalDate(
        item.closed_at
      );


    const rejectedAt =
      this.getOptionalDate(
        item.rejected_at
      );


    const title =
      String(
        item.title ??
        this.generateTitle(input)
      ).trim();


    const risk =
      this.normalizeRisk(
        item.risk ??
        item.risk_level ??
        item.prediction
      );


    const probability =
      this.normalizeProbability(
        item.probability ??
        item.confidence ??
        0
      );


    return {

      ref:
        item.ref ??
        this.generateDashboardRef(
          item,
          index
        ),

      title:
        title || 'AI Prediction',

      category:
        String(
          input.category ?? '—'
        ),

      assignment_group:
        String(
          input.assignment_group ?? '—'
        ),

      state:
        this.normalizeState(
          input.incident_state
        ),

      risk,

      probability,

      raised:
        raisedAt ??
        predictionDate,

      source:
        'DASHBOARD',

      input,

      predictionDate,

      predictionOrder:
        index,

      isDashboardPrediction:
        true,

      raisedAt,

      assignedAt,

      investigatedAt,

      correctiveActionAt,

      closedAt,

      rejectedAt

    };

  }


  // ==========================================================
  // NORMALISER RECORD
  // ==========================================================

  private normalizeRecord(
    value: unknown,
    index: number
  ): HistoryRecord | null {

    if (
      !value ||
      typeof value !== 'object'
    ) {

      return null;

    }


    const item =
      value as
        Partial<NonConformanceRecord> & {

          predictionDate?: string;

          prediction_date?: string;

          predictionOrder?: number;

          raisedAt?: string;

          assignedAt?: string;

          investigatedAt?: string;

          correctiveActionAt?: string;

          closedAt?: string;

          rejectedAt?: string;

          assigned_at?: string;

          investigated_at?: string;

          corrective_action_at?: string;

          closed_at?: string;

          rejected_at?: string;

        };


    if (
      !item.ref ||
      !item.title
    ) {

      return null;

    }


    const raisedAt =
      this.getOptionalDate(
        item.raisedAt ??
        item.raised
      );


    const assignedAt =
      this.getOptionalDate(
        item.assignedAt ??
        item.assigned_at
      );


    const investigatedAt =
      this.getOptionalDate(
        item.investigatedAt ??
        item.investigated_at
      );


    const correctiveActionAt =
      this.getOptionalDate(
        item.correctiveActionAt ??
        item.corrective_action_at
      );


    const closedAt =
      this.getOptionalDate(
        item.closedAt ??
        item.closed_at
      );


    const rejectedAt =
      this.getOptionalDate(
        item.rejectedAt ??
        item.rejected_at
      );


    const predictionDate =
      this.getValidDate(
        item.predictionDate ??
        item.prediction_date ??
        item.raised
      );


    return {

      ref:
        String(item.ref),

      title:
        String(item.title),

      category:
        String(
          item.category ?? '—'
        ),

      assignment_group:
        String(
          item.assignment_group ?? '—'
        ),

      state:
        this.normalizeState(
          item.state
        ),

      risk:
        this.normalizeRisk(
          item.risk
        ),

      probability:
        this.normalizeProbability(
          item.probability
        ),

      raised:
        raisedAt ??
        predictionDate,

      source:
        item.source === 'MANUAL'
          ? 'MANUAL'
          : 'DASHBOARD',

      input:
        item.input,

      predictionDate,

      predictionOrder:
        item.predictionOrder ??
        index,

      isDashboardPrediction:
        item.source !== 'MANUAL',

      raisedAt,

      assignedAt,

      investigatedAt,

      correctiveActionAt,

      closedAt,

      rejectedAt

    };

  }


  // ==========================================================
  // DATE OPTIONNELLE
  // ==========================================================

  private getOptionalDate(
    value: unknown
  ): string | undefined {

    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ''
    ) {

      return undefined;

    }


    const date =
      new Date(
        String(value)
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return undefined;

    }


    return date.toISOString();

  }


  // ==========================================================
  // DATE VALIDE
  // ==========================================================

  private getValidDate(
    value: unknown
  ): string {

    return (
      this.getOptionalDate(value) ??
      new Date().toISOString()
    );

  }


  // ==========================================================
  // DATE PREDICTION
  // ==========================================================

  private findPredictionDate(
    item: DashboardHistoryItem
  ): string | null {

    const candidates: unknown[] = [

      item.predictionDate,

      item.prediction_date,

      item.predicted_at,

      item.prediction_timestamp,

      item.createdAt,

      item.created_at,

      item.timestamp,

      item.date

    ];


    for (
      const value
      of candidates
    ) {

      const date =
        this.getOptionalDate(value);


      if (date) {

        return date;

      }

    }


    return null;

  }


  // ==========================================================
  // FALLBACK DATE
  // ==========================================================

  private createFallbackPredictionDate(
    index: number
  ): string {

    const base =
      new Date(
        '2000-01-01T00:00:00.000Z'
      ).getTime();


    return new Date(
      base +
      index * 1000
    ).toISOString();

  }


  // ==========================================================
  // MERGE
  // ==========================================================

  private mergeRecords(
    existingRecords: HistoryRecord[],
    dashboardRecords: HistoryRecord[]
  ): HistoryRecord[] {

    const result:
      HistoryRecord[] = [];


    for (
      const record
      of existingRecords
    ) {

      if (
        !this.recordAlreadyExists(
          result,
          record
        )
      ) {

        result.push(record);

      }

    }


    for (
      const dashboardRecord
      of dashboardRecords
    ) {

      const existingIndex =
        this.findDashboardMatch(
          result,
          dashboardRecord
        );


      if (
        existingIndex === -1
      ) {

        result.push(
          dashboardRecord
        );

      }

      else {

        result[existingIndex] = {

          ...result[existingIndex],

          ...dashboardRecord

        };

      }

    }


    return result;

  }


  // ==========================================================
  // FIND MATCH
  // ==========================================================

  private findDashboardMatch(
    records: HistoryRecord[],
    record: HistoryRecord
  ): number {

    if (record.ref) {

      const index =
        records.findIndex(
          item =>
            item.ref === record.ref
        );


      if (index !== -1) {

        return index;

      }

    }


    return records.findIndex(
      item =>
        item.source === 'DASHBOARD' &&
        item.predictionOrder ===
        record.predictionOrder
    );

  }


  // ==========================================================
  // EXISTE
  // ==========================================================

  private recordAlreadyExists(
    records: HistoryRecord[],
    record: HistoryRecord
  ): boolean {

    return records.some(
      item =>
        item.ref === record.ref
    );

  }


  // ==========================================================
  // NORMALISER STATE
  // ==========================================================

  private normalizeState(
    value: unknown
  ): NCState {

    const state =
      String(value ?? '')
        .trim()
        .toUpperCase()
        .replace(
          /[\s-]+/g,
          '_'
        );


    switch (state) {

      case 'RAISED':
      case 'OPEN':
        return 'RAISED';


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
  // STATE LABEL
  // ==========================================================

  stateLabel(
    state: NCState
  ): string {

    switch (state) {

      case 'RAISED':
        return 'Raised';

      case 'ASSIGNED':
        return 'Assigned';

      case 'UNDER_INVESTIGATION':
        return 'Under Investigation';

      case 'CORRECTIVE_ACTION':
        return 'Corrective Action';

      case 'CLOSED':
        return 'Closed';

      case 'REJECTED':
        return 'Rejected';

      default:
        return 'Raised';

    }

  }


  // ==========================================================
  // STATE CLASS
  // ==========================================================

  stateClass(
    state: NCState
  ): string {

    return state
      .toLowerCase()
      .replace(
        /_/g,
        '-'
      );

  }


  // ==========================================================
  // DATE À AFFICHER
  // ==========================================================

  getDisplayDate(
    record: HistoryRecord
  ): string {

    switch (record.state) {

      case 'RAISED':

        return (
          record.raisedAt ??
          record.raised ??
          record.predictionDate
        );


      case 'ASSIGNED':

        return (
          record.assignedAt ??
          record.raisedAt ??
          record.raised ??
          record.predictionDate
        );


      case 'UNDER_INVESTIGATION':

        return (
          record.investigatedAt ??
          record.assignedAt ??
          record.raisedAt ??
          record.raised ??
          record.predictionDate
        );


      case 'CORRECTIVE_ACTION':

        return (
          record.correctiveActionAt ??
          record.investigatedAt ??
          record.assignedAt ??
          record.raisedAt ??
          record.raised ??
          record.predictionDate
        );


      case 'CLOSED':

        return (
          record.closedAt ??
          record.correctiveActionAt ??
          record.investigatedAt ??
          record.assignedAt ??
          record.raisedAt ??
          record.raised ??
          record.predictionDate
        );


      case 'REJECTED':

        return (
          record.rejectedAt ??
          record.raisedAt ??
          record.raised ??
          record.predictionDate
        );


      default:

        return (
          record.raised ??
          record.predictionDate
        );

    }

  }


  // ==========================================================
  // LABEL DE DATE
  // ==========================================================

  getDateLabel(
    record: HistoryRecord
  ): string {

    switch (record.state) {

      case 'RAISED':
        return 'Raised Date';

      case 'ASSIGNED':
        return 'Assigned Date';

      case 'UNDER_INVESTIGATION':
        return 'Investigation Date';

      case 'CORRECTIVE_ACTION':
        return 'Corrective Action Date';

      case 'CLOSED':
        return 'Closed Date';

      case 'REJECTED':
        return 'Rejected Date';

      default:
        return 'Date';

    }

  }


  // ==========================================================
  // TRI
  // ==========================================================

  private sortRecords(): void {

    this.records.sort(
      (
        a,
        b
      ) => {

        const aDashboard =
          a.source === 'DASHBOARD';

        const bDashboard =
          b.source === 'DASHBOARD';


        if (
          aDashboard &&
          !bDashboard
        ) {

          return -1;

        }


        if (
          !aDashboard &&
          bDashboard
        ) {

          return 1;

        }


        if (
          aDashboard &&
          bDashboard
        ) {

          const orderA =
            Number(
              a.predictionOrder ?? -1
            );


          const orderB =
            Number(
              b.predictionOrder ?? -1
            );


          return orderB - orderA;

        }


        const dateA =
          this.getDateTimestamp(
            this.getDisplayDate(a)
          );


        const dateB =
          this.getDateTimestamp(
            this.getDisplayDate(b)
          );


        return dateB - dateA;

      }
    );

  }


  // ==========================================================
  // TIMESTAMP
  // ==========================================================

  private getDateTimestamp(
    value: string
  ): number {

    const timestamp =
      new Date(value).getTime();


    return Number.isNaN(timestamp)
      ? 0
      : timestamp;

  }


  // ==========================================================
  // SAVE
  // ==========================================================

  private saveHistory(): void {

    try {

      localStorage.setItem(
        this.NC_HISTORY_KEY,
        JSON.stringify(
          this.records
        )
      );

    }

    catch (error) {

      console.error(
        'Erreur sauvegarde historique :',
        error
      );

    }

  }


  // ==========================================================
  // MODAL
  // ==========================================================

  openModal(): void {

    this.newNC =
      this.createEmptyForm();

    this.submitError = null;

    this.isSubmitting = false;

    this.showModal = true;

    document.body.style.overflow =
      'hidden';

  }


  closeModal(): void {

    if (this.isSubmitting) {

      return;

    }


    this.showModal = false;

    this.submitError = null;

    document.body.style.overflow =
      '';

  }


  // ==========================================================
  // ADD NC
  // ==========================================================

  async addNC(): Promise<void> {

    if (this.isSubmitting) {

      return;

    }


    if (
      !this.newNC.title.trim() ||
      !this.newNC.category.trim() ||
      !this.newNC.assignment_group.trim()
    ) {

      this.submitError =
        'Veuillez remplir tous les champs obligatoires.';

      return;

    }


    this.isSubmitting = true;

    this.submitError = null;


    const incidentInput:
      IncidentRequest = {

      incident_state:
        this.newNC.state,

      category:
        this.newNC.category.trim(),

      subcategory:
        this.newNC.subcategory.trim(),

      u_symptom:
        this.newNC.symptom.trim(),

      assignment_group:
        this.newNC.assignment_group.trim(),

      assigned_to:
        this.newNC.assigned_to.trim(),

      impact:
        Number(
          this.newNC.impact
        ),

      urgency:
        Number(
          this.newNC.urgency
        ),

      priority:
        Number(
          this.newNC.priority
        ),

      opened_at:
        this.newNC.opened_at

    };


    try {

      const prediction =
        await this.predictRisk(
          incidentInput
        );


      const now =
        new Date().toISOString();


      const raisedAt =
        this.getValidDate(
          this.newNC.opened_at
        );


      const record:
        HistoryRecord = {

        ref:
          this.generateNextRef(),

        title:
          this.newNC.title.trim(),

        category:
          this.newNC.category.trim(),

        assignment_group:
          this.newNC.assignment_group.trim(),

        state:
          this.newNC.state,

        risk:
          prediction.risk,

        probability:
          prediction.probability,

        raised:
          raisedAt,

        source:
          'MANUAL',

        input:
          incidentInput,

        predictionDate:
          now,

        predictionOrder:
          Number.MAX_SAFE_INTEGER,

        isDashboardPrediction:
          false,

        raisedAt

      };


      this.records = [

        record,

        ...this.records

      ];


      this.sortRecords();

      this.saveHistory();

      this.currentPage = 1;

      this.newNC =
        this.createEmptyForm();

      this.showModal = false;

      document.body.style.overflow =
        '';

    }

    catch (error) {

      console.error(
        'Erreur prédiction :',
        error
      );


      this.submitError =
        'Impossible de calculer le risque. Vérifiez que le backend FastAPI est démarré.';

    }

    finally {

      this.isSubmitting = false;

    }

  }


  // ==========================================================
  // PREDICTION
  // ==========================================================

  private async predictRisk(
    input: IncidentRequest
  ): Promise<{
    risk: RiskLevel;
    probability: number;
  }> {

    const response =
      await fetch(
        `${this.API_URL}/predict`,
        {

          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(input)

        }
      );


    if (!response.ok) {

      throw new Error(
        `Prediction failed: ${response.status}`
      );

    }


    const data:
      PredictionApiResponse =
      await response.json();


    return {

      risk:
        this.normalizeRisk(
          data.risk_level ??
          data.prediction
        ),

      probability:
        this.normalizeProbability(
          data.probability
        )

    };

  }


  // ==========================================================
  // REFERENCE
  // ==========================================================

  private generateNextRef(): string {

    let maxNumber = 0;


    for (
      const record
      of this.records
    ) {

      const match =
        String(record.ref)
          .match(
            /NC-(\d+)/i
          );


      if (!match) {

        continue;

      }


      const number =
        Number(match[1]);


      if (
        Number.isFinite(number) &&
        number > maxNumber
      ) {

        maxNumber = number;

      }

    }


    return (
      'NC-' +
      String(
        maxNumber + 1
      ).padStart(
        4,
        '0'
      )
    );

  }


  // ==========================================================
  // RISK
  // ==========================================================

  private normalizeRisk(
    value: unknown
  ): RiskLevel {

    const risk =
      String(value ?? '')
        .trim()
        .toUpperCase();


    if (
      risk.includes('HIGH')
    ) {

      return 'HIGH';

    }


    if (
      risk.includes('MEDIUM') ||
      risk.includes('MED')
    ) {

      return 'MEDIUM';

    }


    return 'LOW';

  }


  riskClass(
    risk: RiskLevel | null
  ): string {

    return (
      risk?.toLowerCase() ??
      'none'
    );

  }


  riskLabel(
    risk: RiskLevel
  ): string {

    switch (risk) {

      case 'HIGH':
        return 'High';

      case 'MEDIUM':
        return 'Medium';

      case 'LOW':
        return 'Low';

      default:
        return risk;

    }

  }


  // ==========================================================
  // PROBABILITY
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


  getProbability(
    record: HistoryRecord
  ): number {

    return (
      record.probability *
      100
    );

  }


  // ==========================================================
  // TITLE
  // ==========================================================

  private generateTitle(
    input: Partial<IncidentRequest>
  ): string {

    const symptom =
      String(
        input.u_symptom ?? ''
      ).trim();


    const category =
      String(
        input.category ?? ''
      ).trim();


    const subcategory =
      String(
        input.subcategory ?? ''
      ).trim();


    if (symptom) {

      return symptom;

    }


    if (
      category &&
      subcategory
    ) {

      return (
        category +
        ' - ' +
        subcategory
      );

    }


    if (category) {

      return category;

    }


    return 'Incident prediction';

  }


  // ==========================================================
  // DASHBOARD REFERENCE
  // ==========================================================

  private generateDashboardRef(
    item: DashboardHistoryItem,
    index: number
  ): string {

    if (
      item.id !== undefined &&
      item.id !== null
    ) {

      const id =
        String(item.id)
          .replace(
            /[^a-zA-Z0-9]/g,
            ''
          )
          .slice(-12);


      if (id) {

        return `NC-AI-${id}`;

      }

    }


    return (
      'NC-AI-' +
      String(
        index + 1
      ).padStart(
        6,
        '0'
      )
    );

  }


  // ==========================================================
  // FILTRE
  // ==========================================================

  get filteredRecords():
    HistoryRecord[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.records.filter(
      record => {

        const matchesSearch =
          !search ||

          record.ref
            .toLowerCase()
            .includes(search) ||

          record.title
            .toLowerCase()
            .includes(search) ||

          record.category
            .toLowerCase()
            .includes(search) ||

          record.assignment_group
            .toLowerCase()
            .includes(search) ||

          this.stateLabel(
            record.state
          )
            .toLowerCase()
            .includes(search) ||

          record.risk
            .toLowerCase()
            .includes(search);


        const matchesRisk =
          this.riskFilter === 'ALL' ||
          record.risk ===
          this.riskFilter;


        return (
          matchesSearch &&
          matchesRisk
        );

      }
    );

  }


  // ==========================================================
  // PAGINATION
  // ==========================================================

  get paginatedRecords():
    HistoryRecord[] {

    const start =
      (
        this.currentPage - 1
      ) *
      this.pageSize;


    return this.filteredRecords.slice(
      start,
      start + this.pageSize
    );

  }


  get totalPages(): number {

    return Math.max(
      1,
      Math.ceil(
        this.filteredRecords.length /
        this.pageSize
      )
    );

  }


  get pages(): number[] {

    return Array.from(
      {
        length:
          this.totalPages
      },
      (
        _,
        index
      ) =>
        index + 1
    );

  }


  /*
   * IMPORTANT :
   * On ne met PAS Math.min() dans le HTML.
   */
  getLastDisplayedRecord(): number {

    if (
      this.filteredRecords.length === 0
    ) {

      return 0;

    }


    const last =
      this.currentPage *
      this.pageSize;


    return last >
      this.filteredRecords.length
      ? this.filteredRecords.length
      : last;

  }


  getFirstDisplayedRecord(): number {

    if (
      this.filteredRecords.length === 0
    ) {

      return 0;

    }


    return (
      (
        this.currentPage - 1
      ) *
      this.pageSize
    ) + 1;

  }


  nextPage(): void {

    if (
      this.currentPage <
      this.totalPages
    ) {

      this.currentPage++;

    }

  }


  previousPage(): void {

    if (
      this.currentPage > 1
    ) {

      this.currentPage--;

    }

  }


  goToPage(
    page: number
  ): void {

    if (
      page >= 1 &&
      page <= this.totalPages
    ) {

      this.currentPage = page;

    }

  }


  onSearchChange(): void {

    this.currentPage = 1;

  }


  onRiskFilterChange(): void {

    this.currentPage = 1;

  }


  trackByRef(
    index: number,
    record: HistoryRecord
  ): string {

    return record.ref;

  }


  // ==========================================================
  // DATE FORMAT
  // ==========================================================

  formatDate(
    value: string
  ): string {

    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '—';

    }


    return new Intl.DateTimeFormat(
      'fr-FR',
      {

        day: '2-digit',

        month: 'short',

        year: 'numeric',

        hour: '2-digit',

        minute: '2-digit'

      }
    ).format(date);

  }


  // ==========================================================
  // DETAILS
  // ==========================================================

  viewRecord(
    record: HistoryRecord
  ): void {

    this.selectedRecord =
      record;

    this.showDetailsModal =
      true;

    document.body.style.overflow =
      'hidden';

  }


  closeDetails(): void {

    this.showDetailsModal =
      false;

    this.selectedRecord =
      null;

    document.body.style.overflow =
      '';

  }


  // ==========================================================
  // DELETE
  // ==========================================================

  deleteRecord(
    record: HistoryRecord
  ): void {

    const confirmed =
      window.confirm(
        `Voulez-vous supprimer la NC ${record.ref} ?`
      );


    if (!confirmed) {

      return;

    }


    this.records =
      this.records.filter(
        item =>
          item.ref !==
          record.ref
      );


    this.saveHistory();

    this.fixCurrentPage();


    if (
      this.selectedRecord &&
      this.selectedRecord.ref ===
      record.ref
    ) {

      this.closeDetails();

    }

  }


  // ==========================================================
  // CLEAR
  // ==========================================================

  clearHistory(): void {

    const confirmed =
      window.confirm(
        'Voulez-vous vraiment supprimer tout l’historique ?'
      );


    if (!confirmed) {

      return;

    }


    this.records = [];

    this.currentPage = 1;


    localStorage.removeItem(
      this.NC_HISTORY_KEY
    );

    localStorage.removeItem(
      this.PREDICTION_HISTORY_KEY
    );

    localStorage.removeItem(
      'latestPredictionExplanation'
    );


    this.closeDetails();

  }


  // ==========================================================
  // PAGINATION FIX
  // ==========================================================

  private fixCurrentPage(): void {

    if (
      this.currentPage >
      this.totalPages
    ) {

      this.currentPage =
        this.totalPages;

    }


    if (
      this.currentPage < 1
    ) {

      this.currentPage = 1;

    }

  }


  // ==========================================================
  // IMPACT
  // ==========================================================

  impactLabel(
    value?: number
  ): string {

    switch (Number(value)) {

      case 1:
        return 'High';

      case 2:
        return 'Medium';

      case 3:
        return 'Low';

      default:
        return '—';

    }

  }


  // ==========================================================
  // URGENCY
  // ==========================================================

  urgencyLabel(
    value?: number
  ): string {

    switch (Number(value)) {

      case 1:
        return 'High';

      case 2:
        return 'Medium';

      case 3:
        return 'Low';

      default:
        return '—';

    }

  }


  // ==========================================================
  // PRIORITY
  // ==========================================================

  priorityLabel(
    value?: number
  ): string {

    switch (Number(value)) {

      case 1:
        return 'Critical';

      case 2:
        return 'High';

      case 3:
        return 'Moderate';

      case 4:
        return 'Low';

      case 5:
        return 'Planning';

      default:
        return '—';

    }

  }


  // ==========================================================
  // PDF
  // ==========================================================

  exportPdf(
    record: HistoryRecord
  ): void {

    const doc =
      new jsPDF();


    doc.setFontSize(18);

    doc.setFont(
      'helvetica',
      'bold'
    );


    doc.text(
      'Non-Conformance Report',
      15,
      20
    );


    doc.setFontSize(10);

    doc.setFont(
      'helvetica',
      'normal'
    );


    let y = 35;


    const addRow = (
      label: string,
      value: string
    ) => {

      doc.setFont(
        'helvetica',
        'bold'
      );

      doc.text(
        `${label} :`,
        15,
        y
      );

      doc.setFont(
        'helvetica',
        'normal'
      );

      doc.text(
        value || '—',
        70,
        y
      );

      y += 8;

    };


    addRow(
      'Reference',
      record.ref
    );


    addRow(
      'Title',
      record.title
    );


    addRow(
      'Category',
      record.category
    );


    addRow(
      'Assignment Group',
      record.assignment_group
    );


    addRow(
      'State',
      this.stateLabel(
        record.state
      )
    );


    /*
     * La date correspond au STATE.
     */
    addRow(
      'Date',
      this.formatDate(
        this.getDisplayDate(record)
      )
    );


    addRow(
      'AI Risk',
      this.riskLabel(
        record.risk
      )
    );


    addRow(
      'Probability',
      `${this.getProbability(record).toFixed(1)} %`
    );


    if (record.input) {

      y += 5;


      doc.setFont(
        'helvetica',
        'bold'
      );


      doc.text(
        'Incident Details',
        15,
        y
      );


      y += 8;


      addRow(
        'Subcategory',
        record.input.subcategory ??
        '—'
      );


      addRow(
        'Assigned To',
        record.input.assigned_to ??
        '—'
      );


      addRow(
        'Impact',
        this.impactLabel(
          record.input.impact
        )
      );


      addRow(
        'Urgency',
        this.urgencyLabel(
          record.input.urgency
        )
      );


      addRow(
        'Priority',
        this.priorityLabel(
          record.input.priority
        )
      );


      addRow(
        'Symptom',
        record.input.u_symptom ??
        '—'
      );

    }


    doc.setFontSize(8);


    doc.text(
      `Generated on ${new Intl.DateTimeFormat(
        'fr-FR',
        {
          dateStyle: 'medium',
          timeStyle: 'short'
        }
      ).format(new Date())}`,
      15,
      287
    );


    doc.save(
      `${record.ref}.pdf`
    );

  }

}