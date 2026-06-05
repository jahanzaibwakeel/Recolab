export type Domain = "movies" | "courses" | "jobs" | "products";
export type FeedbackAction = "like" | "dislike" | "save";
export type RecommendationAlgorithm = "popularity" | "content" | "collaborative" | "semantic" | "hybrid";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  preferredGenres: string[];
  preferredSkills: string[];
  blockedGenres: string[];
  boostedProviders: string[];
  boostedTags: string[];
  personalExploration: number;
}

export interface CatalogItem {
  id: string;
  domain: Domain;
  title: string;
  description: string;
  genres: string[];
  tags: string[];
  provider: string;
  releaseYear?: number;
}

export interface ExplanationPayload {
  generatedText: string;
  reasonCodes: string[];
  modelContributions: Record<string, number>;
  matchedAttributes: string[];
  coldStart: boolean;
  pipeline?: Array<{
    stage: string;
    inputCount: number;
    outputCount: number;
    notes: string[];
  }>;
}

export interface RecommendationResult {
  recommendationId?: string;
  item: CatalogItem;
  score: number;
  algorithm: RecommendationAlgorithm;
  modelVersion: string;
  explanation: ExplanationPayload;
}

export interface RankingMetrics {
  precisionAtK: number;
  recallAtK: number;
  mapAtK: number;
  ndcgAtK: number;
}
