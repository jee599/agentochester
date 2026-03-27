<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Claude द्वारा बनाए गए हर सबएजेंट को एक विशेषज्ञ पर्सोना मिलता है — स्वचालित रूप से।<br>
  150 एजेंट। Hook द्वारा लागू। शून्य कॉन्फ़िगरेशन।
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcrow"><img src="https://img.shields.io/npm/v/agentcrow?style=flat-square&color=violet" alt="npm" /></a>
  <img src="https://img.shields.io/badge/agents-150-brightgreen?style=flat-square" alt="Agents" />
  <img src="https://img.shields.io/badge/tests-187_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/hook-PreToolUse-blue?style=flat-square" alt="Hook" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jee599/agentcrow?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="#the-problem">समस्या</a> •
  <a href="#quickstart">त्वरित शुरुआत</a> •
  <a href="#how-it-works">कैसे काम करता है</a> •
  <a href="#commands">कमांड</a> •
  <a href="#agents">एजेंट</a> •
  <a href="../README.md">English</a> •
  <a href="README.ko.md">한국어</a> •
  <a href="README.ja.md">日本語</a>
</p>

---

<a id="the-problem"></a>
## समस्या

जब Claude Code एक सबएजेंट बनाता है, तो वह एक **खाली जनरलिस्ट** होता है। कोई विशेषज्ञता नहीं, कोई नियम नहीं, कोई व्यक्तित्व नहीं। वह आपका काम करता है, लेकिन *जैसे एक विशेषज्ञ करता* वैसे नहीं।

```
आप: "Auth, tests और docs के साथ एक SaaS बनाओ"

Claude 4 सबएजेंट बनाता है:
  Agent 1: (खाली) → auth कोड लिखता है
  Agent 2: (खाली) → tests लिखता है
  Agent 3: (खाली) → docs लिखता है
  Agent 4: (खाली) → UI लिखता है

  = सामान्य आउटपुट
  = कोई कोडिंग मानक नहीं
  = कोई विशेषज्ञ ज्ञान नहीं
```

AgentCrow इसे ठीक करता है। एक **PreToolUse Hook** हर Agent tool कॉल को इंटरसेप्ट करता है और सही विशेषज्ञ पर्सोना इंजेक्ट करता है — सबएजेंट शुरू होने से पहले:

```
आप: वही प्रॉम्प्ट

AgentCrow हर Agent tool कॉल को इंटरसेप्ट करता है:
  Agent 1: → 🏗️ Backend Architect पर्सोना इंजेक्ट किया
            "डेटा इंटीग्रिटी के प्रति अत्यधिक सतर्क। माइग्रेशन के बिना कभी डिप्लॉय नहीं करता।"
  Agent 2: → 🧪 QA Engineer पर्सोना इंजेक्ट किया
            "'शायद काम करता है' को व्यक्तिगत अपमान मानता है।"
  Agent 3: → 📝 Technical Writer पर्सोना इंजेक्ट किया
            "हर वाक्य अपनी जगह कमाता है।"
  Agent 4: → 🖥️ Frontend Developer पर्सोना इंजेक्ट किया
            "इनहेरिटेंस से पहले कंपोज़िशन, हमेशा।"

  = विशेषज्ञ-स्तरीय आउटपुट
  = MUST/MUST NOT नियम लागू
  = ठोस डिलीवरेबल्स परिभाषित
```

**कोई अन्य टूल यह नहीं करता।** ECC (100K⭐) नहीं, agency-agents (59K⭐) नहीं, wshobson (31K⭐) भी नहीं। AgentCrow एकमात्र टूल है जो Hook स्तर पर पर्सोना इंजेक्शन लागू करता है।

---

<a id="quickstart"></a>
## ⚡ त्वरित शुरुआत

```bash
npm i -g agentcrow
agentcrow init --global
```

बस इतना ही। दो कमांड। अब से:
- जटिल प्रॉम्प्ट → Claude कार्यों में विभाजित करता है → सबएजेंट बनाता है
- हर सबएजेंट → AgentCrow का Hook इंटरसेप्ट करता है → विशेषज्ञ पर्सोना इंजेक्ट करता है
- सबएजेंट जनरलिस्ट के बजाय विशेषज्ञ के रूप में काम करता है

> [!TIP]
> अंग्रेज़ी उपयोगकर्ता: `agentcrow init --global --lang en`
> 한국어: `agentcrow init --global --lang ko`

---

<a id="how-it-works"></a>
## ⚙️ कैसे काम करता है

```
आपका प्रॉम्प्ट: "Auth, tests और docs के साथ एक Todo ऐप बनाओ"
                    │
                    ▼
  Claude 4 कार्यों में विभाजित करता है
                    │
                    ▼
  Claude Agent tool कॉल करता है:
    { name: "qa_engineer", prompt: "E2E tests लिखो" }
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  PreToolUse Hook (स्वचालित)             │
  │                                         │
  │  agentcrow-inject.sh → agentcrow inject │
  │    1. catalog-index.json लोड (~5ms)     │
  │    2. "qa_engineer" खोजें → सटीक मैच   │
  │    3. QA Engineer पर्सोना लोड           │
  │    4. updatedInput से प्रॉम्प्ट में जोड़ें│
  └─────────────────────────────────────────┘
                    │
                    ▼
  सबएजेंट पूर्ण पर्सोना के साथ शुरू होता है:
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

    Write E2E tests    ← मूल प्रॉम्प्ट सुरक्षित
```

