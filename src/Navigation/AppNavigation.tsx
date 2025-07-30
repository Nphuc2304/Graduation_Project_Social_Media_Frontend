import React from 'react';
import {LinkingOptions, NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

import {
  AddPost,
  EditStory,
  FollowerRequests,
  NotificationsScreen,
  PostSetting,
  SeenStory,
  Setting,
  SwitchAccount,
  Register,
  EditProfile,
  PendingMessages,
  MessageScreen,
  UserInfo,
  ScreenQRCode,
  MessageBox,
  Streaming,
  CreateGroupScreen,
  BlockedAccounts,
  BookmarkScreen,
  PlaylistsScreen,
  BlockUser,
  Notifications,
  NotificationOption,
  PeopleGroupChat,
  AddPeopleToGroupChat,
  QRScanner,
  InforGroupChat,
  LikedScreen,
  MusicSavedScreen,
  AddCollectionScreen,
  Archive,
  ChangePassword,
  YourActivity,
  LinkToGroup,
  SearchMessages,
  ContactInfo,
  DissapearingMessage,
  Splash,
  UserFollowScreen,
  ForgotPassword,
  ConfirmationCode,
  TagSo,
  HighlightCreateScreen,
  HighlightEditScreen,
  HelpCenter,
  FAQScreen,
  ContactScreen,
  ReportProblemScreen,
  MessageUndefined,
  GroupGallery,
  PrivacySafetyChat,
  CameraScreen,
  NewPasswordReset,
} from '../Screens';
import BottomTabs from './BottomTabs';
import ProfileComp from '../Screens/Profile';
import NewMessage from '../Screens/NewMessage';
import PostStory from '../Screens/PostStory';
import Profile from '../(tabs)/Profile/index';
import AllPostOfUserScreen from '../../components/AllPostOfUserScreen';
import AllPostOfCollection from '../../components/AllPostOfCollection';
import ZegoCallScreen from '../Screens/ZegoCloud/ZegoCallScreen';
import {navigationRef} from '../NavigationService';
import AllReels from '../../components/AllReels';
import {User} from '@services/userRedux/userTypes';
import PostDetailScreen from '../../components/PostDetailScreen';
import AllTaggedPostOfUserScreen from '../../components/AllTaggedPostOfUserScreen';
import {CameraPreview} from '../../src/Screens/CameraPreview';

export type RootStackParamList = {
  Splash: undefined;
  BottomTabs: undefined;
  CameraScreen: {roomId: string};
  AllPostOfCollection: undefined;
  AllPostOfUserScreen: undefined;
  AllTaggedPostOfUserScreen: undefined;
  AllReels: undefined;
  TagSo: undefined;
  LikedScreen: undefined;
  MusicSavedScreen: undefined;
  BookmarkScreen: undefined;
  PlaylistsScreen: undefined;
  Archive: undefined;
  YourActivity: undefined;
  AddCollection: undefined;
  SearchMessages: undefined;
  GroupGallery: undefined;
  LinkToGroup: undefined;
  FollowerRequests: undefined;
  NotificationsScreen: undefined;
  Notifications: undefined;
  NotificationOption: undefined;
  PendingMessages: undefined;
  MessageBox: undefined;
  PostSetting: undefined;
  AddPost: undefined;
  UpStory: undefined; // tương ứng PostStory
  EditStory: undefined;
  SeenStory: {
    storyId?: string;
    creatorId?: string;
    stories?: any[];
    creator?: any;
    storyGroups?: any[];
    storyGroupIndex?: number;
    isLoading?: boolean;
    initialIndex?: number;
    timestamp?: number;
  };
  EditProfile: undefined;
  SwitchAccount: undefined;
  Setting: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ConfirmationCode: undefined;
  NewPasswordReset: undefined;
  BlockedAccounts: undefined;
  BlockUser: undefined;
  PrivacySafetyChat: undefined;
  PeopleGroupChat: undefined;
  AddPeopleToGroupChat: undefined;
  QRScanner: undefined;
  ChangePassword: undefined;
  ContactInfo: undefined;
  DissapearingMessage: undefined;
  HelpCenter: undefined;
  FAQScreen: undefined;
  ContactScreen: undefined;
  ReportProblemScreen: undefined;
  NewMessage: undefined;
  PostDetailScreen: {id: string};
  Profile: undefined;

  MessageScreen: {
    room: string;
    isWaiting?: boolean;
    highlightMessageId?: string;
    scrollToIndex?: number;
  };
  InforGroupChat: {
    roomId: string;
    img1?: string;
    img2?: string;
  };
  InfoUser: {
    roomId: string;
    img1?: string;
    nameChat: string;
    userId?: string;
  };
  ZegoCallScreen: {
    userID: string;
    userName: string;
    callID: string;
    image: string;
    isCaller: boolean;
    callType: 'video' | 'voice';
  };
  ProfileComp: {userID: string};
  UserFollowScreen: undefined;
  HighlightEditScreen: undefined;
  QRCode: undefined;
  Streaming: undefined;
  MessageUndefined: undefined;
  CreateGroupScreen: undefined;
  HighlightCreateScreen: undefined;
  CameraPreview: {uri: string; roomId: string};
};

const Stack = createStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['cirla://', 'https://cirla.io.vn'],
  config: {
    screens: {
      Splash: 'splash',
      BottomTabs: 'home',
      ProfileComp: 'profile/:userID',
      MessageScreen: 'chat/:room',
      ZegoCallScreen: 'call/:callID',
      AllPostOfUserScreen: 'posts/user',
      AllReels: 'reels/all',
      SeenStory: 'story/:storyId/:creatorId',
    },
  },
};

