# Weekly Meeting Record Skill

This folder contains a reusable skill for turning meeting transcripts into formal Chinese Word meeting records.

Contents:
- `SKILL.md`: workflow and prompting rules
- `references/style-guide.md`: structure, tone, and formatting guide
- `assets/sample_input.json`: neutral sample payload
- `scripts/create_meeting_record.py`: generate `.docx`
- `scripts/convert_docx_to_pdf.ps1`: export approved `.docx` to `.pdf`

Notes:
- Personal names are not hardcoded into the reusable skill.
- Names and attendance fields should be provided at runtime, or left as `待确认` in a first-pass draft.
- The Word layout uses a real table structure and fixed typography tuned for recurring student-organization meeting records.
