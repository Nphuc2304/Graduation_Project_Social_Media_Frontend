import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, NavigationProp} from '@react-navigation/native';
import {FlashList} from '@shopify/flash-list';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../services/store';
import {
  fetchFollowing,
  fetchFollowers,
  fetchBlocking,
  relationAction,
} from '../../../services/relationRedux/relationSlice';
import ItemList from './Components/itemList';
import {BlockUsersStyles} from '../../StyleSheet/BlockUsersStyles';
import {useTheme} from '../../util/ThemeContext';
import {Modalize} from 'react-native-modalize';
import ModalIsBlock from './Components/ModalIsBlock';
import {Colors} from '../../../assets/color/Colors';
import {GlobalAlertManager} from '../../../components/Global/AlertModal';
import {UserProfile} from '@services/relationRedux/relationTypes';
import {ArrowLeft, Search} from 'lucide-react-native';
import LoadingModal from '../../../components/Global/LoadingModal';

export const BlockUser = () => {
  const {theme} = useTheme();
  const colors = Colors[theme];
  const styles = BlockUsersStyles(theme);
  const navigation = useNavigation<NavigationProp<any>>();
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: RootState) => state.user.user?._id);

  const {following, followers, blocking, loading, error} = useSelector(
    (state: RootState) => state.relation,
  );
  
  const [listUser, setListUser] = useState<UserProfile[]>([]);
  const [searchText, setSearchText] = useState('');
  const [userBlock, setUserBlock] = useState<UserProfile | null>(null);
  const modalRef = React.useRef<Modalize>(null);

  // Fetch data on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userId) {
        dispatch(fetchFollowing({userId}));
        dispatch(fetchFollowers({userId}));
        dispatch(fetchBlocking({userId}));
      }
    });
    return unsubscribe;
  }, [navigation, userId]);

  // Merge and filter users whenever following, followers, or blocking changes
  useEffect(() => {
    const mergeAndFilterUsers = () => {
      // Create a Set of blocked user IDs for quick lookup
      const blockedUserIds = new Set(blocking.map(user => user._id));
      
      // Create a Map to store unique users (using _id as key to avoid duplicates)
      const uniqueUsersMap = new Map<string, UserProfile>();
      
      // Add followers to the map
      followers.forEach(user => {
        if (!blockedUserIds.has(user._id)) {
          uniqueUsersMap.set(user._id, user);
        }
      });
      
      // Add following to the map (this will automatically handle duplicates)
      following.forEach(user => {
        if (!blockedUserIds.has(user._id)) {
          uniqueUsersMap.set(user._id, user);
        }
      });
      
      // Convert map values back to array
      const mergedUsers = Array.from(uniqueUsersMap.values());
      
      // Sort by handleName for consistent ordering
      mergedUsers.sort((a, b) => 
        a.handleName.toLowerCase().localeCompare(b.handleName.toLowerCase())
      );
      
      setListUser(mergedUsers);
    };

    mergeAndFilterUsers();
  }, [following, followers, blocking]);

  useEffect(() => {
    if (error) GlobalAlertManager.show('Lỗi', error);
  }, [error]);

  // Search filter
  useEffect(() => {
    if (searchText.trim().length > 0) {
      // Create merged list first (same logic as above but inline for search)
      const blockedUserIds = new Set(blocking.map(user => user._id));
      const uniqueUsersMap = new Map<string, UserProfile>();
      
      followers.forEach(user => {
        if (!blockedUserIds.has(user._id)) {
          uniqueUsersMap.set(user._id, user);
        }
      });
      
      following.forEach(user => {
        if (!blockedUserIds.has(user._id)) {
          uniqueUsersMap.set(user._id, user);
        }
      });
      
      const mergedUsers = Array.from(uniqueUsersMap.values());
      
      // Apply search filter
      const filtered = mergedUsers.filter(
        u =>
          u.handleName.toLowerCase().includes(searchText.toLowerCase()) ||
          u.username.toLowerCase().includes(searchText.toLowerCase()),
      );
      
      // Sort filtered results
      filtered.sort((a, b) => 
        a.handleName.toLowerCase().localeCompare(b.handleName.toLowerCase())
      );
      
      setListUser(filtered);
    } else {
      // If no search text, use the merged list from the previous useEffect
      const blockedUserIds = new Set(blocking.map(user => user._id));
      const uniqueUsersMap = new Map<string, UserProfile>();
      
      followers.forEach(user => {
        if (!blockedUserIds.has(user._id)) {
          uniqueUsersMap.set(user._id, user);
        }
      });
      
      following.forEach(user => {
        if (!blockedUserIds.has(user._id)) {
          uniqueUsersMap.set(user._id, user);
        }
      });
      
      const mergedUsers = Array.from(uniqueUsersMap.values());
      mergedUsers.sort((a, b) => 
        a.handleName.toLowerCase().localeCompare(b.handleName.toLowerCase())
      );
      
      setListUser(mergedUsers);
    }
  }, [searchText, following, followers, blocking]);

  const onOpen = () => modalRef.current?.open();

  const handleBlock = async () => {
    if (!userBlock) return;
    try {
      await dispatch(
        relationAction({targetId: userBlock._id, action: 'block'}),
      ).unwrap();
      modalRef.current?.close();
      if (userId) {
        // Refresh all lists after blocking
        dispatch(fetchFollowing({userId}));
        dispatch(fetchFollowers({userId}));
        dispatch(fetchBlocking({userId}));
      }
    } catch (e: any) {
      GlobalAlertManager.show('Lỗi', e || 'Chặn thất bại');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Chặn tài khoản</Text>
        <View style={{width: 14}} />
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Tìm kiếm"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={colors.textSecondary}
          style={styles.inputBox}
        />
        <Search size={20} color={colors.text} style={styles.iconSearch} />
        {searchText !== '' && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={styles.cancel}>Hủy</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.container, {paddingHorizontal: 20}]}>
        {loading ? (
          <LoadingModal inline />
        ) : listUser.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchText.trim() 
                ? 'Không tìm thấy người dùng nào.'
                : 'Không có người dùng để chặn.'
              }
            </Text>
          </View>
        ) : (
          <FlashList
            data={listUser}
            estimatedItemSize={200}
            showsVerticalScrollIndicator={false}
            renderItem={({item}) => (
              <ItemList
                uri={item.profilePic}
                handle={item.handleName}
                name={item.username}
                onhandleItem={() => {}}
                onhandleBlock={() => {
                  setUserBlock(item);
                  onOpen();
                }}
              />
            )}
          />
        )}
      </View>
      <Modalize
        ref={modalRef}
        adjustToContentHeight
        modalStyle={{
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          overflow: 'hidden',
        }}>
        {userBlock && (
          <ModalIsBlock
            uri={userBlock.profilePic}
            handle={userBlock.handleName}
            onHandleBlock={handleBlock}
          />
        )}
      </Modalize>
    </SafeAreaView>
  );
};