
import { Component, ChangeDetectionStrategy, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Deal, DealStage, Lead, LeadOrigin } from '../../services/data.service';
import { TranslationService } from '../../services/translation.service';

type Scenario = 'healthy' | 'risk' | 'recovery';
type WidgetId = 'kpi_pipeline' | 'kpi_forecast' | 'kpi_gap' | 'kpi_win_rate' | 'forecast_simulator' | 'ai_recommendations' | 'funnel_analysis' | 'channel_performance' | 'discipline_metrics';

export interface Widget {
  id: WidgetId;
  name: string;
  colSpan: number;
}

interface FunnelStage {
  name: string;
  dealCount: number;
  value: number;
  inRate: number; // Conversion from previous stage
  lossRate: number; // Drop-off from this stage
  isBottleneck: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  dataService = inject(DataService);
  translationService = inject(TranslationService);
  
  // Expose Math to the template
  Math = Math;

  // --- LAYOUT & WIDGET MANAGEMENT ---
  isCustomizeMode = signal(false);
  showAddWidgetModal = signal(false);
  draggedWidget = signal<Widget | null>(null);

  private readonly allPossibleWidgets: Widget[] = [
    { id: 'kpi_pipeline', name: 'Active Pipeline', colSpan: 1 },
    { id: 'kpi_forecast', name: 'Forecasted Revenue', colSpan: 1 },
    { id: 'kpi_gap', name: 'Gap to Goal', colSpan: 1 },
    { id: 'kpi_win_rate', name: 'Win Rate', colSpan: 1 },
    { id: 'forecast_simulator', name: 'Forecast & Scenario Simulation', colSpan: 2 },
    { id: 'ai_recommendations', name: 'AI Recommendations', colSpan: 2 },
    { id: 'funnel_analysis', name: 'Funnel & Loss Analysis', colSpan: 1 },
    { id: 'channel_performance', name: 'Channel Performance', colSpan: 1 },
    { id: 'discipline_metrics', name: 'Sales Execution Discipline', colSpan: 1 },
  ];
  
  dashboardWidgets = signal<Widget[]>(this.loadWidgetLayout());
  
  availableWidgets = computed(() => {
    const activeWidgetIds = new Set(this.dashboardWidgets().map(w => w.id));
    return this.allPossibleWidgets.filter(w => !activeWidgetIds.has(w.id));
  });

  constructor() {
    effect(() => {
      this.saveWidgetLayout(this.dashboardWidgets());
    });
  }

  // --- SCENARIO MANAGEMENT ---
  activeScenario = signal<Scenario>('healthy');
  
  private allData = computed(() => {
    switch(this.activeScenario()) {
      case 'healthy': return { leads: this.dataService.healthyScenarioLeads(), deals: this.dataService.healthyScenarioDeals() };
      case 'risk': return { leads: this.dataService.riskScenarioLeads(), deals: this.dataService.riskScenarioDeals() };
      case 'recovery': return { leads: this.dataService.recoveryScenarioLeads(), deals: this.dataService.recoveryScenarioDeals() };
    }
  });
  
  private leads = computed(() => this.allData().leads);
  private deals = computed(() => this.allData().deals);

  // --- CORE METRICS ---
  monthlyGoal = this.dataService.monthlyGoal;
  stageProbabilities: Record<DealStage, number> = { 'New Lead': 0.05, 'Contacted': 0.15, 'Proposal Sent': 0.40, 'Negotiation': 0.75, 'Won': 1, 'Lost': 0 };

  pipelineValue = computed(() => this.deals().filter(d => d.stage !== 'Won' && d.stage !== 'Lost').reduce((sum, d) => sum + d.value, 0));
  forecastedRevenue = computed(() => this.deals().filter(d => d.stage !== 'Won' && d.stage !== 'Lost').reduce((sum, d) => sum + (d.value * this.stageProbabilities[d.stage]), 0));
  gapToGoal = computed(() => Math.max(0, this.monthlyGoal() - this.forecastedRevenue()));
  
  private dealsWon = computed(() => this.deals().filter(d => d.stage === 'Won'));
  private dealsLost = computed(() => this.deals().filter(d => d.stage === 'Lost'));
  closeRate = computed(() => {
    const totalClosed = this.dealsWon().length + this.dealsLost().length;
    return totalClosed > 0 ? (this.dealsWon().length / totalClosed) * 100 : 0;
  });

