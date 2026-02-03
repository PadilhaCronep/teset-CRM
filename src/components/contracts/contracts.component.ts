
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Contract, ContractStatus, Proposal } from '../../services/data.service';
import { ToastService } from '../../services/toast.service';

type RevenueState = 'Expected' | 'Committed' | 'Recognized';
type RiskLevel = 'low' | 'medium' | 'high' | 'none';

interface DisplayContract extends Contract {
  revenueState: RevenueState;
  riskLevel: RiskLevel;
  aiSignal: string | null;
  timeToSign?: number;
}

@Component({
  selector: 'app-contracts',
  imports: [CommonModule, FormsModule],
  templateUrl: './contracts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractsComponent {
  dataService = inject(DataService);
  toastService = inject(ToastService);

  activeFilter = signal<ContractStatus | 'all'>('all');
  isSlideOverOpen = signal(false);
  selectedContract = signal<DisplayContract | null>(null);
  isGenerateModalOpen = signal(false);

  // --- Generate Contract Modal State ---
  acceptedProposals = computed(() => this.dataService.proposals().filter(p => p.status === 'Accepted'));
  newContract = signal(this.resetNewContractData());

  constructor() {
    effect(() => localStorage.setItem('contracts_filter', this.activeFilter()));
    this.activeFilter.set((localStorage.getItem('contracts_filter') as ContractStatus | 'all') || 'all');
  }

  // --- DERIVED DATA & LOGIC ---
  displayContracts = computed<DisplayContract[]>(() => {
    const now = new Date();
    return this.dataService.contracts()
      .map(c => this.augmentContract(c, now))
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  private augmentContract(c: Contract, now: Date): DisplayContract {
    const sentAt = c.sentAt ? new Date(c.sentAt) : null;
    const signedAt = c.signedAt ? new Date(c.signedAt) : null;
    const viewedAt = c.viewedAt ? new Date(c.viewedAt) : null;

    let riskLevel: RiskLevel = 'low';
    let aiSignal: string | null = 'Revenue locked and safe.';

    const daysSince = (date: Date | null) => date ? (now.getTime() - date.getTime()) / (1000 * 3600 * 24) : Infinity;

    if (c.status === 'Sent' && !viewedAt && daysSince(sentAt) > 7) {
      riskLevel = 'high';
      aiSignal = `High risk: sent ${Math.round(daysSince(sentAt))} days ago, not viewed.`;
    } else if (c.status === 'Sent' && !viewedAt && daysSince(sentAt) > 3) {
      riskLevel = 'medium';
      aiSignal = 'Risk: awaiting client view.';
    } else if (c.status === 'Viewed' && !signedAt && daysSince(viewedAt) > 5) {
        riskLevel = 'medium';
        aiSignal = 'Client viewed but has not signed. Follow-up recommended.';
    } else if (c.status === 'At Risk') {
        riskLevel = 'high';
        aiSignal = 'Manually flagged as At Risk.';
    } else if (['Signed', 'Active', 'Completed'].includes(c.status)) {
        riskLevel = 'none';
    }

    if (c.status === 'Cancelled') {
        riskLevel = 'none';
        aiSignal = 'Contract cancelled.';
    }

    const revenueState: RevenueState = ['Signed', 'Active', 'Completed'].includes(c.status)
      ? (c.status === 'Active' || c.status === 'Completed' ? 'Recognized' : 'Committed')
      : 'Expected';

    const timeToSign = sentAt && signedAt ? (signedAt.getTime() - sentAt.getTime()) / (1000 * 3600 * 24) : undefined;
    if(timeToSign && timeToSign > 7) aiSignal = `Signing cycle (${timeToSign.toFixed(0)}d) longer than average (3d).`;

    return { ...c, riskLevel, revenueState, aiSignal, timeToSign };
  }

  filteredContracts = computed(() => {
    const contracts = this.displayContracts();
    const filter = this.activeFilter();
    if (filter === 'all') return contracts;
    return contracts.filter(c => c.status === filter);
  });
  
  // --- HEADER SUMMARY ---
  summary = computed(() => {
    const contracts = this.displayContracts();
    const awaitingSignature = contracts.filter(c => ['Sent', 'Viewed'].includes(c.status));
    const committed = contracts.filter(c => ['Signed', 'Active', 'Completed'].includes(c.status));
    const atRisk = contracts.filter(c => c.riskLevel === 'high' || c.riskLevel === 'medium');
    const signedContracts = contracts.filter(c => c.timeToSign !== undefined);
    const avgTimeToSign = signedContracts.length > 0
      ? signedContracts.reduce((sum, c) => sum + c.timeToSign!, 0) / signedContracts.length
      : 0;

    return {
      awaitingSignatureCount: awaitingSignature.length,
      awaitingSignatureValue: awaitingSignature.reduce((sum, c) => sum + c.value, 0),
      committedRevenue: committed.reduce((sum, c) => sum + c.value, 0),
      revenueAtRisk: atRisk.reduce((sum, c) => sum + c.value, 0),
      avgTimeToSign
    };
  });

  // --- ACTIONS ---
  openSlideOver(contract: DisplayContract) {
    this.selectedContract.set(contract);
    this.isSlideOverOpen.set(true);
  }

  handleAction(action: string, contractId: number, event: Event) {
    event.stopPropagation();
    const now = new Date().toISOString();
    switch (action) {
      case 'resend':
        this.dataService.updateContract(contractId, { sentAt: now, status: 'Sent' });
        this.toastService.show('success', 'Contract resent to client.');
        break;
      case 'mark_active':
        this.dataService.updateContract(contractId, { activatedAt: now, status: 'Active' });
        this.toastService.show('success', 'Contract marked as Active.');
        break;
      case 'cancel':
        if(confirm('Are you sure you want to cancel this contract?')) {
            this.dataService.updateContract(contractId, { cancelledAt: now, status: 'Cancelled' });
            this.toastService.show('info', 'Contract has been cancelled.');
        }
        break;
    }
  }
  
  onProposalSelect(proposalId: string) {
    const id = parseInt(proposalId, 10);
    const proposal = this.acceptedProposals().find(p => p.id === id);
    if(proposal) {
        this.newContract.update(nc => ({
            ...nc,
            proposalId: proposal.id,
            dealId: proposal.dealId,
            leadName: proposal.leadName,
            value: proposal.value,
            legalName: `${proposal.leadName} Inc.` // Placeholder
        }));
    }
  }

  handleGenerateContract() {
      const form = this.newContract();
      if(!form.proposalId || !form.contractType) {
          alert('Please select a proposal and contract type.');
          return;
      }
      const now = new Date().toISOString();
      this.dataService.addContract({
        ...form,
        createdAt: now,
        status: 'Generated',
        timeline: [{ status: 'Generated', timestamp: now, details: 'Created from Proposal #' + form.proposalId }]
      });
      this.toastService.show('success', 'New contract generated!');
      this.isGenerateModalOpen.set(false);
      this.newContract.set(this.resetNewContractData());
  }
  
  private resetNewContractData() {
    return { proposalId: 0, dealId: 0, leadName: '', value: 0, legalName: '', contractType: 'one-time' as const };
  }
  
  formatDate(dateString?: string): string {
    if (!dateString) return '–';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
