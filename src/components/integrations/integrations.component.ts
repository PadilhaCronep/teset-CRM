
import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { DataService, Integration, IntegrationFlow } from '../../services/data.service';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './integrations.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntegrationsComponent {
  dataService = inject(DataService);
  translationService = inject(TranslationService);
  toastService = inject(ToastService);

  isSlideOverOpen = signal(false);
  selectedIntegration = signal<Integration | null>(null);

  integrations = this.dataService.integrations;
  aiInsights = this.dataService.aiInsights;
  
  // Translated UI strings
  t = {
    hub_title: this.translationService.translate('integrations_hub_title'),
    hub_subtitle: this.translationService.translate('integrations_hub_subtitle'),
    ai_title: this.translationService.translate('integrations_ai_title'),
    slideover_manage: this.translationService.translate('integrations_slideover_manage_connection'),
    slideover_connect_to: (name: string) => this.translationService.translateWithParams('integrations_slideover_connect_to', { name })(),
    slideover_title: this.translationService.translate('integrations_slideover_title'),
    slideover_subtitle: this.translationService.translate('integrations_slideover_subtitle'),
    action_manage: this.translationService.translate('integrations_action_manage'),
    action_view: this.translationService.translate('integrations_action_view'),
    action_request: this.translationService.translate('integrations_action_request'),
    status_connected: this.translationService.translate('integrations_status_connected'),
    status_available: this.translationService.translate('integrations_status_available'),
    status_coming_soon: this.translationService.translate('integrations_status_coming_soon'),
  }

  categories = computed(() => {
    const categoryOrder: Array<Integration['category']> = [
      'lead_capture', 'conversations', 'marketing', 'meetings', 'payments', 'productivity', 'advanced'
    ];

    const grouped: { [key: string]: Integration[] } = {};
    for (const integration of this.integrations()) {
      const category = integration.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(integration);
    }
    
    return categoryOrder
      .filter(catKey => grouped[catKey]) // only show categories that have items
      .map(catKey => ({ 
        key: catKey,
        name: this.translationService.translate(`integrations_category_${catKey}` as any)(),
        items: grouped[catKey] 
      }));
  });

  isFlowActive(flowId: string) {
    return this.dataService.activeFlowIds().includes(flowId);
  }

  toggleFlow(flowId: string) {
    this.dataService.toggleFlow(flowId);
    const flowIsActive = this.isFlowActive(flowId);
    this.toastService.show('success', `Flow ${flowIsActive ? 'activated' : 'deactivated'} successfully.`);
  }

  openSlideOver(integration: Integration) {
    if (integration.status === 'coming_soon') {
        this.toastService.show('info', `${integration.name} integration is coming soon!`);
        return;
    }
    this.selectedIntegration.set(integration);
    this.isSlideOverOpen.set(true);
  }

  closeSlideOver() {
    this.isSlideOverOpen.set(false);
    this.selectedIntegration.set(null);
  }

  getIntegrationStatus(status: Integration['status']): string {
    switch(status) {
        case 'connected': return this.t.status_connected();
        case 'available': return this.t.status_available();
        case 'coming_soon': return this.t.status_coming_soon();
    }
  }

  getIntegrationAction(status: Integration['status']): string {
     switch(status) {
        case 'connected': return this.t.action_manage();
        case 'available': return this.t.action_view();
        case 'coming_soon': return this.t.action_request();
    }
  }
}
