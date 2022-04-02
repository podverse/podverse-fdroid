import { finishTransaction } from 'react-native-iap'
import { updateAppStorePurchaseStatus } from './appStorePurchase'

export const iosHandlePurchaseStatusCheck = async (transactionReceipt: string) => {
  try {
    const response = await updateAppStorePurchaseStatus(transactionReceipt)
    const { finishedTransactionIds } = response.data
    if (finishedTransactionIds && Array.isArray(finishedTransactionIds)) {
      for (const transactionId of finishedTransactionIds) {
        const isConsumable = true
        await finishTransaction({ transactionId } as any, isConsumable)
      }
    }
  } catch (error) {
    throw error
  }
}
