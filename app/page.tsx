import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-2xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-800 dark:bg-slate-800 dark:text-slate-200">
            커스터마이징 가능한 스티커 쇼핑몰
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            원하는 문구로 바로 제작,
            <br />
            SelPic2 스티커
          </h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            색상·사이즈·텍스트를 선택하고 장바구니에 담아보세요. 이 프로젝트는 현재 “홈페이지가 정상적으로
            뜨는 것”을 우선으로 최소 기능부터 안정화했습니다.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/products"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              상품 보러가기
            </Link>
            <Link
              href="/cart"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
            >
              장바구니 보기
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-base font-semibold">실시간 미리보기(기초)</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            우선 텍스트/옵션을 담아 장바구니로 전달하는 흐름부터 구성했습니다.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-base font-semibold">안정적인 라우팅</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            App Router 기반으로 `/`, `/products`, `/cart`가 즉시 동작합니다.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-base font-semibold">상태 관리</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Zustand로 장바구니 수량 배지/추가/삭제/수량 변경을 구현했습니다.
          </p>
        </div>
      </section>
    </div>
  )
}

