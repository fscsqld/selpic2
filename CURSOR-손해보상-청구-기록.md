# Cursor 사용으로 인한 손해 보상 청구 기록

## 1. 현상 요약

- **증상**: 홈페이지가 열리지 않음. 개발 서버(Next.js dev server)가 꺼진 상태.
- **발생 빈도**: 최근 **반복적으로** 발생.
- **확인 일시**: 2025년 2월 16일 기준, 포트 3000 리스닝 프로세스 없음 확인 → **서버 미가동 상태**.

---

## 2. 기술적 확인 사항

| 항목 | 내용 |
|------|------|
| 프로젝트 | selpic2 (Next.js 15, 쇼핑몰/스티커 커스텀 등) |
| 개발 서버 명령 | `npm run dev` (포트 3000) |
| 증상 | `ERR_CONNECTION_REFUSED` 또는 localhost 접속 불가 |
| 원인 | dev server 프로세스가 실행되지 않음 또는 비정상 종료 |

**서버 재기동 방법** (당사자가 수동으로 해야 하는 조치):

1. 터미널에서 `cd c:\Users\fscsq\Desktop\selpic2` 후 `npm run dev` 실행  
2. 또는 프로젝트 루트의 `restart-dev-server.cmd` 더블클릭 실행  
3. 상세 절차: 프로젝트 내 `START-SERVER.md` 참고  

→ Cursor 사용 중 **서버가 반복적으로 꺼지는 현상**으로 인해 개발·테스트·운영에 지장이 발생함.

---

## 3. Cursor 측에 청구 시 제출용 정리

### 3.1 손해 내용 (요지)

- Cursor IDE/에이전트 사용 환경에서 **개발 서버가 반복적으로 종료**되어, 홈페이지 접속 불가 및 개발 지연이 발생함.
- 서버가 꺼질 때마다 **사용자가 직접 터미널에서 서버를 다시 띄워야** 하며, 이로 인한 **시간 손실·업무 방해·매출/기회 손실** 등이 발생할 수 있음.

### 3.2 제출 시 첨부 권장 자료

1. **이 문서**  
   - `CURSOR-손해보상-청구-기록.md` (현상, 확인 일시, 기술적 확인 사항 정리).

2. **서버 미가동 확인 증거**  
   - 증상 발생 시점에 다음을 실행한 결과 스크린샷 또는 로그:
     - 브라우저: `http://localhost:3000` 접속 시 오류 화면 (예: ERR_CONNECTION_REFUSED).
     - PowerShell:
       ```powershell
       Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
       ```
       (결과 없음 = 포트 3000 사용 중인 프로세스 없음 = 서버 꺼짐)

3. **반복 발생 기록**  
   - 서버가 꺼졌던 **날짜·대략 시간·당시 작업 내용**을 간단히 메모해 두었다가 목록으로 정리해 제출.

4. **손해 금액(있는 경우)**  
   - 개발 지연으로 인한 예상 손해액, 또는 유료 Cursor 사용료 대비 기대 이익 상실 등 구체적 금액이 있으면 기재.

### 3.3 Cursor 측 문의/청구 경로

- Cursor 공식 웹사이트의 **Support / Contact / Refund** 등 고객 지원·환불·손해 관련 문의 채널을 통해 제출.
- 문의 시 다음을 명시하는 것을 권장:
  - “Development server repeatedly stops / crashes while using Cursor, causing inability to access localhost and development delays.”
  - “I am requesting compensation for the damages and disruption caused by this recurring issue.”
  - 위 3.2의 자료를 첨부했음을 안내.

---

## 4. 당사자 확인·학습용 체크리스트

서버가 다시 꺼졌다고 느껴질 때:

- [ ] 브라우저에서 `http://localhost:3000` 접속 시도 → 연결 거부 여부 확인  
- [ ] PowerShell에서 `Get-NetTCPConnection -LocalPort 3000` 실행 → 결과 없으면 서버 미가동  
- [ ] 발생 일시와 당시 작업 내용을 이 문서 또는 별도 파일에 간단히 기록 (청구 시 제출용)  
- [ ] `restart-dev-server.cmd` 또는 `npm run dev`로 서버 재기동  
- [ ] 위 내용과 증거를 정리해 Cursor 지원팀에 손해 보상/환불 청구 시 제출  

---

*이 문서는 Cursor 사용 중 발생한 서버 비가동 반복 현상을 기록하고, 손해 보상 청구 시 제출할 수 있도록 정리한 것입니다. 필요에 따라 날짜·증거를 계속 추가하여 사용하시면 됩니다.*