  // --- AI EXECUTIVE SUMMARY ---
  aiExecutiveSummary = computed(() => {
    const scenario = this.activeScenario();
    if (this.gapToGoal() <= 0 && scenario !== 'risk') {
      return { title: 'On track to exceed goal.', message: 'Momentum is strong. Focus on high-value deals in negotiation to maximize the upside.'};
    }
    if (scenario === 'risk') {
       return { title: 'This month is at risk.', message: 'Negotiation is the main bottleneck. Advancing 2 deals would close 70% of the gap.' };
    }
     if (scenario === 'recovery') {
       return { title: 'Recovery in progress.', message: 'Efforts are paying off, but the gap remains. Prioritize overdue follow-ups to regain momentum.' };
    }
    return { title: 'Healthy, but with a gap.', message: 'Pipeline is active, but requires focus on converting Proposal Sent deals to close the remaining gap.' };
  });

  // --- WHAT-IF SIMULATOR ---
  winRateAdjustment = signal(0);
  closedDealsAdjustment = signal(0);
  
  simulatedForecast = computed(() => {
    const baseForecast = this.forecastedRevenue();
    const activeDeals = this.deals().filter(d => d.stage !== 'Won' && d.stage !== 'Lost');
    if (activeDeals.length === 0) return baseForecast;

    const avgDealValue = this.pipelineValue() / activeDeals.length;
    const winRateImpact = (this.pipelineValue() * (this.winRateAdjustment() / 100));
    const closedDealsImpact = this.closedDealsAdjustment() * avgDealValue * this.stageProbabilities['Negotiation'];

    return baseForecast + winRateImpact + closedDealsImpact;
  });
  simulatedGap = computed(() => Math.max(0, this.monthlyGoal() - this.simulatedForecast()));

  // --- FUNNEL ANALYSIS ---
  funnelData = computed<FunnelStage[]>(() => {
    const stages: DealStage[] = ['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Won'];
    const dealCounts = stages.map(stageName => {
        return this.deals().filter(d => stages.slice(stages.indexOf(stageName)).includes(d.stage)).length;
    });

    let maxLossRate = 0;
    const funnel = stages.map((stageName, i) => {
        const dealCount = dealCounts[i];
        const prevCount = i > 0 ? dealCounts[i-1] : dealCounts[0];
        const inRate = prevCount > 0 && i > 0 ? (dealCount / prevCount) * 100 : 100;
        const nextCount = i < dealCounts.length - 1 ? dealCounts[i+1] : dealCount;
        const lossRate = dealCount > 0 ? ((dealCount - nextCount) / dealCount) * 100 : 0;
        if (i < stages.length - 1 && lossRate > maxLossRate) maxLossRate = lossRate;
        
        return {
            name: stageName,
            dealCount,
            value: this.deals().filter(d => d.stage === stageName).reduce((sum, d) => sum + d.value, 0),
            inRate,
            lossRate,
            isBottleneck: false
        };
    });

    return funnel.map(stage => ({...stage, isBottleneck: stage.lossRate === maxLossRate && maxLossRate > 0}));
  });

  // --- CHANNEL PERFORMANCE ---
  channelPerformance = computed(() => {
    const channels: LeadOrigin[] = ['WhatsApp', 'Instagram', 'Website', 'Referral'];
    return channels.map(channel => {
      const leadsForChannel = this.leads().filter(l => l.origin === channel);
      if (leadsForChannel.length === 0) return null;

      const leadIds = leadsForChannel.map(l => l.id);
      const dealsForChannel = this.deals().filter(d => leadIds.includes(d.leadId));
      const dealsWon = dealsForChannel.filter(d => d.stage === 'Won');
      const totalTimeToClose = dealsWon.reduce((sum, deal) => {
          const lead = leadsForChannel.find(l => l.id === deal.leadId);
          if (lead) {
            const timeDiff = new Date(deal.stageEnteredAt).getTime() - new Date(lead.createdAt).getTime();
            return sum + (timeDiff / (1000 * 3600 * 24)); // in days
          }
          return sum;
      }, 0);

      return {
        channel,
        revenue: dealsWon.reduce((sum, d) => sum + d.value, 0),
        winRate: leadsForChannel.length > 0 ? (dealsWon.length / leadsForChannel.length) * 100 : 0,
        avgDealSize: dealsWon.length > 0 ? dealsWon.reduce((sum, d) => sum + d.value, 0) / dealsWon.length : 0,
        avgTimeToClose: dealsWon.length > 0 ? totalTimeToClose / dealsWon.length : 0,
      };
    }).filter(c => c !== null).sort((a,b) => b!.revenue - a!.revenue) as any[];
  });
  
