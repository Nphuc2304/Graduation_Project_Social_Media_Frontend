export interface Media {
  _id: string;
  postID: string;
  imageUrl?: string;
  videoUrl: string;
  tags: Tags[];
}

export interface Tags {
  _id: string;
  handleName: string;
  userId: string;
  positionX: number;
  positionY: number;
}

export interface UserPost {
  _id: string;
  handleName: string;
  profilePic?: string;
}

export interface PostWithMedia {
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

export interface MediaItem {
  videoUrl?: string;
  imageUrl?: string;
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

export interface UploadPostPayload {
  post: {
    type: string;
    caption: string;
    isEnable: boolean;
  };
  media: MediaItem[];
  music?: MusicPost;
  musicInfo?: Music;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}