import {Colors} from '@assets/color/Colors';
import {X} from 'lucide-react-native';
import React from 'react';
import {Modal, View, TouchableOpacity, Image, StyleSheet} from 'react-native';

interface Props {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<Props> = ({visible, imageUri, onClose}) => {
  return (
    <Modal visible={visible} transparent={true}>
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        {/* Close button */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
          activeOpacity={0.8}
        >
          <View style={styles.closeButtonBackground}>
            <X size={26} color={Colors.white} />
          </View>
        </TouchableOpacity>
        
        {imageUri && (
          <TouchableOpacity 
            style={styles.imageContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Image
              source={{uri: imageUri}}
              style={styles.image}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Modal>
  );
};

export default ImagePreviewModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: '8%',
    right: '5%',
    zIndex: 1,
  },
  closeButtonBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '90%',
    height: '70%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});