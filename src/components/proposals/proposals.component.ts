
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Proposal, ProposalStatus, AISignal } from '../../services/data.service';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../../services/toast.service';

type QuickFilter = 'all' | 'needs_follow_up' | 'viewed_recently' | 'expiring_soon';

@Component({
  selector: 'app-proposals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proposals.component.html',
  styleUrls: ['./proposals.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProposalsComponent {
  dataService = inject(DataService);
  translationService = inject(TranslationService);
  toastService = inject(ToastService);

  // --- STATE ---
  statusFilter = signal<ProposalStatus | 'all'>('all');
  quickFilter = signal<QuickFilter>('all');
  searchTerm = signal('');

  constructor() {
    effect(() => {
      // Persist filters
      localStorage.setItem('proposals-status-filter', this.statusFilter());
      localStorage.setItem('proposals-quick-filter', this.quickFilter());
    });
  }

  private getInitialStatusFilter(): ProposalStatus | 'all' {
    return (localStorage.getItem('proposals-status-filter') as ProposalStatus | 'all') || 'all';
  }
  private getInitialQuickFilter(): QuickFilter {
    return (localStorage.getItem('proposals-quick-filter') as QuickFilter) || 'all';
  }

  // --- DERIVED STATE & DATA ---
  headerSummary = computed(() => {
    const proposals = this.dataService.proposals();
    return {
      total: proposals.length,
      viewed: proposals.filter(p => p.status === 'Viewed' || p.status === 'Negotiation' || p.status === 'Accepted').length,
      needs_follow_up: proposals.filter(p => p.followUpStatus === 'needed').length,
      accepted: proposals.filter(p => p.status === 'Accepted').length,
    };
  });

  filteredProposals = computed(() => {
    const allProposals = this.dataService.proposals().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const status = this.statusFilter();
    const quick = this.quickFilter();
    const search = this.searchTerm().toLowerCase();
    const now = new Date();

    let proposals = allProposals;

    // 1. Status Filter
    if (status !== 'all') {
      proposals = proposals.filter(p => p.status === status);
    }

    // 2. Quick Filter
    if (quick === 'needs_follow_up') {
      proposals = proposals.filter(p => p.followUpStatus === 'needed');
    } else if (quick === 'viewed_recently') {
      proposals = proposals.filter(p => p.lastViewedAt && (now.getTime() - new Date(p.lastViewedAt).getTime()) < 3 * 24 * 3600 * 1000); // last 3 days
    } else if (quick === 'expiring_soon') {
      proposals = proposals.filter(p => p.validUntil && (new Date(p.validUntil).getTime() - now.getTime()) < 7 * 24 * 3600 * 1000 && p.status !== 'Accepted' && p.status !== 'Expired' && p.status !== 'Replaced'); // expiring in next 7 days
    }

    // 3. Search Filter
    if (search) {
      proposals = proposals.filter(p => {
        const deal = this.dataService.getDealById(p.dealId);
        return p.leadName.toLowerCase().includes(search) ||
               p.value.toString().includes(search) ||
               (deal && deal.stage.toLowerCase().includes(search));
      });
    }

    return proposals;
  });
  
  // --- UI ACTIONS ---
  
  handleAction(action: string, proposal: Proposal, event: Event) {
    event.stopPropagation();
    switch(action) {
      case 'copyLink':
        navigator.clipboard.writeText(`https://revenue-os.app/proposal/${proposal.id}`);
        this.toastService.show('success', 'Public link copied!');
        break;
      case 'duplicate':
        this.dataService.createProposalRevision(proposal.id);
        this.toastService.show('success', `New draft v${proposal.version + 1} created for ${proposal.leadName}.`);
        break;
      case 'generateContract':
        this.toastService.show('info', 'Contract generation initiated!');
        break;
      case 'resend':
        this.dataService.updateProposal(proposal.id, { sentAt: new Date().toISOString() });
        this.toastService.show('success', 'Proposal re-sent!');
        break;
    }
  }

  // --- HELPERS ---
  getDealStage(dealId: number): string {
    const deal = this.dataService.getDealById(dealId);
    return deal ? deal.stage : 'N/A';
  }

  getLastActivity(proposal: Proposal): string {
    if (proposal.timeline.length === 0) return 'No activity yet';
    const last = proposal.timeline[proposal.timeline.length - 1];
    return `${last.type} ${this.getTimeSince(last.timestamp)}`;
  }
  
  getTimeSince(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  
  getStatusInfo(status: ProposalStatus): { classes: string; text: string } {
    const text = this.translationService.translate(`proposals_filter_${status.toLowerCase()}` as any)();
    const classes = {
      'Draft': 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300',
      'Sent': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      'Viewed': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
      'Negotiation': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
      'Accepted': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      'Expired': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
      'Replaced': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    }[status];
    return { classes, text };
  }

  getSignalInfo(signal: AISignal): { classes: string, text: string, icon: string } {
    const text = this.translationService.translate(`proposals_signal_${signal}` as any)();
    const baseClasses = 'inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full';
    const info = {
      'high_intent': {
        classes: `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300`,
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 mr-1"><path fill-rule="evenodd" d="M11.742 2.742a.75.75 0 0 1 .985.067l2.5 3.5a.75.75 0 0 1-.985 1.134l-1.92-1.372v6.17a.75.75 0 0 1-1.5 0V6.07l-1.92 1.371a.75.75 0 1 1-.985-1.134l2.5-3.5a.75.75 0 0 1 .325-.234Z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M4.258 13.258a.75.75 0 0 1-.985-.067l-2.5-3.5a.75.75 0 0 1 .985-1.134l1.92 1.372V3.75a.75.75 0 0 1 1.5 0v6.17l1.92-1.371a.75.75 0 1 1 .985 1.134l-2.5 3.5a.75.75 0 0 1-.325.234Z" clip-rule="evenodd" /></svg>',
      },
      'risk_not_opened': {
        classes: `${baseClasses} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300`,
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 mr-1"><path fill-rule="evenodd" d="M8 1.75a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5A.75.75 0 0 1 8 1.75ZM8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" /></svg>',
      },
      'stalled_negotiation': {
        classes: `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300`,
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 mr-1"><path d="M8.75 3.75a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0v-4.5Z" /><path fill-rule="evenodd" d="M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM7.25 2.062a7.5 7.5 0 1 0 0 11.876V2.062Z" clip-rule="evenodd" /></svg>',
      }
    }[signal];
    return { ...info, text };
  }
  
  // --- TRANSLATED STRINGS ---
  t = {
    title: this.translationService.translate('proposals_title'),
    summary: this.translationService.translateWithParams('proposals_summary', this.headerSummary()),
    create: this.translationService.translate('proposals_create'),
    filter_all: this.translationService.translate('proposals_filter_all'),
    quick_filter_needs_follow_up: this.translationService.translate('proposals_quick_filter_needs_follow_up'),
    quick_filter_viewed_recently: this.translationService.translate('proposals_quick_filter_viewed_recently'),
    quick_filter_expiring_soon: this.translationService.translate('proposals_quick_filter_expiring_soon'),
    search_placeholder: this.translationService.translate('proposals_search_placeholder'),
    head_client: this.translationService.translate('proposals_head_client'),
    head_deal_stage: this.translationService.translate('proposals_head_deal_stage'),
    head_value: this.translationService.translate('proposals_head_value'),
    head_status: this.translationService.translate('proposals_head_status'),
    head_engagement: this.translationService.translate('proposals_head_engagement'),
    head_last_activity: this.translationService.translate('proposals_head_last_activity'),
    head_actions: this.translationService.translate('proposals_head_actions'),
    empty_title: this.translationService.translate('proposals_empty_title'),
    empty_subtitle: this.translationService.translate('proposals_empty_subtitle'),
    filter_empty_title: this.translationService.translate('proposals_filter_empty_title'),
    filter_empty_subtitle: this.translationService.translate('proposals_filter_empty_subtitle'),
    clear_filters: this.translationService.translate('proposals_clear_filters'),
    engagement_viewed: (count: number) => this.translationService.translateWithParams('proposals_engagement_viewed', {count}),
    engagement_last_viewed: (time: string) => this.translationService.translateWithParams('proposals_engagement_last_viewed', {time}),
    version: (version: number) => this.translationService.translateWithParams('proposals_version', {version}),
    latest: this.translationService.translate('proposals_latest'),
    action_open: this.translationService.translate('proposals_action_open'),
    action_copy_link: this.translationService.translate('proposals_action_copy_link'),
    action_resend: this.translationService.translate('proposals_action_resend'),
    action_follow_up: this.translationService.translate('proposals_action_follow_up'),
    action_duplicate: this.translationService.translate('proposals_action_duplicate'),
    action_generate_contract: this.translationService.translate('proposals_action_generate_contract'),
    action_mark_replaced: this.translationService.translate('proposals_action_mark_replaced'),
  };
}
