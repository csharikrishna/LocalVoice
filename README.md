<div align="center">
  <img src="https://raw.githubusercontent.com/csharikrishna/LocalVoice/main/public/favicon.ico" alt="LocalVoice Logo" width="100" />
  <h1>LocalVoice</h1>
  <p><strong>Smarter communities start with a simple scan.</strong></p>

  <p>
    <a href="https://localvoice.web.app"><img src="https://img.shields.io/badge/Live_Demo-localvoice.web.app-blue?style=for-the-badge&logo=firebase" alt="Live Demo" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18.x-61DAFB.svg?style=for-the-badge&logo=react&logoColor=white" alt="React" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  </p>
</div>

<hr />

## About LocalVoice

LocalVoice (formerly CivicScan) is a progressive civic engagement platform designed to bridge the gap between citizens and local government authorities. Built initially under the APSCHE Community Service Guidelines (Tirupati, Andhra Pradesh), it empowers individuals to instantly report community issues—such as broken streetlights, overflowing garbage, or road damage—by simply scanning a QR code placed on local infrastructure.

**No app downloads, no lengthy registrations, no endless paperwork.** Just scan, snap, and submit.

---

## Key Features

- **Instant GPS Auto-Location**: Pinpoint-accurate coordinates and reverse-geocoded addresses are captured automatically the moment the form opens.
- **Frictionless Reporting Flow**: Users can submit an issue in under 60 seconds with our optimized, mobile-first interface.
- **Voice-to-Text Integration**: Citizens can dictate their issues naturally using the built-in microphone feature powered by browser Speech Recognition.
- **High-Speed Photo Uploads**: Direct camera integration via Cloudinary allows users to attach photos of the problem instantly, without burdening the database.
- **Public Pulse Map**: An interactive map tracks all issues globally. Citizens can view and upvote existing complaints to highlight their severity without submitting duplicate tickets.
- **Anonymous Notification Tracking**: Using a secure `localStorage` fingerprinting method, citizens can track the real-time status of their specific reports on a personal dashboard ("My Reports") without ever creating an account or handing over personal information.
- **Enterprise Staff Management Portal**: A fully-featured Superadmin dashboard to visually track staff members, assign roles (Department Admin, Field Worker, Dispatcher), instantly suspend malicious actors, and provision Firebase Auth accounts directly from the client.
- **Gamified Anti-Spam Rate Limits**: To protect the database from bots while rewarding active citizens, a tiered soft-limit system is implemented. Users receive celebratory UI prompts when they act as "Civic Heroes" and approach their daily reporting limit, backed by Google ReCAPTCHA.
- **Real-Time Admin Dashboard**: A dedicated dashboard allows city departments to filter, assign, map, and update the status of complaints in real-time.
- **QR Poster Generator**: Automatically generate and print localized, translated QR code posters to stick around neighborhoods.

---

## Technology Stack

LocalVoice is built using modern, lightning-fast web technologies to ensure a premium user experience and robust scalability.

### Frontend
- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [@tanstack/react-router](https://tanstack.com/router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS variables for theming
- **Icons**: [Lucide React](https://lucide.dev/)
- **Maps**: [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)

### Backend & Cloud Services
- **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (Real-time NoSQL)
- **Hosting**: [Firebase Hosting](https://firebase.google.com/docs/hosting)
- **Media Storage**: [Cloudinary](https://cloudinary.com/) (Unsigned Upload Presets)

---

## Getting Started

Follow these steps to set up the project locally for development.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A Firebase project with Firestore enabled
- A Cloudinary account for image storage

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
   Create a `.env` file in the root directory. Use the provided variables to connect to your own Firebase and Cloudinary instances:
   ```env
   VITE_FIREBASE_API_KEY="your_firebase_api_key"
   VITE_FIREBASE_AUTH_DOMAIN="your_firebase_auth_domain"
   VITE_FIREBASE_PROJECT_ID="your_firebase_project_id"
   VITE_FIREBASE_STORAGE_BUCKET="your_firebase_storage_bucket"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your_firebase_messaging_sender_id"
   VITE_FIREBASE_APP_ID="your_firebase_app_id"
   
   VITE_ADMIN_USERNAME="your_admin_username"
   VITE_ADMIN_EMAIL="your_admin_email"
   VITE_STANDARD_ADMIN_USERNAME="your_standard_admin_username"
   
   VITE_CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
   VITE_CLOUDINARY_UPLOAD_PRESET="your_unsigned_preset_name"
   ```

   **Note:** Admin authentication is securely handled by Firebase Auth. Create your initial admin users directly in the Firebase Console matching the emails defined in your `.env`.

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at [http://localhost:5174](http://localhost:5174).

---

## Architecture & Security

### Firebase Security Rules
LocalVoice utilizes strict `firestore.rules` to ensure proper data isolation and upvoting functionality without requiring user authentication. Features like atomic `.increment()` operations prevent race conditions and vote manipulation.

### Media Uploads
Images are uploaded directly from the client to **Cloudinary** using unauthenticated (unsigned) upload presets, drastically reducing server load while ensuring fast, CDN-delivered images on the frontend.

---

## Contributing

We welcome contributions from developers, designers, and civic tech enthusiasts! 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

> **LocalVoice** · Built for community service and civic engagement.
