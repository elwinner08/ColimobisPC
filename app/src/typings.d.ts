// Déclarations de types pour les modules sans @types/
declare module 'file-saver' {
    export function saveAs(data: Blob, filename?: string, options?: any): void;
}

declare module 'papaparse' {
    const Papa: any;
    export default Papa;
}
