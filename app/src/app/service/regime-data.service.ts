import { Injectable } from '@angular/core';
import { Regime, RegimeState } from '../classes/regime';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { RegimeExternalLoaderService } from './regime-external-loader.service';
import { RegimeSyncService } from './regime-sync.service';
import { environment } from 'src/environments/environment';
import PouchDB from 'pouchdb';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Injectable({
    providedIn: 'root'
})
export class RegimeDataService {
    private regimeListSubject = new BehaviorSubject<Regime[]>([]);
    public regimeList$ = this.regimeListSubject.asObservable();
    private database!: PouchDB.Database;
    private isSeeding = false;

    constructor(
        private loader: RegimeExternalLoaderService,
        private sync: RegimeSyncService
    ) {
        this.initDB()
    }

    async initDB() {
        this.database = new PouchDB('regimes')
        if (environment.csvSyncEnabled) {
            await this.refreshFromServerCSV()
        } else {
            await this.seedIfEmpty()
        }
    }

    private async refreshFromServerCSV() {
        let fromAPI: Regime[];
        try {
            fromAPI = await this.sync.loadFromAPI();
        } catch (err) {
            console.error('Refresh depuis CSV échoué, PouchDB conservé:', err);
            await this.getAllRegimes();
            return;
        }

        if (!fromAPI.length) {
            console.warn('CSV vide ou API indisponible : PouchDB conservé en l\'état');
            await this.getAllRegimes();
            return;
        }

        try {
            this.isSeeding = true;
            const all = await this.database.allDocs({ include_docs: true });
            const toDelete = all.rows
                .filter(r => r.doc && r.doc._id)
                .map(r => ({ _id: r.doc!._id, _rev: r.doc!._rev, _deleted: true as const }));
            if (toDelete.length) await this.database.bulkDocs(toDelete);
            await this.database.bulkDocs(fromAPI.map(r => ({ ...r, _id: r._id })));
            await this.getAllRegimes();
        } catch (err) {
            console.error('Erreur lors du refresh CSV:', err);
        } finally {
            this.isSeeding = false;
        }
    }

    private async seedIfEmpty() {
        const info = await this.database.info();
        if ((info.doc_count || 0) > 0) {
            await this.getAllRegimes();
            return;
        }
        try {
            this.isSeeding = true;
            const external = await this.loader.loadFromConfiguredFile();
            if (!external.length) {
                this.regimeListSubject.next([]);
                this.isSeeding = false;
                return;
            }
            await this.database.bulkDocs(
                external.map(r => ({ ...r, _id: r._id }))
            );
            this.isSeeding = false;
            await this.getAllRegimes();
        } catch (error) {
            console.error('Error seeding regimes from file:', error);
            this.isSeeding = false;
            await this.getAllRegimes();
        }
    }

    async getAllRegimes() {
        try {
            const result = await this.database.allDocs({ include_docs: true });
            const regimeList = result.rows
                .filter(row => row.doc)
                .map(row => {
                    const doc = row.doc as unknown as Regime
                    return {
                        _id: doc._id,
                        requestNumber: doc.requestNumber,
                        ot: doc.ot,
                        rf: doc.rf,
                        label: doc.label,
                        state: doc.state as RegimeState
                    } as Regime;
                });
            this.regimeListSubject.next(regimeList);

            // Synchroniser vers le CSV (fire-and-forget, non-bloquant)
            if (!this.isSeeding) {
                this.sync.syncToCSV(regimeList);
            }
        } catch (error) {
            console.error('Error fetching regimes:', error);
        }
    }

    async save(regime: Regime) {
        try {
            await this.database.put(regime);
            await this.getAllRegimes()
        } catch (error) {
            console.error('Error saving regime:', error);
        }
    }

    async update(updatedRegime: Regime): Promise<void> {
        try {
            const existingDoc = await this.database.get(updatedRegime._id);

            const regimeToSave = {
                ...existingDoc,
                requestNumber: updatedRegime.requestNumber,
                ot: updatedRegime.ot,
                rf: updatedRegime.rf,
                label: updatedRegime.label,
                state: updatedRegime.state
            };

            await this.database.put(regimeToSave);
            await this.getAllRegimes();
        } catch (error) {
            console.error('Error updating regime:', error);
        }
    }

    async deleteRegime(id: string): Promise<void> {
        try {
            const existingDoc = await this.database.get(id);
            await this.database.remove(existingDoc._id, existingDoc._rev);
            await this.getAllRegimes();
        } catch (error) {
            console.error('Error deleting regime:', error);
        }
    }

    public async reloadFromFile(): Promise<void> {
        // En production, lire le CSV vivant via l'API serveur
        // En dev, charger depuis les assets
        let external: Regime[];
        if (environment.csvSyncEnabled) {
            external = await this.sync.loadFromAPI();
        } else {
            external = await this.loader.loadFromConfiguredFile();
        }

        const all = await this.database.allDocs({ include_docs: true });
        const toDelete = all.rows
            .filter(r => r.doc && r.doc._id)
            .map(r => ({ _id: r.doc!._id, _rev: r.doc!._rev, _deleted: true as const }));
        if (toDelete.length) await this.database.bulkDocs(toDelete);
        await this.database.bulkDocs(external.map(r => ({ ...r, _id: r._id })));
        await this.getAllRegimes();
    }

    public async exportCSV(delimiter: string = ','): Promise<void> {
        const regimes = this.regimeListSubject.value ?? [];
        const headers = ['_id', 'requestNumber', 'ot', 'rf', 'label', 'state'];
        const esc = (v: any) => {
            const s = v == null ? '' : String(v);
            return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        const lines = [
            headers.join(delimiter),
            ...regimes.map(r => headers.map(h => esc((r as any)[h])).join(delimiter))
        ];
        const csv = lines.join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, 'regimes-export.csv');
    }

    public async exportXLSX(sheetName: string = 'regimes'): Promise<void> {
        const regimes = this.regimeListSubject.value ?? [];
        const ws = XLSX.utils.json_to_sheet(regimes);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });

        saveAs(blob, 'regimes-export.xlsx');
    }

}
