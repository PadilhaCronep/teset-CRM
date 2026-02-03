
import { Component, ChangeDetectionStrategy, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingComponent {
  loginRequest = output<void>();
  toastService = inject(ToastService);

  billingCycle = signal<'monthly' | 'annual'>('monthly');
  showContactModal = signal(false);
  openFaqId = signal<number | null>(null);

  toggleBillingCycle(): void {
    this.billingCycle.update(current => current === 'monthly' ? 'annual' : 'monthly');
  }

  toggleFaq(id: number): void {
    this.openFaqId.update(currentId => currentId === id ? null : id);
  }
  
  handleFakeSubmit(event: Event): void {
    event.preventDefault();
    this.showContactModal.set(false);
    this.toastService.show('success', 'Contato enviado! Entraremos em contato em breve.');
  }

  faqs = [
    { id: 1, q: 'Preciso de cartão de crédito para começar?', a: 'Não. Você pode explorar o ambiente de demonstração sem compromisso. Para conectar suas contas reais, será necessário escolher um plano.' },
    { id: 2, q: 'Posso cancelar a qualquer momento?', a: 'Sim. Você pode cancelar sua assinatura a qualquer momento, sem taxas ou burocracia. Seu acesso permanecerá ativo até o final do ciclo de faturamento.' },
    { id: 3, q: 'Vocês oferecem ajuda na configuração (onboarding)?', a: 'Sim! O plano Pro inclui onboarding guiado para sua equipe, e o plano Scale possui um gerente de contas dedicado para garantir seu sucesso.' },
    { id: 4, q: 'O Lucas (AI Copilot) está incluso em todos os planos?', a: 'As sugestões básicas do Lucas estão disponíveis no plano Pro. Análises mais profundas e coaching proativo são exclusivos do plano Scale.' },
    { id: 5, q: 'As integrações funcionam sem conhecimento técnico?', a: 'Sim. Nossas principais integrações (Meta, WhatsApp, Calendly) são conectadas com poucos cliques, sem necessidade de API ou código.' },
    { id: 6, q: 'Posso começar com dados de demonstração?', a: 'Com certeza. Todo novo workspace pode ser preenchido com dados de demonstração para que você possa explorar todas as funcionalidades sem conectar suas contas reais.' }
  ];
}
