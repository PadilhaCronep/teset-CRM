
import { Injectable, signal, effect, computed } from '@angular/core';

export interface User {
  id: number;
  name: string;
  avatar: string;
}

export interface Task {
  id: number;
  description: string;
  dueDate: string; // ISO string
  channel: 'WhatsApp' | 'Call' | 'Email';
}

export type LeadOrigin = 'WhatsApp' | 'Instagram' | 'Website' | 'Referral' | 'Other';
export type DealStage = 'New Lead' | 'Contacted' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';
export type ContractStatus = 'Draft' | 'Generated' | 'Sent' | 'Viewed' | 'Signed' | 'Active' | 'At Risk' | 'Completed' | 'Cancelled';

export type ProposalStatus = 'Draft' | 'Sent' | 'Viewed' | 'Negotiation' | 'Accepted' | 'Expired' | 'Replaced';
export type AISignal = 'high_intent' | 'risk_not_opened' | 'stalled_negotiation';
export type FollowUpStatus = 'needed' | 'completed' | 'none';
export type TimelineEventType = 'Created' | 'Sent' | 'Viewed' | 'Revision Requested' | 'Accepted' | 'Expired' | 'Replaced';

export interface TimelineEvent {
  type: TimelineEventType;
  timestamp: string;
  details?: string;
}

export interface Proposal {
  id: number;
  dealId: number;
  leadName: string;
  value: number;
  status: ProposalStatus;
  version: number;
  isLatest: boolean;
  createdAt: string;
  sentAt?: string;
  validUntil: string;
  viewCount: number;
  lastViewedAt?: string;
  timeline: TimelineEvent[];
  scopeSummary: string;
  aiSignals: AISignal[];
  followUpStatus: FollowUpStatus;
  replacedBy?: number; // ID of the next version
}

export interface Contract {
  id: number;
  proposalId: number;
  dealId: number;
  leadName: string;
  value: number;
  contractType: 'one-time' | 'recurring' | 'milestone';
  status: ContractStatus;
  createdAt: string; // When draft was first created or generated
  sentAt?: string;
  viewedAt?: string;
  signedAt?: string;
  activatedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  timeline: { status: ContractStatus, timestamp: string, details?: string }[];
  legalName: string;
}


export type LeadStatus = 'New' | 'In Progress' | 'Qualified' | 'Disqualified';
export type LeadPriority = 'Hot' | 'Warm' | 'Cold';

export interface QualificationData {
  budget: 'No budget' | 'Low' | 'Medium' | 'High';
  urgency: 'Today' | 'This week' | 'This month' | 'Just researching';
  fit: 'Perfect fit' | 'Partial fit' | 'Not a fit';
  intent: 'Pricing request' | 'Book appointment' | 'Asked for proposal' | 'General inquiry';
  notes?: string;
}

export interface ChatMessage {
    sender: 'user' | 'bot' | 'agent';
    content: string;
    timestamp: string;
}

export interface LeadActivity {
  timestamp: string;
  description: string;
}

export interface Lead {
  id: number;
  name: string;
  origin: LeadOrigin;
  ownerId: number;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  
  // Actionable part
  nextActionText: string;
  dueDate: string | null;
  actionCompleted: boolean;

  score: number;
  notes: string;
  activityLog: LeadActivity[];

  // Retained for other components
  contacted: boolean;
  firstContactAt?: string;
  dealId?: number;
  unread: boolean;
  messages: ChatMessage[];
  qualification?: QualificationData;
  priority?: LeadPriority;
  sla?: {
      firstResponseDue: string;
  };
}

export interface Deal {
    id: number;
    leadId: number;
    stage: DealStage;
    value: number;
    lastActionAt: string;
    stageEnteredAt: string;
    specialStatus?: 'Paused' | 'On Hold' | 'Reactivate Later';
    onHoldReason?: 'Client' | 'Budget' | 'Approval';
    reactivateAt?: string;
}

export interface TeamMember {
    id: number;
    name: string;
    avatar: string;
    avgResponseTime: number;
    followUpRate: number;
    dealsWon: number;
    revenue: number;
    trend: 'improving' | 'declining' | 'stable';
    needsCoaching: string[];
}

export interface MicroLesson {
    id: number;
    title: string;
    category: 'Follow-up' | 'Qualification' | 'Negotiation';
    duration: number;
}

export type IntegrationCategory = 'lead_capture' | 'conversations' | 'marketing' | 'meetings' | 'payments' | 'productivity' | 'advanced';

export interface IntegrationFlow {
  id: string;
  description: string;
  premium?: boolean;
}

export interface Integration {
  id: string;
  name: string;
  logo: string;
  bgColor?: string;
  category: IntegrationCategory;
  description: string;
  status: 'connected' | 'available' | 'coming_soon';
  flows: IntegrationFlow[];
}

export interface AIInsight {
  id: string;
  title: string;
  relatedFlowId?: string;
}

interface AppState {
    users: User[];
    leads: Lead[];
    deals: Deal[];
    proposals: Proposal[];
    contracts: Contract[];
    teamPerformance: TeamMember[];
    microLessons: MicroLesson[];
    integrations: Integration[];
    aiInsights: AIInsight[];
    activeFlowIds: string[];
    monthlyGoal: number;
}


@Injectable({
  providedIn: 'root',
})
export class DataService {
  private _state = signal<AppState>(this.loadState());

