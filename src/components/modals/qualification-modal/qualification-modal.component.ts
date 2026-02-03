
import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QualificationData } from '../../../services/data.service';

@Component({
  selector: 'app-qualification-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qualification-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualificationModalComponent {
  leadName = input.required<string>();
  close = output<void>();
  save = output<QualificationData>();

  budgetOptions: QualificationData['budget'][] = ['No budget', 'Low', 'Medium', 'High'];
  urgencyOptions: QualificationData['urgency'][] = ['Today', 'This week', 'This month', 'Just researching'];
  fitOptions: QualificationData['fit'][] = ['Perfect fit', 'Partial fit', 'Not a fit'];
  intentOptions: QualificationData['intent'][] = ['Pricing request', 'Book appointment', 'Asked for proposal', 'General inquiry'];

  qualification: QualificationData = {
    budget: 'Medium',
    urgency: 'This month',
    fit: 'Partial fit',
    intent: 'General inquiry',
    notes: ''
  };

  formError = signal('');

  onSave() {
    if (!this.qualification.budget || !this.qualification.urgency || !this.qualification.fit || !this.qualification.intent) {
      this.formError.set('Please complete all required fields.');
      return;
    }
    this.formError.set('');
    this.save.emit(this.qualification);
  }

  onClose() {
    this.close.emit();
  }
}
