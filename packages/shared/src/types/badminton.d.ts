import type { GameStatus, ParticipantStatus } from '../constants.js';
export interface BadmintonGameDTO {
    id: string;
    creator: {
        id: string;
        name: string;
        avatar: string | null;
    };
    scheduledAt: string;
    location: string | null;
    notes: string | null;
    status: GameStatus;
    participants: GameParticipantDTO[];
    createdAt: string;
}
export interface GameParticipantDTO {
    userId: string;
    name: string;
    avatar: string | null;
    status: ParticipantStatus;
}
export interface CreateGameBody {
    scheduledAt: string;
    location?: string;
    notes?: string;
}
export interface UpdateGameBody extends Partial<CreateGameBody> {
    status?: GameStatus;
}
export interface InviteParticipantBody {
    userId: string;
}
export interface RespondToInviteBody {
    status: 'accepted' | 'declined';
}
//# sourceMappingURL=badminton.d.ts.map