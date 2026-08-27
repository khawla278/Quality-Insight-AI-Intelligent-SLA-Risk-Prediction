import {
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { Subscription } from 'rxjs';

import { NotificationService } from './service/notification.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {

  menuOpen = true;
  unreadNotifications = 0;
  settingsOpen = false;
  darkMode = false;
  reducedMotion = false;
  notificationsEnabled = true;

  private readonly NOTIFICATION_STATE_KEY = 'qualityInsightNotificationState';
  private readonly SETTINGS_KEY = 'qualityInsightAppSettings';

  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  private notificationSubscription?: Subscription;

  // Applique le thème AVANT le premier rendu du template,
  // pour éviter le flash blanc et garantir que TOUT (y compris
  // les composants enfants pas encore montés) parte du bon état.
  constructor() {
    this.loadSettings();
    this.applySettingsToDocument();
  }

  ngOnInit(): void {
    this.updateUnreadCount();

    this.notificationSubscription = this.notificationService
      .notifications$
      .subscribe(() => this.updateUnreadCount());

    window.addEventListener('storage', this.handleStorageChange);

    // Réapplique le thème à chaque navigation, au cas où une page
    // arrivée après coup réinitialise des styles inline.
    this.router.events.subscribe(() => {
      this.applySettingsToDocument();
    });
  }

  ngOnDestroy(): void {
    this.notificationSubscription?.unsubscribe();
    window.removeEventListener('storage', this.handleStorageChange);
  }

  private handleStorageChange = (event: StorageEvent): void => {
    if (event.key === this.SETTINGS_KEY && event.newValue) {
      this.loadSettings();
      this.applySettingsToDocument();
    }
  };

  updateUnreadCount(): void {
    try {
      const stored = localStorage.getItem(this.NOTIFICATION_STATE_KEY);
      if (!stored) { this.unreadNotifications = 0; return; }

      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) { this.unreadNotifications = 0; return; }

      this.unreadNotifications = parsed.filter((item: unknown) => {
        if (!item || typeof item !== 'object') return false;
        const n = item as { treated?: boolean; expired?: boolean };
        return n.treated !== true && n.expired !== true;
      }).length;
    } catch (error) {
      console.error('Error updating notification badge:', error);
      this.unreadNotifications = 0;
    }
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  toggleSettings(): void { this.settingsOpen = !this.settingsOpen; }
  closeSettings(): void { this.settingsOpen = false; }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      if (!stored) { this.setDefaultSettings(); return; }

      const parsed: unknown = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object') { this.setDefaultSettings(); return; }

      const settings = parsed as {
        darkMode?: boolean;
        reducedMotion?: boolean;
        notificationsEnabled?: boolean;
      };

      this.darkMode = settings.darkMode === true;
      this.reducedMotion = settings.reducedMotion === true;
      this.notificationsEnabled = settings.notificationsEnabled !== false;
    } catch (error) {
      console.error('Unable to load application settings:', error);
      this.setDefaultSettings();
    }
  }

  private setDefaultSettings(): void {
    this.darkMode = false;
    this.reducedMotion = false;
    this.notificationsEnabled = true;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify({
        darkMode: this.darkMode,
        reducedMotion: this.reducedMotion,
        notificationsEnabled: this.notificationsEnabled
      }));
    } catch (error) {
      console.error('Unable to save application settings:', error);
    }
  }

  // ==========================================================
  // APPLIQUE LE THÈME GLOBALEMENT
  // ==========================================================
  private applySettingsToDocument(): void {
    const body = document.body;
    const html = document.documentElement;

    body.classList.toggle('app-dark-mode', this.darkMode);
    html.classList.toggle('app-dark-mode', this.darkMode);

    body.classList.toggle('app-reduced-motion', this.reducedMotion);
    html.classList.toggle('app-reduced-motion', this.reducedMotion);

    const theme = this.darkMode ? 'dark' : 'light';
    body.setAttribute('data-theme', theme);
    html.setAttribute('data-theme', theme);

    // Force le color-scheme natif du navigateur (scrollbars,
    // inputs natifs, etc.) à suivre le thème -> couvre les
    // éléments que le CSS custom ne touche pas.
    html.style.colorScheme = theme;
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    this.saveSettings();
    this.applySettingsToDocument();
  }

  toggleReducedMotion(): void {
    this.reducedMotion = !this.reducedMotion;
    this.saveSettings();
    this.applySettingsToDocument();
  }

  toggleNotifications(): void {
    this.notificationsEnabled = !this.notificationsEnabled;
    this.saveSettings();
  }

  resetSettings(): void {
    this.setDefaultSettings();
    this.saveSettings();
    this.applySettingsToDocument();
  }

  goToDashboard(): void {
    this.settingsOpen = false;
    void this.router.navigate(['/dashboard']);
  }

  goToNotifications(): void {
    this.settingsOpen = false;
    void this.router.navigate(['/notifications']);
  }

  goToAssistant(): void {
    this.settingsOpen = false;
    void this.router.navigate(['/ai-assistant']);
  }
}