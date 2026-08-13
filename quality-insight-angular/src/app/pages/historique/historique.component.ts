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

import { jsPDF } from 'jspdf';

import {
  NonConformanceRecord,
  RiskLevel,
  IncidentRequest,
  NCState
} from '../../models/api.models';


// ============================================================
// FORMULAIRE NOUVELLE NC
// ============================================================

interface NewNCForm {
  title: string;
  category: string;
  subcategory: string;
  symptom: string;
  assignment_group: string;
  assigned_to: string;
  impact: number;
  urgency: number;
  priority: number;
  state: NCState;
  opened_at: string;
}


// ============================================================
// RÉPONSE BACKEND /predict
// ============================================================

interface PredictionApiResponse {
  risk_level?: string;
  probability?: number;
  confidence?: number;
  threshold?: number;
  medium_threshold?: number;
  model_version?: string;
  sla_target_days?: number;
  prediction?: string;
  generated_features?: unknown;
}


// ============================================================
// COMPOSANT
// ============================================================

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './historique.component.html',
  styleUrl: './historique.component.css'
})
export class HistoriqueComponent implements OnInit {

  // ==========================================================
  // API
  // ==========================================================
  private readonly API_URL = 'http://127.0.0.1:8000';

  // ==========================================================
  // DONNÉES
  // ==========================================================
  records: NonConformanceRecord[] = [];

  // ==========================================================
  // MODAL RAISE NC
  // ==========================================================
  showModal = false;

  // ==========================================================
  // MODAL DETAILS
  // ==========================================================
  showDetailsModal = false;
  selectedRecord: NonConformanceRecord | null = null;

  // ==========================================================
  // ÉTAT ENVOI
  // ==========================================================
  isSubmitting = false;
  submitError: string | null = null;

  // ==========================================================
  // FORMULAIRE
  // ==========================================================
  newNC: NewNCForm = this.createEmptyForm();

  // ==========================================================
  // RECHERCHE
  // ==========================================================
  searchTerm = '';

  // ==========================================================
  // FILTRE RISQUE
  // ==========================================================
  riskFilter: 'ALL' | RiskLevel = 'ALL';

  // ==========================================================
  // PAGINATION
  // ==========================================================
  currentPage = 1;
  pageSize = 5;

  // ==========================================================
  // INIT
  // ==========================================================
  ngOnInit(): void {
    this.loadHistory();
  }

  // ==========================================================
  // FORMULAIRE VIDE
  // ==========================================================
  private createEmptyForm(): NewNCForm {
    const now = new Date();

    const localDate = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 16);

