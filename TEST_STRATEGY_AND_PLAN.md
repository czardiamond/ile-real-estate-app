# 📋 Ilé Real Estate Platform — Master Test Strategy & Test Plan Document

**Document Version:** 1.0.0  
**Project:** Ilé (AI-Powered West African Real Estate Platform)  
**Author:** QA Engineering & Testing Lead  
**Target Environment:** Cloud Run / Web Browsers (Chrome, Safari, Firefox, Edge, Mobile Web)  
**Date:** August 2026  

---

## 1. Executive Summary & Product Scope

**Ilé** is an advanced AI-driven real estate platform built for the West African property market. Key innovations include:
- **Gemini 3.6 Flash Multimodal Audio Engine**: Speech-to-text auto-transcription and property spec extraction from on-site field audio notes.
- **Land Title Vision Inspector**: OCR and AI verification for Survey Plans, Certificates of Occupancy (C of O), and Governor's Consent documents.
- **WhatsApp Business API Hub**: Automated lead engagement, broadcast management, and automated property inquiries.
- **AI Virtual Staging Studio**: Generative interior staging transforming vacant property shots into fully furnished spaces.
- **Fintech & Legal Utilities**: Mortgage & equity payment calculators, instant tenancy agreement legal contract generators, and smart prepaid utility meter top-ups.

This document outlines the **Test Strategy and Test Plan** to guarantee high quality, reliability, security, and performance across all user roles (Buyers/Renters, Agents, and Brokerages).

---

## 2. Test Objectives & Strategy

### 2.1 Core Objectives
1. **Functional Integrity**: Ensure all 15+ sub-modules function flawlessly without regressions.
2. **Multimodal AI Reliability**: Validate audio transcription accuracy, fallback handling, and title document vision inspection accuracy.
3. **Cross-Browser & Mobile Responsiveness**: Ensure 100% usability across desktop displays, tablets, and iOS/Android mobile browsers.
4. **Resilience & Negative Handling**: Verify robust error recovery for network drops, denied permissions, corrupt files, and API rate limits.
5. **Data Security & Privacy**: Ensure Firebase Firestore rules, API key server proxies, and user authentication comply with strict data safety standards.

### 2.2 Testing Levels & Types
- **Unit Testing**: Testing state utilities, formatting functions, and mathematical formulas (Mortgage rate calculations, distance matrices).
- **Integration Testing**: Testing communication between React components, Gemini AI Service (`@google/genai`), Leaflet Maps, and Firebase services.
- **Multimodal AI Testing**: Evaluated with real audio files (WebM, WAV, MP3) in English and Nigerian Pidgin/Vernacular, as well as clear vs. blurry land title documents.
- **User Interface (UI/UX) & Accessibility**: Contrast checks (WCAG AA), touch target sizes (≥44px on mobile), and fluid layout adaptability.
- **End-to-End (E2E) Flow Testing**: End-to-end user journeys from property discovery to agent chat, legal agreement draft, and mortgage computation.

---

## 3. Testing Scope

### In-Scope Modules
- [x] **Add Listing Wizard**: Audio Voice Recording, Auto-Transcribe into Description, Spec Auto-Extraction, Image upload, Map marker placement.
- [x] **Explore & Search View**: Filter pills (Price, Beds, Location, Property Type), Search query parsing, Map/Grid toggles, Save favorites.
- [x] **Land Title Registry Inspector**: Survey plan verification, C of O verification, Governor's Consent validation, Fraud score calculation.
- [x] **WhatsApp Business Hub**: Conversation feeds, quick template responses, broadcast message scheduling, lead sync.
- [x] **AI Virtual Staging**: Style selection (Modern, Scandinavian, Luxury, Minimalist), room type selection, transformation.
- [x] **Legal Contract Generator**: Deed of Lease, Tenancy Agreement, Purchase Agreement template generation & PDF/Text export.
- [x] **Mortgage & Payment Calculator**: Down payment ratio, tenure years, interest rates, equity breakdown charts.
- [x] **60s Video Walkthrough Studio**: Web Audio background synth generation, speech synthesis voiceover, property feature highlights.
- [x] **Smart Meter Utilities**: Prepaid meter token generation, meter number validation, instant balance recharge.

---

## 4. Test Environment & Prerequisites

| Environment Component | Requirement / Specification |
| :--- | :--- |
| **Hosting Environment** | Cloud Run Container with Nginx Proxy on Port 3000 |
| **Frontend Runtime** | React 19, TypeScript 5.8, Vite 6, Tailwind CSS |
| **AI Backend** | `@google/genai` (Gemini 3.6 Flash) |
| **Browser Support** | Google Chrome (v110+), Safari (v16+), Firefox (v110+), Mobile Chrome/Safari |
| **Hardware Devices** | Built-in Microphone & Camera permissions enabled for media testing |
| **Database** | Firebase Firestore (sandboxed applet config) |

---

## 5. Entry & Exit Criteria

### Entry Criteria
- Codebase builds without fatal TypeScript or Vite compilation errors (`npm run build`).
- API keys (Gemini, Firebase) populated in environment configuration.
- Base test environment deployed and accessible at target URL.

### Exit Criteria
- 100% of Critical and High priority test cases executed and passed.
- No open Blockers or High Severity defects remaining.
- All 20+ Test Cases verified in the Test Matrix.
- Test execution summary signed off by QA Lead.

---

## 6. Risk Assessment & Mitigation Matrix

| Risk Event | Severity | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Microphone Permission Denied** | Medium | High | Fallback automatically to sample field audio transcript for smooth demo & notification toast. |
| **Gemini API Rate Limit / Quota 429** | High | Low | Implement retry backoff and user-friendly status banner indicating AI high traffic. |
| **Blurry or Unreadable Title Documents** | Medium | Medium | Vision Inspector detects unreadable text and prompts agent for high-res document upload. |
| **iOS Safari Audio Context Autoplay Lock** | High | Medium | Resume AudioContext inside explicit user tap handler before sound generation. |

---

## 7. Defect Management & Severity Definitions

 defects are categorized using the standard Jira taxonomy:
- **P0 - Blocker**: App crash, unusable core page, missing essential buttons preventing workflow.
- **P1 - Critical**: Primary feature failure (e.g., Gemini transcription completely failing without fallback).
- **P2 - Major**: Functional issue with acceptable workaround available.
- **P3 - Minor / Cosmetic**: Alignment, typography, spacing, or minor layout glitch.
