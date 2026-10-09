export declare function getDb(): Promise<{
    run: (query: string, ...params: any[]) => Promise<void>;
    get: (query: string, ...params: any[]) => Promise<any>;
    all: (query: string) => Promise<any[]>;
}>;
export declare function resetDatabase(): Promise<void>;
export declare function logAuditEvent(type: string, details: any): Promise<void>;
//# sourceMappingURL=index.d.ts.map