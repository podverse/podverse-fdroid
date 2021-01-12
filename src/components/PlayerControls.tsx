import { StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import React from 'reactn'
import { PV } from '../resources'
import { playerJumpBackward, playerJumpForward, PVTrackPlayer, setPlaybackPosition } from '../services/player'
import { playNextFromQueue, setPlaybackSpeed, togglePlay } from '../state/actions/player'
import { darkTheme, iconStyles, playerStyles } from '../styles'
import { Icon, PlayerProgressBar, Text } from './'
import { PlayerMoreActionSheet } from './PlayerMoreActionSheet'

type Props = {
  navigation: any
}

type State = {
  progressValue: number
  showPlayerMoreActionSheet: boolean
}

export class PlayerControls extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      progressValue: 0,
      showPlayerMoreActionSheet: false
    }
  }

  _adjustSpeed = async () => {
    const { playbackRate } = this.global.player
    const speeds = await PV.Player.speeds()
    const index = speeds.indexOf(playbackRate)

    let newSpeed
    if (speeds.length - 1 === index) {
      newSpeed = speeds[0]
    } else {
      newSpeed = speeds[index + 1]
    }

    await setPlaybackSpeed(newSpeed, this.global)
  }

  _navToStopWatchScreen = () => {
    const { navigation } = this.props
    navigation.navigate(PV.RouteNames.SleepTimerScreen)
  }

  _playerJumpBackward = async () => {
    const progressValue = await playerJumpBackward(PV.Player.jumpSeconds)
    this.setState({ progressValue })
  }

  _playerJumpForward = async () => {
    const progressValue = await playerJumpForward(PV.Player.jumpSeconds)
    this.setState({ progressValue })
  }

  _hidePlayerMoreActionSheet = async () => {
    this.setState({ showPlayerMoreActionSheet: false })
  }

  _showPlayerMoreActionSheet = async () => {
    this.setState({
      showPlayerMoreActionSheet: true
    })
  }

  _returnToBeginningOfTrack = async () => {
    await setPlaybackPosition(0)
  }

  render() {
    const { navigation } = this.props
    const { progressValue, showPlayerMoreActionSheet } = this.state
    const { globalTheme, player, screenPlayer } = this.global
    const { backupDuration, nowPlayingItem, playbackRate, playbackState } = player
    const { isLoading } = screenPlayer
    const hasErrored = playbackState === PV.Player.errorState
    const hitSlop = {
      bottom: 8,
      left: 8,
      right: 8,
      top: 8
    }

    return (
      <View style={[styles.wrapper, globalTheme.player]}>
        <View style={styles.progressWrapper}>
          <PlayerProgressBar
            backupDuration={backupDuration}
            {...(nowPlayingItem && nowPlayingItem.clipEndTime ? { clipEndTime: nowPlayingItem.clipEndTime } : {})}
            {...(nowPlayingItem && nowPlayingItem.clipStartTime ? { clipStartTime: nowPlayingItem.clipStartTime } : {})}
            globalTheme={globalTheme}
            isLoading={isLoading}
            value={progressValue}
          />
        </View>
        <View style={styles.middleRow}>
          <View style={styles.middleRowTop}>
            <TouchableOpacity
              onPress={this._returnToBeginningOfTrack}
              style={[playerStyles.icon, { flexDirection: 'row' }]}>
              <Icon name='step-backward' size={35} />
            </TouchableOpacity>
            <TouchableOpacity onPress={this._playerJumpBackward} style={playerStyles.icon}>
              <Icon name='undo-alt' size={35} />
              {/* <View style={styles.skipTimeTextWrapper}>
                <Text style={styles.skipTimeText}>30</Text>
              </View> */}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => togglePlay(this.global)} style={playerStyles.playButton}>
              {hasErrored ? (
                <Icon
                  color={globalTheme === darkTheme ? iconStyles.lightRed.color : iconStyles.darkRed.color}
                  name={'exclamation-triangle'}
                  size={35}
                />
              ) : (
                <Icon name={playbackState === PVTrackPlayer.STATE_PLAYING ? 'pause' : 'play'} size={20} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={this._playerJumpForward} style={playerStyles.icon}>
              <Icon name='redo-alt' size={35} />
              {/* <View style={styles.skipTimeTextWrapper}>
                <Text style={styles.skipTimeText}>30</Text>
              </View> */}
            </TouchableOpacity>
            <TouchableOpacity onPress={playNextFromQueue} style={[playerStyles.icon, { flexDirection: 'row' }]}>
              <Icon name='step-forward' size={35} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.bottomRow}>
          <TouchableOpacity hitSlop={hitSlop} onPress={this._navToStopWatchScreen}>
            <View style={styles.bottomButton}>
              <Icon name='moon' size={20} solid={true} />
            </View>
          </TouchableOpacity>
          <TouchableWithoutFeedback hitSlop={hitSlop} onPress={this._adjustSpeed}>
            <Text fontSizeLargestScale={PV.Fonts.largeSizes.sm} style={[styles.bottomButton, styles.bottomRowText]}>
              {`${playbackRate}X`}
            </Text>
          </TouchableWithoutFeedback>
          <TouchableOpacity hitSlop={hitSlop} onPress={this._showPlayerMoreActionSheet}>
            <View style={styles.bottomButton}>
              <Icon name='ellipsis-h' size={24} />
            </View>
          </TouchableOpacity>
        </View>
        <PlayerMoreActionSheet
          handleDismiss={this._hidePlayerMoreActionSheet}
          navigation={navigation}
          showModal={showPlayerMoreActionSheet}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  bottomButton: {
    alignItems: 'center',
    minHeight: 32,
    paddingVertical: 4,
    textAlign: 'center',
    minWidth: 54
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: PV.Player.styles.bottomRow.height,
    justifyContent: 'space-evenly',
    marginHorizontal: 15,
    marginTop: 10
  },
  bottomRowText: {
    fontSize: PV.Fonts.sizes.md,
    fontWeight: PV.Fonts.weights.bold
  },
  middleRow: {
    marginTop: 2
  },
  middleRowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 2
  },
  skipButtonText: {
    fontSize: 12,
    width: '100%',
    position: 'absolute',
    bottom: -5,
    textAlign: 'center'
  },
  progressWrapper: {
    marginTop: 5
  },
  speed: {
    alignItems: 'center',
    paddingVertical: 4,
    width: 54
  },
  topRow: {
    minHeight: 52,
    paddingTop: 5
  },
  wrapper: {
    borderTopWidth: 1
  },
  skipTimeTextWrapper: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  skipTimeText: {
    fontSize: 11
  }
})
