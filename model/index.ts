import mongoose, { Schema, Model, InferSchemaType, Types } from "mongoose";

/* ------------------------------------------------------------------ */
/* Shared constants                                                    */
/* ------------------------------------------------------------------ */

export const TOPICS = [
    "tech",
    "ai",
    "world",
    "business",
    "sports",
    "science",
    "health",
    "culture",
] as const;
export type Topic = (typeof TOPICS)[number];

export const EVENT_TYPES = ["click", "like", "skip", "read"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/* ------------------------------------------------------------------ */
/* User  (interests embedded as topic -> weight, 0..1)                 */
/* ------------------------------------------------------------------ */

const UserSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        interests: { type: Map, of: Number, default: {} },
        createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
);

/* ------------------------------------------------------------------ */
/* Article  (shared pool fetched from RSS)                             */
/* ------------------------------------------------------------------ */

const ArticleSchema = new Schema(
    {
        url: { type: String, required: true, unique: true },
        title: { type: String, required: true },
        source: { type: String, required: true },
        topic: { type: String, enum: TOPICS, required: true },
        snippet: { type: String, default: "" },
        sourceText: { type: String, default: "" },
        summary: { type: String, default: "" },
        image: { type: String, default: null },
        publishedAt: { type: Date, required: true },
        fetchedAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
);
ArticleSchema.index({ topic: 1, publishedAt: -1 });
ArticleSchema.index({ fetchedAt: 1 });

/* ------------------------------------------------------------------ */
/* Edition  (one paper per user per day; stores article ids only)      */
/* ------------------------------------------------------------------ */

const EditionSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        date: { type: String, required: true }, // "YYYY-MM-DD"
        number: { type: Number, required: true },
        algorithmVersion: { type: Number, default: 1 },
        layout: {
            lead: { type: Schema.Types.ObjectId, ref: "Article", required: true },
            secondary: [{ type: Schema.Types.ObjectId, ref: "Article" }],
            briefs: [{ type: Schema.Types.ObjectId, ref: "Article" }],
            echo: [{ type: Schema.Types.ObjectId, ref: "Article" }], // "Break the Echo"
        },
        recentArticleIds: { type: [{ type: Schema.Types.ObjectId, ref: "Article" }], default: [] },
        threeThings: { type: [String], default: [] },
        createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
);
// One edition per user per day -> regenerate = upsert on this key
EditionSchema.index({ userId: 1, date: -1 }, { unique: true });

/* ------------------------------------------------------------------ */
/* Event  (raw feedback log that drives learning)                      */
/* ------------------------------------------------------------------ */

const EventSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        articleId: { type: Schema.Types.ObjectId, ref: "Article", required: true },
        editionId: { type: Schema.Types.ObjectId, ref: "Edition" },
        topic: { type: String, enum: TOPICS, required: true }, // copied for easy learning
        type: { type: String, enum: EVENT_TYPES, required: true },
        ts: { type: Date, default: Date.now },
    },
    { versionKey: false }
);
EventSchema.index({ userId: 1, ts: -1 });

/* ------------------------------------------------------------------ */
/* LlmCache  (never pay twice for the same prompt)                     */
/* ------------------------------------------------------------------ */

const LlmCacheSchema = new Schema(
    {
        key: { type: String, required: true, unique: true },
        response: { type: Schema.Types.Mixed, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
);

/* ------------------------------------------------------------------ */
/* Types + models (the `models.X ||` guard prevents hot-reload errors) */
/* ------------------------------------------------------------------ */

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: Types.ObjectId };
export type ArticleDoc = InferSchemaType<typeof ArticleSchema> & { _id: Types.ObjectId };
export type EditionDoc = InferSchemaType<typeof EditionSchema> & { _id: Types.ObjectId };
export type EventDoc = InferSchemaType<typeof EventSchema> & { _id: Types.ObjectId };

export const User: Model<UserDoc> =
    mongoose.models.User || mongoose.model<UserDoc>("User", UserSchema);

export const Article: Model<ArticleDoc> =
    mongoose.models.Article || mongoose.model<ArticleDoc>("Article", ArticleSchema);

export const Edition: Model<EditionDoc> =
    mongoose.models.Edition || mongoose.model<EditionDoc>("Edition", EditionSchema);

export const Event: Model<EventDoc> =
    mongoose.models.Event || mongoose.model<EventDoc>("Event", EventSchema);

export const LlmCache =
    mongoose.models.LlmCache || mongoose.model("LlmCache", LlmCacheSchema);
