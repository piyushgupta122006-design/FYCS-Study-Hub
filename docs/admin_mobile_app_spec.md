# FYCS Study Hub - Admin Mobile Application Specification
## Comprehensive System Analysis & Mobile App Integration Guide
**Version:** 1.0.0  
**Author:** Antigravity System Architect  
**Target Audience:** Mobile App Developers (Flutter, React Native, Native Android/iOS)  
**Status:** Approved for Implementation  

---

## 1. Executive Summary & Purpose

### 1.1 Project Context
The **FYCS Study Hub** is a web-based educational portal designed for computer science students to access notes, practical sheets, assignments, and important questions (IMP). The platform operates on a moderated content model: students or admins upload files, which are initially placed in a "Pending" queue. Administrators review these uploads via an Admin Panel, approving them to make them live or rejecting/deleting them.

### 1.2 The Mobile App Objective
The objective is to build a **Native Mobile Application** specifically for platform administrators. The core value proposition is to automate and streamline the upload process using native mobile features. Instead of manually downloading a file, opening a browser, logging in, navigating to the upload page, and selecting the file, the administrator will utilize the native operating system's **Share Sheet / Send Intent** system.

### 1.3 The Core User Flow
1. **File Discovery**: The administrator browses local or cloud storage using their mobile device's default File Explorer (e.g., Apple Files app, Google Files, or Samsung My Files).
2. **Triggering Share**: The admin highlights a file (PDF, DOCX, ZIP, JPG, PNG) and taps the OS **Share** button.
3. **App Selection**: The admin selects **FYCS Study Hub Admin** from the OS share menu.
4. **Instant Action (Latency Hiding)**: 
   * The OS launches the app (or its sharing extension).
   * The app receives the file stream/URI and **immediately begins uploading it to Google Drive** in the background.
   * This background upload occurs *while* the uploader is interacting with the user interface, hiding the network latency of the upload.
5. **Metadata Form Completion**: While the upload progresses, the uploader fills out the document metadata:
   * **Title**: Auto-populated from the filename, editable.
   * **Semester**: Selected from a dropdown (Semester 1–4).
   * **Document Type**: Notes, Practicals, IMP, or Assignment.
   * **Subject**: Filtered dynamically based on the selected Semester.
6. **Submission & Duplicate Checking**: 
   * Once the form is complete and the background upload finishes (generating a valid Google Drive file URL and ID), the admin taps "Publish".
   * The app runs a duplicate prevention query against Cloud Firestore (verifying no duplicate title or file name exists in that subject).
   * If valid, it writes the document to Firestore with `status: "Pending"`.
   * An optional Web3Forms email notification is dispatched to notify other administrators.
7. **In-App Moderation**: The app provides a dedicated **Moderation Panel** showing a real-time list of all pending materials. Admins can click "Approve" (updating status to `Approved`) or "Reject" (deleting the record) directly from their phone.

---

## 2. Table of Contents

