import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Introduction',
    body: `Helvino Technologies Limited ("we", "our", or "us") operates the Skul Manager school management platform. This Privacy Policy explains how we collect, use, store, and protect your information when you use our service.

By registering or using Skul Manager, you agree to the practices described in this Policy. If you do not agree, please do not use the service.`,
  },
  {
    title: '2. Information We Collect',
    body: `We collect the following categories of information:

School Information: School name, county, address, contact details, and M-Pesa payment references.

Administrator & Staff Data: Names, email addresses, phone numbers, staff roles, and login credentials (passwords are hashed and never stored in plain text).

Student Data: Names, date of birth, admission numbers, NEMIS numbers, class, education level, county, medical information, emergency contacts, and academic records.

Parent/Guardian Data: Names, contact details, relationship to student, and payment history.

Usage Data: Login timestamps, IP addresses, and feature usage patterns for security and product improvement.

Financial Data: Fee payment records, invoice data, and M-Pesa transaction references. We do not store M-Pesa PINs or full card numbers.`,
  },
  {
    title: '3. How We Use Your Data',
    body: `We use your data exclusively to:
• Provide and operate the Skul Manager platform
• Generate CBE report cards, invoices, receipts, and reports
• Send notifications to parents about student attendance, transport, and results
• Improve system features and fix technical issues
• Comply with legal obligations in Kenya

We do not sell, rent, or share your school's data with third parties for marketing purposes.`,
  },
  {
    title: '4. Data Isolation (Multi-Tenancy)',
    body: `Each school's data is stored in an isolated tenant environment. This means:
• School A cannot access School B's data under any circumstances
• All database queries are filtered by a unique tenant identifier
• System administrators at Helvino can access data only for support purposes and only with your consent

This isolation is enforced at the database level, not just the application level.`,
  },
  {
    title: '5. Data Storage & Security',
    body: `Your data is stored on Neon PostgreSQL cloud infrastructure in the US-West region. We apply the following security measures:
• All data is transmitted over HTTPS (TLS encryption)
• Passwords are hashed using bcrypt before storage
• JWT tokens are used for session authentication and expire automatically
• Role-based access control ensures each user sees only their permitted data
• Rate limiting and input validation protect against common attacks

Neon databases include automatic daily backups retained for 7 days.`,
  },
  {
    title: '6. Third-Party Services',
    body: `We use the following third-party services:
• Neon (database hosting) — stores your data
• Render (application hosting) — runs the backend API
• Africa's Talking (SMS) — used to send SMS notifications to parents when you enable this feature
• Google Maps — used to display GPS coordinates for transport tracking (no tracking data is sent to Google by us; the link opens externally)

Each third-party service has its own privacy policy. We only share the minimum data necessary for each service to function.`,
  },
  {
    title: '7. Student Data & Children\'s Privacy',
    body: `Skul Manager processes data about minors (students). We handle this data with extra care:
• Student data is only accessible by the student's own school, their registered parents, and authorised school staff
• We do not use student data for advertising or profiling
• Parents can request access to or deletion of their child's data by contacting the school administrator

Kenyan schools using this platform are the data controllers for their students. Helvino Technologies Limited is the data processor.`,
  },
  {
    title: '8. Your Rights',
    body: `You have the right to:
• Access your school's data at any time through the system
• Request corrections to inaccurate data
• Request deletion of your school's data (we will delete all data within 30 days of a verified written request)
• Receive a data export in CSV format upon request

To exercise these rights, contact us at info@helvino.org or 0110 421 320.`,
  },
  {
    title: '9. Data Retention',
    body: `We retain your school's data for as long as your subscription is active, plus 12 months after expiry (to allow reactivation). After 12 months of inactivity, data is permanently deleted unless you request otherwise.

Payment transaction records may be retained for 7 years as required by Kenyan financial regulations.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify admin users by email and via the in-app notification system when significant changes are made. Continued use of Skul Manager after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '11. Contact Us',
    body: `For privacy-related questions or requests:

Helvino Technologies Limited
Siaya, Kenya
Email: info@helvino.org
Phone: 0110 421 320
Website: helvino.org

Effective date: 1 June 2026`,
  },
];

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-300 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-gray-300">Last updated: 1 June 2026 · Helvino Technologies Limited</p>
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
