import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, Output } from '@angular/core';
import { Regime } from 'src/app/classes/regime';
import { EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
    selector: 'module-regime-table',
    templateUrl: './regime-table.component.html',
    styleUrls: ['./regime-table.component.scss'],
    imports: [NgFor, NgIf, FormsModule, IonIcon],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegimeTableComponent {

    @Input() regimeList: Regime[] = []
    @Input() isEditable: boolean = false

    @Output() onAction = new EventEmitter<Regime>()
    @Output() onDelete = new EventEmitter<Regime>()
    @Output() onEdit = new EventEmitter<Regime>()

    trackById(_index: number, regime: Regime): string {
        return regime._id
    }

    actionEvent(regime: Regime): void {
        this.onAction.emit(regime)
    }

    deleteEvent(regime: Regime): void {
        this.onDelete.emit(regime)
    }

    editEvent(regime: Regime): void {
        this.onEdit.emit(regime)
    }
}
