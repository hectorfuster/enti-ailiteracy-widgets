# B5 external release checklist

This checklist covers the release evidence that cannot be produced by repository
automation. Complete it against the exact commit and `index.html` proposed for
release. Do not enter learner names, emails, Moodle identifiers, free-form
answers, or other personal data.

## Release identity

- Commit:
- `index.html` SHA-256:
- Moodle course and environment:
- Widget origin:
- Parent Moodle origin:
- Review coordinator:
- Review date:

## 1. Content and language sign-off

Use `SOURCE-CHECKLIST.md` as the item inventory. Review the context, all three
claims, answer key, explanation, verification action, source fit, and Catalan
copy for every item.

### Subject-matter review

- Reviewer:
- Role or relevant expertise:
- Date:
- All 23 items reviewed: yes / no
- Claims and answer keys approved: yes / no
- Explanations and verification actions approved: yes / no
- Source choice and scope approved: yes / no
- Changes requested:
- Evidence link or ticket:

### Catalan language review

- Reviewer:
- Role or relevant expertise:
- Date:
- All learner-visible states reviewed: yes / no
- Terminology, register, punctuation, and accessibility wording approved:
  yes / no
- Changes requested:
- Evidence link or ticket:

After approval, update the corresponding item `review.language` values and the
bank-level `reviewPolicy` truthfully. Regenerate the source checklist and rerun
the complete suite.

## 2. Research-methods review

- Reviewer:
- Date:
- Results describe only this small sample: pass / fail
- No causal inference about domain familiarity: pass / fail
- No personal automation-bias diagnosis: pass / fail
- Tie and reversed-difference wording approved: pass / fail
- Counts, confidence calibration, and five outcome labels approved: pass / fail
- Evidence link or ticket:

## 3. Assistive-technology and manual accessibility review

Run every check from a clean session. Record browser, operating-system, screen
reader, and widget versions.

### NVDA with Chrome or Firefox on Windows

- Versions:
- Start, familiarity, practice, judgment, transfer, reflection, and results
  reached using only the keyboard: pass / fail
- Each radio announces the full visible option and checked state: pass / fail
- New question and feedback heading announced once: pass / fail
- Concise status messages do not cause the whole activity to be reread:
  pass / fail
- Source links and “opens in a new tab” context are announced: pass / fail
- Focus remains visible and logical after every transition: pass / fail
- Defects and evidence:

### VoiceOver with Safari on macOS

- Versions:
- Start, familiarity, practice, judgment, transfer, reflection, and results
  reached using only the keyboard: pass / fail
- Each radio announces the full visible option and selected state: pass / fail
- New question and feedback heading announced once: pass / fail
- Concise status messages do not cause the whole activity to be reread:
  pass / fail
- Source links and new-tab context are announced: pass / fail
- Focus remains visible and logical after every transition: pass / fail
- Defects and evidence:

### Visual and input review

- 200% browser zoom in each supported browser, with no horizontal page scroll or
  overlap: pass / fail
- 320 CSS pixel supported mobile path: pass / fail
- Windows High Contrast or forced colors: pass / fail
- Reduced motion: pass / fail
- Touch targets and text selection checked on the supported mobile path:
  pass / fail
- Contrast spot-check agrees with automated results: pass / fail
- Evidence:

## 4. Real Moodle integration

Use a non-administrator student account. The parent integration must translate
the validated `onComplete` callback from `integration/moodle-wrapper.js`
through a Moodle-supported completion mechanism; `postMessage` by itself does
not update Moodle.

- Moodle version and theme:
- Wrapper or activity type:
- Browser/web path:
- Supported Moodle app/mobile path:
- Exact widget and parent origins configured: pass / fail
- Widget loads with its production CSP and no blocked required asset:
  pass / fail
- No nested vertical scrollbar at any stage: pass / fail
- Reload resumes the current session without corrupting progress: pass / fail
- Completion occurs only after core judgments, evidence transfer, and
  reflection: pass / fail
- A wrong answer can still complete the activity: pass / fail
- Moodle records exactly one completion for the student: pass / fail
- Reloading results does not duplicate completion: pass / fail
- Captured completion payload contains no ratings, answers, confidence values,
  or scores: pass / fail
- Completion acknowledgement is announced: pass / fail
- Moodle report evidence:
- Defects and evidence:

## 5. Representative learner pilot

Use at least 20 representative learners. Include at least five moderated
sessions and, whenever feasible, at least one assistive-technology user.
Collect aggregate counts only; keep analytics disabled in the widget.

- Number of attempts:
- Number of moderated sessions:
- Assistive-technology users represented:
- Median completion time:
- Chose independent evidence or expert review on the novel transfer:
- Rejected “sounds precise, therefore reliable” after completion:
- Needed instructor help to understand how to answer or continue:
- Critical accessibility blockers:

Release targets:

- median completion time is 5–7 minutes;
- at least 80% choose independent evidence or expert review;
- at least 80% reject precision as proof of reliability;
- no learner needs instructor help to understand the controls or continuation;
- no critical accessibility blocker remains.

### Aggregate item review

For each scored item, record only aggregate attempts and correct decisions.
Flag probable ceiling or floor effects, wording cues, and ambiguity. Review any
item below 20% or above 90% correct, any item with repeated interpretation
questions, and any domain difference that may reflect wording or length rather
than familiarity.

- Aggregate pilot evidence:
- Items revised or removed:
- Follow-up validation:

## 6. Release decision

| Gate                         | Owner | Status  | Evidence |
| ---------------------------- | ----- | ------- | -------- |
| Subject-matter sign-off      |       | Pending |          |
| Catalan language sign-off    |       | Pending |          |
| Research-methods sign-off    |       | Pending |          |
| NVDA manual pass             |       | Pending |          |
| VoiceOver manual pass        |       | Pending |          |
| Moodle student completion    |       | Pending |          |
| Moodle web and mobile layout |       | Pending |          |
| Representative learner pilot |       | Pending |          |

Release decision: approve / hold

- Decision owner:
- Date:
- Rationale:
