/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConsolePage, ConsolePageHeader } from '@/components/layout'
import { Label } from '@/components/ui/label'
import { SELF_QUERY_KEY, useSelf } from '@/hooks/use-self'
import { useSystemConfig } from '@/hooks/use-system-config'

import { BalanceCard } from './components/balance-card'
import { CNPaymentSection } from './components/cn-payment-section'
import { CreemProductsSection } from './components/creem-products-section'
import { BillingHistoryDialog } from './components/dialogs/billing-history-dialog'
import { CreemConfirmDialog } from './components/dialogs/creem-confirm-dialog'
import { PaymentConfirmDialog } from './components/dialogs/payment-confirm-dialog'
import { RechargeCard } from './components/recharge-card'
import { SubscriptionPlansCard } from './components/subscription-plans-card'
import { TransactionsCard } from './components/transactions-card'
import { DEFAULT_DISCOUNT_RATE } from './constants'
import {
  useTopupInfo,
  usePayment,
  useRedemption,
  useCreemPayment,
  useWaffoPayment,
  useWaffoPancakePayment,
  useAirwallexPayment,
  useAirwallexReturn,
} from './hooks'
import {
  getDefaultPaymentType,
  getInitialTopupAmount,
  getMinTopupAmount,
  dispatchSelectedPayment,
} from './lib'
import {
  buildPayOptions,
  getPayMethodLabel,
  type PayOption,
} from './lib/pay-options'
import type { CreemProduct, PresetAmount } from './types'

interface WalletProps {
  initialShowHistory?: boolean
  /** The customer just came back from Airwallex's hosted checkout */
  airwallexReturned?: boolean
}

