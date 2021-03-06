import React from 'react'
import { TouchableWithoutFeedback, View } from 'react-native'
import { useGlobal } from 'reactn'
import { testProps } from '../lib/utility'
import { PV } from '../resources'
import { Icon, Text } from '.'

export const DropdownButton = (props: any) => {
  const { hideFilter, onPress, sortLabel, testID } = props
  const [globalTheme] = useGlobal('globalTheme')
  const dropdownStyle = hideFilter ? { opacity: 0.0 } : {}

  const extraStyles = []

  if (props.transparent) {
    extraStyles.push({ backgroundColor: 'transparent' })
  }

  return (
    <TouchableWithoutFeedback disabled={hideFilter} onPress={onPress} {...testProps(`${testID}_dropdown_button`)}>
      <View style={[styles.dropdownButton, dropdownStyle, extraStyles]}>
        <Text
          fontSizeLargestScale={PV.Fonts.largeSizes.md}
          numberOfLines={1}
          style={[styles.dropdownButtonText, globalTheme.dropdownButtonText]}>
          {sortLabel}
        </Text>
        <Icon name='angle-down' size={14} style={[styles.dropdownButtonIcon, globalTheme.dropdownButtonIcon]} />
      </View>
    </TouchableWithoutFeedback>
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
