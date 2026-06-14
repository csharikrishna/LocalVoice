# LocalVoice (CivicScan) 🚀

> **Smarter communities start with a scan.**

LocalVoice is a progressive civic engagement platform designed to bridge the gap between citizens and local government authorities. Built initially under the APSCHE Community Service Guidelines (Tirupati, Andhra Pradesh), it empowers individuals to instantly report community issues—such as broken streetlights, overflowing garbage, or road damage—by simply scanning a QR code placed on local infrastructure.

No app downloads, no lengthy registrations, no endless paperwork.

## ✨ Key Features

- **📍 Instant GPS Auto-Location**: Pinpoint-accurate coordinates are captured automatically the moment the form opens.
- **⚡ Frictionless Reporting Flow**: Users can submit an issue in under 60 seconds with our optimized, mobile-first interface.
- **🎤 Voice-to-Text Integration**: Citizens can dictate their issues naturally using the built-in microphone feature.
- **📸 Photo Evidence Uploads**: Direct camera integration allows users to attach photos of the problem on the spot.
- **👍 Community Upvoting**: A public map tracks all issues, and citizens can upvote existing complaints to highlight their severity without submitting duplicate tickets.
- **🏛️ Admin & Resolution Dashboard**: A dedicated dashboard allows city departments to filter, assign, and update the status of complaints in real-time, complete with a live map overview.

## 🛠️ Technology Stack

- **Frontend Framework**: React + TypeScript + Vite
- **Styling**: TailwindCSS & custom Vanilla CSS for premium aesthetics
- **Animations**: Framer Motion
- **Database & Storage**: Firebase Firestore & Firebase Storage
- **Routing**: `@tanstack/react-router`

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine. You will also need a Firebase project set up with Firestore and Storage enabled.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/csharikrishna/LocalVoice.git
   cd LocalVoice
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY="your_api_key"
   VITE_FIREBASE_AUTH_DOMAIN="your_auth_domain"
   VITE_FIREBASE_PROJECT_ID="your_project_id"
   VITE_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
   VITE_FIREBASE_APP_ID="your_app_id"
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5174` (or similar).

## 🛡️ Firestore Security Rules

To ensure proper data isolation and upvoting functionality without authentication, make sure your Firestore rules are configured correctly as specified in `firestore.rules`. Our architecture utilizes atomic `.increment()` operations and strict rule checks to validate data integrity.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check out the [issues page](https://github.com/csharikrishna/LocalVoice/issues).

## 📝 License

© 2026 LocalVoice. All rights reserved. Built for community service and civic engagement.