  // Public readonly signals
  users = computed(() => this._state().users);
  leads = computed(() => this._state().leads);
  deals = computed(() => this._state().deals);
  proposals = computed(() => this._state().proposals);
  contracts = computed(() => this._state().contracts);
  teamPerformance = computed(() => this._state().teamPerformance);
  microLessons = computed(() => this._state().microLessons);
  integrations = computed(() => this._state().integrations);
  aiInsights = computed(() => this._state().aiInsights);
  activeFlowIds = computed(() => this._state().activeFlowIds);
  monthlyGoal = computed(() => this._state().monthlyGoal);

  // FIX: Add scenario data and signals for the dashboard simulation.
  // This data is static and separate from the main app state.
  private readonly healthyScenarioData = this.getInitialData();
  healthyScenarioLeads = signal(this.healthyScenarioData.leads);
  healthyScenarioDeals = signal(this.healthyScenarioData.deals);

  private readonly riskScenarioData = this.getRiskScenarioData();
  riskScenarioLeads = signal(this.riskScenarioData.leads);
  riskScenarioDeals = signal(this.riskScenarioData.deals);

  private readonly recoveryScenarioData = this.getRecoveryScenarioData();
  recoveryScenarioLeads = signal(this.recoveryScenarioData.leads);
  recoveryScenarioDeals = signal(this.recoveryScenarioData.deals);

  constructor() {
    effect(() => {
        this.saveState(this._state());
    });
  }
  
  private getRiskScenarioData(): { leads: Lead[]; deals: Deal[] } {
    const today = new Date();
    const yesterday = new Date(new Date().setDate(today.getDate() - 1));
    const twoDaysAgo = new Date(new Date().setDate(today.getDate() - 2));
    const fourDaysAgo = new Date(new Date().setDate(today.getDate() - 4));
    const eightDaysAgo = new Date(new Date().setDate(today.getDate() - 8));
    const tenDaysAgo = new Date(new Date().setDate(today.getDate() - 10));
    const fifteenDaysAgo = new Date(new Date().setDate(today.getDate() - 15));
    const tomorrow = new Date(new Date().setDate(today.getDate() + 1));

    const leads: Lead[] = [
      { id: 1, name: 'Tech Solutions Ltda', origin: 'Website', ownerId: 1, status: 'In Progress', createdAt: yesterday.toISOString(), updatedAt: yesterday.toISOString(), dealId: 101, score: 60, priority: 'Warm', nextActionText: 'Send proposal doc', dueDate: yesterday.toISOString(), actionCompleted: false, notes: 'Client is hesitant about pricing.', activityLog: [], contacted: true, firstContactAt: yesterday.toISOString(), unread: false, messages: [], qualification: { budget: 'Medium', urgency: 'This month', fit: 'Partial fit', intent: 'Pricing request' }},
      { id: 2, name: 'Inova Digital Agency', origin: 'WhatsApp', ownerId: 1, status: 'New', createdAt: fourDaysAgo.toISOString(), updatedAt: fourDaysAgo.toISOString(), score: 0, nextActionText: 'Initial contact', dueDate: twoDaysAgo.toISOString(), actionCompleted: false, notes: '', activityLog: [], contacted: false, unread: true, messages: []},
      { id: 3, name: 'Global Logistics', origin: 'Referral', ownerId: 2, status: 'Qualified', createdAt: fifteenDaysAgo.toISOString(), updatedAt: tenDaysAgo.toISOString(), dealId: 103, score: 75, priority: 'Hot', nextActionText: 'Follow-up on contract', dueDate: eightDaysAgo.toISOString(), actionCompleted: false, notes: 'Stalled, waiting for legal review.', activityLog: [], contacted: true, firstContactAt: fifteenDaysAgo.toISOString(), unread: false, messages: []},
      { id: 4, name: 'Fast Burger Chain', origin: 'Instagram', ownerId: 3, status: 'New', createdAt: eightDaysAgo.toISOString(), updatedAt: eightDaysAgo.toISOString(), score: 0, nextActionText: 'Initial contact message', dueDate: fourDaysAgo.toISOString(), actionCompleted: false, notes: '', activityLog: [], contacted: false, unread: true, messages: []},
      { id: 5, name: 'Future Gadgets Inc.', origin: 'Website', ownerId: 2, status: 'Disqualified', createdAt: yesterday.toISOString(), updatedAt: today.toISOString(), score: 20, nextActionText: 'N/A', dueDate: null, actionCompleted: true, notes: 'Not a good fit.', activityLog: [], contacted: true, firstContactAt: yesterday.toISOString(), unread: false, messages: []},
      { id: 6, name: 'Downtown Cleaners', origin: 'Referral', ownerId: 1, status: 'New', createdAt: today.toISOString(), updatedAt: today.toISOString(), score: 0, nextActionText: 'Schedule discovery call', dueDate: tomorrow.toISOString(), actionCompleted: false, notes: '', activityLog: [], contacted: false, unread: true, messages: []}
    ];

    const deals: Deal[] = [
      { id: 101, leadId: 1, stage: 'Contacted', value: 15000, lastActionAt: tenDaysAgo.toISOString(), stageEnteredAt: tenDaysAgo.toISOString() },
      { id: 103, leadId: 3, stage: 'Proposal Sent', value: 25000, lastActionAt: eightDaysAgo.toISOString(), stageEnteredAt: fifteenDaysAgo.toISOString(), specialStatus: 'On Hold', onHoldReason: 'Client' },
      { id: 104, leadId: 4, stage: 'New Lead', value: 5000, lastActionAt: eightDaysAgo.toISOString(), stageEnteredAt: eightDaysAgo.toISOString() },
    ];

    return { leads, deals };
  }

