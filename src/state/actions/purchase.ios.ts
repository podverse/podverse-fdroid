import { Purchase } from 'react-native-iap'
import { setGlobal } from 'reactn'
import { iosHandlePurchaseStatusCheck as iosHandlePurchaseStatusCheckService } from '../../services/purchase.ios'
import { getAuthUserInfo } from './auth'
import { handleStatusSuccessful, purchaseLoading, showPurchaseSomethingWentWrongError } from './purchaseShared'

export const iosHandlePurchaseLoading = (purchase: Purchase) => {
  const { productId, transactionId, transactionReceipt } = purchase
  const loadingState = purchaseLoading()
  loadingState.purchase.transactionId = transactionId
  loadingState.purchase.productId = productId
  loadingState.purchase.transactionReceipt = transactionReceipt
  setGlobal(loadingState)
}

export const iosHandlePurchaseStatusCheck = async (purchase: Purchase) => {
  try {
    iosHandlePurchaseLoading(purchase)
    await iosHandlePurchaseStatusCheckService(purchase)
    await iosHandleStatusSuccessful()
  } catch (error) {
    console.log('iosHandlePurchaseStatusCheck error', error)
    showPurchaseSomethingWentWrongError()
  }
}

export const iosHandleStatusSuccessful = async () => {
  handleStatusSuccessful()
  // Reload auth user info to get latest membershipExpiration
  await getAuthUserInfo()
}
