import React, {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  Dimensions,
  TextStyle,
} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {Colors} from '../../../../assets/color/Colors';
import {useTheme} from '../../../util/ThemeContext';
import {Modalize} from 'react-native-modalize';
import {useDispatch, useSelector} from 'react-redux';
import {fetchMyRooms} from '@services/roomRedux/roomSlice';
import ChatRoomAvatar from '../../../../components/ChatRoomAvatar';
import {RootState, AppDispatch} from '../../../../services/store';
import {RoomUser} from '@services/roomRedux/roomType';
import {Search, UserPlus, Link, CheckCircle, Check} from 'lucide-react-native';
import LoadingModal from '../../../../components/Global/LoadingModal';
import {shareStory} from '../../../../services/StoryRedux/StorySlice';
import {GlobalAlertManager} from '../../../../components/Global/AlertModal';
import Clipboard from '@react-native-clipboard/clipboard';

export interface CombinedItem {
  kind: 'room' | 'friend';
  _id: string;
  name: string;
  avatars?: string[];
  avatar?: string;
}

export interface ModalShareHandle {
  open: () => void;
  close: () => void;
}

interface ModalShareProps {
  isDark?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  storyData?: {
    _id: string;
    mediaUrl: string;
    type?: 'image' | 'video';
  };
  creatorId?: string;
}

