import {
  Modal,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '@services/store';
import {fetchFollowers} from '@services/relationRedux/relationSlice';
import {useTheme} from '../../../../src/util/ThemeContext';
import {TagSoStyles} from '../../../../src/StyleSheet/TagSoStyles';
import {FlashList} from '@shopify/flash-list';
import User from './User';
import {UserProfile} from '@services/relationRedux/relationTypes';
import {useFocusEffect} from '@react-navigation/native';
import LoadingModal from '../../../../components/Global/LoadingModal';
import { Colors } from '@assets/color/Colors';
import { TaggedMedia } from '..';

type ModalSearchProps = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  onSelectUser: (user: UserProfile) => void;
  mediaCurrent: TaggedMedia;
};

const ModalSearch = (props: ModalSearchProps) => {
  const {visible, setVisible, onSelectUser, mediaCurrent}: ModalSearchProps = props;
  const [searchText, setSearchText] = useState('');
  const [searchList, setSearchList] = useState<UserProfile[]>([]);
  const {theme} = useTheme();
  const styles = TagSoStyles(theme);
  const dispatch = useDispatch<AppDispatch>();
  const {followers, loading} = useSelector(
    (state: RootState) => state.relation,
  );
  const userId = useSelector((state: RootState) => state.user.user?._id);

  useEffect(() => {
    dispatch(fetchFollowers({userId: userId ?? ''}));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (searchText === '') {
        setSearchList(followers);
      } else {
        const result = followers.filter(
          item =>
            item.username.includes(searchText) ||
            item.handleName.includes(searchText),
        );
        setSearchList(result);
      }
    }, [searchText, followers]),
  );

  const handleSelectUser = (user: UserProfile) => {
    onSelectUser(user);
    setVisible(false);
    setSearchText('');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <LoadingModal />
      </SafeAreaView>
    );
  } else {
    return (
      <Modal visible={visible} animationType="fade">
        <View style={styles.container}>
          <View style={styles.RowSpace}>
            <TextInput
              placeholder='Tìm kiếm'
              placeholderTextColor={Colors.border}
              value={searchText}
              onChangeText={setSearchText}
              style={styles.search}
            />
            <TouchableOpacity
              onPress={() => {
                setVisible(false);
                setSearchText('');
              }}>
              <Text style={styles.textBtn}>Hủy</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.container, {paddingHorizontal: 20}]}>
            {followers.length === 0 ? (
              <Text style={styles.textNoti}>Bạn chưa có bạn bè.</Text>
            ) : searchList.length === 0 ? (
              <Text style={styles.textNoti}>Không có kết quả.</Text>
            ) : (
              <FlashList
                data={searchList}
                estimatedItemSize={100}
                keyExtractor={item => item._id}
                renderItem={item => {
                  return (
                    <User
                      image={item.item.profilePic}
                      name={item.item.username}
                      handle={item.item.handleName}
                      func={() => handleSelectUser(item.item)}
                      isSelect={mediaCurrent.tags.some(tag => tag.user._id === item.item._id)}
                    />
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  }
};

export default ModalSearch;
