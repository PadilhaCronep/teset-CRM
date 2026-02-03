
import { Component, ChangeDetectionStrategy, computed, inject, signal, effect } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Deal, DealStage, Lead, Task, User } from '../../services/data.service';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../../services/toast.service';

type RiskStatus = 'overdue' | 'due-today' | 'on-track' | 'needs-scheduling' | 'completed';

interface KanbanDeal extends Deal {
  lead: Lead;
  owner?: User;
  riskStatus: RiskStatus;
  daysInStage: number;
  isStalled: boolean;
  overdueDays?: number;
}

type ModalContext = {
  deal: KanbanDeal;
  targetStage: DealStage;
}

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pipeline.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineComponent {
  dataService = inject(DataService);
  translationService = inject(TranslationService);
  toastService = inject(ToastService);

  // --- COMPONENT STATE ---
  stages: DealStage[] = ['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
  isManagerView = signal(false);
  
  // Drag & Drop State
  draggedDeal = signal<KanbanDeal | null>(null);
  dragOverStage = signal<DealStage | null>(null);

  // Modal & Slide-over State
  showMoveModal = signal(false);
  modalContext = signal<ModalContext | null>(null);
  
  showDetailSlideover = signal(false);
  slideoverDeal = signal<KanbanDeal | null>(null);
  
  showLucasModal = signal(false);
  lucasContext = signal<{deal: KanbanDeal, trigger: string} | null>(null);
  lucasIsThinking = signal(false);
  lucasResponse = signal<string[]>([]);
  
  // --- MODAL FORM MODELS ---
  moveModal = this.resetMoveModal();

  constructor() {
    effect(() => {
        const deal = this.slideoverDeal();
        if (deal) {
            this.slideoverDeal.set(this.kanbanDeals().find(d => d.id === deal.id) || null);
        }
    });
  }

  // --- CORE COMPUTED DATA ---
  private kanbanDeals = computed<KanbanDeal[]>(() => {
    const leads = this.dataService.leads();
    const users = this.dataService.users();
    const now = new Date().getTime();

    return this.dataService.deals().map(deal => {
      const lead = leads.find(l => l.id === deal.leadId)!;
      const daysInStage = Math.floor((now - new Date(deal.stageEnteredAt).getTime()) / (1000 * 3600 * 24));
      const riskStatus = this.getRiskStatus(lead);
      let overdueDays: number | undefined;

      if (riskStatus === 'overdue' && lead.dueDate) {
        overdueDays = Math.floor((now - new Date(lead.dueDate).getTime()) / (1000 * 3600 * 24));
      }
      
      return {
        ...deal,
        lead,
        owner: users.find(u => u.id === lead.ownerId),
        riskStatus,
        daysInStage,
        isStalled: daysInStage > 7,
        overdueDays,
      };
    });
  });
  
  dealsInStage = computed(() => (stage: DealStage) => {
    return this.kanbanDeals().filter(deal => deal.stage === stage);
  });
  
  stageValue = computed(() => (stage: DealStage) => {
    return this.dealsInStage()(stage).reduce((sum, deal) => sum + deal.value, 0);
  });

  private getRiskStatus(lead: Lead): RiskStatus {
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

  // --- HEADER COMPUTED DATA ---
  private activeDeals = computed(() => this.kanbanDeals().filter(d => d.stage !== 'Won' && d.stage !== 'Lost'));
  totalPipelineValue = computed(() => this.activeDeals().reduce((sum, d) => sum + d.value, 0));
  
  private stageProbabilities: Record<DealStage, number> = { 'New Lead': 0.20, 'Contacted': 0.35, 'Proposal Sent': 0.55, 'Negotiation': 0.75, 'Won': 1, 'Lost': 0 };
  expectedRevenue = computed(() => this.activeDeals().reduce((sum, d) => sum + (d.value * this.stageProbabilities[d.stage]), 0));
  
  gapToGoal = computed(() => this.dataService.monthlyGoal() - this.expectedRevenue());

  // --- MANAGER VIEW COMPUTED DATA ---
  managerStats = computed(() => {
    const stats: {[key in DealStage]?: {avgAge: number, stalled: number, overdue: number}} = {};
    let bottleneckStage: DealStage | null = null;
    let maxAvgAge = -1;

    for (const stage of this.stages) {
      if (stage === 'Won' || stage === 'Lost') continue;
      const deals = this.dealsInStage()(stage);
      if (deals.length > 0) {
        const avgAge = deals.reduce((sum, d) => sum + d.daysInStage, 0) / deals.length;
        stats[stage] = {
          avgAge,
          stalled: deals.filter(d => d.isStalled).length,
          overdue: deals.filter(d => d.riskStatus === 'overdue').length,
        };
        if (avgAge > maxAvgAge) {
          maxAvgAge = avgAge;
          bottleneckStage = stage;
        }
      }
    }
    return { stats, bottleneckStage };
  });

  // --- DRAG & DROP HANDLERS ---
  onDragStart(deal: KanbanDeal) {
    this.draggedDeal.set(deal);
  }
  
  onDragEnd() {
    this.draggedDeal.set(null);
    this.dragOverStage.set(null);
  }

  onDragOver(event: DragEvent, stage: DealStage) {
    event.preventDefault(); // Necessary to allow dropping
    if (this.draggedDeal() && this.draggedDeal()?.stage !== stage) {
      this.dragOverStage.set(stage);
    }
  }

  onBoardDragLeave() {
    this.dragOverStage.set(null);
  }

  onDrop(event: DragEvent, targetStage: DealStage) {
    event.preventDefault();
    const deal = this.draggedDeal();
    if (deal && deal.stage !== targetStage) {
      this.modalContext.set({ deal, targetStage });
      this.moveModal.targetStage = targetStage;
      this.showMoveModal.set(true);
    }
    this.draggedDeal.set(null);
    this.dragOverStage.set(null);
  }

  // --- CARD ACTION HANDLERS ---
  handleCompleteAction(event: Event, lead: Lead) {
    event.stopPropagation();
    const isCompleted = !lead.actionCompleted;
    this.dataService.updateLead(lead.id, { actionCompleted: isCompleted });
    const activity = isCompleted ? `Action "${lead.nextActionText}" completed.` : `Action "${lead.nextActionText}" marked as incomplete.`;
    this.dataService.addLeadActivity(lead.id, activity);
    this.toastService.show('success', isCompleted ? 'Action completed!' : 'Action marked incomplete.');
  }

  handleReschedule(event: Event, lead: Lead) {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.dataService.updateLead(lead.id, { dueDate: new Date(input.value).toISOString() });
      this.dataService.addLeadActivity(lead.id, `Action rescheduled to ${formatDate(input.value, 'mediumDate', 'en-US')}.`);
      this.toastService.show('success', 'Action rescheduled.');
    }
  }
  
  // --- MODAL & SLIDE-OVER HANDLERS ---
  openDetailSlideover(deal: KanbanDeal) {
    this.slideoverDeal.set(deal);
    this.showDetailSlideover.set(true);
  }

  openLucasModal(deal: KanbanDeal, trigger: string) {
    this.lucasContext.set({deal, trigger});
    this.showLucasModal.set(true);
    this.lucasIsThinking.set(true);
    this.lucasResponse.set([]);
    // Simulate AI response
    setTimeout(() => {
        this.lucasResponse.set([
            "Acknowledging their concern while reinforcing value is key. Try this: 'I understand the budget is a primary concern. Let's revisit the scope to see if we can align the value directly with your most critical needs.'",
            "To test their authority, you could ask: 'Besides yourself, who else on the team will be involved in the final decision-making process for this partnership?'",
            "Create urgency by highlighting a potential loss: 'We have availability to start onboarding next week. If we delay, the next slot is in 3 weeks, which might impact your Q3 goals.'"
        ]);
        this.lucasIsThinking.set(false);
    }, 1500);
  }
  
  copyLucasResponse(text: string) {
    navigator.clipboard.writeText(text);
    this.toastService.show('success', 'Message copied to clipboard!');
  }

  handleMoveDealSave() {
    const context = this.modalContext();
    const form = this.moveModal;
    if (!context || !form.nextActionText || !form.dueDate) {
      form.error = 'Next Action and Due Date are mandatory.';
      return;
    }
    
    // Update deal stage and lead's next action
    this.dataService.updateDealStage(context.deal.id, context.targetStage);
    this.dataService.updateLead(context.deal.leadId, {
      nextActionText: form.nextActionText,
      dueDate: new Date(form.dueDate).toISOString(),
      actionCompleted: false,
    });
    this.dataService.addLeadActivity(context.deal.leadId, `Deal moved to ${context.targetStage}. Next action: "${form.nextActionText}"`);

    // Handle stage-specific updates
    if (context.targetStage === 'Won') {
        this.dataService.updateDeal(context.deal.id, { value: form.finalValue });
    }
    if (context.targetStage === 'Lost') {
       this.dataService.addLeadActivity(context.deal.leadId, `Loss Reason: ${form.lossReason}`);
    }

    this.toastService.show('success', `Deal moved to ${context.targetStage}`);
    this.closeMoveModal();
  }
  
  closeMoveModal() {
    this.showMoveModal.set(false);
    this.modalContext.set(null);
    this.moveModal = this.resetMoveModal();
  }

  private resetMoveModal() {
    return {
      nextActionText: '',
      dueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
      channel: 'WhatsApp' as const,
      proposalType: 'General Services',
      objection: 'Price' as const,
      finalValue: 0,
      paymentMethod: 'Stripe' as const,
      lossReason: 'Price' as const,
      error: '',
      targetStage: null as DealStage | null,
    };
  }
}
