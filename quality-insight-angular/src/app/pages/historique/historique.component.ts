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
// FORMULAIRE NOUVELLE NC
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
// RÉPONSE BACKEND /predict
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
  generated_features?: unknown;

}


// ============================================================
// HISTORIQUE DASHBOARD
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

  model_version?: string;

}


// ============================================================
// RECORD LOCAL
// ============================================================

type HistoryRecord =
  NonConformanceRecord & {

    predictionDate: string;

    /**
     * Permet de conserver l'ordre réel des prédictions
     * Dashboard lorsque plusieurs dates sont identiques
     * ou lorsqu'une ancienne donnée ne possède pas de date.
     */
    predictionOrder?: number;

    /**
     * True uniquement pour les prédictions provenant
     * de predictionHistory.
     */
    isDashboardPrediction?: boolean;

  };


// ============================================================
// COMPOSANT
// ============================================================

@Component({

  selector:
    'app-historique',

  standalone:
    true,

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
  // API
  // ==========================================================

  private readonly API_URL =
    'http://127.0.0.1:8000';


  // ==========================================================
  // STORAGE
  // ==========================================================

  private readonly NC_HISTORY_KEY =
    'nonConformanceHistory';

  private readonly PREDICTION_HISTORY_KEY =
    'predictionHistory';


  // ==========================================================
  // DONNÉES
  // ==========================================================

  records:
    HistoryRecord[] = [];


  // ==========================================================
  // MODALS
  // ==========================================================

  showModal =
    false;

  showDetailsModal =
    false;

  selectedRecord:
    HistoryRecord | null =
    null;


  // ==========================================================
  // ENVOI
  // ==========================================================

  isSubmitting =
    false;

  submitError:
    string | null =
    null;


  // ==========================================================
  // FORMULAIRE
  // ==========================================================

  newNC:
    NewNCForm =
    this.createEmptyForm();


  // ==========================================================
  // RECHERCHE
  // ==========================================================

  searchTerm =
    '';


  // ==========================================================
  // FILTRE RISQUE
  // ==========================================================

  riskFilter:
    'ALL' | RiskLevel =
    'ALL';


  // ==========================================================
  // PAGINATION
  // ==========================================================

  currentPage =
    1;

  pageSize =
    5;


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.loadHistory();

  }


  // ==========================================================
  // FORMULAIRE VIDE
  // ==========================================================

  private createEmptyForm():
    NewNCForm {

    const now =
      new Date();

    const localDate =
      new Date(
        now.getTime() -
        now.getTimezoneOffset() * 60000
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
  // CHARGEMENT PRINCIPAL
  //
  // IMPORTANT :
  //
  // predictionHistory est lu séparément.
  //
  // Les prédictions Dashboard sont reconstruites à partir
  // de predictionHistory puis triées avec leur vraie date.
  //
  // La dernière prédiction est TOUJOURS en position 0.
  // ==========================================================

  loadHistory(): void {

    try {

      const existingRecords =
        this.loadNonConformanceHistory();

      const dashboardRecords =
        this.loadDashboardPredictionHistory();

      /*
       * On fusionne les anciennes NC avec les prédictions
       * Dashboard.
       */
      this.records =
        this.mergeRecords(
          existingRecords,
          dashboardRecords
        );

      /*
       * TRI CENTRAL.
       *
       * Cette fonction place obligatoirement la dernière
       * prédiction Dashboard en première position.
       */
      this.sortRecords();

      /*
       * Sauvegarder immédiatement l'ordre corrigé.
       */
      this.saveHistory();

      this.currentPage =
        1;

      this.fixCurrentPage();

      console.log(
        '[HISTORIQUE] Ordre final :',
        this.records.map(
          record => ({
            ref: record.ref,
            source: record.source,
            predictionDate:
              record.predictionDate,
            predictionOrder:
              record.predictionOrder
          })
        )
      );

    } catch (error) {

      console.error(
        'Erreur chargement historique :',
        error
      );

      this.records = [];

      this.currentPage = 1;

    }

  }


  // ==========================================================
  // CHARGER NON-CONFORMANCE HISTORY
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

      const parsed:
        unknown =
        JSON.parse(stored);

      if (
        !Array.isArray(parsed)
      ) {

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

    } catch (error) {

      console.error(
        'Erreur lecture nonConformanceHistory :',
        error
      );

      return [];

    }

  }


  // ==========================================================
  // CHARGER PREDICTION HISTORY
  //
  // IMPORTANT :
  //
  // On conserve l'INDEX ORIGINAL.
  //
  // Cela permet de savoir quelle prédiction est la dernière
  // même lorsque l'ancienne donnée n'a pas de timestamp.
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

      const parsed:
        unknown =
        JSON.parse(stored);

      if (
        !Array.isArray(parsed)
      ) {

        return [];

      }

      const predictions =
        parsed as DashboardHistoryItem[];

      /*
       * IMPORTANT :
       *
       * Nous ne faisons PAS confiance uniquement à la date.
       *
       * L'index dans predictionHistory est conservé.
       */
      const total =
        predictions.length;

      return predictions

        .map(
          (
            item:
              DashboardHistoryItem,
            index:
              number
          ) =>
            this.dashboardPredictionToRecord(
              item,
              index,
              total
            )
        )

        .filter(
          (
            item:
              HistoryRecord | null
          ): item is HistoryRecord =>
            item !== null
        );

    } catch (error) {

      console.error(
        'Erreur lecture predictionHistory :',
        error
      );

      return [];

    }

  }


  // ==========================================================
  // CONVERSION DASHBOARD -> RECORD
  // ==========================================================

  private dashboardPredictionToRecord(

    item:
      DashboardHistoryItem,

    index:
      number,

    total:
      number

  ):
    HistoryRecord | null {

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


    // ========================================================
    // DATE DE PRÉDICTION
    //
    // ORDRE DE PRIORITÉ :
    //
    // 1 predictionDate
    // 2 prediction_date
    // 3 predicted_at
    // 4 prediction_timestamp
    // 5 createdAt
    // 6 created_at
    // 7 timestamp
    // 8 date
    //
    // IMPORTANT :
    // raised n'est PAS utilisé ici.
    // ========================================================

    const explicitPredictionDate =
      this.findPredictionDate(item);


    /*
     * Si une vraie date existe, on l'utilise.
     *
     * Sinon on fabrique une date technique basée sur l'ordre
     * de predictionHistory.
     *
     * Plus l'index est grand, plus la prédiction est récente
     * lorsque predictionHistory est stocké chronologiquement.
     */
    let predictionDate: string;

    if (
      explicitPredictionDate
    ) {

      predictionDate =
        explicitPredictionDate;

    } else {

      predictionDate =
        this.createFallbackPredictionDate(
          index,
          total
        );

    }


    // ========================================================
    // DATE D'OUVERTURE
    //
    // Elle sert uniquement au SLA.
    // ========================================================

    const raised =
      this.getValidDate(
        input.opened_at ??
        item.raised ??
        item.date ??
        item.createdAt ??
        item.created_at ??
        item.timestamp
      );


    // ========================================================
    // TITRE
    // ========================================================

    const title =
      String(
        item.title ??
        this.generateTitle(input)
      ).trim();


    // ========================================================
    // RISQUE
    // ========================================================

    const risk =
      this.normalizeRisk(
        item.risk ??
        item.risk_level ??
        item.prediction
      );


    // ========================================================
    // PROBABILITÉ
    // ========================================================

    const probability =
      this.normalizeProbability(
        item.probability ??
        item.confidence ??
        0
      );


    // ========================================================
    // REF
    // ========================================================

    const ref =
      item.ref
        ? String(item.ref)
        : this.generateDashboardRef(
            item,
            index
          );


    // ========================================================
    // RECORD
    // ========================================================

    return {

      ref,

      title:
        title ||
        'AI Prediction',

      category:
        String(
          input.category ??
          '—'
        ),

      assignment_group:
        String(
          input.assignment_group ??
          '—'
        ),

      state:
        this.normalizeState(
          input.incident_state
        ),

      risk,

      probability,

      raised,

      source:
        'DASHBOARD',

      input,

      predictionDate,

      /*
       * L'index est conservé pour garantir un ordre stable.
       */
      predictionOrder:
        index,

      isDashboardPrediction:
        true

    };

  }


  // ==========================================================
  // TROUVER UNE VRAIE DATE DE PRÉDICTION
  // ==========================================================

  private findPredictionDate(
    item:
      DashboardHistoryItem
  ):
    string | null {

    const candidates:
      unknown[] = [

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

    return null;

  }


  // ==========================================================
  // DATE FALLBACK
  //
  // Permet de conserver l'ordre même si predictionHistory
  // ne possède aucune date.
  //
  // L'index est volontairement intégré dans la date.
  // ==========================================================

  private createFallbackPredictionDate(

    index:
      number,

    total:
      number

  ):
    string {

    /*
     * Base fixe.
     *
     * On ajoute les secondes correspondant à l'index.
     */
    const base =
      new Date(
        '2000-01-01T00:00:00.000Z'
      ).getTime();

    const timestamp =
      base +
      Math.max(
        0,
        total - index
      ) * 1000;

    return new Date(
      timestamp
    ).toISOString();

  }


  // ==========================================================
  // DATE VALIDE
  // ==========================================================

  private getValidDate(
    value:
      unknown
  ):
    string {

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {

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
  // FUSION
  //
  // IMPORTANT :
  //
  // Les prédictions Dashboard restent prioritaires.
  //
  // On ne remplace PAS une prédiction récente par une
  // ancienne version de nonConformanceHistory.
  // ==========================================================

  private mergeRecords(

    existingRecords:
      HistoryRecord[],

    dashboardRecords:
      HistoryRecord[]

  ):
    HistoryRecord[] {

    const result:
      HistoryRecord[] = [];


    // ========================================================
    // 1. AJOUTER LES NC MANUELLES
    // ========================================================

    for (
      const record of existingRecords
    ) {

      /*
       * Si le record est une ancienne prédiction Dashboard,
       * on l'ajoute provisoirement.
       *
       * Les versions Dashboard plus récentes seront ensuite
       * remplacées par predictionHistory.
       */
      if (
        !this.recordAlreadyExists(
          result,
          record
        )
      ) {

        result.push(record);

      }

    }


    // ========================================================
    // 2. AJOUTER / REMPLACER LES DASHBOARD
    // ========================================================

    for (
      const dashboardRecord of dashboardRecords
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

        continue;

      }


      /*
       * La version venant directement de predictionHistory
       * est toujours la source de vérité.
       */
      result[
        existingIndex
      ] = {

        ...result[
          existingIndex
        ],

        ...dashboardRecord,

        source:
          'DASHBOARD',

        isDashboardPrediction:
          true

      };

    }


    return result;

  }


  // ==========================================================
  // TROUVER CORRESPONDANCE DASHBOARD
  // ==========================================================

  private findDashboardMatch(

    records:
      HistoryRecord[],

    record:
      HistoryRecord

  ):
    number {


    // ========================================================
    // 1. MÊME REF
    // ========================================================

    if (
      record.ref
    ) {

      const byRef =
        records.findIndex(
          item =>
            item.ref === record.ref
        );

      if (
        byRef !== -1
      ) {

        return byRef;

      }

    }


    // ========================================================
    // 2. MÊME DATE DE PRÉDICTION
    // ========================================================

    const byPredictionDate =
      records.findIndex(
        item =>

          item.source === 'DASHBOARD' &&

          this.normalizeDateForComparison(
            item.predictionDate
          ) ===
          this.normalizeDateForComparison(
            record.predictionDate
          )
      );


    if (
      byPredictionDate !== -1
    ) {

      return byPredictionDate;

    }


    return -1;

  }


  // ==========================================================
  // DÉTECTION DOUBLON
  // ==========================================================

  private recordAlreadyExists(

    records:
      HistoryRecord[],

    record:
      HistoryRecord

  ):
    boolean {

    return (
      records.findIndex(
        item =>
          item.ref === record.ref
      ) !== -1
    );

  }


  // ==========================================================
  // NORMALISER RECORD EXISTANT
  // ==========================================================

  private normalizeRecord(

    value:
      unknown,

    index:
      number

  ):
    HistoryRecord | null {

    if (
      !value ||
      typeof value !== 'object'
    ) {

      return null;

    }

    const item =
      value as Partial<
        NonConformanceRecord
      > & {

        predictionDate?: string;

        prediction_date?: string;

      };


    if (
      !item.ref ||
      !item.title
    ) {

      return null;

    }


    const raised =
      this.getValidDate(
        item.raised
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
          item.category ??
          '—'
        ),

      assignment_group:
        String(
          item.assignment_group ??
          '—'
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

      raised,

      source:
        item.source === 'MANUAL'
          ? 'MANUAL'
          : 'DASHBOARD',

      input:
        item.input,

      predictionDate,

      predictionOrder:
        index,

      isDashboardPrediction:
        item.source !== 'MANUAL'

    };

  }


  // ==========================================================
  // NORMALISER STATE
  // ==========================================================

  private normalizeState(
    value:
      unknown
  ):
    NCState {

    const state =
      String(
        value ?? ''
      )
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
  // LABEL STATE
  // ==========================================================

  stateLabel(
    state:
      NCState
  ):
    string {

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
  // CLASSE STATE
  // ==========================================================

  stateClass(
    state:
      NCState
  ):
    string {

    return state
      .toLowerCase()
      .replace(
        /_/g,
        '-'
      );

  }


  // ==========================================================
  // REF DASHBOARD
  // ==========================================================

  private generateDashboardRef(

    item:
      DashboardHistoryItem,

    index:
      number

  ):
    string {

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


    if (
      item.ref
    ) {

      return String(
        item.ref
      );

    }


    const dateValue =
      this.findPredictionDate(item);


    if (
      dateValue
    ) {

      const timestamp =
        new Date(
          dateValue
        ).getTime();

      if (
        Number.isFinite(timestamp)
      ) {

        return `NC-AI-${timestamp}`;

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
  // TITRE
  // ==========================================================

  private generateTitle(
    input:
      Partial<IncidentRequest>
  ):
    string {

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


    if (
      symptom
    ) {

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


    if (
      category
    ) {

      return category;

    }


    return 'Incident prediction';

  }


  // ==========================================================
  // NORMALISER RISQUE
  // ==========================================================

  private normalizeRisk(
    value:
      unknown
  ):
    RiskLevel {

    const risk =
      String(
        value ?? ''
      )
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


  // ==========================================================
  // NORMALISER PROBABILITÉ
  // ==========================================================

  private normalizeProbability(
    value:
      unknown
  ):
    number {

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
  // TRI PRINCIPAL
  //
  // ==========================================================
  //
  // RÈGLE ABSOLUE :
  //
  // LA DERNIÈRE PRÉDICTION DASHBOARD
  // DOIT ÊTRE LA PREMIÈRE LIGNE.
  //
  // ==========================================================

  private sortRecords(): void {

    this.records.sort(

      (a, b) => {


        // ====================================================
        // 1. DASHBOARD VS MANUEL
        //
        // Les prédictions Dashboard sont prioritaires.
        // ====================================================

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


        // ====================================================
        // 2. DEUX PRÉDICTIONS DASHBOARD
        //
        // On utilise predictionDate.
        // ====================================================

        if (
          aDashboard &&
          bDashboard
        ) {

          const dateA =
            this.getDateTimestamp(
              a.predictionDate
            );

          const dateB =
            this.getDateTimestamp(
              b.predictionDate
            );


          if (
            dateA !== dateB
          ) {

            /*
             * PLUS RÉCENT = PREMIER
             */
            return dateB - dateA;

          }


          // ==================================================
          // Même timestamp :
          // predictionOrder permet de départager.
          // ==================================================

          const orderA =
            Number(
              a.predictionOrder ?? 0
            );

          const orderB =
            Number(
              b.predictionOrder ?? 0
            );


          if (
            orderA !== orderB
          ) {

            return orderB - orderA;

          }

        }


        // ====================================================
        // 3. NC MANUELLES
        // ====================================================

        const manualDateA =
          this.getDateTimestamp(
            a.predictionDate ??
            a.raised
          );

        const manualDateB =
          this.getDateTimestamp(
            b.predictionDate ??
            b.raised
          );


        if (
          manualDateA !== manualDateB
        ) {

          return manualDateB -
                 manualDateA;

        }


        // ====================================================
        // 4. DERNIER CRITÈRE : REF
        // ====================================================

        return String(
          b.ref
        ).localeCompare(
          String(
            a.ref
          ),
          undefined,
          {
            numeric: true,
            sensitivity: 'base'
          }
        );

      }

    );

  }


  // ==========================================================
  // TIMESTAMP
  // ==========================================================

  private getDateTimestamp(
    value:
      string
  ):
    number {

    if (
      !value
    ) {

      return 0;

    }


    const timestamp =
      new Date(
        value
      ).getTime();


    if (
      Number.isNaN(
        timestamp
      )
    ) {

      return 0;

    }


    return timestamp;

  }


  // ==========================================================
  // DATE COMPARAISON
  // ==========================================================

  private normalizeDateForComparison(
    value:
      string
  ):
    string {

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return String(
        value
      );

    }

    return String(
      date.getTime()
    );

  }


  // ==========================================================
  // SAUVEGARDE
  // ==========================================================

  private saveHistory(): void {

    try {

      localStorage.setItem(

        this.NC_HISTORY_KEY,

        JSON.stringify(
          this.records
        )

      );

    } catch (error) {

      console.error(
        'Erreur sauvegarde historique :',
        error
      );

    }

  }


  // ==========================================================
  // OUVRIR MODAL
  // ==========================================================

  openModal(): void {

    this.newNC =
      this.createEmptyForm();

    this.submitError =
      null;

    this.isSubmitting =
      false;

    this.showModal =
      true;

    document.body.style.overflow =
      'hidden';

  }


  // ==========================================================
  // FERMER MODAL
  // ==========================================================

  closeModal(): void {

    if (
      this.isSubmitting
    ) {

      return;

    }

    this.showModal =
      false;

    this.submitError =
      null;

    document.body.style.overflow =
      '';

  }


  // ==========================================================
  // AJOUT NC MANUELLE
  // ==========================================================

  async addNC():
    Promise<void> {

    if (
      this.isSubmitting
    ) {

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


    this.isSubmitting =
      true;

    this.submitError =
      null;


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


      const predictionDate =
        new Date().toISOString();


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
          this.newNC.opened_at
            ? new Date(
                this.newNC.opened_at
              ).toISOString()
            : predictionDate,

        source:
          'MANUAL',

        input:
          incidentInput,

        predictionDate,

        predictionOrder:
          Number.MAX_SAFE_INTEGER,

        isDashboardPrediction:
          false

      };


      /*
       * Ajouter puis retrier.
       */
      this.records = [
        record,
        ...this.records
      ];


      this.sortRecords();

      this.saveHistory();

      this.currentPage =
        1;

      this.newNC =
        this.createEmptyForm();

      this.showModal =
        false;

      document.body.style.overflow =
        '';


    } catch (error) {

      console.error(
        'Erreur prédiction NC :',
        error
      );

      this.submitError =
        'Impossible de calculer le risque. Vérifiez que le backend FastAPI est démarré et accessible.';

    } finally {

      this.isSubmitting =
        false;

    }

  }


  // ==========================================================
  // PRÉDICTION BACKEND
  // ==========================================================

  private async predictRisk(

    input:
      IncidentRequest

  ):
    Promise<{

      risk:
        RiskLevel;

      probability:
        number;

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
            JSON.stringify(
              input
            )
        }
      );


    if (
      !response.ok
    ) {

      const message =
        await response
          .text()
          .catch(
            () => ''
          );

      throw new Error(
        `Prediction failed: ${response.status} ${message}`
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
  // REF SUIVANTE
  // ==========================================================

  private generateNextRef():
    string {

    let maxNumber =
      0;


    for (
      const record of this.records
    ) {

      const match =
        String(
          record.ref
        ).match(
          /NC-(\d+)/i
        );


      if (
        !match
      ) {

        continue;

      }


      const number =
        Number(
          match[1]
        );


      if (
        Number.isFinite(number) &&
        number > maxNumber
      ) {

        maxNumber =
          number;

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
  // FILTRAGE
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


    return this.filteredRecords
      .slice(
        start,
        start + this.pageSize
      );

  }


  // ==========================================================
  // TOTAL PAGES
  // ==========================================================

  get totalPages():
    number {

    return Math.max(
      1,
      Math.ceil(
        this.filteredRecords.length /
        this.pageSize
      )
    );

  }


  // ==========================================================
  // PAGES
  // ==========================================================

  get pages():
    number[] {

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


  // ==========================================================
  // NEXT PAGE
  // ==========================================================

  nextPage(): void {

    if (
      this.currentPage <
      this.totalPages
    ) {

      this.currentPage++;

    }

  }


  // ==========================================================
  // PREVIOUS PAGE
  // ==========================================================

  previousPage(): void {

    if (
      this.currentPage > 1
    ) {

      this.currentPage--;

    }

  }


  // ==========================================================
  // GO PAGE
  // ==========================================================

  goToPage(
    page:
      number
  ): void {

    if (
      page >= 1 &&
      page <= this.totalPages
    ) {

      this.currentPage =
        page;

    }

  }


  // ==========================================================
  // SEARCH
  // ==========================================================

  onSearchChange(): void {

    this.currentPage =
      1;

  }


  // ==========================================================
  // FILTER
  // ==========================================================

  onRiskFilterChange(): void {

    this.currentPage =
      1;

  }


  // ==========================================================
  // TRACK
  // ==========================================================

  trackByRef(
    index:
      number,
    record:
      HistoryRecord
  ):
    string {

    return record.ref;

  }


  // ==========================================================
  // PROBABILITÉ
  // ==========================================================

  getProbability(
    record:
      HistoryRecord
  ):
    number {

    return (
      record.probability *
      100
    );

  }


  // ==========================================================
  // CLASSE RISQUE
  // ==========================================================

  riskClass(
    risk:
      RiskLevel | null
  ):
    string {

    return (
      risk?.toLowerCase() ??
      'none'
    );

  }


  // ==========================================================
  // DATE
  // ==========================================================

  formatDate(
    value:
      string
  ):
    string {

    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;

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
  // VIEW
  // ==========================================================

  viewRecord(
    record:
      HistoryRecord
  ): void {

    this.selectedRecord =
      record;

    this.showDetailsModal =
      true;

    document.body.style.overflow =
      'hidden';

  }


  // ==========================================================
  // CLOSE DETAILS
  // ==========================================================

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
    record:
      HistoryRecord
  ): void {

    const confirmed =
      window.confirm(
        `Voulez-vous supprimer la NC ${record.ref} ?`
      );


    if (
      !confirmed
    ) {

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
      this.selectedRecord?.ref ===
      record.ref
    ) {

      this.closeDetails();

    }

  }


  // ==========================================================
  // CLEAR HISTORY
  // ==========================================================

  clearHistory(): void {

    const confirmed =
      window.confirm(
        'Voulez-vous vraiment supprimer tout l’historique ?'
      );


    if (
      !confirmed
    ) {

      return;

    }


    this.records =
      [];

    this.currentPage =
      1;


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
  // RESET FORM
  // ==========================================================

  resetForm(): void {

    this.newNC =
      this.createEmptyForm();

    this.submitError =
      null;

  }


  // ==========================================================
  // PAGE COURANTE
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

      this.currentPage =
        1;

    }

  }


  // ==========================================================
  // LABEL RISQUE
  // ==========================================================

  riskLabel(
    risk:
      RiskLevel
  ):
    string {

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
  // IMPACT
  // ==========================================================

  impactLabel(
    value?:
      number
  ):
    string {

    switch (
      Number(value)
    ) {

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
    value?:
      number
  ):
    string {

    switch (
      Number(value)
    ) {

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
    value?:
      number
  ):
    string {

    switch (
      Number(value)
    ) {

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
  // INPUT
  // ==========================================================

  hasInput(
    record:
      HistoryRecord
  ):
    boolean {

    return !!record.input;

  }


  // ==========================================================
  // EXPORT PDF
  // ==========================================================

  exportPdf(
    record:
      HistoryRecord
  ):
    void {

    const doc =
      new jsPDF();


    // ========================================================
    // HEADER
    // ========================================================

    doc.setFillColor(
      79,
      70,
      229
    );

    doc.rect(
      0,
      0,
      210,
      28,
      'F'
    );

    doc.setTextColor(
      255,
      255,
      255
    );

    doc.setFontSize(
      18
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Non-Conformance Report',
      15,
      17
    );

    doc.setFontSize(
      10
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.text(
      record.ref,
      15,
      24
    );

    doc.setTextColor(
      30,
      41,
      59
    );


    let y =
      42;

    const lineHeight =
      8;


    const addRow = (
      label:
        string,
      value:
        string
    ) => {

      doc.setFont(
        'helvetica',
        'bold'
      );

      doc.setFontSize(
        10
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

      const lines =
        doc.splitTextToSize(
          value ||
          '—',
          120
        );

      doc.text(
        lines,
        70,
        y
      );

      y +=
        lineHeight *
        lines.length;

    };


    // ========================================================
    // IDENTIFICATION
    // ========================================================

    doc.setFontSize(
      12
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setTextColor(
      79,
      70,
      229
    );

    doc.text(
      'Identification',
      15,
      y
    );

    y += 6;

    doc.setTextColor(
      30,
      41,
      59
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

    addRow(
      'Raised',
      this.formatDate(
        record.raised
      )
    );

    addRow(
      'Prediction Date',
      this.formatDate(
        record.predictionDate
      )
    );

    addRow(
      'Source',
      record.source === 'MANUAL'
        ? 'Manual NC'
        : 'AI Prediction'
    );


    y += 4;


    // ========================================================
    // AI RISK
    // ========================================================

    doc.setFontSize(
      12
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setTextColor(
      79,
      70,
      229
    );

    doc.text(
      'AI Risk Assessment',
      15,
      y
    );

    y += 6;

    doc.setTextColor(
      30,
      41,
      59
    );


    addRow(
      'Risk Level',
      this.riskLabel(
        record.risk
      )
    );

    addRow(
      'Probability',
      `${this.getProbability(record).toFixed(1)} %`
    );


    y += 4;


    // ========================================================
    // INCIDENT DETAILS
    // ========================================================

    if (
      record.input
    ) {

      doc.setFontSize(
        12
      );

      doc.setFont(
        'helvetica',
        'bold'
      );

      doc.setTextColor(
        79,
        70,
        229
      );

      doc.text(
        'Incident Details',
        15,
        y
      );

      y += 6;

      doc.setTextColor(
        30,
        41,
        59
      );


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


    // ========================================================
    // FOOTER
    // ========================================================

    doc.setFontSize(
      8
    );

    doc.setTextColor(
      148,
      163,
      184
    );

    doc.text(
      `Généré le ${
        new Intl.DateTimeFormat(
          'fr-FR',
          {
            dateStyle: 'medium',
            timeStyle: 'short'
          }
        ).format(
          new Date()
        )
      }`,
      15,
      287
    );


    doc.save(
      `${record.ref}.pdf`
    );

  }

}