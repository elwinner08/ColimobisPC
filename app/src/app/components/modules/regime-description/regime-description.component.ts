import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Regime } from 'src/app/classes/regime';

@Component({
    selector: 'module-regime-description',
    templateUrl: './regime-description.component.html',
    styleUrls: ['./regime-description.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegimeDescriptionComponent {

    @Input() regime: Regime = new Regime()

}