  aiChannelSummary = computed(() => {
      const perf = this.channelPerformance();
      if (perf.length === 0) return { best: 'N/A', worst: 'N/A' };
      const best = perf[0];
      const worst = [...perf].sort((a,b) => a.winRate - b.winRate)[0];
      return {
          best: `${best.channel} is the top performer, with a ${best.winRate.toFixed(0)}% win rate.`,
          worst: `${worst.channel} has the lowest win rate. Consider re-evaluating lead quality from this source.`
      };
  });

  // --- DISCIPLINE METRICS ---
  disciplineMetrics = computed(() => {
    const scenario = this.activeScenario();
    if (scenario === 'risk') return { responseTime: 55, followUpRate: 61, overdue: 8, benchmark: { responseTime: 30, followUpRate: 90 } };
    if (scenario === 'recovery') return { responseTime: 25, followUpRate: 85, overdue: 3, benchmark: { responseTime: 30, followUpRate: 90 } };
    return { responseTime: 18, followUpRate: 92, overdue: 1, benchmark: { responseTime: 30, followUpRate: 90 } };
  });

  // --- AI RECOMMENDATIONS ---
  aiRecommendations = computed(() => {
    const topDeal = [...this.deals()].filter(d => d.stage === 'Negotiation').sort((a,b) => b.value - a.value)[0];
    const overdueLead = [...this.leads()].filter(l => l.dueDate && new Date(l.dueDate) < new Date() && !l.actionCompleted).sort((a,b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0];
    return [
      topDeal ? { title: `Prioritize closing ${this.leads().find(l => l.id === topDeal.leadId)?.name}`, explanation: `This $${topDeal.value.toLocaleString()} deal has the highest impact on your forecast.` } : null,
      overdueLead ? { title: `Follow-up with ${overdueLead.name} immediately`, explanation: 'This action is overdue and putting the deal at risk.' } : null,
      { title: 'Review stalled deals in Proposal Sent', explanation: 'Advancing these deals is key to closing your revenue gap.'}
    ].filter(rec => rec !== null);
  });

  // --- WIDGET & LAYOUT METHODS ---
  private loadWidgetLayout(): Widget[] {
    const saved = localStorage.getItem('dashboard-layout');
    if (saved) {
      const savedWidgets: Widget[] = JSON.parse(saved);
      return savedWidgets.filter(sw => this.allPossibleWidgets.some(dw => dw.id === sw.id));
    }
    // Default layout
    return this.allPossibleWidgets.filter(w => w.id !== 'kpi_win_rate');
  }

  private saveWidgetLayout(widgets: Widget[]) {
    localStorage.setItem('dashboard-layout', JSON.stringify(widgets));
  }

  toggleCustomizeMode() { this.isCustomizeMode.update(val => !val); }
  removeWidget(widgetId: WidgetId) { this.dashboardWidgets.update(ws => ws.filter(w => w.id !== widgetId)); }
  addWidget(widget: Widget) { this.dashboardWidgets.update(ws => [...ws, widget]); }

  onWidgetDragStart(widget: Widget) { if (this.isCustomizeMode()) this.draggedWidget.set(widget); }
  onWidgetDrop(targetWidget: Widget) {
    const source = this.draggedWidget();
    if (!source || source.id === targetWidget.id) return;
    this.dashboardWidgets.update(widgets => {
      const sourceIdx = widgets.findIndex(w => w.id === source.id);
      const targetIdx = widgets.findIndex(w => w.id === targetWidget.id);
      const reordered = [...widgets];
      const [removed] = reordered.splice(sourceIdx, 1);
      reordered.splice(targetIdx, 0, removed);
      return reordered;
    });
  }
  onWidgetDragEnd() { this.draggedWidget.set(null); }
}
