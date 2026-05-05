import type { ReactionType } from '../constants.js';
export interface PostDTO {
    id: string;
    author: {
        id: string;
        name: string;
        avatar: string | null;
    };
    content: string;
    images: PostImageDTO[];
    workoutLog: {
        id: string;
        date: string;
        workoutName: string | null;
    } | null;
    game: {
        id: string;
        scheduledAt: string;
        location: string | null;
    } | null;
    reactions: ReactionSummary[];
    commentCount: number;
    userReaction: ReactionType | null;
    createdAt: string;
}
export interface PostImageDTO {
    id: string;
    url: string;
    orderIndex: number;
}
export interface ReactionSummary {
    type: ReactionType;
    count: number;
}
export interface CommentDTO {
    id: string;
    author: {
        id: string;
        name: string;
        avatar: string | null;
    };
    content: string;
    createdAt: string;
}
export interface CreatePostBody {
    content: string;
    workoutLogId?: string;
    gameId?: string;
}
export interface CreateCommentBody {
    content: string;
}
export interface ReactBody {
    type: ReactionType;
}
export interface FeedCursor {
    cursor?: string;
    limit?: number;
}
//# sourceMappingURL=feed.d.ts.map