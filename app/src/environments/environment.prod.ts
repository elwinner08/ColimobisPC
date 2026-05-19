export const environment = {
    production: true,
    dateFormat: 'dd/MM/yyyy',
    regimesSourcePath: 'assets/data/regimes.csv',
    regimesSheetName: 'Feuil1',      // fallback si XLSX utilisé
    regimesDelimiter: ';',
    csvSyncEnabled: true,   // synchro CSV via le serveur Express
};
