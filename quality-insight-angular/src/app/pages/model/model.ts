import {
  Component,
  OnInit,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  HttpClient
} from '@angular/common/http';


/* =========================================================
   INTERFACES
========================================================= */

interface ModelMetrics {

  accuracy: number | null;

  precision: number | null;

  recall: number | null;

  f1_score: number | null;

  roc_auc: number | null;
}


interface RiskBands {

  HIGH: string;

  MEDIUM: string;

  LOW: string;
}


interface ModelImages {

  confusion_matrix: string;

  roc_curve: string;
}


interface ImageFiles {

  confusion_matrix: string;

  roc_curve: string;
}


interface ImageAvailable {

  confusion_matrix: boolean;

  roc_curve: boolean;
}


interface ModelHealth {

  status: string;

  model_loaded: boolean;

  metadata_loaded: boolean;

  model_version: string;

  model_name: string;

  model_type: string;

  model_family: string;

  model_description: string;

  business_purpose: string;

  target_name: string;

  target_definition: string;

  positive_class: string;

  negative_class: string;

  exported_at: string;

  training_date: string;

  python_version: string;

  sklearn_version: string;

  lightgbm_version: string;

  threshold: number;

  medium_threshold: number;

  sla_target_days: number;

  training_iterations: number;

  metrics: ModelMetrics;

  categorical_features: string[];

  numerical_features: string[];

  risk_bands: RiskBands;

  images: ModelImages;

  image_files: ImageFiles;

  image_available: ImageAvailable;

  limitations: string[];
}


/* =========================================================
   COMPONENT
========================================================= */

@Component({

  selector: 'app-model',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './model.html',

  styleUrls: ['./model.css']

})
export class ModelComponent implements OnInit {


  /* =======================================================
     DEPENDENCIES
  ======================================================= */

  private readonly http = inject(
    HttpClient
  );


  /* =======================================================
     API
  ======================================================= */

  private readonly API_URL =
    'http://localhost:8000';


  /* =======================================================
     STATE
  ======================================================= */

  model: ModelHealth | null = null;

  loading = true;

  error = '';


  /* =======================================================
     IMAGE URLS
  ======================================================= */

  confusionMatrixUrl =
    `${this.API_URL}/model/confusion-matrix/image`;

  rocCurveUrl =
    `${this.API_URL}/model/roc-curve/image`;


  /* =======================================================
     INIT
  ======================================================= */

  ngOnInit(): void {

    this.loadModel();
  }


  /* =======================================================
     LOAD MODEL
  ======================================================= */

  loadModel(): void {

    this.loading = true;

    this.error = '';

    this.http
      .get<ModelHealth>(
        `${this.API_URL}/health`
      )
      .subscribe({

        next: (response) => {

          this.model = response;

          this.loading = false;

        },

        error: (error) => {

          console.error(
            'Model health error:',
            error
          );

          this.error =
            'Unable to load model information from the backend.';

          this.loading = false;

        }

      });

  }


  /* =======================================================
     REFRESH
  ======================================================= */

  refresh(): void {

    this.loadModel();

  }


  /* =======================================================
     FORMAT PERCENTAGE
  ======================================================= */

  percentage(
    value: number | null | undefined
  ): string {

    if (
      value === null ||
      value === undefined
    ) {

      return 'N/A';

    }

    return `${(
      value * 100
    ).toFixed(0)}%`;

  }


  /* =======================================================
     FORMAT DATE
  ======================================================= */

  formatDate(
    value: string | null | undefined
  ): string {

    if (!value) {

      return 'N/A';

    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;

    }

    return date.toLocaleString(
      'en-GB',
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    );

  }


  /* =======================================================
     RISK CLASS
  ======================================================= */

  riskClass(
    risk: 'HIGH' | 'MEDIUM' | 'LOW'
  ): string {

    return risk.toLowerCase();

  }


  /* =======================================================
     TRACK BY
  ======================================================= */

  trackByFeature(
    index: number,
    feature: string
  ): string {

    return feature;

  }


  /* =======================================================
     IMAGE ERROR
  ======================================================= */

  imageError(
    event: Event
  ): void {

    const image =
      event.target as HTMLImageElement;

    image.style.display =
      'none';

  }

}