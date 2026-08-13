import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  Chart,
  ChartConfiguration,
  registerables
} from 'chart.js';

import { ApiService } from '../../service/api.service';

import {
  HistoryItem,
  ImportanceItem,
  ImportanceResponse,
  PredictionInfluence,
  RiskLevel,
  ExplanationResponse
} from '../../models/api.models';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  standalone: true,

  imports: [
    CommonModule,
    RouterLink
  ],

  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent
  implements OnInit, OnDestroy {

  // ============================================================
  // API
  // ============================================================

  private readonly api = inject(ApiService);

  // ============================================================
  // DATA
  // ============================================================

  history: HistoryItem[] = [];

  globalImportance: ImportanceResponse | null = null;

  latestExplanation: ExplanationResponse | null = null;

  loading = false;

  loadingImportance = false;

  errorMessage = '';

  // ============================================================
  // AUTO REFRESH
  // ============================================================

  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  private lastStorageSnapshot = '';

  // ============================================================
  // CANVAS
  // ============================================================

  private riskCanvas: HTMLCanvasElement | null = null;

  private histogramCanvas: HTMLCanvasElement | null = null;

  private evolutionCanvas: HTMLCanvasElement | null = null;

  private comparisonCanvas: HTMLCanvasElement | null = null;

  private influenceCanvas: HTMLCanvasElement | null = null;

  private importanceCanvas: HTMLCanvasElement | null = null;

  // ============================================================
  // CHARTS
  // ============================================================

  private riskChart: Chart | null = null;

  private histogramChart: Chart | null = null;

  private evolutionChart: Chart | null = null;

  private comparisonChart: Chart | null = null;

  private influenceChart: Chart | null = null;

  private importanceChart: Chart | null = null;

  // ============================================================
  // COLORS
  // ============================================================

  private readonly highColor = '#ef4444';

  private readonly mediumColor = '#f59e0b';

  private readonly lowColor = '#22c55e';

  private readonly primaryColor = '#6366f1';

  private readonly blueColor = '#2563eb';

  // ============================================================
  // VIEW CHILD
  // ============================================================

  @ViewChild('riskDistributionChart')
  set riskDistributionCanvas(
    reference: ElementRef<HTMLCanvasElement> | undefined
  ) {

    this.riskCanvas =
      reference?.nativeElement ?? null;

    this.scheduleChartCreation(
      () => this.createRiskChart()
    );
  }


  @ViewChild('probabilityHistogramChart')
  set probabilityHistogramCanvas(
    reference: ElementRef<HTMLCanvasElement> | undefined
  ) {

    this.histogramCanvas =
      reference?.nativeElement ?? null;

    this.scheduleChartCreation(
      () => this.createHistogramChart()
    );
  }


  @ViewChild('probabilityEvolutionChart')
  set probabilityEvolutionCanvas(
    reference: ElementRef<HTMLCanvasElement> | undefined
  ) {

    this.evolutionCanvas =
      reference?.nativeElement ?? null;

    this.scheduleChartCreation(
      () => this.createEvolutionChart()
    );
  }


  @ViewChild('predictionComparisonChart')
  set predictionComparisonCanvas(
    reference: ElementRef<HTMLCanvasElement> | undefined
  ) {

    this.comparisonCanvas =
      reference?.nativeElement ?? null;

    this.scheduleChartCreation(
      () => this.createComparisonChart()
    );
  }


  @ViewChild('influenceChart')
  set localInfluenceCanvas(
    reference: ElementRef<HTMLCanvasElement> | undefined
  ) {

    this.influenceCanvas =
      reference?.nativeElement ?? null;

    this.scheduleChartCreation(
      () => this.createInfluenceChart()
    );
  }


  @ViewChild('globalImportanceChart')
  set featureImportanceCanvas(
    reference: ElementRef<HTMLCanvasElement> | undefined
  ) {

    this.importanceCanvas =
      reference?.nativeElement ?? null;

    this.scheduleChartCreation(
      () => this.createImportanceChart()
    );
  }


  // ============================================================
  // LIFECYCLE
  // ============================================================

  ngOnInit(): void {

    this.loadAllData();

    this.refreshInterval =
      setInterval(
        () => this.checkForNewPrediction(),
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


  ngOnDestroy(): void {

    if (this.refreshInterval !== null) {

      clearInterval(
        this.refreshInterval
      );

      this.refreshInterval = null;
    }

    window.removeEventListener(
      'focus',
      this.handleWindowFocus
    );

    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange
    );

    this.destroyAllCharts();
  }


  // ============================================================
  // WINDOW EVENTS
  // ============================================================

  private handleWindowFocus = (): void => {

    this.loadAllData();
  };


  private handleVisibilityChange = (): void => {

    if (
      document.visibilityState === 'visible'
    ) {

      this.loadAllData();
    }
  };


  // ============================================================
  // LOAD ALL DATA
  // ============================================================

  private loadAllData(): void {

    this.loadHistory();

    this.loadLatestExplanation();

    if (
      !this.globalImportance
    ) {

      this.loadGlobalImportance();
    }
  }


  // ============================================================
  // KPI
  // ============================================================

  get total(): number {

    return this.history.length;
  }


  get highCount(): number {

    return this.count('HIGH');
  }


  get mediumCount(): number {

    return this.count('MEDIUM');
  }


  get lowCount(): number {

    return this.count('LOW');
  }


  get highPercentage(): number {

    return this.calculatePercentage(
      this.highCount
    );
  }


  get mediumPercentage(): number {

    return this.calculatePercentage(
      this.mediumCount
    );
  }


  get lowPercentage(): number {

    return this.calculatePercentage(
      this.lowCount
    );
  }


  get average(): number {

    if (!this.total) {

      return 0;
    }

    const totalProbability =
      this.history.reduce(
        (
          sum: number,
          item: HistoryItem
        ) => {

          return (
            sum +
            this.normalizeProbability(
              item.probability
            )
          );
        },
        0
      );

    return (
      totalProbability /
      this.total
    ) * 100;
  }


  get maximum(): number {

    if (!this.total) {

      return 0;
    }

    return (
      Math.max(
        ...this.history.map(
          item =>
            this.normalizeProbability(
              item.probability
            )
        )
      ) * 100
    );
  }


  get minimum(): number {

    if (!this.total) {

      return 0;
    }

    return (
      Math.min(
        ...this.history.map(
          item =>
            this.normalizeProbability(
              item.probability
            )
        )
      ) * 100
    );
  }


  // ============================================================
  // DERNIERE PREDICTION
  // ============================================================

  get latest(): HistoryItem | null {

    if (!this.history.length) {

      return null;
    }

    /*
     * IMPORTANT :
     *
     * history est déjà trié par date dans loadHistory().
     * Le dernier élément correspond donc toujours
     * à la dernière prédiction enregistrée.
     */

    return this.history[
      this.history.length - 1
    ];
  }


  // ============================================================
  // DERNIERS DRIVERS
  // ============================================================

  get latestDrivers(): PredictionInfluence[] {

    /*
     * 1. PRIORITE AUX DRIVERS ENREGISTRES
     *    DANS LA DERNIERE PREDICTION.
     */

    if (
      this.latest?.drivers &&
      Array.isArray(
        this.latest.drivers
      ) &&
      this.latest.drivers.length
    ) {

      return this.latest.drivers;
    }


    /*
     * 2. FALLBACK SUR latestPredictionExplanation
     *
     * Utilisé seulement si la dernière entrée
     * de l'historique ne contient pas les drivers.
     */

    if (
      this.latestExplanation
        ?.most_influential_features
        ?.length
    ) {

      return (
        this.latestExplanation
          .most_influential_features
      );
    }


    return [];
  }


  // ============================================================
  // DERNIER RISQUE
  // ============================================================

  get latestRisk(): RiskLevel {

    /*
     * IMPORTANT :
     *
     * On utilise TOUJOURS le risque de la dernière
     * prédiction enregistrée dans l'historique.
     *
     * latestPredictionExplanation ne doit pas
     * remplacer cette valeur.
     */

    if (this.latest) {

      return this.normalizeRisk(
        this.latest.risk
      );
    }

    return 'LOW';
  }


  // ============================================================
  // DERNIERE PROBABILITE
  // ============================================================

  get latestProbability(): number {

    /*
     * Même logique :
     * la probabilité vient de la dernière prédiction.
     */

    if (this.latest) {

      return this.normalizeProbability(
        this.latest.probability
      );
    }

    return 0;
  }


  // ============================================================
  // DERNIERE DATE
  // ============================================================

  get latestDate(): string {

    return this.latest?.date ?? '';
  }


  // ============================================================
  // COUNT
  // ============================================================

  count(
    risk: RiskLevel
  ): number {

    return this.history.filter(
      item =>
        this.normalizeRisk(
          item.risk
        ) === risk
    ).length;
  }


  private calculatePercentage(
    value: number
  ): number {

    if (!this.total) {

      return 0;
    }

    return (
      value /
      this.total
    ) * 100;
  }


  // ============================================================
  // LOAD HISTORY
  // ============================================================

  loadHistory(): void {

    this.loading = true;

    this.errorMessage = '';

    try {

      const storedValue =
        localStorage.getItem(
          'predictionHistory'
        );


      if (!storedValue) {

        this.history = [];

        this.scheduleAllCharts();

        return;
      }


      const parsedValue: unknown =
        JSON.parse(
          storedValue
        );


      if (
        !Array.isArray(
          parsedValue
        )
      ) {

        this.history = [];

        this.scheduleAllCharts();

        return;
      }


      this.history =
        parsedValue

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

              return Boolean(
                candidate.risk
              ) &&
              Number.isFinite(
                Number(
                  candidate.probability
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
                    new Date()
                      .toISOString()
                  ),

                drivers:
                  Array.isArray(
                    item.drivers
                  )
                    ? item.drivers
                    : []
              };
            }
          )


          /*
           * TRI PAR DATE
           *
           * Ancienne -> récente
           */

          .sort(
            (
              first,
              second
            ) => {

              const firstTime =
                new Date(
                  first.date
                ).getTime();

              const secondTime =
                new Date(
                  second.date
                ).getTime();

              return (
                firstTime -
                secondTime
              );
            }
          )


          /*
           * Garder les 100 dernières prédictions.
           */

          .slice(-100);


      /*
       * Snapshot uniquement de l'historique.
       *
       * On ne mélange pas ici latestExplanation.
       */

      this.lastStorageSnapshot =
        storedValue;

    }

    catch (
      error: unknown
    ) {

      console.error(
        'Erreur Analytics:',
        error
      );

      this.history = [];

      this.errorMessage =
        'Impossible de lire l’historique.';
    }

    finally {

      this.loading = false;

      this.scheduleAllCharts();
    }
  }


  // ============================================================
  // LOAD LATEST EXPLANATION
  // ============================================================

  private loadLatestExplanation(): void {

    try {

      const stored =
        localStorage.getItem(
          'latestPredictionExplanation'
        );


      if (!stored) {

        this.latestExplanation = null;

        return;
      }


      const parsed: unknown =
        JSON.parse(
          stored
        );


      if (
        !parsed ||
        typeof parsed !== 'object'
      ) {

        this.latestExplanation = null;

        return;
      }


      const explanation =
        parsed as ExplanationResponse;


      if (
        explanation.prediction
      ) {

        this.latestExplanation =
          explanation;

      }
      else {

        this.latestExplanation =
          null;
      }

    }

    catch (
      error: unknown
    ) {

      console.error(
        'Erreur latestPredictionExplanation:',
        error
      );

      this.latestExplanation = null;
    }


    /*
     * IMPORTANT :
     *
     * On reconstruit Feature Influence après
     * avoir chargé l'explication.
     */

    this.scheduleChartCreation(
      () =>
        this.createInfluenceChart()
    );
  }


  // ============================================================
  // DETECT NEW PREDICTION
  // ============================================================

  private checkForNewPrediction(): void {

    const currentHistory =
      localStorage.getItem(
        'predictionHistory'
      ) ?? '';


    /*
     * On surveille également l'explication
     * car elle contient les drivers de la
     * dernière prédiction.
     */

    const currentExplanation =
      localStorage.getItem(
        'latestPredictionExplanation'
      ) ?? '';


    const currentSnapshot =
      currentHistory +
      '||' +
      currentExplanation;


    const previousSnapshot =
      this.lastStorageSnapshot;


    /*
     * Première initialisation.
     */

    if (!previousSnapshot) {

      this.lastStorageSnapshot =
        currentSnapshot;

      return;
    }


    /*
     * Nouvelle prédiction détectée.
     */

    if (
      currentSnapshot !==
      previousSnapshot
    ) {

      this.lastStorageSnapshot =
        currentHistory;


      /*
       * Recharger les deux sources.
       */

      this.loadHistory();

      this.loadLatestExplanation();


      /*
       * IMPORTANT :
       *
       * Reconstruction immédiate des graphiques.
       */

      this.scheduleChartCreation(
        () => {

          this.createRiskChart();

          this.createHistogramChart();

          this.createEvolutionChart();

          this.createComparisonChart();

          this.createInfluenceChart();

          this.createImportanceChart();
        }
      );
    }
  }


  // ============================================================
  // GLOBAL IMPORTANCE
  // ============================================================

  loadGlobalImportance(): void {

    this.loadingImportance = true;

    this.api
      .featureImportance(12)
      .subscribe({

        next: (
          response: ImportanceResponse
        ) => {

          this.globalImportance =
            response;

          this.loadingImportance =
            false;

          this.scheduleChartCreation(
            () =>
              this.createImportanceChart()
          );
        },

        error: (
          error: unknown
        ) => {

          console.error(
            'Importance indisponible:',
            error
          );

          this.globalImportance =
            null;

          this.loadingImportance =
            false;
        }
      });
  }


  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {

    this.loadHistory();

    this.loadLatestExplanation();

    this.loadGlobalImportance();
  }


  // ============================================================
  // CLEAR
  // ============================================================

  clear(): void {

    const shouldClear =
      window.confirm(
        'Supprimer tout l’historique ?'
      );


    if (!shouldClear) {

      return;
    }


    localStorage.removeItem(
      'predictionHistory'
    );


    localStorage.removeItem(
      'latestPredictionExplanation'
    );


    this.history = [];

    this.latestExplanation = null;

    this.globalImportance = null;

    this.lastStorageSnapshot = '';


    this.destroyAllCharts();
  }


  // ============================================================
  // CHART SCHEDULING
  // ============================================================

  private scheduleChartCreation(
    callback: () => void
  ): void {

    if (
      typeof window === 'undefined'
    ) {

      return;
    }


    requestAnimationFrame(
      () => {

        setTimeout(
          callback,
          0
        );
      }
    );
  }


  private scheduleAllCharts(): void {

    this.scheduleChartCreation(
      () => {

        this.createRiskChart();

        this.createHistogramChart();

        this.createEvolutionChart();

        this.createComparisonChart();

        this.createInfluenceChart();

        this.createImportanceChart();
      }
    );
  }


  // ============================================================
  // RISK DISTRIBUTION
  // ============================================================

  private createRiskChart(): void {

    if (!this.riskCanvas) {

      return;
    }


    this.riskChart?.destroy();


    if (!this.total) {

      return;
    }


    const configuration:
      ChartConfiguration<'doughnut'> =
      {

        type: 'doughnut',

        data: {

          labels: [
            'High',
            'Medium',
            'Low'
          ],

          datasets: [
            {

              data: [
                this.highCount,
                this.mediumCount,
                this.lowCount
              ],

              backgroundColor: [
                this.highColor,
                this.mediumColor,
                this.lowColor
              ],

              borderWidth: 0,

              hoverOffset: 8
            }
          ]
        },

        options: {

          responsive: true,

          maintainAspectRatio: false,

          cutout: '72%',

          animation: {
            duration: 650
          },

          plugins: {

            legend: {

              position: 'bottom',

              labels: {
                usePointStyle: true,
                padding: 18
              }
            }
          }
        }
      };


    this.riskChart =
      new Chart(
        this.riskCanvas,
        configuration
      );
  }


  // ============================================================
  // HISTOGRAM
  // ============================================================

  private createHistogramChart(): void {

    if (!this.histogramCanvas) {

      return;
    }


    this.histogramChart?.destroy();


    if (!this.total) {

      return;
    }


    const ranges = [

      {
        label: '0–20%',
        minimum: 0,
        maximum: 20
      },

      {
        label: '20–35%',
        minimum: 20,
        maximum: 35
      },

      {
        label: '35–50%',
        minimum: 35,
        maximum: 50
      },

      {
        label: '50–68%',
        minimum: 50,
        maximum: 68
      },

      {
        label: '68–85%',
        minimum: 68,
        maximum: 85
      },

      {
        label: '85–100%',
        minimum: 85,
        maximum: 101
      }
    ];


    const values =
      ranges.map(
        range => {

          return this.history.filter(
            item => {

              const probability =
                this.normalizeProbability(
                  item.probability
                ) * 100;

              return (
                probability >=
                  range.minimum
                &&
                probability <
                  range.maximum
              );
            }
          ).length;
        }
      );


    const configuration:
      ChartConfiguration<'bar'> =
      {

        type: 'bar',

        data: {

          labels:
            ranges.map(
              range =>
                range.label
            ),

          datasets: [
            {

              data: values,

              backgroundColor: [
                '#22c55e',
                '#4ade80',
                '#fbbf24',
                '#f59e0b',
                '#f87171',
                '#ef4444'
              ],

              borderRadius: 7,

              borderSkipped: false
            }
          ]
        },

        options: {

          responsive: true,

          maintainAspectRatio: false,

          scales: {

            y: {

              beginAtZero: true,

              ticks: {
                precision: 0
              },

              grid: {
                color: '#eef2f7'
              }
            },

            x: {

              grid: {
                display: false
              }
            }
          },

          plugins: {

            legend: {
              display: false
            }
          }
        }
      };


    this.histogramChart =
      new Chart(
        this.histogramCanvas,
        configuration
      );
  }


  // ============================================================
  // EVOLUTION
  // ============================================================

  private createEvolutionChart(): void {

    if (!this.evolutionCanvas) {

      return;
    }


    this.evolutionChart?.destroy();


    if (!this.total) {

      return;
    }


    const labels =
      this.history.map(
        item =>
          this.formatDate(
            item.date
          )
      );


    const probabilities =
      this.history.map(
        item =>
          this.normalizeProbability(
            item.probability
          ) * 100
      );


    const configuration:
      ChartConfiguration<'line'> =
      {

        type: 'line',

        data: {

          labels,

          datasets: [

            {

              label: 'Probability',

              data: probabilities,

              borderColor:
                this.primaryColor,

              backgroundColor:
                'rgba(99,102,241,.08)',

              pointBackgroundColor:
                this.history.map(
                  item =>
                    this.getRiskColor(
                      item.risk
                    )
                ),

              pointBorderColor:
                '#ffffff',

              pointBorderWidth: 2,

              pointRadius: 4,

              borderWidth: 3,

              tension: .35,

              fill: true
            },

            {

              label: 'HIGH 68%',

              data:
                this.history.map(
                  () => 68
                ),

              borderColor:
                this.highColor,

              borderDash: [
                7,
                6
              ],

              pointRadius: 0,

              borderWidth: 1.5
            },

            {

              label: 'MEDIUM 35%',

              data:
                this.history.map(
                  () => 35
                ),

              borderColor:
                this.mediumColor,

              borderDash: [
                7,
                6
              ],

              pointRadius: 0,

              borderWidth: 1.5
            }
          ]
        },

        options: {

          responsive: true,

          maintainAspectRatio: false,

          interaction: {
            mode: 'index',
            intersect: false
          },

          scales: {

            y: {

              min: 0,

              max: 100,

              ticks: {

                callback:
                  value =>
                    `${value}%`
              },

              grid: {
                color: '#eef2f7'
              }
            },

            x: {

              grid: {
                display: false
              }
            }
          },

          plugins: {

            legend: {

              position: 'bottom',

              labels: {
                usePointStyle: true
              }
            }
          }
        }
      };


    this.evolutionChart =
      new Chart(
        this.evolutionCanvas,
        configuration
      );
  }


  // ============================================================
  // COMPARISON
  // ============================================================

  private createComparisonChart(): void {

    if (!this.comparisonCanvas) {

      return;
    }


    this.comparisonChart?.destroy();


    if (!this.total) {

      return;
    }


    const visibleHistory =
      this.history.slice(-20);


    const startingIndex =
      this.history.length -
      visibleHistory.length;


    const configuration:
      ChartConfiguration<'bar'> =
      {

        type: 'bar',

        data: {

          labels:
            visibleHistory.map(
              (
                _,
                index
              ) =>
                `P${startingIndex + index + 1}`
            ),

          datasets: [
            {

              label: 'Probability',

              data:
                visibleHistory.map(
                  item =>
                    this.normalizeProbability(
                      item.probability
                    ) * 100
                ),

              backgroundColor:
                visibleHistory.map(
                  item =>
                    this.getRiskColor(
                      item.risk,
                      .7
                    )
                ),

              borderColor:
                visibleHistory.map(
                  item =>
                    this.getRiskColor(
                      item.risk
                    )
                ),

              borderWidth: 1,

              borderRadius: 6
            }
          ]
        },

        options: {

          responsive: true,

          maintainAspectRatio: false,

          scales: {

            y: {

              min: 0,

              max: 100,

              ticks: {

                callback:
                  value =>
                    `${value}%`
              },

              grid: {
                color: '#eef2f7'
              }
            },

            x: {

              grid: {
                display: false
              }
            }
          },

          plugins: {

            legend: {
              display: false
            }
          }
        }
      };


    this.comparisonChart =
      new Chart(
        this.comparisonCanvas,
        configuration
      );
  }


  // ============================================================
  // FEATURE INFLUENCE
  // ============================================================

  private createInfluenceChart(): void {

    if (!this.influenceCanvas) {

      return;
    }


    this.influenceChart?.destroy();


    /*
     * Drivers de la DERNIERE prédiction.
     */

    const drivers =
      [...this.latestDrivers]
        .filter(
          driver =>
            driver &&
            typeof driver.feature === 'string' &&
            Number.isFinite(
              Number(
                driver.influence
              )
            )
        )
        .sort(
          (
            first,
            second
          ) =>
            Math.abs(
              Number(
                second.influence
              )
            ) -
            Math.abs(
              Number(
                first.influence
              )
            )
        )
        .slice(
          0,
          10
        );


    /*
     * Aucun driver disponible.
     */

    if (!drivers.length) {

      return;
    }


    const configuration:
      ChartConfiguration<'bar'> =
      {

        type: 'bar',

        data: {

          labels:
            drivers.map(
              driver =>
                this.formatFeatureName(
                  driver.feature
                )
            ),

          datasets: [
            {

              label:
                'Feature Influence',

              data:
                drivers.map(
                  driver =>
                    Number(
                      driver.influence
                    ) * 100
                ),

              /*
               * Rouge = influence positive
               * Bleu = influence négative
               */

              backgroundColor:
                drivers.map(
                  driver =>
                    Number(
                      driver.influence
                    ) >= 0

                      ? 'rgba(239,68,68,.72)'

                      : 'rgba(14,165,233,.72)'
                ),

              borderRadius: 6,

              borderWidth: 0
            }
          ]
        },

        options: {

          indexAxis: 'y',

          responsive: true,

          maintainAspectRatio: false,

          scales: {

            x: {

              ticks: {

                callback:
                  value =>
                    `${value}%`
              },

              grid: {
                color: '#eef2f7'
              }
            },

            y: {

              grid: {
                display: false
              }
            }
          },

          plugins: {

            legend: {
              display: false
            },

            tooltip: {

              callbacks: {

                label:
                  context => {

                    const value =
                      Number(
                        context.raw
                      );

                    return (
                      ` Influence: ${
                        value.toFixed(2)
                      }%`
                    );
                  }
              }
            }
          }
        }
      };


    this.influenceChart =
      new Chart(
        this.influenceCanvas,
        configuration
      );
  }


  // ============================================================
  // GLOBAL IMPORTANCE
  // ============================================================

  private createImportanceChart(): void {

    const features =
      this.globalImportance?.features ?? [];


    if (!this.importanceCanvas) {

      return;
    }


    this.importanceChart?.destroy();


    if (!features.length) {

      return;
    }


    const items =
      [...features]
        .sort(
          (
            first: ImportanceItem,
            second: ImportanceItem
          ) =>
            (second.normalized_importance ?? 0) -
            (first.normalized_importance ?? 0)
        )
        .slice(
          0,
          12
        );


    const configuration:
      ChartConfiguration<'bar'> =
      {

        type: 'bar',

        data: {

          labels:
            items.map(
              item =>
                this.formatFeatureName(
                  item.feature
                )
            ),

          datasets: [
            {

              data:
                items.map(
                  item =>
                    (item.normalized_importance ?? 0) *
                    100
                ),

              backgroundColor:
                'rgba(99,102,241,.72)',

              borderColor:
                this.primaryColor,

              borderWidth: 1,

              borderRadius: 6
            }
          ]
        },

        options: {

          indexAxis: 'y',

          responsive: true,

          maintainAspectRatio: false,

          scales: {

            x: {

              beginAtZero: true,

              ticks: {

                callback:
                  value =>
                    `${value}%`
              },

              grid: {
                color: '#eef2f7'
              }
            },

            y: {

              grid: {
                display: false
              }
            }
          },

          plugins: {

            legend: {
              display: false
            }
          }
        }
      };


    this.importanceChart =
      new Chart(
        this.importanceCanvas,
        configuration
      );
  }


  // ============================================================
  // FORMAT FEATURE
  // ============================================================

  formatFeatureName(
    value: string
  ): string {

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


  // ============================================================
  // DATE
  // ============================================================

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

      return 'N/A';
    }


    return date.toLocaleDateString(
      'fr-FR',
      {
        day: '2-digit',
        month: '2-digit'
      }
    );
  }


  // ============================================================
  // DATE + TIME
  // ============================================================

  formatDateTime(
    value: string
  ): string {

    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return 'N/A';
    }


    return date.toLocaleString(
      'fr-FR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }


  // ============================================================
  // PROBABILITY
  // ============================================================

  formatProbability(
    value: unknown
  ): string {

    return (
      this.normalizeProbability(
        value
      ) * 100
    ).toFixed(1) + '%';
  }


  // ============================================================
  // RISK COLOR
  // ============================================================

  getRiskColor(
    risk: RiskLevel | string,
    alpha?: number
  ): string {

    const normalized =
      this.normalizeRisk(
        risk
      );


    const color =
      normalized === 'HIGH'
        ? this.highColor
        : normalized === 'MEDIUM'
          ? this.mediumColor
          : this.lowColor;


    if (
      alpha === undefined
    ) {

      return color;
    }


    const hex =
      color.replace(
        '#',
        ''
      );


    const red =
      parseInt(
        hex.substring(0, 2),
        16
      );


    const green =
      parseInt(
        hex.substring(2, 4),
        16
      );


    const blue =
      parseInt(
        hex.substring(4, 6),
        16
      );


    return (
      `rgba(${red},${green},${blue},${alpha})`
    );
  }


  // ============================================================
  // RISK LABEL
  // ============================================================

  getRiskLabel(
    risk: RiskLevel | string
  ): string {

    const normalized =
      this.normalizeRisk(
        risk
      );


    return normalized === 'HIGH'
      ? 'High'
      : normalized === 'MEDIUM'
        ? 'Medium'
        : 'Low';
  }


  // ============================================================
  // RISK CLASS
  // ============================================================

  getRiskClass(
    risk: RiskLevel | string
  ): string {

    const normalized =
      this.normalizeRisk(
        risk
      );


    return normalized === 'HIGH'
      ? 'risk-high'
      : normalized === 'MEDIUM'
        ? 'risk-medium'
        : 'risk-low';
  }


  // ============================================================
  // NORMALIZE RISK
  // ============================================================

  normalizeRisk(
    value: unknown
  ): RiskLevel {

    const normalized =
      String(
        value ?? ''
      )
        .trim()
        .toUpperCase();


    if (
      normalized === 'HIGH' ||
      normalized.includes('HIGH')
    ) {

      return 'HIGH';
    }


    if (
      normalized === 'MEDIUM' ||
      normalized.includes('MEDIUM') ||
      normalized.includes('MED')
    ) {

      return 'MEDIUM';
    }


    return 'LOW';
  }


  // ============================================================
  // NORMALIZE PROBABILITY
  // ============================================================

  normalizeProbability(
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


  // ============================================================
  // DESTROY CHARTS
  // ============================================================

  private destroyAllCharts(): void {

    this.riskChart?.destroy();

    this.histogramChart?.destroy();

    this.evolutionChart?.destroy();

    this.comparisonChart?.destroy();

    this.influenceChart?.destroy();

    this.importanceChart?.destroy();


    this.riskChart = null;

    this.histogramChart = null;

    this.evolutionChart = null;

    this.comparisonChart = null;

    this.influenceChart = null;

    this.importanceChart = null;
  }
}