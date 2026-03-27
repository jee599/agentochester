<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Claude'un oluşturduğu her alt ajana uzman kişiliği otomatik olarak atanır.<br>
  150 ajan. Hook ile zorunlu. Sıfır yapılandırma.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcrow"><img src="https://img.shields.io/npm/v/agentcrow?style=flat-square&color=violet" alt="npm" /></a>
  <img src="https://img.shields.io/badge/agents-150-brightgreen?style=flat-square" alt="Agents" />
  <img src="https://img.shields.io/badge/tests-187_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/hook-PreToolUse-blue?style=flat-square" alt="Hook" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jee599/agentcrow?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="#the-problem">Sorun</a> •
  <a href="#quickstart">Hızlı Başlangıç</a> •
  <a href="#how-it-works">Nasıl Çalışır</a> •
  <a href="#commands">Komutlar</a> •
  <a href="#agents">Ajanlar</a> •
  <a href="../README.md">English</a> •
  <a href="README.ko.md">한국어</a> •
  <a href="README.ja.md">日本語</a>
</p>

---

<a id="the-problem"></a>
## Sorun

Claude Code bir alt ajan oluşturduğunda, o ajan **boş bir genel uzman** olur. Uzmanlık yok, kural yok, kişilik yok. İstediğinizi yapar, ama *bir uzmanın yapacağı gibi* yapmaz.

```
Siz: "Auth, test ve dokümantasyon ile bir SaaS oluştur"

Claude 4 alt ajan oluşturur:
  Agent 1: (boş) → auth kodu yazar
  Agent 2: (boş) → testler yazar
  Agent 3: (boş) → dokümantasyon yazar
  Agent 4: (boş) → UI yazar

  = genel çıktı
  = kodlama standartları yok
  = uzman bilgisi uygulanmadı
```

AgentCrow bunu çözer. Bir **PreToolUse Hook** her Agent tool çağrısını yakalar ve alt ajan başlamadan önce doğru uzman kişiliğini enjekte eder:

```
Siz: aynı istem

AgentCrow her Agent tool çağrısını yakalar:
  Agent 1: → 🏗️ Backend Mimar kişiliği enjekte edildi
            "Veri bütünlüğü konusunda paranoyak. Migration olmadan asla deploy etmez."
  Agent 2: → 🧪 QA Mühendisi kişiliği enjekte edildi
            "'Muhtemelen çalışıyor'u kişisel hakaret olarak algılar."
  Agent 3: → 📝 Teknik Yazar kişiliği enjekte edildi
            "Her cümle yerini hak eder."
  Agent 4: → 🖥️ Frontend Geliştirici kişiliği enjekte edildi
            "Kalıtım yerine bileşim, her zaman."

  = uzman düzeyinde çıktı
  = MUST/MUST NOT kuralları uygulandı
  = somut çıktılar tanımlandı
```

**Başka hiçbir araç bunu yapmaz.** ECC (100K⭐) değil, agency-agents (59K⭐) değil, wshobson (31K⭐) da değil. AgentCrow, Hook seviyesinde kişilik enjeksiyonunu zorunlu kılan tek araçtır.

---

<a id="quickstart"></a>
## ⚡ Hızlı Başlangıç

```bash
npm i -g agentcrow
agentcrow init --global
```

Hepsi bu. İki komut. Bundan sonra:
- Karmaşık istem → Claude görevlere ayırır → alt ajanlar oluşturur
- Her alt ajan → AgentCrow'un Hook'u yakalar → uzman kişiliği enjekte eder
- Alt ajan genel uzman olarak değil, uzman olarak çalışır

> [!TIP]
> İngilizce kullanıcılar: `agentcrow init --global --lang en`
> 한국어: `agentcrow init --global --lang ko`

---

<a id="how-it-works"></a>
## ⚙️ Nasıl Çalışır

