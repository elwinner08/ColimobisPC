import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Regime, RegimeState } from 'src/app/classes/regime';

@Component({
    selector: 'module-regime-status',
    templateUrl: './regime-status.component.html',
    styleUrls: ['./regime-status.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegimeStatusComponent implements OnInit {

    @Input() regime: Regime = new Regime()
    message!: string

    ngOnInit() {
        this.message = this.regime.state === RegimeState.STARTED ? 'et sera couvert par le' : 'et couvert par le'
    }

}
