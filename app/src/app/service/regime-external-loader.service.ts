import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Regime } from 'src/app/classes/regime';

@Injectable({ providedIn: 'root' })
export class RegimeExternalLoaderService {
  constructor(private http: HttpClient) {}

  /**
   * Charge les régimes depuis le fichier configuré dans environment.
   * Supporte CSV (recommandé) et XLSX (fallback).
   */
  async loadFromConfiguredFile(): Promise<Regime[]> {
    const path = environment.regimesSourcePath;
    const ext = path.toLowerCase().split('.').pop();

    switch (ext) {
      case 'csv':
        return this.loadCSV(path, environment.regimesDelimiter || ';');
      case 'xlsx':
      case 'xls':
        return this.loadXLSX(path, environment.regimesSheetName);
      default:
        throw new Error(`Extension ".${ext}" non supportée. Utilise .csv ou .xlsx`);
    }
  }

  private normalize(r: any): Regime {
    const S = (v: any) => (v == null ? '' : String(v).trim());
    return {
      _id: S(r._id),
      requestNumber: S(r.requestNumber),
      ot: S(r.ot),
      rf: S(r.rf),
      label: S(r.label),
      state: S(r.state) as any
    };
  }

  private async loadCSV(url: string, delimiter: string): Promise<Regime[]> {
    const text = await firstValueFrom(this.http.get(url, { responseType: 'text' }));
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter });
    if (parsed.errors?.length) {
      console.warn('Avertissements CSV:', parsed.errors);
    }
    return (parsed.data as any[])
      .map(row => this.normalize(row))
      .filter(r => r._id !== '');  // ignore les lignes vides
  }

  private async loadXLSX(url: string, sheetName?: string): Promise<Regime[]> {
    const buf = await firstValueFrom(this.http.get(url, { responseType: 'arraybuffer' }));
    const wb = XLSX.read(buf);
    // Prend la feuille demandée ou la première feuille disponible
    const ws = (sheetName && wb.Sheets[sheetName]) ? wb.Sheets[sheetName] : wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    return (rows as any[])
      .map(row => this.normalize(row))
      .filter(r => r._id !== '');
  }
}