const AppNavigator = () => {
  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{headerShown: false}}>
        <Stack.Screen
          name="AllPostOfCollection"
          component={AllPostOfCollection}
        />
        <Stack.Screen
          name="AllPostOfUserScreen"
          component={AllPostOfUserScreen}
        />
        <Stack.Screen
          name="AllTaggedPostOfUserScreen"
          component={AllTaggedPostOfUserScreen}
        />
        <Stack.Screen name="CameraScreen" component={CameraScreen} />
        <Stack.Screen name="AllReels" component={AllReels} />
        <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} />
        <Stack.Screen name="TagSo" component={TagSo} />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="ZegoCallScreen" component={ZegoCallScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePassword} />
        <Stack.Screen name="BlockedAccounts" component={BlockedAccounts} />
        <Stack.Screen name="LikedScreen" component={LikedScreen} />
        <Stack.Screen
          name="AddPeopleToGroupChat"
          component={AddPeopleToGroupChat}
        />
        <Stack.Screen name="NewMessage" component={NewMessage} />
        <Stack.Screen name="MusicSavedScreen" component={MusicSavedScreen} />
        <Stack.Screen name="ProfileComp" component={ProfileComp} />
        <Stack.Screen name="PeopleGroupChat" component={PeopleGroupChat} />
        <Stack.Screen name="BlockUser" component={BlockUser} />
        <Stack.Screen name="PostSetting" component={PostSetting} />
        <Stack.Screen name="AddPost" component={AddPost} />
        <Stack.Screen name="SwitchAccount" component={SwitchAccount} />
        <Stack.Screen name="BottomTabs" component={BottomTabs} />
        <Stack.Screen name="Setting" component={Setting} />
        <Stack.Screen name="UpStory" component={PostStory} />
        <Stack.Screen name="EditStory" component={EditStory} />
        <Stack.Screen name="EditProfile" component={EditProfile} />
        <Stack.Screen name="PendingMessages" component={PendingMessages} />
        <Stack.Screen
          name="NotificationsScreen"
          component={NotificationsScreen}
        />
        <Stack.Screen name="FollowerRequests" component={FollowerRequests} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="SeenStory" component={SeenStory} />
        <Stack.Screen name="MessageScreen" component={MessageScreen} />
        <Stack.Screen name="InfoUser" component={UserInfo} />
        <Stack.Screen name="QRCode" component={ScreenQRCode} />
        <Stack.Screen name="MessageBox" component={MessageBox} />
        <Stack.Screen name="Streaming" component={Streaming} />
        <Stack.Screen name="CreateGroupScreen" component={CreateGroupScreen} />
        <Stack.Screen name="BookmarkScreen" component={BookmarkScreen} />
        <Stack.Screen name="PlaylistsScreen" component={PlaylistsScreen} />
        <Stack.Screen name="Notifications" component={Notifications} />
        <Stack.Screen
          name="NotificationOption"
          component={NotificationOption}
        />
        <Stack.Screen name="QRScanner" component={QRScanner} />
        <Stack.Screen name="MessageUndefined" component={MessageUndefined} />
        <Stack.Screen name="Archive" component={Archive} />
        <Stack.Screen name="InforGroupChat" component={InforGroupChat} />
        <Stack.Screen name="GroupGallery" component={GroupGallery} />
        <Stack.Screen name="AddCollection" component={AddCollectionScreen} />
        <Stack.Screen name="YourActivity" component={YourActivity} />
        <Stack.Screen name="LinkToGroup" component={LinkToGroup} />
        <Stack.Screen name="SearchMessages" component={SearchMessages} />
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="ContactInfo" component={ContactInfo} />
        <Stack.Screen
          name="DissapearingMessage"
          component={DissapearingMessage}
        />
        <Stack.Screen name="UserFollowScreen" component={UserFollowScreen} />
        <Stack.Screen
          name="HighlightCreateScreen"
          component={HighlightCreateScreen}
        />
        <Stack.Screen
          name="HighlightEditScreen"
          component={HighlightEditScreen}
        />
        <Stack.Screen name="HelpCenter" component={HelpCenter} />
        <Stack.Screen name="FAQScreen" component={FAQScreen} />
        <Stack.Screen name="ContactScreen" component={ContactScreen} />
        <Stack.Screen
          name="ReportProblemScreen"
          component={ReportProblemScreen}
        />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="ConfirmationCode" component={ConfirmationCode} />
        <Stack.Screen name="PrivacySafetyChat" component={PrivacySafetyChat} />
        <Stack.Screen name="CameraPreview" component={CameraPreview} />
        <Stack.Screen name="NewPasswordReset" component={NewPasswordReset} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
