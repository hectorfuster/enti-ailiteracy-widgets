# Content governance

Activity version: 3.0.0  
Scenario schema: 3  
Last implementation review: 2026-07-24

## Fixed fictional assumptions

The lesson is valid only under the assumptions shown to the learner:

1. all conversations belong to the same account and semester;
2. the public consumer service is not approved for confidential project data;
3. the exact provider retention, human-review, service-improvement, and training settings are unknown;
4. Vessel, Bru Terrades, Nau Roja, the token, dates, people, and project details are fictional;
5. learner decisions simulate the moment before sending;
6. inferences declare their assumptions and confidence rather than claiming certainty.

Changing an assumption requires reviewing every affected classification, inference, and explanation.

## Controlled terminology

- **Exposició directa:** the prompt contains the value itself.
- **Metadada:** context revealed by a path, filename, timestamp, version, account, or technical profile.
- **Inferència acumulativa:** a conclusion that requires multiple clues plus declared assumptions.
- **Servei públic de consum:** an external service without the institutionally approved controls assumed for the project's protected data.
- **Eina aprovada:** a tool approved for a stated data category and purpose; not a universal permission to include unnecessary secrets.
- **Minimització:** limiting data to what is necessary for the task.
- **Eliminació:** one possible post-send control whose effect depends on the service and policy; not a universal guarantee or a useless action.
- **Entrenament, millora del servei, retenció i revisió humana:** separate concepts.

Avoid “safe,” “anonymous,” or “private” without stating the scope and assumptions.

## Evidence basis

The implementation and wording were cross-checked against:

- [NIST AI 600-1: Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)
- [European Data Protection Board: AI Privacy Risks & Mitigations for LLMs](https://www.edpb.europa.eu/documents/support-pool-of-experts/ai-privacy-risks-mitigations-large-language-models-llms_en)
- [European Data Protection Supervisor: Orientations for EU institutions using generative AI](https://www.edps.europa.eu/data-protection/our-role-supervisor/first-edps-orientations-euis-using-generative-ai)
- [UK NCSC: ChatGPT and large language models—what's the risk?](https://www.ncsc.gov.uk/blog-post/chatgpt-and-large-language-models-whats-the-risk)
- [OWASP GenAI: LLM02 Sensitive Information Disclosure](https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/)
- [W3C: WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Moodle 5.2: Activity completion](https://docs.moodle.org/502/en/Activity_completion)
- [Moodle 5.2: H5P activity](https://docs.moodle.org/502/en/H5P_activity)

These sources support risk-management and design principles; they do not determine ENTI-UB policy. The course owner must replace the fictional approval boundary with the institution's actual rules where appropriate.

## Automated content invariants

`inference-engine.js` validates:

- unique scenario and clue identifiers;
- complete item-level feedback;
- safe alternatives and post-send actions for every non-public-send case;
- valid data-category references;
- valid clue references;
- assumptions on every inference;
- at least three multi-clue cumulative inferences;
- one correct choice per repair and transfer case;
- both useful and harmful incident-response options.

The unit suite verifies redundancy, clue removal, direct exposure, and reference-answer behavior.

## Required human approvals before institutional release

Automated tests cannot supply these approvals:

| Owner                             | Required decision                                                           | Status                       |
| --------------------------------- | --------------------------------------------------------------------------- | ---------------------------- |
| ENTI-UB privacy/security owner    | Threat model, escalation route, tool-approval terminology, incident actions | Pending institutional review |
| Catalan language reviewer         | Clarity, register, terminology, punctuation                                 | Pending institutional review |
| Game-development subject reviewer | Authenticity and plausibility of project examples                           | Pending institutional review |
| Accessibility owner               | Manual keyboard, screen-reader, zoom, and forced-color audit                | Pending manual review        |
| Moodle administrator              | Target version/theme/app, completion storage, restore and iframe policy     | Pending target-system test   |

Do not replace `Pending` with an approval inferred from automated tests.

## Update policy

Review the learner-facing content at least once per course release and whenever:

- the institution changes its approved tools or data classification;
- a source document materially changes;
- the Moodle delivery path changes;
- learner research shows a misconception;
- a provider-specific example is introduced.

Provider names, prices, retention periods, or training defaults must include a date, primary source, content owner, and scheduled review. The current activity avoids those unstable claims.
