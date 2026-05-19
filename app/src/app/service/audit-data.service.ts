import { Injectable } from '@angular/core';
import { formatDate } from '@angular/common';
import { Audit } from '../classes/audit';
import { BehaviorSubject } from 'rxjs';
import PouchDB from 'pouchdb';
import { saveAs } from 'file-saver';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuditDataService {
    private auditListSubject = new BehaviorSubject<Audit[]>([])
    public auditList$ = this.auditListSubject.asObservable()
    private database!: PouchDB.Database;
    private currentBatch = 0; // Track the current batch

    constructor() {
        this.initDB()
    }

    initDB() {
        this.database = new PouchDB('audits')
    }

    async getAuditsBatch(batchSize: number = 50) {
        try {
            const result = await this.database.allDocs({
                include_docs: true,
                skip: this.currentBatch * batchSize,
                limit: batchSize
            });

            const auditBatch = result.rows
                .filter(row => row.doc)
                .map(row => {
                    const doc = row.doc as unknown as Audit;
                    return Audit.fromJson(doc); // Ensure each item is an instance of the Audit class
                })
                .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date in descending order

            const currentAudits = this.auditListSubject.getValue();
            this.auditListSubject.next([...currentAudits, ...auditBatch]); // Append new audits to the existing list
            this.currentBatch++; // Increment the batch count

        } catch (error) {
            console.error('Error fetching audits batch:', error);
        }
    }

    public resetPagination() {
        this.currentBatch = 0; // Reset the batch counter
        this.auditListSubject.next([]); // Clear the current audit list
    }

    async save(audit: Audit) {
        try {
            await this.database.put(audit)
        } catch (error) {
            console.error('Error saving audit:', error);
        }
    }

    async cleanOldAudits() {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        try {
            const result = await this.database.allDocs({ include_docs: true });

            // Filter audits that are more than one year old
            const oldAudits = result.rows
                .filter(row => {
                    const doc = row.doc as unknown as Audit;
                    const auditDate = new Date(doc.date);
                    return auditDate < oneYearAgo;
                });

            // Delete each old audit document
            const deletePromises = oldAudits.map(row => {
                if (row.doc) {
                    return this.database.remove(row.doc._id, row.doc._rev);
                }

                return false
            });

            await Promise.all(deletePromises);

        } catch (error) {
            console.error('Error cleaning old audits:', error);
        }
    }

    public async exportCSV(delimiter: string = ';'): Promise<void> {
        try {
            // Charger TOUS les audits depuis PouchDB (pas seulement le batch courant)
            const result = await this.database.allDocs({ include_docs: true });
            const allAudits = result.rows
                .filter(row => row.doc)
                .map(row => Audit.fromJson(row.doc as unknown as Audit))
                .sort((a, b) => b.date.getTime() - a.date.getTime());

            const headers = ['Date', 'Regime', 'Etat avant', 'Etat apres'];
            const esc = (v: any) => {
                const s = v == null ? '' : String(v);
                return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
            };

            const lines = [
                headers.join(delimiter),
                ...allAudits.map(a => [
                    esc(formatDate(a.date, environment.dateFormat + ' HH:mm:ss', 'fr-FR')),
                    esc(a.regimeId),
                    esc(a.stateBefore),
                    esc(a.stateCurrent)
                ].join(delimiter))
            ];

            const bom = '\uFEFF';
            const csv = bom + lines.join('\r\n') + '\r\n';
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

            const now = formatDate(new Date(), 'yyyyMMdd_HHmmss', 'fr-FR');
            saveAs(blob, `audit-log-${now}.csv`);
        } catch (error) {
            console.error('Error exporting audit CSV:', error);
        }
    }

}
