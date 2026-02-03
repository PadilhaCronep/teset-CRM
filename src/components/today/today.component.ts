
import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Lead, Proposal, Deal, MicroLesson, Contract } from '../../services/data.service';
import { ActivationChecklistComponent } from '../activation-checklist/activation-checklist.component';
import { TranslationService } from '../../services/translation.service';

interface StalledDeal extends Deal {
  leadName: string;
}

@Component({
  selector: 'app-today',
  standalone: true,
  imports: [CommonModule, ActivationChecklistComponent],
  templateUrl: './today.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayComponent {
  private dataService = inject(DataService);
  private translationService = inject(TranslationService);
  private now = new Date();

  // Translated UI strings
  t = {
    hotLeads: this.translationService.translate('today_hotLeads'),
    convert: this.translationService.translate('today_convert'),
    nextDeal: this.translationService.translate('today_next_deal'),
    noHotLeads: this.translationService.translate('today_no_hot_leads'),
    newLeads: this.translationService.translate('today_new_leads'),
    fromOrigin: (origin: string) => this.translationService.translateWithParams('today_from_origin', { origin })(),
    actionContact: this.translationService.translate('today_action_contact'),
    contact: this.translationService.translate('today_contact'),
    inboxZero: this.translationService.translate('today_inbox_zero'),
    overdue: this.translationService.translate('today_overdue'),
    daysOverdue: (days: number) => this.translationService.translateWithParams('today_days_overdue', { days })(),
    reschedule: this.translationService.translate('today_reschedule'),
    resolve: this.translationService.translate('today_resolve'),
    noOverdue: this.translationService.translate('today_no_overdue'),
    proposalsViewed: this.translationService.translate('today_proposals_viewed'),
    viewedAgo: (time: string) => this.translationService.translateWithParams('today_viewed_ago', { time })(),
    followUp: this.translationService.translate('today_follow_up'),
    noHotProposals: this.translationService.translate('today_no_hot_proposals'),
    dealsAtRisk: this.translationService.translate('today_deals_at_risk'),
    stalledIn: (stage: string) => this.translationService.translateWithParams('today_stalled_in', { stage })(),
    lastActionAgo: (time: string) => this.translationService.translateWithParams('today_last_action_ago', { time })(),
    nudge: this.translationService.translate('today_nudge'),
    noStalledDeals: this.translationService.translate('today_no_stalled_deals'),
    reactivationOpps: this.translationService.translate('today_reactivation_opps'),
    noReactivations: this.translationService.translate('today_no_reactivations'),
    learningHub: this.translationService.translate('today_learning_hub'),
    start: this.translationService.translate('today_start'),
    min: this.translationService.translate('today_min'),
    budget: this.translationService.translate('today_budget'),
  };

  hotLeads = computed<Lead[]>(() => {
    return this.dataService.leads().filter(lead => 
      lead.priority === 'Hot' && lead.status === 'Qualified' && !lead.dealId
    );
  });

  leadsWithNoContact = computed<Lead[]>(() => {
    return this.dataService.leads().filter(lead => !lead.contacted && lead.status === 'New');
  });

  overdueFollowUps = computed<Lead[]>(() => {
    return this.dataService.leads().filter(lead => 
      lead.contacted && !lead.actionCompleted && lead.dueDate && new Date(lead.dueDate) < this.now
    );
  });
  
  overdueProposals = computed<Proposal[]>(() => {
    return this.dataService.proposals().filter(p => !p.actionCompleted && p.dueDate && new Date(p.dueDate) < this.now);
  });

  overdueContracts = computed<Contract[]>(() => {
    return this.dataService.contracts().filter(c => !c.actionCompleted && c.dueDate && new Date(c.dueDate) < this.now);
  });
  
  totalOverdue = computed(() => this.overdueFollowUps().length + this.overdueProposals().length + this.overdueContracts().length);

  proposalsNeedingFollowUp = computed<Proposal[]>(() => {
      return this.dataService.proposals().filter(p => p.status === 'Viewed');
  });

  stalledDeals = computed<StalledDeal[]>(() => {
    const leads = this.dataService.leads();
    return this.dataService.deals().filter(deal => {
      const daysSinceLastAction = (this.now.getTime() - new Date(deal.lastActionAt).getTime()) / (1000 * 3600 * 24);
      return deal.stage !== 'Won' && deal.stage !== 'Lost' && daysSinceLastAction > 7;
    }).map(deal => {
        return {
            ...deal,
            leadName: leads.find(l => l.dealId === deal.id)?.name || 'Unknown Lead'
        }
    })
  });
  
  // --- BLOCK I: Reactivation Flow ---
  reactivationOpportunities = computed<StalledDeal[]>(() => {
      const leads = this.dataService.leads();
      return this.dataService.deals().filter(deal => deal.specialStatus === 'Reactivate Later')
      .map(deal => ({
          ...deal,
          leadName: leads.find(l => l.dealId === deal.id)?.name || 'Unknown Lead'
      }));
  });

  // --- BLOCK H: Continuous Learning ---
  microLessons = this.dataService.microLessons;


  getTimeSince(dateString: string): string {
    if (!dateString) return 'recently';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'recently';
    
    const seconds = Math.floor((this.now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "just now";
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    const weeks = Math.floor(days/7);
    return `${weeks}w ago`;
  }

   getDaysOverdue(dateString: string | null): number {
    if (!dateString) return 0;
    const dueDate = new Date(dateString);
    const diffTime = this.now.getTime() - dueDate.getTime();
    if (diffTime <= 0) return 0;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  getLastViewedTime(proposal: Proposal): string {
    // FIX: The 'Proposal' interface uses 'timeline' not 'activity'.
    const viewedActivity = [...proposal.timeline].reverse().find(act => act.type === 'Viewed');
    return viewedActivity ? viewedActivity.timestamp : '';
  }
}
