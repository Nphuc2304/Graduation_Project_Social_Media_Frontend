export interface Comment {
  id: string;
  postID: string;
  parentID: string | null;
  content: string;
  mediaUrl?: string | null;
  isDeleted: boolean;
  likedBy: string[];
  createdAt: string;
  reply: [Comment[], UserComment];
}

export interface UserComment {
  _id: string;
  handleName: string;
  profilePic?: string;
}

export interface CommentPost {
  comment: Comment;
  user: UserComment;
}

export interface AddCommentPayload {
  postID: string;
  parentID?: string;
  content: string;
  mediaUrl?: string | null;
}

export interface ReqComment {
  payload: AddCommentPayload;
  receiverId?: string;
  handleName?: string;
  postId: string;
  userId?: string;
}
