import { vecdbRequests as r } from './request';

interface CommonResponse<T> {
    code: number,
    data?: T,
    msg?: string
}

type EmptyObject = Record<string, any>;

export const apiQueryVecdb = (req: apiQueryVecdbRequest) => r<CommonResponse<apiQueryVecdbData>>({
    url: '/vecdb/similarity_search_with_score', method: 'POST',
    data: req
});


export const apiGetIntentRecogition = (req: apiGetIntentRecogitionRequest) => r<CommonResponse<apiGetIntentRecogitionData>>({
    url: '/intent/get-intent-recogition', method: 'POST',
    data: req
});

export const apiIntentRetrain = (req: apiIntentRetrainRequest) => r<CommonResponse<apiIntentRetrainData>>({
    url: '/intent/retrain-embedding-mapping', method: 'POST',    
});

export interface apiQueryVecdbRequest {
    query: string,
    k?: number
}

export interface apiQueryVecdbDataItem {
    content: string,
    score: number,
    source: string,
    meta: {
        source: string,
        start_index: number
    }
}

export type apiQueryVecdbData = apiQueryVecdbDataItem[];


export interface apiGetIntentRecogitionRequest {
    query: string
}

export interface apiGetIntentRecogitionData {
    id: number,
    name: string,
    uncertainty: number
}

export interface apiIntentRetrainRequest {
}

export type apiIntentRetrainData = string;