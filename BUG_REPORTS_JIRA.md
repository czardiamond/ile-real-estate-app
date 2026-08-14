# 🐛 Ilé Real Estate Platform — Professional Jira Bug Reports

This document contains **5 detailed, industry-standard Jira Bug Reports** produced during QA execution for the **Ilé Real Estate Platform**.

---

## 📌 Jira Issue: [ILE-101] MediaRecorder audio format incompatibility on Safari iOS causes silent transcription failure
- **Issue Key:** `ILE-101`  
- **Component:** `AddListingWizard.tsx` / `geminiService.ts`  
- **Issue Type:** Bug 🐛  
- **Severity / Priority:** `P1 - High`  
- **Reporter:** QA Lead  
- **Assignee:** Lead Frontend Engineer  
- **Status:** `In Review / Verification`  
- **Environment:** iOS 17.4 Safari / Mobile Web (WebKit MediaRecorder)  

### 📝 Summary
When an agent attempts to record a field audio note on iOS Safari, the browser produces an `audio/mp4` or `audio/aac` mimeType instead of `audio/webm`. The client payload defaulted to `mimeType: 'audio/webm'`, causing the Gemini API request to throw a 400 Bad Request payload validation error without showing a clear user warning.

### 🔄 Steps to Reproduce
1. Open Ilé app on iPhone (iOS 17.4 Safari).
2. Tap **"Add Listing Wizard"** -> Select **"Field Agent Voice Mode"**.
3. Tap **"Record Voice Note"**, grant microphone access, and record 8 seconds of speech.
4. Tap **"Stop Recording"**.

### 🎯 Expected Behavior
The app should dynamically detect the browser's supported MIME type (`MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'`) and forward the exact MIME header to Gemini API, ensuring smooth speech extraction.

### ❌ Actual Behavior
The app hardcoded `audio/webm` in `Blob` construction, leading to MIME mismatch. Gemini API returned an error, leaving the UI spinner stuck on "Gemini Multimodal Audio Engine extracting...".

### 💻 Console Logs / Error Snippet
```javascript
[MediaRecorder] Recorded 124982 bytes with mimeType: audio/mp4;codecs=avc1
[Gemini API Error] 400 Bad Request: "Unsupported audio format or MIME type mismatch. Provided audio/webm but stream is audio/mp4."
    at transcribeAudioToDescription (geminiService.ts:542)
    at AddListingWizard.tsx:182
```

### 💡 Root Cause & Resolution
**Root Cause:** Hardcoded `'audio/webm'` string passed to `new Blob(chunks, { type: 'audio/webm' })`.  
**Fix Applied:** Introduced dynamic MIME type detection:
```typescript
const supportedMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
  ? 'audio/webm' 
  : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/wav');
```

---

## 📌 Jira Issue: [ILE-102] Land Title Vision Inspector fails silently when uploading PDF scans exceeding 10MB
- **Issue Key:** `ILE-102`  
- **Component:** `LandTitleVerificationModal.tsx` / `landRegistryService.ts`  
- **Issue Type:** Bug 🐛  
- **Severity / Priority:** `P2 - Major`  
- **Reporter:** QA Engineer  
- **Assignee:** Fullstack Engineer  
- **Status:** `Resolved`  
- **Environment:** Chrome 122 Desktop (macOS / Windows 11)  

### 📝 Summary
Agents uploading multi-page PDF Certificate of Occupancy (C of O) survey scans over 10MB experience a silent fail where the loading spinner spins indefinitely without displaying a file size limit warning toast.

### 🔄 Steps to Reproduce
1. Navigate to **"Land Title Registry Inspector"**.
2. Drag and drop a high-resolution 15MB PDF document (`Survey_Plan_Lekki_Phase1.pdf`).
3. Click **"Run Vision Inspection"**.

### 🎯 Expected Behavior
An client-side validation guard should inspect `file.size > 10 * 1024 * 1024` immediately upon selection, blocking submission and displaying an inline error: *"File exceeds 10MB limit. Please upload a compressed image or PDF scan."*

### ❌ Actual Behavior
The file is accepted, sent over base64 stringification, causing browser memory spike and silent timeout from API endpoint.

### 💻 Console Logs / Error Snippet
```javascript
Uncaught (in promise) RangeError: Maximum call stack size exceeded
    at Array.toBase64 (LandTitleVerificationModal.tsx:88)
    at handleUpload (LandTitleVerificationModal.tsx:104)
