import {
  Component
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  RouterLink
} from '@angular/router';


interface Feature {

  number: string;

  title: string;

  description: string;

  icon: string;

  link: string;

}


interface Objective {

  number: string;

  title: string;

  text: string;

  icon: string;

}


interface Technology {

  name: string;

  description: string;

  icon: string;

}


@Component({
  selector: 'app-home',
  standalone: true,

  imports: [
    CommonModule,
    RouterLink
  ],

  templateUrl: './home.html',

  styleUrls: [
    './home.css'
  ]
})
export class HomeComponent {


  /* =====================================================
     FEATURES
  ====================================================== */

  features: Feature[] = [

    {
      number: '01',

      title: 'Risk Prediction',

      description:
        'Estimate the probability that an incident or non-conformance will become a significant quality risk.',

      icon: 'bi-shield-check',

      link: '/dashboard'
    },

    {
      number: '02',

      title: 'AI Explainability',

      description:
        'Understand which factors contribute most to each prediction and make AI decisions easier to interpret.',

      icon: 'bi-lightbulb',

      link: '/explainability'
    },

    {
      number: '03',

      title: 'Quality Analytics',

      description:
        'Explore historical patterns, trends and risk indicators through interactive analytics.',

      icon: 'bi-graph-up-arrow',

      link: '/analytics'
    },

    {
      number: '04',

      title: 'AI Model',

      description:
        'Monitor the predictive engine, its configuration, performance and machine learning capabilities.',

      icon: 'bi-cpu',

      link: '/model'
    }

  ];


  /* =====================================================
     OBJECTIVES
  ====================================================== */

  objectives: Objective[] = [

    {
      number: '01',

      title: 'SLA Delay Risk',

      text:
        'Predict whether a new non-conformance is likely to remain open beyond the defined five-day target.',

      icon: 'bi-clock-history'
    },

    {
      number: '02',

      title: 'High-Risk Periods',

      text:
        'Identify periods where historical and operational patterns indicate an increased level of quality risk.',

      icon: 'bi-graph-up'
    },

    {
      number: '03',

      title: 'Risk Alerts',

      text:
        'Transform model predictions into clear risk indicators that can support faster operational decisions.',

      icon: 'bi-bell'
    },

    {
      number: '04',

      title: 'Proactive Quality',

      text:
        'Move from reactive quality management toward a predictive and data-driven approach.',

      icon: 'bi-shield-check'
    }

  ];


  /* =====================================================
     TECHNOLOGIES
  ====================================================== */

  technologies: Technology[] = [

    {
      name: 'Python',

      description: 'Machine Learning',

      icon: 'bi-filetype-py'
    },

    {
      name: 'Scikit-learn',

      description: 'Predictive modeling',

      icon: 'bi-cpu'
    },

    {
      name: 'FastAPI',

      description: 'REST microservice',

      icon: 'bi-lightning-charge'
    },

    {
      name: 'Angular',

      description: 'Web application',

      icon: 'bi-window'
    },

    {
      name: 'Chart.js',

      description: 'Data visualization',

      icon: 'bi-bar-chart'
    }

  ];

}