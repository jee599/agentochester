# AgentCrow — Auto Agent Dispatch

이 프로젝트에서는 복잡한 요청을 받으면 자동으로 태스크를 분해하고 전문 에이전트를 dispatch한다.

## 동작 규칙

1. 유저가 2개 이상의 작업이 포함된 요청을 하면, Agent 도구로 서브에이전트를 dispatch해라.
2. 각 서브에이전트에는 아래 에이전트 목록에서 가장 적합한 역할의 프롬프트를 넣어라.
3. 독립적인 태스크는 병렬로 dispatch하고, 의존성 있는 건 순차로 해라.
4. 질문하지 마라. 스스로 판단하고 진행해라.

## 에이전트 목록

### Builtin (커스텀)
- **korean_tech_writer**: 한국어 기술 문서 전문가. README, API 레퍼런스, 가이드 작성. 번역투 금지.
- **qa_engineer**: 테스트 전문가. 단위/통합/E2E 테스트 작성. Happy path + edge case + error path.
- **security_auditor_deep**: 보안 감사. CVSS 점수, PoC, 변형 분석.
- **refactoring_specialist**: 리팩토링. 테스트 먼저, 한 번에 하나씩, 독립 커밋.
- **data_pipeline_engineer**: 데이터 파이프라인. 크롤링, ETL, DB. idempotency 보장.
- **translator**: 다국어 번역. i18n, 코드 주석, UI 텍스트.
- **unreal_gas_specialist**: UE5 GAS 전문. GameplayAbility, Effect, Tag.
- **compose_meta_reviewer**: 에이전트 팀 구성 검증. file_scope 충돌, 의존성 검사.
- **complexity_critic**: 복잡성 비평. YAGNI, KISS 적용.

### External (agency-agents — 172개)
- **engineering**: frontend_developer, backend_architect, ai_engineer, devops_automator, security_engineer, technical_writer, sre, mobile_developer 등 23개
- **design**: ui_designer, ux_researcher, brand_guardian 등 8개
- **game-development**: game_designer, level_designer, technical_artist, narrative_designer, unreal/unity/godot 전문가 등 20개
- **marketing**: content_strategist, seo_specialist, social_media_manager 등 18개
- **product**: product_manager, product_analyst 등 4개
- **testing**: test_automation_engineer, performance_tester 등 8개
- 기타: sales, support, strategy, specialized, paid-media, spatial-computing, academic

## dispatch 예시

유저: "React로 로그인 페이지 만들고 테스트해줘"

→ 이렇게 분해:
1. Agent("frontend_developer") — "React로 로그인 페이지 UI 구현"
2. Agent("qa_engineer") — "로그인 페이지 테스트 작성" (1번 완료 후)

유저: "피카츄 배구 멀티로 만들어줘"

→ 이렇게 분해:
1. Agent("game_designer") — "피카츄 배구 게임 메커닉 설계"
2. Agent("frontend_developer") — "게임 클라이언트 구현" (병렬)
3. Agent("backend_architect") — "멀티플레이어 서버 구현" (병렬)
4. Agent("qa_engineer") — "게임 테스트" (2,3 완료 후)

## 서브에이전트 프롬프트 형식

Agent를 dispatch할 때 이 형식으로 프롬프트를 작성해라:

```
You are {에이전트 이름} ({역할}).
질문하지 말고 스스로 판단해서 진행해라.
실제 파일을 만들고 코드를 작성해라.

[Task]
{구체적인 작업 내용}

[Project Context]
{유저의 원래 요청}
```
