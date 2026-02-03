
import { Component, ChangeDetectionStrategy, inject, computed, signal, effect } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, User, Lead, LeadOrigin, LeadStatus } from '../../services/data.service';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';

type Urgency = 'overdue' | 'due-today' | 'on-track' | 'completed' | 'needs-scheduling';
type FilterType = 'all' | 'overdue' | 'due-today' | 'new' | 'hot' | LeadOrigin;

interface DisplayLead extends Lead {
  owner: string;
  urgency: Urgency;
}

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leads.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadsComponent {
  dataService = inject(DataService);
  toastService = inject(ToastService);
  translationService = inject(TranslationService);
  
  users = this.dataService.users;
  origins: LeadOrigin[] = ['WhatsApp', 'Instagram', 'Website', 'Referral', 'Other'];

  // --- State Signals ---
  activeFilter = signal<FilterType>(this.getInitialFilter());
  
  isCreateModalOpen = signal(false);
  isDetailSlideoverOpen = signal(false);
  selectedLead = signal<DisplayLead | null>(null);

  // --- Create/Edit Models ---
  newLeadData = this.resetNewLeadData();
  createError = signal('');
  
  constructor() {
    effect(() => {
      localStorage.setItem('leads-filter', this.activeFilter());
    });
  }

  private getInitialFilter(): FilterType {
    return (localStorage.getItem('leads-filter') as FilterType) || 'all';
  }

  // --- Computed Data for Display ---
  leadsWithDetails = computed<DisplayLead[]>(() => {
    return this.dataService.leads().map(lead => ({
      ...lead,
      owner: this.dataService.getUserById(lead.ownerId)?.name || 'Unassigned',
      urgency: this.getUrgencyStatus(lead),
    })).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  filteredLeads = computed(() => {
    const leads = this.leadsWithDetails();
    const filter = this.activeFilter();
    
    if (filter === 'all') return leads;
    if (filter === 'overdue') return leads.filter(l => l.urgency === 'overdue');
    if (filter === 'due-today') return leads.filter(l => l.urgency === 'due-today');
    if (filter === 'new') return leads.filter(l => l.status === 'New');
    if (filter === 'hot') return leads.filter(l => l.score >= 75);
    return leads.filter(l => l.origin === filter);
  });

  // --- Header Summary ---
  summary = computed(() => {
    const allLeads = this.leadsWithDetails();
    const overdue = allLeads.filter(l => l.urgency === 'overdue').length;
    const dueToday = allLeads.filter(l => l.urgency === 'due-today').length;
    return {
      count: allLeads.length,
      overdue,
      dueToday,
    };
  });
  
  filterCounts = computed(() => {
    const leads = this.leadsWithDetails();
    return {
      all: leads.length,
      overdue: leads.filter(l => l.urgency === 'overdue').length,
      'due-today': leads.filter(l => l.urgency === 'due-today').length,
      new: leads.filter(l => l.status === 'New').length,
      hot: leads.filter(l => l.score >= 75).length,
    };
  });
  
  // --- Urgency and Date Helpers ---
  getUrgencyStatus(lead: Lead): Urgency {
    if (lead.actionCompleted) return 'completed';
    if (!lead.dueDate) return 'needs-scheduling';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(lead.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) return 'overdue';
    if (dueDate.getTime() === today.getTime()) return 'due-today';
    return 'on-track';
  }

  formatRelativeDate(lead: DisplayLead): string {
    if (lead.urgency === 'completed') return this.t.action_completed();
    if (lead.urgency === 'needs-scheduling' || !lead.dueDate) return this.t.no_due_date();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(lead.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return this.t.due_overdue({ days: Math.abs(diffDays) });
    if (diffDays === 0) return this.t.due_today();
    if (diffDays === 1) return this.t.due_tomorrow();
    return this.t.due_in({ days: diffDays });
  }

  // --- Event Handlers ---
  handleCompleteAction(event: Event, leadId: number) {
    event.stopPropagation();
    const lead = this.dataService.getLeadById(leadId);
    if (lead) {
      this.dataService.updateLead(leadId, { actionCompleted: !lead.actionCompleted });
      const activity = lead.actionCompleted ? `Action "${lead.nextActionText}" marked as incomplete.` : `Action "${lead.nextActionText}" completed.`;
      this.dataService.addLeadActivity(leadId, activity);
    }
  }
  
  handleReschedule(event: Event, leadId: number, newDate: string) {
    event.stopPropagation();
    if (newDate) {
        this.dataService.updateLead(leadId, { dueDate: new Date(newDate).toISOString() });
        this.dataService.addLeadActivity(leadId, `Action due date rescheduled to ${formatDate(newDate, 'mediumDate', 'en-US')}.`);
    }
  }
  
  openDetailSlideover(lead: DisplayLead) {
    this.selectedLead.set({...lead});
    this.isDetailSlideoverOpen.set(true);
  }

  handleCreateLead() {
    const { name, origin, ownerId, nextActionText, dueDate } = this.newLeadData;
    if (!name || !origin || !ownerId || !nextActionText || !dueDate) {
      this.createError.set(this.t.create_modal_error());
      return;
    }
    
    this.dataService.addLead({
        name, origin, ownerId, nextActionText,
        dueDate: new Date(dueDate).toISOString(),
        status: 'New',
        score: 0,
        notes: '',
        actionCompleted: false,
        // other fields
        contacted: false,
        messages: [],
        unread: true,
    });

    this.toastService.show('success', 'Lead created successfully!');
    this.isCreateModalOpen.set(false);
    this.newLeadData = this.resetNewLeadData();
    this.createError.set('');
  }
  
  handleUpdateLead() {
      const lead = this.selectedLead();
      if (!lead) return;
      this.dataService.updateLead(lead.id, {
          ownerId: lead.ownerId,
          status: lead.status,
          nextActionText: lead.nextActionText,
          dueDate: lead.dueDate ? new Date(lead.dueDate).toISOString() : null,
          notes: lead.notes,
      });
      this.dataService.addLeadActivity(lead.id, 'Lead details updated.');
      this.toastService.show('success', 'Lead updated successfully!');
      this.isDetailSlideoverOpen.set(false);
  }

  private resetNewLeadData() {
    return {
      name: '',
      origin: 'Website' as LeadOrigin,
      ownerId: 1,
      status: 'New' as LeadStatus,
      nextActionText: '',
      dueDate: '',
    };
  }
  
  // --- Translated UI Strings ---
  t = {
    title: this.translationService.translate('leads_title'),
    create: this.translationService.translate('leads_create'),
    summary: (count: number) => this.translationService.translateWithParams('leads_summary', { count })(),
    summary_overdue: (count: number) => this.translationService.translateWithParams('leads_summary_overdue', { count })(),
    summary_due_today: (count: number) => this.translationService.translateWithParams('leads_summary_due_today', { count })(),
    head_name: this.translationService.translate('leads_head_name'),
    head_origin: this.translationService.translate('leads_head_origin'),
    head_owner: this.translationService.translate('leads_head_owner'),
    head_status: this.translationService.translate('leads_head_status'),
    head_next_action: this.translationService.translate('leads_head_next_action'),
    head_due_date: this.translationService.translate('leads_head_due_date'),
    filter_all: this.translationService.translate('leads_filter_all'),
    filter_overdue: this.translationService.translate('leads_filter_overdue'),
    filter_due_today: this.translationService.translate('leads_filter_due_today'),
    filter_new: this.translationService.translate('leads_filter_new'),
    filter_hot: this.translationService.translate('leads_filter_hot'),
    action_complete: this.translationService.translate('leads_action_complete'),
    action_completed: this.translationService.translate('leads_action_completed'),
    action_reschedule: this.translationService.translate('leads_action_reschedule'),
    action_edit: this.translationService.translate('leads_action_edit'),
    action_view_details: this.translationService.translate('leads_action_view_details'),
    action_message: this.translationService.translate('leads_action_message'),
    due_overdue: (params: {days: number}) => this.translationService.translateWithParams('leads_due_overdue', params)(),
    due_today: this.translationService.translate('leads_due_today'),
    due_in: (params: {days: number}) => this.translationService.translateWithParams('leads_due_in', params)(),
    due_tomorrow: this.translationService.translate('leads_due_tomorrow'),
    no_due_date: this.translationService.translate('leads_no_due_date'),
    empty_title: this.translationService.translate('leads_empty_title'),
    empty_subtitle: this.translationService.translate('leads_empty_subtitle'),
    filter_empty_title: this.translationService.translate('leads_filter_empty_title'),
    filter_empty_subtitle: this.translationService.translate('leads_filter_empty_subtitle'),
    clear_filters: this.translationService.translate('leads_clear_filters'),
    create_modal_title: this.translationService.translate('leads_create_modal_title'),
    create_modal_subtitle: this.translationService.translate('leads_create_modal_subtitle'),
    create_modal_name_label: this.translationService.translate('leads_create_modal_name_label'),
    create_modal_name_placeholder: this.translationService.translate('leads_create_modal_name_placeholder'),
    create_modal_origin_label: this.translationService.translate('leads_create_modal_origin_label'),
    create_modal_owner_label: this.translationService.translate('leads_create_modal_owner_label'),
    create_modal_status_label: this.translationService.translate('leads_create_modal_status_label'),
    create_modal_next_action_label: this.translationService.translate('leads_create_modal_next_action_label'),
    create_modal_next_action_placeholder: this.translationService.translate('leads_create_modal_next_action_placeholder'),
    create_modal_due_date_label: this.translationService.translate('leads_create_modal_due_date_label'),
    create_modal_error: this.translationService.translate('leads_create_modal_error'),
    create_modal_save: this.translationService.translate('leads_create_modal_save'),
    detail_notes: this.translationService.translate('leads_detail_notes'),
    detail_notes_placeholder: this.translationService.translate('leads_detail_notes_placeholder'),
    detail_activity: this.translationService.translate('leads_detail_activity'),
    detail_save_changes: this.translationService.translate('leads_detail_save_changes'),
    cancel: this.translationService.translate('modal_cancel'),
    seed_data: this.translationService.translate('seed_data'),
  };
}
