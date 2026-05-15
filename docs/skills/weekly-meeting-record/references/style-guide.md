# Weekly Meeting Record Style Guide

## Purpose

This skill turns meeting transcripts into formal Chinese meeting records in a fixed Word layout.

It is optimized for recurring student-organization meetings, but its rules are intentionally generalized so it can be reused without exposing historical participant names.

## Privacy Rule

Do not hardcode personal names into the reusable skill.

Names must be treated as runtime inputs, including:

- leave attendees
- late attendees
- absent attendees
- hosts
- recorder
- named task owners inside the body

If the user does not provide them, ask for completion first. If the user insists on a first-pass draft, use `待确认`.

## Approved Structure

Use this document structure:

1. Title centered above the table
2. One Word table containing:
   - time / location
   - leave attendees
   - late attendees
   - absent attendees
   - hosts / recorder
   - a centered `会议内容` row
   - a merged body cell for the full meeting content

## Body Rules

The body should contain:

- `开始时间：HH:MM`
- blank line
- numbered sections such as:
  - `1.项目组工作：`
  - `2.基层组工作：`
  - `3.考评组工作：`
  - `4.其他工作：`
- blank line between major sections
- `结束时间：HH:MM`

Only include sections actually mentioned in the meeting.

## Tone Rules

- formal
- concise
- action-oriented
- no emotional language
- no transcript-style fillers
- no internal gossip or casual venting
- no hidden internal “rules” unless they are formal meeting requirements

## Grouping Rules

Group by work nature, not by transcript order.

- `项目组工作`: publicity, project execution, event preparation, meeting logistics
- `基层组工作`: grassroots liaison, development work, transfer work, routine organizational affairs
- `考评组工作`: review, scoring, registration, evaluation, auditing-related work
- `其他工作`: remaining formal items that do not fit the above

## Formatting Rules

Use these typography settings:

- title: `方正小标宋简体`, 18pt, bold
- table labels: `方正小标宋简体`, 12pt
- table values: `宋体`, 12pt
- section headers: `宋体`, 12pt, bold
- body text: `宋体`, 12pt
- start/end time labels: `方正小标宋简体`, 12pt

Margins:

- top: about 2.54 cm
- bottom: about 2.54 cm
- left: about 3.18 cm
- right: about 3.48 cm

## Completion Checklist

Before generating the first-pass document, try to confirm:

- meeting number
- date
- start time
- end time
- location
- leave attendees
- late attendees
- absent attendees
- hosts
- recorder

If any are missing, ask the user to fill them in. If the user still wants a draft immediately, mark them as `待确认`.
