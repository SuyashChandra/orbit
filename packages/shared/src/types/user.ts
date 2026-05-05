export interface UserDTO {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  friendCode: string;
  createdAt: string;
}

export interface FriendDTO {
  id: string;
  user: Pick<UserDTO, 'id' | 'name' | 'avatar' | 'friendCode'>;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface AddFriendBody {
  friendCode: string;
}

export interface UpdateProfileBody {
  name?: string;
}
