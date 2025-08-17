import React, {useState, useRef, useEffect, memo, useCallback} from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import {TabView, SceneMap} from 'react-native-tab-view';
import {useTheme} from '../../util/ThemeContext';
import UserInfoStyles from '../../StyleSheet/UserInfoStyles';
import {Colors} from '../../../assets/color/Colors';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {RootStackParamList} from '../../Navigation/AppNavigation';
import ModalTheme from '../Message/components/ModalTheme';
import {useDispatch} from 'react-redux';
import {AppDispatch} from '../../../services/store';
import {updateRoomTheme} from '../../../services/roomRedux/roomSlice';
import {GlobalAlertManager} from '../../../components/Global/AlertModal';
import {getAllMediaInRoom} from '../../util/msgImgList';
import {TabVi} from './components/mediaComponent';
import {MediaItem} from '../../util/msgImgList';
import {MessageSearchModal} from '../../../components/MessageSearchModal';
import {fetchMessages} from '../../../services/messageRedux/messageSlice';
import {Message} from '../../../services/messageRedux/messageType';
import ImagePreviewModal from '../Message/components/ImagePreviewModal';
import {
  ArrowLeft,
  User,
  Search,
  Palette,
  Shield,
  ChevronRight,
  Repeat,
  Image as ImageIcon,
  LucideProps,
} from 'lucide-react-native';
import {useHeadAlert} from '../../../components/Global/HeadAlertProvider';
import {useSocket} from '@services/SocketContext';

const screenWidth = Dimensions.get('window').width - 8;
const initialLayout = {width: Dimensions.get('window').width};
const createFeatureItems = (
  userId: string | undefined,
  navigation: any,
  handleSearchPress: () => void,
) => [
  {
    icon: User,
    text: 'Trang tài khoản',
    onPress: () => {
      if (userId) {
        navigation.navigate('ProfileComp', {userID: userId});
      }
    },
  },
  {
    icon: Search,
    text: 'Tìm kiếm tin nhắn',
    onPress: handleSearchPress,
  },
];
const createSettingItems = (
  navigation: any,
  setVisibleThemeModal: (visible: boolean) => void,
) => [
  {icon: Palette, text: 'Chủ đề', onPress: () => setVisibleThemeModal(true)},
  {
    icon: Shield,
    text: 'Chính sách bảo mật và an toàn',
    onPress: () => {
      navigation.navigate('PrivacySafetyChat');
    },
  },
];