```
İsteminiz: "Auth, test ve dokümanlarla bir todo uygulaması oluştur"
                    │
                    ▼
  Claude 4 göreve ayırır
                    │
                    ▼
  Claude Agent tool'u çağırır:
    { name: "qa_engineer", prompt: "E2E testleri yaz" }
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  PreToolUse Hook (otomatik)             │
  │                                         │
  │  agentcrow-inject.sh → agentcrow inject │
  │    1. catalog-index.json yükle (~5ms)   │
  │    2. "qa_engineer" ara → tam eşleşme   │
  │    3. QA Engineer kişiliğini yükle      │
  │    4. updatedInput ile isteme ekle      │
  └─────────────────────────────────────────┘
                    │
                    ▼
  Alt ajan tam kişilikle başlar:
    <AGENTCROW_PERSONA>
    You are QA Engineer — test specialist
    ## Identity
    Treats 'it probably works' as a personal insult.
    ## MUST
    - Test every public function
    - Cover happy path, edge case, error path
    ## MUST NOT
    - Never test implementation details
    - Never use sleep for async waits
    ## Deliverables
    - Unit tests, Integration tests, E2E tests
    </AGENTCROW_PERSONA>

    Write E2E tests    ← orijinal istem korunur
```

### Üç eşleştirme stratejisi

| Öncelik | Strateji | Örnek |
|---------|----------|-------|
| 1 | İsimle tam eşleşme | `name: "qa_engineer"` → QA Engineer |
| 2 | Alt ajan tipi eşleşmesi | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | Anahtar kelime + eş anlamlı bulanık | `"kubernetes helm deploy"` → DevOps Automator |

Bulanık eşleştirme bir **eş anlamlı haritası** (50+ giriş) ve **geçmiş öğrenimi** kullanır — sık kullandığınız ajanlar daha yüksek eşleştirme önceliği kazanır.

Yerleşik Claude tipleri (`Explore`, `Plan`, `general-purpose`) asla yakalanmaz.

---

## 👀 Önce / Sonra

<table>
<tr>
<td width="50%">

**❌ AgentCrow Olmadan**
```
Claude boş alt ajan oluşturur:
  prompt: "Auth için testler yaz"

  Sonuç:
  - Genel test dosyası
  - AAA yapısı yok
  - Uç durumlar atlandı
  - Kapsam hedefi yok
  - 15 dakika vasat çıktı
```

</td>
<td width="50%">

**✅ AgentCrow ile**
```
AgentCrow QA kişiliğini enjekte eder:
  prompt: <AGENTCROW_PERSONA>
    MUST: her public fonksiyonu test et
    MUST NOT: implementasyon detaylarını test etme
    Deliverables: birim + entegrasyon + E2E
  </AGENTCROW_PERSONA>
  Auth için testler yaz

  Sonuç:
  - AAA yapılı testler
  - Happy path + edge + error kapsandı
  - Kapsam raporu dahil
  - CI yapılandırması oluşturuldu
```

</td>
</tr>
</table>

---

<a id="commands"></a>
## 🔧 Komutlar

```bash
# Kurulum & Ayar
agentcrow init [--global] [--lang en|ko] [--max 5] [--mcp]

# Yaşam Döngüsü
agentcrow on / off [--global]   # Etkinleştir/Devre dışı bırak
agentcrow status                # Kurulumu kontrol et
agentcrow doctor                # 12 noktalı tanılama
agentcrow update                # En son ajanları getir
agentcrow uninstall             # Temiz kaldırma

# Ajan Yönetimi
agentcrow agents                # Tüm 150 ajanı listele
agentcrow agents search <query> # Anahtar kelime araması
agentcrow add <path|url>        # Özel ajan ekle (.md/.yaml)
agentcrow remove <role>         # Özel ajanı kaldır

# İnceleme & Hata Ayıklama
agentcrow compose <prompt>      # Ayrıştırma önizlemesi (dry run)
agentcrow stats                 # Gönderim geçmişi & analitik
agentcrow inject                # Hook işleyicisi (dahili)

# MCP Sunucusu
agentcrow serve                 # MCP sunucusunu başlat (stdio)
```

---

<a id="agents"></a>
## 🤖 150 Ajan

### 14 El Yapımı Yerleşik Ajan

Her yerleşik ajan; kişilik, iletişim tarzı, düşünce modeli, MUST/MUST NOT kuralları, çıktılar ve başarı metrikleri içerir.

