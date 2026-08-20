import { Routes } from '@angular/router';

export const routes: Routes = [

  /* =========================================================
     DEFAULT
  ========================================================= */

  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },


  /* =========================================================
     HOME
  ========================================================= */

  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home')
        .then(m => m.HomeComponent)
  },


  /* =========================================================
     DASHBOARD
  ========================================================= */

  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component')
        .then(m => m.DashboardComponent)
  },


  /* =========================================================
     HISTORIQUE / NON-CONFORMANCES
  ========================================================= */

  {
    path: 'historique',
    loadComponent: () =>
      import('./pages/historique/historique.component')
        .then(m => m.HistoriqueComponent)
  },


  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notification/notification-center.component')
        .then(m => m.NotificationCenterComponent)
  },


  /* =========================================================
     AI ASSISTANT
  ========================================================= */

  {
    path: 'ai-assistant',
    loadComponent: () =>
      import('./pages/ai-assistant/ai-assistant.component')
        .then(m => m.AiAssistantComponent)
  },


  /* =========================================================
     EXPLAINABILITY
  ========================================================= */

  {
    path: 'explainability',
    loadComponent: () =>
      import('./pages/explainability/explainability.component')
        .then(m => m.ExplainabilityComponent)
  },


  /* =========================================================
     ANALYTICS
  ========================================================= */

  {
    path: 'analytics',
    loadComponent: () =>
      import('./pages/analytics/analytics.component')
        .then(m => m.AnalyticsComponent)
  },


  /* =========================================================
     MODEL
  ========================================================= */

  {
    path: 'model',
    loadComponent: () =>
      import('./pages/model/model')
        .then(m => m.ModelComponent)
  },


  /* =========================================================
     UNKNOWN ROUTE
  ========================================================= */

  {
    path: '**',
    redirectTo: 'home'
  }

];