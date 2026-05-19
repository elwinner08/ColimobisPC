import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Regime } from '../classes/regime';
import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RegimeSyncService {

    constructor(private http: HttpClient) {}

    /**
     * Envoie la liste complète des régimes au serveur pour écriture CSV.
     * Fire-and-forget : les erreurs sont loguées mais ne bloquent jamais l'appelant.
     */
    async syncToCSV(regimes: Regime[]): Promise<void> {
        if (!environment.csvSyncEnabled) return;
        try {
            await firstValueFrom(
                this.http.post('/api/regimes', regimes)
            );
        } catch (err) {
            console.error('Synchro CSV echouee (non-bloquant):', err);
        }
    }

    /**
     * Charge les régimes depuis le CSV via l'API serveur.
     * Utilisé pour relire le fichier CSV après modification manuelle.
     */
    async loadFromAPI(): Promise<Regime[]> {
        if (!environment.csvSyncEnabled) return [];
        try {
            const data = await firstValueFrom(
                this.http.get<any[]>('/api/regimes')
            );
            return (data || []).map(r => ({
                _id: r._id || '',
                requestNumber: r.requestNumber || '',
                ot: r.ot || '',
                rf: r.rf || '',
                label: r.label || '',
                state: r.state || ''
            } as Regime));
        } catch (err) {
            console.error('Chargement API echoue:', err);
            return [];
        }
    }
}
