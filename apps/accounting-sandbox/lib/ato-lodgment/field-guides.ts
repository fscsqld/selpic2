import type { ATOFieldGuide } from './types'

const OSB_BAS_STEPS = [
  'Sign in to Online services for business (myID).',
  'Open Activity statements → Lodge activity statement (or current BAS).',
  'Select the matching period, then find the label below on the form.',
  'Paste the amount from SELPIC A into that field.',
]

const MYTAX_BUSINESS_STEPS = [
  'Sign in to myGov → Australian Taxation Office → myTax.',
  'Start or continue your individual tax return for the financial year.',
  'Open the Business / sole trader income section.',
  'Enter the amount shown below in the matching field.',
]

export const OSB_HELP =
  'https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/how-to-lodge-your-bas'

export const MYTAX_HELP =
  'https://www.ato.gov.au/individuals-and-families/your-tax-return/how-to-lodge-your-tax-return'

export function basFieldGuide(labelHint: string): ATOFieldGuide {
  return {
    atoPortal: 'osb',
    atoSteps: [...OSB_BAS_STEPS.slice(0, 3), `Locate "${labelHint}" and paste the value.`],
    helpUrl: OSB_HELP,
  }
}

export function myTaxFieldGuide(labelHint: string): ATOFieldGuide {
  return {
    atoPortal: 'mytax',
    atoSteps: [...MYTAX_BUSINESS_STEPS.slice(0, 3), `Enter under "${labelHint}".`],
    helpUrl: MYTAX_HELP,
  }
}

export function portalLabel(portal: ATOFieldGuide['atoPortal']): string {
  if (portal === 'osb') return 'Online services for business'
  if (portal === 'mytax') return 'myTax (myGov)'
  return 'Online services for business or myTax'
}

export function myTaxPersonalFieldGuide(labelHint: string): ATOFieldGuide {
  return myTaxFieldGuide(labelHint)
}

export function ctrFieldGuide(labelHint: string): ATOFieldGuide {
  return {
    atoPortal: 'osb',
    atoSteps: [
      'Sign in to Online services for business (myID).',
      'Open Company tax return for the matching income year.',
      `Locate "${labelHint}" and paste the SELPIC value.`,
    ],
    helpUrl: OSB_HELP,
  }
}
