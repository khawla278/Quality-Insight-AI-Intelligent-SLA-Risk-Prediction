import {
  ApplicationConfig,
  provideZoneChangeDetection
} from '@angular/core';

import {
  provideHttpClient,
  withFetch
} from '@angular/common/http';

import {
  provideRouter
} from '@angular/router';

import {
  routes
} from './app.routes';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({
      eventCoalescing: true
    }),

    provideRouter(routes),

    /*
     * SANS CETTE LIGNE, HttpClient n'est jamais réellement
     * disponible dans l'application : toutes les requêtes de
     * ApiService échouent immédiatement, ce qui produit le
     * message "backend offline" même si FastAPI tourne bien.
     * withFetch() utilise l'API fetch native du navigateur
     * plutôt que XMLHttpRequest, souvent plus fiable avec CORS.
     */
    provideHttpClient(
      withFetch()
    )
  ]
};