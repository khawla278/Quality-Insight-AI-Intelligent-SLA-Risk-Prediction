import {
  Injectable
} from '@angular/core';

import {
  BehaviorSubject,
  interval,
  Subscription
} from 'rxjs';


/* ============================================================
   NOTIFICATION MODEL
============================================================ */

export type NotificationType =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INFO'
  | 'SUCCESS';


export interface AppNotification {

  id: string;

  type: NotificationType;

  title: string;

  message: string;

  createdAt: string;

  expiresAt: string;

  read: boolean;

  incidentId?: string;

  riskLevel?: string;

  probability?: number;

}


/* ============================================================
   SERVICE
============================================================ */

@Injectable({
  providedIn: 'root'
})
export class NotificationService {


  /* ==========================================================
     STORAGE
  ========================================================== */

  private readonly STORAGE_KEY =
    'qualityInsightNotifications';


  private readonly HISTORY_KEY =
    'nonConformanceHistory';


  /* ==========================================================
     CONSTANTS
  ========================================================== */

  /**
   * Un incident devient une alerte
   * lorsqu'il dépasse 5 jours.
   */
  private readonly SLA_DAYS =
    5;


  /**
   * Les notifications restent 7 jours.
   */
  private readonly RETENTION_DAYS =
    7;


  /**
   * Vérification automatique.
   *
   * Toutes les 30 secondes.
   */
  private readonly CHECK_INTERVAL =
    30_000;


  /* ==========================================================
     SUBJECT
  ========================================================== */

  private readonly notificationsSubject =
    new BehaviorSubject<AppNotification[]>(
      []
    );


  readonly notifications$ =
    this.notificationsSubject.asObservable();


  /* ==========================================================
     TIMER
  ========================================================== */

  private monitoringSubscription?:
    Subscription;


  /* ==========================================================
     CONSTRUCTOR
  ========================================================== */

  constructor() {

    this.initialize();

  }


  /* ==========================================================
     INITIALIZATION
  ========================================================== */

  private initialize(): void {

    this.cleanupExpiredNotifications();

    this.loadNotifications();

    /**
     * Vérification immédiate.
     */
    this.checkHistoryForAlerts();


    /**
     * Puis vérification périodique.
     */
    this.monitoringSubscription =
      interval(
        this.CHECK_INTERVAL
      )
      .subscribe(() => {

        this.cleanupExpiredNotifications();

        this.checkHistoryForAlerts();

      });


    /**
     * Synchronisation entre onglets.
     */
    window.addEventListener(
      'storage',
      this.handleStorageEvent
    );

  }


  /* ==========================================================
     STORAGE EVENT
  ========================================================== */

  private handleStorageEvent =
    (event: StorageEvent): void => {

      if (
        event.key ===
        this.STORAGE_KEY
      ) {

        this.loadNotifications();

      }


      if (
        event.key ===
        this.HISTORY_KEY
      ) {

        this.checkHistoryForAlerts();

      }

    };


  /* ==========================================================
     GET NOTIFICATIONS
  ========================================================== */

  getNotifications(): AppNotification[] {

    this.cleanupExpiredNotifications();

    return [
      ...this.notificationsSubject.value
    ];

  }


  /* ==========================================================
     UNREAD COUNT
  ========================================================== */

  getUnreadCount(): number {

    return this.notificationsSubject.value
      .filter(
        notification =>
          !notification.read
      )
      .length;

  }


  /* ==========================================================
     ADD NOTIFICATION
  ========================================================== */

  addNotification(
    notification: Omit<
      AppNotification,
      'id' |
      'createdAt' |
      'expiresAt' |
      'read'
    >
  ): void {

    const notifications =
      this.getNotifications();


    /**
     * Protection contre les doublons.
     *
     * Pour une notification liée à un incident,
     * on ne crée qu'une alerte HIGH pour cet incident.
     */
    if (
      notification.incidentId &&
      notifications.some(
        item =>
          item.incidentId ===
          notification.incidentId
      )
    ) {

      return;

    }


    const now =
      new Date();


    const expiration =
      new Date(
        now.getTime() +
        this.RETENTION_DAYS *
        24 *
        60 *
        60 *
        1000
      );


    const newNotification:
      AppNotification = {

        ...notification,

        id:
          this.generateId(),

        createdAt:
          now.toISOString(),

        expiresAt:
          expiration.toISOString(),

        read:
          false

      };


    const updated = [
      newNotification,
      ...notifications
    ];


    this.saveNotifications(
      updated
    );

  }


