import { Platform, TextStyle, ViewStyle } from 'react-native';

export default (
  width: number,
  height: number,
  backgroundColor: string
): {
  [x: string]: ViewStyle | TextStyle;
} => {
  return {
    modalContainer: { backgroundColor, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    watchOrigin: { position: 'absolute', width, bottom: 20, justifyContent: 'center', alignItems: 'center' },
    watchOriginTouchable: {
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 5,
      paddingBottom: 5,
      borderRadius: 30,
      borderColor: 'white',
      borderWidth: 0.5,
      backgroundColor: 'rgba(0, 0, 0, 0.1)'
    },
    watchOriginText: { color: 'white', backgroundColor: 'transparent' },
    imageStyle: {},
    container: { backgroundColor }, // 多图浏览需要调整整体位置的盒子
    moveBox: { flexDirection: 'row', alignItems: 'center' },
    operateContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'white',
      height: 40,
      borderBottomColor: '#ccc',
      borderBottomWidth: 1
    },
    operateText: { color: '#333' },
    loadingTouchable: { width, height },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    arrowLeftContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, justifyContent: 'center', zIndex: 13 },
    arrowRightContainer: { position: 'absolute', top: 0, bottom: 0, right: 0, justifyContent: 'center', zIndex: 13 }
  };
};

export const simpleStyle = (
  params: {
    color?: string;
    fontSize?: number;
    fontWeight?: 'bold' | 'normal' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    top?: number;
  } = {}
): {
  [x: string]: ViewStyle | TextStyle;
} => ({
  count: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: params.top || (Platform.OS === 'ios' ? 60 : 38),
    zIndex: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  countText: {
    color: params.color || 'white',
    fontSize: params.fontSize || 16,
    fontWeight: params.fontWeight || 'bold',
    backgroundColor: 'transparent',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {
      width: 0,
      height: 0.5
    },
    textShadowRadius: 0
  }
});
