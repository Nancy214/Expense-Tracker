export interface CurrencyData {
    code: string;
    name: string;
}

export interface ExchangeRateRequest {
    from: string;
    to: string;
    date?: string;
}

export interface ExchangeRateResponse {
    success: boolean;
    rate: number;
    data: FxRatesApiResponse;
}

export interface FxRatesApiResponse {
    success: boolean;
    info: {
        rate: number;
        timestamp: number;
        from: string;
        to: string;
        amount: number;
    };
    result: number;
    date: string;
}

export interface CurrencyInitResponse {
    message: string;
}

export interface ApiErrorResponse {
    message: string;
}
