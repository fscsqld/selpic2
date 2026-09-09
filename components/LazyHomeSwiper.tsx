/**
 * Lazy-loaded Swiper + CSS for homepage hero only.
 * Imported dynamically so root `/` JS parse does not pay for all effect styles up front.
 */
'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import {
  EffectFade,
  EffectCube,
  EffectCoverflow,
  EffectFlip,
  Autoplay,
  Navigation,
  Pagination,
} from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/effect-cube'
import 'swiper/css/effect-coverflow'
import 'swiper/css/effect-flip'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/autoplay'

export {
  Swiper,
  SwiperSlide,
  EffectFade,
  EffectCube,
  EffectCoverflow,
  EffectFlip,
  Autoplay,
  Navigation,
  Pagination,
}
