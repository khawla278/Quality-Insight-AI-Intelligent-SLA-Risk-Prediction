import { Routes } from '@angular/router';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },

  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home')
        .then(m => m.HomeComponent)
  },

  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component')
        .then(m => m.DashboardComponent)
  },

  {
    path: 'historique',
    loadComponent: () =>
      import('./pages/historique/historique.component')
        .then(m => m.HistoriqueComponent)
  },

  {
    path: 'analytics',
    loadComponent: () =>
      import('./pages/analytics/analytics.component')
        .then(m => m.AnalyticsComponent)
  },

  {
    path: 'explainability',
    loadComponent: () =>
      import('./pages/explainability/explainability.component')
        .then(m => m.ExplainabilityComponent)
  },

  {
    path: 'model',
    loadComponent: () =>
      import('./pages/model/model')
        .then(m => m.ModelComponent)
  },

  {
    path: 'predict',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  {
    path: 'ai-assistant',
    loadComponent: () =>
      import('./pages/ai-assistant/ai-assistant.component')
        .then(m => m.AiAssistantComponent)
  },

  {
    path: 'pipeline',
    loadComponent: () =>
      import('./pages/pipeline/pipeline.component')
        .then(m => m.PipelineComponent)
  },

  {
    path: '**',
    redirectTo: 'home'
  }

];