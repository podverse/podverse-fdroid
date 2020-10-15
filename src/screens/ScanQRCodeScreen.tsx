// @flow

import React from 'react'
import { SafeAreaView, StyleSheet } from 'react-native'
import { translate } from '../lib/i18n'
import { PV } from '../resources'

export const ScanQRCodeScreen = () => {
  return <SafeAreaView style={styles.view} />
}

ScanQRCodeScreen.navigationOptions = () => ({
  title: translate('QR Reader'),
  headerRight: null
})

const styles = StyleSheet.create({
  view: {
    flex: 1
  },
  preview: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center'
  },
  horizontalFiller: {
    width: '100%',
    height: 40,
    backgroundColor: PV.Colors.black + 'CC'
  },
  verticalFiller: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  fillerRow: {
    flexDirection: 'row'
  },
  innerCutout: {
    width: '90%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  horizontalRowFiller: {
    width: '5%',
    height: '100%',
    backgroundColor: PV.Colors.black + 'CC'
  },
  instructions: {
    textAlign: 'center',
    width: '100%',
    color: PV.Colors.grayLightest,
    fontSize: PV.Fonts.sizes.xl,
    paddingVertical: 10
  },
  contentContainer: {
    width: '100%',
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'space-around',
    backgroundColor: PV.Colors.black + 'CC'
  },
  dismissButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    alignSelf: 'center',
    width: '90%',
    borderColor: PV.Colors.white,
    borderWidth: 1
  },
  dismissButtonText: {
    fontSize: PV.Fonts.sizes.lg,
    fontWeight: PV.Fonts.weights.bold,
    color: PV.Colors.white
  }
})
