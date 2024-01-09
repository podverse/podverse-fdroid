/* eslint-disable max-len */
import Config from 'react-native-config'
// import { getBuildNumber, getVersion } from 'react-native-device-info'

const bugReportSubject = 'Bug Report: '
const bugReportBody = `If you are reporting an issue, please provide your device type and/or brand and steps to reproduce the bug if possible. Thank you! / Platform: Platform: F-Droid ${Config.FDROID_VERSION}`
const checkoutIssueSubject = 'Checkout Issue: '
const checkoutIssueBody = `Please explain your issue below and we'll get back to you as soon as we can. / Platform: F-Droid ${Config.FDROID_VERSION}`
const featureRequestSubject = 'Feature Request: '
const featureRequestBody = 'Please describe the feature you would like added to Podverse.'
const podcastRequestSubject = 'Podcast Request: '
const podcastRequestBody = 'Please provide the name of the podcast, and the name of the host if you know it.'
const reportAContentIssueSubject = 'Content Issue Report: '
const reportAContentIssueBody = 'To help expedite our response, please provide a link on Podverse to the content that you are reporting.'
const generalSubject = ''
const betaMembershipRenewalSubject = 'Beta Membership Renewal: '
const betaMembershipRenewalBody = 'Please provide us with the email address you have signed up for the Podverse free trial membership with (if it is different than the email you are writing us from right now).'

export const Emails = {
  BETA_MEMBERSHIP_RENEWAL: {
    email: Config.CONTACT_EMAIL,
    subject: betaMembershipRenewalSubject,
    body: betaMembershipRenewalBody
  },
  BUG_REPORT: {
    email: Config.CONTACT_EMAIL,
    subject: bugReportSubject,
    body: bugReportBody
  },
  CHECKOUT_ISSUE: {
    email: Config.CONTACT_EMAIL,
    subject: checkoutIssueSubject,
    body: checkoutIssueBody
  },
  FEATURE_REQUEST: {
    email: Config.CONTACT_EMAIL,
    subject: featureRequestSubject,
    body: featureRequestBody
  },
  GENERAL_CONTACT: {
    email: Config.CONTACT_EMAIL,
    subject: generalSubject,
    body: bugReportBody
  },
  PODCAST_REQUEST: {
    email: Config.CONTACT_EMAIL,
    subject: podcastRequestSubject,
    body: podcastRequestBody
  },
  REPORT_A_CONTENT_ISSUE: {
    email: Config.CONTACT_EMAIL,
    subject: reportAContentIssueSubject,
    body: reportAContentIssueBody
  }
}