export const UserInfo = () => {
  const [index, setIndex] = useState(0);
  const {theme} = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'InfoUser'>>();
  const {roomId, img1, nameChat, userId} = route.params || {};
  const dispatch = useDispatch<AppDispatch>();
  const animatedLeftValue = useRef(new Animated.Value(0)).current;
  const [visibleThemeModal, setVisibleThemeModal] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const styles = UserInfoStyles(theme);
  const color = Colors[theme];
  const {showAlert} = useHeadAlert();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaPage, setMediaPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const {socket} = useSocket();

  const openPreview = useCallback((uri: string) => {
    setPreviewUri(uri);
    setPreviewVisible(true);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewVisible(false);
    setPreviewUri(null);
  }, []);

  // Simplified useEffect()
  useEffect(() => {
    const fetchInitialMedia = async () => {
      if (!roomId) {
        return;
      }

      setIsLoading(true);
      try {
        const res = await getAllMediaInRoom({roomId, page: 1});
        if (res && res.media && res.media.length > 0) {
          setMedia(res.media);
          setMediaPage(2);
          setHasNextPage(true);
        } else {
          setMedia([]);
          setHasNextPage(false);
        }
      } catch (error) {
        console.error('Failed to fetch media:', error);
        setHasNextPage(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialMedia();
  }, [roomId]);

  // Fetch messages for search functionality
  useEffect(() => {
    if (roomId) {
      dispatch(fetchMessages({roomId}))
        .unwrap()
        .then(fetchedMessages => {
          setMessages(fetchedMessages);
        })
        .catch(error => {
          console.error('Failed to fetch messages:', error);
          setMessages([]);
        });
    }
  }, [roomId, dispatch]);

  const handleSearchPress = useCallback(() => {
    setSearchModalVisible(true);
  }, []);

  const handleMessageSelect = useCallback(
    (messageId: string, index: number) => {
      setHighlightedMessageId(messageId);
      navigation.navigate('MessageScreen', {
        room: roomId,
        highlightMessageId: messageId,
        scrollToIndex: index,
      });
    },
    [navigation, roomId],
  );

  const handleCloseSearchModal = useCallback(() => {
    setSearchModalVisible(false);
  }, []);

  const handleCloseThemeModal = useCallback(() => {
    setVisibleThemeModal(false);
  }, []);

  const handleThemeSelect = useCallback(
    (selectedBackground: string) => {
      dispatch(updateRoomTheme({roomId, theme: selectedBackground}))
        .unwrap()
        .then(() => {
          if (!socket) return;
          showAlert('Thành công', 'Đã cập nhật chủ đề');

          socket.emit('room:update-theme', {
            roomId,
            theme: selectedBackground,
          });
        })
        .catch(() =>
          GlobalAlertManager.show('Thất bại', 'Cập nhật chủ đề thất bại'),
        );
      setVisibleThemeModal(false);
    },
    [dispatch, roomId],
  );

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasNextPage || !roomId) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const res = await getAllMediaInRoom({roomId, page: mediaPage});
      if (res && res.media && res.media.length > 0) {
        setMedia(prev => [...prev, ...res.media]);
        setMediaPage(prevPage => prevPage + 1);
      } else {
        setHasNextPage(false);
      }
    } catch (error) {
      console.error('Failed to fetch more media:', error);
      setHasNextPage(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasNextPage, roomId, mediaPage]);

  useEffect(() => {
    Animated.timing(animatedLeftValue, {
      toValue: (screenWidth / 2) * index,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [animatedLeftValue, index]);

  const [routes] = useState([
    {key: 'tab1', title: 'Media'},
    {key: 'tab2', title: 'Files'},
  ]);

  const Header = memo(({userId}: any) => {
    const featureItems = createFeatureItems(
      userId,
      navigation,
      handleSearchPress,
    );
    const settingItems = createSettingItems(navigation, setVisibleThemeModal);

    const renderIcon = (
      Icon: React.FC<LucideProps>,
      text: string,
      onPress: () => void,
    ) => (
      <TouchableOpacity
        style={styles.blockFeature}
        key={text}
        onPress={onPress}>
        <Icon size={22} color={color.text} />
        <Text style={styles.text} numberOfLines={1}>
          {text}
        </Text>
      </TouchableOpacity>
    );

    const renderSettingRow = (
      Icon: React.FC<LucideProps>,
      text: string,
      onPress: () => void,
    ) => (
      <TouchableOpacity key={text} style={styles.row} onPress={onPress}>
        <View style={styles.infoRowContainer}>
          <Icon size={22} color={color.text} />
          <Text style={styles.nameUser}>{text}</Text>
        </View>
        <ChevronRight size={22} color={color.text} />
      </TouchableOpacity>
    );

    return (
      <View style={styles.container}>
        <View style={styles.blockHeader}>
          <TouchableOpacity style={styles.blockImg}>
            <Image source={{uri: img1}} style={styles.imgUser} />
          </TouchableOpacity>
          <Text style={styles.nameUser}>{nameChat}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBack}
          onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={color.text} />
        </TouchableOpacity>
        <View style={styles.featureContainer}>
          {featureItems.map(item =>
            renderIcon(item.icon, item.text, item.onPress),
          )}
        </View>
        <View style={styles.tab2Container}>
          {settingItems.map(item =>
            renderSettingRow(item.icon, item.text, item.onPress),
          )}
        </View>
      </View>
    );
  });

  const renderMediaTab = useCallback(() => {
    if (!isLoading && media.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ImageIcon size={64} color={color.textSecondary} />
          <Text style={styles.emptyText}>Chưa có tệp nào</Text>
        </View>
      );
    }
    return (
      <TabVi
        medi={media}
        isLoading={isLoading}
        onEndReached={handleLoadMore}
        onImagePress={openPreview}
      />
    );
  }, [media, isLoading, handleLoadMore]);

  const renderScene = SceneMap({
    tab1: renderMediaTab,
    tab2: renderMediaTab,
  });

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: color.background}}>
      <Header userId={userId} />
      <TabView
        navigationState={{index, routes}}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={initialLayout}
        renderTabBar={() => (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
              backgroundColor: color.background,
              borderColor: color.gray,
              height: 40,
            }}>
            {[Repeat, ImageIcon].map((Icon, i) => (
              <TouchableOpacity
                key={i}
                style={{flex: 1, alignItems: 'center'}}
                onPress={() => setIndex(i)}>
                <Icon size={22} color={color.text} />
              </TouchableOpacity>
            ))}
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: animatedLeftValue,
                width: '50%',
                height: 2,
                backgroundColor: color.text,
              }}
            />
          </View>
        )}
      />
      <ModalTheme
        visible={visibleThemeModal}
        onClose={handleCloseThemeModal}
        onSelect={handleThemeSelect}
      />
      <MessageSearchModal
        visible={searchModalVisible}
        onClose={handleCloseSearchModal}
        messages={messages}
        onMessageSelect={handleMessageSelect}
      />
      <ImagePreviewModal
        visible={previewVisible}
        imageUri={previewUri}
        onClose={closePreview}
      />
    </SafeAreaView>
  );
};