  private getRecoveryScenarioData(): { leads: Lead[]; deals: Deal[] } {
    const today = new Date();
    const yesterday = new Date(new Date().setDate(today.getDate() - 1));
    const twoDaysAgo = new Date(new Date().setDate(today.getDate() - 2));
    const fourDaysAgo = new Date(new Date().setDate(today.getDate() - 4));
    const eightDaysAgo = new Date(new Date().setDate(today.getDate() - 8));
    const tomorrow = new Date(new Date().setDate(today.getDate() + 1));
    const inThreeDays = new Date(new Date().setDate(today.getDate() + 3));

    const leads: Lead[] = [
      { id: 1, name: 'Tech Solutions Ltda', origin: 'Website', ownerId: 1, status: 'Qualified', createdAt: yesterday.toISOString(), updatedAt: yesterday.toISOString(), dealId: 101, score: 85, priority: 'Hot', nextActionText: 'Send proposal doc', dueDate: tomorrow.toISOString(), actionCompleted: false, notes: 'Client is very interested.', activityLog: [], contacted: true, firstContactAt: yesterday.toISOString(), unread: false, messages: [], qualification: { budget: 'High', urgency: 'This month', fit: 'Perfect fit', intent: 'Asked for proposal' }},
      { id: 2, name: 'Inova Digital Agency', origin: 'WhatsApp', ownerId: 1, status: 'In Progress', createdAt: fourDaysAgo.toISOString(), updatedAt: fourDaysAgo.toISOString(), dealId: 102, score: 60, priority: 'Warm', nextActionText: 'Follow-up on proposal', dueDate: today.toISOString(), actionCompleted: false, notes: 'Followed up, waiting for response.', activityLog: [], contacted: true, firstContactAt: fourDaysAgo.toISOString(), unread: false, messages: []},
      { id: 3, name: 'Global Logistics', origin: 'Referral', ownerId: 2, status: 'In Progress', createdAt: eightDaysAgo.toISOString(), updatedAt: yesterday.toISOString(), dealId: 103, score: 70, priority: 'Warm', nextActionText: 'Send updated contract', dueDate: inThreeDays.toISOString(), actionCompleted: false, notes: 'Re-engaged after stall.', activityLog: [], contacted: true, firstContactAt: eightDaysAgo.toISOString(), unread: false, messages: []},
      // FIX: Changed status from 'Contacted' to 'In Progress' as 'Contacted' is not a valid LeadStatus.
      { id: 4, name: 'Fast Burger Chain', origin: 'Instagram', ownerId: 3, status: 'In Progress', createdAt: twoDaysAgo.toISOString(), updatedAt: twoDaysAgo.toISOString(), score: 40, nextActionText: 'Schedule demo', dueDate: tomorrow.toISOString(), actionCompleted: false, notes: 'Initial contact made.', activityLog: [], contacted: true, unread: false, messages: []},
      { id: 5, name: 'Future Gadgets Inc.', origin: 'Website', ownerId: 2, status: 'Qualified', createdAt: yesterday.toISOString(), updatedAt: today.toISOString(), dealId: 105, score: 90, priority: 'Hot', nextActionText: 'Final pricing call', dueDate: tomorrow.toISOString(), actionCompleted: false, notes: 'Ready to move forward.', activityLog: [], contacted: true, firstContactAt: yesterday.toISOString(), unread: false, messages: [], qualification: { budget: 'High', urgency: 'This week', fit: 'Perfect fit', intent: 'Asked for proposal' }},
      { id: 6, name: 'Downtown Cleaners', origin: 'Referral', ownerId: 1, status: 'New', createdAt: today.toISOString(), updatedAt: today.toISOString(), score: 0, nextActionText: 'Schedule discovery call', dueDate: tomorrow.toISOString(), actionCompleted: false, notes: '', activityLog: [], contacted: false, unread: true, messages: []}
    ];

    const deals: Deal[] = [
      { id: 101, leadId: 1, stage: 'Proposal Sent', value: 15000, lastActionAt: yesterday.toISOString(), stageEnteredAt: twoDaysAgo.toISOString() },
      { id: 102, leadId: 2, stage: 'Negotiation', value: 8000, lastActionAt: twoDaysAgo.toISOString(), stageEnteredAt: fourDaysAgo.toISOString() },
      { id: 103, leadId: 3, stage: 'Negotiation', value: 25000, lastActionAt: yesterday.toISOString(), stageEnteredAt: eightDaysAgo.toISOString() },
      { id: 105, leadId: 5, stage: 'Contacted', value: 32000, lastActionAt: today.toISOString(), stageEnteredAt: today.toISOString() },
    ];

    return { leads, deals };
  }
  