| Ajan | İşlev | Temel Kural |
|------|-------|-------------|
| **Frontend Developer** | React/Next.js, Core Web Vitals, WCAG AA | "Kalıtım yerine bileşim, her zaman" |
| **Backend Architect** | API tasarımı, auth, veritabanı, önbellek | "Migration olmadan asla deploy etme" |
| **QA Engineer** | Birim/entegrasyon/E2E testleri, kapsam | "Test edilmemiş kod bozuk koddur" |
| **Security Auditor** | OWASP, CVSS puanlaması, her bulgu için PoC | "Asla 'kod güvenli' demez" |
| **UI Designer** | Tasarım sistemleri, tokenlar, aralık ölçekleri | "Token sisteminde yoksa, var değildir" |
| **DevOps Automator** | CI/CD, Docker, K8s, gizli bilgi yönetimi | "Üretimde :latest etiketi yok" |
| **AI Engineer** | LLM entegrasyonu, RAG, istem optimizasyonu | "LLM'ler korkuluk gerektiren güvenilmez bileşenlerdir" |
| **Refactoring Specialist** | Kod kokuları, Fowler kataloğu, strangler fig | "Test olmadan asla yeniden düzenleme yapma" |
| **Complexity Critic** | Döngüsel karmaşıklık, YAGNI uygulaması | "Kanıt olmadan asla karmaşık deme" |
| **Data Pipeline Engineer** | ETL, idempotentlik, şema migrasyonları | "İdempotentlik pazarlık konusu değil" |
| **Technical Writer** | API belgeleri, kılavuzlar, README'ler | "Her cümle yerini hak eder" |
| **Translator** | i18n, yerel ayar dosyaları, teknik çeviri | "Kod tanımlayıcılarını asla çevirme" |
| **Compose Meta-Reviewer** | Ajan ekip bileşimlerini denetle | "Puan 70'in altındaysa yürütmeyi engelle" |
| **Unreal GAS Specialist** | GameplayAbilitySystem, UE5 C++ | "GameplayAbilities'de hasar hesabı yok" |

### 136 Harici Ajan (13 Bölüm)

[agency-agents](https://github.com/msitarzewski/agency-agents)'den: engineering, game-dev, design, marketing, testing, sales, support, product, strategy, spatial-computing, academic, paid-media, project-management.

---

## ➕ Özel Ajanlar

```bash
agentcrow add ./my-agent.yaml           # Yerel dosya
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # Kaldır (yalnızca özel)
```

---

## 🔌 MCP Sunucusu (İsteğe Bağlı)

```bash
agentcrow init --global --mcp
```

Claude Code'a 3 araç ekler: `agentcrow_match`, `agentcrow_search`, `agentcrow_list`. Claude, ajan kataloğunu programatik olarak sorgulayabilir.

---

## 📊 İstatistikler

```bash
agentcrow stats
```

```
  🐦 AgentCrow Stats

  Match Quality
    exact  38 (81%)    ← isim doğrudan eşleşti
    fuzzy   7 (15%)    ← anahtar kelime + eş anlamlı eşleşti
    none    2 (4%)     ← eşleşme yok, passthrough

  Top Agents
    frontend_developer     12 ████████████
    qa_engineer             8 ████████
    backend_architect       6 ██████
```

---

## 🛡️ Güvenlik & Performans

| | |
|:---|:---|
| Hook gecikmesi | Agent tool çağrısı başına **< 50ms** |
| Token yükü | Kişilik enjeksiyonu başına **~350 token** |
| Fail-open | Eksik dizin veya ikili → passthrough (kesinti yok) |
| Claude yerleşik tipleri | `Explore`, `Plan`, `general-purpose` → asla yakalanmaz |
| Basit istemler | Ajan gönderimi yok, sıfır yük |
| `agentcrow off` | Tamamen devre dışı, her şey yedeklendi |

---

## 🏗️ Mimari

```
~/.agentcrow/
  ├── agents/
  │   ├── builtin/          14 YAML (el yapımı)
  │   ├── external/         136 MD (agency-agents)
  │   └── md/               150 birleşik .md dosyası
  ├── catalog-index.json    <5ms arama için önceden oluşturulmuş
  └── history.json          Gönderim kayıtları (son 1000)

~/.claude/
  ├── settings.json         SessionStart + PreToolUse hooks
  └── hooks/
      └── agentcrow-inject.sh
```

---

## 🤝 Katkıda Bulunma

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 187 tests
```

## 📜 Lisans

MIT

---

<p align="center">
  <b>🐦 Her alt ajan bir kişiliği hak eder.</b>
</p>

<p align="center">
  <a href="https://github.com/jee599/agentcrow">
    <img src="https://img.shields.io/badge/GitHub-⭐_Star_this_repo-yellow?style=for-the-badge&logo=github" alt="Star" />
  </a>
</p>
