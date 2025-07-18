import * as React from "react";
import { Flex, Text } from "@radix-ui/themes";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { setLoading } from "../store/backgroundSlice";
import { useAutoSwitch } from "../hooks/useAutoSwitch";
import { useTranslation } from "../locales";

export const Background: React.FC = () => {
  const { currentBackground, images, filters, backgroundType, solidBackground, gradientBackground, parallaxEnabled, shadowOverlay, borderlessBackground } = useAppSelector((state) => state.background);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  // Получаем URL текущего изображения по ID
  const currentImageUrl = React.useMemo(() => {
    if (!currentBackground || backgroundType !== 'image') return null;
    const currentImage = images.find(img => img.id === currentBackground);
    return currentImage?.url || null;
  }, [currentBackground, images, backgroundType]);

  // Используем хук автоматического переключения
  useAutoSwitch();

  // Состояние для двух слоев изображений
  const [primaryImage, setPrimaryImage] = React.useState<string | null>(null);
  const [secondaryImage, setSecondaryImage] = React.useState<string | null>(null);
  const [primaryLoaded, setPrimaryLoaded] = React.useState(false);
  const [secondaryLoaded, setSecondaryLoaded] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  // Флаг для отслеживания первой загрузки компонента
  const [isFirstImageLoaded, setIsFirstImageLoaded] = React.useState(false);

  // Состояние для параллакса
  const [mouseX, setMouseX] = React.useState(0);
  const [mouseY, setMouseY] = React.useState(0);

  // Создаем CSS фильтр из настроек
  const createFilterString = () => {
    return [
      `blur(${filters.blur}px)`,
      `brightness(${filters.brightness}%)`,
      `contrast(${filters.contrast}%)`,
      `saturate(${filters.saturate}%)`,
      `hue-rotate(${filters.hueRotate}deg)`,
      `sepia(${filters.sepia}%)`,
      `grayscale(${filters.grayscale}%)`,
      `invert(${filters.invert}%)`,
      `opacity(${filters.opacity}%)`
    ].join(' ');
  };

  // Вычисляем масштаб для компенсации размытия
  const getScaleForBlur = () => {
    // Увеличиваем изображение на 1% за каждый пиксель размытия
    return 1 + (filters.blur * 0.01);
  };

  // Создаем CSS для градиента
  const createGradientCSS = () => {
    const { type, colors, direction, position, customCSS } = gradientBackground;

    // Если задан кастомный CSS, используем его
    if (customCSS && customCSS.trim()) {
      return customCSS;
    }

    // Иначе используем стандартную генерацию
    if (type === 'linear') {
      return `linear-gradient(${direction || 'to right'}, ${colors.join(', ')})`;
    } else {
      return `radial-gradient(circle at ${position || 'center'}, ${colors.join(', ')})`;
    }
  };

  // Определяем стиль фона в зависимости от типа
  const getBackgroundStyle = () => {
    switch (backgroundType) {
      case 'solid':
        return {
          backgroundColor: solidBackground.color,
          backgroundImage: 'none'
        };
      case 'gradient':
        return {
          backgroundImage: createGradientCSS(),
          backgroundColor: 'transparent'
        };
      case 'image':
      default:
        return {}; // Для изображений используем img элементы
    }
  };

  // Отслеживаем изменения фона для анимации
  React.useEffect(() => {
    if (backgroundType === 'image' && currentImageUrl) {
      // Если это первое изображение
      if (!primaryImage) {
        setPrimaryImage(currentImageUrl);
        setPrimaryLoaded(false);
        dispatch(setLoading(true));
      }
      // Если изображение изменилось
      else if (currentImageUrl !== primaryImage) {
        // Если первое изображение еще не загружено, показываем новое сразу без анимации
        if (!isFirstImageLoaded) {
          setPrimaryImage(currentImageUrl);
          setPrimaryLoaded(false);
          setSecondaryImage(null);
          setSecondaryLoaded(false);
          setIsTransitioning(false);
          dispatch(setLoading(true));
        } else {
          // Обычная анимация перехода (только после загрузки первого изображения)
          setIsTransitioning(true);
          setSecondaryImage(currentImageUrl);
          setSecondaryLoaded(false);
          dispatch(setLoading(true));
        }
      }
    }
  }, [currentImageUrl, backgroundType, primaryImage, isFirstImageLoaded, dispatch]);

  // Отслеживаем изменения фильтров и изображений для Firefox
  React.useEffect(() => {
    const updateFirefoxBackground = async () => {
      const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      if (borderlessBackground && isFirefox && currentImageUrl) {
        const { sendBackgroundToFirefox } = await import('../utils/firefoxBackground');
        await sendBackgroundToFirefox(currentImageUrl, filters);
      }
    };
    
    updateFirefoxBackground();
  }, [filters, borderlessBackground, currentImageUrl]);

  // Обработчики для основного изображения
  const handlePrimaryLoad = () => {
    setPrimaryLoaded(true);
    dispatch(setLoading(false));
    // Отмечаем, что первое изображение загружено и можно включать анимации
    if (!isFirstImageLoaded) {
      setIsFirstImageLoaded(true);
    }
  };

  const handlePrimaryError = () => {
    setPrimaryLoaded(false);
    dispatch(setLoading(false));
  };

  // Обработчики для вторичного изображения
  const handleSecondaryLoad = () => {
    setSecondaryLoaded(true);
    dispatch(setLoading(false));
    // Ждем завершения полной анимации crossfade (800ms) перед переключением
    setTimeout(() => {
      // Меняем местами изображения
      setPrimaryImage(secondaryImage);
      setPrimaryLoaded(true);
      setSecondaryImage(null);
      setSecondaryLoaded(false);
      setIsTransitioning(false);
    }, 800); // Ждем полного завершения анимации
  };

  const handleSecondaryError = () => {
    setSecondaryLoaded(false);
    setSecondaryImage(null);
    setIsTransitioning(false);
  };

  // Эффект параллакса при движении мышки
  React.useEffect(() => {
    if (!parallaxEnabled) return;

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      // Отменяем предыдущий кадр анимации если он есть
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Планируем обновление на следующий кадр
      animationFrameId = requestAnimationFrame(() => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Вычисляем смещение от центра экрана в процентах (уменьшили чувствительность)
        const offsetX = ((e.clientX - centerX) / centerX) * 30;
        const offsetY = ((e.clientY - centerY) / centerY) * 30;

        setMouseX(offsetX);
        setMouseY(offsetY);
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [parallaxEnabled]);

  // Показываем фон только если есть изображение или выбран другой тип фона
  if (backgroundType === 'image' && !currentImageUrl) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: parallaxEnabled ? "-5%" : "-1px",
        left: parallaxEnabled ? "-5%" : 0,
        width: parallaxEnabled ? "110vw" : "100vw",
        height: parallaxEnabled ? "110vh" : "calc(100vh + 2px)",
        zIndex: -1,
        overflow: "hidden",
        backgroundColor: "#000",
        margin: 0,
        padding: 0,
        border: "none",
        outline: "none",
        filter: backgroundType === 'image' ? "none" : createFilterString(),
        transform: backgroundType === 'image' ? "none" : `scale(${getScaleForBlur()})`,
        ...getBackgroundStyle()
      }}
    >
      {/* Основное изображение (всегда видимое) */}
      {backgroundType === 'image' && primaryImage && (
        <img
          src={primaryImage}
          alt="Background"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: isTransitioning && secondaryLoaded ? 0 : 1,
            transition: isTransitioning ? "opacity 0.8s ease-in-out" : "none", // Анимация только при переходе
            filter: createFilterString(),
            transform: parallaxEnabled
              ? `translate(-50%, -50%) scale(${getScaleForBlur()}) translate(${mouseX * -1.2}px, ${mouseY * -1.2}px)`
              : `translate(-50%, -50%) scale(${getScaleForBlur()})`,
            ...(parallaxEnabled && {
              transition: isTransitioning
                ? "opacity 0.8s ease-in-out, transform 0.15s ease-out"
                : "transform 0.15s ease-out" // Только параллакс анимация когда нет перехода
            }),
            zIndex: 1
          }}
          onLoad={handlePrimaryLoad}
          onError={handlePrimaryError}
        />
      )}

      {/* Вторичное изображение (для переходов) */}
      {backgroundType === 'image' && secondaryImage && isTransitioning && (
        <img
          src={secondaryImage}
          alt="New Background"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: secondaryLoaded ? 1 : 0,
            transition: parallaxEnabled
              ? "opacity 0.8s ease-in-out, transform 0.15s ease-out"
              : "opacity 0.8s ease-in-out",
            filter: createFilterString(),
            transform: parallaxEnabled
              ? `translate(-50%, -50%) scale(${getScaleForBlur()}) translate(${mouseX * -1.2}px, ${mouseY * -1.2}px)`
              : `translate(-50%, -50%) scale(${getScaleForBlur()})`,
            zIndex: 2
          }}
          onLoad={handleSecondaryLoad}
          onError={handleSecondaryError}
        />
      )}

      {/* Градиентное затенение снизу вверх */}
      {shadowOverlay.enabled && backgroundType === 'image' && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: `linear-gradient(to top, rgba(0, 0, 0, ${shadowOverlay.intensity / 100 * 0.7}) 0%, rgba(0, 0, 0, ${shadowOverlay.intensity / 100 * 0.3}) ${shadowOverlay.height / 2}%, transparent ${shadowOverlay.height}%)`,
            zIndex: 3,
            pointerEvents: "none"
          }}
        />
      )}

      {/* Сообщение об ошибке */}
      {false && (
        <Flex
          align="center"
          justify="center"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)"
          }}
        >
          <Flex direction="column" align="center" gap="3">
            <Text size="4" weight="bold" color="red">
              {t('errors.loadingError')}
            </Text>
            <Text size="3" color="gray" style={{ textAlign: "center" }}>
              {t('errors.backgroundLoadError')}
            </Text>
          </Flex>
        </Flex>
      )}
    </div>
  );
};

// Добавляем CSS анимацию для спиннера
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
