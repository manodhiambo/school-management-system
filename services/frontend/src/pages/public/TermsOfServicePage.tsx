import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By registering a school on Skul Manager or using the platform in any way, you (the school administrator, staff member, parent, or student) agree to be bound by these Terms of Service.

If you are registering on behalf of a school, you confirm that you have authority to bind the school to these terms.

These Terms are governed by the laws of Kenya.`,
  },
  {
    title: '2. Description of Service',
    body: `Skul Manager is a cloud-based school management platform developed and operated by Helvino Technologies Limited (company registered in Kenya). The service provides tools for student management, CBE academic tracking, fee management, transport tracking, staff management, parent communication, and related school administration functions.

The service is provided on a subscription basis following a one-time setup payment.`,
  },
  {
    title: '3. Subscription & Payment',
    body: `Setup Fee: KSh 100,000 — a one-time payment required to activate your school after the free trial. This covers your full first year of access.

Annual Renewal: KSh 40,000 per year, payable from Year 2 onwards, to maintain and update your system and database.

Trial Period: New schools receive a 5-day free trial with full access to all features. No payment is required during the trial.

Payments are accepted via M-Pesa (Paybill 522533, Account 8071524). After payment, contact us at info@helvino.org or 0110 421 320 to activate your subscription.

Failure to renew by the renewal date will result in read-only access for 30 days, after which access will be suspended. Data is retained for 12 months after suspension.`,
  },
  {
    title: '4. Account Responsibilities',
    body: `You are responsible for:
• Keeping your login credentials secure and confidential
• All activity that occurs under your school's account
• Ensuring that all users (staff, students, parents) understand and comply with these Terms
• The accuracy of data entered into the system (student records, fees, grades, etc.)

You must notify us immediately at info@helvino.org if you suspect unauthorised access to your account.`,
  },
  {
    title: '5. Acceptable Use',
    body: `You agree NOT to:
• Use the platform for any illegal purpose or in violation of Kenyan law
• Attempt to gain unauthorised access to other schools' data or system components
• Upload malicious code, viruses, or harmful content
• Share your login credentials with unauthorised persons
• Use the system to send unsolicited communications (spam)
• Attempt to reverse-engineer, copy, or resell the platform

We reserve the right to suspend or terminate accounts that violate these terms without notice.`,
  },
  {
    title: '6. Data Ownership',
    body: `Your school retains full ownership of all data you enter into Skul Manager — student records, staff information, financial records, academic data, and all other content.

Helvino Technologies Limited does not claim ownership of your data. We act as a data processor under your instruction as the data controller.

You may request a full export of your school's data at any time by contacting info@helvino.org.`,
  },
  {
    title: '7. Data Protection',
    body: `We handle your data in accordance with our Privacy Policy, which forms part of these Terms. We implement industry-standard security measures including encryption, role-based access control, and isolated tenant databases.

While we take all reasonable steps to protect your data, no system is completely immune to security incidents. We will notify you within 72 hours of discovering any data breach that affects your school's information.`,
  },
  {
    title: '8. Service Availability',
    body: `We aim for 99.9% uptime but do not guarantee uninterrupted service. The platform may be temporarily unavailable due to:
• Scheduled maintenance (communicated in advance via in-app notification)
• Unplanned technical issues
• Force majeure events (internet outages, infrastructure failures, etc.)

We are not liable for losses arising from temporary service unavailability.`,
  },
  {
    title: '9. Modifications to the Service',
    body: `We reserve the right to add, modify, or remove features at any time. We will notify users of significant changes via in-app notification or email at least 14 days in advance.

We also reserve the right to update these Terms. Continued use of the platform after changes constitutes acceptance of the updated Terms.`,
  },
  {
    title: '10. Termination',
    body: `Either party may terminate this agreement:
• You may cancel your subscription at any time by contacting us. No partial refunds are provided for unused subscription periods.
• We may terminate your account for violation of these Terms, non-payment, or at our discretion with 30 days' notice.

Upon termination, your data remains accessible for 30 days for export purposes, after which it is permanently deleted.`,
  },
  {
    title: '11. Limitation of Liability',
    body: `Helvino Technologies Limited shall not be liable for:
• Loss of data due to circumstances beyond our control
• Indirect, incidental, or consequential damages arising from use of the platform
• Errors or inaccuracies in data entered by users
• Any claims arising from a school's use of the platform in relation to students, parents, or staff

Our total liability to you for any claim shall not exceed the subscription fees paid in the 12 months preceding the claim.`,
  },
  {
    title: '12. Contact',
    body: `For questions about these Terms:

Helvino Technologies Limited
Siaya, Kenya
Email: info@helvino.org
Phone: 0110 421 320

Effective date: 1 June 2026`,
  },
];

export function TermsOfServicePage() {
  useSEO({
    title: 'Terms of Service | SkulManager',
    description: 'The terms governing your use of SkulManager, Kenya\'s CBE-aligned school management platform.',
    path: '/terms',
  });
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-800 to-blue-900 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-indigo-200 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-indigo-200">Last updated: 1 June 2026 · Helvino Technologies Limited</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {SECTIONS.map(section => (
            <div key={section.title} className="p-6">
              <h2 className="text-base font-bold text-gray-900 mb-3">{section.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{section.body}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-6">
          © {new Date().getFullYear()} Helvino Technologies Limited · Siaya, Kenya
        </p>
      </div>
    </div>
  );
}
