/* eslint-disable @typescript-eslint/prefer-regexp-exec */
import AsyncStorage from '@react-native-community/async-storage'
import moment from 'moment'
import 'moment/locale/da'
import 'moment/locale/de'
import 'moment/locale/el'
import 'moment/locale/es'
import 'moment/locale/fr'
import 'moment/locale/lt'
import 'moment/locale/nb'
import 'moment/locale/oc-lnc'
import 'moment/locale/pt'
import 'moment/locale/ru'
import 'moment/locale/sv'
import 'moment/locale/tr'
import { convertSecToHHMMSS } from 'podverse-shared'
import { Platform } from 'react-native'
import Config from 'react-native-config'
import { PV } from '../resources'
import { getLanguageTag, translate } from './i18n'
const cheerio = require('react-native-cheerio')

export const getAppUserAgent = () => {
  /*
    This will return device specific user agents as follows:
    Podverse/iOS Mobile App
    Podverse/Android Mobile App
    Podverse/F-Droid Android Mobile App

    NOTE: if a change to userAgent is made, make sure to update
    the OPAWG definition so our user agents can be easily identified by other servers.
    https://github.com/opawg/user-agents/blob/master/src/user-agents.json
  */
  return `${Config.USER_AGENT_PREFIX || 'Unknown App'}/${`${Config.USER_AGENT_APP_TYPE}` ||
    'Unknown App Type'}`
}

export const safelyUnwrapNestedVariable = (func: any, fallbackValue: any) => {
  try {
    const value = func()
    return value === null || value === undefined ? fallbackValue : value
  } catch (e) {
    return fallbackValue
  }
}

export const readableDate = (date?: Date, withTime?: boolean) => {
  moment.locale(getLanguageTag())
  date = date || new Date()
  const format = withTime ? translate('_moment.js date with time format') : translate('_moment.js date format')
  return moment(date).format(format)
}

export const convertSecToHHMMSSAccessibilityLabel = (sec: number) => {
  let totalSec = Math.floor(sec)
  const hours = Math.floor(totalSec / 3600)
  totalSec %= 3600
  const minutes = Math.floor(totalSec / 60)
  const seconds = Math.floor(totalSec % 60)

  let readableTime = ''
  if (hours) {
    if (hours === 1) {
      readableTime += `${hours} ${translate('hour')} `
    } else {
      readableTime += `${hours} ${translate('hours')} `
    }
  }

  if (minutes) {
    if (minutes === 1) {
      readableTime += `${minutes} ${translate('minute')} `
    } else {
      readableTime += `${minutes} ${translate('minutes')} `
    }
  }

  if (seconds) {
    if (seconds === 1) {
      readableTime += `${seconds} ${translate('second')} `
    } else {
      readableTime += `${seconds} ${translate('seconds')} `
    }
  }

  return readableTime
}

export const formatTitleViewHtml = (episode: any) => {
  if (episode.podcast && episode.podcast.title && episode.title && episode.pubDate) {
    return `<p>${episode.podcast.title}</p><p>${episode.title}</p><p>${readableDate(episode.pubDate)}</p>`
  } else if (episode && episode.title && episode.pubDate) {
    return `<p>${episode.title}</p><p>${readableDate(episode.pubDate)}</p>`
  } else if (episode.title) {
    return `<p>${episode.title}</p>`
  } else {
    return 'Untitled Episode'
  }
}

export const convertToSortableTitle = (title: string) => {
  const sortableTitle = title
    ? title
        .toLowerCase()
        .replace(/\b^the\b|\b^a\b|\b^an\b/i, '')
        .trim()
    : ''
  return sortableTitle ? sortableTitle.replace(/#/g, '') : ''
}

export const getMakeClipIsPublic = async () => {
  const isPublicString = await AsyncStorage.getItem(PV.Keys.MAKE_CLIP_IS_PUBLIC)
  let isPublic = true
  if (isPublicString) {
    isPublic = JSON.parse(isPublicString)
  }

  return isPublic
}

export const setCategoryQueryProperty = (queryFrom?: any, selectedCategory?: any, selectedCategorySub?: any) => {
  if (queryFrom === PV.Filters._categoryKey && selectedCategory) {
    return { categories: selectedCategory }
  } else if (queryFrom === PV.Filters._categoryKey && selectedCategorySub) {
    return { categories: selectedCategorySub }
  } else {
    return {}
  }
}

export const getUniqueArrayByKey = (arr: any[], key: string) => {
  return [...new Map(arr.map((item: any) => [item[key], item])).values()]
}

export const safeKeyExtractor = (prefix: string, index: number, id?: string) => {
  if (id) {
    return `${prefix}_${id}`
  } else {
    return `${prefix}_${index}`
  }
}

export const prefixClipLabel = (episodeTitle?: string) => {
  let title = ''
  if (episodeTitle) {
    title = `(${translate('Clip')}) ${episodeTitle}`.trim()
  } else {
    title = translate('Untitled Clip')
  }
  return title
}

export const generateEpisodeAccessibilityText = (episodeCompleted: boolean, timeLabel: string) => {
  let timeLabelText = episodeCompleted ? translate('Finished episode') : ''
  if (timeLabel) {
    timeLabelText = `${timeLabelText ? `${timeLabelText}, ${timeLabel}` : ''} ${timeLabel}`
  } else {
    timeLabelText = `${timeLabelText ? `${timeLabelText}, ${translate('Unplayed episode')}` : ''} ${translate(
      'Unplayed episode'
    )}`
  }
  return timeLabelText
}

export const readableClipTime = (startTime: number, endTime?: number, useTo?: boolean) => {
  const s = convertSecToHHMMSS(startTime)
  if ((startTime || startTime === 0) && endTime) {
    const e = convertSecToHHMMSS(endTime)
    return `${s} ${useTo ? 'to' : '-'} ${e}`
  } else {
    return `Start: ${s}`
  }
}

export const removeHTMLAttributesFromString = (html: string) => {
  const $ = cheerio.load(html)
  $('*').each(function() {
    this.attribs = {
      ...(this.attribs && this.attribs.href ? { href: this.attribs.href } : {})
    }
  })

  return $.html()
}

export const getAndroidVersion = () => {
  return Platform.constants?.Release && parseInt(Platform.constants?.Release, 10)
}