export function Wallet(props: WalletProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user, isLoading: userLoading } = useSelf()
  const [topupAmount, setTopupAmount] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(
    null
  )
  const [checkoutOption, setCheckoutOption] = useState<PayOption>()
  const [checkingOut, setCheckingOut] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [redemptionCode, setRedemptionCode] = useState('')
  const [creemDialogOpen, setCreemDialogOpen] = useState(false)
  const [selectedCreemProduct, setSelectedCreemProduct] =
    useState<CreemProduct | null>(null)

  const { currency } = useSystemConfig()
  const { topupInfo, presetAmounts, loading: topupLoading } = useTopupInfo()

  // Calculate effective exchange rate - when display type is USD, use rate of 1
  const effectiveUsdExchangeRate = useMemo(() => {
    return currency?.quotaDisplayType === 'USD'
      ? 1
      : currency?.usdExchangeRate || 1
  }, [currency?.quotaDisplayType, currency?.usdExchangeRate])
  const {
    amount: paymentAmount,
    calculating,
    processing,
    calculatePaymentAmount,
    processPayment,
  } = usePayment()
  const { redeeming, redeemCode } = useRedemption()
  const { processing: creemProcessing, processCreemPayment } = useCreemPayment()
  const { processing: waffoProcessing, processWaffoPayment } = useWaffoPayment()
  const { processing: pancakeProcessing, processWaffoPancakePayment } =
    useWaffoPancakePayment()
  const { processing: airwallexProcessing, processAirwallexPayment } =
    useAirwallexPayment()

  const refreshUser = useCallback(
    () => queryClient.invalidateQueries({ queryKey: SELF_QUERY_KEY }),
    [queryClient]
  )

  useAirwallexReturn(Boolean(props.airwallexReturned))

  useEffect(() => {
    if (props.initialShowHistory) {
      setBillingDialogOpen(true)
    }
    if (props.initialShowHistory || props.airwallexReturned) {
      // Drop the marker so a reload does not repeat the action.
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [props.initialShowHistory, props.airwallexReturned])

  const payOptions = useMemo(() => buildPayOptions(topupInfo), [topupInfo])
  const selectedOption =
    payOptions.find((option) => option.key === selectedOptionKey) ??
    payOptions[0]

  const hasConfigurableTopup = Boolean(
    topupInfo?.enable_online_topup ||
    topupInfo?.enable_stripe_topup ||
    topupInfo?.enable_waffo_topup ||
    topupInfo?.enable_waffo_pancake_topup ||
    topupInfo?.enable_airwallex_topup
  )
  const hasAnyTopup =
    hasConfigurableTopup || Boolean(topupInfo?.enable_creem_topup)

  // Open on the default amount once the top-up info is in.
  const topupAmountInitializedRef = useRef(false)
  useEffect(() => {
    if (topupInfo && !topupAmountInitializedRef.current) {
      topupAmountInitializedRef.current = true
      const initialAmount = getInitialTopupAmount(
        presetAmounts,
        getMinTopupAmount(topupInfo)
      )
      setTopupAmount(initialAmount)
      if (presetAmounts.some((preset) => preset.value === initialAmount)) {
        setSelectedPreset(initialAmount)
      }

      calculatePaymentAmount(initialAmount, getDefaultPaymentType(topupInfo))
    }
  }, [topupInfo, presetAmounts, calculatePaymentAmount])

  const currentPaymentType = selectedOption?.method.type
  const getCurrentPaymentType = useCallback(
    () => currentPaymentType || getDefaultPaymentType(topupInfo),
    [currentPaymentType, topupInfo]
  )

  const handleSelectPreset = (preset: PresetAmount) => {
    setTopupAmount(preset.value)
    setSelectedPreset(preset.value)
    calculatePaymentAmount(preset.value, getCurrentPaymentType())
  }

  const handleTopupAmountChange = (amount: number) => {
    setTopupAmount(amount)
    setSelectedPreset(null)
    calculatePaymentAmount(amount, getCurrentPaymentType())
  }

  const handleSelectOption = (key: string) => {
    setSelectedOptionKey(key)
    const option = payOptions.find((candidate) => candidate.key === key)
    if (option) calculatePaymentAmount(topupAmount, option.method.type)
  }

  // The primary button: price the order with the chosen method, then confirm.
  const handleCheckout = async () => {
    if (!selectedOption) return
    if (topupAmount < selectedOption.minTopup) {
      toast.error(
        t('Minimum topup amount: {{amount}}', {
          amount: selectedOption.minTopup,
        })
      )
      return
    }

    setCheckingOut(true)
    try {
      await calculatePaymentAmount(topupAmount, selectedOption.method.type)
      setCheckoutOption(selectedOption)
      setConfirmDialogOpen(true)
    } finally {
      setCheckingOut(false)
    }
  }

  const handlePaymentConfirm = async () => {
    if (!checkoutOption) return

    const success = await dispatchSelectedPayment(
      checkoutOption.method,
      topupAmount,
      checkoutOption.waffoIndex,
      {
        regular: processPayment,
        waffo: processWaffoPayment,
        waffoPancake: processWaffoPancakePayment,
        airwallex: processAirwallexPayment,
      }
    )

    if (success) {
      setConfirmDialogOpen(false)
      await refreshUser()
    }
  }

  const handleRedeem = async () => {
    if (!redemptionCode) return

    const success = await redeemCode(redemptionCode)
    if (success) {
      setRedemptionCode('')
      await refreshUser()
    }
  }

  const handleCreemProductSelect = (product: CreemProduct) => {
    setSelectedCreemProduct(product)
    setCreemDialogOpen(true)
  }

  const handleCreemConfirm = async () => {
    if (!selectedCreemProduct) return

    const success = await processCreemPayment(selectedCreemProduct.productId)
    if (success) {
      setCreemDialogOpen(false)
      setSelectedCreemProduct(null)
      await refreshUser()
    }
  }

  const discountRate =
    topupInfo?.discount?.[topupAmount] || DEFAULT_DISCOUNT_RATE

  const confirmMethod = checkoutOption
    ? {
        ...checkoutOption.method,
        name: getPayMethodLabel(checkoutOption.method, t),
      }
    : undefined

  return (
    <>
      <ConsolePage>
        <ConsolePageHeader title={t('Balance & top-up')} />

        <div className='grid gap-4 lg:grid-cols-3'>
          <BalanceCard
            className='lg:col-span-1'
            quota={userLoading ? undefined : (user?.quota ?? 0)}
            redemptionEnabled={topupInfo?.enable_redemption !== false}
            redemptionCode={redemptionCode}
            onRedemptionCodeChange={setRedemptionCode}
            onRedeem={handleRedeem}
            redeeming={redeeming}
            topupLink={topupInfo?.topup_link}
          />

          <RechargeCard
            className='lg:col-span-2'
            topupInfo={topupInfo}
            loading={topupLoading}
            hasAnyTopup={hasAnyTopup}
            hasConfigurableTopup={hasConfigurableTopup}
            presetAmounts={presetAmounts}
            selectedPreset={selectedPreset}
            onSelectPreset={handleSelectPreset}
            topupAmount={topupAmount}
            onTopupAmountChange={handleTopupAmountChange}
            paymentAmount={paymentAmount}
            calculating={calculating}
            payOptions={payOptions}
            selectedOption={selectedOption}
            onSelectOption={handleSelectOption}
            onCheckout={handleCheckout}
            checkingOut={checkingOut}
          >
            {topupInfo?.enable_creem_topup &&
              Array.isArray(topupInfo.creem_products) &&
              topupInfo.creem_products.length > 0 && (
                <div className='mt-4 space-y-3 border-t pt-4'>
                  <Label className='text-muted-foreground text-sm font-normal'>
                    {t('Creem Payment')}
                  </Label>
                  <CreemProductsSection
                    products={topupInfo.creem_products}
                    onProductSelect={handleCreemProductSelect}
                  />
                </div>
              )}

            {/* Official Alipay / WeChat Pay. Renders nothing unless an operator
                has configured at least one of them. */}
            <CNPaymentSection
              amount={topupAmount}
              minTopup={getMinTopupAmount(topupInfo)}
              sharedAmountVisible={hasConfigurableTopup}
            />
          </RechargeCard>
        </div>

        <SubscriptionPlansCard
          topupInfo={topupInfo}
          userQuota={user?.quota}
          onPurchaseSuccess={refreshUser}
        />

        <TransactionsCard onViewAll={() => setBillingDialogOpen(true)} />
      </ConsolePage>

      <PaymentConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handlePaymentConfirm}
        topupAmount={topupAmount}
        paymentAmount={paymentAmount}
        paymentMethod={confirmMethod}
        calculating={calculating}
        processing={
          processing ||
          waffoProcessing ||
          pancakeProcessing ||
          airwallexProcessing
        }
        discountRate={discountRate}
        usdExchangeRate={effectiveUsdExchangeRate}
      />

      <BillingHistoryDialog
        open={billingDialogOpen}
        onOpenChange={setBillingDialogOpen}
      />

      <CreemConfirmDialog
        open={creemDialogOpen}
        onOpenChange={setCreemDialogOpen}
        onConfirm={handleCreemConfirm}
        product={selectedCreemProduct}
        processing={creemProcessing}
      />
    </>
  )
}
