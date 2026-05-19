import { NgFor } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { IonContent, IonIcon, IonList, IonItem, IonInfiniteScroll, IonInfiniteScrollContent, IonFooter } from '@ionic/angular/standalone'
import { InfiniteScrollCustomEvent } from '@ionic/core';
import { Audit } from 'src/app/classes/audit';
import { AuditDataService } from 'src/app/service/audit-data.service';

interface AuditRow {
    id: string
    formattedDate: string
    regimeId: string
    stateBefore: string
    stateCurrent: string
}

@Component({
    selector: 'app-audit-list',
    templateUrl: './audit-list.component.html',
    styleUrls: ['./audit-list.component.scss'],
    imports: [IonContent, IonIcon, IonList, IonItem, IonInfiniteScroll, IonInfiniteScrollContent, IonFooter, RouterModule, NgFor],
    standalone: true
})
export class AuditListComponent implements OnInit {
    auditList: AuditRow[] = []
    private loadingMore = false;
    private noMoreData = false;
    private destroyRef = inject(DestroyRef)

    constructor(
        private auditDataService: AuditDataService,
        private router: Router
    ) { }

    ngOnInit() {
        this.fetchNextAudits();
        this.auditDataService.auditList$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(audits => {
                this.auditList = audits.map(a => this.toRow(a));
                if (audits.length % 50 !== 0) {
                    this.noMoreData = true;
                }
            });
    }

    private toRow(a: Audit): AuditRow {
        return {
            id: a._id,
            formattedDate: a.formattedDate(),
            regimeId: a.regimeId,
            stateBefore: a.stateBefore,
            stateCurrent: a.stateCurrent
        }
    }

    trackById(_index: number, row: AuditRow): string {
        return row.id
    }

    private async fetchNextAudits() {
        if (this.loadingMore || this.noMoreData) return;

        this.loadingMore = true;
        await this.auditDataService.getAuditsBatch(50);
        this.loadingMore = false;
    }

    async onIonInfinite(event: Event) {
        await this.fetchNextAudits();
        const target = (event as InfiniteScrollCustomEvent).target;
        target.complete();
        if (this.noMoreData) {
            target.disabled = true;
        }
    }

    async exportCSV() {
        await this.auditDataService.exportCSV(';');
    }

    back() {
        this.auditDataService.resetPagination()
        this.router.navigate(['admin'])
    }
}
