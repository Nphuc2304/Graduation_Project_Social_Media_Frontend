import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {useProfileEditingStyles} from './components/ProfileEditingStyles';
import {UserInfo} from './components/UserInfo';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {PermissionsAndroid, Platform} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from '../../../services/store';
import {fetchEditUser} from '../../../services/userRedux/userSlice';
import {ChevronLeft} from 'lucide-react-native';
import {SEX, VN_PROVINCES} from './DataAddress/VN_PROVINCES';
import {uploadImageToR2} from '../../core/upload';
import {useUploadProgress} from '../../../services/UploadProgressManager';
import {GlobalAlertManager} from '../../../components/Global/AlertModal';
import {useTheme} from '../../../src/util/ThemeContext';
import {Colors} from '../../../assets/color/Colors';
import {checkProfanityAndAlert} from '../../util/profanityFilter';

async function requestCameraPermission() {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Quyền truy cập Camera',
      message: 'Bạn cần cho phép ứng dụng sử dụng hình ảnh từ thiết bị',
      buttonNeutral: 'Hỏi lại sau',
      buttonNegative: 'Huỷ',
      buttonPositive: 'Đồng ý',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export const EditProfile = () => {
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.user.user);
  const styles = useProfileEditingStyles();
  const dispatch = useDispatch<AppDispatch>();
  const {showUploadModal, hideUploadModal, setProgress} = useUploadProgress();
  const [username, setUsername] = useState(user?.username);
  const [bio, setBio] = useState(user?.bio);
  const [email, setEmail] = useState(user?.email);
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber);
  const [gender, setGender] = useState(user?.gender);
  const [address, setAddress] = useState(user?.address);
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth);
  const [edit, setEdit] = useState(false);
  const [handleName, setHandleName] = useState(user?.handleName);
  const [profilePic, setProfilePic] = useState(user?.profilePic);
  const [modalVisible, setModalVisible] = useState(false);
  const {theme} = useTheme();
  const palette = Colors[theme];

  // Date validation function
  const validateDateOfBirth = (
    dateStr?: string,
  ): {isValid: boolean; error?: string} => {
    if (!dateStr || dateStr === 'dd - MM - yyyy') {
      return {isValid: true}; // Empty date is allowed
    }

    // Convert display format back to check
    const cleanDate = dateStr.replace(/[\s-]/g, '');

    if (cleanDate.length !== 10) {
      console.log(cleanDate);
      return {isValid: false, error: 'Ngày sinh không đầy đủ'};
    }

    const day = parseInt(cleanDate.slice(0, 2));
    const month = parseInt(cleanDate.slice(3, 5));
    const year = parseInt(cleanDate.slice(6, 10));

    // Basic validation
    if (day < 1 || day > 31) {
      console.log(day);
      return {isValid: false, error: 'Ngày không hợp lệ (01-31)'};
    }

    if (month < 1 || month > 12) {
      console.log(month);
      return {isValid: false, error: 'Tháng không hợp lệ (01-12)'};
    }

    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) {
      console.log(year);
      return {isValid: false, error: `Năm không hợp lệ (1900-${currentYear})`};
    }

    // Check if date exists
    const testDate = new Date(year, month - 1, day);
    if (
      testDate.getDate() !== day ||
      testDate.getMonth() !== month - 1 ||
      testDate.getFullYear() !== year
    ) {
      return {isValid: false, error: 'Ngày không tồn tại'};
    }

    // Check if date is not in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (testDate > today) {
      return {isValid: false, error: 'Ngày sinh không thể là tương lai'};
    }

    return {isValid: true};
  };

  // Validate required fields
  const validateRequiredFields = (): {isValid: boolean; error?: string} => {
    if (!handleName || handleName.trim() === '') {
      return {isValid: false, error: 'Tên tài khoản là bắt buộc'};
    }

    if (!email || email.trim() === '') {
      return {isValid: false, error: 'Email là bắt buộc'};
    }

    return {isValid: true};
  };

  // Hàm upload ảnh và cập nhật profilePic
  const uploadProfilePic = async (uri: string) => {
    try {
      showUploadModal(uri, 'image');
      const publicUrl = await uploadImageToR2(uri, {
        showUploadModal,
        hideUploadModal,
        setProgress,
      });
      setProfilePic(publicUrl);
    } catch (error) {
      console.error('Upload profile picture failed:', error);
      GlobalAlertManager.show(
        'Lỗi',
        'Không thể upload ảnh đại diện. Vui lòng thử lại.',
      );
    } finally {
      hideUploadModal();
      setModalVisible(false);
    }
  };

  const pickImage = () => {
    launchImageLibrary({mediaType: 'photo'}, async response => {
      if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        if (uri) {
          await uploadProfilePic(uri);
        }
      }
    });
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      console.log('Camera permission denied');
      return;
    }

    launchCamera({mediaType: 'photo', saveToPhotos: true}, async response => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.log('Camera error: ', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        if (uri) {
          await uploadProfilePic(uri);
        }
      }
    });
  };

  const handleSave = () => {
    // Validate required fields
    const requiredValidation = validateRequiredFields();
    if (!requiredValidation.isValid) {
      GlobalAlertManager.show(
        'Lỗi',
        requiredValidation.error || 'Vui lòng điền đầy đủ thông tin bắt buộc',
      );
      return;
    }
    const profanityCheck = [username ?? '', bio ?? '', handleName ?? ''];
    if (profanityCheck.some(field => checkProfanityAndAlert(field))) {
      return;
    }
    // Validate date of birth
    const dateValidation = validateDateOfBirth(dateOfBirth);
    if (!dateValidation.isValid) {
      GlobalAlertManager.show(
        'Lỗi ngày sinh',
        dateValidation.error || 'Ngày sinh không hợp lệ',
      );
      return;
    }

    // If all validations pass, proceed with save
    dispatch(
      fetchEditUser({
        username,
        bio,
        email,
        phoneNumber,
        gender,
        address,
        dateOfBirth,
        handleName,
        profilePic,
      }),
    );
    GlobalAlertManager.show('Thông báo', 'Sửa thông tin của bạn thành công');
    setEdit(false);
  };

  const handleEditToggle = () => {
    if (edit) {
      // When trying to finish editing, validate everything
      handleSave();
    } else {
      // When starting to edit, just toggle the state
      setEdit(true);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={35} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <TouchableOpacity
          onPress={handleEditToggle}
          style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={[styles.headerText, {color: '#3897F0'}]}>
            {edit ? 'Hoàn tất' : 'Sửa'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView>
        <View>
          <View style={styles.profileSection}>
            {profilePic && (
              <Image source={{uri: profilePic}} style={styles.avatar} />
            )}
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              {edit && (
                <Text style={styles.changeText}>Thay đổi ảnh đại diện</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <UserInfo
              rows={[
                {
                  label: 'Tên người dùng',
                  value: username,
                  onChangeText: setUsername,
                  editable: edit,
                  type: 'text',
                },
                {
                  label: 'Tên tài khoản *',
                  value: handleName,
                  onChangeText: setHandleName,
                  editable: false,
                  type: 'text',
                },
                {
                  label: 'Mô tả',
                  value: bio,
                  onChangeText: setBio,
                  editable: edit,
                  type: 'text',
                },
                {
                  label: 'Ngày sinh',
                  value: dateOfBirth,
                  onDateChange: setDateOfBirth,
                  editable: edit,
                  type: 'date',
                },
                {
                  label: 'Email *',
                  value: email,
                  onChangeText: setEmail,
                  editable: false,
                  type: 'text',
                },
                {
                  label: 'Số điện thoại',
                  value: phoneNumber,
                  onChangeText: setPhoneNumber,
                  editable: edit,
                  type: 'text',
                },
                {
                  label: 'Giới tính',
                  value: gender,
                  onChangeText: setGender,
                  editable: edit,
                  type: 'dropdown',
                  options: SEX,
                },
                {
                  label: 'Địa chỉ',
                  value: address,
                  onChangeText: setAddress,
                  editable: edit,
                  type: 'dropdown',
                  options: VN_PROVINCES,
                },
              ]}
            />
          </View>

          <Modal visible={modalVisible} transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <TouchableOpacity style={styles.btnModel} onPress={pickImage}>
                  <Text style={styles.textModel}>Chọn trong thư viện</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.btnModel,
                    {
                      borderColor: '#ccc',
                      borderBottomWidth: 0.5,
                      borderTopWidth: 1,
                    },
                  ]}
                  onPress={takePhoto}>
                  <Text style={styles.textModel}>Chụp ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnModel}
                  onPress={() => setModalVisible(false)}>
                  <Text style={styles.textModel}>Hủy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfile;
