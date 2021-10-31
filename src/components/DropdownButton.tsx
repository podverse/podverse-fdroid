import React from 'react'
import { View } from 'react-native'
import { useGlobal } from 'reactn'
import { PV } from '../resources'
import { Icon, PressableWithOpacity, Text } from '.'

type DropdownButtonProps = {
  accessible?: boolean;
  accessibilityHint?: string;
  accessibilityLabel?: boolean;
  disableFilter?: boolean;
  importantForAccessibility?: "auto" | "yes" | "no" | "no-hide-descendants" | undefined;
  sortLabel?: string;
  testID?: string;
  transparent?: any;
  onPress?: () => unknown;
}

export const DropdownButton = (props: DropdownButtonProps) => {
  const { accessible = true, accessibilityHint, disableFilter, importantForAccessibility,
    onPress, sortLabel, testID } = props
  const [globalTheme] = useGlobal('globalTheme')
  const dropdownStyle = disableFilter ? { opacity: 0.0 } : {}

  const extraStyles = []

  if (props.transparent) {
    extraStyles.push({ backgroundColor: 'transparent' })
  }

  return (
    <PressableWithOpacity
      accessible={accessible}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={sortLabel}
      accessibilityRole='button'
        importantForAccessibility={importantForAccessibility}
      activeOpacity={0.7}
      disabled={disableFilter}
      onPress={onPress}
      testID={`${testID}_dropdown_button`.prependTestId()}>
      <View
        accessible={false}
        importantForAccessibility='no-hide-descendants'
        style={[styles.dropdownButton, dropdownStyle, extraStyles]}>
        <Text
          accessible={false}
          fontSizeLargestScale={PV.Fonts.largeSizes.md}
          numberOfLines={1}
          style={[styles.dropdownButtonText, globalTheme.dropdownButtonText]}
          testID={`${testID}_dropdown_button_text`}>
          {sortLabel}
        </Text>
        <Icon
          accessible={false}
          name='angle-down'
          size={14}
          style={[styles.dropdownButtonIcon, globalTheme.dropdownButtonIcon]} />
      </View>
    </PressableWithOpacity>
  )
}

const styles = {
  divider: {
    height: 1
  },
  dropdownButton: {
    alignItems: 'center',
    backgroundColor: PV.Colors.velvet,
    borderColor: PV.Colors.brandBlueLight,
    borderRadius: 100,
    borderWidth: 2,
    flexDirection: 'row',
    flex: 0,
    justifyContent: 'center',
    height: PV.Table.sectionHeader.height - 6,
    paddingHorizontal: 16
  },
  dropdownButtonIcon: {
    flex: 0,
    fontSize: PV.Fonts.sizes.xl
  },
  dropdownButtonText: {
    flex: 0,
    fontSize: PV.Fonts.sizes.md,
    fontWeight: PV.Fonts.weights.bold,
    paddingRight: 12
  }
}
