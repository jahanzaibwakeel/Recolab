import type { CatalogItem, RecommendationAlgorithm, UserProfile } from "@recolab/shared";

export interface RatingRow {
  userId: string;
  itemId: string;
  rating: number;
}

export interface InteractionRow {
  userId: string;
  itemId: string;
  eventType: string;
  weight: number;
}

export interface RecommendationCandidate {
  item: CatalogItem;
  score: number;
  algorithm: RecommendationAlgorithm;
  reasonCodes: string[];
  modelContributions: Record<string, number>;
  matchedAttributes: string[];
  coldStart: boolean;
}

export interface RecommenderContext {
  user: UserProfile;
  items: CatalogItem[];
  ratings: RatingRow[];
  interactions: InteractionRow[];
  modelVersion: string;
  itemFeatures?: Map<string, ItemFeatureRow>;
  userFeatures?: Map<string, UserFeatureRow>;
  semanticScores?: Map<string, number>;
  semanticCandidateIds?: Set<string>;
  algorithmWeights?: Record<string, number>;
  diversityLambda?: number;
  explorationRate?: number;
}

export interface ItemFeatureRow {
  itemId: string;
  ratingCount: number;
  avgRating: number;
  popularityScore: number;
  saveRate: number;
  dislikeRate: number;
}

export interface UserFeatureRow {
  userId: string;
  ratingCount: number;
  avgRating: number;
  preferredGenreScores: Record<string, number>;
  lastInteractionAt?: string;
}

export interface PipelineTrace {
  stage: string;
  inputCount: number;
  outputCount: number;
  notes: string[];
}
