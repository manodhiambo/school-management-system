export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
    meta?: {
        total: number;
        page: number;
        limit: number;
    };
}
//# sourceMappingURL=api-response.interface.d.ts.map