  private getInitialData(): AppState {
    const today = new Date();
    const yesterday = new Date(new Date().setDate(today.getDate() - 1));
    const twoDaysAgo = new Date(new Date().setDate(today.getDate() - 2));
    const fourDaysAgo = new Date(new Date().setDate(today.getDate() - 4));
    const fiveDaysAgo = new Date(new Date().setDate(today.getDate() - 5));
    const eightDaysAgo = new Date(new Date().setDate(today.getDate() - 8));
    const tenDaysAgo = new Date(new Date().setDate(today.getDate() - 10));
    const tomorrow = new Date(new Date().setDate(today.getDate() + 1));
    const inThreeDays = new Date(new Date().setDate(today.getDate() + 3));
    const nextWeek = new Date(new Date().setDate(today.getDate() + 7));
    const inTwoWeeks = new Date(new Date().setDate(today.getDate() + 14));
    
    return {
        users: [
            { id: 1, name: 'Anna Silva', avatar: 'https://i.pravatar.cc/100?u=anna' },
            { id: 2, name: 'Bruno Costa', avatar: 'https://i.pravatar.cc/100?u=bruno' },
            { id: 3, name: 'Carla Dias', avatar: 'https://i.pravatar.cc/100?u=carla' },
        ],
        leads: [
            { id: 1, name: 'Tech Solutions Ltda', origin: 'Website', ownerId: 1, status: 'Qualified', createdAt: yesterday.toISOString(), updatedAt: yesterday.toISOString(), dealId: 101, score: 85, priority: 'Hot', nextActionText: 'Send proposal doc', dueDate: tomorrow.toISOString(), actionCompleted: false, notes: 'Client is very interested in our new AI features.', activityLog: [{timestamp: yesterday.toISOString(), description: 'Lead created'}], contacted: true, firstContactAt: yesterday.toISOString(), unread: false, messages: [], qualification: { budget: 'High', urgency: 'This month', fit: 'Perfect fit', intent: 'Asked for proposal' }},
            { id: 2, name: 'Inova Digital Agency', origin: 'WhatsApp', ownerId: 1, status: 'In Progress', createdAt: fourDaysAgo.toISOString(), updatedAt: fourDaysAgo.toISOString(), dealId: 102, score: 60, priority: 'Warm', nextActionText: 'Follow-up on proposal', dueDate: today.toISOString(), actionCompleted: false, notes: '', activityLog: [{timestamp: fourDaysAgo.toISOString(), description: 'Lead created'}], contacted: true, firstContactAt: fourDaysAgo.toISOString(), unread: false, messages: []},
            { id: 3, name: 'Global Logistics', origin: 'Referral', ownerId: 2, status: 'Qualified', createdAt: eightDaysAgo.toISOString(), updatedAt: yesterday.toISOString(), dealId: 103, score: 75, priority: 'Hot', nextActionText: 'Send contract', dueDate: inThreeDays.toISOString(), actionCompleted: false, notes: 'Referred by John Doe from Acme Corp.', activityLog: [{timestamp: eightDaysAgo.toISOString(), description: 'Lead created'}], contacted: true, firstContactAt: eightDaysAgo.toISOString(), unread: false, messages: [], qualification: { budget: 'Medium', urgency: 'This week', fit: 'Perfect fit', intent: 'Book appointment' }},
            { id: 4, name: 'Fast Burger Chain', origin: 'Instagram', ownerId: 3, status: 'New', createdAt: twoDaysAgo.toISOString(), updatedAt: twoDaysAgo.toISOString(), dealId: 104, score: 0, nextActionText: 'Initial contact message', dueDate: twoDaysAgo.toISOString(), actionCompleted: false, notes: '', activityLog: [{timestamp: twoDaysAgo.toISOString(), description: 'Lead created'}], contacted: false, unread: true, messages: [{sender: 'user', content: 'Hi, what are your prices?', timestamp: twoDaysAgo.toISOString()}], sla: { firstResponseDue: new Date(new Date(twoDaysAgo).setHours(new Date(twoDaysAgo).getHours() + 1)).toISOString() }},
            { id: 5, name: 'Future Gadgets Inc.', origin: 'Website', ownerId: 2, status: 'Qualified', createdAt: yesterday.toISOString(), updatedAt: today.toISOString(), dealId: 105, score: 90, priority: 'Hot', nextActionText: 'Final pricing call', dueDate: tomorrow.toISOString(), actionCompleted: true, notes: 'Completed the call, waiting for their internal decision.', activityLog: [{timestamp: yesterday.toISOString(), description: 'Lead created'}, {timestamp: today.toISOString(), description: 'Action "Final pricing call" completed.'}], contacted: true, firstContactAt: yesterday.toISOString(), unread: false, messages: [], qualification: { budget: 'High', urgency: 'This week', fit: 'Perfect fit', intent: 'Asked for proposal' }},
            { id: 6, name: 'Downtown Cleaners', origin: 'Referral', ownerId: 1, status: 'New', createdAt: today.toISOString(), updatedAt: today.toISOString(), score: 0, nextActionText: 'Schedule discovery call', dueDate: null, actionCompleted: false, notes: '', activityLog: [{timestamp: today.toISOString(), description: 'Lead created'}], contacted: false, unread: true, messages: []}
        ],
        deals: [
            { id: 101, leadId: 1, stage: 'Proposal Sent', value: 15000, lastActionAt: yesterday.toISOString(), stageEnteredAt: twoDaysAgo.toISOString() },
            { id: 102, leadId: 2, stage: 'Negotiation', value: 8000, lastActionAt: twoDaysAgo.toISOString(), stageEnteredAt: fourDaysAgo.toISOString(), specialStatus: 'On Hold', onHoldReason: 'Budget' },
            { id: 103, leadId: 3, stage: 'Won', value: 25000, lastActionAt: yesterday.toISOString(), stageEnteredAt: yesterday.toISOString() },
            { id: 104, leadId: 4, stage: 'New Lead', value: 5000, lastActionAt: twoDaysAgo.toISOString(), stageEnteredAt: twoDaysAgo.toISOString() },
            { id: 105, leadId: 5, stage: 'Negotiation', value: 32000, lastActionAt: fourDaysAgo.toISOString(), stageEnteredAt: eightDaysAgo.toISOString(), specialStatus: 'Paused', reactivateAt: nextWeek.toISOString() },
        ],
        proposals: [
            { id: 201, dealId: 101, leadName: 'Tech Solutions Ltda', value: 15000, status: 'Viewed', version: 2, isLatest: true, createdAt: yesterday.toISOString(), sentAt: yesterday.toISOString(), validUntil: inTwoWeeks.toISOString(), viewCount: 3, lastViewedAt: new Date(today.getTime() - 2 * 3600000).toISOString(), timeline: [{type: 'Created', timestamp: twoDaysAgo.toISOString()}, {type: 'Sent', timestamp: twoDaysAgo.toISOString(), details: 'Version 1 Sent'}, {type: 'Revision Requested', timestamp: yesterday.toISOString()}, {type: 'Replaced', timestamp: yesterday.toISOString(), details: 'v2'}, {type: 'Sent', timestamp: yesterday.toISOString(), details: 'Version 2 Sent'}, {type: 'Viewed', timestamp: new Date(today.getTime() - 2 * 3600000).toISOString(), details: 'Viewed for 5m 12s'}], scopeSummary: 'Full-stack web application development.', aiSignals: ['high_intent'], followUpStatus: 'needed', replacedBy: 200},
            { id: 200, dealId: 101, leadName: 'Tech Solutions Ltda', value: 14500, status: 'Replaced', version: 1, isLatest: false, createdAt: twoDaysAgo.toISOString(), sentAt: twoDaysAgo.toISOString(), validUntil: nextWeek.toISOString(), viewCount: 1, lastViewedAt: twoDaysAgo.toISOString(), timeline: [{type: 'Created', timestamp: twoDaysAgo.toISOString()}, {type: 'Sent', timestamp: twoDaysAgo.toISOString()}, {type: 'Replaced', timestamp: yesterday.toISOString(), details: 'by v2'}], scopeSummary: 'Initial web application scope.', aiSignals: [], followUpStatus: 'completed', replacedBy: 201},
            { id: 202, dealId: 102, leadName: 'Inova Digital Agency', value: 8500, status: 'Negotiation', version: 1, isLatest: true, createdAt: tenDaysAgo.toISOString(), sentAt: eightDaysAgo.toISOString(), validUntil: nextWeek.toISOString(), viewCount: 1, lastViewedAt: eightDaysAgo.toISOString(), timeline: [{type: 'Created', timestamp: tenDaysAgo.toISOString()}, {type: 'Sent', timestamp: eightDaysAgo.toISOString()}, {type: 'Viewed', timestamp: eightDaysAgo.toISOString()}, {type: 'Revision Requested', timestamp: fiveDaysAgo.toISOString(), details: 'Client requested adjustment on payment terms.'}], scopeSummary: 'Social media management package.', aiSignals: ['stalled_negotiation'], followUpStatus: 'needed'},
            { id: 203, dealId: 105, leadName: 'Future Gadgets Inc.', value: 32000, status: 'Sent', version: 1, isLatest: true, createdAt: fourDaysAgo.toISOString(), sentAt: fourDaysAgo.toISOString(), validUntil: tomorrow.toISOString(), viewCount: 0, timeline: [{type: 'Created', timestamp: fourDaysAgo.toISOString()}, {type: 'Sent', timestamp: fourDaysAgo.toISOString()}], scopeSummary: 'Hardware prototype development.', aiSignals: ['risk_not_opened'], followUpStatus: 'needed'},
            { id: 204, dealId: 103, leadName: 'Global Logistics', value: 25000, status: 'Accepted', version: 1, isLatest: true, createdAt: eightDaysAgo.toISOString(), sentAt: eightDaysAgo.toISOString(), validUntil: yesterday.toISOString(), viewCount: 1, lastViewedAt: eightDaysAgo.toISOString(), timeline: [{type: 'Created', timestamp: eightDaysAgo.toISOString()}, {type: 'Sent', timestamp: eightDaysAgo.toISOString()}, {type: 'Viewed', timestamp: eightDaysAgo.toISOString()}, {type: 'Accepted', timestamp: yesterday.toISOString()}], scopeSummary: 'Logistics software integration.', aiSignals: [], followUpStatus: 'completed'},
            { id: 205, dealId: 104, leadName: 'Fast Burger Chain', value: 5000, status: 'Draft', version: 1, isLatest: true, createdAt: today.toISOString(), validUntil: inTwoWeeks.toISOString(), viewCount: 0, timeline: [{type: 'Created', timestamp: today.toISOString()}], scopeSummary: 'Initial social media campaign.', aiSignals: [], followUpStatus: 'none'},
        ],
        contracts: [
            { id: 301, proposalId: 204, dealId: 103, leadName: 'Global Logistics', value: 25000, contractType: 'one-time', status: 'Signed', createdAt: twoDaysAgo.toISOString(), sentAt: twoDaysAgo.toISOString(), viewedAt: twoDaysAgo.toISOString(), signedAt: yesterday.toISOString(), timeline: [{status: 'Generated', timestamp: twoDaysAgo.toISOString()}, {status: 'Sent', timestamp: twoDaysAgo.toISOString()}, {status: 'Viewed', timestamp: twoDaysAgo.toISOString()}, {status: 'Signed', timestamp: yesterday.toISOString()}], legalName: 'Global Logistics S.A.'},
            { id: 302, proposalId: 201, dealId: 101, leadName: 'Tech Solutions Ltda', value: 15000, contractType: 'milestone', status: 'Sent', createdAt: today.toISOString(), sentAt: today.toISOString(), timeline: [{status: 'Generated', timestamp: today.toISOString()}, {status: 'Sent', timestamp: today.toISOString()}], legalName: 'Tech Solutions Ltda ME'},
            { id: 303, proposalId: 203, dealId: 105, leadName: 'Future Gadgets Inc.', value: 32000, contractType: 'one-time', status: 'Sent', createdAt: fourDaysAgo.toISOString(), sentAt: fourDaysAgo.toISOString(), timeline: [{status: 'Generated', timestamp: fourDaysAgo.toISOString()}, {status: 'Sent', timestamp: fourDaysAgo.toISOString(), details: 'Sent via DocuSign'}], legalName: 'Future Gadgets Inc.'},
             { id: 304, proposalId: 0, dealId: 110, leadName: 'Boutique Flor de Lis', value: 9500, contractType: 'recurring', status: 'Active', createdAt: tenDaysAgo.toISOString(), sentAt: tenDaysAgo.toISOString(), viewedAt: tenDaysAgo.toISOString(), signedAt: eightDaysAgo.toISOString(), activatedAt: eightDaysAgo.toISOString(), timeline: [{status: 'Generated', timestamp: tenDaysAgo.toISOString()},{status: 'Sent', timestamp: tenDaysAgo.toISOString()},{status: 'Signed', timestamp: eightDaysAgo.toISOString()},{status: 'Active', timestamp: eightDaysAgo.toISOString()}], legalName: 'Boutique Flor de Lis ME'},
        ],
        teamPerformance: [
            { id: 1, name: 'Anna Silva', avatar: 'https://i.pravatar.cc/100?u=anna', avgResponseTime: 25, followUpRate: 95, dealsWon: 8, revenue: 125000, trend: 'improving', needsCoaching: [] },
            { id: 2, name: 'Bruno Costa', avatar: 'https://i.pravatar.cc/100?u=bruno', avgResponseTime: 45, followUpRate: 78, dealsWon: 5, revenue: 82000, trend: 'declining', needsCoaching: ['Follow-up discipline', 'Proposal closing'] },
            { id: 3, name: 'Carla Dias', avatar: 'https://i.pravatar.cc/100?u=carla', avgResponseTime: 15, followUpRate: 99, dealsWon: 12, revenue: 180000, trend: 'stable', needsCoaching: ['Negotiation skills'] },
        ],
        microLessons: [
            { id: 1, title: 'How to follow up after a proposal is viewed', category: 'Follow-up', duration: 3 },
            { id: 2, title: 'Asking for the budget without being awkward', category: 'Qualification', duration: 4 },
            { id: 3, title: 'Creating urgency during negotiation', category: 'Negotiation', duration: 5 },
        ],
        integrations: [
            { id: 'meta', name: 'Meta Lead Ads', logo: 'https://i.imgur.com/83r23o5.png', bgColor: 'bg-[#1877F2]', category: 'lead_capture', description: 'Instantly create new leads in Revenue OS from your Facebook & Instagram lead ads.', status: 'available', flows: [
                { id: 'meta-1', description: 'When a new lead is submitted, create a new lead in the Inbox.' },
                { id: 'meta-2', description: 'If lead source is "High-Intent Form", mark lead as Hot.', premium: true },
                { id: 'meta-3', description: 'If lead is submitted after hours, create a follow-up task for the next business day.' },
            ]},
            { id: 'typeform', name: 'Typeform', logo: 'https://i.imgur.com/eJ4J3aW.png', category: 'lead_capture', description: 'Turn beautiful forms, surveys, and quizzes into high-quality leads.', status: 'available', flows: [
                { id: 'typeform-1', description: 'When a new form is submitted, create a new lead in the Inbox.' },
            ]},
            { id: 'whatsapp', name: 'WhatsApp Business', logo: 'https://i.imgur.com/qLwR39t.png', bgColor: 'bg-[#25D366]', category: 'conversations', description: 'Turn WhatsApp messages into deals and manage conversations without leaving the app.', status: 'connected', flows: [
                { id: 'wa-1', description: 'When a new message is received from an unknown number, create a new lead.' },
                { id: 'wa-2', description: 'If a lead doesn\'t reply in 24 hours, create a mandatory follow-up task.' },
                { id: 'wa-3', description: 'When a lead mentions "proposal", flag the deal as ready for a proposal.', premium: true },
            ]},
            { id: 'instagram', name: 'Instagram DM', logo: 'https://i.imgur.com/Vb6iSwn.png', category: 'conversations', description: 'Capture leads directly from your Instagram Direct Messages and never miss an opportunity.', status: 'available', flows: [
                { id: 'ig-1', description: 'When a new message is received, create a new lead in the Inbox.' },
                { id: 'ig-2', description: 'If a message is not replied to in 30 minutes, mark the lead as "High Priority".', premium: true },
            ]},
            { id: 'hubspot', name: 'HubSpot', logo: 'https://i.imgur.com/JGx5a7c.png', bgColor: 'bg-[#FF7A59]', category: 'marketing', description: 'Sync leads and deals with HubSpot to keep your marketing and sales teams aligned.', status: 'available', flows: [
                { id: 'hs-1', description: 'When a lead is disqualified in Revenue OS, add them to a nurture sequence in HubSpot.' },
            ]},
            { id: 'calendly', name: 'Calendly', logo: 'https://i.imgur.com/Q23CNYw.png', bgColor: 'bg-[#006BFF]', category: 'meetings', description: 'Automate deal creation and pipeline progression from your scheduled meetings.', status: 'connected', flows: [
                { id: 'cal-1', description: 'When a new meeting is booked, create a new deal in the "Contacted" stage.' },
                { id: 'cal-2', description: 'If a meeting is a no-show, create a "Recovery" follow-up task.' },
                { id: 'cal-3', description: 'When a meeting is completed, automatically move the deal to the "Proposal Sent" stage.', premium: true },
            ]},
            { id: 'stripe', name: 'Stripe', logo: 'https://i.imgur.com/E8w4662.png', bgColor: 'bg-[#635BFF]', category: 'payments', description: 'Automatically mark deals as "Won" when payments are successfully processed.', status: 'available', flows: [
                { id: 'stripe-1', description: 'When a payment is confirmed for a linked invoice, move the deal to "Won".' },
                { id: 'stripe-2', description: 'If a payment link is created, update the deal value.' },
            ]},
            { id: 'slack', name: 'Slack', logo: 'https://i.imgur.com/yS2u5j8.png', bgColor: 'bg-[#4A154B]', category: 'productivity', description: 'Get real-time notifications about important deal events directly in your Slack channels.', status: 'available', flows: [
                { id: 'slack-1', description: 'When a deal is marked as "Won", post a celebration message to the #sales channel.' },
                { id: 'slack-2', description: 'If a deal is flagged as "At Risk", send a notification to the deal owner.', premium: true },
            ]},
            { id: 'zapier', name: 'Zapier', logo: 'https://i.imgur.com/7dJ0x4W.png', bgColor: 'bg-[#FF4A00]', category: 'advanced', description: 'Connect Revenue OS to thousands of other apps with custom, no-code workflows.', status: 'coming_soon', flows: []},
        ],
        aiInsights: [
            { id: 'ai-1', title: '<b>Instagram leads</b> turn cold after 30 mins. Activate a high-priority follow-up flow.', relatedFlowId: 'ig-2' },
            { id: 'ai-2', title: 'Deals with a booked meeting convert <b>2.1x more</b>. Connect your calendar.', relatedFlowId: 'cal-1' },
            { id: 'ai-3', title: '<b>Automate invoicing</b> for your won deals to save time.', relatedFlowId: 'stripe-1' }
        ],
        activeFlowIds: ['wa-1', 'cal-1'],
        monthlyGoal: 250000,
    };
  }

