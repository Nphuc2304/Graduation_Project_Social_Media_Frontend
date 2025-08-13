// export const BASE_URL = 'https://cirla.io.vn';
export const BASE_URL = 'http://192.168.100.157:4001';
export const CallAppID = 1490842003;
export const CallAppSign =
  '6ac0a0fb97decf11bc62355bb3fc7587b35d882c87b2f42b59d0d8734f61940e';
export const LiveStreamAppID = 192295587;
export const LiveStreamAppSign =
  '0baa6cfb9bb2efb6d8c859f6ef13dba0fa6eb2df520196e63b8ae8d44bd7663e';

export const API = {
  //// post
  GET_ALL_POST: 'posts/get-all-with-media',
  GET_REELS_POST: 'posts/get-all-reel-media',
  UPLOAD_POST: 'posts/with-media',
  HIDDEN_POST: 'user-hidden-post/hide',
  GET_POST: 'posts/user/all',
  GET_TAGGING_POST: 'posts/tags',
  GET_LIKED_POSTS: 'post-like/liked-posts',
  DELETE_MY_POST: 'posts/delete',
  POSR_REPORT_POST: 'report-contents/report',

  //// comment
  COMMENT: 'comments',
  GET_COMMENT_POST: 'comments/post',
  ADD_COMMENT: 'comments/add',

  // Story
  GET_STORY_BY_USERID: '/stories/following/',
  GET_USER_FOLLOW: 'stories/following',
  CREATE_HIGHLIGHT_STORY: '/stories/create/highlight',
  UPDATE_HIGHLIGHT_STORY: '/stories/update/highlight',
  DELETE_HIGHLIGHT_STORY: '/stories/delete',
  SHARE_STORY: '/stories/send',
  //// music
  GET_ALL_MUSIC: 'music/find-all',

  //// Login
  GET_lOGIN_POST: 'users/login',
  GET_ME: 'users/me',
  CHECK_REFRESH_TOKEN: 'users/check-refresh-token',
  CHECK_EMAIL: 'users/check-email',
  EDIT_USER: '/users/edit-me',
  ////Logout
  POST_LOGOUT: 'users/logout',

  //// Relation
  GET_FOLLOWERS: 'relations/followers',
  GET_FOLLOWING: 'relations/following',
  GET_BLOCKING: '/relations/blocking',
  RELATION_ACTION: 'relations/relation-action',
  GET_RECOMMENDATIONS: 'relations/recommendations',
  GET_RELATIONSHIP: 'relations',
  //// Register
  REGISTER: 'users/register',
  /// User
  GET_PUBLIC_PROFILE: '/users/public',
  GET_USER_ID_BY_HANDLE: '/users/username-by-handle',
  CHANGE_PASSWORD: '/users/password',
  VALIDATE_USER: '/users/validate',
  /// Forgot and reset password
  CHECK_EMAIL_FORGOT_PASSWORD: '/users/forgot-password/check-email',
  SEND_CODE_FORGOT_PASSWORD: '/users/forgot-password/send-code',
  VERIFY_CODE_FORGOT_PASSWORD: '/users/forgot-password/verify-code',
  ////bookmark
  POST_SAVE_BOOKMARK: 'bookmark-playlists/add-default',
  DELETE_BOOKMARK: 'bookmark-items/remove',
  POST_CREATE_PLAYLIST: 'bookmark-playlists/add',
  GET_ALL_PLAYLIST: 'bookmark-playlists/all',
  GET_ITEM_PLAYLIST: 'bookmark-items/all',
  GET_ALL_ITEMS: 'bookmark-items/all-items',
  POST_SWITCH_PLAYLIST: 'bookmark-playlists/switch',
  POST_ADD_MUSIC: 'bookmark-playlists/music/add',
  DELETE_MUSIC_BOOKMARK: 'bookmark-playlists/music/remove',
  POST_RENAME_PLAYLIST: 'bookmark-playlists/rename',
  DELETE_PLAYLIST: 'bookmark-playlists/delete',

  //// Room
  GET_MY_ROOMS: 'rooms/my',
  GET_MY_WAITING_ROOMS: 'rooms/waiting/my',
  ROOM: 'rooms',
  UPDATE_ROOM_STATUS: 'rooms',

  //// Auth
  GET_ACCESS_TOKEN: 'users/refresh-access-token',

  //// Message
  MESSAGES_URL: 'messages',
  MESSAGES_MEDIA: 'messages/media',

  ////Search
  POST_SEARCH_POST: 'posts/search',
  POST_SEARCH_USER: 'users/search',

  ////Notification
  NOTIFICATION_API: 'notification/send',
  NOTIFICATION_API_FOLLOW: 'relations/followers/send-notification',
  GET_NOTIFICATIONS: 'notification',

  ////Report user
  REPORT_USER: '/report-users/report',

  ////Chat AI
  POST_ASK_AI: 'chat/ask',
  GET_HISTORY_CHAT_AI: 'chat-box/history',
};
