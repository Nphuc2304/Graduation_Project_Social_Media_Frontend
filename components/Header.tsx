import React, {useState} from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors} from '../assets/color/Colors';
import {useTheme} from '../src/util/ThemeContext';
import {Menu, Divider, Provider} from 'react-native-paper';
import {GlobalAlertManager} from './Global/AlertModal';
import {useSelector} from 'react-redux';
import {RootState} from '@services/store';
import { getUnreadNotificationCount } from '@services/notificationRedux/notificationSlice';

const Header = (props: any) => {
  const {
    title,
    icon,
    iconBack,
    iconQR,
    iconNotify,
    iconMessage,
    iconLeft,
    iconNewChat,
    func,
    funcLeft,
    navigation,
    pressableTitle,
    pressableTilFunc,
  } = props;

  const {theme} = useTheme();
  const color = Colors[theme];

  const [visible, setVisible] = useState(false);

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const isReadNoti = useSelector((state: RootState) => state.notification.isReadNoti);

  const unreadCount = useSelector((state: RootState) => {
    const notifications = state.notification.notifications;
    return getUnreadNotificationCount(notifications);
  });

  return (
    <Provider>
      <View style={[styles.container, {backgroundColor: color.background}]}>
        <View style={styles.leftSection}>
          {icon && (
            <Menu
              visible={visible}
              onDismiss={closeMenu}
              style={{
                marginTop: 40,
                marginLeft: 40,
              }}
              anchor={
                <TouchableOpacity onPress={openMenu}>
                  <Image source={icon} style={styles.logo} />
                </TouchableOpacity>
              }>
              <Menu.Item
                onPress={() =>
                  GlobalAlertManager.show(
                    'Thông báo',
                    'Chức năng chưa phát triển',
                  )
                }
                title="Đang theo dõi"
              />
              <Menu.Item
                onPress={() =>
                  GlobalAlertManager.show(
                    'Thông báo',
                    'Chức năng chưa phát triển',
                  )
                }
                title="Yêu thích"
              />
              <Divider />
            </Menu>
          )}
          {iconBack && (
            <TouchableOpacity style={styles.iconBox} onPress={func}>
              <Image
                source={iconBack}
                style={[styles.icon, {tintColor: color.text}]}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.centerSection}>
          {title && (
            <Text style={[styles.title, {color: color.text}]}>{title}</Text>
          )}
          {pressableTitle && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={pressableTilFunc}>
              <Text style={[styles.title, {color: color.text}]}>
                {pressableTitle}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.rightSection}>
          {iconQR && (
            <TouchableOpacity
              style={styles.iconBox}
              onPress={() => navigation.navigate('QRCode')}>
              <Image
                source={iconQR}
                style={[styles.icon, {tintColor: color.text}]}
              />
            </TouchableOpacity>
          )}
          {iconNotify && (
            <TouchableOpacity
              style={styles.iconBox}
              onPress={() => {
                navigation.navigate('NotificationsScreen');
              }}>
              <Image
                source={iconNotify}
                style={[styles.icon, {tintColor: color.text}]}
              />
              {unreadCount > 0 || isReadNoti && (
                <View style={[styles.badge, {backgroundColor: color.primary}]}/>
              )}
            </TouchableOpacity>
          )}
          {iconMessage && (
            <TouchableOpacity
              style={styles.iconBox}
              onPress={() => {
                navigation.navigate('MessageBox');
              }}>
              <Image
                source={iconMessage}
                style={[styles.icon, {tintColor: color.text}]}
              />
            </TouchableOpacity>
          )}
          {iconLeft && (
            <TouchableOpacity style={styles.iconBox} onPress={funcLeft}>
              <Image
                source={iconLeft}
                style={[styles.icon, {tintColor: color.text}]}
              />
            </TouchableOpacity>
          )}
          {iconNewChat && (
            <TouchableOpacity style={styles.iconBox} onPress={func}>
              <Image
                source={iconNewChat}
                style={[styles.icon, {tintColor: color.text}]}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    paddingVertical: 10,
    height: 60,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerSection: {
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 30,
    marginLeft: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  iconBox: {
    width: 20,
    height: 20,
    marginLeft: 20,
  },
  icon: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  badge: {
  position: 'absolute',
  top: -4,
  right: -4,
  minWidth: 10,
  height: 10,
  borderRadius: 8,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 4,
  zIndex: 1,
},
});

export default Header;
