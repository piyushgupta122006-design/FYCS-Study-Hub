import React from 'react';
import Navbar from '../components/Navbar';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-[#111] text-gray-300">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">Terms of Service</h1>
        <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-gray-400">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and using FYCS Study Hub, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. User Conduct & Uploads</h2>
            <p>Our platform relies on community sharing. By uploading or sharing links to study materials, you agree that:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>The content is relevant to the curriculum (notes, question papers, assignments).</li>
              <li>You will not upload malicious files, spam, or inappropriate content.</li>
              <li>You will respect intellectual property rights. Do not share copyrighted premium materials without permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. Account Moderation</h2>
            <p>The administrators reserve the right to review shared links and remove any content that violates these terms. We also reserve the right to suspend or ban user accounts (via our Banned system) that repeatedly violate the rules.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Disclaimer of Warranties</h2>
            <p>FYCS Study Hub is provided "as is" for educational purposes. We do not guarantee the absolute accuracy or completeness of the study materials uploaded by users.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