  private saveState(state: AppState) {
    localStorage.setItem('revenue-os-data', JSON.stringify(state));
  }

  private loadState(): AppState {
    const data = localStorage.getItem('revenue-os-data');
    return data ? JSON.parse(data) : this.getInitialData();
  }

  seedData() {
    this._state.set(this.getInitialData());
  }

  resetData() {
    localStorage.removeItem('revenue-os-data');
    this._state.set(this.getInitialData());
  }

  getLeadById = (id: number): Lead | undefined => this.leads().find(l => l.id === id);
  getDealById = (id: number): Deal | undefined => this.deals().find(d => d.id === id);
  getUserById = (id: number): User | undefined => this.users().find(u => u.id === id);
  
  addLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'activityLog'>) {
    this._state.update(state => {
        const newLead: Lead = {
            ...lead,
            id: Date.now(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            activityLog: [{ timestamp: new Date().toISOString(), description: 'Lead created.' }]
        };
        return { ...state, leads: [newLead, ...state.leads] };
    });
  }

  updateLead(leadId: number, updates: Partial<Lead>) {
    this._state.update(state => ({
        ...state,
        leads: state.leads.map(lead => 
            lead.id === leadId 
            ? { ...lead, ...updates, updatedAt: new Date().toISOString() } 
            : lead
        )
    }));
  }
  
  addLeadActivity(leadId: number, description: string) {
    this._state.update(state => ({
        ...state,
        leads: state.leads.map(lead => {
            if (lead.id === leadId) {
                const newActivity = { timestamp: new Date().toISOString(), description };
                const newLog = [newActivity, ...lead.activityLog].slice(0, 20); // Keep log from growing indefinitely
                return { ...lead, activityLog: newLog };
            }
            return lead;
        })
    }));
  }

  updateDeal(dealId: number, updates: Partial<Deal>) {
     this._state.update(state => ({
        ...state,
        deals: state.deals.map(deal => 
            deal.id === dealId 
            ? { ...deal, ...updates, lastActionAt: new Date().toISOString() } 
            : deal
        )
    }));
  }

  updateDealStage(dealId: number, newStage: DealStage) {
    this._state.update(state => ({
        ...state,
        deals: state.deals.map(deal => deal.id === dealId ? { ...deal, stage: newStage, lastActionAt: new Date().toISOString(), stageEnteredAt: new Date().toISOString() } : deal)
    }));
  }

  updateProposal(proposalId: number, updates: Partial<Proposal>) {
    this._state.update(state => ({
      ...state,
      proposals: state.proposals.map(p => {
        if (p.id === proposalId) {
          const updatedProposal = { ...p, ...updates };
          const newTimelineEvent = (updates.status && updates.status !== p.status) 
            ? { type: updates.status, timestamp: new Date().toISOString() } as TimelineEvent
            : null;
          
          if (newTimelineEvent) {
            updatedProposal.timeline = [...updatedProposal.timeline, newTimelineEvent];
          }
          
          return this.recalculateAISignals(updatedProposal);
        }
        return p;
      })
    }));
  }

  simulateProposalView(proposalId: number) {
    this._state.update(state => ({
      ...state,
      proposals: state.proposals.map(p => {
        if (p.id === proposalId) {
          const newViewCount = p.viewCount + 1;
          const now = new Date().toISOString();
          const newTimeline: TimelineEvent[] = [...p.timeline, { type: 'Viewed', timestamp: now, details: `View #${newViewCount}` }];
          
          let newStatus: ProposalStatus = p.status === 'Sent' ? 'Viewed' : p.status;
          let newFollowUpStatus: FollowUpStatus = 'needed';
          
          const updatedProposal: Proposal = { 
            ...p, 
            status: newStatus,
            viewCount: newViewCount, 
            lastViewedAt: now,
            timeline: newTimeline,
            followUpStatus: newFollowUpStatus
          };

          return this.recalculateAISignals(updatedProposal);
        }
        return p;
      })
    }));
  }
  
  createProposalRevision(originalProposalId: number) {
      this._state.update(state => {
          const original = state.proposals.find(p => p.id === originalProposalId);
          if (!original) return state;

          const newId = Date.now();
          const now = new Date().toISOString();
          
          const newRevision: Proposal = {
              ...original,
              id: newId,
              version: original.version + 1,
              isLatest: true,
              status: 'Draft',
              createdAt: now,
              sentAt: undefined,
              viewCount: 0,
              lastViewedAt: undefined,
              aiSignals: [],
              followUpStatus: 'none',
              timeline: [{ type: 'Created', timestamp: now, details: `From v${original.version}` }],
              replacedBy: undefined,
          };

          const updatedProposals = state.proposals.map(p => {
              if (p.dealId === original.dealId && p.isLatest) {
                  return { ...p, isLatest: false, status: 'Replaced', replacedBy: newId, timeline: [...p.timeline, { type: 'Replaced', timestamp: now, details: `by v${newRevision.version}`}]} as Proposal;
              }
              return p;
          });
          
          // Ensure the original proposal is also marked as replaced if it was the latest
          const finalProposals = updatedProposals.map(p => {
             if (p.id === originalProposalId) {
                return { ...p, isLatest: false, status: 'Replaced', replacedBy: newId, timeline: [...p.timeline, { type: 'Replaced', timestamp: now, details: `by v${newRevision.version}`}]};
             }
             return p;
          });

          return { ...state, proposals: [...finalProposals, newRevision] };
      });
  }
  
  private recalculateAISignals(proposal: Proposal): Proposal {
      const signals: AISignal[] = [];
      const now = new Date();
      
      // High intent: multiple views recently
      if (proposal.viewCount > 1 && proposal.lastViewedAt) {
          const lastViewed = new Date(proposal.lastViewedAt);
          const hoursSinceView = (now.getTime() - lastViewed.getTime()) / (1000 * 3600);
          if (hoursSinceView < 48) {
              signals.push('high_intent');
          }
      }

      // Risk: not opened
      if (proposal.status === 'Sent' && proposal.sentAt) {
          const sentAt = new Date(proposal.sentAt);
          const daysSinceSent = (now.getTime() - sentAt.getTime()) / (1000 * 3600 * 24);
          if (daysSinceSent > 3 && proposal.viewCount === 0) {
              signals.push('risk_not_opened');
          }
      }
      
      // Stalled negotiation
      if (proposal.status === 'Negotiation' && proposal.timeline.length > 0) {
          const lastActivity = new Date(proposal.timeline[proposal.timeline.length - 1].timestamp);
          const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 3600 * 24);
           if (daysSinceActivity > 5) {
              signals.push('stalled_negotiation');
          }
      }

      return { ...proposal, aiSignals: signals };
  }

  addContract(contract: Omit<Contract, 'id'>) {
    this._state.update(state => ({
      ...state,
      contracts: [{ ...contract, id: Date.now() }, ...state.contracts]
    }));
  }

  updateContract(contractId: number, updates: Partial<Contract>) {
    this._state.update(state => ({
      ...state,
      contracts: state.contracts.map(c => {
        if (c.id === contractId) {
          const updatedContract = { ...c, ...updates };
          if (updates.status && updates.status !== c.status) {
            updatedContract.timeline = [...c.timeline, { status: updates.status, timestamp: new Date().toISOString() }];
          }
          return updatedContract;
        }
        return c;
      })
    }));
  }

  toggleFlow(flowId: string) {
    this._state.update(state => {
        const currentFlows = state.activeFlowIds;
        const newFlows = currentFlows.includes(flowId)
            ? currentFlows.filter(id => id !== flowId)
            : [...currentFlows, flowId];
        return { ...state, activeFlowIds: newFlows };
    });
  }
}
