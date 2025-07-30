import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {PanGestureHandler, State} from 'react-native-gesture-handler';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

interface DraggableCaptionProps {
  text: string;
  initialX?: number; // percentage (0-100)
  initialY?: number; // percentage (0-100)
  onPositionChange?: (x: number, y: number) => void; // callback with percentage values
  style?: any;
  textStyle?: any;
  draggable?: boolean;
  onPress?: () => void;
  renderText?: (text: string) => React.ReactNode;
}

export const DraggableCaption: React.FC<DraggableCaptionProps> = ({
  text,
  initialX = 10,
  initialY = 20,
  onPositionChange,
  style,
  textStyle,
  draggable = true,
  onPress,
  renderText,
}) => {
  // ✅ Sử dụng Animated.Value để quản lý vị trí caption một cách chính xác
  const captionPositionX = useRef(new Animated.Value(0)).current;
  const captionPositionY = useRef(new Animated.Value(0)).current;

  // ✅ Lưu trữ vị trí thực tế để tính toán chính xác
  const [captionPosition, setCaptionPosition] = useState({
    x: initialX,
    y: initialY,
  });

  // ✅ Lưu trữ kích thước thực tế của caption
  const [captionSize, setCaptionSize] = useState({
    width: 0,
    height: 0,
  });

  // ✅ Khởi tạo vị trí ban đầu
  useEffect(() => {
    setCaptionPosition({x: initialX, y: initialY});
  }, [initialX, initialY]);

  // ✅ Xử lý gesture cho caption với PanGestureHandler
  const onCaptionGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: captionPositionX,
          translationY: captionPositionY,
        },
      },
    ],
    {useNativeDriver: false},
  );

  const onCaptionHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      // ✅ Tính toán vị trí mới dựa trên translation
      const currentLeft = (captionPosition.x / 100) * screenWidth;
      const currentTop = (captionPosition.y / 100) * screenHeight;

      const newX = currentLeft + event.nativeEvent.translationX;
      const newY = currentTop + event.nativeEvent.translationY;

      // ✅ Sử dụng kích thước thực tế của caption để tính giới hạn
      const captionWidth = captionSize.width || screenWidth * 0.8;
      const captionHeight = captionSize.height || 50;

      // ✅ Giới hạn vị trí để caption không bị tràn ra ngoài màn hình
      const limitedX = Math.max(0, Math.min(screenWidth - captionWidth, newX));
      const limitedY = Math.max(
        0,
        Math.min(screenHeight - captionHeight, newY),
      );

      // ✅ Convert về percentage để lưu trữ
      const percentX = (limitedX / screenWidth) * 100;
      const percentY = (limitedY / screenHeight) * 100;

      const newPosition = {x: percentX, y: percentY};
      setCaptionPosition(newPosition);

      // ✅ Gọi callback nếu có
      onPositionChange?.(percentX, percentY);

      // ✅ Reset translation values
      captionPositionX.setValue(0);
      captionPositionY.setValue(0);
    }
  };

  // ✅ Xử lý onLayout để lấy kích thước thực tế của caption
  const handleLayout = (event: any) => {
    const {width, height} = event.nativeEvent.layout;
    setCaptionSize({width, height});
  };

  const left = (captionPosition.x / 100) * screenWidth;
  const top = (captionPosition.y / 100) * screenHeight;

  const captionContent = (
    <Animated.View
      style={[
        styles.textInputContainer,
        style,
        {
          position: 'absolute',
          left,
          top,
          transform: draggable
            ? [
                {
                  translateX: captionPositionX,
                },
                {
                  translateY: captionPositionY,
                },
              ]
            : undefined,
        },
      ]}
      onLayout={handleLayout}>
      {renderText ? (
        renderText(text)
      ) : (
        <Text style={[styles.captionText, textStyle]}>{text}</Text>
      )}
    </Animated.View>
  );

  if (!draggable) {
    return (
      <TouchableOpacity
        style={captionContent.props.style}
        onPress={onPress}
        activeOpacity={onPress ? 0.8 : 1}>
        {captionContent.props.children}
      </TouchableOpacity>
    );
  }

  return (
    <PanGestureHandler
      onGestureEvent={onCaptionGestureEvent}
      onHandlerStateChange={onCaptionHandlerStateChange}>
      {captionContent}
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  textInputContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 5,
    minWidth: 100,
    maxWidth: screenWidth * 0.8,
  },
  captionText: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    flexShrink: 1,
  },
});
