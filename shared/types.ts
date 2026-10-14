export interface TavilyApiResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}
export interface TavilyApiResponse {
  answer?: string;
  results: TavilyApiResult[];
}

export interface TavilyExtractResponse {
  results: {
    url: string;
    raw_content: string;
    images?: string[];
    favicon: string;
  }[];
  failed_results: FailedResults[];
  response_time: number;
  usage: {
    credits: number;
  };
  request_id: string;
}

interface FailedResults {
  url: string;
  error: string;
}

export interface Offer {
  id: number;
  title: string;
  company: string;
  match: number | null;
  url: string;
  description: string;
}