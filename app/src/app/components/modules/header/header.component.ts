import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle } from '@ionic/angular/standalone';

@Component({
    selector: 'module-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    imports: [IonHeader, IonToolbar, IonTitle, NgIf],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {

    @Input({ required: true }) title = ''
    @Input() hideRightPart = false

    constructor(private router: Router) { }

    logout() {
        this.router.navigate(['login'])
    }

}
