# 🚀 AutoSense - Automation That Learns From You

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://github.com/yourusername/autosense)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Hackathon 2026](https://img.shields.io/badge/Hackathon-2026-orange)](https://hackathon2026.com)

**AutoSense** is an intelligent Chrome extension that learns your browsing patterns and automates repetitive workflows—without any manual configuration. Built in 48 hours for Hackathon 2026.

![AutoSense Demo](assets/demo.gif)  

---

## 👥 Team Information

**Team Name:** The Matrix  

### Team Members:
- **Suman Mishra** – sm032204@gmail.com – [mishrasuman7](https://github.com/mishrasuman7)  
- **Suraj Joshi** – surajjoshi21@gmail.com – [sj77769](https://github.com/sj77769)  
- **Yojana Gautam** – gautamyojana221@gmail.com – [yojanagautam](https://github.com/yojanagautam)  

---

## 📌 Project Details

**Project Title:** AutoSense  

**Category:** Open Innovation  

### 🧩 Problem Statement

Users often repeat the same browsing sequences daily (e.g., opening YouTube and then Google multiple times).  
Existing automation tools require manual rule creation and do not intelligently detect user behavior patterns.  
This leads to repetitive actions and reduced productivity.

---

### 💡 Solution Overview

AutoSense is a browser extension that passively monitors browsing behavior, detects repeated sequences using time-based pattern analysis, and suggests smart automations. Once confirmed by the user, these patterns can be converted into one-click automations. The system runs entirely locally, ensuring full privacy and zero cloud dependency.

---

## 🛠 Technical Stack

### Frontend / Extension:
- HTML5
- CSS3
- Vanilla JavaScript (ES6)
- Chrome Extension APIs (Manifest V3)

### Database:
- Browser Local Storage

### Other Technologies:
- Sliding Window Sequence Detection Algorithm
- Confidence Threshold Scoring
- Event Buffering Logic
- URL Sanitization System

---

## ✨ Core Features

### 1️⃣ Intelligent Pattern Detection
- Real-time browsing event monitoring
- Detects repeated domain sequences (e.g., YouTube → Google 3+ times)
- Time-based validation (2–30 second gap filtering)
- Duplicate prevention (ignores tab switches & back navigation)
- Confidence-based scoring before suggestion

---

### 2️⃣ Multi-URL Selection System
- Detects multiple repeated patterns
- Displays selection dialog when multiple automations are possible
- Runtime execution selection ("Which site to open?")
- Manual multi-URL automation creation
- Dynamic automation activation

---

### 3️⃣ Automation Management
- One-click automation activation
- Pause / Resume functionality
- Edit trigger & action domains
- Delete automation option
- Status tracking with active/paused indicators

---

### 4️⃣ Privacy-First Architecture
- 100% local storage
- No external servers
- No cloud sync
- URL query parameter sanitization
- One-click clear browsing data

---

### 5️⃣ Smart Dashboard
- Live statistics (events, patterns, automations)
- Pattern confidence display
- Last 50 browsing events log
- Manual automation creation
- Modern responsive UI

---

### 6️⃣ Intelligent Dialog System
- Context-aware popup suggestions
- Responsive modal design
- Keyboard accessible
- Fallback browser notification system

---

## 🧠 How It Works (Technical Flow)

1. User browsing events are captured using Chrome Extension APIs.
2. Events are sanitized (domain-level only).
3. Events are buffered in a sliding window.
4. Sequence detection logic checks for repeated patterns.
5. If confidence threshold is met:
   → Suggestion popup is shown.
6. User can convert pattern into automation.
7. Automation executes when trigger domain is opened.

---

## ⚙️ Installation & Setup

### 🔹 Clone Repository

```bash
git clone https://github.com/mishrasuman7/protobytes-2.0-team-TheMatrix.git
cd autosense

```

## 🔹 Load Extension in Chrome

- Open Chrome
- Go to: chrome://extensions/
- Enable Developer Mode
- Click Load Unpacked
- Select the project folder
- The extension will now run locally in your browser.

```
```

## 📸 Screenshots / Demo

```

```

## 🏆 Hackathon Value

AutoSense demonstrates strong technical and innovation value within a limited development timeframe:

- **Behavior-Driven Automation** – Detects repeated browsing patterns without requiring manual rule configuration.
- **Algorithmic Pattern Detection** – Implements sliding window logic with time-based filtering (2–30 seconds) to reduce false positives.
- **Privacy-First Architecture** – Fully client-side implementation with zero external data transmission.
- **Lightweight & Deployable** – Runs entirely as a Chrome Extension without backend infrastructure.
- **Modular & Scalable Design** – Structured logic that can be extended to advanced analytics or ML-based detection.

This project highlights practical implementation, real-world usability, and technical feasibility within a hackathon environment.

---

## 🚀 Future Scope

AutoSense can be expanded in multiple directions:

- **Adaptive Learning Model** – Integrate machine learning to improve confidence scoring dynamically.
- **Productivity Analytics Dashboard** – Provide deeper insights into browsing habits and time usage.
- **Cross-Browser Support** – Extend compatibility to Firefox and Edge.
- **Encrypted Cross-Device Sync** – Optional secure synchronization for users who want multi-device automation.
- **Advanced Pattern Clustering** – Detect multi-step behavioral flows beyond two-domain sequences.
- **Enterprise Mode** – Organizational productivity insights with strict privacy controls.

```
```

## 📜 License

This project was developed for hackathon evaluation purposes.

```
```
🤝 Acknowledgments

Thanks to mentors and organizers for guidance and feedback during the hackathon.

```
