import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular/standalone'
import { HeaderComponent } from "../../modules/header/header.component";
import { RouterModule } from '@angular/router';


@Component({
    selector: 'app-regime-withdraw-print',
    templateUrl: './regime-withdraw-print.component.html',
    styleUrls: ['./regime-withdraw-print.component.scss'],
    imports: [IonContent, IonIcon, RouterModule, HeaderComponent],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegimeWithdrawPrintComponent {
    title = 'Démarrer un chantier'

}