  /* ==========================================================
     GENERATE ID
  ========================================================== */

  private generateId(): string {

    return (
      'notification-' +
      Date.now() +
      '-' +
      Math.random()
        .toString(36)
        .substring(2, 9)
    );

  }


  /* ==========================================================
     LOAD
  ========================================================== */

  private loadNotifications(): void {

    try {

      const stored =
        localStorage.getItem(
          this.STORAGE_KEY
        );


      if (!stored) {

        this.notificationsSubject.next([]);

        return;

      }


      const parsed =
        JSON.parse(stored);


      if (
        !Array.isArray(parsed)
      ) {

        this.notificationsSubject.next([]);

        return;

      }


      const notifications =
        parsed
          .filter(
            item =>
              item &&
              typeof item === 'object'
          )
          .map(
            item =>
              this.normalizeNotification(
                item
              )
          )
          .filter(
            item =>
              item !== null
          ) as AppNotification[];


      this.notificationsSubject.next(
        notifications
      );

    } catch (error) {

      console.error(
        'Erreur chargement notifications :',
        error
      );

      this.notificationsSubject.next([]);

    }

  }


  /* ==========================================================
     NORMALIZE
  ========================================================== */

  private normalizeNotification(
    value: any
  ): AppNotification | null {

    if (
      !value ||
      !value.id ||
      !value.title ||
      !value.message
    ) {

      return null;

    }


    const createdAt =
      String(
        value.createdAt ||
        new Date().toISOString()
      );


    const expiresAt =
      String(
        value.expiresAt ||
        new Date(
          new Date(createdAt).getTime() +
          this.RETENTION_DAYS *
          24 *
          60 *
          60 *
          1000
        ).toISOString()
      );


    return {

      id:
        String(value.id),

      type:
        this.normalizeType(
          value.type
        ),

      title:
        String(value.title),

      message:
        String(value.message),

      createdAt,

      expiresAt,

      read:
        Boolean(value.read),

      incidentId:
        value.incidentId
          ? String(value.incidentId)
          : undefined,

      riskLevel:
        value.riskLevel
          ? String(value.riskLevel)
          : undefined,

      probability:
        value.probability !== undefined
          ? Number(value.probability)
          : undefined

    };

  }


  /* ==========================================================
     NORMALIZE TYPE
  ========================================================== */

  private normalizeType(
    value: unknown
  ): NotificationType {

    const type =
      String(value ?? '')
        .toUpperCase();


    if (
      type === 'HIGH' ||
      type === 'MEDIUM' ||
      type === 'LOW' ||
      type === 'INFO' ||
      type === 'SUCCESS'
    ) {

      return type;

    }


    return 'INFO';

  }


  /* ==========================================================
     SAVE
  ========================================================== */

