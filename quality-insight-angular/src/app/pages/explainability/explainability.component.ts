import {
  Component,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  HistoryItem,
  ExplanationResponse,
  PredictionInfluence,
  PredictionResponse,
  RiskLevel
} from '../../models/api.models';


/* =========================================================
   LOCAL TYPES
========================================================= */

interface ExplanationFeature {

  feature: string;

  influence: number;

  direction: string;

  explanation: string;

}


interface LatestPredictionView {

  risk_level: RiskLevel;

  prediction: string;

  probability: number;

  date: string;

}


interface ExplainabilityViewData {

  prediction: LatestPredictionView;

  most_influential_features: ExplanationFeature[];

}


/* =========================================================
   STORED LATEST PREDICTION
========================================================= */

interface StoredLatestPrediction {

  prediction?: PredictionResponse;

  input?: Record<string, unknown>;

  title?: string;

  source?: string;

  createdAt?: string;

}


/* =========================================================
   COMPONENT
========================================================= */

@Component({

  selector: 'app-explainability',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl:
    './explainability.component.html',

  styleUrl:
    './explainability.component.css'

})
export class ExplainabilityComponent
  implements OnInit, OnDestroy {


  /* =========================================================
     DATA
  ========================================================= */

  data:
    ExplainabilityViewData | null =
      null;


  history:
    HistoryItem[] = [];


  /*
   * DERNIÈRE PRÉDICTION
   *
   * IMPORTANT :
   * La prédiction enregistrée dans latestPrediction
   * par le Dashboard est prioritaire.
   */
  latestPrediction:
    HistoryItem | null =
      null;


  /*
   * Résultat brut envoyé par le Dashboard.
   */
  latestPredictionResponse:
    PredictionResponse | null =
      null;


  /*
   * Données d'entrée de la dernière prédiction.
   */
  latestInput:
    Record<string, unknown> | null =
      null;


  /*
   * Métadonnées.
   */
  latestTitle =
    '';

  latestSource =
    '';

  latestCreatedAt =
    '';


  /*
   * Explication enregistrée.
   */
  latestExplanation:
    ExplanationResponse | null =
      null;


  selectedFeature:
    ExplanationFeature | null =
      null;


  /* =========================================================
     UI STATE
  ========================================================= */

  isFeatureModalOpen =
    false;

  isLoading =
    false;

  errorMessage =
    '';


  /* =========================================================
     AUTO REFRESH
  ========================================================= */

  private refreshInterval:
    ReturnType<typeof setInterval> | null =
      null;


  private lastStorageSnapshot =
    '';


  /* =========================================================
     STORAGE
  ========================================================= */

  private readonly HISTORY_KEY =
    'predictionHistory';


  private readonly LATEST_PREDICTION_KEY =
    'latestPrediction';


  private readonly EXPLANATION_KEY =
    'latestPredictionExplanation';


  /* =========================================================
     INIT
  ========================================================= */

  ngOnInit(): void {

    this.loadData();


    /*
     * Prendre le snapshot APRÈS le chargement.
     */
    this.lastStorageSnapshot =
      this.getStorageSnapshot();


    /*
     * Synchronisation automatique.
     */
    this.refreshInterval =
      setInterval(
        () => {

          this.checkForNewPrediction();

        },
        1000
      );


    window.addEventListener(
      'focus',
      this.handleWindowFocus
    );


    document.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange
    );

  }


  /* =========================================================
     DESTROY
  ========================================================= */

  ngOnDestroy(): void {

    if (
      this.refreshInterval !== null
    ) {

      clearInterval(
        this.refreshInterval
      );

      this.refreshInterval =
        null;

    }


    window.removeEventListener(
      'focus',
      this.handleWindowFocus
    );


    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange
    );


    this.closeFeature();

  }


  /* =========================================================
     WINDOW FOCUS
  ========================================================= */

  private handleWindowFocus =
    (): void => {

      this.loadData();

      this.lastStorageSnapshot =
        this.getStorageSnapshot();

    };


  /* =========================================================
     VISIBILITY
  ========================================================= */

  private handleVisibilityChange =
    (): void => {

      if (
        document.visibilityState ===
        'visible'
      ) {

        this.loadData();

        this.lastStorageSnapshot =
          this.getStorageSnapshot();

      }

    };


  /* =========================================================
     LOAD DATA
  ========================================================= */

  loadData(): void {

    this.isLoading =
      true;

    this.errorMessage =
      '';


    try {

      /*
       * IMPORTANT :
       *
       * L'ordre est volontaire.
       *
       * 1. latestPrediction
       * 2. history
       * 3. explanation
       */
      this.loadLatestPrediction();

      this.loadHistory();

      this.loadLatestExplanation();

      this.buildView();

    }

    catch (
      error: unknown
    ) {

      console.error(
        'Explainability error:',
        error
      );


      this.data =
        null;


      this.errorMessage =
        'Unable to load the latest prediction.';

    }

    finally {

      this.isLoading =
        false;

    }

  }


  /* =========================================================
     LOAD LATEST PREDICTION
  ========================================================= */

  private loadLatestPrediction():
    void {

    this.latestPredictionResponse =
      null;

    this.latestInput =
      null;

    this.latestTitle =
      '';

    this.latestSource =
      '';

    this.latestCreatedAt =
      '';


    try {

      const raw =
        localStorage.getItem(
          this.LATEST_PREDICTION_KEY
        );


      /*
       * =====================================================
       * PRIORITÉ 1 :
       * prédiction réellement envoyée par Dashboard
       * =====================================================
       */

      if (raw) {

        const parsed:
          unknown =
          JSON.parse(
            raw
          );


        if (
          parsed &&
          typeof parsed === 'object'
        ) {

          const stored =
            parsed as StoredLatestPrediction;


          if (
            stored.prediction
          ) {

            this.latestPredictionResponse =
              stored.prediction;


            this.latestInput =
              stored.input
              ?? null;


            this.latestTitle =
              String(
                stored.title
                ?? ''
              );


            this.latestSource =
              String(
                stored.source
                ?? ''
              );


            this.latestCreatedAt =
              String(
                stored.createdAt
                ?? ''
              );

          }

        }

      }

    }

    catch (
      error: unknown
    ) {

      console.error(
        'Unable to parse latestPrediction:',
        error
      );

    }


    /*
     * =====================================================
     * Convertir le PredictionResponse en HistoryItem
     * =====================================================
     *
     * Cela permet au reste de la page de fonctionner
     * exactement comme avant.
     */

    if (
      this.latestPredictionResponse
    ) {

      const response =
        this.latestPredictionResponse as unknown as Record<
          string,
          unknown
        >;


      const risk =
        this.firstValue(
          response,
          [
            'risk_level',
            'risk',
            'riskLevel'
          ]
        );


      const probability =
        this.firstValue(
          response,
          [
            'probability',
            'risk_probability',
            'riskProbability'
          ]
        );


      const drivers =
        this.firstArray(
          response,
          [
            'most_influential_features',
            'mostInfluentialFeatures',
            'drivers',
            'influences'
          ]
        );


      const date =
        this.latestCreatedAt
        ||
        this.firstString(
          response,
          [
            'createdAt',
            'created_at',
            'date',
            'timestamp'
          ]
        )
        ||
        new Date().toISOString();


      this.latestPrediction = {

        /*
         * HistoryItem attend risk.
         */
        risk:
          this.normalizeRisk(
            risk
          ),

        /*
         * Probability normalisée 0..1.
         */
        probability:
          this.normalizeProbability(
            probability
          ),

        /*
         * Date de création.
         */
        date,

        /*
         * Drivers.
         */
        drivers:
          this.normalizeDrivers(
            drivers
          )

      } as HistoryItem;


      return;

    }


    /*
     * =====================================================
     * PRIORITÉ 2 :
     * si latestPrediction n'existe pas,
     * le fallback sera predictionHistory.
     * =====================================================
     */

  }


  /* =========================================================
     LOAD HISTORY
  ========================================================= */

  private loadHistory(): void {

    const raw =
      localStorage.getItem(
        this.HISTORY_KEY
      );


    /*
     * Aucun historique.
     *
     * MAIS on ne supprime PAS latestPrediction.
     */
    if (!raw) {

      this.history =
        [];

      /*
       * Ne remplacer latestPrediction que si
       * aucune prédiction Dashboard n'existe.
       */
      if (
        !this.latestPredictionResponse
      ) {

        this.latestPrediction =
          null;

      }

      return;

    }


    try {

      const parsed:
        unknown =
        JSON.parse(
          raw
        );


      if (
        !Array.isArray(
          parsed
        )
      ) {

        this.history =
          [];

        if (
          !this.latestPredictionResponse
        ) {

          this.latestPrediction =
            null;

        }

        return;

      }


      const validItems =
        parsed

          .filter(
            (
              item: unknown
            ): item is HistoryItem => {

              if (
                item === null ||
                typeof item !== 'object'
              ) {

                return false;

              }


              const candidate =
                item as Partial<HistoryItem>;


              return (

                Boolean(
                  candidate.risk
                )

                &&

                Number.isFinite(
                  Number(
                    candidate.probability
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

                ...item,

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
                    item.date ??
                    new Date().toISOString()
                  ),

                drivers:
                  Array.isArray(
                    item.drivers
                  )
                    ? item.drivers
                    : []

              };

            }
          );


      /*
       * Ancienne -> récente.
       */
      validItems.sort(
        (
          first:
            HistoryItem,

          second:
            HistoryItem

        ) => {

          return (
            this.getDateTime(
              first.date
            )
            -
            this.getDateTime(
              second.date
            )
          );

        }
      );


      this.history =
        validItems.slice(-100);


      /*
       * =====================================================
       * FALLBACK UNIQUEMENT
       * =====================================================
       *
       * Si le Dashboard a fourni latestPrediction,
       * on NE REMPLACE PAS cette prédiction avec l'historique.
       */

      if (
        !this.latestPredictionResponse
      ) {

        this.latestPrediction =
          this.history.length > 0

            ? this.history[
                this.history.length - 1
              ]

            : null;

      }

    }

    catch (
      error: unknown
    ) {

      console.error(
        'Unable to parse prediction history:',
        error
      );


      this.history =
        [];


      if (
        !this.latestPredictionResponse
      ) {

        this.latestPrediction =
          null;

      }

    }

  }


  /* =========================================================
     LOAD LATEST EXPLANATION
  ========================================================= */

  private loadLatestExplanation():
    void {

    const raw =
      localStorage.getItem(
        this.EXPLANATION_KEY
      );


    if (!raw) {

      this.latestExplanation =
        null;

      return;

    }


    try {

      const parsed:
        unknown =
        JSON.parse(
          raw
        );


      if (
        parsed === null ||
        typeof parsed !== 'object'
      ) {

        this.latestExplanation =
          null;

        return;

      }


      this.latestExplanation =
        parsed as ExplanationResponse;

    }

    catch (
      error: unknown
    ) {

      console.error(
        'Unable to parse latest explanation:',
        error
      );


      this.latestExplanation =
        null;

    }

  }


  /* =========================================================
     BUILD VIEW
  ========================================================= */

  private buildView(): void {

    /*
     * Pas de prédiction.
     */
    if (
      !this.latestPrediction
    ) {

      this.data =
        null;


      this.errorMessage =
        'No prediction is available yet. Run a prediction from the Dashboard first.';

      return;

    }


    /*
     * =====================================================
     * RÉSULTAT FINAL
     * =====================================================
     *
     * Le risque et la probabilité viennent de
     * latestPrediction.
     */

    const prediction:
      LatestPredictionView =
      {

        risk_level:
          this.normalizeRisk(
            this.latestPrediction.risk
          ),

        prediction:
          this.getPredictionText(
            this.latestPrediction
          ),

        probability:
          this.normalizeProbability(
            this.latestPrediction.probability
          ),

        date:
          String(
            this.latestPrediction.date
          )

      };


    /*
     * Drivers.
     */
    const features =
      this.extractLatestFeatures();


    this.data = {

      prediction,

      most_influential_features:
        features

    };

  }


  /* =========================================================
     GET LATEST
  ========================================================= */

  get latest():
    HistoryItem | null {

    return this.latestPrediction;

  }


  /* =========================================================
     GET LATEST RISK
  ========================================================= */

  get latestRisk():
    RiskLevel {

    if (
      !this.latestPrediction
    ) {

      return 'LOW';

    }


    return this.normalizeRisk(
      this.latestPrediction.risk
    );

  }


  /* =========================================================
     GET LATEST PROBABILITY
  ========================================================= */

  get latestProbability():
    number {

    if (
      !this.latestPrediction
    ) {

      return 0;

    }


    return this.normalizeProbability(
      this.latestPrediction.probability
    );

  }


  /* =========================================================
     GET LATEST DATE
  ========================================================= */

  get latestDate():
    string {

    /*
     * Date du Dashboard prioritaire.
     */
    if (
      this.latestCreatedAt
    ) {

      return this.latestCreatedAt;

    }


    return (
      this.latestPrediction?.date
      ??
      ''
    );

  }


  /* =========================================================
     GET LATEST FEATURES
  ========================================================= */

  private extractLatestFeatures():
    ExplanationFeature[] {


    /*
     * =====================================================
     * PRIORITÉ 1 :
     * Drivers directement dans latestPrediction
     * =====================================================
     */

    if (

      this.latestPrediction

      &&

      Array.isArray(
        this.latestPrediction.drivers
      )

      &&

      this.latestPrediction.drivers.length > 0

    ) {

      return this.normalizeFeatures(
        this.latestPrediction.drivers
      );

    }


    /*
     * =====================================================
     * PRIORITÉ 2 :
     * Drivers dans latestPredictionExplanation
     * =====================================================
     */

    if (
      this.latestExplanation
    ) {

      const explanation =
        this.latestExplanation as unknown as Record<
          string,
          unknown
        >;


      const features =
        this.extractFeaturesFromObject(
          explanation
        );


      if (
        features.length > 0
      ) {

        return features;

      }

    }


    /*
     * =====================================================
     * PRIORITÉ 3 :
     * Drivers dans predictionHistory
     * =====================================================
     */

    if (

      this.latest

      &&

      Array.isArray(
        this.latest.drivers
      )

      &&

      this.latest.drivers.length > 0

    ) {

      return this.normalizeFeatures(
        this.latest.drivers
      );

    }


    return [];

  }


  /* =========================================================
     NORMALIZE FEATURES
  ========================================================= */

  private normalizeFeatures(
    drivers:
      PredictionInfluence[]
  ):
    ExplanationFeature[] {

    const result:
      ExplanationFeature[] =
        [];


    for (
      const driver of drivers
    ) {

      if (
        !driver ||
        typeof driver.feature !== 'string'
      ) {

        continue;

      }


      const influence =
        this.toNumber(
          driver.influence
        );


      result.push({

        feature:
          driver.feature,

        influence,

        direction:
          this.getInfluenceLabel(
            influence
          ),

        explanation:
          this.generateFeatureExplanation(
            driver.feature,
            influence
          )

      });

    }


    return result

      .sort(
        (
          first,
          second
        ) =>

          Math.abs(
            second.influence
          )
          -
          Math.abs(
            first.influence
          )
      )

      .slice(
        0,
        10
      );

  }


  /* =========================================================
     NORMALIZE DRIVERS FROM UNKNOWN
  ========================================================= */

  private normalizeDrivers(
    value:
      unknown[]
  ):
    PredictionInfluence[] {

    const result:
      PredictionInfluence[] =
        [];


    for (
      const item of value
    ) {

      if (
        item === null ||
        typeof item !== 'object' ||
        Array.isArray(item)
      ) {

        continue;

      }


      const object =
        item as Record<
          string,
          unknown
        >;


      const feature =
        this.firstString(
          object,
          [
            'feature',
            'name',
            'feature_name'
          ]
        );


      if (
        !feature
      ) {

        continue;

      }


      const influence =
        this.firstNumber(
          object,
          [
            'influence',
            'importance',
            'impact',
            'shap_value',
            'shapValue'
          ]
        );


      result.push({

        feature,

        influence

      } as PredictionInfluence);

    }


    return result;

  }


  /* =========================================================
     EXTRACT FEATURES OBJECT
  ========================================================= */

  private extractFeaturesFromObject(
    source:
      Record<string, unknown>
  ):
    ExplanationFeature[] {

    const possibleKeys = [

      'most_influential_features',

      'mostInfluentialFeatures',

      'top_drivers',

      'topDrivers',

      'features',

      'drivers'

    ];


    let rawFeatures:
      unknown =
        null;


    /*
     * Recherche directe.
     */
    for (
      const key of possibleKeys
    ) {

      const value =
        source[key];


      if (
        Array.isArray(
          value
        )
      ) {

        rawFeatures =
          value;

        break;

      }

    }


    /*
     * Recherche dans prediction.
     */
    if (

      !Array.isArray(
        rawFeatures
      )

      &&

      source['prediction']

      &&

      typeof source['prediction'] ===
        'object'

    ) {

      const nested =
        source['prediction'] as Record<
          string,
          unknown
        >;


      for (
        const key of possibleKeys
      ) {

        const value =
          nested[key];


        if (
          Array.isArray(
            value
          )
        ) {

          rawFeatures =
            value;

          break;

        }

      }

    }


    /*
     * Recherche dans explanation.
     */
    if (

      !Array.isArray(
        rawFeatures
      )

      &&

      source['explanation']

      &&

      typeof source['explanation'] ===
        'object'

    ) {

      const nested =
        source['explanation'] as Record<
          string,
          unknown
        >;


      for (
        const key of possibleKeys
      ) {

        const value =
          nested[key];


        if (
          Array.isArray(
            value
          )
        ) {

          rawFeatures =
            value;

          break;

        }

      }

    }


    if (
      !Array.isArray(
        rawFeatures
      )
    ) {

      return [];

    }


    const result:
      ExplanationFeature[] =
        [];


    for (
      const item of rawFeatures
    ) {

      if (

        item === null

        ||

        typeof item !== 'object'

        ||

        Array.isArray(
          item
        )

      ) {

        continue;

      }


      const feature =
        item as Record<
          string,
          unknown
        >;


      const name =
        this.firstString(
          feature,
          [
            'feature',
            'name',
            'feature_name'
          ]
        );


      if (
        !name
      ) {

        continue;

      }


      const influence =
        this.firstNumber(
          feature,
          [
            'influence',
            'importance',
            'impact',
            'shap_value',
            'shapValue'
          ]
        );


      const direction =
        this.firstString(
          feature,
          [
            'direction',
            'effect',
            'impact_direction'
          ]
        )
        ||
        this.getInfluenceLabel(
          influence
        );


      const explanationText =
        this.firstString(
          feature,
          [
            'explanation',
            'description',
            'reason',
            'message'
          ]
        )
        ||
        this.generateFeatureExplanation(
          name,
          influence
        );


      result.push({

        feature:
          name,

        influence,

        direction,

        explanation:
          explanationText

      });

    }


    return result

      .sort(
        (
          first,
          second
        ) =>

          Math.abs(
            second.influence
          )
          -
          Math.abs(
            first.influence
          )
      )

      .slice(
        0,
        10
      );

  }


  /* =========================================================
     PREDICTION TEXT
  ========================================================= */

  private getPredictionText(
    item:
      HistoryItem
  ):
    string {

    const candidate =
      item as unknown as Record<
        string,
        unknown
      >;


    const values:
      unknown[] = [

        candidate['prediction'],

        candidate['decision'],

        candidate['result'],

        candidate['label']

      ];


    for (
      const value of values
    ) {

      if (

        typeof value === 'string'

        &&

        value.trim()

      ) {

        return value.trim();

      }

    }


    return this.getDecisionText(
      this.normalizeRisk(
        item.risk
      )
    );

  }


  /* =========================================================
     PROBABILITY
  ========================================================= */

  normalizeProbability(
    value:
      unknown
  ):
    number {

    let probability =
      Number(
        value
      );


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


  formatProbability(
    value:
      unknown
  ):
    string {

    return (
      this.normalizeProbability(
        value
      ) * 100
    ).toFixed(
      1
    ) + '%';

  }


  getProbabilityPercent(
    value:
      unknown
  ):
    number {

    return (
      this.normalizeProbability(
        value
      ) * 100
    );

  }


  /* =========================================================
     INFLUENCE
  ========================================================= */

  formatInfluence(
    value:
      unknown
  ):
    number {

    let influence =
      Number(
        value
      );


    if (
      !Number.isFinite(
        influence
      )
    ) {

      return 0;

    }


    if (
      Math.abs(
        influence
      ) <= 1
    ) {

      influence *=
        100;

    }


    return influence;

  }


  getInfluenceWidth(
    value:
      unknown
  ):
    number {

    return Math.min(
      Math.abs(
        this.formatInfluence(
          value
        )
      ),
      100
    );

  }


  getInfluenceClass(
    value:
      unknown
  ):
    string {

    return (
      this.formatInfluence(
        value
      ) >= 0
        ? 'increase'
        : 'decrease'
    );

  }


  getInfluenceLabel(
    value:
      unknown
  ):
    string {

    return (
      this.formatInfluence(
        value
      ) >= 0
        ? 'Increases risk'
        : 'Reduces risk'
    );

  }


  getInfluenceIcon(
    value:
      unknown
  ):
    string {

    return (
      this.formatInfluence(
        value
      ) >= 0
        ? 'bi-arrow-up-right'
        : 'bi-arrow-down-right'
    );

  }


  /* =========================================================
     FEATURE EXPLANATION
  ========================================================= */

  generateFeatureExplanation(
    feature:
      string,

    influence:
      number
  ):
    string {

    const name =
      this.formatFeatureName(
        feature
      );


    const percentage =
      Math.abs(
        this.formatInfluence(
          influence
        )
      ).toFixed(
        1
      );


    if (
      this.formatInfluence(
        influence
      ) >= 0
    ) {

      return (
        `${name} contributes to a higher predicted risk. ` +
        `Its estimated influence is ${percentage}%.`
      );

    }


    return (
      `${name} contributes to a lower predicted risk. ` +
      `Its estimated influence is ${percentage}%.`
    );

  }


  /* =========================================================
     RISK NORMALIZATION
  ========================================================= */

  normalizeRisk(
    value:
      unknown
  ):
    RiskLevel {

    const normalized =
      String(
        value ?? ''
      )
        .trim()
        .toUpperCase();


    if (

      normalized === 'HIGH'

      ||

      normalized.includes('HIGH')

    ) {

      return 'HIGH';

    }


    if (

      normalized === 'MEDIUM'

      ||

      normalized.includes('MEDIUM')

      ||

      normalized.includes('MODERATE')

      ||

      normalized === 'MED'

    ) {

      return 'MEDIUM';

    }


    return 'LOW';

  }


  /* =========================================================
     RISK LABEL
  ========================================================= */

  getRiskLabel(
    value:
      unknown
  ):
    string {

    switch (
      this.normalizeRisk(
        value
      )
    ) {

      case 'HIGH':
        return 'High';

      case 'MEDIUM':
        return 'Medium';

      default:
        return 'Low';

    }

  }


  /* =========================================================
     RISK CLASS
  ========================================================= */

  getRiskClass(
    value:
      unknown
  ):
    string {

    return (
      'risk-' +
      this.normalizeRisk(
        value
      ).toLowerCase()
    );

  }


  /* =========================================================
     RISK ICON
  ========================================================= */

  getRiskIcon(
    value:
      unknown
  ):
    string {

    switch (
      this.normalizeRisk(
        value
      )
    ) {

      case 'HIGH':

        return (
          'bi-exclamation-octagon-fill'
        );

      case 'MEDIUM':

        return (
          'bi-exclamation-triangle-fill'
        );

      default:

        return (
          'bi-check-circle-fill'
        );

    }

  }


  /* =========================================================
     RISK DESCRIPTION
  ========================================================= */

  getRiskDescription(
    value:
      unknown
  ):
    string {

    switch (
      this.normalizeRisk(
        value
      )
    ) {

      case 'HIGH':

        return (
          'The model identifies a high probability of SLA breach or quality risk.'
        );

      case 'MEDIUM':

        return (
          'The model identifies a moderate level of risk and recommends monitoring.'
        );

      default:

        return (
          'The model identifies a relatively low level of risk.'
        );

    }

  }


  /* =========================================================
     DECISION TEXT
  ========================================================= */

  private getDecisionText(
    risk:
      RiskLevel
  ):
    string {

    switch (
      risk
    ) {

      case 'HIGH':

        return (
          'SLA breach risk detected'
        );

      case 'MEDIUM':

        return (
          'Moderate SLA breach risk'
        );

      default:

        return (
          'Low SLA breach risk'
        );

    }

  }


  /* =========================================================
     FEATURE NAME
  ========================================================= */

  formatFeatureName(
    value:
      unknown
  ):
    string {

    return String(
      value ?? ''
    )
      .replace(
        /[_-]+/g,
        ' '
      )
      .replace(
        /\b\w/g,
        character =>
          character.toUpperCase()
      )
      .trim();

  }


  format(
    value:
      unknown
  ):
    string {

    return this.formatFeatureName(
      value
    );

  }


  /* =========================================================
     DATE
  ========================================================= */

  formatDateTime(
    value:
      unknown
  ):
    string {

    const date =
      new Date(
        String(
          value ?? ''
        )
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return 'N/A';

    }


    return date.toLocaleString(
      'en-GB',
      {

        day: '2-digit',

        month: 'short',

        year: 'numeric',

        hour: '2-digit',

        minute: '2-digit'

      }
    );

  }


  /* =========================================================
     POPUP
  ========================================================= */

  openFeature(
    feature:
      ExplanationFeature
  ):
    void {

    this.selectedFeature =
      feature;


    this.isFeatureModalOpen =
      true;


    document.body.style.overflow =
      'hidden';

  }


  closeFeature():
    void {

    this.isFeatureModalOpen =
      false;


    this.selectedFeature =
      null;


    document.body.style.overflow =
      '';

  }


  /* =========================================================
     ESCAPE
  ========================================================= */

  @HostListener(
    'document:keydown.escape'
  )

  onEscape():
    void {

    if (
      this.isFeatureModalOpen
    ) {

      this.closeFeature();

    }

  }


  /* =========================================================
     REFRESH
  ========================================================= */

  refresh():
    void {

    this.closeFeature();

    this.loadData();

    this.lastStorageSnapshot =
      this.getStorageSnapshot();

  }


  /* =========================================================
     AUTO DETECTION
  ========================================================= */

  private checkForNewPrediction():
    void {

    const currentSnapshot =
      this.getStorageSnapshot();


    /*
     * Aucun changement.
     */
    if (
      currentSnapshot ===
      this.lastStorageSnapshot
    ) {

      return;

    }


    /*
     * Nouvelle prédiction détectée.
     */
    this.lastStorageSnapshot =
      currentSnapshot;


    this.loadData();

  }


  /* =========================================================
     STORAGE SNAPSHOT
  ========================================================= */

  private getStorageSnapshot():
    string {

    return (

      (
        localStorage.getItem(
          this.LATEST_PREDICTION_KEY
        )
        ?? ''
      )

      +

      '||'

      +

      (
        localStorage.getItem(
          this.HISTORY_KEY
        )
        ?? ''
      )

      +

      '||'

      +

      (
        localStorage.getItem(
          this.EXPLANATION_KEY
        )
        ?? ''
      )

    );

  }


  /* =========================================================
     DATE TIMESTAMP
  ========================================================= */

  private getDateTime(
    value:
      unknown
  ):
    number {

    const timestamp =
      new Date(
        String(
          value ?? ''
        )
      ).getTime();


    return Number.isFinite(
      timestamp
    )
      ? timestamp
      : 0;

  }


  /* =========================================================
     NUMBER
  ========================================================= */

  private toNumber(
    value:
      unknown
  ):
    number {

    const number =
      Number(
        value
      );


    return Number.isFinite(
      number
    )
      ? number
      : 0;

  }


  /* =========================================================
     FIRST VALUE
  ========================================================= */

  private firstValue(
    source:
      Record<string, unknown>,

    keys:
      string[]
  ):
    unknown {

    for (
      const key of keys
    ) {

      if (
        source[key] !== undefined &&
        source[key] !== null
      ) {

        return source[key];

      }

    }


    return null;

  }


  /* =========================================================
     FIRST STRING
  ========================================================= */

  private firstString(
    source:
      Record<string, unknown>,

    keys:
      string[]
  ):
    string {

    for (
      const key of keys
    ) {

      const value =
        source[key];


      if (

        typeof value ===
        'string'

        &&

        value.trim().length > 0

      ) {

        return value.trim();

      }

    }


    return '';

  }


  /* =========================================================
     FIRST NUMBER
  ========================================================= */

  private firstNumber(
    source:
      Record<string, unknown>,

    keys:
      string[]
  ):
    number {

    for (
      const key of keys
    ) {

      const value =
        Number(
          source[key]
        );


      if (
        Number.isFinite(
          value
        )
      ) {

        return value;

      }

    }


    return 0;

  }


  /* =========================================================
     FIRST ARRAY
  ========================================================= */

  private firstArray(
    source:
      Record<string, unknown>,

    keys:
      string[]
  ):
    unknown[] {

    for (
      const key of keys
    ) {

      if (
        Array.isArray(
          source[key]
        )
      ) {

        return source[key] as unknown[];

      }

    }


    return [];

  }


  /* =========================================================
     TRACK FEATURE
  ========================================================= */

  trackFeature(
    index:
      number,

    feature:
      ExplanationFeature
  ):
    string {

    return (
      `${feature.feature}-${index}`
    );

  }

}