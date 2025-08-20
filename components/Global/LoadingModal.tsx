import React, {useEffect, useRef} from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Image,
  Easing,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../src/util/ThemeContext';
import {Colors} from '@assets/color/Colors';

const SIZE = 40;
const BORDER_WIDTH = 4;
const OUTER_SIZE = SIZE + BORDER_WIDTH * 2;
const LOGO_PADDING = 2;

const GRADIENTS = ['#ffffff', '#d8f1ff', '#56c8ff', '#0073e6', '#003366'];

const LOGO_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0073e6',
    shadowOpacity: 0.24,
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 12,
  },
  android: {elevation: 11},
});

interface LoadingModalProps {
  withBackdrop?: boolean;
  inline?: boolean;
}

const LoadingModal: React.FC<LoadingModalProps> = ({
  withBackdrop = false,
  inline = false,
}) => {
  const {theme} = useTheme();
  const color = Colors[theme];
  const rotate = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 1150,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [rotate, shimmer]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getContainerStyle = () => {
    if (withBackdrop) return styles.backdrop;
    if (inline) return styles.inlineContainer;
    return styles.container;
  };

  return (
    <View style={getContainerStyle()}>
      <Animated.View
        style={[
          styles.gradientBorder,
          {
            transform: [{rotate: rotateInterpolate}],
            borderRadius: OUTER_SIZE / 2,
            backgroundColor: color.background,
            shadowColor: '#0073e6',
            shadowOpacity: theme === 'dark' ? 0.28 : 0.13,
            shadowOffset: {width: 0, height: 3},
            shadowRadius: 11,
            elevation: 9,
            overflow: 'visible',
          },
        ]}>
        <LinearGradient
          colors={GRADIENTS}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={{
            width: OUTER_SIZE,
            height: OUTER_SIZE,
            borderRadius: OUTER_SIZE / 2,
            opacity: 0.98,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: BORDER_WIDTH,
            top: BORDER_WIDTH,
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor:
              theme === 'dark' ? '#182C3A' : 'rgba(255,255,255,0.97)',
            opacity: 0.93,
          }}
        />
      </Animated.View>

      <View
        style={[
          styles.logoWrap,
          LOGO_SHADOW,
          {
            backgroundColor:
              theme === 'dark' ? '#142237EE' : 'rgba(255,255,255,0.9)',
            borderColor: '#e2eafe',
            borderWidth: 0.5,
          },
        ]}>
        <Image
          source={require('@assets/icon/logo_loading.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,38,60,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  inlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  gradientBorder: {
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    opacity: 0.99,
  },
  logoWrap: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    padding: LOGO_PADDING,
  },
  logo: {
    width: SIZE - LOGO_PADDING * 2,
    height: SIZE - LOGO_PADDING * 2,
  },
});

export default LoadingModal;