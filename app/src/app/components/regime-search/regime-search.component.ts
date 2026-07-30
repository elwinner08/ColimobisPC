import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonGrid, IonRow, IonCol, IonIcon, IonInput } from '@ionic/angular/standalone';
import { HeaderComponent } from "../modules/header/header.component";
import { RegimeActionForm } from 'src/app/classes/regime-action';

@Component({
    standalone: true,
    selector: 'app-regime-search',
    templateUrl: './regime-search.component.html',
    imports: [FormsModule, IonContent, IonGrid, IonRow, IonCol, IonIcon, IonInput, HeaderComponent],
    styleUrls: ['./regime-search.component.scss'],
})
export class RegimeSearchComponent {
    title = 'Sélection d\'attestations'
    regimeId = ''
    regimeAction: RegimeActionForm = RegimeActionForm.NONE

    constructor(
        private router: Router
    ) { }

    queryRegimes(regimeId: string): void {
        // La recherche ne se lance que si une action est sélectionnée
        if (this.regimeAction === RegimeActionForm.NONE) {
            return
        }
        this.router.navigate(['regime-list', regimeId.toUpperCase()], {
            queryParams: { action: this.regimeAction }
        })
    }

    accessList(): void {
        // Conserve l'action déjà sélectionnée (Retirer/Rendre) ; à défaut, applique « Retirer »
        if (this.regimeAction === RegimeActionForm.NONE || this.regimeAction === RegimeActionForm.PRINT_ACTION) {
            this.regimeAction = RegimeActionForm.REMOVE_ACTION
        }
        this.router.navigate(['regime-list', ''], {
            queryParams: { action: this.regimeAction }
        })
    }

}