- [1. Executive Summary \& Purpose](#1-executive-summary--purpose)
- [2. Table of Contents](#2-table-of-contents)
- [3. System Architecture \& Data Flow Diagrams](#3-system-architecture--data-flow-diagrams)
- [4. Complete Environment Variables, API Keys \& Credentials](#4-complete-environment-variables-api-keys--credentials)
- [5. Website Upload System Code Review](#5-website-upload-system-code-review)
- [6. Native Share Sheet Intent Integration](#6-native-share-sheet-intent-integration)
- [7. Google Drive Apps Script API Reference](#7-google-drive-apps-script-api-reference)
- [8. Cloud Firestore Schema \& Database Rules](#8-cloud-firestore-schema--database-rules)
- [9. Mobile User Interface (UI) & Screen Specifications](#9-mobile-user-interface-ui--screen-specifications)
- [10. Cross-Platform Developer Implementation Code](#10-cross-platform-developer-implementation-code)
- [11. Native Android & iOS Code Samples](#11-native-android--ios-code-samples)
- [12. Business Logic, Duplicate Prevention & Verification](#12-business-logic-duplicate-prevention--verification)

---

## 3. System Architecture & Data Flow Diagrams

### 3.1 Architectural Components Diagram

The diagram below illustrates the relationship between the mobile client app, the Firebase Backend, the Google Drive Apps Script uploader, and the Web3Forms notification system.

```mermaid
graph TD
    subgraph "Mobile Client (Native App)"
        ShareExt[Share Extension / Intent Listener] --> FileBuffer[Temp File Buffer]
        FileBuffer --> UploadService[Background Upload Service]
        UI[Upload Form UI] --> DBManager[Firestore DB Manager]
        AuthManager[Firebase Auth Manager]
    end

    subgraph "Google Cloud Platform"
        GAS[Google Apps Script Web App] --> |Google Drive API| GD[Target Google Drive Folder]
    end

    subgraph "Firebase Backend"
        FA[Firebase Authentication]
        FS[Cloud Firestore]
        FS_Rules[Security Rules]
    end

    subgraph "Third-Party APIs"
        W3F[Web3Forms Email Engine]
    end

    ShareExt --> |Triggers| UI
    UploadService --> |POST Base64 Payload| GAS
    GAS --> |Returns fileUrl & fileId| UploadService
    DBManager --> |Reads/Writes| FS
    DBManager -.-> |Evaluates| FS_Rules
    AuthManager --> |Authenticates| FA
    DBManager --> |Sends Alert| W3F
```

### 3.2 File Upload & Metadata Sync Sequence

This sequence diagram illustrates the lifecycle of a single file shared from the device's native explorer.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant OS as Device OS (Android/iOS)
    participant App as Mobile App Main Thread
    participant Worker as Background Upload Worker
    participant GAS as Google Apps Script Endpoint
    participant FS as Cloud Firestore
    participant Web3 as Web3Forms API

    Admin->>OS: Long Press Document -> Tap Share
    OS->>Admin: Open Share Sheet
    Admin->>OS: Choose "FYCS Study Hub Admin"
    OS->>App: Launch App & Pass File Path / Stream
    activate App
    App->>Worker: Instantiate background worker with file URI
    activate Worker
    Worker->>Worker: Convert File to Base64
    Worker->>GAS: POST JSON Payload (Base64 + File Name)
    Note over App, Admin: Admin sees Uploading UI state (e.g. progress bar moving 0% to 99%)
    Admin->>App: Input Title, Select Semester, Select Subject, Select Type
    GAS-->>Worker: Return 200 OK (fileUrl, fileId)
    deactivate Worker
    Worker-->>App: Notify main thread of successful upload
    App->>App: Enable "Publish" Button (Form validated & file uploaded)
    Admin->>App: Tap "Publish"
    App->>FS: Query /materials for duplicate (Title & Subject Match)
    FS-->>App: Query Response (Empty = No Duplicate)
    App->>FS: Add Document to /materials (status: "Pending")
    FS-->>App: Document ID Created
    App->>Web3: Trigger Web3Forms POST (Email notification alert)
    App->>Admin: Toast notification: "Material Submitted Successfully"
    App->>App: Clear Form State & Navigate to Dashboard
    deactivate App
```

---

## 4. Complete Environment Variables, API Keys & Credentials

The mobile application must interface with the same Firebase project and microservices as the web application. These keys are extracted directly from the system configuration files (`.env.local` and `src/firebase.js`).

### 4.1 Firebase SDK Parameters
These configuration options must be initialized in the Firebase App module of the mobile application.

```json
{
  "apiKey": "AIzaSyCCDR8O9zy0bSyCa5dsinR8SSmnMQcWxTY",
  "authDomain": "fycs-study-hub.firebaseapp.com",
  "projectId": "fycs-study-hub",
  "storageBucket": "fycs-study-hub.firebasestorage.app",
  "messagingSenderId": "308883339928",
  "appId": "1:308883339928:web:a5e59d402b7ddf0e4b2eed"
}
```

### 4.2 API Gateways & Integration Credentials
* **Google Apps Script Web App Endpoint**:
  ```
  https://script.google.com/macros/s/AKfycbzc1QTM0qx8OPGs16QRXbtEevBgik4pceDjLpKKS98f8DBD7A8yszDjmibQb7cTQBs8tQ/exec
  ```
  *Note: Standard native SDK calls to this endpoint will redirect with an HTTP 302. Mobile HTTP clients must be configured to automatically follow redirects.*
  
* **Web3Forms Access Token**:
  ```
  0fce181f-dbfc-4943-887e-5e39cc2ad54a
  ```
  *Sends email alerts when users upload educational resources.*
  
* **ImgBB API Key**:
  ```
  18689c27743c695f94310e3bd0a52c99
  ```
  *Optional profile/auxiliary image hosting.*

### 4.3 Administrator Emails (Superadmins)
Inside the frontend security layer, administrative permissions are granted if the user's logged-in email matches one of the following addresses:
* `rishiuttamsahu@gmail.com`
* `piyushgupta122006@gmail.com`

---

## 5. Website Upload System Code Review

The existing web application implements its upload logic across three main components:
1. `src/pages/Upload.jsx` (User/Student Upload Form)
2. `src/pages/AdminUpload.jsx` (Admin Upload Form & Pending Tab)
3. `src/context/AppContext.jsx` (Global state, helper functions, and database writes)

### 5.1 Analysis of AppContext.jsx Uploader Methods
In `AppContext.jsx`, file upload is handled by two main functions: `uploadSingleFile` and `startGlobalUpload`.

#### 5.1.1 `uploadSingleFile` (Line 495)
This method is responsible for uploading a single file to Google Drive via the Apps Script API:
1. It extracts the file extension and sanitizes the original file name by replacing system illegal characters with a hyphen (`-`).
2. It prefixes the uploader's username to the file name.
3. It converts the file to a Base64 string using a `FileReader`.
4. It executes an HTTP POST query to the `SCRIPT_URL` with a JSON payload.
5. It returns the Google Drive sharing URL and the unique file ID.

```javascript
const uploadSingleFile = async (file, userName) => {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzc1QTM0qx8OPGs16QRXbtEevBgik4pceDjLpKKS98f8DBD7A8yszDjmibQb7cTQBs8tQ/exec";
  
  const cleanPart = (value) => (value || "")
    .toString()
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ");

  const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
  const originalNameWithoutExt = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
  const cleanName = cleanPart(originalNameWithoutExt);
  const customFileName = userName ? `${cleanPart(userName)}-${cleanName}${extension}` : `${cleanName}${extension}`;

  const base64Data = await toBase64(file);
  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ base64: base64Data, name: customFileName, mimeType: file.type })
  });

  const result = await response.json();
  if (result.status === "success") {
    return { success: true, fileUrl: result.fileUrl, fileId: result.fileId };
  } else {
    throw new Error(result.message || "Failed to upload file to Google Drive");
  }
};
```

#### 5.1.2 `startGlobalUpload` (Line 523)
This function manages bulk submissions and writes the metadata to Cloud Firestore. 
1. It updates a global state object `globalUploadState` to track upload progress.
2. It processes files sequentially:
   * If a file has already been uploaded (e.g. pre-uploaded via the Drive Picker), it uses the existing link.
   * If not, it displays simulated progress (lines 561–573) while the file uploads to the Apps Script.
3. Once the upload finishes, it writes the metadata to the Firestore `materials` collection with a status of `"Pending"`.
4. It sends an email alert to the admin email address using Web3Forms.

```javascript
const startGlobalUpload = async (filesToUpload, metadata, userName, userEmail) => {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzc1QTM0qx8OPGs16QRXbtEevBgik4pceDjLpKKS98f8DBD7A8yszDjmibQb7cTQBs8tQ/exec";
  const emailAccessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
  let successCount = 0;

  // Track upload progress
  setGlobalUploadState({ uploading: true, current: 0, total: filesToUpload.length, realProgress: 0 });

  const semName = semesters.find(s => String(s.id) === String(metadata.semester))?.name || `Sem-${metadata.semester}`;
  const subName = subjects.find(s => String(s.id) === String(metadata.subject))?.name || `Sub-${metadata.subject}`;

  // File sanitization and upload loop...
  // Details omitted for clarity, matching logic of uploadSingleFile
}
```

### 5.2 Analysis of AdminUpload.jsx Tab Layout
The `AdminUpload.jsx` view contains two tabs:
* **Upload Tab**: Renders the metadata form. Admins can enter a custom title, select the semester, filter subjects dynamically, and select a file via the Google Picker. It also provides a **Convert Link** button. The convert utility extracts the unique file ID from the picker URL (`https://drive.google.com/file/d/ID/view?usp=sharing`) and formats it as a direct download link: `https://drive.google.com/uc?export=download&id=ID`.
* **Pending Tab**: Displays a real-time list of all materials where `status == "Pending"`. It provides controls for administrators to review, approve, or reject submissions.

---

## 6. Native Share Sheet Intent Integration

A key requirement for the mobile application is registering it as a share target within the mobile operating system, allowing users to share files directly from their device's file manager to the app.

### 6.1 Android Configuration (`AndroidManifest.xml`)
On Android, the system uses **Intent Filters** to declare what mime types the application can receive. Register the following configuration inside the main `<activity>` block in your project’s manifest:

```xml
<intent-filter android:label="FYCS Hub Upload">
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <!-- Filter common document and media types -->
    <data android:mimeType="application/pdf" />
    <data android:mimeType="application/msword" />
    <data android:mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
    <data android:mimeType="application/vnd.openxmlformats-officedocument.presentationml.presentation" />
    <data android:mimeType="application/zip" />
    <data android:mimeType="image/*" />
    <data android:mimeType="text/plain" />
</intent-filter>
```

### 6.2 iOS Configuration (`ShareExtension` plist)
On iOS, the sharing mechanism runs out-of-process in a **Share Extension**. You must declare activation rules in the share extension's `Info.plist`:

```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionAttributes</key>
    <dict>
        <key>NSExtensionActivationRule</key>
        <string>
            SUBQUERY (
                extensionItems,
                $extensionItem,
                SUBQUERY (
                    $extensionItem.attachments,
                    $attachment,
                    ANY $attachment.registeredTypeIdentifiers UTI-CONFORMS-TO "com.adobe.pdf"
                    OR ANY $attachment.registeredTypeIdentifiers UTI-CONFORMS-TO "public.image"
                    OR ANY $attachment.registeredTypeIdentifiers UTI-CONFORMS-TO "public.data"
                    OR ANY $attachment.registeredTypeIdentifiers UTI-CONFORMS-TO "com.microsoft.word.doc"
                ).@count > 0
            ).@count > 0
        </string>
    </dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.share-services</string>
    <key>NSExtensionPrincipalClass</key>
    <string>ShareViewController</string>
</dict>
```

---

## 7. Google Drive Apps Script API Reference

The Google Apps Script serves as a serverless backend for file uploads to Google Drive. It decodes base64 strings and saves the resulting files directly into a targeted Google Drive folder.

### 7.1 Payload Specification
The POST request sent to the script endpoint must follow these parameters:
* **Method**: `POST`
* **Endpoint URL**: `https://script.google.com/macros/s/AKfycbzc1QTM0qx8OPGs16QRXbtEevBgik4pceDjLpKKS98f8DBD7A8yszDjmibQb7cTQBs8tQ/exec`
* **Headers**: `Content-Type: text/plain` (This bypasses CORS preflight checks in web contexts and matches the script's raw POST parsing handler).

#### Body Schema (JSON Stringified)
```json
{
  "base64": "JVBERi0xLjQKJdPr6gogMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCiAgPj4KZW5kb2Jq...",
  "name": "rishi-Semester 1-Mathematics-Unit 1 Notes.pdf",
  "mimeType": "application/pdf"
}
```

### 7.2 Expected Responses

#### 7.2.1 Success Response
```json
{
  "status": "success",
  "fileUrl": "https://drive.google.com/file/d/1A2b3C4d5E6fG7h8I9j0K1L2M3N4O5P6Q/view?usp=drivesdk",
  "fileId": "1A2b3C4d5E6fG7h8I9j0K1L2M3N4O5P6Q"
}
```

#### 7.2.2 Error Response
```json
{
  "status": "error",
  "message": "Folder not found or insufficient write permissions."
}
```

---

## 8. Cloud Firestore Schema & Database Rules

The mobile application must read and write to Firestore in compliance with the following collection schemas and security rules.

### 8.1 Materials Collection Schema (`/materials/{docId}`)
The main database collection storing metadata for educational resources.

```
/materials (Collection)
  ├── {docId} (Document - auto-generated ID)
        ├── title (String): Name of the file (e.g. "Unit 1 Practical Exercises")
        ├── semId (String): Semester numeric string ("1", "2", "3", "4")
        ├── subjectId (String): Document ID of the subject
        ├── type (String): "Notes" | "Practicals" | "IMP" | "Assignment"
        ├── link (String): Direct download Google Drive link (https://drive.google.com/uc?export=download&id=...)
        ├── fileId (String): Unique file ID returned from Google Drive
        ├── fileName (String): Name of the file stored in Google Drive
        ├── status (String): "Pending" | "Approved"
        ├── views (Number): Initial value 0, incremented by user visits
        ├── downloads (Number): Initial value 0, incremented by downloads
        ├── uploadedBy (String): Creator's display name
        ├── uploadedByUid (String): Creator's authenticated Firebase UID
        ├── uploadedByEmail (String): Creator's email address
        ├── date (Timestamp): Server timestamp of upload
        ├── createdAt (Timestamp): Server timestamp for sorting
        ├── approvedAt (Timestamp): Server timestamp of approval (null initially)
```

### 8.2 Subjects Collection Schema (`/subjects/{docId}`)
Contains subjects mapped to semesters. The mobile app must read this collection to populate the subject dropdown based on the selected semester.

```
/subjects (Collection)
  ├── {docId} (Document - auto-generated ID)
        ├── name (String): Subject name (e.g. "Database Management Systems")
        ├── semId (Number): Semester numeric ID (1, 2, 3, 4)
        ├── icon (String): Lucide-react icon name (e.g. "Book", "Code", "Star")
        ├── createdAt (Timestamp): Time of creation
```

### 8.3 Users Collection Schema (`/users/{uid}`)
Determines roles for role-based access control (RBAC).

```
/users (Collection)
  ├── {uid} (Document ID matching Firebase Auth User UID)
        ├── displayName (String): Display name of user
        ├── email (String): Email address of user
        ├── photoURL (String): URL to user profile picture
        ├── role (String): "student" | "admin" | "superadmin"
        ├── isBanned (Boolean): Flag to block access if true
        ├── createdAt (Timestamp): Sign up timestamp
```

### 8.4 Firestore Security Rules Analysis
Below is the relevant configuration extracted from `firestore.rules`. It regulates database read and write access based on the user's authentication state and role:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Checks if the user is authenticated and retrieves their role from their user document
    function getUserRole() {
      let userPath = /databases/$(database)/documents/users/$(request.auth.uid);
      return exists(userPath) ? get(userPath).data.role : 'student';
    }

    // Materials Security Policy
    match /materials/{document} {
      allow read: if true; // Public access to approved/all materials
      
      // Students can upload files, but their status must be set to 'Pending'
      allow create: if request.auth != null && 
        (request.resource.data.status == 'Pending' || getUserRole() == 'admin' || getUserRole() == 'superadmin'); 
      
      // Modifying or approving files requires an admin role
      allow update: if request.auth != null && 
        (getUserRole() == 'admin' || getUserRole() == 'superadmin');
        
      // Deleting records requires a superadmin role
      allow delete: if request.auth != null && getUserRole() == 'superadmin';
    }

    // Subjects Security Policy
    match /subjects/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
        (getUserRole() == 'admin' || getUserRole() == 'superadmin');
    }
  }
}
```

---

## 9. Mobile User Interface (UI) & Screen Specifications

The application should use a cohesive, dark-themed visual design. We recommend using a color palette featuring dark backgrounds, translucent surfaces (glassmorphism), and gold/amber accent highlights.

```
Theme Color Palette Guide:
- Primary Background: Dark Grey/Black (e.g., #0c0c0e or HSL 240, 10%, 5%)
- Container Backgrounds: Semi-transparent white with backdrop filter (Glassmorphism: rgba(255,255,255,0.05))
- Primary Accent Color: Golden Amber (e.g., #FFD700 or HSL 45, 100%, 50%)
- Approved Status Badges: Emerald Green (e.g., rgba(16, 185, 129, 0.15) with emerald text)
- Rejected Status Badges: Rose Red (e.g., rgba(244, 63, 94, 0.15) with rose text)
```

### 9.1 Login Screen
* **Purpose**: Authenticates the administrator using Firebase Auth.
* **Requirements**:
  * **Google Sign-In Button**: Admins log in using their registered Google account.
  * **Authentication Check**: Upon sign-in, the app retrieves the user's role from `/users/{uid}`.
    * If `role == "admin"` or `role == "superadmin"` or the email is in the hardcoded superadmin list, access is granted.
    * If the role check fails, the user is signed out, and the app displays an access denied error.

### 9.2 Upload Form Screen (Share Target View)
* **Purpose**: Form interface populated when a file is shared with the app.
* **UI Elements**:
  * **Header**: Displays the filename and size of the shared file.
  * **Progress Bar**: Displays the background upload status to Google Drive (e.g., progress bar moves from 0% to 99% during the upload).
  * **Title Input**: Editable text field. It defaults to the filename without its extension.
  * **Semester Dropdown**: Select list (Semester 1–4). Selecting a semester updates the available subjects.
  * **Subject Dropdown**: Disabled until a semester is selected. When enabled, it displays subjects filtered by the selected semester.
  * **Type Selector**: Toggle buttons or a dropdown (Notes, Practicals, IMP, Assignment).
  * **Google Drive Link**: Read-only text field displaying the Drive URL once the background upload completes.
  * **Publish Button**: Enabled once the metadata form is valid and the file has finished uploading.

### 9.3 Admin Pending Review Screen
* **Purpose**: List view of all uploaded materials where `status == "Pending"`.
* **UI Elements**:
  * **Real-time List View**: Employs an active Firestore listener.
  * **Material Cards**: Each card displays:
    * Title, document type, semester, subject.
    * The uploader's name and email address.
    * Upload date.
  * **Approve Button (Green)**: Sets the document's status to `"Approved"` in Firestore.
  * **Reject Button (Red)**: Deletes the document from Firestore.
  * **Bulk Action Bar**: Allows selecting multiple files to approve or reject them in a single batch operation.

---

## 10. Cross-Platform Developer Implementation Code

### 10.1 React Native Pipeline (Background File Receiver & POST Upload)

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import ShareMenu from 'react-native-share-menu';
import RNFS from 'react-native-fs';
import axios from 'axios';
import { db, auth } from './firebaseConfig';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzc1QTM0qx8OPGs16QRXbtEevBgik4pceDjLpKKS98f8DBD7A8yszDjmibQb7cTQBs8tQ/exec";

export default function NativeUploader() {
  const [fileDetails, setFileDetails] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [driveFileId, setDriveFileId] = useState('');
  
  // Form hooks
  const [title, setTitle] = useState('');
  const [semester, setSemester] = useState('1');
  const [subjectId, setSubjectId] = useState('');
  const [materialType, setMaterialType] = useState('Notes');

  useEffect(() => {
    // Listen for shared files
    ShareMenu.getInitialShare(processSharedMedia);
    const listener = ShareMenu.addNewShareListener(processSharedMedia);
    return () => listener.remove();
  }, []);

  const processSharedMedia = (sharedData) => {
    if (!sharedData) return;
    const { data: uri, mimeType } = sharedData;
    
    // Extract filename from URI
    const fileName = uri.substring(uri.lastIndexOf('/') + 1);
    setFileDetails({ uri, fileName, mimeType });
    setTitle(fileName.replace(/\.[^/.]+$/, "")); // Strip extension for default title

    // Immediately trigger background upload to hide latency
    uploadFileToDrive(uri, fileName, mimeType);
  };

  const uploadFileToDrive = async (uri, name, mimeType) => {
    setIsUploading(true);
    try {
      const emailPrefix = auth.currentUser?.email?.split('@')[0] || "Admin";
      const sanitizedName = name.replace(/[\\/:*?"<>|]+/g, "-");
      const uploadName = `${emailPrefix}-${sanitizedName}`;

      // Convert the local file to base64
      const base64Content = await RNFS.readFile(uri, 'base64');

      // Send base64 payload to Apps Script
      const res = await axios.post(APPS_SCRIPT_URL, JSON.stringify({
        base64: base64Content,
        name: uploadName,
        mimeType: mimeType
      }), {
        headers: { 'Content-Type': 'text/plain' }
      });

      if (res.data && res.data.status === "success") {
        const directDownloadLink = `https://drive.google.com/uc?export=download&id=${res.data.fileId}`;
        setDriveUrl(directDownloadLink);
        setDriveFileId(res.data.fileId);
        Alert.alert("File Uploaded", "Background upload complete.");
      } else {
        throw new Error(res.data.message || "Upload endpoint error");
      }
    } catch (err) {
      Alert.alert("Upload Failed", err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !subjectId || !driveUrl) {
      Alert.alert("Validation Error", "All fields are required.");
      return;
    }

    try {
      // Check for duplicates
      const dupQuery = query(
        collection(db, "materials"),
        where("subjectId", "==", subjectId),
        where("title", "==", title.trim())
      );
      const querySnapshot = await getDocs(dupQuery);
      if (!querySnapshot.empty) {
        Alert.alert("Duplicate Material", "A document with this title already exists in this subject.");
        return;
      }

      // Add document to Firestore
      await addDoc(collection(db, "materials"), {
        title: title.trim(),
        semId: semester,
        subjectId: subjectId,
        type: materialType,
        link: driveUrl,
        fileId: driveFileId,
        status: "Pending",
        views: 0,
        downloads: 0,
        uploadedBy: auth.currentUser?.displayName || "Admin App",
        uploadedByUid: auth.currentUser?.uid || null,
        uploadedByEmail: auth.currentUser?.email || '',
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      Alert.alert("Success", "Material submitted and pending approval.");
      // Clear form
      setFileDetails(null);
      setTitle('');
      setDriveUrl('');
    } catch (err) {
      Alert.alert("Database Error", err.message);
    }
  };

  return (
    <View style={styles.wrapper}>
      {fileDetails && <Text>Shared File: {fileDetails.fileName}</Text>}
      {isUploading && <ActivityIndicator size="large" color="#FFD700" />}
      <TextInput placeholder="Enter Title" value={title} onChangeText={setTitle} style={styles.input} />
      <Button title="Publish" onPress={handlePublish} disabled={isUploading || !driveUrl} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { padding: 24 },
  input: { borderWidth: 1, borderColor: '#ccc', marginVertical: 8, padding: 8 }
});
```

---

## 11. Native Android & iOS Code Samples

### 11.1 Native Android Integration (Kotlin)
This implementation sample demonstrates how the native Android layout captures the shared intent, extracts the file URI, and calls a background task to process the binary stream.

```kotlin
package com.fycs.studyhub.admin

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.util.Base64
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

class ShareActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_share)

        // Validate shared content intent
        if (intent?.action == Intent.ACTION_SEND) {
            if (intent.type != null) {
                handleSharedFile(intent)
            }
        }
    }

    private fun handleSharedFile(intent: Intent) {
        val fileUri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
        if (fileUri != null) {
            val fileName = getFileName(fileUri)
            val mimeType = contentResolver.getType(fileUri) ?: "application/octet-stream"
            
            Toast.makeText(this, "Received: $fileName. Upload starting...", Toast.LENGTH_SHORT).show()

            // Run asynchronous background thread upload
            CoroutineScope(Dispatchers.Main).launch {
                val result = uploadToGoogleDrive(fileUri, fileName, mimeType)
                if (result != null) {
                    Toast.makeText(this@ShareActivity, "Drive Link Generated: $result", Toast.LENGTH_LONG).show()
                    // Populate UI and wait for form inputs
                } else {
                    Toast.makeText(this@ShareActivity, "Upload to Google Drive failed.", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun getFileName(uri: Uri): String {
        var result: String? = null
        if (uri.scheme == "content") {
            val cursor = contentResolver.query(uri, null, null, null, null)
            cursor?.use {
                if (it.moveToFirst()) {
                    val index = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (index != -1) result = it.getString(index)
                }
            }
        }
        if (result == null) {
            result = uri.path
            val cut = result?.lastIndexOf('/') ?: -1
            if (cut != -1) {
                result = result?.substring(cut + 1)
            }
        }
        return result ?: "unnamed_file"
    }

    private suspend fun uploadToGoogleDrive(uri: Uri, name: String, mimeType: String): String? = withContext(Dispatchers.IO) {
        try {
            val inputStream: InputStream? = contentResolver.openInputStream(uri)
            val fileBytes = inputStream?.readBytes()
            inputStream?.close()

            if (fileBytes == null) return@withContext null

            // Base64 Encode raw bytes
            val base64Payload = Base64.encodeToString(fileBytes, Base64.NO_WRAP)
            
            // Build Apps Script JSON Request Body
            val jsonBody = JSONObject().apply {
                put("base64", base64Payload)
                put("name", "AndroidAdmin-$name")
                put("mimeType", mimeType)
            }.toString()

            val scriptUrl = URL("https://script.google.com/macros/s/AKfycbzc1QTM0qx8OPGs16QRXbtEevBgik4pceDjLpKKS98f8DBD7A8yszDjmibQb7cTQBs8tQ/exec")
            val connection = scriptUrl.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.instanceFollowRedirects = true // Follow Apps Script redirects
            connection.setRequestProperty("Content-Type", "text/plain")

            connection.outputStream.use { os ->
                val input = jsonBody.toByteArray(charset("utf-8"))
                os.write(input, 0, input.size)
            }

            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val responseText = connection.inputStream.bufferedReader().use { it.readText() }
                val responseJson = JSONObject(responseText)
                if (responseJson.getString("status") == "success") {
                    val fileId = responseJson.getString("fileId")
                    return@withContext "https://drive.google.com/uc?export=download&id=$fileId"
                }
            }
            return@withContext null
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext null
        }
    }
}
```

### 11.2 Native iOS Share Extension View Controller (Swift)
This implementation sample demonstrates how the iOS share extension intercepts the shared PDF document and writes the data to the Shared App Group container.

```swift
import UIKit
import Social
import MobileCoreServices

class ShareViewController: SLComposeServiceViewController {

    override func isContentValid() -> Bool {
        // Enforce validation rules on the compose view
        return self.extensionContext?.inputItems.count ?? 0 > 0
    }

    override func didSelectPost() {
        // Retrieve and process attachments
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = extensionItem.attachments else {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
            return
        }

        let pdfContentType = kUTTypePDF as String

        for provider in attachments {
            if provider.hasItemConformingToTypeIdentifier(pdfContentType) {
                provider.loadItem(forTypeIdentifier: pdfContentType, options: nil) { [weak self] (item, error) in
                    guard let self = self else { return }
                    
                    if let fileURL = item as? URL {
                        // Copy shared file to shared App Group container
                        self.saveToAppGroupContainer(fileURL: fileURL)
                    }
                    
                    // Inform the host context that the sharing action is complete
                    self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
                }
                return
            }
        }
        
        self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }

    private func saveToAppGroupContainer(fileURL: URL) {
        let sharedContainerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.fycs.studyhub.admin")
        if let targetURL = sharedContainerURL?.appendingPathComponent(fileURL.lastPathComponent) {
            try? FileManager.default.removeItem(at: targetURL)
            do {
                try FileManager.default.copyItem(at: fileURL, to: targetURL)
                
                // Trigger deep link scheme to open the main application container
                let customSchemeURL = URL(string: "fycs-admin-hub://sharedfile?name=\(fileURL.lastPathComponent)")!
                self.openURL(customSchemeURL)
            } catch {
                print("Failed to store file in shared container: \(error)")
            }
        }
    }

    @objc func openURL(_ url: URL) {
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = responder?.next
        }
    }
}
```

---

## 12. Business Logic, Duplicate Prevention & Verification

To maintain data consistency across the website and the native mobile app, developers must implement the exact verification checks defined below.

### 12.1 Dynamic Dropdown Filtering (Semesters to Subjects)
The mobile application must fetch subjects from the `/subjects` collection once at launch and cache them.
* When the administrator changes the semester selector, the app filters the cached subjects list dynamically:
  ```
  filteredSubjects = allSubjects.filter(subject.semId == selectedSemesterId)
  ```
* If the user selects a new semester, the subject selection field must reset to null to prevent mismatched associations.

### 12.2 Local Duplicate Prevention Engine
Prior to triggering the Firestore database write, the mobile application must perform a local duplicate check:
1. **Query constraint definition**:
   * Filter the materials collection where `subjectId == form.subjectId` and `title == form.title.trim()`.
2. **Comparison Logic**:
   * Normalize input strings: convert to lowercase and remove leading/trailing whitespaces.
   * If the query returns a match, block submission, display an error message, and prevent database writes.
3. **Google Drive Filename Check**:
   * Check for duplicate filenames: compare the sanitized name (`uploadName`) with existing records under the same subject.
   * If a matching filename is found, block submission.

### 12.3 Submission & Email Alert API Sequence
Once the validation checks pass:
1. The app writes the material document to Firestore with a status of `"Pending"`.
2. The app triggers a background POST request to the Web3Forms API to notify administrators of the new pending item:
   * **Endpoint URL**: `https://api.web3forms.com/submit`
   * **JSON Body**:
     ```json
     {
       "access_key": "0fce181f-dbfc-4943-887e-5e39cc2ad54a",
       "subject": "🚨 FYCS Hub Alert: New Mobile Upload Pending!",
       "from_name": "Study Hub Mobile App",
       "message": "A platform administrator has uploaded a new resource from the mobile application.\n\n👤 Uploader: [UploaderName]\n📧 Email: [UploaderEmail]\n📚 Subject ID: [SubjectId]\n📂 Material Title: [Title]\n\nPlease log in to review and approve."
     }
     ```

### 12.4 Verification Test Checklist
* **Test Case 1: Silent Intent Handshake**
  * Select a PDF in the device's file manager, share it with the app, and verify that the app launches and displays the shared file name.
* **Test Case 2: Progress Accuracy**
  * Verify that the background upload progress bar completes successfully and displays the final converted Google Drive URL.
* **Test Case 3: Firestore Security**
  * Log in with a non-admin account and verify that database writes with status `"Approved"` are blocked by Firestore security rules.
* **Test Case 4: Duplicate Interception**
  * Attempt to upload a resource with a title and subject that already exists, and verify that the duplicate checker prevents the submission.

---
*End of Technical Specification.*
