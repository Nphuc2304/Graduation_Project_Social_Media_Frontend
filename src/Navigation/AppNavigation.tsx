import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

import {
  AddPost,
  EditStory,
  FollowerRequests,
  Login,
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
  CameraScreen,
  CreateGroupScreen,
  BlockedAccounts,
  BookmarkScreen,
  PlaylistsScreen,
  BlockUser,
  Privacy,
  Notifications,
  NotificationOption,
  PeopleGroupChat,
  AddPeopleToGroupChat,
  QRScanner,
  InforGroupChat,
  HorizontalScreen,
  ShowActivity,
  SaveMusic,
  LikedScreen,
  MusicSavedScreen,
  AddCollectionScreen,
  Archive,
  ChangePassword,
  ChangeBirthday,
  YourActivity,
  LinkToGroup,
  SearchMessages,
  ContactInfo,
  DissapearingMessage,
  PrivacyAndSafety,
  Splash,
  UserFollowScreen,
  SeenStoryOwner,
  TagSo,
  HighlightCreateScreen,
  HelpCenter,
  FAQScreen,
  ContactScreen,
  ReportProblemScreen,
  SupportRequestsScreen,
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
import AccountCenter from '../../src/Screens/AccountCenter';
import InfoAccountCenter from '../../src/Screens/AccountCenter/InfoAccountCenter';
import {User} from '@services/userRedux/userTypes';
import PostDetailScreen from '../../components/PostDetailScreen';
import AllTaggedPostOfUserScreen from '../../components/AllTaggedPostOfUserScreen';

export type RootStackParamList = {
  MessageScreen: {
    room: string;
    isWaiting: boolean;
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
  };
  ZegoCallScreen: {
    userID: string;
    userName: string;
    callID: string;
    image: string;
  };
  ProfileComp: {userID: string};
  InfoAccountCenter: {user: User};
};

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer ref={navigationRef}>
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
        <Stack.Screen name="AllReels" component={AllReels} />
        <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} />
        <Stack.Screen name="TagSo" component={TagSo} />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="ZegoCallScreen" component={ZegoCallScreen} />
        <Stack.Screen name="ChangeBirthday" component={ChangeBirthday} />
        <Stack.Screen name="ChangePassword" component={ChangePassword} />
        <Stack.Screen name="BlockedAccounts" component={BlockedAccounts} />
        <Stack.Screen name="ShowActivity" component={ShowActivity} />
        <Stack.Screen name="LikedScreen" component={LikedScreen} />
        <Stack.Screen
          name="AddPeopleToGroupChat"
          component={AddPeopleToGroupChat}
        />
        <Stack.Screen name="NewMessage" component={NewMessage} />
        <Stack.Screen name="MusicSaved" component={MusicSavedScreen} />
        <Stack.Screen name="HorizontalScreen" component={HorizontalScreen} />
        <Stack.Screen name="ProfileComp" component={ProfileComp} />
        <Stack.Screen name="SaveMusic" component={SaveMusic} />
        <Stack.Screen name="PeopleGroupChat" component={PeopleGroupChat} />
        <Stack.Screen name="BlockUser" component={BlockUser} />
        <Stack.Screen name="PostSetting" component={PostSetting} />
        <Stack.Screen name="AddPost" component={AddPost} />
        <Stack.Screen name="Login" component={Login} />
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
        <Stack.Screen name="SeenStoryOwner" component={SeenStoryOwner} />
        <Stack.Screen name="MessageScreen" component={MessageScreen} />
        <Stack.Screen name="InfoUser" component={UserInfo} />
        <Stack.Screen name="QRCode" component={ScreenQRCode} />
        <Stack.Screen name="MessageBox" component={MessageBox} />
        <Stack.Screen name="Streaming" component={Streaming} />
        <Stack.Screen name="CameraScreen" component={CameraScreen} />
        <Stack.Screen name="CreateGroupScreen" component={CreateGroupScreen} />
        <Stack.Screen name="BookmarkScreen" component={BookmarkScreen} />
        <Stack.Screen name="PlaylistsScreen" component={PlaylistsScreen} />
        <Stack.Screen name="Privacy" component={Privacy} />
        <Stack.Screen name="Notifications" component={Notifications} />
        <Stack.Screen
          name="NotificationOption"
          component={NotificationOption}
        />
        <Stack.Screen name="QRScanner" component={QRScanner} />
        <Stack.Screen name="Archive" component={Archive} />
        <Stack.Screen name="InforGroupChat" component={InforGroupChat} />
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
        <Stack.Screen name="PrivacyAndSafety" component={PrivacyAndSafety} />
        <Stack.Screen name="UserFollowScreen" component={UserFollowScreen} />
        <Stack.Screen
          name="HighlightCreateScreen"
          component={HighlightCreateScreen}
        />
        <Stack.Screen name="HelpCenter" component={HelpCenter} />
        <Stack.Screen name="FAQScreen" component={FAQScreen} />
        <Stack.Screen name="ContactScreen" component={ContactScreen} />
        <Stack.Screen
          name="ReportProblemScreen"
          component={ReportProblemScreen}
        />
        <Stack.Screen
          name="SupportRequestsScreen"
          component={SupportRequestsScreen}
        />
        <Stack.Screen name="AccountCenter" component={AccountCenter} />
        <Stack.Screen name="InfoAccountCenter" component={InfoAccountCenter} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
