import { relations } from "drizzle-orm/relations";
import { analysisRequests, analysisResults, bodyScoringTable, photoUploads, users } from "./schema";

export const analysisResultsRelations = relations(analysisResults, ({one}) => ({
	analysisRequest: one(analysisRequests, {
		fields: [analysisResults.analysisRequestId],
		references: [analysisRequests.id]
	}),
}));

export const analysisRequestsRelations = relations(analysisRequests, ({one, many}) => ({
	analysisResults: many(analysisResults),
	bodyScoringTables: many(bodyScoringTable),
	photoUploads: many(photoUploads),
	user: one(users, {
		fields: [analysisRequests.userId],
		references: [users.id]
	}),
}));

export const bodyScoringTableRelations = relations(bodyScoringTable, ({one}) => ({
	analysisRequest: one(analysisRequests, {
		fields: [bodyScoringTable.analysisRequestId],
		references: [analysisRequests.id]
	}),
}));

export const photoUploadsRelations = relations(photoUploads, ({one}) => ({
	analysisRequest: one(analysisRequests, {
		fields: [photoUploads.analysisRequestId],
		references: [analysisRequests.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	analysisRequests: many(analysisRequests),
}));