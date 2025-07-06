import 'react-native-gesture-handler';
import React, {useEffect} from 'react';
import {enableScreens} from 'react-native-screens';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './Navigation/AppNavigation';
import {ThemeProvider} from './util/ThemeContext';
import {Host} from 'react-native-portalize';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import 'fast-text-encoding';
import {Provider} from 'react-redux';
import {persistor, store} from '../services/store';
import {PersistGate} from 'redux-persist/integration/react';
import {UploadProvider} from '../services/UploadProgressManager';
import Toast from 'react-native-toast-message';
import {Buffer} from 'buffer';
import {TabLoadingProvider} from '../services/TabLoadingContext';
import {SocketProvider} from '../services/SocketContext';
import {KeyboardAvoidingView} from 'react-native';
import {navigationRef} from './NavigationService';
import {
  GlobalAlert,
  GlobalAlertManager,
  GlobalAlertRef,
} from '../components/Global/AlertModal';
import NotificationModal from '@services/notification/NotificationModal';
import {createNotificationChannel} from '@services/notification/notification';
import {useNotificationHandler} from '@services/notification/useNotification';
import {LogBox} from 'react-native';

LogBox.ignoreLogs(['Warning: componentWillReceiveProps has been renamed']);

global.Buffer = Buffer;

if (__DEV__) {
  import('./config/ReactotronConfig').then(() =>
    console.tron.log('Reactotron Configured ✅'),
  );
}

enableScreens();


const App = () => {
  useEffect(() => {
    createNotificationChannel();
  }, []);

  const {modalData, clearModal} = useNotificationHandler(data => {
    if (!navigationRef.isReady()) return;

    switch (data?.type) {
      case 'post':
        navigationRef.navigate('PostDetail', {postId: data.id});
        break;
      case 'call':
        navigationRef.navigate('ZegoCallScreen', {
          callID: data.callId,
          userID: data.userId,
          userName: data.userName,
          image: data.image,
          isCaller: false,
        });
        break;
      case 'message':

        navigationRef.navigate('MessageScreen', {
          room: data?.roomId,
          isWaiting: data?.isWaiting,
        });
        break;

      default:
        break;
    }
  });
  const handleAlertRef = (ref: GlobalAlertRef | null) => {
    if (ref) {
      GlobalAlertManager.setAlertRef(ref);
    }
  };

  return (
    <>
      <AppNavigator />
      <Toast />
      {modalData && (
        <NotificationModal
          visible={true}
          title={modalData.title}
          body={modalData.body}
          onClose={clearModal}
          onAction={() => {
            clearModal();
            if (modalData.data) {
              switch (modalData.data.type) {
                case 'post':
                  navigationRef.navigate('PostDetail', {
                    postId: modalData.data.id,
                  });
                  break;
                case 'call':
                  navigationRef.navigate('ZegoCallScreen', {
                    callID: modalData.data.callId,
                    userID: modalData.data.userId,
                    userName: modalData.data.userName,
                    image: modalData.data.image,
                    isCaller: false,
                  });
                  break;
                case 'message':
                  navigationRef.navigate('MessageScreen', {
                    roomId: modalData.data.roomId,
                  });
                  break;
              }
            }
          }}
        />
      )}
      <GlobalAlert ref={handleAlertRef} />
    </>
  );
};

const App = () => {
  useEffect(() => {
    createNotificationChannel();
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <SocketProvider>
            <ThemeProvider>
              <KeyboardAvoidingView style={{flex: 1}}>
                <SafeAreaProvider>
                  <Host>
                    <UploadProvider>
                      <TabLoadingProvider>
                        <AppContent />
                      </TabLoadingProvider>
                    </UploadProvider>
                  </Host>
                </SafeAreaProvider>
              </KeyboardAvoidingView>
            </ThemeProvider>
          </SocketProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
};

export default App;