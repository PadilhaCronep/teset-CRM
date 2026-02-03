
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, DealStage } from '../../../services/data.service';

@Component({
  selector: 'app-next-action-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './next-action-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextActionModalComponent {
  entityName = input.required<string>();
  targetStage = input<DealStage | null>(null);
  close = output<void>();
  save = output<Task>();

  nextActionDescription: string = '';
  nextActionDueDate: string = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]; // Default to tomorrow
  nextActionChannel: 'WhatsApp' | 'Call' | 'Email' = 'WhatsApp';
  
  formError = '';

  modalTitle = computed(() => {
    const stage = this.targetStage();
    if (stage === 'Won') return `Congratulations on Winning!`;
    if (stage === 'Lost') return `Marking ${this.entityName()} as Lost`;
    if (stage) return `Moving to "${stage}"`;
    return 'Action Required';
  });

  onSave() {
    if (!this.nextActionDescription || !this.nextActionDueDate) {
      this.formError = 'All fields are required to proceed.';
      return;
    }
    this.formError = '';
    
    const newTask: Task = {
      id: Date.now(), // Temporary ID for mock data
      description: this.nextActionDescription,
      dueDate: new Date(this.nextActionDueDate).toISOString(),
      channel: this.nextActionChannel,
    };
    this.save.emit(newTask);
  }

  onClose() {
    this.close.emit();
  }
}
