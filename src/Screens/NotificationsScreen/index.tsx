import React, {useCallback, useEffect} from 'react';
import {
  SafeAreaView,
  FlatList,
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {ActivityIndicator} from 'react-native-paper';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {AppDispatch, RootState, store} from '@services/store';
import {
  getNotification,
  markAsReadNoti,
} from '@services/notificationRedux/notificationSlice';
import {
  markAllAsRead,
  resetStatus,
  setIsReadNoti,
} from '@services/notificationRedux/notificationReducer';
import {ItemNoti} from '@services/notificationRedux/notificationTypes';
import {useNotificationStyles} from '../../../src/StyleSheet/NotificationStyles';
import {useTheme} from '../../../src/util/ThemeContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const Header: React.FC<{onBackPress: () => void}> = ({onBackPress}) => {
  const styles = useNotificationStyles();
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
        <Image
          style={styles.backIcon}
          source={require('../../../assets/icon/left.png')}
        />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Thông báo</Text>
      <View style={styles.backIcon} />
      <View style={styles.backIcon} />
    </View>
  );
};

// Group theo ngày, flatten thành danh sách có header
const formatNotisWithHeaders = (notifications: ItemNoti[]) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  const result: Array<{type: 'header' | 'item'; data: any}> = [];

  const groups: {[key: string]: ItemNoti[]} = {};

  notifications.forEach(noti => {
    const createdAt = new Date(noti.createdAt);
    let key = '';
    if (isSameDay(createdAt, today)) key = 'Hôm nay';
    else if (isSameDay(createdAt, yesterday)) key = 'Hôm qua';
    else
      key = `${createdAt.getDate().toString().padStart(2, '0')}/${(
        createdAt.getMonth() + 1
      )
        .toString()
        .padStart(2, '0')}/${createdAt.getFullYear()}`;

    if (!groups[key]) groups[key] = [];
    groups[key].push(noti);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'Hôm nay') return -1;
    if (b === 'Hôm nay') return 1;
    if (a === 'Hôm qua') return -1;
    if (b === 'Hôm qua') return 1;

    const [d1, m1, y1] = a.split('/').map(Number);
    const [d2, m2, y2] = b.split('/').map(Number);
    return (
      new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()
    );
  });

  sortedKeys.forEach(key => {
    result.push({type: 'header', data: key});
    groups[key].forEach(item => result.push({type: 'item', data: item}));
  });

  return result;
};

export const NotificationsScreen = () => {
  const styles = useNotificationStyles();
  const {theme} = useTheme();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();

  const {notifications, pagination, isLoadingMore, isSuccess} = useSelector(
    (state: RootState) => state.notification,
  );

  useFocusEffect(
    useCallback(() => {
      dispatch(getNotification({page: 1}));

      return () => {
        const state: any = store.getState();
        const unreadNotis = state.notification.notifications.filter(
          (n: ItemNoti) => !n.isRead,
        );
        unreadNotis.forEach((n: ItemNoti) => {
          dispatch(markAsReadNoti({id: n._id}));
        });
        dispatch(markAllAsRead());
        dispatch(setIsReadNoti(false));
      };
    }, [dispatch]),
  );

  const handleLoadMore = () => {
    const currentPage = pagination?.page ?? 1;
    const totalPages = pagination?.totalPages ?? 1;

    if (currentPage < totalPages && !isLoadingMore) {
      dispatch(getNotification({page: currentPage + 1}));
    }
  };

  const handlePress = (noti: ItemNoti) => {
    const type = noti.data?.type;
    switch (type) {
      case 'comment':
        if (noti.data?.postId) {
          navigation.navigate('PostDetailScreen', {
            postId: noti.data?.postId,
            commentId: noti.data?.commentId,
          });
        }
        break;
      case 'like':
      case 'unlike':
      case 'post':
        if (noti.data?.postId) {
          navigation.navigate('PostDetailScreen', {
            postId: noti.data?.postId,
          });
        }
        break;
      case 'follow':
        navigation.navigate('ProfileComp', {userID: noti.data?.userId});
        break;
      case 'message':
        navigation.navigate('MessageScreen', {
          room: noti.data?.roomId,
          // isWaiting: noti.data?.isWaiting,
        });
        break;
    }
  };

  const renderItem = ({item}: {item: {type: 'header' | 'item'; data: any}}) => {
    if (item.type === 'header') {
      return <Text style={styles.sectionTitle}>{item.data}</Text>;
    }

    const noti: ItemNoti = item.data;
    const isRead = noti.isRead ?? false;

    return (
      <TouchableOpacity
        key={noti._id}
        style={[
          styles.notificationItem,
          !isRead && {
            backgroundColor:
              theme === 'light'
                ? 'rgba(238, 246, 255, 1)'
                : 'rgba(255, 255, 255, 0.1)',
          },
        ]}
        onPress={() => handlePress(noti)}>
        <Image style={styles.avatar} source={{uri: noti.sender.profilePic}} />
        <View style={styles.textContainer}>
          <Text
            style={[styles.contentText, !isRead && {fontWeight: 'bold'}]}
            numberOfLines={2}>
            {noti.title}
          </Text>
          <Text style={styles.bodyText} numberOfLines={1}>
            {noti.body}
          </Text>
          <Text style={styles.bodyText}>{dayjs(noti.createdAt).fromNow()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        onBackPress={() => {
          navigation.goBack();
          dispatch(resetStatus());
        }}
      />

      {!isSuccess ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#888" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Bạn không có thông báo nào</Text>
        </View>
      ) : (
        <View style={styles.container}>
          <FlatList
            data={formatNotisWithHeaders(notifications)}
            horizontal={false}
            renderItem={renderItem}
            keyExtractor={(item, index) =>
              item.type === 'header' ? `header-${item.data}` : item.data._id
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{paddingBottom: 16}}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator size="small" color="#888" />
              ) : null
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
};
