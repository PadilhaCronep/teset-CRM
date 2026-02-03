
import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Lead, QualificationData, LeadStatus, LeadPriority } from '../../services/data.service';
import { QualificationModalComponent } from '../modals/qualification-modal/qualification-modal.component';

type FilterType = 'all' | 'needs_reply' | 'hot' | 'disqualified';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, QualificationModalComponent],
  templateUrl: './inbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxComponent {
  dataService = inject(DataService);

  selectedLead = signal<Lead | null>(null);
  activeFilter = signal<FilterType>('all');
  showQualificationModal = signal(false);

  filteredLeads = computed(() => {
    const leads = this.dataService.leads();
    const filter = this.activeFilter();

    let filtered = leads;

    switch(filter) {
      case 'needs_reply':
        filtered = leads.filter(l => l.status === 'New' && !l.contacted);
        break;
      case 'hot':
        filtered = leads.filter(l => l.priority === 'Hot');
        break;
      case 'disqualified':
        filtered = leads.filter(l => l.status === 'Disqualified');
        break;
    }

    // Default sort: highest urgency first (SLA breach > unread > newest)
    return filtered.sort((a, b) => {
        const aSlaBreached = a.sla && new Date(a.sla.firstResponseDue) < new Date();
        const bSlaBreached = b.sla && new Date(b.sla.firstResponseDue) < new Date();
        if (aSlaBreached && !bSlaBreached) return -1;
        if (!aSlaBreached && bSlaBreached) return 1;
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  selectLead(lead: Lead) {
    this.selectedLead.set(lead);
    if (lead.unread) {
      // FIX: Call updateLead with leadId and the update object.
      this.dataService.updateLead(lead.id, { unread: false });
      // Also update local signal for immediate UI feedback.
      this.selectedLead.update(current => current ? { ...current, unread: false } : null);
    }
  }

  getSLATime(dueDate: string): { text: string, urgent: boolean } {
      const now = new Date();
      const due = new Date(dueDate);
      const diffMinutes = (due.getTime() - now.getTime()) / 60000;

      if (diffMinutes < 0) {
          return { text: `Overdue by ${Math.abs(Math.round(diffMinutes))}m`, urgent: true };
      }
      if (diffMinutes < 60) {
          return { text: `Respond in ${Math.round(diffMinutes)}m`, urgent: diffMinutes < 15 };
      }
      const diffHours = diffMinutes / 60;
      return { text: `Due in ${Math.round(diffHours)}h`, urgent: false };
  }

  handleQualify(qualificationData: QualificationData) {
    const leadToUpdate = this.selectedLead();
    if (!leadToUpdate) return;

    const score = this.calculateScore(qualificationData);
    const priority = this.getPriority(score);
    
    const updates: Partial<Lead> = {
      qualification: qualificationData,
      score: score,
      priority: priority,
      status: 'Qualified',
    };

    // FIX: Call updateLead with leadId and the updates object.
    this.dataService.updateLead(leadToUpdate.id, updates);
    this.selectedLead.update(current => current ? { ...current, ...updates } : null);
    this.showQualificationModal.set(false);
  }

  private calculateScore(data: QualificationData): number {
    let score = 0;
    const budgetScores = {'No budget': 0, 'Low': 10, 'Medium': 20, 'High': 30};
    const urgencyScores = {'Just researching': 5, 'This month': 15, 'This week': 25, 'Today': 30};
    const fitScores = {'Not a fit': 0, 'Partial fit': 15, 'Perfect fit': 30};
    const intentScores = {'General inquiry': 5, 'Pricing request': 10, 'Book appointment': 10, 'Asked for proposal': 10};

    score += budgetScores[data.budget];
    score += urgencyScores[data.urgency];
    score += fitScores[data.fit];
    score += intentScores[data.intent];
    
    return score;
  }

  private getPriority(score: number): LeadPriority {
    if (score >= 75) return 'Hot';
    if (score >= 45) return 'Warm';
    return 'Cold';
  }
  
  getTimeSince(dateString: string): string {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
}
