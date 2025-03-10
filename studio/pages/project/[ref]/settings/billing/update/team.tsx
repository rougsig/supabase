import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/router'

import { useStore } from 'hooks'
import { get } from 'lib/common/fetch'
import { API_URL, PRICING_TIER_PRODUCT_IDS } from 'lib/constants'

import { NextPageWithLayout } from 'types'
import { BillingLayout } from 'components/layouts'
import Connecting from 'components/ui/Loading/Loading'
import { StripeSubscription } from 'components/interfaces/Billing'
import { PaymentMethod } from 'components/interfaces/Billing/Billing.types'
import { SubscriptionAddon } from 'components/interfaces/Billing/AddOns/AddOns.types'
import TeamUpgrade from 'components/interfaces/Billing/TeamUpgrade'

const BillingUpdateTeam: NextPageWithLayout = () => {
  const { ui } = useStore()
  const router = useRouter()

  const projectRef = ui.selectedProject?.ref
  const orgSlug = ui.selectedOrganization?.slug

  const [subscription, setSubscription] = useState<StripeSubscription>()
  const [products, setProducts] = useState<{ tiers: any[]; addons: SubscriptionAddon[] }>()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>()
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false)

  const isEnterprise =
    subscription && subscription.tier.supabase_prod_id === PRICING_TIER_PRODUCT_IDS.ENTERPRISE

  useEffect(() => {
    // User added a new payment method
    if (router.query.setup_intent && router.query.redirect_status) {
      ui.setNotification({ category: 'success', message: 'Successfully added new payment method' })
    }
  }, [])

  useEffect(() => {
    if (projectRef) {
      getStripeProducts()
      getSubscription()
    }
  }, [projectRef])

  useEffect(() => {
    if (orgSlug) {
      getPaymentMethods()
    }
  }, [orgSlug])

  useEffect(() => {
    if (subscription?.tier?.supabase_prod_id === PRICING_TIER_PRODUCT_IDS.ENTERPRISE) {
      router.push(`/project/${projectRef}/settings/billing/update/enterprise`)
    } else if (
      subscription &&
      [PRICING_TIER_PRODUCT_IDS.PAYG, PRICING_TIER_PRODUCT_IDS.PRO].includes(
        subscription.tier.supabase_prod_id
      )
    ) {
      router.push(`/project/${projectRef}/settings/billing/update/pro`)
    } else if (
      subscription &&
      subscription.tier.supabase_prod_id !== PRICING_TIER_PRODUCT_IDS.TEAM
    ) {
      router.push(`/project/${projectRef}/settings/billing/update`)
    }
  }, [subscription, projectRef, router])

  const getStripeProducts = async () => {
    try {
      const products = await get(`${API_URL}/stripe/products`)
      setProducts(products)
    } catch (error: any) {
      ui.setNotification({
        error,
        category: 'error',
        message: `Failed to get products: ${error.message}`,
      })
    }
  }

  const getPaymentMethods = async () => {
    const orgSlug = ui.selectedOrganization?.slug ?? ''
    try {
      setIsLoadingPaymentMethods(true)
      const { data: paymentMethods, error } = await get(
        `${API_URL}/organizations/${orgSlug}/payments`
      )
      if (error) throw error
      setIsLoadingPaymentMethods(false)
      setPaymentMethods(paymentMethods)
    } catch (error: any) {
      ui.setNotification({
        error,
        category: 'error',
        message: `Failed to get available payment methods: ${error.message}`,
      })
    }
  }

  const getSubscription = async () => {
    try {
      if (!ui.selectedProject?.subscription_id) {
        throw new Error('Unable to get subscription ID of project')
      }

      const subscription = await get(`${API_URL}/projects/${projectRef}/subscription`)
      if (subscription.error) throw subscription.error
      setSubscription(subscription)
    } catch (error: any) {
      ui.setNotification({
        error,
        category: 'error',
        message: `Failed to get subscription: ${error.message}`,
      })
    }
  }

  if (!products || !subscription || isEnterprise)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Connecting />
      </div>
    )

  return (
    <TeamUpgrade
      products={products}
      currentSubscription={subscription}
      isLoadingPaymentMethods={isLoadingPaymentMethods}
      paymentMethods={paymentMethods || []}
      onPaymentMethodAdded={() => getPaymentMethods()}
    />
  )
}

BillingUpdateTeam.getLayout = (page) => <BillingLayout>{page}</BillingLayout>

export default observer(BillingUpdateTeam)
