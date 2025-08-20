
import React, {useState, useEffect} from 'react';
import {Modal, SafeAreaView, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, NavigationProp} from '@react-navigation/native';
import {FlashList} from '@shopify/flash-list';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../services/store';
import {
  fetchBlocking,
  relationAction,
} from '../../../services/relationRedux/relationSlice';
import ItemUnlock from './Components/ItemUnlock';
import {BlockedAccountsStyles} from '../../StyleSheet/BlockedAccountsStyles';
import {useTheme} from '../../util/ThemeContext';
import {GlobalAlertManager} from '../../../components/Global/AlertModal';
import {ArrowLeft, Plus} from 'lucide-react-native';
import {Colors} from '@assets/color/Colors';
import LoadingModal from '../../../components/Global/LoadingModal';

export const BlockedAccounts = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const {theme} = useTheme();
  const color = Colors[theme];
  const styles = BlockedAccountsStyles(theme);
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: RootState) => state.user.user?._id);

  const {blocking, loading, error} = useSelector(
    (state: RootState) => state.relation,
  );
  const [isModal, setIsModal] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userId) dispatch(fetchBlocking({userId}));
    });
    return unsubscribe;
  }, [navigation, userId]);

  useEffect(() => {
    if (error) GlobalAlertManager.show('Lỗi', error);
  }, [error]);

  const handleUnblock = async () => {
    if (!selected) return;
    try {
      await dispatch(
        relationAction({targetId: selected._id, action: 'unblock'}),
      ).unwrap();
      setIsModal(false);
      setSelected(null);
      if (userId) dispatch(fetchBlocking({userId}));
    } catch (e: any) {
      GlobalAlertManager.show('Lỗi', e || 'Gỡ chặn thất bại');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={color.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Tài khoản bị chặn</Text>
        <TouchableOpacity onPress={() => navigation.navigate('BlockUser')}>
          <Plus size={22} color={color.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.container, {marginHorizontal: 24}]}>
        {loading ? (
          <LoadingModal inline />
        ) : blocking.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Bạn hiện không chặn ai.</Text>
          </View>
        ) : (
          <FlashList
            data={blocking}
            estimatedItemSize={200}
            showsVerticalScrollIndicator={false}
            renderItem={({item}) => (
              <ItemUnlock
                uri={item.profilePic}
                handle={item.handleName}
                onHandleUnBlock={() => {
                  setSelected(item);
                  setIsModal(true);
                }}
              />
            )}
          />
        )}
      </View>

      <Modal visible={isModal} transparent animationType="fade">
        <View style={styles.modal}>
          <View style={styles.modalContainer}>
            {selected && (
              <>
                <Text style={styles.notiTitle}>
                  Bỏ chặn {selected.handleName}?
                </Text>
                <Text style={styles.notiText}>
                  {selected.handleName} và các tài khoản khác mà họ có hoặc có
                  thể tạo sẽ có thể yêu cầu theo dõi và nhắn tin cho bạn trên
                  Cirla. Họ sẽ không được thông báo rằng bạn đã bỏ chặn họ.
                </Text>
                <TouchableOpacity
                  style={styles.btnModal}
                  onPress={handleUnblock}>
                  <Text
                    style={[styles.notiTitle, {color: 'red', marginTop: 0}]}>
                    Bỏ chặn
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnCance}
                  onPress={() => {
                    setIsModal(false);
                    setSelected(null);
                  }}>
                  <Text
                    style={[
                      styles.notiTitle,
                      {fontWeight: '400', marginTop: 0},
                    ]}>
                    Hủy
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};