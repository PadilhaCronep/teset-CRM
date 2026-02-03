
import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../services/translation.service';

interface ChecklistItem {
    id: string;
    textKey: 'checklist_task_respond' | 'checklist_task_qualify' | 'checklist_task_move' | 'checklist_task_send';
    completed: boolean;
}

@Component({
  selector: 'app-activation-checklist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activation-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivationChecklistComponent {
  private translationService = inject(TranslationService);
  
  showChecklist = signal(true);
  
  tasks = signal<ChecklistItem[]>([
    { id: 'respond', textKey: 'checklist_task_respond', completed: true },
    { id: 'qualify', textKey: 'checklist_task_qualify', completed: false },
    { id: 'move', textKey: 'checklist_task_move', completed: false },
    { id: 'send', textKey: 'checklist_task_send', completed: false },
  ]);

  translatedTasks = computed(() => {
    return this.tasks().map(task => ({
      ...task,
      text: this.translationService.translate(task.textKey)()
    }));
  });

  completedCount = computed(() => this.tasks().filter(t => t.completed).length);
  
  progress = computed(() => {
    const total = this.tasks().length;
    if (total === 0) return 0;
    return (this.completedCount() / total) * 100;
  });

  // Translated UI strings
  t_title = this.translationService.translate('checklist_title');
  t_subtitle = this.translationService.translate('checklist_subtitle');
  t_complete_title = this.translationService.translate('checklist_complete_title');
  t_complete_subtitle = this.translationService.translate('checklist_complete_subtitle');
  t_tasks_completed = this.translationService.translate('checklist_tasks_completed');
  t_simulate = this.translationService.translate('checklist_simulate');
  t_dismiss = this.translationService.translate('checklist_dismiss');

  // This would be triggered by actual user actions in a real app
  simulateComplete(taskId: string) {
    this.tasks.update(currentTasks => 
        currentTasks.map(task => 
            task.id === taskId ? { ...task, completed: true } : task
        )
    );
  }

  dismiss() {
    this.showChecklist.set(false);
  }
}
