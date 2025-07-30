import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    zIndex: 10,
    width: '100%',
  },
  viewUser: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    left: 10,
    top: 20,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 50,
  },
  nameUser: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  textTime: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  btnCloser: {
    position: 'absolute',
    right: 10,
    top: 20,
    borderRadius: 50,
    width: 30,
    height: 30,
    backgroundColor: 'rgba(140, 137, 137, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pause: {
    position: 'absolute',
    right: 50,
    top: 23,
    borderRadius: 50,
    width: 30,
    height: 30,
  },
  mute: {
    position: 'absolute',
    right: 90,
    top: 23,
    borderRadius: 50,
    width: 30,
    height: 30,
  },
  iconCloser: {
    width: 15,
    height: 15,
    tintColor: '#fff',
  },
  ViewMedia: {
    flex: 1,
  },
  mediaItems: {
    marginBottom: 15,
    top: 5,
  },
  mediaWrapper: {
    flex: 1,
    position: 'relative',
  },
  mediaTouchArea: {
    flex: 1,
    position: 'relative',
  },
  media: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  progressContainer: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 5,
  },
  progressBarWrapper: {
    flex: 1,
    height: 3,
    backgroundColor: '#888',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    flex: 1,
    padding: 15,
  },
  viewBottom: {
    margin: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignContent: 'center',
  },
  input: {
    width: '75%',
    borderWidth: 1,
    borderColor: '#fff',
    color: '#fff',
    padding: 10,
    borderRadius: 15,
    height: 40,
  },
  icon: {
    height: 30,
    width: 30,
    tintColor: '#fff',
  },
  viewIcon: {
    width: '20%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