### तीन मैचिंग रणनीतियाँ

| प्राथमिकता | रणनीति | उदाहरण |
|-----------|--------|--------|
| 1 | नाम से सटीक मैच | `name: "qa_engineer"` → QA Engineer |
| 2 | सबएजेंट टाइप मैच | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | कीवर्ड + समानार्थी फ़ज़ी | `"kubernetes helm deploy"` → DevOps Automator |

फ़ज़ी मैचिंग एक **समानार्थी मैप** (50+ एंट्री) और **हिस्ट्री लर्निंग** का उपयोग करता है — बार-बार उपयोग किए जाने वाले एजेंट को मैचिंग में अधिक प्राथमिकता मिलती है।

बिल्ट-इन Claude टाइप (`Explore`, `Plan`, `general-purpose`) कभी इंटरसेप्ट नहीं होते।

---

## 👀 पहले / बाद

<table>
<tr>
<td width="50%">

**❌ AgentCrow के बिना**
```
Claude खाली सबएजेंट बनाता है:
  prompt: "Auth के लिए tests लिखो"

  परिणाम:
  - सामान्य टेस्ट फ़ाइल
  - AAA स्ट्रक्चर नहीं
  - एज केसेज़ छोड़ दिए
  - कवरेज लक्ष्य नहीं
  - 15 मिनट का औसत आउटपुट
```

</td>
<td width="50%">

**✅ AgentCrow के साथ**
```
AgentCrow QA पर्सोना इंजेक्ट करता है:
  prompt: <AGENTCROW_PERSONA>
    MUST: हर पब्लिक फ़ंक्शन टेस्ट करो
    MUST NOT: इम्प्लीमेंटेशन डिटेल्स टेस्ट मत करो
    Deliverables: यूनिट + इंटीग्रेशन + E2E
  </AGENTCROW_PERSONA>
  Auth के लिए tests लिखो

  परिणाम:
  - AAA स्ट्रक्चर वाले टेस्ट
  - हैप्पी पाथ + एज + एरर कवर
  - कवरेज रिपोर्ट शामिल
  - CI कॉन्फ़िग जेनरेट किया
```

</td>
</tr>
</table>

---

<a id="commands"></a>
## 🔧 कमांड

```bash
# इंस्टॉल और सेटअप
agentcrow init [--global] [--lang en|ko] [--max 5] [--mcp]

# लाइफसाइकल
agentcrow on / off [--global]   # सक्षम/अक्षम
agentcrow status                # इंस्टॉलेशन जाँचें
agentcrow doctor                # 12-पॉइंट डायग्नोस्टिक
agentcrow update                # नवीनतम एजेंट प्राप्त करें
agentcrow uninstall             # साफ़ अनइंस्टॉल

# एजेंट प्रबंधन
agentcrow agents                # सभी 150 एजेंट सूचीबद्ध करें
agentcrow agents search <query> # कीवर्ड खोज
agentcrow add <path|url>        # कस्टम एजेंट जोड़ें (.md/.yaml)
agentcrow remove <role>         # कस्टम एजेंट हटाएँ

# निरीक्षण और डिबग
agentcrow compose <prompt>      # डिकंपोज़िशन का प्रीव्यू (dry run)
agentcrow stats                 # डिस्पैच हिस्ट्री और एनालिटिक्स
agentcrow inject                # Hook हैंडलर (आंतरिक)

# MCP सर्वर
agentcrow serve                 # MCP सर्वर शुरू करें (stdio)
```

---

<a id="agents"></a>
## 🤖 150 एजेंट

### 14 हाथ से तैयार बिल्ट-इन एजेंट

हर बिल्ट-इन एजेंट में व्यक्तित्व, संवाद शैली, सोच का मॉडल, MUST/MUST NOT नियम, डिलीवरेबल्स और सफलता मेट्रिक्स हैं।

