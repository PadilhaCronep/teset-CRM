
import { Component, ChangeDetectionStrategy, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesComponent {
  loginRequest = output<void>();

  activeTab = signal('execution');

  scrollTo(elementId: string): void {
    const element = document.getElementById(elementId);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  selectTab(tabId: string): void {
    this.activeTab.set(tabId);
  }
}
