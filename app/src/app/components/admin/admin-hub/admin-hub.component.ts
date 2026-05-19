import { Component } from '@angular/core';
import { IonContent, IonGrid, IonRow, IonCol, IonIcon } from '@ionic/angular/standalone';
import { HeaderComponent } from "../../modules/header/header.component";
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-admin-hub',
    templateUrl: './admin-hub.component.html',
    styleUrls: ['./admin-hub.component.scss'],
    imports: [IonContent, IonGrid, IonRow, IonCol, HeaderComponent, RouterModule, IonIcon],
    standalone: true
})
export class AdminHubComponent {

    title = 'Menu admin'

}
