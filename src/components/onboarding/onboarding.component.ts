
import { Component, ChangeDetectionStrategy, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingComponent {
  onboardingComplete = output<void>();
  private translationService = inject(TranslationService);

  step = signal(1);
  totalSteps = 4;

  // Form models
  companyName = 'My Awesome Company';
  salespersonName = 'Anna Silva';
  leadName = 'Example Customer Inc.';

  // Translated UI strings
  t_welcome_title = this.translationService.translate('onboarding_welcome_title');
  t_welcome_subtitle = this.translationService.translate('onboarding_welcome_subtitle');
  t_step = this.translationService.translate('onboarding_step');
  t_of = this.translationService.translate('onboarding_of');
  t_step1_title = this.translationService.translate('onboarding_step1_title');
  t_step1_subtitle = this.translationService.translate('onboarding_step1_subtitle');
  t_step2_title = this.translationService.translate('onboarding_step2_title');
  t_step2_subtitle = this.translationService.translate('onboarding_step2_subtitle');
  t_step3_title = this.translationService.translate('onboarding_step3_title');
  t_step3_subtitle = this.translationService.translate('onboarding_step3_subtitle');
  t_step4_title = this.translationService.translate('onboarding_step4_title');
  t_step4_subtitle = this.translationService.translate('onboarding_step4_subtitle');
  t_action = this.translationService.translate('onboarding_action');
  t_due = this.translationService.translate('onboarding_due');
  t_continue = this.translationService.translate('onboarding_continue');
  t_create_continue = this.translationService.translate('onboarding_create_continue');
  t_finish = this.translationService.translate('onboarding_finish');


  nextStep() {
    if (this.step() < this.totalSteps) {
      this.step.update(s => s + 1);
    }
  }
  
  finishOnboarding() {
    // Here you would typically save all the data
    this.onboardingComplete.emit();
  }
}
