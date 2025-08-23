import {
  Bookmark,
  Sparkles,
  Star,
  UserMinus,
  UserPlus,
  User2,
  EyeOff,
  Flag,
  Info,
} from 'lucide-react-native';
import {IntentionOptionConfig} from 'src/(tabs)/Home/components/BottomSheetIntentionsModal';
import {ConfigOption} from 'src/(tabs)/Home/components/BottomSheetOptionsModal';

export const icons = {
  bookmark: Bookmark,
  remix: Sparkles,
  star: Star,
  follow: UserPlus,
  unfollow: UserMinus,
  account: User2,
  info: Info,
  blind: EyeOff,
  report: Flag,
};

export const postTopOptions: Omit<ConfigOption, 'onPress'>[] = [
  {id: 'bookmark', icon: Bookmark, label: 'Lưu'},
];

export const postFirstList: Omit<ConfigOption, 'onPress'>[] = [
  {id: 'unfollow', icon: UserMinus, label: 'Bỏ theo dõi'},
];

export const postSecondList: Omit<ConfigOption, 'onPress'>[] = [
  {id: 'hide', icon: EyeOff, label: 'Ẩn'},
  {id: 'report', icon: Flag, label: 'Báo cáo', labelColor: '#FF0000'},
];

export const reportChoices: IntentionOptionConfig[] = [
  {
    id: 'HARASSMENT_AND_BULLYING', 
    label: 'Bắt nạt hoặc liên hệ theo cách không mong muốn'
  },
  {
    id: 'SELF_HARM',
    label: 'Tự tử, tự gây thương tích hoặc chứng rối loạn ăn uống',
  },
  {
    id: 'THREATS_AND_VIOLENCE', 
    label: 'Bạo lực, thù ghét hoặc bóc lột'
  },
  {
    id: 'SCAMS_AND_FRAUD', 
    label: 'Bán hoặc quảng cáo mặt hàng bị hạn chế'
  },
  {
    id: 'GRAPHIC_CONTENT', 
    label: 'Ảnh khỏa thân hoặc hoạt động tình dục'
  },
  {
    id: 'SCAMS_AND_FRAUD', 
    label: 'Lừa đảo, gian lận hoặc spam'
  },
  {
    id: 'HATE_SPEECH', 
    label: 'Thông tin sai sự thật'
  },
  {
    id: 'SENSITIVE_PERSONAL_INFO', 
    label: 'Quyền sở hữu trí tuệ'
  },
  {
    id: 'OTHER', 
    label: 'Khác'
  },
];
