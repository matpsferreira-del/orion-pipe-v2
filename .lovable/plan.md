

## Plan: Add photo URL field to Candidate Detail + LinkedIn in Shortlist

### Problem
1. The "URL da Foto" field exists on the `party` table but is not shown in the `CandidateDetailDialog` (the candidate view inside a job).
2. The shortlist presentation does not include the candidate's LinkedIn link.

### Changes

#### 1. `src/components/jobs/CandidateDetailDialog.tsx` — Add photo URL input

- Add `photoUrlInput` state, initialized from `application._party?.photo_url` in the `useEffect`.
- Add `AvatarImage` import from the avatar component.
- Show photo in the Avatar header when `photo_url` is set (using `AvatarImage`).
- Add a new "URL da Foto" input field (with an `Image` icon) below the phone field, similar to the existing phone/salary inputs.
- In `handleSaveNotes`, include `photo_url: photoUrlInput || null` in the `party` update alongside `phone_raw`.

#### 2. `src/pages/ShortlistPresentation.tsx` — Add LinkedIn to candidate slides

- Add `linkedin_url` field to the `ShortlistCandidate` interface.
- In the web preview candidate slides, add a LinkedIn link/icon below the candidate name/role (left column), visible when `linkedin_url` is present.
- In the `generatePptx` function, add a LinkedIn text/link element below the candidate name on each candidate slide.

#### 3. `src/components/jobs/JobDetail.tsx` — Pass LinkedIn to shortlist data

- In `handleGenerateShortlist`, include `linkedin_url: app._party?.linkedin_url || null` in both `candidatesPayload` and `processedCandidates`.

### Files to edit
- `src/components/jobs/CandidateDetailDialog.tsx`
- `src/pages/ShortlistPresentation.tsx`
- `src/components/jobs/JobDetail.tsx`

No database changes needed — `photo_url` and `linkedin_url` already exist on the `party` table.

