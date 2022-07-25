import React from 'react'
import { StyleSheet } from 'react-native'
import { useGlobal } from 'reactn'
import { translate } from '../lib/i18n'
import { PV } from '../resources'
import { darkTheme, iconStyles } from '../styles'
import { ActivityIndicator, Icon, View } from '.'

type Props = {
  isDownloaded?: boolean
  isDownloading?: boolean
  onPressDelete: any
  onPressDownload: any
  style?: any
  testID: string
}

export const DownloadOrDeleteButton = (props: Props) => {
  const { isDownloaded, isDownloading, onPressDelete, onPressDownload, style, testID } = props
  const [globalTheme] = useGlobal('globalTheme')
  const isDarkMode = globalTheme === darkTheme

  let component = (
    <View style={[styles.imageWrapper]}>
      <Icon
        accessibilityHint={translate('ARIA HINT - download this episode')}
        accessibilityLabel={translate('Download')}
        accessibilityRole='button'
        color={PV.Colors.white}
        name='download'
        onPress={onPressDownload}
        size={27}
        style={[styles.image, style]}
        testID={`${testID}_download_button_icon`}
      />
    </View>
  )

  if (isDownloading) {
    component = (
      <View style={[styles.activityWrapper]}>
        <ActivityIndicator
          accessibilityLabel={translate('Download in progress')}
          styles={[styles.activityIndicator]}
          testID={`${testID}_download`}
        />
      </View>
    )
  } else if (isDownloaded) {
    component = (
      <View style={[styles.imageWrapper]}>
        <Icon
          accessibilityHint={translate('ARIA HINT - delete this downloaded episode')}
          accessibilityLabel={translate('Delete')}
          accessibilityRole='button'
          color={isDarkMode ? iconStyles.darkTertiary.color : iconStyles.lightSecondary.color}
          name='trash-alt'
          onPress={onPressDelete}
          size={27}
          style={[styles.image, style]}
          testID={`${testID}_delete_button_icon`}
        />
      </View>
    )
  }

  return <View accessible>{component}</View>
}

const width = 62
const height = 50

const styles = StyleSheet.create({
  activityIndicator: {
    flex: 0,
    height,
    width,
    lineHeight: height,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0
  },
  activityWrapper: {
    alignItems: 'center',
    flex: 0,
    justifyContent: 'center',
    width
  },
  image: {
    flex: 0,
    height,
    lineHeight: height,
    textAlign: 'center',
    width
  },
  imageWrapper: {
    alignItems: 'center',
    flex: 0,
    height,
    justifyContent: 'center',
    width
  }
})
