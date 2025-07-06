import { Music, MusicInfo, User } from '@services/bookmarkRedux/bookmarkTypes';
import { Media } from '@services/postRedux/postTypes';
export interface TaggedPost {
  _id: string;
  user: User;
  caption: string;
  type: string;
  media: Media[];
  share: number;
  isLike: boolean;
  isFollow: boolean;
  isBookmarked: boolean;
  music: Music;
  musicInfo: MusicInfo;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}
