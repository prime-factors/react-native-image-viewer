import * as React from 'react';

import {
  Animated,
  Dimensions,
  I18nManager,
  Image,
  PanResponder,
  Platform,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle
} from 'react-native';
import ImageZoom from 'react-native-image-pan-zoom';
import styles, { simpleStyle } from './image-viewer.style';
import { IImageInfo, IImageSize, Props, State } from './image-viewer.type';

export default class ImageViewer extends React.Component<Props, State> {
  public static defaultProps = new Props();
  public state = new State();

  // 背景透明度渐变动画
  private fadeAnim = new Animated.Value(0);

  // 当前基准位置
  private standardPositionX = 0;

  // 整体位移，用来切换图片用
  private positionXNumber = 0;
  private positionX = new Animated.Value(0);

  private width = 0;
  private height = 0;

  private styles = styles(0, 0, 'transparent');

  // 是否执行过 layout. fix 安卓不断触发 onLayout 的 bug
  private hasLayout = false;

  // 记录已加载的图片 index
  private loadedIndex = new Map<number, boolean>();

  private handleLongPressWithIndex = new Map<number, any>();

  private imageRefs: any[] = [];

  public componentDidMount() {
    this.init(this.props);
  }

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (nextProps.index !== prevState.prevIndexProp) {
      return { currentShowIndex: nextProps.index, prevIndexProp: nextProps.index };
    }
    return null;
  }

  public componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.index !== this.props.index) {
      // 立刻预加载要看的图
      this.loadImage(this.props.index || 0);

      this.jumpToCurrentImage();

      // 显示动画
      Animated.timing(this.fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: !!this.props.useNativeDriver
      }).start();
    }
  }

  /**
   * props 有变化时执行
   */
  public init(nextProps: Props) {
    if (nextProps.imageUrls.length === 0) {
      // 隐藏时候清空
      this.fadeAnim.setValue(0);
      return this.setState(new State());
    }

    // 给 imageSizes 塞入空数组
    const imageSizes: IImageSize[] = [];
    nextProps.imageUrls.forEach(imageUrl => {
      imageSizes.push({
        width: imageUrl.width || 0,
        height: imageUrl.height || 0,
        status: 'loading'
      });
    });

    this.setState(
      {
        currentShowIndex: nextProps.index,
        prevIndexProp: nextProps.index || 0,
        imageSizes
      },
      () => {
        // 立刻预加载要看的图
        this.loadImage(nextProps.index || 0);

        this.jumpToCurrentImage();

        // 显示动画
        Animated.timing(this.fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: !!nextProps.useNativeDriver
        }).start();
      }
    );
  }
  /**
   * reset Image scale and position
   */
  public resetImageByIndex = (index: number) => {
    this.imageRefs[index] && this.imageRefs[index].reset();
  };
  /**
   * 调到当前看图位置
   */
  public jumpToCurrentImage() {
    // 跳到当前图的位置
    this.positionXNumber = this.width * (this.state.currentShowIndex || 0) * (I18nManager.isRTL ? 1 : -1);
    this.standardPositionX = this.positionXNumber;
    this.positionX.setValue(this.positionXNumber);
  }

  /**
   * 加载图片，主要是获取图片长与宽
   */
  public loadImage(index: number) {
    if (!this!.state!.imageSizes![index]) {
      return;
    }

    if (this.loadedIndex.has(index)) {
      return;
    }
    this.loadedIndex.set(index, true);

    const image = this.props.imageUrls[index];
    const imageStatus = { ...this!.state!.imageSizes![index] };

    // 保存 imageSize
    const saveImageSize = () => {
      // 如果已经 success 了，就不做处理
      if (this!.state!.imageSizes![index] && this!.state!.imageSizes![index].status !== 'loading') {
        return;
      }

      const imageSizes = this!.state!.imageSizes!.slice();
      imageSizes[index] = imageStatus;
      this.setState({ imageSizes });
    };

    if (this!.state!.imageSizes![index].status === 'success') {
      // 已经加载过就不会加载了
      return;
    }

    // 如果已经有宽高了，直接设置为 success
    if (this!.state!.imageSizes![index].width > 0 && this!.state!.imageSizes![index].height > 0) {
      imageStatus.status = 'success';
      saveImageSize();
      return;
    }

    // 是否加载完毕了图片大小
    const sizeLoaded = false;
    // 是否加载完毕了图片
    let imageLoaded = false;

    // Tagged success if url is started with file:, or not set yet(for custom source.uri).
    if (!image.url || image.url.startsWith(`file:`)) {
      imageLoaded = true;
    }

    // 如果已知源图片宽高，直接设置为 success
    if (image.width && image.height) {
      if (this.props.enablePreload && imageLoaded === false) {
        Image.prefetch(image.url);
      }
      imageStatus.width = image.width;
      imageStatus.height = image.height;
      imageStatus.status = 'success';
      saveImageSize();
      return;
    }

    Image.getSize(
      image.url,
      (width: number, height: number) => {
        imageStatus.width = width;
        imageStatus.height = height;
        imageStatus.status = 'success';
        saveImageSize();
      },
      () => {
        try {
          const data = (Image as any).resolveAssetSource(image.props.source);
          imageStatus.width = data.width;
          imageStatus.height = data.height;
          imageStatus.status = 'success';
          saveImageSize();
        } catch (newError) {
          // Give up..
          imageStatus.status = 'fail';
          saveImageSize();
        }
      }
    );
  }

  /**
   * 预加载图片
   */
  public preloadImage = (index: number) => {
    if (index < this.state.imageSizes!.length) {
      this.loadImage(index + 1);
    }
  };
  /**
   * 触发溢出水平滚动
   */
  public handleHorizontalOuterRangeOffset = (offsetX: number = 0) => {
    this.positionXNumber = this.standardPositionX + offsetX;
    this.positionX.setValue(this.positionXNumber);

    const offsetXRTL = !I18nManager.isRTL ? offsetX : -offsetX;

    if (offsetXRTL < 0) {
      if (this!.state!.currentShowIndex || 0 < this.props.imageUrls.length - 1) {
        this.loadImage((this!.state!.currentShowIndex || 0) + 1);
      }
    } else if (offsetXRTL > 0) {
      if (this!.state!.currentShowIndex || 0 > 0) {
        this.loadImage((this!.state!.currentShowIndex || 0) - 1);
      }
    }
  };

  /**
   * 手势结束，但是没有取消浏览大图
   */
  public handleResponderRelease = (vx: number = 0) => {
    const vxRTL = I18nManager.isRTL ? -vx : vx;
    const isLeftMove = I18nManager.isRTL
      ? this.positionXNumber - this.standardPositionX < -(this.props.flipThreshold || 0)
      : this.positionXNumber - this.standardPositionX > (this.props.flipThreshold || 0);
    const isRightMove = I18nManager.isRTL
      ? this.positionXNumber - this.standardPositionX > (this.props.flipThreshold || 0)
      : this.positionXNumber - this.standardPositionX < -(this.props.flipThreshold || 0);

    if (vxRTL > 0.7) {
      // 上一张
      this.goBack.call(this);

      // 这里可能没有触发溢出滚动，为了防止图片不被加载，调用加载图片
      if (this.state.currentShowIndex || 0 > 0) {
        this.loadImage((this.state.currentShowIndex || 0) - 1);
      }
      return;
    } else if (vxRTL < -0.7) {
      // 下一张
      this.goNext.call(this);
      if (this.state.currentShowIndex || 0 < this.props.imageUrls.length - 1) {
        this.loadImage((this.state.currentShowIndex || 0) + 1);
      }
      return;
    }

    if (isLeftMove) {
      // 上一张
      this.goBack.call(this);
    } else if (isRightMove) {
      // 下一张
      this.goNext.call(this);
      return;
    } else {
      // 回到之前的位置
      this.resetPosition.call(this);
      return;
    }
  };

  /**
   * 到上一张
   */
  public goBack = () => {
    if (this.state.currentShowIndex === 0) {
      // 回到之前的位置
      this.resetPosition.call(this);
      return;
    }

    this.positionXNumber = !I18nManager.isRTL
      ? this.standardPositionX + this.width
      : this.standardPositionX - this.width;
    this.standardPositionX = this.positionXNumber;
    Animated.timing(this.positionX, {
      toValue: this.positionXNumber,
      duration: this.props.pageAnimateTime,
      useNativeDriver: !!this.props.useNativeDriver
    }).start();

    const nextIndex = (this.state.currentShowIndex || 0) - 1;

    this.setState(
      {
        currentShowIndex: nextIndex
      },
      () => {
        if (this.props.onChange) {
          this.props.onChange(this.state.currentShowIndex);
        }
      }
    );
  };

  /**
   * 到下一张
   */
  public goNext = () => {
    if (this.state.currentShowIndex === this.props.imageUrls.length - 1) {
      // 回到之前的位置
      this.resetPosition.call(this);
      return;
    }

    this.positionXNumber = !I18nManager.isRTL
      ? this.standardPositionX - this.width
      : this.standardPositionX + this.width;
    this.standardPositionX = this.positionXNumber;
    Animated.timing(this.positionX, {
      toValue: this.positionXNumber,
      duration: this.props.pageAnimateTime,
      useNativeDriver: !!this.props.useNativeDriver
    }).start();

    const nextIndex = (this.state.currentShowIndex || 0) + 1;

    this.setState(
      {
        currentShowIndex: nextIndex
      },
      () => {
        if (this.props.onChange) {
          this.props.onChange(this.state.currentShowIndex);
        }
      }
    );
  };

  /**
   * 回到原位
   */
  public resetPosition() {
    this.positionXNumber = this.standardPositionX;
    Animated.timing(this.positionX, {
      toValue: this.standardPositionX,
      duration: 150,
      useNativeDriver: !!this.props.useNativeDriver
    }).start();
  }

  /**
   * 长按
   */
  public handleLongPress = (image: IImageInfo) => {
    if (this.props.onLongPress) {
      this.props.onLongPress(image);
    }
  };

  /**
   * 单击
   */
  public handleClick = () => {
    if (this.props.onClick) {
      this.props.onClick(this.handleCancel, this.state.currentShowIndex);
    }
  };

  /**
   * 双击
   */
  public handleDoubleClick = () => {
    if (this.props.onDoubleClick) {
      this.props.onDoubleClick(this.handleCancel);
    }
  };

  /**
   * 退出
   */
  public handleCancel = () => {
    this.hasLayout = false;
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  };

  /**
   * 完成布局
   */
  public handleLayout = (event: any) => {
    if (event.nativeEvent.layout.width !== this.width) {
      this.hasLayout = true;

      // Always use full screen dimensions for edge-to-edge display
      const screenData = Dimensions.get('screen');
      this.width = screenData.width;
      this.height = screenData.height;

      this.styles = styles(this.width, this.height, this.props.backgroundColor || 'transparent');

      // 强制刷新
      this.forceUpdate();
      this.jumpToCurrentImage();
    }
  };

  /**
   * 获得整体内容
   */
  public getContent() {
    // 获得屏幕宽高
    const screenWidth = this.width;
    const screenHeight = this.height;

    const ImageElements = this.props.imageUrls.map((image, index) => {
      if ((this.state.currentShowIndex || 0) > index + 1 || (this.state.currentShowIndex || 0) < index - 1) {
        return <View key={index} style={{ width: screenWidth, height: screenHeight }} />;
      }

      if (!this.handleLongPressWithIndex.has(index)) {
        this.handleLongPressWithIndex.set(index, this.handleLongPress.bind(this, image));
      }

      let width = this!.state!.imageSizes![index] && this!.state!.imageSizes![index].width;
      let height = this.state.imageSizes![index] && this.state.imageSizes![index].height;
      const imageInfo = this.state.imageSizes![index];

      if (!imageInfo || !imageInfo.status) {
        return <View key={index} style={{ width: screenWidth, height: screenHeight }} />;
      }

      // 如果宽大于屏幕宽度,整体缩放到宽度是屏幕宽度
      if (width > screenWidth) {
        const widthPixel = screenWidth / width;
        width *= widthPixel;
        height *= widthPixel;
      }

      // 如果此时高度还大于屏幕高度,整体缩放到高度是屏幕高度
      if (height > screenHeight) {
        const HeightPixel = screenHeight / height;
        width *= HeightPixel;
        height *= HeightPixel;
      }

      const Wrapper = ({ children, ...others }: any) => (
        <ImageZoom
          cropWidth={this.width}
          cropHeight={this.height}
          maxOverflow={this.props.maxOverflow}
          horizontalOuterRangeOffset={this.handleHorizontalOuterRangeOffset}
          responderRelease={this.handleResponderRelease}
          onMove={this.props.onMove}
          onLongPress={this.handleLongPressWithIndex.get(index)}
          onClick={this.handleClick}
          onDoubleClick={this.handleDoubleClick}
          enableSwipeDown={this.props.enableSwipeDown}
          swipeDownThreshold={this.props.swipeDownThreshold}
          onSwipeDown={this.handleSwipeDown}
          pinchToZoom={this.props.enableImageZoom}
          enableDoubleClickZoom={this.props.enableImageZoom}
          doubleClickInterval={this.props.doubleClickInterval}
          {...others}
        >
          {children}
        </ImageZoom>
      );

      switch (imageInfo.status) {
        case 'loading':
          return (
            <Wrapper
              key={index}
              style={{
                ...this.styles.modalContainer,
                ...this.styles.loadingContainer
              }}
              imageWidth={screenWidth}
              imageHeight={screenHeight}
            >
              <View style={this.styles.loadingContainer}>{this!.props!.loadingRender!()}</View>
            </Wrapper>
          );
        case 'success':
          if (!image.props) {
            image.props = {};
          }

          if (!image.props.style) {
            image.props.style = {};
          }
          image.props.style = {
            ...this.styles.imageStyle, // User config can override above.
            ...image.props.style,
            width,
            height
          };

          if (typeof image.props.source === 'number') {
            // source = require(..), doing nothing
          } else {
            if (!image.props.source) {
              image.props.source = {};
            }
            image.props.source = {
              uri: image.url,
              ...image.props.source
            };
          }
          if (this.props.enablePreload) {
            this.preloadImage(this.state.currentShowIndex || 0);
          }
          return (
            <ImageZoom as any
              key={index}
              // @ts-ignore - ImageZoom children prop type issue
              ref={el => (this.imageRefs[index] = el)}
              cropWidth={this.width}
              cropHeight={this.height}
              maxOverflow={this.props.maxOverflow}
              horizontalOuterRangeOffset={this.handleHorizontalOuterRangeOffset}
              responderRelease={this.handleResponderRelease}
              onMove={this.props.onMove}
              onLongPress={this.handleLongPressWithIndex.get(index)}
              onClick={this.handleClick}
              onDoubleClick={this.handleDoubleClick}
              imageWidth={width}
              imageHeight={height}
              enableSwipeDown={this.props.enableSwipeDown}
              swipeDownThreshold={this.props.swipeDownThreshold}
              onSwipeDown={this.handleSwipeDown}
              panToMove={!this.state.isShowMenu}
              pinchToZoom={this.props.enableImageZoom && !this.state.isShowMenu}
              enableDoubleClickZoom={this.props.enableImageZoom && !this.state.isShowMenu}
              doubleClickInterval={this.props.doubleClickInterval}
              minScale={this.props.minScale}
              maxScale={this.props.maxScale}
            >
              {this!.props!.renderImage!(image.props)}
            </ImageZoom>
          );
        case 'fail':
          return (
            <Wrapper
              key={index}
              style={this.styles.modalContainer}
              imageWidth={this.props.failImageSource ? this.props.failImageSource.width : screenWidth}
              imageHeight={this.props.failImageSource ? this.props.failImageSource.height : screenHeight}
            >
              {this.props.failImageSource &&
                this!.props!.renderImage!({
                  source: {
                    uri: this.props.failImageSource.url
                  },
                  style: {
                    width: this.props.failImageSource.width,
                    height: this.props.failImageSource.height
                  }
                })}
            </Wrapper>
          );
      }
    });

    const currentStyles = simpleStyle({
      color: this.props.countTextColor,
      fontSize: this.props.countTextFontSize,
      fontWeight: this.props.countTextFontWeight,
      top: this.props.countTextTop
    });

    const indicator = this.props.renderIndicator ? (
      this.props.renderIndicator((this.state.currentShowIndex || 0) + 1, this.props.imageUrls.length)
    ) : (
      <View style={currentStyles.count}>
        <Text style={currentStyles.countText}>
          {`${(this.state.currentShowIndex || 0) + 1}/${this.props.imageUrls.length}`}
        </Text>
      </View>
    );

    return (
      <Animated.View style={{ zIndex: 9 }}>
        <Animated.View style={{ ...this.styles.container, opacity: this.fadeAnim }}>
          {this!.props!.renderHeader!(this.state.currentShowIndex)}

          <View style={this.styles.arrowLeftContainer}>
            <TouchableWithoutFeedback onPress={this.goBack}>
              <View>{this!.props!.renderArrowLeft!()}</View>
            </TouchableWithoutFeedback>
          </View>

          <View style={this.styles.arrowRightContainer}>
            <TouchableWithoutFeedback onPress={this.goNext}>
              <View>{this!.props!.renderArrowRight!()}</View>
            </TouchableWithoutFeedback>
          </View>

          <Animated.View
            style={{
              ...this.styles.moveBox,
              transform: [{ translateX: this.positionX }],
              width: this.width * this.props.imageUrls.length
            }}
          >
            {ImageElements}
          </Animated.View>
          {indicator}

          {this.props.imageUrls[this.state.currentShowIndex || 0] &&
            this.props.imageUrls[this.state.currentShowIndex || 0].originSizeKb &&
            this.props.imageUrls[this.state.currentShowIndex || 0].originUrl && (
              <View style={this.styles.watchOrigin}>
                <TouchableOpacity style={this.styles.watchOriginTouchable}>
                  <Text style={this.styles.watchOriginText}>查看原图(2M)</Text>
                </TouchableOpacity>
              </View>
            )}
          <View style={[{ bottom: 0, position: 'absolute', zIndex: 9 }, this.props.footerContainerStyle]}>
            {this!.props!.renderFooter!(this.state.currentShowIndex || 0)}
          </View>
        </Animated.View>
      </Animated.View>
    );
  }

  public handleLeaveMenu = () => {
    this.setState({ isShowMenu: false });
  };

  public handleSwipeDown = () => {
    if (this.props.onSwipeDown) {
      this.props.onSwipeDown();
    }
    this.handleCancel();
  };

  public render() {
    let childs: React.ReactElement<any> = null as any;

    childs = (
      <View>
        {this.getContent()}
      </View>
    );

    // Always use absolute positioning for edge-to-edge display
    const containerStyle: ViewStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      ...this.props.style
    };

    return (
      <View
        onLayout={this.handleLayout}
        style={containerStyle}
      >
        {childs}
      </View>
    );
  }
}