  private saveNotifications(
    notifications: AppNotification[]
  ): void {

    try {

      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(
          notifications
        )
      );


      this.notificationsSubject.next(
        notifications
      );

    } catch (error) {

      console.error(
        'Erreur sauvegarde notifications :',
        error
      );

    }

  }


  /* ==========================================================
     MARK AS READ
  ========================================================== */

  markAsRead(
    notificationId: string
  ): void {

    const updated =
      this.notificationsSubject.value
        .map(
          notification => {

            if (
              notification.id ===
              notificationId
            ) {

              return {
                ...notification,
                read: true
              };

            }

            return notification;

          }
        );


    this.saveNotifications(
      updated
    );

  }


  /* ==========================================================
     MARK ALL AS READ
  ========================================================== */

  markAllAsRead(): void {

    const updated =
      this.notificationsSubject.value
        .map(
          notification => ({
            ...notification,
            read: true
          })
        );


    this.saveNotifications(
      updated
    );

  }


  /* ==========================================================
     DELETE
  ========================================================== */

  deleteNotification(
    notificationId: string
  ): void {

    const updated =
      this.notificationsSubject.value
        .filter(
          notification =>
            notification.id !==
            notificationId
        );


    this.saveNotifications(
      updated
    );

  }


  /* ==========================================================
     CLEAR ALL
  ========================================================== */

  clearAll(): void {

    this.saveNotifications([]);

  }


  /* ==========================================================
     CLEAN EXPIRED
  ========================================================== */

  private cleanupExpiredNotifications(): void {

    const now =
      Date.now();


    const current =
      this.notificationsSubject.value;


    const valid =
      current.filter(
        notification => {

          const expiration =
            new Date(
              notification.expiresAt
            ).getTime();


          return (
            Number.isNaN(expiration) ||
            expiration > now
          );

        }
      );


    if (
      valid.length !==
      current.length
    ) {

      this.saveNotifications(
        valid
      );

    }

  }


  /* ==========================================================
     CHECK HISTORY
  ========================================================== */

  private checkHistoryForAlerts(): void {

    try {

      const stored =
        localStorage.getItem(
          this.HISTORY_KEY
        );


      if (!stored) {

        return;

      }


      const parsed =
        JSON.parse(stored);


      if (
        !Array.isArray(parsed)
      ) {

        return;

      }


      const notifications =
        this.notificationsSubject.value;


      for (
        const record of parsed
      ) {

        this.checkRecord(
          record,
          notifications
        );

      }

    } catch (error) {

      console.error(
        'Erreur vérification SLA notifications :',
        error
      );

    }

  }


  /* ==========================================================
     CHECK ONE RECORD
  ========================================================== */

  private checkRecord(
    record: any,
    existingNotifications:
      AppNotification[]
  ): void {

    if (
      !record ||
      typeof record !== 'object'
    ) {

      return;

    }


    /**
     * On ignore les NC fermées ou rejetées.
     */
    const state =
      String(
        record.state ??
        record.input?.incident_state ??
        ''
      )
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');


    if (
      state === 'CLOSED' ||
      state === 'REJECTED'
    ) {

      return;

    }


    /**
     * Date de référence.
     *
     * Ton historique utilise `raised`.
     * Si elle n'existe pas, on utilise opened_at.
     */
    const dateValue =
      record.raised ??
      record.input?.opened_at ??
      record.date;


    if (!dateValue) {

      return;

    }


    const openedDate =
      new Date(
        dateValue
      );


    if (
      Number.isNaN(
        openedDate.getTime()
      )
    ) {

      return;

    }


    const now =
      Date.now();


    const elapsed =
      now -
      openedDate.getTime();


    const fiveDays =
      this.SLA_DAYS *
      24 *
      60 *
      60 *
      1000;


    /**
     * L'incident n'a pas encore dépassé 5 jours.
     */
    if (
      elapsed <= fiveDays
    ) {

      return;

    }


    /**
     * Identifiant.
     */
    const incidentId =
      String(
        record.ref ??
        record.id ??
        ''
      );


    if (!incidentId) {

      return;

    }


    /**
     * Protection contre les doublons.
     */
    const alreadyExists =
      existingNotifications.some(
        notification =>
          notification.incidentId ===
          incidentId
      );


    if (alreadyExists) {

      return;

    }


    const risk =
      String(
        record.risk ??
        record.risk_level ??
        'HIGH'
      )
      .toUpperCase();


    const probability =
      this.normalizeProbability(
        record.probability
      );


    const title =
      'SLA breach risk alert';


    const message =
      `${incidentId} has exceeded the 5-day SLA target. ` +
      `Immediate action is recommended to avoid further delay.`;


    this.addNotification({

      type: 'HIGH',

      title,

      message,

      incidentId,

      riskLevel:
        risk,

      probability

    });


    /**
     * Mise à jour locale pour éviter de recréer
     * la notification dans la même vérification.
     */
    existingNotifications.push({

      id: 'temporary-' + incidentId,

      type: 'HIGH',

      title,

      message,

      createdAt:
        new Date().toISOString(),

      expiresAt:
        new Date(
          Date.now() +
          this.RETENTION_DAYS *
          24 *
          60 *
          60 *
          1000
        ).toISOString(),

      read: false,

      incidentId,

      riskLevel: risk,

      probability

    });

  }


  /* ==========================================================
     NORMALIZE PROBABILITY
  ========================================================== */

  private normalizeProbability(
    value: unknown
  ): number | undefined {

    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {

      return undefined;

    }


    let probability =
      Number(value);


    if (
      !Number.isFinite(
        probability
      )
    ) {

      return undefined;

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


  /* ==========================================================
     DESTROY
  ========================================================== */

  destroy(): void {

    this.monitoringSubscription?.unsubscribe();

    window.removeEventListener(
      'storage',
      this.handleStorageEvent
    );

  }

}