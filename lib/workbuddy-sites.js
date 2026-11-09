export const REGIONS = Object.freeze({
  cn: { name: '国内', origin: 'https://www.workbuddy.cn' },
  global: { name: '国际', origin: 'https://www.workbuddy.ai' }
})

export const billingUrl = (region) => `${REGIONS[region].origin}/billing/meter/get-user-resource-summary`
export const plansUrl = (region) => `${REGIONS[region].origin}/profile/plans-usage`