```

### 💡 Root Cause & Resolution
**Fix Applied:** Added file size validation guard in `LandTitleVerificationModal.tsx`:
```typescript
if (selectedFile.size > 10 * 1024 * 1024) {
  setErrorMessage("File exceeds 10MB limit. Please compress file or upload PNG/JPG.");
  return;
}
```

---

## 📌 Jira Issue: [ILE-103] Mortgage Calculator slider label text overlap on mobile viewports (<360px)
- **Issue Key:** `ILE-103`  
- **Component:** `MortgageCalculator.tsx`  
- **Issue Type:** Bug 🐛  
- **Severity / Priority:** `P3 - Minor / Cosmetic`  
- **Reporter:** UI/UX Designer  
- **Assignee:** Frontend Engineer  
- **Status:** `Resolved`  
- **Environment:** Chrome DevTools Mobile View (iPhone SE - 325px width)  

### 📝 Summary
On narrow mobile screen viewports (<360px width), the **"Down Payment (₦)"** label and currency value text overlap with the adjacent **"Tenure Years"** slider pill, causing visual clutter.

### 🔄 Steps to Reproduce
1. Open app in mobile view (320px - 360px width).
2. Tap **"Mortgage Calculator"** from property details card.
3. Observe the control sliders for Down Payment and Loan Tenure.

### 🎯 Expected Behavior
Labels and values should wrap gracefully using flex column wrappers on narrow screens (`flex-col sm:flex-row`).

### ❌ Actual Behavior
Text elements were fixed in `flex-row items-center justify-between` without responsive wrapping, causing text collisions.

### 💻 Visual Artefact / CSS Class Fix
```tsx
// Before (Broken)
<div className="flex items-center justify-between">...</div>

// After (Fixed)
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">...</div>
```

---

## 📌 Jira Issue: [ILE-104] WhatsApp Business Hub lead broadcast badge counter does not decrement on archive
- **Issue Key:** `ILE-104`  
- **Component:** `WhatsAppHubModal.tsx`  
- **Issue Type:** Bug 🐛  
- **Severity / Priority:** `P3 - Minor`  
- **Reporter:** QA Engineer  
- **Assignee:** Frontend Engineer  
- **Status:** `Resolved`  
- **Environment:** All Browsers  

### 📝 Summary
When a user archives or clears a lead conversation thread in the WhatsApp Hub, the header badge indicating **"Active Enquiries (4)"** remains set at 4 instead of re-calculating active un-archived conversations.

### 🔄 Steps to Reproduce
1. Open **WhatsApp Hub Modal**.
2. Note unread lead badge showing **4**.
3. Select lead **"Folake Coker"** and click **"Archive Lead"**.
4. Check header counter badge.

### 🎯 Expected Behavior
The header counter should update reactively to **3**.

### ❌ Actual Behavior
The counter remained cached at 4 until page refresh.

### 💡 Root Cause & Resolution
**Fix Applied:** Updated derived state count:
```typescript
const activeEnquiryCount = useMemo(() => 
  leads.filter(l => !l.isArchived && l.status !== 'closed').length, 
  [leads]
);
```

---

## 📌 Jira Issue: [ILE-105] Web Audio Context suspended state blocks 60s Video Walkthrough background music on Safari
- **Issue Key:** `ILE-105`  
- **Component:** `IleWalkthroughVideoModal.tsx`  
- **Issue Type:** Bug 🐛  
- **Severity / Priority:** `P1 - High`  
- **Reporter:** Audio QA Specialist  
- **Assignee:** Lead Frontend Engineer  
- **Status:** `Resolved`  
- **Environment:** Safari 17.2 / iOS Safari  

### 📝 Summary
Safari enforces strict Autoplay policies where `AudioContext` initializes in `'suspended'` state if instantiated before explicit user interaction. When clicking **"Play Walkthrough"**, synthesized ambient chords fail to play silently.

### 🔄 Steps to Reproduce
1. Open property details on Safari browser.
2. Click **"60s Video Walkthrough Studio"**.
3. Click **"Play Walkthrough Video"**.

### 🎯 Expected Behavior
Background Web Audio synth music plays seamlessly synchronized with visual slides and speech synthesis narration.

### ❌ Actual Behavior
Speech narration plays but ambient synth chords are silent because `AudioContext.state === 'suspended'`.

### 💻 Console Logs / Error Snippet
```javascript
[Web Audio] AudioContext was not allowed to start. It must be resumed (or re-created) after a user gesture on the page.
    at initializeWebAudio (IleWalkthroughVideoModal.tsx:228)
```

### 💡 Root Cause & Resolution
**Fix Applied:** Added explicit `audioCtx.resume()` inside the click handler gesture:
```typescript
if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
  await audioContextRef.current.resume();
}
```
---
