import React, { forwardRef, useCallback } from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface BottomSheetProps {
  children?: React.ReactNode;
  snapPoints?: (string | number)[];
  index?: number;
  onChange?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  enablePanDownToClose?: boolean;
}

export const BottomSheet = forwardRef<GorhomBottomSheet, BottomSheetProps>(
  (
    {
      children,
      snapPoints = ['25%', '50%', '75%'],
      index = -1,
      onChange,
      style,
      containerStyle,
      enablePanDownToClose = true,
    },
    ref
  ) => {
    const theme = useTheme();

    // Render clean dark backdrop overlay
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
        />
      ),
      []
    );

    return (
      <GorhomBottomSheet
        ref={ref}
        index={index}
        snapPoints={snapPoints}
        onChange={onChange}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={enablePanDownToClose}
        handleIndicatorStyle={[
          styles.handleIndicator,
          { backgroundColor: theme.outline },
        ]}
        backgroundStyle={[
          styles.background,
          { backgroundColor: theme.surface },
        ]}
        style={style}
      >
        <BottomSheetView style={[styles.contentContainer, containerStyle]}>
          {children}
        </BottomSheetView>
      </GorhomBottomSheet>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: 28, // Material 3 standard bottom sheet rounding (28dp)
    borderTopRightRadius: 28,
  },
  handleIndicator: {
    width: 32,
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.one,
  },
  contentContainer: {
    flex: 1,
    padding: Spacing.four,
  },
});
