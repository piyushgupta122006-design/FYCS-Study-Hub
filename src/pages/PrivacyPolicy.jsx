import React from 'react';
import Navbar from '../components/Navbar';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-[#111] text-gray-300">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-gray-400">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>When you use FYCS Study Hub, we may collect the following information:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Profile Information:</strong> Your name, email address, and profile picture provided via Google Authentication.</li>
              <li><strong>User Content:</strong> Links to study materials, notes, and question papers that you voluntarily share on the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. How We Use Google Drive API</h2>
            <p className="mb-2">
              Our application integrates with the Google Drive API to allow users to easily select and share educational materials. 
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>We <strong>only</strong> access the specific files that you explicitly select using the Google Drive Picker.</li>
              <li>We <strong>do not</strong> have access to your entire Google Drive, nor do we download or store your personal files on our servers.</li>
              <li>We only store the publicly accessible URL of the selected file in our database so it can be shared with other students on the platform.</li>
            </ul>
            <p className="mt-2 font-medium text-yellow-500">
              FYCS Study Hub's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. Data Security & Storage</h2>
            <p>We use Google Firebase to securely store your authentication details and shared links. We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Contact Us</h2>
            <p>If you have any questions or concerns about this Privacy Policy or your data, please contact the developer at: <strong>rishiuttamsahu@gmail.com</strong></p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