    return {
      title: '',
      category: '',
      subcategory: '',
      symptom: '',
      assignment_group: '',
      assigned_to: '',
      impact: 2,
      urgency: 2,
      priority: 3,
      state: 'RAISED',
      opened_at: localDate
    };
  }

  // ==========================================================
  // CHARGEMENT HISTORIQUE
  // ==========================================================
  loadHistory(): void {
    try {
      const stored = localStorage.getItem('nonConformanceHistory');

      if (stored) {
        const parsed: unknown = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          this.records = parsed
            .map((item: unknown) => this.normalizeRecord(item))
            .filter((item: NonConformanceRecord | null): item is NonConformanceRecord => item !== null);

          this.sortRecords();
          this.fixCurrentPage();
          return;
        }
      }

      this.importDashboardHistory();

    } catch (error) {
      console.error('Erreur chargement historique :', error);
      this.records = [];
    }
  }

  // ==========================================================
  // NORMALISATION RECORD
  // ==========================================================
  private normalizeRecord(value: unknown): NonConformanceRecord | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const item = value as Partial<NonConformanceRecord>;

    if (!item.ref || !item.title) {
      return null;
    }

    return {
      ref: String(item.ref),
      title: String(item.title),
      category: String(item.category ?? '—'),
      assignment_group: String(item.assignment_group ?? '—'),
      state: this.normalizeState(item.state),
      risk: this.normalizeRisk(item.risk),
      probability: this.normalizeProbability(item.probability),
      raised: String(item.raised ?? new Date().toISOString()),
      source: item.source === 'MANUAL' ? 'MANUAL' : 'DASHBOARD',
      input: item.input
    };
  }

  // ==========================================================
  // NORMALISER STATE
  // ==========================================================
  private normalizeState(value: unknown): NCState {
    const state = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');

    switch (state) {
      case 'RAISED':
      case 'OPEN':
        return 'RAISED';
      case 'ASSIGNED':
        return 'ASSIGNED';
      case 'UNDER_INVESTIGATION':
      case 'INVESTIGATION':
      case 'IN_PROGRESS':
        return 'UNDER_INVESTIGATION';
      case 'CORRECTIVE_ACTION':
        return 'CORRECTIVE_ACTION';
      case 'CLOSED':
        return 'CLOSED';
      case 'REJECTED':
        return 'REJECTED';
      default:
        return 'RAISED';
    }
  }

  // ==========================================================
  // LABEL STATE
  // ==========================================================
  stateLabel(state: NCState): string {
    switch (state) {
      case 'RAISED': return 'Raised';
      case 'ASSIGNED': return 'Assigned';
      case 'UNDER_INVESTIGATION': return 'Under Investigation';
      case 'CORRECTIVE_ACTION': return 'Corrective Action';
      case 'CLOSED': return 'Closed';
      case 'REJECTED': return 'Rejected';
      default: return 'Raised';
    }
  }

  // ==========================================================
  // CLASSE STATE
  // ==========================================================
  stateClass(state: NCState): string {
    return state.toLowerCase().replace(/_/g, '-');
  }

  // ==========================================================
  // IMPORT DASHBOARD HISTORY
  // ==========================================================
  private importDashboardHistory(): void {
    try {
      const stored = localStorage.getItem('predictionHistory');

      if (!stored) {
        this.records = [];
        return;
      }

      const predictions: any[] = JSON.parse(stored);

      if (!Array.isArray(predictions)) {
        return;
      }

      this.records = predictions.map((item: any, index: number) => {
        const input: IncidentRequest = item?.input ?? {} as IncidentRequest;

        const record: NonConformanceRecord = {
          ref: this.generateRef(index),
          title: this.generateTitle(input),
          category: input.category || '—',
          assignment_group: input.assignment_group || '—',
          state: this.normalizeState(input.incident_state),
          risk: this.normalizeRisk(item?.risk ?? item?.risk_level),
          probability: this.normalizeProbability(item?.probability),
          raised: item?.date || new Date().toISOString(),
          source: 'DASHBOARD',
          input: input
        };

        return record;
      });

      this.sortRecords();
      this.saveHistory();
      this.fixCurrentPage();

    } catch (error) {
      console.error('Erreur migration Dashboard :', error);
    }
  }

  // ==========================================================
  // TRI
  // ==========================================================
  private sortRecords(): void {
    this.records.sort((a, b) => {
      const dateA = new Date(a.raised).getTime();
      const dateB = new Date(b.raised).getTime();
      return dateB - dateA;
    });
  }

  // ==========================================================
  // OUVRIR MODAL
  // ==========================================================
  openModal(): void {
    this.newNC = this.createEmptyForm();
    this.submitError = null;
    this.isSubmitting = false;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  // ==========================================================
  // FERMER MODAL
  // ==========================================================
  closeModal(): void {
    if (this.isSubmitting) {
      return;
    }

    this.showModal = false;
    this.submitError = null;
    document.body.style.overflow = '';
  }

  // ==========================================================
  // RAISE NC
  // ==========================================================
  async addNC(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    if (
      !this.newNC.title.trim() ||
      !this.newNC.category.trim() ||
      !this.newNC.assignment_group.trim()
    ) {
      this.submitError = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    this.isSubmitting = true;
    this.submitError = null;

    const incidentInput: IncidentRequest = {
      incident_state: this.newNC.state,
      category: this.newNC.category.trim(),
      subcategory: this.newNC.subcategory.trim(),
      u_symptom: this.newNC.symptom.trim(),
      assignment_group: this.newNC.assignment_group.trim(),
      assigned_to: this.newNC.assigned_to.trim(),
      impact: Number(this.newNC.impact),
      urgency: Number(this.newNC.urgency),
      priority: Number(this.newNC.priority),
      opened_at: this.newNC.opened_at
    };

    try {
      const prediction = await this.predictRisk(incidentInput);

      const record: NonConformanceRecord = {
        ref: this.generateNextRef(),
        title: this.newNC.title.trim(),
        category: this.newNC.category.trim(),
        assignment_group: this.newNC.assignment_group.trim(),
        state: this.newNC.state,
        risk: prediction.risk,
        probability: prediction.probability,
        raised: this.newNC.opened_at
          ? new Date(this.newNC.opened_at).toISOString()
          : new Date().toISOString(),
        source: 'MANUAL',
        input: incidentInput
      };

      this.records = [record, ...this.records];

      this.sortRecords();
      this.saveHistory();

      this.currentPage = 1;
      this.newNC = this.createEmptyForm();
      this.showModal = false;
      document.body.style.overflow = '';

    } catch (error) {
      console.error('Erreur prédiction NC :', error);
      this.submitError = 'Impossible de calculer le risque. Vérifiez que le backend FastAPI est démarré et accessible.';
    } finally {
      this.isSubmitting = false;
    }
  }

  // ==========================================================
  // PRÉDICTION AUTOMATIQUE
  // ==========================================================
  private async predictRisk(input: IncidentRequest): Promise<{ risk: RiskLevel; probability: number; }> {
    const response = await fetch(`${this.API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(`Prediction failed: ${response.status} ${message}`);
    }

    const data: PredictionApiResponse = await response.json();

    const risk = this.normalizeRisk(data.risk_level);
    const probability = this.normalizeProbability(data.probability);

    return { risk, probability };
  }

  // ==========================================================
  // REF SUIVANTE
  // ==========================================================
  private generateNextRef(): string {
    let maxNumber = 0;

    for (const record of this.records) {
      const match = String(record.ref).match(/NC-(\d+)/i);

      if (!match) {
        continue;
      }

      const number = Number(match[1]);

      if (Number.isFinite(number) && number > maxNumber) {
        maxNumber = number;
      }
    }

    return 'NC-' + String(maxNumber + 1).padStart(4, '0');
  }

  // ==========================================================
  // REF MIGRATION
  // ==========================================================
  private generateRef(index: number): string {
    return 'NC-' + String(index + 1).padStart(4, '0');
  }

  // ==========================================================
  // TITRE
  // ==========================================================
  private generateTitle(input: Partial<IncidentRequest>): string {
    const symptom = String(input.u_symptom ?? '').trim();
    const category = String(input.category ?? '').trim();
    const subcategory = String(input.subcategory ?? '').trim();

    if (symptom) {
      return symptom;
    }

    if (category && subcategory) {
      return category + ' - ' + subcategory;
    }

    if (category) {
      return category;
    }

    return 'Incident prediction';
  }

  // ==========================================================
  // RISQUE
  // ==========================================================
  private normalizeRisk(value: unknown): RiskLevel {
    const risk = String(value ?? '').trim().toUpperCase();

    if (risk.includes('HIGH')) {
      return 'HIGH';
    }

    if (risk.includes('MEDIUM') || risk.includes('MED')) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  // ==========================================================
  // PROBABILITÉ
  // ==========================================================
  private normalizeProbability(value: unknown): number {
    let probability = Number(value);

    if (!Number.isFinite(probability)) {
      return 0;
    }

    if (probability > 1) {
      probability /= 100;
    }

    return Math.min(Math.max(probability, 0), 1);
  }

  // ==========================================================
  // SAUVEGARDE
  // ==========================================================
  private saveHistory(): void {
    try {
      localStorage.setItem('nonConformanceHistory', JSON.stringify(this.records));
    } catch (error) {
      console.error('Erreur sauvegarde historique :', error);
    }
  }

  // ==========================================================
  // FILTRAGE
  // ==========================================================
  get filteredRecords(): NonConformanceRecord[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.records.filter((record) => {
      const matchesSearch =
        !search ||
        record.ref.toLowerCase().includes(search) ||
        record.title.toLowerCase().includes(search) ||
        record.category.toLowerCase().includes(search) ||
        record.assignment_group.toLowerCase().includes(search) ||
        this.stateLabel(record.state).toLowerCase().includes(search) ||
        record.risk.toLowerCase().includes(search);

      const matchesRisk = this.riskFilter === 'ALL' || record.risk === this.riskFilter;

      return matchesSearch && matchesRisk;
    });
  }

  // ==========================================================
  // PAGINATION
  // ==========================================================
  get paginatedRecords(): NonConformanceRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRecords.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRecords.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  onRiskFilterChange(): void {
    this.currentPage = 1;
  }

  trackByRef(index: number, record: NonConformanceRecord): string {
    return record.ref;
  }

  getProbability(record: NonConformanceRecord): number {
    return record.probability * 100;
  }

  riskClass(risk: RiskLevel | null): string {
    return risk?.toLowerCase() ?? 'none';
  }

  formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  viewRecord(record: NonConformanceRecord): void {
    this.selectedRecord = record;
    this.showDetailsModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.selectedRecord = null;
    document.body.style.overflow = '';
  }

  deleteRecord(record: NonConformanceRecord): void {
    const confirmed = window.confirm(`Voulez-vous supprimer la NC ${record.ref} ?`);

    if (!confirmed) {
      return;
    }

    this.records = this.records.filter(item => item.ref !== record.ref);

    this.saveHistory();
    this.fixCurrentPage();

    if (this.selectedRecord?.ref === record.ref) {
      this.closeDetails();
    }
  }

  clearHistory(): void {
    const confirmed = window.confirm('Voulez-vous vraiment supprimer tout l’historique ?');

    if (!confirmed) {
      return;
    }

    this.records = [];
    this.currentPage = 1;

    localStorage.removeItem('nonConformanceHistory');
    localStorage.removeItem('predictionHistory');
    localStorage.removeItem('latestPredictionExplanation');

    this.closeDetails();
  }

  resetForm(): void {
    this.newNC = this.createEmptyForm();
    this.submitError = null;
  }

  private fixCurrentPage(): void {
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

  riskLabel(risk: RiskLevel): string {
    switch (risk) {
      case 'HIGH': return 'High';
      case 'MEDIUM': return 'Medium';
      case 'LOW': return 'Low';
      default: return risk;
    }
  }

  impactLabel(value?: number): string {
    switch (Number(value)) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return '—';
    }
  }

  urgencyLabel(value?: number): string {
    switch (Number(value)) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return '—';
    }
  }

  priorityLabel(value?: number): string {
    switch (Number(value)) {
      case 1: return 'Critical';
      case 2: return 'High';
      case 3: return 'Moderate';
      case 4: return 'Low';
      case 5: return 'Planning';
      default: return '—';
    }
  }

  hasInput(record: NonConformanceRecord): boolean {
    return !!record.input;
  }

  // ==========================================================
  // EXPORT PDF (depuis une ligne du tableau ou la modale détails)
  // ==========================================================
  exportPdf(record: NonConformanceRecord): void {
    const doc = new jsPDF();

    // ---- En-tête ----
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Non-Conformance Report', 15, 17);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(record.ref, 15, 24);

    doc.setTextColor(30, 41, 59);

    let y = 42;
    const lineHeight = 8;

    const addRow = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${label} :`, 15, y);

      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value || '—', 120);
      doc.text(lines, 70, y);

      y += lineHeight * lines.length;
    };

    // ---- Section identification ----
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('Identification', 15, y);
    y += 6;
    doc.setTextColor(30, 41, 59);

    addRow('Title', record.title);
    addRow('Category', record.category);
    addRow('Assignment Group', record.assignment_group);
    addRow('State', this.stateLabel(record.state));
    addRow('Raised', this.formatDate(record.raised));
    addRow('Source', record.source === 'MANUAL' ? 'Manual NC' : 'AI Prediction');

    y += 4;

    // ---- Section risque ----
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('AI Risk Assessment', 15, y);
    y += 6;
    doc.setTextColor(30, 41, 59);

    addRow('Risk Level', this.riskLabel(record.risk));
    addRow('Probability', `${this.getProbability(record).toFixed(1)} %`);

    y += 4;

    // ---- Section détails incident ----
    if (record.input) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('Incident Details', 15, y);
      y += 6;
      doc.setTextColor(30, 41, 59);

      addRow('Subcategory', record.input.subcategory ?? '—');
      addRow('Assigned To', record.input.assigned_to ?? '—');
      addRow('Impact', this.impactLabel(record.input.impact));
      addRow('Urgency', this.urgencyLabel(record.input.urgency));
      addRow('Priority', this.priorityLabel(record.input.priority));
      addRow('Symptom', record.input.u_symptom ?? '—');
    }

    // ---- Pied de page ----
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Généré le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`,
      15,
      287
    );

    doc.save(`${record.ref}.pdf`);
  }
}