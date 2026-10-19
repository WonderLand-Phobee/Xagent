export interface Post {
 jobId:string; scheduledTime:string; category:'Tech'|'Design'; account:string;
 jobTitle:string; jobUrl:string; salary:string; experience:string; workArrangement:string;
 jdLanguage:string; jobStatus:string; verifiedAt:string; activeEvidence:string;
 repeatRecommendation:boolean; lastRecommendedDate:string|null; recommendationCount:number;
 xCopy:string; contentHash:string; description:string;
}
export interface Daily {
 date:string; timezone:string; targetCount:number; lastRunAt:string|null; lastSuccessfulRunAt?:string|null;
 status:string; shortfall:number; posts:Post[]; demo:boolean;
 excludedCandidates:{jobId:string|null;jobUrl:string;jobTitle:string;reason:string}[]; errors:string[];
}
