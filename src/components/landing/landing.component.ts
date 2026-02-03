
import { Component, ChangeDetectionStrategy, output, inject, computed } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [RouterModule],
  templateUrl: './landing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  loginRequest = output<void>();
  
  private translationService = inject(TranslationService);

  // Translated UI strings
  t_features = this.translationService.translate('landing_features');
  t_pricing = this.translationService.translate('landing_pricing');
  t_login = this.translationService.translate('landing_login');
  t_main_title = this.translationService.translate('landing_main_title');
  t_main_subtitle = this.translationService.translate('landing_main_subtitle');
  t_description = this.translationService.translate('landing_description');
  t_cta = this.translationService.translate('landing_cta');
  t_features_title = this.translationService.translate('landing_features_title');
  t_features_subtitle = this.translationService.translate('landing_features_subtitle');
  t_feature1_title = this.translationService.translate('landing_feature1_title');
  t_feature1_desc = this.translationService.translate('landing_feature1_desc');
  t_feature2_title = this.translationService.translate('landing_feature2_title');
  t_feature2_desc = this.translationService.translate('landing_feature2_desc');
  t_feature3_title = this.translationService.translate('landing_feature3_title');
  t_feature3_desc = this.translationService.translate('landing_feature3_desc');
  t_footer = this.translationService.translate('landing_footer');
}
