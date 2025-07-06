export interface ResLikePost {
  userId: string;
  postId: string;
}

export interface LikePostParams {
  postId: string;
  refreshToken: string;
  receiverId: string;
  handleName: string;
  userId?: string;
}
