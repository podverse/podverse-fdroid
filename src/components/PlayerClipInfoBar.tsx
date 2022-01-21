import { NowPlayingItem } from 'podverse-shared'
import { Pressable, StyleSheet, View } from 'react-native'
import React from 'reactn'
import { prefixClipLabel, readableClipTime } from '../lib/utility'
import { PV } from '../resources'
import { Text } from './'

type Props = {
  handleOnPress: any
  nowPlayingItem: NowPlayingItem
}

export class PlayerClipInfoBar extends React.PureComponent<Props> {
  render() {
    const { handleOnPress, nowPlayingItem } = this.props
    const { clipEndTime, clipStartTime } = nowPlayingItem
    const { globalTheme } = this.global

    return (
      <Pressable onPress={handleOnPress} testID={'player_clip_info_bar'.prependTestId()}>
        <View style={[styles.wrapper, globalTheme.player]}>
          <Text
            fontSizeLargestScale={PV.Fonts.largeSizes.md}
            numberOfLines={1}
            style={[styles.title, globalTheme.playerText]}>
            {nowPlayingItem?.clipTitle || prefixClipLabel(nowPlayingItem?.episodeTitle)}
          </Text>
          {!!clipStartTime && (
            <Text
              fontSizeLargestScale={PV.Fonts.largeSizes.sm}
              isSecondary
              numberOfLines={1}
              style={[styles.time, globalTheme.playerText]}>
              {readableClipTime(clipStartTime, clipEndTime)}
            </Text>
          )}
        </View>
      </Pressable>
    )
  }
}

const styles = StyleSheet.create({
  time: {
    fontSize: PV.Fonts.sizes.lg,
    marginHorizontal: 8,
    marginTop: 3
  },
  title: {
    fontSize: PV.Fonts.sizes.lg,
    fontWeight: PV.Fonts.weights.semibold,
    marginHorizontal: 8
  },
  wrapper: {
    borderTopWidth: 1,
    minHeight: 62,
    justifyContent: 'center'
  }
})
