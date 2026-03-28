# 환경 변수 설정 가이드

## SELPIC A 배포 시 환경 변수 설정

### 필수 환경 변수

#### `OPENAI_API_KEY`
- **설명**: SELPIC A의 Master API Key입니다. 사용자가 자신의 API Key를 제공하지 않을 때 사용됩니다.
- **형식**: `sk-`로 시작하는 OpenAI API Key
- **예시**: `OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **보안**: 이 값은 절대 소스 코드에 하드코딩하지 마세요. `.env` 파일에만 저장하고 Git에 커밋하지 마세요.

### 설정 방법

#### 1. 로컬 개발 환경
프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
OPENAI_API_KEY=sk-your-master-api-key-here
NODE_ENV=development
```

#### 2. 프로덕션 배포 (Vercel)
1. Vercel 대시보드에서 프로젝트 선택
2. Settings → Environment Variables로 이동
3. `OPENAI_API_KEY` 변수 추가
4. Value에 실제 API Key 입력
5. Environment를 Production, Preview, Development로 설정
6. Save 클릭

#### 3. 프로덕션 배포 (기타 플랫폼)
각 플랫폼의 환경 변수 설정 방법에 따라 `OPENAI_API_KEY`를 설정하세요:
- **Heroku**: Settings → Config Vars
- **AWS**: EC2 Instance 환경 변수 또는 Secrets Manager
- **Docker**: `-e OPENAI_API_KEY=...` 또는 `.env` 파일

### 보안 주의사항

1. ✅ **DO**:
   - `.env` 파일을 `.gitignore`에 추가 (이미 포함됨)
   - `.env.example` 파일을 사용하여 필요한 변수만 문서화
   - 프로덕션 환경에서는 환경 변수로만 관리
   - API Key를 정기적으로 로테이션

2. ❌ **DON'T**:
   - API Key를 소스 코드에 하드코딩
   - `.env` 파일을 Git에 커밋
   - API Key를 클라이언트 사이드 코드에 노출
   - 공개 저장소에 API Key 업로드

### 동작 방식

1. **사용자 API Key 우선**: 사용자가 Settings에서 자신의 API Key를 입력하면 그것을 사용합니다.
2. **Master API Key 폴백**: 사용자 API Key가 없을 때만 환경 변수의 `OPENAI_API_KEY`를 사용합니다.
3. **Rate Limiting**: Master API Key 사용 시 하루 5회 제한이 적용됩니다.

### 문제 해결

#### "OpenAI API key is required" 에러
- `.env` 파일이 프로젝트 루트에 있는지 확인
- 환경 변수 이름이 정확히 `OPENAI_API_KEY`인지 확인
- 서버를 재시작했는지 확인 (환경 변수 변경 후 재시작 필요)

#### API Key가 작동하지 않음
- API Key 형식이 `sk-`로 시작하는지 확인
- OpenAI 대시보드에서 API Key가 활성화되어 있는지 확인
- API Key에 충분한 크레딧이 있는지 확인
