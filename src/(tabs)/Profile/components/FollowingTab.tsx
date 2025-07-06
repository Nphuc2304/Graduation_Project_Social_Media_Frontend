import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,

} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import React, {useState, useEffect, useMemo} from 'react';
import {Colors} from '../../../../assets/color/Colors';
import {useTheme} from '../../../util/ThemeContext';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../../services/store';
import {
  fetchFollowing,
  relationAction,
  fetchRecommendations,
} from '../../../../services/relationRedux/relationSlice';
import {createRoom} from '../../../../services/roomRedux/roomSlice';
import {GlobalAlertManager} from '../../../../components/Global/AlertModal';
import { MoreActionModal } from './MoreActionModal';
import { UserProfile } from '@services/relationRedux/relationTypes';

const FollowingTab = () => {
  const navigation: any = useNavigation();
  const {theme} = useTheme();
  const color = Colors[theme];
  const userID = useSelector((state: RootState) => state.user?.user?._id);
  const user = useSelector((state: RootState) => state.user.user);
  const dispatch = useDispatch<AppDispatch>();
  const {
    following: reduxFollowing,
    recommendations: reduxRecommendations,
    loading,
    error,
  } = useSelector((state: RootState) => state.relation);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!userID) return;
    dispatch(fetchFollowing({ userId: userID }));
    dispatch(fetchRecommendations({ limit: 10 }));
  }, [dispatch, userID]);

  const followingIds = useMemo(
    () => new Set(reduxFollowing.map(u => u._id)),
    [reduxFollowing]
  );

  const recommendations = useMemo(
    () => reduxRecommendations.filter(u => !followingIds.has(u._id)),
    [reduxRecommendations, followingIds]
  );

  const handleMessagingPress = async (item: UserProfile) => {
    try {
      const res = await dispatch(
        createRoom({
          name: '',
          user_ids: [item._id],
          type: 'waiting',
        }),
      ).unwrap();

      const {room} = res;

      const otherUsers = room.user_ids.filter(user => user._id !== userID);
      const img1 = otherUsers[0]?.profilePic;
      const img2 = userID
        ? room.user_ids.find(user => user._id === userID)?.profilePic
        : undefined;

      navigation.navigate('MessageScreen', {
        room: room._id,
        img1,
        img2,
      });
    } catch (error) {
      console.log('Tạo room thất bại:', error);
    }
  };

  const handleFollowPress = async (item: UserProfile) => {
    try {
      await dispatch(
        relationAction({
          targetId: item._id,
          action: 'follow',
          senderId: user?._id,
          handleName: user?.handleName,
        }),
      ).unwrap();
    } catch (error) {
      GlobalAlertManager.show('Thất bại', 'Vui lòng thử lại sau');
      console.log(error);
    }
  };

  const handleMorePress = (item: UserProfile) => {
    setSelectedUser(item);
    setModalVisible(true);
  };

  const onUnfollow = async () => {
    if (!selectedUser) return;
    try {
      await dispatch(
        relationAction({
          targetId: selectedUser._id,
          action: 'unfollow',
          senderId: user?._id!,
          handleName: user?.handleName!,
        })
      ).unwrap();
    } catch (err) {
      GlobalAlertManager.show('Lỗi', 'Không thể bỏ theo dõi. Vui lòng thử lại.');
    }
  };

  const onReport = () => {
    GlobalAlertManager.show('Thông báo', 'Đã báo cáo');
  };

  const renderCategoryItem = ({item}: {item: any}) => (
    <TouchableOpacity>
      <View style={styles.categoryItem}>
        <Image source={{uri: item.multiImage}} style={styles.categoryImage} />
        <View
          style={[styles.categoryInfo, {backgroundColor: color.background}]}>
          <Text style={[styles.categoryTitle, {color: color.text}]}>
            {item.title}
          </Text>
          <Text
            style={[styles.categoryDescription, {color: color.textSecondary}]}>
            {item.description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSortItem = ({item}: {item: UserProfile}) => (
    <View style={[styles.suggestedItem, {backgroundColor: color.background}]}>
      <TouchableOpacity style={styles.touchableInfo}>
        <Image source={{uri: item.profilePic}} style={styles.profilePic} />
        <View style={styles.suggestedInfo}>
          <Text style={[styles.handle, {color: color.text}]}>
            {item.handleName}
          </Text>
          <Text style={[styles.username, {color: color.textSecondary}]}>
            {item.username}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleMessagingPress(item)}
        style={[styles.messageButton, {borderColor: color.text}]}>
        <Text style={[styles.messageText, {color: color.text}]}>Nhắn tin</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleMorePress(item)}>
        <Image
          source={require('../../../../assets/icon/menu-dots-vertical.png')}
          style={[styles.moreIcon, {tintColor: color.text}]}
        />
      </TouchableOpacity>
    </View>
  );

  const renderRecommendItem = ({item}: {item: UserProfile}) => (
    <View style={[styles.suggestedItem, {backgroundColor: color.background}]}>
      <TouchableOpacity style={styles.touchableInfo}>
        <Image source={{uri: item.profilePic}} style={styles.profilePic} />
        <View style={styles.suggestedInfo}>
          <Text style={[styles.handle, {color: color.text}]}>
            {item.handleName}
          </Text>
          <Text style={[styles.username, {color: color.textSecondary}]}>
            {item.username}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleFollowPress(item)}
        style={styles.followButton}>
        <Text style={styles.followText}>Theo dõi</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <ActivityIndicator style={{marginTop: 20}} size="large" color={color.primary}/>;
  }
  if (error) {
    return (
      <View style={{padding: 20}}>
        <Text style={{color: color.text, textAlign: 'center'}}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, {backgroundColor: color.background}]}>
      {reduxFollowing.length === 0 ? (
        <View
          style={{
            backgroundColor: color.background,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}>
          <Image
            source={require('../../../../assets/icon/invite.png')}
            style={{width: 200, height: 200, marginBottom: 24}}
            resizeMode="contain"
          />
          <Text
            style={{
              color: color.text,
              fontSize: 20,
              fontWeight: 'bold',
              marginBottom: 8,
            }}>
            Bạn chưa theo dõi ai
          </Text>
          <Text
            style={{
              color: color.textSecondary,
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 24,
            }}>
            Khám phá người dùng để kết nối và bắt đầu theo dõi
          </Text>
        </View>
      ) : (
        <FlashList
          data={reduxFollowing}
          keyExtractor={item => item._id}
          renderItem={renderSortItem}
          showsVerticalScrollIndicator={false}
          estimatedItemSize={10}
        />
      )}
      <FlashList
        data={recommendations}
        keyExtractor={item => item._id}
        renderItem={renderRecommendItem}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={10}
        ListHeaderComponent={
          <Text style={[styles.sectionHeader, {color: color.text}]}>
            Gợi ý cho bạn
          </Text>
        }
      />
      <MoreActionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onUnfollow={onUnfollow}
        onReport={onReport}
      />
    </ScrollView>
  );
};

export default FollowingTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  categoryImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryDescription: {
    color: '#666',
  },
  sortSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortIcon: {
    width: 16,
    height: 16,
  },
  suggestedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  touchableInfo: {
    flex: 1,
    flexDirection: 'row',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  suggestedInfo: {
    flex: 1,
  },
  handle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    color: '#666',
  },
  followButton: {
    width: 89,
    backgroundColor: '#007BFF',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButton: {
    width: 89,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followText: {
    color: '#fff',
  },
  messageText: {
    color: '#000',
  },
  moreIcon: {
    width: 16,
    height: 16,
  },
});