const ModalShareStory = forwardRef<ModalShareHandle, ModalShareProps>(
  ({isDark, onOpen, onClose, storyData, creatorId}, ref) => {
    const {theme} = useTheme();
    let color;
    if (isDark) {
      color = Colors.dark;
    } else {
      color = Colors[theme];
    }
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [isLinkCopied, setIsLinkCopied] = useState(false);

    const dispatch = useDispatch<AppDispatch>();
    const userID = useSelector((s: RootState) => s.user.user?._id);
    const modalizeRef = useRef<Modalize>(null);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<CombinedItem[]>([]);

    useImperativeHandle(ref, () => ({
      open: () => {
        loadData();
        modalizeRef.current?.open();
        onOpen?.();
      },
      close: () => {
        modalizeRef.current?.close();
        setSelectedFriendIds([]);
        setMessage('');
        onClose?.();
      },
    }));

    const loadData = async () => {
      if (!userID) return;
      setLoading(true);
      try {
        // , followers, following
        const [rooms] = await Promise.all([
          dispatch(fetchMyRooms()).unwrap(),
          // dispatch(fetchFollowers({userId: userID})).unwrap(),
          // dispatch(fetchFollowing({userId: userID})).unwrap(),
        ]);
        const roomItems: CombinedItem[] = rooms.map(r => {
          // Filter out current user from the room
          const otherUsers = r.user_ids.filter(
            (u: RoomUser) => u._id !== userID,
          );

          // For 1:1 chat (2 people total), show single avatar
          if (r.user_ids.length === 2) {
            return {
              kind: 'room',
              _id: r._id,
              name: r.name || otherUsers[0]?.handleName || 'Chat nhóm',
              avatars: [otherUsers[0]?.profilePic],
            };
          }
          // For group chat (3+ people), show overlapping avatars
          else {
            return {
              kind: 'room',
              _id: r._id,
              name: r.name || 'Chat nhóm',
              avatars: otherUsers
                .slice(0, 2)
                .map((u: RoomUser) => u.profilePic),
            };
          }
        });
        // const users = [...followers, ...following];
        // const seen = new Set<string>();
        // const friendItems: CombinedItem[] = users.reduce((acc: CombinedItem[], u) => {
        //   if (!seen.has(u._id)) {
        //     seen.add(u._id);
        //     acc.push({
        //       kind: 'friend',
        //       _id: u._id,
        //       name: u.username,
        //       avatar: u.profilePic,
        //     });
        //   }
        //   return acc;
        // }, []);

        //, ...friendItems
        setItems([...roomItems]);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    };

    type FontWeight = TextStyle['fontWeight'];
    const toggleSelectFriend = (id: string) => {
      setSelectedFriendIds(prev =>
        prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id],
      );
    };

    const handleShareStory = async () => {
      if (!storyData || selectedFriendIds.length === 0) {
        GlobalAlertManager.show(
          'Lỗi',
          'Vui lòng chọn ít nhất một cuộc trò chuyện',
        );
        return;
      }

      setIsSharing(true);
      try {
        const payload = {
          roomIds: selectedFriendIds,
          message: message,
          media: {
            type: storyData.type || 'image',
            url: storyData.mediaUrl,
          },
        };

        await dispatch(shareStory(payload)).unwrap();

        // Close modal and reset
        modalizeRef.current?.close();
        setSelectedFriendIds([]);
        setMessage('');
        onClose?.();
      } catch (error: any) {
        GlobalAlertManager.show('Lỗi', error || 'Không thể chia sẻ story');
      } finally {
        setIsSharing(false);
      }
    };

    const handleCopyLink = () => {
      if (storyData?._id) {
        // Generate deeplink for the story - use universal link format
        const deeplink = `https://cirla.io.vn/story/${storyData._id}/${
          creatorId || ''
        }`;

        // Debug: log the deeplink
        console.log('Generated deeplink:', deeplink);
        console.log('Story ID:', storyData._id);
        console.log('Creator ID:', creatorId);

        Clipboard.setString(deeplink);
        setIsLinkCopied(true);

        // Reset the icon after 2 seconds
        setTimeout(() => {
          setIsLinkCopied(false);
        }, 2000);
      } else {
        GlobalAlertManager.show('Lỗi', 'Không có liên kết để sao chép');
      }
    };

    const contentHeight = Dimensions.get('window').height * 0.6;

    const styles = StyleSheet.create({
      modal: {
        paddingHorizontal: Colors.spacing.m,
        paddingTop: Colors.spacing.s,
        paddingBottom: Colors.spacing.l,
        borderTopLeftRadius: Colors.radius.l,
        borderTopRightRadius: Colors.radius.l,
      },
      headerContainer: {
        marginBottom: 12,
      },
      handleBar: {
        alignSelf: 'center',
        width: 40,
        height: 5,
        borderRadius: Colors.radius.xs,
        backgroundColor: color.textSecondary,
        marginBottom: Colors.spacing.s,
      },
      description: {
        color: color.textSecondary,
        fontSize: Colors.typography.fontSizes.s,
        textAlign: 'center',
        paddingHorizontal: Colors.spacing.s,
        marginBottom: Colors.spacing.s,
      },
      learnMoreText: {
        color: Colors.primary,
      },
      searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Colors.radius.s,
        paddingHorizontal: Colors.spacing.s,
        height: 40,
        marginBottom: Colors.spacing.m,
      },
      searchInput: {
        flex: 1,
        marginLeft: Colors.spacing.s,
        color: color.text,
        fontSize: Colors.typography.fontSizes.m,
      },
      friendListContainer: {
        paddingBottom: Colors.spacing.m,
        paddingHorizontal: Colors.spacing.s,
        alignItems: 'center',
      },
      friendItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 64,
        marginBottom: Colors.spacing.m,
      },
      avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: Colors.spacing.xs,
      },
      checkmark: {
        position: 'absolute',
        bottom: 10,
        right: 4,
        backgroundColor: Colors.white,
        borderRadius: 10,
        zIndex: 1,
      },
      friendName: {
        color: color.textSecondary,
        fontSize: Colors.typography.fontSizes.s,
        textAlign: 'center',
        paddingHorizontal: Colors.spacing.xs,
        flexWrap: 'wrap',
      },
      shareActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        rowGap: Colors.spacing.m,
        marginTop: Colors.spacing.m,
      },
      actionItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
      },
      actionLabel: {
        color: color.text,
        fontSize: 11,
        textAlign: 'center',
        marginTop: Colors.spacing.xs,
      },
      messageInput: {
        backgroundColor: color.backgroundSecondary,
        borderRadius: Colors.radius.s,
        color: color.text,
        paddingHorizontal: Colors.spacing.m,
        paddingVertical: Colors.spacing.s,
        marginTop: Colors.spacing.m,
        fontSize: Colors.typography.fontSizes.m,
        borderWidth: 1,
        borderColor: color.border,
      },
      sendButton: {
        backgroundColor: Colors.primary,
        paddingVertical: Colors.spacing.m,
        borderRadius: Colors.radius.s,
        marginTop: Colors.spacing.m,
      },
      sendButtonText: {
        color: Colors.white,
        textAlign: 'center',
        fontWeight: Colors.typography.fontWeights.semiBold,
        fontSize: Colors.typography.fontSizes.l,
      },
      emptyStateText: {
        height: 200,
        textAlign: 'center',
        fontSize: Colors.typography.fontSizes.xl,
        margin: 30,
        color: color.textSecondary,
        fontWeight: Colors.typography.fontWeights.regular,
        verticalAlign: 'middle',
      },
      actionIcon: {
        width: 20,
        height: 20,
        tintColor: color.text,
      },
      checkmarkIcon: {
        width: 20,
        height: 20,
        tintColor: Colors.primary,
      },
      loader: {
        marginTop: 40,
      },
      listContainer: {
        paddingBottom: 16,
      },
      cell: {
        flex: 1,
        alignItems: 'center',
        marginBottom: 12,
      },
      label: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 10,
      },
      emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
    });

    return (
      <Modalize
        ref={modalizeRef}
        adjustToContentHeight
        handlePosition="inside"
        handleStyle={styles.handleBar}
        modalStyle={[styles.modal, {backgroundColor: color.background}]}
        onClosed={() => {
          onClose?.();
        }}
        scrollViewProps={{
          showsVerticalScrollIndicator: false,
          nestedScrollEnabled: true,
        }}>
        <View style={{height: contentHeight}}>
          {/* Header */}
          <View style={{marginTop: 10}}>
            <Text style={[styles.description, {color: color.text}]}>
              Liên kết mà bạn chia sẻ là dành riêng cho bạn và có thể được dùng
              để cải thiện gợi ý cũng như quảng cáo bạn nhìn thấy.{' '}
              <Text style={{color: '#0095f6'}}>Tìm hiểu thêm</Text>
            </Text>
            <View
              style={[
                styles.searchBox,
                {backgroundColor: color.backgroundSecondary},
              ]}>
              <Search size={20} color="#aaa" />
              <TextInput
                placeholder="Tìm kiếm"
                style={[
                  styles.searchInput,
                  {backgroundColor: color.backgroundSecondary},
                ]}
                placeholderTextColor={color.textSecondary}
              />

              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleCopyLink}>
                {isLinkCopied ? (
                  <Check size={24} color={Colors.primary} />
                ) : (
                  <Link size={24} color={color.text} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          {loading ? (
            <LoadingModal />
          ) : items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text
                style={[styles.emptyStateText, {color: color.textSecondary}]}>
                Chưa có mục nào để chia sẻ
              </Text>
            </View>
          ) : (
            <FlashList
              data={items}
              numColumns={3}
              estimatedItemSize={80}
              extraData={selectedFriendIds}
              contentContainerStyle={styles.listContainer}
              keyExtractor={item => item._id}
              renderItem={({item}) => {
                const isSel = selectedFriendIds.includes(item._id);
                return (
                  <View style={styles.cell}>
                    <TouchableOpacity
                      onPress={() => toggleSelectFriend(item._id)}>
                      {item.kind === 'room' ? (
                        <ChatRoomAvatar
                          roomId={item._id}
                          img1={item.avatars![0]}
                          img2={
                            item.avatars!.length > 1
                              ? item.avatars![1]
                              : undefined
                          }
                        />
                      ) : (
                        <Image
                          source={{uri: item.avatar!}}
                          style={styles.avatar}
                        />
                      )}
                      {isSel && (
                        <View style={[styles.checkmark]}>
                          <CheckCircle size={22} color={color.primary} />
                        </View>
                      )}
                      <Text
                        style={[styles.label, {color: color.textSecondary}]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}

          {/* Footer */}
          {!loading &&
            (selectedFriendIds.length > 0 ? (
              <View>
                <TextInput
                  placeholder="Soạn tin nhắn..."
                  placeholderTextColor={color.textSecondary}
                  style={[
                    styles.messageInput,
                    {backgroundColor: color.backgroundSecondary},
                  ]}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, isSharing && {opacity: 0.7}]}
                  onPress={handleShareStory}
                  disabled={isSharing}>
                  <Text style={styles.sendButtonText}>
                    {isSharing ? 'Đang gửi...' : 'Gửi'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null)}
        </View>
      </Modalize>
    );
  },
);

export default ModalShareStory;
