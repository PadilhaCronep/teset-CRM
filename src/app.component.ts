
import { Component, ChangeDetectionStrategy, signal, computed, inject, effect, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';

import { TodayComponent } from './components/today/today.component';
import { LeadsComponent } from './components/leads/leads.component';
import { PipelineComponent } from './components/pipeline/pipeline.component';
import { ProposalsComponent } from './components/proposals/proposals.component';
import { ContractsComponent } from './components/contracts/contracts.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SettingsComponent } from './components/settings/settings.component';
import { InboxComponent } from './components/inbox/inbox.component';
import { LandingComponent } from './components/landing/landing.component';
import { TeamComponent } from './components/team/team.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { ToastComponent } from './components/toast/toast.component';
import { IntegrationsComponent } from './components/integrations/integrations.component';
import { TranslationService, Language } from './services/translation.service';
import { DataService } from './services/data.service';
import { ToastService } from './services/toast.service';
import { FeaturesComponent } from './components/features/features.component';
import { PricingComponent } from './components/pricing/pricing.component';

type View = 'today' | 'inbox' | 'leads' | 'pipeline' | 'proposals' | 'contracts' | 'dashboard' | 'team' | 'settings' | 'integrations';
type Theme = 'light' | 'dark';
type PublicComponent = LandingComponent | FeaturesComponent | PricingComponent;


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    TodayComponent,
    InboxComponent,
    LeadsComponent,
    PipelineComponent,
    ProposalsComponent,
    ContractsComponent,
    DashboardComponent,
    SettingsComponent,
    TeamComponent,
    OnboardingComponent,
    ToastComponent,
    IntegrationsComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {
  translationService = inject(TranslationService);
  dataService = inject(DataService);
  toastService = inject(ToastService);
  
  isLoggedIn = signal(false);
  sidebarOpen = signal(false);
  isSidebarCollapsed = signal(false);
  activeView = signal<View>('today');
  
  theme = signal<Theme>(this.getInitialTheme());
  
  showOnboarding = signal(false);
  showWorkspaceMenu = signal(false);

  toast = toSignal(this.toastService.toast$);

  menuItemDefs = [
    { id: 'today', key: 'today', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18M12 12.75h.008v.008H12v-.008Z" /></svg>' },
    { id: 'inbox', key: 'inbox', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.012-1.244h3.86M2.25 9h3.86a2.25 2.25 0 0 0 2.012-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.218a2.25 2.25 0 0 1 2.013 1.244l.256.512a2.25 2.25 0 0 0 2.012 1.244h3.86" /></svg>' },
    { id: 'leads', key: 'leads', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m-7.5-2.928A3 3 0 0 1 7.5 12.5m3 3.75a3 3 0 0 1-3-3m.002 3.75a3 3 0 0 0 3-3m-9.75 3.028a9.094 9.094 0 0 1-3.741-.479 3 3 0 0 1 4.682-2.72m-7.5-2.928a3 3 0 0 0 3 3m-3-3a3 3 0 0 0-3-3m.002 3.75a3 3 0 0 1-3-3m9.75 3.028a9.094 9.094 0 0 0 3.741.479 3 3 0 0 0 4.682-2.72m-7.5 2.928a3 3 0 0 1 7.5-.002" /></svg>' },
    { id: 'pipeline', key: 'pipeline', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12A2.25 2.25 0 0 0 20.25 14.25V5.25A2.25 2.25 0 0 0 18 3H6A2.25 2.25 0 0 0 3.75 3Z" /></svg>' },
    { id: 'proposals', key: 'proposals', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>' },
    { id: 'contracts', key: 'contracts', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>' },
    { id: 'dashboard', key: 'dashboard', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>' },
    { id: 'team', key: 'team', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m-7.5-2.928A3 3 0 0 1 7.5 12.5m3 3.75a3 3 0 0 1-3-3m4.002 3.75a3 3 0 0 0 3-3m-9.75 3.028a9.094 9.094 0 0 1-3.741-.479 3 3 0 0 1 4.682-2.72m-7.5-2.928a3 3 0 0 0 3 3m-3-3a3 3 0 0 0-3-3m.002 3.75a3 3 0 0 1-3-3m9.75 3.028a9.094 9.094 0 0 0 3.741.479 3 3 0 0 0 4.682-2.72m-7.5 2.928a3 3 0 0 1 7.5-.002" /></svg>'},
    { id: 'integrations', key: 'integrations', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>'},
    { id: 'settings', key: 'settings', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-1.003 1.11-1.226a21.754 21.754 0 0 1 4.632 0c.55.223 1.02.684 1.11 1.226M12 20.25a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" /></svg>' },
  ] as const;
  
  menuItems = computed(() => this.menuItemDefs.map(item => ({
      ...item,
      name: this.translationService.translate(item.key as any)()
  })));
  
  t_pageTitle = computed(() => {
    const currentView = this.activeView();
    const menuItem = this.menuItems().find(item => item.id === currentView);
    return menuItem ? menuItem.name : 'Revenue OS';
  });
  t_collapse = this.translationService.translate('collapse');
  t_logout = this.translationService.translate('logout');
  t_closeSidebar = this.translationService.translate('closeSidebar');
  t_openSidebar = this.translationService.translate('openSidebar');
  t_workspace = this.translationService.translate('workspace');
  t_seed_data = this.translationService.translate('seed_data');
  t_reset_workspace = this.translationService.translate('reset_workspace');

  constructor() {
    effect(() => {
      const currentTheme = this.theme();
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', currentTheme);
    });
  }

  onActivate(component: PublicComponent) {
    if (component.loginRequest) {
      component.loginRequest.subscribe(() => {
        this.login();
      });
    }
  }

  private getInitialTheme(): Theme {
    if (typeof window !== 'undefined') {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark' || storedTheme === 'light') {
            return storedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }

  changeView(view: View): void {
    this.activeView.set(view);
    this.sidebarOpen.set(false);
  }

  onMenuItemClick(event: MouseEvent, view: View): void {
    event.preventDefault();
    this.changeView(view);
  }

  toggleTheme(): void {
    this.theme.update(current => current === 'light' ? 'dark' : 'light');
  }

  changeLanguage(lang: Language): void {
    this.translationService.changeLanguage(lang);
  }

  login(): void {
    this.isLoggedIn.set(true);
    if (!localStorage.getItem('hasOnboarded')) {
      this.showOnboarding.set(true); 
    }
  }

  logout(): void {
    this.isLoggedIn.set(false);
    this.showOnboarding.set(false);
    this.dataService.resetData(); // Clear data on logout for a clean session
  }

  onboardingComplete(): void {
    this.showOnboarding.set(false);
    localStorage.setItem('hasOnboarded', 'true');
    this.dataService.seedData(); // Seed data after onboarding
  }

  seedData() {
    this.dataService.seedData();
    this.showWorkspaceMenu.set(false);
    this.toastService.show('success', 'Demo data has been loaded!');
  }

  resetWorkspace() {
    if(confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      this.dataService.resetData();
      this.showWorkspaceMenu.set(false);
      this.toastService.show('success', 'Workspace has been reset.');
    }
  }
}