| एजेंट | कार्य | मुख्य नियम |
|--------|------|-----------|
| **Frontend Developer** | React/Next.js, Core Web Vitals, WCAG AA | "इनहेरिटेंस से पहले कंपोज़िशन, हमेशा" |
| **Backend Architect** | API डिज़ाइन, auth, डेटाबेस, कैशिंग | "माइग्रेशन के बिना कभी डिप्लॉय नहीं" |
| **QA Engineer** | यूनिट/इंटीग्रेशन/E2E टेस्ट, कवरेज | "बिना टेस्ट कोड टूटा हुआ कोड है" |
| **Security Auditor** | OWASP, CVSS स्कोरिंग, हर खोज के लिए PoC | "कभी नहीं कहता 'कोड सुरक्षित है'" |
| **UI Designer** | डिज़ाइन सिस्टम, टोकन, स्पेसिंग स्केल | "अगर टोकन सिस्टम में नहीं है, तो अस्तित्व में नहीं है" |
| **DevOps Automator** | CI/CD, Docker, K8s, सीक्रेट्स मैनेजमेंट | "प्रोडक्शन में :latest टैग नहीं" |
| **AI Engineer** | LLM इंटीग्रेशन, RAG, प्रॉम्प्ट ऑप्टिमाइज़ेशन | "LLM अविश्वसनीय कंपोनेंट हैं जिन्हें गार्डरेल चाहिए" |
| **Refactoring Specialist** | कोड स्मेल्स, Fowler कैटलॉग, strangler fig | "बिना टेस्ट कभी रिफ़ैक्टर नहीं" |
| **Complexity Critic** | साइक्लोमैटिक कॉम्प्लेक्सिटी, YAGNI लागू | "बिना सबूत कभी कॉम्प्लेक्स नहीं कहना" |
| **Data Pipeline Engineer** | ETL, इडेम्पोटेंसी, स्कीमा माइग्रेशन | "इडेम्पोटेंसी पर कोई समझौता नहीं" |
| **Technical Writer** | API डॉक्स, गाइड, READMEs | "हर वाक्य अपनी जगह कमाता है" |
| **Translator** | i18n, locale फ़ाइलें, तकनीकी अनुवाद | "कोड आइडेंटिफ़ायर कभी अनुवाद नहीं" |
| **Compose Meta-Reviewer** | एजेंट टीम कंपोज़िशन का ऑडिट | "स्कोर 70 से नीचे हो तो एक्ज़ीक्यूशन ब्लॉक" |
| **Unreal GAS Specialist** | GameplayAbilitySystem, UE5 C++ | "GameplayAbilities में डैमेज कैलकुलेशन नहीं" |

### 136 बाहरी एजेंट (13 डिवीज़न)

[agency-agents](https://github.com/msitarzewski/agency-agents) से: engineering, game-dev, design, marketing, testing, sales, support, product, strategy, spatial-computing, academic, paid-media, project-management.

---

## ➕ कस्टम एजेंट

```bash
agentcrow add ./my-agent.yaml           # लोकल फ़ाइल
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # हटाएँ (केवल कस्टम)
```

---

## 🔌 MCP सर्वर (वैकल्पिक)

```bash
agentcrow init --global --mcp
```

Claude Code में 3 टूल जोड़ता है: `agentcrow_match`, `agentcrow_search`, `agentcrow_list`। Claude प्रोग्रामेटिक रूप से एजेंट कैटलॉग क्वेरी कर सकता है।

---

## 📊 आँकड़े

```bash
agentcrow stats
```

```
  🐦 AgentCrow Stats

  Match Quality
    exact  38 (81%)    ← नाम सीधे मैच हुआ
    fuzzy   7 (15%)    ← कीवर्ड + समानार्थी मैच
    none    2 (4%)     ← कोई मैच नहीं, passthrough

  Top Agents
    frontend_developer     12 ████████████
    qa_engineer             8 ████████
    backend_architect       6 ██████
```

---

## 🛡️ सुरक्षा और प्रदर्शन

| | |
|:---|:---|
| Hook लेटेंसी | प्रति Agent tool कॉल **< 50ms** |
| टोकन ओवरहेड | प्रति पर्सोना इंजेक्शन **~350 टोकन** |
| Fail-open | इंडेक्स या बाइनरी गायब → passthrough (कोई ब्रेक नहीं) |
| Claude बिल्ट-इन | `Explore`, `Plan`, `general-purpose` → कभी इंटरसेप्ट नहीं |
| सरल प्रॉम्प्ट | कोई एजेंट डिस्पैच नहीं, शून्य ओवरहेड |
| `agentcrow off` | पूरी तरह अक्षम, सब बैकअप |

---

## 🏗️ आर्किटेक्चर

```
~/.agentcrow/
  ├── agents/
  │   ├── builtin/          14 YAML (हाथ से तैयार)
  │   ├── external/         136 MD (agency-agents)
  │   └── md/               150 एकीकृत .md फ़ाइलें
  ├── catalog-index.json    <5ms लुकअप के लिए प्री-बिल्ट
  └── history.json          डिस्पैच रिकॉर्ड (अंतिम 1000)

~/.claude/
  ├── settings.json         SessionStart + PreToolUse hooks
  └── hooks/
      └── agentcrow-inject.sh
```

---

## 🤝 योगदान

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 187 tests
```

## 📜 लाइसेंस

MIT

---

<p align="center">
  <b>🐦 हर सबएजेंट एक पर्सोना का हक़दार है।</b>
</p>

<p align="center">
  <a href="https://github.com/jee599/agentcrow">
    <img src="https://img.shields.io/badge/GitHub-⭐_Star_this_repo-yellow?style=for-the-badge&logo=github" alt="Star" />
  </a>
</p>
