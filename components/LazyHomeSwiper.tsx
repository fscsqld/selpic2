/**
 * Base Swiper + fade (homepage default). Cube/coverflow/flip live in LazyHomeSwiperExtraEffects
 * and load only when CMS hero effect is not fade.
 */
'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectFade, Autoplay, Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/autoplay'

export {
  Swiper,
  SwiperSlide,
  EffectFade,
  Autoplay,
  Navigation,
  Pagination,
}
