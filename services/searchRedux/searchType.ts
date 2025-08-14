import { PostWithMedia } from "@services/postRedux/postTypes";

export interface ReqSearch {
  page?: number;
  limit?: number;
  refreshToken: string;
  keyword: string;
}

export interface ReqSearchUser {
  refreshToken?: string;
  mode?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface UserPost {
  _id: string;
  handleName: string;
  profilePic: string;
  username: string;
}

export interface Media {
  _id: string;
  postID: string;
  imageUrl?: string;
  videoUrl?: string;
  tags?: [];
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Music {
  song: string;
  link: string;
  author: string;
  coverImg: string;
}

export interface MusicPost {
  musicId: string;
  timeStart: number;
  timeEnd: number;
}

export interface Item {
  _id: string;
  userID: string;
  type: string;
  caption?: string;
  isFlagged?: boolean;
  nsfw?: boolean;
  isEnable: boolean;
  location?: string;
  isArchived?: boolean;
  viewCount: number;
  share?: number;
  createdAt?: string;
  updatedAt?: string;
  likeCount?: number;
  isLike?: boolean;
  isFollow: boolean;
  isBookmarked?: boolean;
  media: Media[];
  user: UserPost;
  music?: MusicPost;
  musicInfo?: Music;
  commentCount?: number;
}

export interface Post {
  items: Item[];
  pagination: Pagination;
}

export interface ResSearchPost {
  message: string;
  posts: Post;
  reels: Post;
}

export interface User {
  _id?: string;
  username?: string;
  phoneNumber?: string;
  handleName?: string;
  bio?: string;
  address?: string;
  gender?: string;
  profilePic?: string;
  userFollowing?: boolean;
}

export interface UserR {
  items: User[];
  pagination: Pagination;
}

export interface ResSearchUser {
  message: string;
  users: UserR;
}

// Slice state for Redux
export interface SearchState {
  posts?: ResSearchPost;
  users?: ResSearchUser;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}

export interface PostS {
  items: PostWithMedia[];
  pagination: Pagination;
}

// Selectors 
export const selectSearchLoading = (state: { search: SearchState }): boolean => state.search.isLoading;
export const selectSearchError = (state: { search: SearchState }): { isError: boolean; message?: string } => ({
    isError: state.search.isError,
    message: state.search.errorMessage
});