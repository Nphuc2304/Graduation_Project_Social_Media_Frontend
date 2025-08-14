import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import React, {forwardRef, useEffect, useState, useCallback} from 'react';
import {Modalize} from 'react-native-modalize';
import {FlashList} from '@shopify/flash-list';
import {Colors} from '../../../../assets/color/Colors';
import {useTheme} from '../../../util/ThemeContext';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../../services/store';
import {Likers} from '../../../../services/likersRedux/likersSlice';
import {handleFollowToggle} from '../util';
import { Liker } from '@services/likersRedux/likersType';

interface ModalReactionProps {
  postId: string;
  isLiked: boolean;
}

const ModalReaction = forwardRef<Modalize, ModalReactionProps>(
  ({postId, isLiked}, ref) => {
    const {theme} = useTheme();
    const color = Colors[theme];

    //redux
    const dispatch = useDispatch<AppDispatch>();
    const {isLoading} = useSelector((state: RootState) => state.likers);
    const {refreshToken} = useSelector((state: RootState) => state.user);
    const [users, setUsers] = useState<Liker[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const user = useSelector((state: RootState) => state.user.user);
    const modalContentHeight = Dimensions.get('window').height * 0.7;

    useEffect(() => {
      if (postId && isModalOpen) {
        const fetchLikers = async () => {
          try {
            const resultAction = await dispatch(
              Likers({postId, refreshToken}),
            ).unwrap();
            setUsers(resultAction.data);
          } catch (error) {
            console.error('Lấy danh sách thất bại:', error);
          }
        };
        fetchLikers();
      }
    }, [isModalOpen]);

    const handleOpen = useCallback(() => {
      setIsModalOpen(true);
    }, []);

    const handleClose = useCallback(() => {
      setIsModalOpen(false);
    }, []);

    const renderItem = ({item}: {item: Liker}) => (
      <View style={[styles.userItem, {backgroundColor: color.modal}]}>
        <Image source={{uri: item.profilePic}} style={styles.avatar} />
        <View style={[styles.userInfo, {backgroundColor: color.modal}]}>
          <Text style={[styles.username, {color: color.text}]}>
            {item.username}
          </Text>
          <Text style={[styles.bio, {color: color.text}]}>
            {item.handleName}
          </Text>
        </View>
        {typeof item.userFollowing !== 'undefined' && (
          <TouchableOpacity
            style={[
              styles.followButton,
              item.userFollowing
                ? [styles.disabledButton, {borderColor: color.text}]
                : styles.activeButton,
            ]}
            onPress={() => {
              handleFollowToggle({
                userId: item?.userId,
                follow: item.userFollowing ?? false,
                senderId: user?._id,
                handleName: user?.username,
                dispatch,
              });
              setUsers(prevUsers =>
                prevUsers.map(u =>
                  u.userId === item.userId
                    ? {...u, userFollowing: !u.userFollowing}
                    : u,
                ),
              );
            }}>
            <Text
              style={[
                item.userFollowing
                  ? [styles.followButtonText, {color: color.text}]
                  : styles.followButtonText,
              ]}
              numberOfLines={1}>
              {item.userFollowing ? 'Đang theo dõi' : 'Theo dõi'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );

    return (
      <Modalize
        ref={ref}
        adjustToContentHeight
        modalStyle={[styles.modal, {backgroundColor: color.modal}]}
        handleStyle={styles.modalHandle}
        handlePosition="inside"
        onOpen={handleOpen}
        onClose={handleClose}
        panGestureEnabled={true}
        onOverlayPress={() => ref && (ref as any).current?.close()}
        HeaderComponent={
          <View style={styles.modalHeader}>
            <Text style={[styles.title, {color: color.text}]}>Lượt thích</Text>
          </View>
        }
        scrollViewProps={{
          showsVerticalScrollIndicator: false,
          nestedScrollEnabled: true,
        }}>
        <View style={{height: modalContentHeight}}>
          {/* Content với chiều cao còn lại */}
          <View style={[styles.contentContainer, {height: modalContentHeight}]}>
            {isLoading ? (
              <View style={styles.centerContent}>
                <Text
                  style={[styles.loadingText, {color: color.textSecondary}]}>
                  Đang tải...
                </Text>
              </View>
            ) : users.length > 0 ? (
              <FlashList
                data={users}
                keyExtractor={item => item.userId}
                renderItem={renderItem}
                estimatedItemSize={70}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
              />
            ) : (
              <View style={styles.centerContent}>
                <Text style={[styles.emptyText, {color: color.textSecondary}]}>
                  Hãy trở thành người đầu tiên yêu thích bài viết nhé!
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modalize>
    );
  },
);

export default ModalReaction;

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHandle: {
    backgroundColor: '#ccc',
    height: 4,
    width: 50,
    alignSelf: 'center',
    borderRadius: 2,
  },
  modalHeader: {
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1, // Này sẽ bị override bởi height inline
    paddingHorizontal: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '400',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  listContainer: {
    paddingVertical: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingTop: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  bio: {
    fontSize: 14,
    opacity: 0.7,
  },
  followButton: {
    width: 89,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#007BFF',
  },
  disabledButton: {
    borderWidth: 1,
    borderRadius: 8,
  },
  followButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
