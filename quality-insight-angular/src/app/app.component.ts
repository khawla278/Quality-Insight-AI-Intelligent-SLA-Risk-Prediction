import {
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import {
  filter,
  Subscription
} from 'rxjs';

import {
  NotificationService
} from './service/notification.service';


@Component({

  selector: 'app-root',

  standalone: true,

  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],

  templateUrl: './app.component.html',

  styleUrl: './app.component.css'

})
export class AppComponent
  implements OnInit, OnDestroy {


  // ==========================================================
  // MENU
  // ==========================================================

  menuOpen = true;

  isExperiment = false;

  isHome = true;

  experiment: 'it' | 'ncr' = 'it';


  // ==========================================================
  // NOTIFICATION BADGE
  // ==========================================================

  /**
   * Nombre affiché sur la cloche.
   *
   * IMPORTANT :
   * Ce nombre représente uniquement les alertes
   * PENDING et NON TRAITÉES.
   *
   * Il ne compte jamais :
   * - l'historique
   * - les notifications traitées
   * - les notifications archivées
   * - les notifications expirées
   */
  unreadNotifications = 0;


  // ==========================================================
  // SERVICES
  // ==========================================================

  private readonly notificationService =
    inject(NotificationService);

  private readonly router =
    inject(Router);


  private notificationSubscription?:
    Subscription;

  private routeSubscription?:
    Subscription;


  // ==========================================================
  // STORAGE
  // ==========================================================

  private readonly NOTIFICATION_STATE_KEY =
    'qualityInsightNotificationState';


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.updateExperience(this.router.url);

    this.routeSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => this.updateExperience(event.urlAfterRedirects));

    /*
     * Charge le nombre initial.
     */
    this.updateUnreadCount();


    /*
     * Écoute les changements du NotificationService.
     */
    this.notificationSubscription =
      this.notificationService
        .notifications$
        .subscribe(() => {

          this.updateUnreadCount();

        });

  }


  private updateExperience(url: string): void {

    this.isHome = url === '/home' || url === '/';

    this.isExperiment = !this.isHome;

    this.experiment = url.startsWith('/crossrail')
      ? 'ncr'
      : 'it';
  }


  // ==========================================================
  // UPDATE BADGE
  // ==========================================================

  updateUnreadCount(): void {

    /*
     * On lit directement l'état des notifications.
     *
     * Cela évite de compter les éléments de
     * nonConformanceHistory.
     */
    try {

      const stored =
        localStorage.getItem(
          this.NOTIFICATION_STATE_KEY
        );


      /*
       * Aucun état sauvegardé.
       */
      if (!stored) {

        this.unreadNotifications = 0;

        return;

      }


      const parsed:
        unknown =
        JSON.parse(stored);


      /*
       * Sécurité.
       */
      if (!Array.isArray(parsed)) {

        this.unreadNotifications = 0;

        return;

      }


      /*
       * IMPORTANT :
       *
       * Une notification compte uniquement si :
       *
       * treated !== true
       * expired !== true
       *
       * Les notifications archivées sont supprimées
       * de cet état par NotificationCenterComponent.
       */
      this.unreadNotifications =
        parsed.filter(
          (item: unknown) => {

            if (
              !item ||
              typeof item !== 'object'
            ) {

              return false;

            }


            const notification =
              item as {
                treated?: boolean;
                expired?: boolean;
              };


            return (
              notification.treated !== true &&
              notification.expired !== true
            );

          }
        ).length;

    } catch (error) {

      console.error(
        'Error updating notification badge:',
        error
      );


      this.unreadNotifications = 0;

    }

  }


  // ==========================================================
  // MENU
  // ==========================================================

  toggleMenu(): void {

    this.menuOpen =
      !this.menuOpen;

  }


  // ==========================================================
  // DESTROY
  // ==========================================================

  ngOnDestroy(): void {

    this.notificationSubscription
      ?.unsubscribe();

    this.routeSubscription
      ?.unsubscribe();

  }

}
