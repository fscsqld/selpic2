# Next.js 서버 재시작 방법

## 홈페이지가 열리지 않을 때

1. **서버가 켜져 있는지 확인**  
   터미널에 `Ready on http://localhost:3000` 이 보여야 합니다. 없으면 `restart-dev-server.cmd` 실행 또는 아래 방법 2로 서버를 켜세요.

2. **브라우저에서**  
   - 주소: **http://localhost:3000**  
   - **새로고침(F5)** 또는 **Ctrl+Shift+R** (캐시 무시 새로고침)

3. **로딩이 오래 걸리면**  
   - 1.5초 정도 기다리면 로딩 화면 없이 본문이 나오도록 되어 있습니다.  
   - 계속 로딩만 보이면 **F12 → Console** 탭에서 에러 메시지 확인.

4. **에러 화면이 보이면**  
   - "Try again" 버튼으로 재시도하거나 "Home"으로 이동해 보세요.

---

## 방법 1: 재시작 스크립트 사용 (권장)

프로젝트 폴더에 **`restart-dev-server.cmd`** 파일이 있습니다.

1. **탐색기**에서 `selpic2` 폴더 열기
2. **`restart-dev-server.cmd`** 더블클릭
3. 창이 뜨면 Node 종료 → 3초 대기 → `npm run dev` 자동 실행
4. `Ready on http://localhost:3000` 나오면 브라우저에서 접속

또는 **터미널**에서:
```cmd
cd c:\Users\fscsq\Desktop\selpic2
restart-dev-server.cmd
```

---

## 방법 2: 수동으로 끄고 다시 켜기

### 1. 기존 서버 종료

**방법 A – 터미널에서 Ctrl+C**  
- `npm run dev` 가 실행 중인 터미널에서 **Ctrl+C** 로 프로세스 종료

**방법 B – 포트 사용 중인 프로세스 종료 (Windows)**  
```cmd
netstat -ano | findstr :3000
```
- 목록에서 PID 확인 후:
```cmd
taskkill /F /PID <PID번호>
```

**방법 B – macOS/Linux**  
```bash
lsof -i :3000
kill -9 <PID>
```

## 2. 서버 다시 시작

프로젝트 폴더에서:

```bash
cd c:\Users\fscsq\Desktop\selpic2
npm run dev
```

- 정상이면 `http://localhost:3000` 에서 홈페이지 접속 가능합니다.

## 3. 그래도 안 될 때

```bash
npm run clean
npm run dev
```

또는 캐시까지 지우고:

```bash
rm -rf .next
npm run dev
```
(Windows: `rmdir /s /q .next` 후 `npm run dev`)
