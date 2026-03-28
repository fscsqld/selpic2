# 미리보기 모달 원상복구 가이드

## 📋 변경 사항 요약

**변경일**: 2025-12-31
**변경 내용**: 미리보기 모달의 푸터를 Absolute로 배치하여 이미지 영역을 최대한 활용

### 변경 전 구조
```tsx
<div className="flex flex-col">
  <div className="flex-shrink-0">헤더</div>
  <div className="flex-1">이미지 영역</div>
  <div className="flex-shrink-0">푸터</div>
</div>
```

### 변경 후 구조
```tsx
<div className="flex flex-col relative">
  <div className="flex-shrink-0 z-10">헤더</div>
  <div className="flex-1 pb-[320px]">이미지 영역 (푸터 공간 확보)</div>
  <div className="absolute bottom-0">푸터 (Absolute 배치)</div>
</div>
```

---

## 🔄 원상복구 방법

### 파일: `app/admin/images/page.tsx`

#### 1. 모달 컨테이너 수정 (라인 ~1266)

**현재 (변경 후):**
```tsx
<div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[98vh] overflow-hidden flex flex-col relative" onClick={(e) => e.stopPropagation()}>
```

**원상복구:**
```tsx
<div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[98vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
```
- `relative` 클래스 제거

---

#### 2. 헤더 수정 (라인 ~1267)

**현재 (변경 후):**
```tsx
<div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white z-10">
```

**원상복구:**
```tsx
<div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white">
```
- `z-10` 클래스 제거

---

#### 3. 이미지 영역 수정 (라인 ~1277)

**현재 (변경 후):**
```tsx
<div className="flex-1 overflow-auto p-4 sm:p-6 pb-[320px] flex items-center justify-center bg-gray-900 min-h-0 scrollbar-preview">
```

**원상복구:**
```tsx
<div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-gray-900 min-h-0 scrollbar-preview">
```
- `pb-[320px]` 클래스 제거

---

#### 4. 푸터 수정 (라인 ~1322)

**현재 (변경 후):**
```tsx
{/* 푸터: Absolute로 배치하여 이미지 영역을 최대한 활용 */}
{/* 원상복구: 아래 className을 "p-3 sm:p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0"로 변경하고, 이미지 영역의 pb-[320px]를 제거 */}
<div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 border-t border-gray-200 bg-gray-50 bg-white shadow-lg max-h-[50vh] overflow-y-auto">
```

**원상복구:**
```tsx
<div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
```
- `absolute bottom-0 left-0 right-0` 제거
- `bg-white shadow-lg max-h-[50vh] overflow-y-auto` 제거
- `flex-shrink-0` 추가
- 주석 제거

---

## ✅ 원상복구 체크리스트

- [ ] 모달 컨테이너에서 `relative` 클래스 제거
- [ ] 헤더에서 `z-10` 클래스 제거
- [ ] 이미지 영역에서 `pb-[320px]` 클래스 제거
- [ ] 푸터를 `absolute`에서 `flex-shrink-0`로 변경
- [ ] 푸터에서 `bg-white shadow-lg max-h-[50vh] overflow-y-auto` 제거
- [ ] 주석 제거

---

## 🎯 변경 이유

**문제점:**
- WebP Optimization 정보가 추가되면서 푸터 높이가 약 160px 증가
- Flexbox의 `flex-1`이 남은 공간을 차지하므로, 푸터가 커지면 이미지 영역이 줄어듦
- 결과적으로 이미지가 작게 표시됨

**해결 방법:**
- 푸터를 `absolute`로 배치하여 Flexbox 레이아웃에서 제외
- 이미지 영역이 전체 높이를 사용하도록 변경
- 이미지 영역에 `pb-[320px]`를 추가하여 푸터와 겹치지 않도록 함

**장점:**
- 이미지가 최대 크기로 표시됨
- WebP 정보가 항상 표시됨
- 스크롤 가능한 푸터로 정보가 많아도 대응 가능

---

## 📝 참고사항

- 푸터의 `max-h-[50vh]`는 푸터가 너무 길어질 경우를 대비한 스크롤 제한
- `pb-[320px]`는 푸터의 예상 최대 높이 (기본 정보 + WebP 정보 + 버튼)
- 필요시 `pb-[320px]` 값을 조정하여 푸터 높이에 맞출 수 있음

