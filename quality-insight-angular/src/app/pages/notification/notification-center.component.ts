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


// ============================================================
// TYPES
// ============================================================

type NotificationRisk =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW';


type NotificationView =
  | 'ACTIVE'
  | 'ARCHIVE';


// ============================================================
// NOTIFICATION MODEL
// ============================================================

interface NotificationItem {

  id: string;

  reference: string;

  title: string;

  message: string;

  category: string;

  assignmentGroup: string;

  state: string;

  type: NotificationRisk;

  probability: number;

  openedAt: string;

  ticketAge: number;

  daysOverSla: number;

  treated: boolean;

  read: boolean;

  createdAt: string;

  expiresAt: string;

  archivedAt?: string;

  source: 'HISTORY';

}


// ============================================================
// SAVED STATE
// ============================================================

interface NotificationSavedState {

  id: string;

  read: boolean;

  treated: boolean;

  archived?: boolean;

  createdAt: string;

  expiresAt: string;

  archivedAt?: string;

  expired?: boolean;

}


// ============================================================
// COMPONENT
// ============================================================

@Component({

  selector:
    'app-notification-center',

  standalone:
    true,

  imports: [

    CommonModule,

    FormsModule

  ],

  templateUrl:
    './notification-center.component.html',

  styleUrl:
    './notification-center.component.css'

})
export class NotificationCenterComponent
  implements OnInit {


  // ==========================================================
  // STORAGE
  // ==========================================================

  private readonly HISTORY_KEY =
    'nonConformanceHistory';


  private readonly NOTIFICATION_STATE_KEY =
    'qualityInsightNotificationState';


  private readonly ARCHIVE_KEY =
    'qualityInsightNotificationArchive';


  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  readonly SLA_DAYS =
    5;


  readonly RETENTION_DAYS =
    7;


  readonly pageSize =
    5;


  readonly archivePageSize =
    5;


  // ==========================================================
  // VIEW
  // ==========================================================

  showArchive =
    false;


  // ==========================================================
  // DATA
  // ==========================================================

  notifications:
    NotificationItem[] = [];


  archivedNotifications:
    NotificationItem[] = [];


  // ==========================================================
  // SEARCH
  // ==========================================================

  searchTerm =
    '';


  // ==========================================================
  // FILTER
  // ==========================================================

  statusFilter:
    'ALL' |
    'PENDING' |
    'TREATED' =
    'ALL';


  // ==========================================================
  // PAGINATION
  // ==========================================================

  currentPage =
    1;


  archivePage =
    1;


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.refreshFromHistory();

  }


  // ==========================================================
  // ACTIVE
  // ==========================================================

  showActiveView(): void {

    this.showArchive =
      false;

    this.statusFilter =
      'ALL';

    this.currentPage =
      1;

    this.applyFilters();

  }


  // ==========================================================
  // PENDING
  // ==========================================================

  showPendingView(): void {

    this.showArchive =
      false;

    this.statusFilter =
      'PENDING';

    this.currentPage =
      1;

    this.applyFilters();

  }


  // ==========================================================
  // TREATED
  // ==========================================================

  showTreatedView(): void {

    this.showArchive =
      false;

    this.statusFilter =
      'TREATED';

    this.currentPage =
      1;

    this.applyFilters();

  }


  // ==========================================================
  // ARCHIVE VIEW
  // ==========================================================

  showArchivedView(): void {

    this.showArchive =
      true;

    this.archivePage =
      1;

    this.loadArchivedNotifications();

  }


  // ==========================================================
  // SEARCH
  // ==========================================================

  onSearchChange(): void {

    this.currentPage =
      1;

    this.applyFilters();

  }


  clearSearch(): void {

    this.searchTerm =
      '';

    this.currentPage =
      1;

    this.applyFilters();

  }


  // ==========================================================
  // REFRESH
  // ==========================================================

  refreshFromHistory(): void {

    /*
     * IMPORTANT :
     * Charger l'archive AVANT l'historique.
     */
    this.loadArchivedNotifications();


    /*
     * Nettoyage des Pending > 7 jours.
     */
    this.cleanupExpiredNotifications();


    /*
     * Reconstruit les notifications actives.
     */
    this.loadNotificationsFromHistory();


    this.currentPage =
      1;

    this.archivePage =
      1;

    this.applyFilters();

  }


  // ==========================================================
  // LOAD ACTIVE NOTIFICATIONS
  // ==========================================================

  private loadNotificationsFromHistory(): void {

    try {

      const stored =
        localStorage.getItem(
          this.HISTORY_KEY
        );


      if (!stored) {

        this.notifications =
          [];

        return;

      }


      const parsed:
        unknown =
        JSON.parse(
          stored
        );


      if (!Array.isArray(parsed)) {

        this.notifications =
          [];

        return;

      }


      const history =
        parsed as Record<string, unknown>[];


      const alerts:
        NotificationItem[] = [];


      /*
       * IDs déjà utilisés.
       */
      const usedIds =
        new Set<string>();


      for (
        let index = 0;
        index < history.length;
        index++
      ) {

        const record =
          history[index];


        if (
          !record ||
          typeof record !== 'object'
        ) {

          continue;

        }


        // ====================================================
        // RISK
        // ====================================================

        const risk =
          this.normalizeRisk(
            this.getValue(
              record,
              [
                'risk',
                'riskLevel',
                'level'
              ]
            )
          );


        /*
         * Seulement HIGH.
         */
        if (
          risk !== 'HIGH'
        ) {

          continue;

        }


        // ====================================================
        // OPENED DATE
        // ====================================================

        const openedAt =
          this.extractOpeningDate(
            record
          );


        if (!openedAt) {

          continue;

        }


        // ====================================================
        // AGE
        // ====================================================

        const ticketAge =
          this.calculateTicketAge(
            openedAt
          );


        /*
         * Doit dépasser le SLA.
         */
        if (
          ticketAge <=
          this.SLA_DAYS
        ) {

          continue;

        }


        const daysOverSla =
          ticketAge -
          this.SLA_DAYS;


        // ====================================================
        // REFERENCE
        // ====================================================

        const reference =
          this.stringValue(
            this.getValue(
              record,
              [
                'ref',
                'reference',
                'ticket',
                'ticketId',
                'id'
              ]
            ),
            `NC-${String(
              index + 1
            ).padStart(4, '0')}`
          );


        // ====================================================
        // ID
        // ====================================================

        const id =
          `notification-${reference}`;


        /*
         * ==================================================
         * IMPORTANT
         *
         * SI DÉJÀ ARCHIVÉ :
         * NE PAS LE METTRE DANS LE TABLEAU PRINCIPAL.
         * ==================================================
         */

        if (
          this.isArchived(id)
        ) {

          continue;

        }


        /*
         * Empêche les doublons.
         */
        if (
          usedIds.has(id)
        ) {

          continue;

        }


        usedIds.add(id);


        // ====================================================
        // SAVED STATE
        // ====================================================

        const previousState =
          this.getNotificationState(
            id
          );


        /*
         * Expiré = ne pas recréer.
         */
        if (
          previousState?.expired
        ) {

          continue;

        }


        // ====================================================
        // TITLE
        // ====================================================

        const title =
          this.stringValue(
            this.getValue(
              record,
              [
                'title',
                'incident',
                'short_description',
                'description'
              ]
            ),
            'Non-Conformance'
          );


        // ====================================================
        // PROBABILITY
        // ====================================================

        const probability =
          this.normalizeProbability(
            this.getValue(
              record,
              [
                'probability',
                'predictionProbability',
                'score',
                'risk_probability'
              ]
            )
          );


        // ====================================================
        // CATEGORY
        // ====================================================

        const category =
          this.stringValue(
            this.getValue(
              record,
              [
                'category',
                'type'
              ]
            ),
            'AI Prediction'
          );


        // ====================================================
        // ASSIGNMENT GROUP
        // ====================================================

        const assignmentGroup =
          this.stringValue(
            this.getValue(
              record,
              [
                'assignment_group',
                'assignmentGroup',
                'group'
              ]
            ),
            '—'
          );


        // ====================================================
        // STATE
        // ====================================================

        const state =
          this.stringValue(
            this.getValue(
              record,
              [
                'state',
                'status'
              ]
            ),
            'Assigned'
          );


        // ====================================================
        // MESSAGE
        // ====================================================

        const message =
          this.buildMessage(
            reference,
            ticketAge,
            daysOverSla
          );


        // ====================================================
        // CREATED
        // ====================================================

        const createdAt =
          previousState?.createdAt ??
          new Date().toISOString();


        // ====================================================
        // EXPIRATION
        // ====================================================

        const expiresAt =
          previousState?.expiresAt ??
          this.addDays(
            createdAt,
            this.RETENTION_DAYS
          );


        // ====================================================
        // CREATE
        // ====================================================

        alerts.push({

          id,

          reference,

          title,

          message,

          category,

          assignmentGroup,

          state,

          type:
            'HIGH',

          probability,

          openedAt,

          ticketAge,

          daysOverSla,

          treated:
            previousState?.treated ??
            false,

          read:
            previousState?.read ??
            false,

          createdAt,

          expiresAt,

          source:
            'HISTORY'

        });

      }


      // ======================================================
      // SORT
      // ======================================================

      alerts.sort(
        (a, b) =>
          new Date(
            b.openedAt
          ).getTime() -
          new Date(
            a.openedAt
          ).getTime()
      );


      this.notifications =
        alerts;


      this.saveNotificationState();

    } catch (error) {

      console.error(
        'Error loading notifications:',
        error
      );


      this.notifications =
        [];

    }

  }


  // ==========================================================
  // IS ARCHIVED ?
  // ==========================================================

  private isArchived(
    id: string
  ): boolean {

    return this.archivedNotifications.some(
      notification =>
        notification.id === id
    );

  }


  // ==========================================================
  // CLEANUP
  // ==========================================================

  private cleanupExpiredNotifications(): void {

    try {

      const now =
        new Date();


      const states =
        this.readNotificationStates();


      if (
        states.length === 0
      ) {

        return;

      }


      let changed =
        false;


      const updated =
        states.map(
          state => {

            /*
             * Traité = jamais supprimé.
             */
            if (
              state.treated
            ) {

              return state;

            }


            /*
             * Archivé = jamais supprimé ici.
             */
            if (
              state.archived
            ) {

              return state;

            }


            /*
             * Déjà expiré.
             */
            if (
              state.expired
            ) {

              return state;

            }


            const expiresAt =
              new Date(
                state.expiresAt
              );


            if (
              Number.isNaN(
                expiresAt.getTime()
              )
            ) {

              return state;

            }


            /*
             * Pending depuis plus de 7 jours.
             */
            if (
              now.getTime() >=
              expiresAt.getTime()
            ) {

              changed =
                true;


              return {

                ...state,

                expired:
                  true

              };

            }


            return state;

          }
        );


      if (changed) {

        localStorage.setItem(

          this.NOTIFICATION_STATE_KEY,

          JSON.stringify(
            updated
          )

        );

      }

    } catch (error) {

      console.error(
        'Error cleaning notifications:',
        error
      );

    }

  }


  // ==========================================================
  // FILTERED TABLE
  // ==========================================================

  get tableNotifications():
    NotificationItem[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.notifications.filter(
      notification => {

        /*
         * Recherche.
         */
        const matchesSearch =
          !search ||

          notification.reference
            .toLowerCase()
            .includes(search) ||

          notification.title
            .toLowerCase()
            .includes(search) ||

          notification.message
            .toLowerCase()
            .includes(search);


        if (
          !matchesSearch
        ) {

          return false;

        }


        /*
         * PENDING.
         */
        if (
          this.statusFilter ===
          'PENDING'
        ) {

          return (
            !notification.treated
          );

        }


        /*
         * TREATED.
         */
        if (
          this.statusFilter ===
          'TREATED'
        ) {

          return (
            notification.treated
          );

        }


        /*
         * ALL.
         */
        return true;

      }
    );

  }


  // ==========================================================
  // APPLY FILTER
  // ==========================================================

  applyFilters(): void {

    if (
      this.currentPage >
      this.totalPages
    ) {

      this.currentPage =
        this.totalPages;

    }


    if (
      this.currentPage <
      1
    ) {

      this.currentPage =
        1;

    }

  }


  // ==========================================================
  // ACTIVE PAGINATION
  // ==========================================================

  get totalPages(): number {

    return Math.max(

      1,

      Math.ceil(

        this.tableNotifications.length /
        this.pageSize

      )

    );

  }


  get pageNumbers(): number[] {

    return Array.from(
      {
        length:
          this.totalPages
      },
      (_, index) =>
        index + 1
    );

  }


  get paginatedTableNotifications():
    NotificationItem[] {

    const start =
      (
        this.currentPage -
        1
      ) *
      this.pageSize;


    return this.tableNotifications.slice(

      start,

      start +
      this.pageSize

    );

  }


  previousPage(): void {

    if (
      this.currentPage >
      1
    ) {

      this.currentPage--;

    }

  }


  nextPage(): void {

    if (
      this.currentPage <
      this.totalPages
    ) {

      this.currentPage++;

    }

  }


  goToPage(
    page: number
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
  // ARCHIVE PAGINATION
  // ==========================================================

  get archiveTotalPages(): number {

    return Math.max(

      1,

      Math.ceil(

        this.archivedNotifications.length /
        this.archivePageSize

      )

    );

  }


  get archivePageNumbers(): number[] {

    return Array.from(
      {
        length:
          this.archiveTotalPages
      },
      (_, index) =>
        index + 1
    );

  }


  get paginatedArchive():
    NotificationItem[] {

    const start =
      (
        this.archivePage -
        1
      ) *
      this.archivePageSize;


    return this.archivedNotifications.slice(

      start,

      start +
      this.archivePageSize

    );

  }


  previousArchivePage(): void {

    if (
      this.archivePage >
      1
    ) {

      this.archivePage--;

    }

  }


  nextArchivePage(): void {

    if (
      this.archivePage <
      this.archiveTotalPages
    ) {

      this.archivePage++;

    }

  }


  goToArchivePage(
    page: number
  ): void {

    if (
      page >= 1 &&
      page <= this.archiveTotalPages
    ) {

      this.archivePage =
        page;

    }

  }


  // ==========================================================
  // KPI - HIGH RISK
  // ==========================================================

  get highRiskCount(): number {

    const ids =
      new Set<string>();


    /*
     * Actives.
     */
    for (
      const notification
      of this.notifications
    ) {

      if (
        notification.type ===
        'HIGH'
      ) {

        ids.add(
          notification.id
        );

      }

    }


    /*
     * Archives.
     */
    for (
      const notification
      of this.archivedNotifications
    ) {

      if (
        notification.type ===
        'HIGH'
      ) {

        ids.add(
          notification.id
        );

      }

    }


    return ids.size;

  }


  // ==========================================================
  // KPI - PENDING
  // ==========================================================

  get pendingCount(): number {

    /*
     * PENDING =
     * HIGH + non traité + non archivé.
     *
     * Les archives ne sont déjà plus
     * présentes dans this.notifications.
     */
    return this.notifications.filter(

      notification =>
        notification.type ===
        'HIGH' &&

        notification.treated ===
        false

    ).length;

  }


  // ==========================================================
  // KPI - TREATED
  // ==========================================================

  get treatedCount(): number {

    return this.notifications.filter(

      notification =>
        notification.type ===
        'HIGH' &&

        notification.treated ===
        true

    ).length;

  }


  // ==========================================================
  // KPI - ARCHIVED
  // ==========================================================

  get archivedCount(): number {

    const ids =
      new Set<string>();


    for (
      const notification
      of this.archivedNotifications
    ) {

      ids.add(
        notification.id
      );

    }


    return ids.size;

  }


  // ==========================================================
  // BADGE
  // ==========================================================

  get unreadCount(): number {

    /*
     * La cloche = uniquement Pending.
     */
    return this.pendingCount;

  }


  // ==========================================================
  // TREAT ONE
  // ==========================================================

  markAsRead(
    notification: NotificationItem
  ): void {

    /*
     * Déjà traité = rien.
     */
    if (
      notification.treated
    ) {

      return;

    }


    notification.read =
      true;

    notification.treated =
      true;


    this.saveNotificationState();


    this.applyFilters();

  }


  // ==========================================================
  // TREAT ALL
  // ==========================================================

  markAllAsRead(): void {

    for (
      const notification
      of this.notifications
    ) {

      if (
        !notification.treated
      ) {

        notification.read =
          true;

        notification.treated =
          true;

      }

    }


    this.saveNotificationState();


    this.currentPage =
      1;


    this.applyFilters();

  }


  // ==========================================================
  // ARCHIVE ONE
  // ==========================================================

  archiveNotification(
    notification: NotificationItem
  ): void {

    /*
     * Une notification traitée ne peut pas
     * être archivée.
     */
    if (
      notification.treated
    ) {

      return;

    }


    /*
     * Déjà archivée ?
     */
    if (
      this.isArchived(
        notification.id
      )
    ) {

      /*
       * On retire seulement du tableau actif.
       */
      this.notifications =
        this.notifications.filter(
          item =>
            item.id !==
            notification.id
        );

      return;

    }


    const archived:
      NotificationItem = {

      ...notification,

      treated:
        true,

      read:
        true,

      archivedAt:
        new Date().toISOString()

    };


    /*
     * Ajout unique.
     */
    this.archivedNotifications = [

      archived,

      ...this.archivedNotifications

    ];


    /*
     * Suppression du tableau principal.
     */
    this.notifications =
      this.notifications.filter(
        item =>
          item.id !==
          notification.id
      );


    /*
     * Sauvegarde archive.
     */
    this.saveArchivedNotifications();


    /*
     * Sauvegarde état.
     */
    this.saveNotificationState();


    this.currentPage =
      Math.min(
        this.currentPage,
        this.totalPages
      );


    this.archivePage =
      1;


    this.applyFilters();

  }


  // ==========================================================
  // ARCHIVE ALL
  // ==========================================================

  clearNotifications(): void {

    const pending =
      this.notifications.filter(

        notification =>
          !notification.treated

      );


    if (
      pending.length === 0
    ) {

      return;

    }


    const now =
      new Date().toISOString();


    for (
      const notification
      of pending
    ) {

      /*
       * Ne jamais créer deux archives.
       */
      if (
        this.isArchived(
          notification.id
        )
      ) {

        continue;

      }


      this.archivedNotifications.unshift({

        ...notification,

        treated:
          true,

        read:
          true,

        archivedAt:
          now

      });

    }


    /*
     * Suppression de toutes les Pending.
     */
    this.notifications =
      this.notifications.filter(

        notification =>
          notification.treated

      );


    /*
     * Déduplication finale.
     */
    this.deduplicateArchive();


    this.saveArchivedNotifications();


    this.saveNotificationState();


    this.currentPage =
      1;

    this.archivePage =
      1;

    this.applyFilters();

  }


  // ==========================================================
  // DEDUPLICATE ARCHIVE
  // ==========================================================

  private deduplicateArchive(): void {

    const map =
      new Map<
        string,
        NotificationItem
      >();


    for (
      const notification
      of this.archivedNotifications
    ) {

      if (
        !map.has(
          notification.id
        )
      ) {

        map.set(
          notification.id,
          notification
        );

      }

    }


    this.archivedNotifications =
      Array.from(
        map.values()
      );

  }


  // ==========================================================
  // GET STATE
  // ==========================================================

  private getNotificationState(
    id: string
  ):
    NotificationSavedState | null {

    const states =
      this.readNotificationStates();


    return (
      states.find(
        state =>
          state.id === id
      ) ??
      null
    );

  }


  // ==========================================================
  // READ STATES
  // ==========================================================

  private readNotificationStates():
    NotificationSavedState[] {

    try {

      const stored =
        localStorage.getItem(
          this.NOTIFICATION_STATE_KEY
        );


      if (!stored) {

        return [];

      }


      const parsed:
        unknown =
        JSON.parse(
          stored
        );


      if (!Array.isArray(parsed)) {

        return [];

      }


      return parsed.filter(
        item =>
          item &&
          typeof item === 'object'
      ) as NotificationSavedState[];

    } catch {

      return [];

    }

  }


  // ==========================================================
  // SAVE STATE
  // ==========================================================

  private saveNotificationState(): void {

    try {

      const existing =
        this.readNotificationStates();


      const activeStates =
        this.notifications.map(
          notification => ({

            id:
              notification.id,

            read:
              notification.read,

            treated:
              notification.treated,

            archived:
              false,

            createdAt:
              notification.createdAt,

            expiresAt:
              notification.expiresAt,

            expired:
              false

          })
        );


      /*
       * Les états archivés doivent rester connus.
       */
      const archiveStates =
        this.archivedNotifications.map(
          notification => ({

            id:
              notification.id,

            read:
              true,

            treated:
              true,

            archived:
              true,

            createdAt:
              notification.createdAt,

            expiresAt:
              notification.expiresAt,

            archivedAt:
              notification.archivedAt,

            expired:
              false

          })
        );


      /*
       * Conserver les expirés.
       */
      const expiredStates =
        existing.filter(
          state =>
            state.expired === true &&
            !activeStates.some(
              item =>
                item.id === state.id
            ) &&
            !archiveStates.some(
              item =>
                item.id === state.id
            )
        );


      const merged =
        [
          ...activeStates,
          ...archiveStates,
          ...expiredStates
        ];


      /*
       * Déduplication.
       */
      const map =
        new Map<
          string,
          NotificationSavedState
        >();


      for (
        const state
        of merged
      ) {

        map.set(
          state.id,
          state
        );

      }


      localStorage.setItem(

        this.NOTIFICATION_STATE_KEY,

        JSON.stringify(
          Array.from(
            map.values()
          )
        )

      );

    } catch (error) {

      console.error(
        'Error saving notification state:',
        error
      );

    }

  }


  // ==========================================================
  // LOAD ARCHIVE
  // ==========================================================

  private loadArchivedNotifications(): void {

    try {

      const stored =
        localStorage.getItem(
          this.ARCHIVE_KEY
        );


      if (!stored) {

        this.archivedNotifications =
          [];

        return;

      }


      const parsed:
        unknown =
        JSON.parse(
          stored
        );


      if (!Array.isArray(parsed)) {

        this.archivedNotifications =
          [];

        return;

      }


      this.archivedNotifications =
        parsed as NotificationItem[];


      /*
       * Déduplication.
       */
      this.deduplicateArchive();


      /*
       * Tri : dernier archivage en premier.
       */
      this.archivedNotifications.sort(
        (a, b) =>
          new Date(
            b.archivedAt ?? ''
          ).getTime() -
          new Date(
            a.archivedAt ?? ''
          ).getTime()
      );


      /*
       * Réécriture propre.
       */
      this.saveArchivedNotifications();


    } catch (error) {

      console.error(
        'Error loading archive:',
        error
      );


      this.archivedNotifications =
        [];

    }

  }


  // ==========================================================
  // SAVE ARCHIVE
  // ==========================================================

  private saveArchivedNotifications(): void {

    try {

      this.deduplicateArchive();


      localStorage.setItem(

        this.ARCHIVE_KEY,

        JSON.stringify(
          this.archivedNotifications
        )

      );

    } catch (error) {

      console.error(
        'Error saving archive:',
        error
      );

    }

  }


  // ==========================================================
  // TICKET AGE
  // ==========================================================

  getTicketAge(
    notification: NotificationItem
  ): number {

    return notification.ticketAge;

  }


  // ==========================================================
  // STATUS LABEL
  // ==========================================================

  statusLabel(
    notification: NotificationItem
  ): string {

    return notification.treated
      ? 'Treated'
      : 'Pending';

  }


  // ==========================================================
  // STATUS CLASS
  // ==========================================================

  statusClass(
    notification: NotificationItem
  ): string {

    return notification.treated
      ? 'status-treated'
      : 'status-pending';

  }


  // ==========================================================
  // ICON
  // ==========================================================

  iconFor(
    notification: NotificationItem
  ): string {

    return notification.treated
      ? 'bi-check-circle'
      : 'bi-exclamation-circle';

  }


  // ==========================================================
  // TYPE
  // ==========================================================

  getTypeLabel(
    type: NotificationRisk
  ): string {

    switch (type) {

      case 'HIGH':
        return 'High';

      case 'MEDIUM':
        return 'Medium';

      case 'LOW':
        return 'Low';

      default:
        return type;

    }

  }


  // ==========================================================
  // DATE
  // ==========================================================

  formatDate(
    value: string
  ): string {

    if (!value) {

      return '—';

    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '—';

    }


    return new Intl.DateTimeFormat(
      'en-US',
      {

        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit'

      }
    ).format(date);

  }


  // ==========================================================
  // RISK CLASS
  // ==========================================================

  riskClass(
    risk: NotificationRisk
  ): string {

    return risk.toLowerCase();

  }


  // ==========================================================
  // TRACK
  // ==========================================================

  trackByNotification(
    index: number,
    notification: NotificationItem
  ): string {

    return notification.id;

  }


  // ==========================================================
  // OPEN DATE
  // ==========================================================

  private extractOpeningDate(
    record: Record<string, unknown>
  ): string | null {

    const fields = [

      'raised',

      'openedAt',

      'opened_at',

      'createdAt',

      'created_at',

      'dateOpened',

      'openDate'

    ];


    for (
      const field
      of fields
    ) {

      const valid =
        this.getValidDate(
          record[field]
        );


      if (valid) {

        return valid;

      }

    }


    return null;

  }


  // ==========================================================
  // AGE
  // ==========================================================

  private calculateTicketAge(
    openedAt: string
  ): number {

    const opened =
      new Date(openedAt);


    const now =
      new Date();


    if (
      Number.isNaN(
        opened.getTime()
      )
    ) {

      return 0;

    }


    const difference =
      now.getTime() -
      opened.getTime();


    if (
      difference <= 0
    ) {

      return 0;

    }


    return Math.floor(

      difference /
      (
        1000 *
        60 *
        60 *
        24
      )

    );

  }


  // ==========================================================
  // MESSAGE
  // ==========================================================

  private buildMessage(
    reference: string,
    ticketAge: number,
    daysOverSla: number
  ): string {

    return (

      `Ticket ${reference} is HIGH risk and has been open ` +

      `for ${ticketAge} days. ` +

      `The ${this.SLA_DAYS}-day SLA is exceeded ` +

      `by ${daysOverSla} day(s).`

    );

  }


  // ==========================================================
  // DATE VALIDATION
  // ==========================================================

  private getValidDate(
    value: unknown
  ): string | null {

    if (
      value === undefined ||
      value === null
    ) {

      return null;

    }


    const text =
      String(value).trim();


    if (!text) {

      return null;

    }


    const date =
      new Date(text);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return null;

    }


    return date.toISOString();

  }


  // ==========================================================
  // ADD DAYS
  // ==========================================================

  private addDays(
    dateString: string,
    days: number
  ): string {

    const date =
      new Date(dateString);


    date.setDate(
      date.getDate() +
      days
    );


    return date.toISOString();

  }


  // ==========================================================
  // GENERIC VALUE
  // ==========================================================

  private getValue(
    record: Record<string, unknown>,
    fields: string[]
  ): unknown {

    for (
      const field
      of fields
    ) {

      if (
        record[field] !== undefined &&
        record[field] !== null
      ) {

        return record[field];

      }

    }


    return undefined;

  }


  // ==========================================================
  // STRING
  // ==========================================================

  private stringValue(
    value: unknown,
    fallback: string
  ): string {

    if (
      value === undefined ||
      value === null
    ) {

      return fallback;

    }


    const result =
      String(value).trim();


    return result ||
      fallback;

  }


  // ==========================================================
  // RISK
  // ==========================================================

  private normalizeRisk(
    value: unknown
  ): NotificationRisk {

    const risk =
      String(value ?? '')
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
  // PROBABILITY
  // ==========================================================

  private normalizeProbability(
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

}