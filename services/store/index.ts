import {configureStore} from '@reduxjs/toolkit';
import {persistStore, persistReducer} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import postReducer from '../postRedux/postReducer';
import commentReducer from '../commentRedux/commentReducer';
import musicReducer from '../musicRedux/musicReducer';
import userReducer from '../userRedux/userReducer';
import storyReducer from '../StoryRedux/StoryReducer';
import relationReducer from '../relationRedux/relationReducer';
import reactionReducer from '../reactionRedux/reactionReducer';
import LikerReducer from '../likersRedux/likersReducer';
import bookmarkReducer from '../bookmarkRedux/bookmarkReducer';
import PostUserReducer from '../postUserRedux/postUserReducer';
import RoomReducer from '../roomRedux/roomReducer';
import messagesReducer from '../messageRedux/messageReducer';
import SearchReducer from '../searchRedux/searchReducer';
import taggedPostReducer from '../taggedPostRedux/taggedPostReducer';
import reelBookmarkReducer from '../reelBookmarkRedux/reelBookmarkReducer';
import searchPostReducer from '../SearchPost/searchPostReducer';
import notificationReducer from '../notificationRedux/notificationReducer';
import reportUserReducer from '../reportUserRedux/reportUserReducer'
import ChatAIReducer from '../ChatAIRedux/ChatAIReducer';

const persistUserConfig = {
  key: 'user',
  storage: AsyncStorage,
};

const persistRoomConfig = {
  key: 'room',
  storage: AsyncStorage,
};

const persistReportConfig = {
  key: 'reportUser',
  storage: AsyncStorage,
  whitelist: ['reportedUsers'],
};

const persistedUserReducer = persistReducer(persistUserConfig, userReducer);
const persistedRoomReducer = persistReducer(persistRoomConfig, RoomReducer);
const persistedReportUserReducer = persistReducer(persistReportConfig,reportUserReducer);

export const store = configureStore({
  reducer: {
    post: postReducer,
    comment: commentReducer,
    music: musicReducer,
    user: persistedUserReducer,
    stories: storyReducer,
    relation: relationReducer,
    reactions: reactionReducer,
    likers: LikerReducer,
    bookmark: bookmarkReducer,
    postUser: PostUserReducer,
    rooms: persistedRoomReducer,
    messages: messagesReducer,
    search: SearchReducer,
    taggedPosts: taggedPostReducer,
    reelBookmark: reelBookmarkReducer,
    searchPost: searchPostReducer,
    notification: notificationReducer,
    reportUser: persistedReportUserReducer,
    chatAI: ChatAIReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
